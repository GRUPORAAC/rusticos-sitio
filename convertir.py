"""PNG/JPG del catalogo -> WebP dentro de public/fotos/.

    python convertir.py "../FOTOS PRODUCTOS" [maximo]

Solo convierte lo que falta, asi que se puede correr por tandas y volver a
llamar hasta que diga 0. Las rutas de salida se normalizan igual que en
generar_galeria.py (MAYUSCULAS, sin acentos) para que las URLs nazcan limpias.
"""
import glob
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from generar_galeria import normaliza_ruta_foto  # noqa: E402

base = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "../FOTOS PRODUCTOS")
tope = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
raiz = os.path.dirname(base)  # para que rel empiece en "FOTOS PRODUCTOS/"

n = saltadas = 0
patrones = ("*.png", "*.PNG", "*.jpg", "*.JPG", "*.jpeg", "*.JPEG")
archivos = set()
for pat in patrones:
    archivos.update(glob.glob(base + "/**/" + pat, recursive=True))
for src in sorted(archivos):
    rel = os.path.relpath(src, raiz).replace("\\", "/")
    if any(p in rel.upper() for p in ("_PARA BORRAR", "_SUELTAS", "SIN LIGAR", "_ARCHIVO", "_ZIP")):
        continue
    dst = normaliza_ruta_foto(rel)[len("FOTOS PRODUCTOS/"):]
    out = os.path.join("public", "fotos", dst)
    if os.path.exists(out):
        saltadas += 1
        continue
    if n >= tope:
        break
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(src).convert("RGB")
    im.thumbnail((900, 900), Image.LANCZOS)
    im.save(out, "WEBP", quality=72, method=6)
    n += 1
print(f"convertidas {n} · ya estaban {saltadas}")
