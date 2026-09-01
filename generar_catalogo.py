#!/usr/bin/env python3
"""
Genera productos.json para bodegadetalavera.com desde CATALOGO_MAESTRO.xlsx

REGLA DE SEGURIDAD (contexto RAAC 2026-08-28, decision 3B):
El JSON es PUBLICO. Se usa LISTA BLANCA, nunca lista negra.
COSTO, PROVEEDOR, MARGEN %, ALIAS, CODIGO_ANTERIOR y NOTAS NUNCA salen.
Una columna nueva en el Excel no se publica sola.
"""
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

# ---------------------------------------------------------------- lista blanca
COLUMNAS_PUBLICAS = [
    "CODIGO", "PRODUCTO", "CATEGORIA", "FORMATO", "PRECIO_VENTA", "UNIDAD",
    "FOTO", "LINEA", "MODELO", "ACABADO", "COLOR", "TIPO_PIEZA",
    "PIEZA_FORMA", "MEDIDA", "PZ_M2", "MARCA", "DISPONIBILIDAD",
]
COLUMNAS_PROHIBIDAS = {
    "COSTO", "PROVEEDOR", "MARGEN %", "ALIAS", "CODIGO_ANTERIOR", "NOTAS",
}

# El sitio de Bodega vende +10% sobre el PV del catalogo: cubre la comision de
# la pasarela y el costo del carrito (Alek 2026-08-29). El Excel NO se toca —
# ahi sigue viviendo el PV unico de las 3 marcas (regla de oro #5).
RECARGO_BODEGA = 1.10


def normaliza_ruta_foto(ruta: str) -> str:
    """MAYUSCULAS, sin acentos, sin espacios sobrantes. Las URLs nacen limpias
    aunque las carpetas de OneDrive sigan como estan (contexto 08-28)."""
    ruta = str(ruta).strip().replace("\\", "/")
    ruta = unicodedata.normalize("NFKD", ruta)
    ruta = "".join(c for c in ruta if not unicodedata.combining(c))
    partes = []
    for p in ruta.split("/"):
        p = re.sub(r"\s+", " ", p).strip().upper()
        # "ESCAMAS .PNG" -> "ESCAMAS.PNG": el espacio antes de la extension
        # existe en disco pero no debe viajar a la URL
        p = re.sub(r"\s+(\.[A-Z]+)$", r"\1", p)
        partes.append(p)
    ruta = "/".join(partes)
    return re.sub(r"\.(PNG|JPG|JPEG)$", ".webp", ruta, flags=re.I)


def slug(*trozos) -> str:
    """Une los trozos sin repetir palabras: PRODUCTO ya suele traer el color."""
    palabras, vistas = [], set()
    for t in trozos:
        if not t:
            continue
        t = unicodedata.normalize("NFKD", str(t))
        t = "".join(c for c in t if not unicodedata.combining(c))
        for w in re.split(r"[^a-zA-Z0-9]+", t):
            if w and w.lower() not in vistas:
                vistas.add(w.lower())
                palabras.append(w.lower())
    return "-".join(palabras)



# ============================================================ ARBOL DE LA TIENDA
# Estructura decidida 2026-08-27/28. Fuera del lanzamiento (Alek 2026-08-29):
# Loseta/Baldosa, Barro y la ficha suelta de Estriado/Petatillo.
EXCLUIR_CATEGORIA = {"Loseta/Baldosa", "Barro"}
EXCLUIR_ACABADO = {"Estriado / Petatillo"}

# Formatos que NO se publican en la tienda (Alek 2026-08-29). Se quitan SOLO del
# sitio: en el catalogo siguen vivos y se siguen vendiendo en mostrador.
EXCLUIR_FORMATO = {"7X7"}

GRUPO_DECORADO = {"1": "sencillo", "2": "sencillo",
                  "3": "elaborado", "4": "elaborado",
                  "5": "ilustrado"}


def clasificar(p):
    """Devuelve (categoria, subcategoria) del arbol de la tienda, o None si la
    ficha no va en el lanzamiento."""
    cat = p.get("categoria", "")
    acab = p.get("acabado", "")
    if cat in EXCLUIR_CATEGORIA or acab in EXCLUIR_ACABADO:
        return None

    if cat == "Talavera":
        if acab == "Relieve":
            return ("relieve", "clasico")
        if acab == "Deslavado":
            return ("azulejo", "deslavados")
        if acab == "Mate":
            return ("azulejo", "mates")
        return ("azulejo", "esmaltados")        # liso + brillante + especial

    if cat == "Talavera Relieve Mate":
        return ("relieve", "mate")

    if cat == "Talavera Decorado":
        # el 3er caracter del codigo (AD_g_NNf) es el grupo = nivel de elaboracion
        g = p["formatos"][0]["codigo"][2]
        return ("decorados", GRUPO_DECORADO.get(g, "sencillo"))

    if cat == "Azulejo Plano No Cuadrado (Forma)":
        nom = p.get("producto", "").upper()
        for clave, sub in (("HEXAGONITO", "hexagonito"),
                           ("ESPAÑOL", "espanolito"), ("ESPANOL", "espanolito"),
                           ("ESCAMA", "escama")):
            if clave in nom:
                return ("boutique", sub)
        return ("boutique", "otros")

    if cat.startswith("Terminacion"):
        tp = p.get("tipo_pieza", "")
        if tp == "Corniza":
            return ("terminaciones", "corniza")
        return ("terminaciones", slug(tp) or "otros")

    if cat == "Pegamento/Adhesivo":
        return ("pegazulejo", "pegazulejo")

    return None


def generar(xlsx: Path, salida: Path, fotos_dir: Path = None,
             precios_salida: Path = None) -> dict:
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    hoja = wb["CATALOGO"]
    filas = hoja.iter_rows(values_only=True)
    encabezado = list(next(filas))
    idx = {nombre: i for i, nombre in enumerate(encabezado)}

    faltantes = [c for c in COLUMNAS_PUBLICAS if c not in idx]
    if faltantes:
        sys.exit(f"ERROR: el Excel no tiene estas columnas: {faltantes}")

    productos, fotos = [], set()
    descartes = {"descontinuado": 0, "no_bodega": 0, "sin_precio": 0, "sin_foto": 0,
                 "formato_excluido": 0}

    for fila in filas:
        if not fila or not fila[idx["CODIGO"]]:
            continue
        if "escontinuado" in str(fila[idx["ESTADO"]] or ""):
            descartes["descontinuado"] += 1
            continue
        if str(fila[idx["BODEGA"]] or "").strip().upper() != "SI":
            descartes["no_bodega"] += 1
            continue
        if not fila[idx["PRECIO_VENTA"]]:
            descartes["sin_precio"] += 1
            continue
        if not fila[idx["FOTO"]]:
            descartes["sin_foto"] += 1  # regla dura: sin foto no se publica
            continue
        if str(fila[idx["FORMATO"]] or "").strip().upper() in EXCLUIR_FORMATO:
            descartes["formato_excluido"] += 1  # fuera del sitio, no del catalogo
            continue

        p = {}
        for col in COLUMNAS_PUBLICAS:
            v = fila[idx[col]]
            if v is None or str(v).strip() == "":
                continue
            if col == "PRECIO_VENTA":
                v = math.ceil(float(v) * RECARGO_BODEGA)  # nunca por debajo del +10%
            p[col.lower()] = str(v).strip() if isinstance(v, str) else v

        # la celda FOTO puede traer VARIAS rutas separadas por "|":
        # la primera es la portada, las demas son galeria.
        crudas = [x.strip() for x in str(fila[idx["FOTO"]]).split("|") if x.strip()]
        p["foto"] = normaliza_ruta_foto(crudas[0])
        if len(crudas) > 1:
            p["galeria"] = [normaliza_ruta_foto(x) for x in crudas[1:]]
        fotos.update(crudas)
        p["url"] = slug(p.get("acabado"), p.get("producto"), p.get("color"))
        productos.append(p)

    # ---- una FICHA por modelo+acabado+color; los formatos son variantes dentro
    # (decision 2026-08-27: "la ficha es el modelo, el formato se elige adentro")
    fichas = {}
    for p in productos:
        f = fichas.get(p["url"])
        if f is None:
            f = {k: v for k, v in p.items() if k not in ("formato", "precio_venta",
                                                         "unidad", "pz_m2", "codigo")}
            f["formatos"] = []
            f.pop("galeria", None) if False else None
            fichas[p["url"]] = f
        # el catalogo lleva UNA FILA POR PROVEEDOR (regla de oro #4). Como
        # PROVEEDOR no se publica, esas filas quedan identicas: se deduplican
        # por CODIGO, que es el SKU real.
        if any(v["codigo"] == p["codigo"] for v in f["formatos"]):
            continue
        f["formatos"].append({k: p[k] for k in
                              ("codigo", "formato", "precio_venta", "unidad", "pz_m2")
                              if k in p})
    for f in fichas.values():
        f["formatos"].sort(key=lambda x: x.get("precio_venta") or 0)
    productos = list(fichas.values())

    # ---- regla dura: SIN FOTO NO SE PUBLICA.
    # No basta con que la celda FOTO tenga texto: el archivo tiene que existir.
    sin_archivo = []
    if fotos_dir:
        vivas = []
        for p in productos:
            rel = p["foto"]
            if rel.upper().startswith("FOTOS PRODUCTOS/"):
                rel = rel[len("FOTOS PRODUCTOS/"):]
            if not (fotos_dir / rel).exists():
                sin_archivo.append((p["url"], p["foto"]))
                continue
            p["galeria"] = [g for g in p.get("galeria", [])
                            if (fotos_dir / g[len("FOTOS PRODUCTOS/"):]).exists()]
            if not p["galeria"]:
                p.pop("galeria", None)
            vivas.append(p)
        productos = vivas

    # ---- marcar la ficha cuya foto NO es de su color.
    # Si varias fichas de colores distintos comparten archivo, esa foto solo
    # muestra la FORMA de la pieza. El sitio lo avisa; cuando se ligue la foto
    # real del color, la marca desaparece sola.
    por_foto = {}
    for p in productos:
        por_foto.setdefault(p["foto"], set()).add(p.get("color"))
    for p in productos:
        if len(por_foto[p["foto"]]) > 1:
            p["foto_generica"] = True

    # candado: ninguna columna prohibida se coló
    for p in productos:
        for prohibida in COLUMNAS_PROHIBIDAS:
            assert prohibida.lower() not in p, f"FUGA: {prohibida} en {p['url']}"
            for v in p["formatos"]:
                assert prohibida.lower() not in v, f"FUGA: {prohibida} en {p['url']}"

    # aplicar el arbol de la tienda
    del_arbol = []
    fuera = 0
    for x in productos:
        c = clasificar(x)
        if c is None:
            fuera += 1
            continue
        x["cat"], x["sub"] = c
        del_arbol.append(x)
    productos = del_arbol
    descartes["fuera_del_arbol"] = fuera

    # REGLA DURA (Alek 2026-08-29): SIN FOTO PROPIA NO SE PUBLICA, en TODAS las
    # secciones. Una foto compartida por varios colores muestra la forma, no el
    # color, y engana al cliente (se vio en boutique y en terminaciones: el remate
    # "Brillante Amarillo" salia con la foto de una pieza azul).
    antes = len(productos)
    productos = [p for p in productos if not p.get("foto_generica")]
    descartes["foto_generica"] = antes - len(productos)

    salida.write_text(
        json.dumps(productos, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # El servidor NUNCA confia en el precio que manda el navegador: lo relee de
    # aqui (functions/api/_pedido.js). Un SKU que no este en este archivo no se
    # puede cobrar, asi que se genera de las MISMAS fichas ya publicadas.
    precios = {v["codigo"]: v["precio_venta"]
               for p in productos for v in p["formatos"]}
    if precios_salida:
        precios_salida.parent.mkdir(parents=True, exist_ok=True)
        precios_salida.write_text(json.dumps(precios, separators=(",", ":")),
                                  encoding="utf-8")
    return {
        "fichas": len(productos),
        "skus": sum(len(p["formatos"]) for p in productos),
        "fotos_unicas": len(fotos),
        "kb": round(salida.stat().st_size / 1024),
        "precios": len(precios),
        "descartes": descartes,
        "sin_archivo": sin_archivo,
        "rutas_fotos": sorted(fotos),
    }


if __name__ == "__main__":
    xlsx = Path(sys.argv[1] if len(sys.argv) > 1 else "CATALOGO_MAESTRO.xlsx")
    salida = Path(sys.argv[2] if len(sys.argv) > 2 else "productos.json")
    fotos = Path(sys.argv[3]) if len(sys.argv) > 3 else None
    precios = Path(sys.argv[4]) if len(sys.argv) > 4 else Path("public/data/precios.json")
    r = generar(xlsx, salida, fotos, precios)
    print(f"{r['fichas']} fichas · {r['skus']} SKUs · {r['fotos_unicas']} fotos · {r['kb']} KB")
    print(f"precios.json: {r['precios']} codigos cobrables")
    print("descartadas:", r["descartes"])
    if r["sin_archivo"]:
        print(f'\nOCULTAS — la celda FOTO apunta a un archivo que no existe ({len(r["sin_archivo"])}):')
        for url, foto in r["sin_archivo"]:
            print(f"   {url}  ->  {foto}")
