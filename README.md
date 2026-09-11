# Rústicos Artesanales — sitio

Escaparate digital de la tienda física (Av. División del Norte 2604, Coyoacán).
**Sin carrito, sin pago en línea, sin precios.** El cierre pasa por tienda,
WhatsApp o correo. Brief: `RUSTICOS ARTESANALES/07 - Sitio Web/BRIEF_SITIO_RUSTICOS.md`.

Nació clonando el repo de Bodega de Talavera (Astro + Cloudflare Pages) y
quitándole carrito, Mercado Pago, PayPal, KV de pedidos y correos de compra.

## Cómo se corre
Doble clic en **`INICIAR_SITIO.cmd`**: abre http://localhost:4321 en el navegador y deja el servidor
corriendo en su propia ventana. Ciérrala para apagarlo. (Fija el PATH de Node solo, porque en esta
máquina `node` no está en el PATH.)

A mano:
```
npm install
npm run dev -- --host    # http://localhost:4321  (--host: si no, solo escucha IPv6)
npm run build            # dist/
```

## Cómo se publica
Cloudflare Pages compila el repo en cada push a `main`.
- Build command: `npm run build`
- Output directory: `dist`
- No hay `functions/`: el sitio es 100% estático. No necesita variables.

## Cómo se actualiza la galería
1. `python convertir.py "../FOTOS PRODUCTOS"` — convierte a WebP lo nuevo dentro de `public/fotos/`.
2. `python generar_galeria.py ../CATALOGO_MAESTRO.xlsx "../FOTOS PRODUCTOS"` — escribe `src/data/galeria.json`.
3. commit + push.

`generar_galeria.py` publica **solo** nombre, foto, color y formatos. Nunca
precio, código, costo ni proveedor (lista blanca + candado). Regla dura: sin
foto no se publica.

Dos fuentes, a propósito:
- El **maestro** manda para talavera, barro, loseta y mosaico de pasta.
- Las **carpetas** de fotos mandan para lavabos, WC, muebles de baño y piedra
  (fachaletas y mallas): la foto es el producto y todavía no están dadas de alta.

## Dónde se cambian las cosas
| Qué | Dónde |
|---|---|
| Categorías del menú, nombres, lemas, notas técnicas | `src/lib/catalogo.js` → `ARBOL` |
| A qué categoría del sitio va cada fila del maestro | `generar_galeria.py` → `clasificar()` |
| Teléfonos, WhatsApp, correo, horario, redes, mapa | `src/lib/catalogo.js` → `CONTACTO` |
| Grupos del catálogo (nivel 1: /catalogo/<grupo>/) | `src/lib/catalogo.js` → `GRUPOS_DEF` |
| Textos de las tres secuencias de la home | `src/data/secuencias.json` |
| Encender las secuencias por scroll | `src/pages/index.astro` → `SECUENCIAS_ACTIVAS = true` |
| Paleta, tipografía, cabecera, pie, visor | `src/layouts/Base.astro` |
| Colores del filtro | `src/data/colores.json` y `src/data/familias.json` |

## ⚠ Pendientes conocidos (brief)
- **Lista de categorías del menú**: el `ARBOL` actual es una propuesta. Falta que
  Alek/Federico confirmen nombres y orden de cara al cliente.
- **Animaciones apagadas** (Alek 2026-09-10): nada se anima hasta tener contenido real. Las secuencias
  están escritas pero desactivadas con `SECUENCIAS_ACTIVAS = false`.
- **Secuencias de la home** (hornos, esmaltado, mueble con lavabos): los cuadros
  en `public/secuencias/` son **provisionales**, generados por
  `cuadros_provisionales.py`. Cuando lleguen las fotos (tripie fijo, luz
  idéntica, manual bloqueado, 24–60 tomas) se recortan todas igual, se guardan
  como `001.webp, 002.webp…` y se ajusta `cuadros` y `placeholder` en
  `src/data/secuencias.json`.
- **Teja, cantera y recinto** no tienen fotos: su página dice "lo tenemos en tienda".
- **og.png** es provisional (símbolo sobre marfil); falta una imagen para redes.
- **Fotos aplicado en obra**: hoy se reutilizan las de talavera instalada de
  RAAC (`public/fotos/hero/`). A futuro, una por división.

## Navegación (de lo general a lo particular)
`/catalogo/` (5 grupos) → `/catalogo/<grupo>/` (sus categorías) → `/<categoria>/` (galería con filtros
y especificaciones). El menú superior lleva directo a los grupos; no hay menú desplegable.
Las fotos se muestran siempre completas, nunca recortadas.

## Reglas de marca que el sitio respeta
- Paleta: café cacao `#3C2A24`, terracota `#B45A2A`, arena `#D8B89A`, marfil `#FAF6EF`.
- Cormorant Garamond 600 en titulares; Montserrat 400/500 en texto.
- Descriptor: **Acabados artesanales para tu proyecto**.
- Nunca "arte" ni "artesanía": son **productos artesanales**.
- Sin degradados de marca, sombras ni efectos metálicos en el logo.
