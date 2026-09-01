# Bodega de Talavera — sitio

Tienda en linea de Bodega de Talavera (Grupo RAAC).

## Como se publica
Cloudflare Pages compila este repo en cada push a `main`.
- Build command: `npm run build`
- Output directory: `dist`
- Las funciones de `functions/api/` se compilan solas (por eso vivimos aqui y no subiendo ZIP).

## Variables (Cloudflare Pages > Settings > Variables and secrets)
| Variable | Tipo | Que es |
|---|---|---|
| `PAYPAL_CLIENT_ID` | Texto | Client ID de PayPal |
| `PAYPAL_SECRET` | Secret | Secret de PayPal |
| `PAYPAL_ENTORNO` | Texto | `sandbox` o `live` |
| `MP_ACCESS_TOKEN` | Secret | Access Token de Mercado Pago |

## Como se actualiza el catalogo
1. `python generar_catalogo.py CATALOGO_MAESTRO.xlsx src/data/productos.json public/fotos`
2. `python convertir.py` convierte los PNG nuevos a WebP dentro de `public/fotos/`
3. `python test_fotos.py` — falla si alguna ficha comparte foto con otro color
4. commit + push

El `CATALOGO_MAESTRO.xlsx` NO vive aqui (esta en la carpeta RAAC). Lo que se publica es `src/data/productos.json`.
