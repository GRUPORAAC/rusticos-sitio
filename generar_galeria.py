#!/usr/bin/env python3
"""
Genera src/data/galeria.json para el sitio de Rusticos Artesanales.

    python generar_galeria.py ../CATALOGO_MAESTRO.xlsx "../FOTOS PRODUCTOS"

El sitio es un ESCAPARATE: galeria de imagenes con nombre, sin precio, sin
codigo, sin carrito (brief 2026-09-10). Por eso este archivo publica MENOS que
el generador de Bodega: ni PRECIO_VENTA ni CODIGO salen nunca.

Dos fuentes, a proposito:
  1. CATALOGO_MAESTRO.xlsx  -> talavera, barro, loseta, mosaico de pasta.
     Se usa la LISTA BLANCA de columnas. COSTO, PROVEEDOR, MARGEN %, ALIAS,
     CODIGO_ANTERIOR, NOTAS, PRECIO_VENTA y CODIGO NUNCA salen.
  2. Carpetas de FOTOS PRODUCTOS -> divisiones que todavia no estan dadas de
     alta en el maestro pero SI tienen foto (fachaletas y mallas de piedra), y
     las piezas donde la foto es el producto (lavabos, WC, muebles).

Regla dura heredada: SIN FOTO NO SE PUBLICA. El archivo tiene que existir en
public/fotos/ (convertido a WebP por convertir.py).

El arbol del SITIO es comercial y corto; el del maestro es interno. No se
fuerza que coincidan (brief). El mapeo vive en clasificar() aqui abajo y los
nombres de cara al cliente en src/lib/catalogo.js.
"""
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

import openpyxl

COLUMNAS_PUBLICAS = [
    "PRODUCTO", "CATEGORIA", "FORMATO", "UNIDAD", "FOTO", "MODELO", "ACABADO",
    "COLOR", "TIPO_PIEZA", "PIEZA_FORMA", "MEDIDA", "PZ_M2",
]
COLUMNAS_PROHIBIDAS = {
    "COSTO", "PROVEEDOR", "MARGEN %", "ALIAS", "CODIGO_ANTERIOR", "NOTAS",
    "PRECIO_VENTA", "CODIGO",
}

# Formatos que no se muestran (siguen vivos en el catalogo y en mostrador).
EXCLUIR_FORMATO = {"7X7", "5X5"}

BOUTIQUE_EN_SITIO = {"escama", "espanolito", "hexagonito"}

GRUPO_DECORADO = {"1": "sencillo", "2": "sencillo",
                  "3": "elaborado", "4": "elaborado", "5": "ilustrado"}


def sin_acentos(s):
    s = unicodedata.normalize("NFKD", str(s))
    return "".join(c for c in s if not unicodedata.combining(c))


def normaliza_ruta_foto(ruta):
    """MAYUSCULAS, sin acentos, sin espacios sobrantes, extension .webp."""
    ruta = sin_acentos(str(ruta).strip().replace("\\", "/"))
    partes = []
    for p in ruta.split("/"):
        p = re.sub(r"\s+", " ", p).strip().upper()
        p = re.sub(r"\s+(\.[A-Z]+)$", r"\1", p)
        partes.append(p)
    ruta = "/".join(partes)
    return re.sub(r"\.(PNG|JPG|JPEG|WEBP)$", ".webp", ruta, flags=re.I)


def slug(*trozos):
    palabras, vistas = [], set()
    for t in trozos:
        if not t:
            continue
        for w in re.split(r"[^a-zA-Z0-9]+", sin_acentos(t)):
            if w and w.lower() not in vistas:
                vistas.add(w.lower())
                palabras.append(w.lower())
    return "-".join(palabras)


def bonito(s):
    """MAYUSCULAS del catalogo -> Nombre Legible. Conserva acentos."""
    if not s:
        return ""
    out = []
    for w in str(s).lower().split():
        out.append(w.capitalize() if (len(w) > 2 or w[0].isdigit()) else w)
    n = " ".join(out)
    return re.sub(r"\b(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)\b", r"\1×\2", n, flags=re.I)


PREFIJOS = [r"^CINTILLA\s+", r"^DECORADO\s+", r"^RELIEVE MATE\s+", r"^RELIEVE\s+",
            r"^TERMINACION\s+", r"^AZULEJO\s+", r"^LAVABO\s+", r"^MUEBLE HERRERIA\s+",
            r"^MUEBLE MADERA\s+", r"^MUEBLE\s+", r"^LOSETA DE BARRO\s+", r"^LOSETA\s+",
            r"^PISO BARRO\s+", r"^PISO\s+", r"^MOSAICO DE PASTA\s+"]


def nombre_corto(producto):
    n = producto or ""
    for re_ in PREFIJOS:
        n = re.sub(re_, "", n, flags=re.I)
    return bonito(n)


# ============================================================== ARBOL DEL SITIO
# Devuelve (cat, sub) del sitio o None si la fila no se publica.
def clasificar(p):
    cat = p.get("categoria", "")
    acab = p.get("acabado", "")
    tp = p.get("tipo_pieza", "")

    if cat == "Cintilla":
        return ("cintillas", slug(p.get("formato")))

    if cat == "Talavera":
        if tp in ("Estriado", "Petatillo"):
            return ("texturizados", slug(tp))
        if acab == "Relieve":
            return ("relieve", "clasico")
        if acab == "Deslavado":
            return ("talavera-lisa", "deslavada")
        if acab == "Mate":
            return ("talavera-lisa", "mate")
        return ("talavera-lisa", "esmaltada")     # liso + brillante + especial

    if cat == "Talavera Relieve Mate":
        return ("relieve", "mate")
    if cat == "Talavera Relieve Especial":
        return ("relieve", "especiales")

    if cat == "Talavera Decorado":
        g = str(p.get("_codigo", ""))[2:3]
        return ("talavera-decorada", GRUPO_DECORADO.get(g, "sencillo"))

    if cat in ("Azulejo Plano No Cuadrado (Forma)",
               "Azulejo Texturizado No Cuadrado (Forma)"):
        forma = slug(p.get("modelo")) or "otros"
        # Alek 2026-09-10: en el sitio solo van Escama, Españolito y Hexagonito.
        if forma not in BOUTIQUE_EN_SITIO:
            return None
        return ("boutique", forma)

    if cat.startswith("Terminacion de Azulejo"):
        if tp == "Corniza":
            return ("terminaciones", slug(p.get("pieza_forma")) or "corniza")
        return ("terminaciones", slug(tp) or "otros")

    if cat == "Barro":
        return ("barro", "loseta")
    if cat == "Loseta/Baldosa":
        prod = str(p.get("producto", "")).upper()
        if "MOSAICO DE PASTA" in prod:
            return ("mosaico-de-pasta", slug(prod.replace("MOSAICO DE PASTA", "")) or "colores")
        if "BARRO" in prod or "LOSETA" in prod:
            return ("barro", "loseta")
        return None

    # Lavabos, WC y muebles se publican desde la CARPETA (la foto es el
    # producto y hay mas fotos que filas en el maestro). Ver CARPETAS.
    return None


# Divisiones que se publican leyendo la carpeta de fotos, no el maestro.
# (cat, sub, carpeta relativa a FOTOS PRODUCTOS, nombre por defecto)
CARPETAS = [
    ("lavabos", "lavabo", "TALAVERA/LAVABOS", "Lavabo de talavera"),
    ("wc-decorados", "wc", "TALAVERA/WC DECORADOS", "WC decorado"),
    ("muebles-de-bano", "mueble", "TALAVERA/PAQUETES DE BAÑO", "Mueble de baño"),
    ("piedra", "fachaletas", "FACHALETAS DE PIEDRA", "Fachaleta de piedra"),
    ("piedra", "mallas", "MALLAS DE PIEDRA", "Malla de piedra"),
    ("teja", "teja", "TEJA", "Teja de barro"),
]
# Carpetas de trabajo que no se publican nunca.
NO_PUBLICAR = ("_PARA BORRAR", "_SUELTAS", "SIN LIGAR", "_ARCHIVO", "_ZIP", "SIN IDENTIFICAR")


def existe(publico, ruta):
    rel = ruta[len("FOTOS PRODUCTOS/"):] if ruta.upper().startswith("FOTOS PRODUCTOS/") else ruta
    return (publico / rel).exists(), "/fotos/" + rel


def desde_maestro(xlsx, publico):
    wb = openpyxl.load_workbook(xlsx, read_only=True, data_only=True)
    hoja = wb["CATALOGO"]
    filas = hoja.iter_rows(values_only=True)
    encabezado = list(next(filas))
    idx = {n: i for i, n in enumerate(encabezado)}
    faltan = [c for c in COLUMNAS_PUBLICAS if c not in idx]
    if faltan:
        sys.exit(f"ERROR: el Excel no tiene estas columnas: {faltan}")

    fichas = {}
    desc = {"descontinuado": 0, "no_rusticos": 0, "formato_excluido": 0, "sin_foto": 0,
            "fuera_del_arbol": 0}
    for fila in filas:
        if not fila or not fila[idx["CODIGO"]]:
            continue
        if "escontinuado" in str(fila[idx["ESTADO"]] or ""):
            desc["descontinuado"] += 1
            continue
        if str(fila[idx["RUSTICOS"]] or "").strip().upper() == "NO":
            desc["no_rusticos"] += 1
            continue
        if not fila[idx["FOTO"]]:
            desc["sin_foto"] += 1
            continue
        if str(fila[idx["FORMATO"]] or "").strip().upper() in EXCLUIR_FORMATO:
            desc["formato_excluido"] += 1
            continue

        p = {}
        for col in COLUMNAS_PUBLICAS:
            v = fila[idx[col]]
            if v is None or str(v).strip() == "":
                continue
            p[col.lower()] = str(v).strip() if isinstance(v, str) else v
        # el codigo solo sirve para clasificar decorados; NO se publica
        p["_codigo"] = str(fila[idx["CODIGO"]])
        c = clasificar(p)
        if c is None:
            desc["fuera_del_arbol"] += 1
            continue
        p["cat"], p["sub"] = c

        crudas = [x.strip() for x in str(p["foto"]).split("|") if x.strip()]
        fotos = []
        for cr in crudas:
            ok, url = existe(publico, normaliza_ruta_foto(cr))
            if ok:
                fotos.append(url)
        if not fotos:
            desc["sin_foto"] += 1
            continue

        es_cintilla = p["categoria"] == "Cintilla"
        url = slug(p.get("acabado"), p.get("producto"), p.get("color"),
                   p.get("formato") if es_cintilla else None)
        f = fichas.get(url)
        if f is None:
            nombre = nombre_corto(p.get("producto"))
            if es_cintilla:
                nombre += " " + bonito(p.get("formato"))
            if p["cat"] == "terminaciones":
                # la pieza primero, luego acabado y color (Alek 2026-09-10)
                pieza = p.get("pieza_forma") if p.get("tipo_pieza") == "Corniza" else p.get("tipo_pieza")
                nombre = " ".join(x for x in (bonito(pieza), bonito(p.get("acabado")), bonito(p.get("color"))) if x)
            f = {
                "id": url,
                "nombre": nombre,
                "cat": p["cat"], "sub": p["sub"],
                "acabado": p.get("acabado"),
                "colores": [c.strip() for c in str(p.get("color", "")).split("/") if c.strip()],
                "foto": fotos[0],
                "galeria": [],
                "formatos": [],
            }
            fichas[url] = f
        for g in fotos:
            if g != f["foto"] and g not in f["galeria"]:
                f["galeria"].append(g)
        fmt = {"formato": p.get("formato")}
        if p.get("medida"):
            fmt["medida"] = p["medida"]
        if p.get("pz_m2"):
            fmt["pz_m2"] = p["pz_m2"]
        if fmt not in f["formatos"]:
            f["formatos"].append(fmt)

    # ---- REGLA DURA (heredada de Bodega, Alek 2026-09-10 para Rusticos):
    # una foto compartida por fichas de DISTINTO color muestra la forma, no el
    # color, y engaña (el "Escama brillante azul" salia con ESCAMAS.webp de
    # otro color). Esas fichas no se publican hasta tener su foto.
    por_foto = {}
    for f in fichas.values():
        por_foto.setdefault(f["foto"], set()).add(tuple(f["colores"]))
    genericas = {u for u, f in fichas.items() if len(por_foto[f["foto"]]) > 1}
    # ---- y en boutique/terminaciones el nombre del archivo debe traer el
    # color de la ficha (ANGULO AZUL DESLAVADO -> Azul Cobalto vale por "AZUL";
    # ESCAMAS TURQUESA DESLAVADO -> Azul Turquesa vale por "TURQUESA").
    sin_color = set()
    for u, f in fichas.items():
        if f["cat"] not in ("boutique", "terminaciones") or not f["colores"]:
            continue
        archivo = sin_acentos(f["foto"].rsplit("/", 1)[-1]).upper()
        palabras = [w for c in f["colores"] for w in sin_acentos(c).upper().split() if len(w) > 2]
        if palabras and not any(w in archivo for w in palabras):
            sin_color.add(u)
    for u in genericas | sin_color:
        fichas.pop(u, None)
    desc["foto_generica"] = len(genericas)
    desc["foto_sin_color"] = len(sin_color - genericas)

    # candado: nada prohibido se colo
    for f in fichas.values():
        for k in f:
            assert k.upper() not in COLUMNAS_PROHIBIDAS, f"FUGA: {k} en {f['id']}"
        for fm in f["formatos"]:
            for k in fm:
                assert k.upper() not in COLUMNAS_PROHIBIDAS, f"FUGA: {k} en {f['id']}"
    return list(fichas.values()), desc


def desde_carpetas(fotos_dir, publico):
    out = []
    for cat, sub, carpeta, defecto in CARPETAS:
        base = fotos_dir / carpeta
        if not base.exists():
            print(f"  aviso: no existe {base}")
            continue
        for src in sorted(base.rglob("*")):
            if src.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp"):
                continue
            rel = "FOTOS PRODUCTOS/" + src.relative_to(fotos_dir).as_posix()
            if any(x in rel.upper() for x in NO_PUBLICAR):
                continue
            ok, url = existe(publico, normaliza_ruta_foto(rel))
            if not ok:
                continue
            tallo = src.stem.strip()
            # nombres de camara (UUID) -> nombre generico de la division
            nombre = defecto if re.fullmatch(r"[0-9A-F-]{20,}", tallo.upper()) else bonito(tallo)
            nombre = re.sub(r"\s+\d+$", "", nombre) if nombre.lower().startswith(("aguamanil",)) else nombre
            out.append({
                "id": slug(cat, sub, tallo),
                "nombre": nombre,
                "cat": cat, "sub": sub,
                "colores": [],
                "foto": url, "galeria": [], "formatos": [],
            })
    return out


# Mosaico de pasta: el maestro trae UNA foto por ficha, pero la carpeta tiene
# varias del mismo numero de colores. Se suman a la galeria (Alek 2026-09-12).
GALERIA_DESDE_CARPETA = ("mosaico-de-pasta",)


def completar_galeria(piezas, publico):
    sumadas = 0
    for f in piezas:
        if f["cat"] not in GALERIA_DESDE_CARPETA or not f.get("foto"):
            continue
        carpeta = publico / Path(f["foto"].replace("/fotos/", "")).parent
        if not carpeta.is_dir():
            continue
        for src in sorted(carpeta.iterdir()):
            if src.suffix.lower() != ".webp":
                continue
            url = "/fotos/" + src.relative_to(publico).as_posix()
            if url != f["foto"] and url not in f["galeria"]:
                f["galeria"].append(url)
                sumadas += 1
    return sumadas


def main():
    xlsx = Path(sys.argv[1] if len(sys.argv) > 1 else "../CATALOGO_MAESTRO.xlsx")
    fotos_dir = Path(sys.argv[2] if len(sys.argv) > 2 else "../FOTOS PRODUCTOS")
    publico = Path("public/fotos")
    salida = Path("src/data/galeria.json")

    piezas, desc = desde_maestro(xlsx, publico)
    carpetas = desde_carpetas(fotos_dir, publico)
    vistos = {p["id"] for p in piezas}
    for c in carpetas:
        if c["id"] not in vistos:
            piezas.append(c)
            vistos.add(c["id"])

    sumadas = completar_galeria(piezas, publico)
    print(f"galeria desde carpeta: +{sumadas} fotos")

    piezas.sort(key=lambda p: (p["cat"], p["sub"], p["nombre"]))
    salida.write_text(json.dumps(piezas, ensure_ascii=False, separators=(",", ":")),
                      encoding="utf-8")

    por_cat = {}
    for p in piezas:
        por_cat[p["cat"]] = por_cat.get(p["cat"], 0) + 1
    print(f"{len(piezas)} piezas -> {salida}")
    for k, v in sorted(por_cat.items()):
        print(f"  {k:20s} {v}")
    print("descartes:", desc)


if __name__ == "__main__":
    main()
