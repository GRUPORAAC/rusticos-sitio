"""PNG del catalogo -> WebP dentro de public/fotos/.

    python convertir.py "<ruta a FOTOS PRODUCTOS>" [maximo]

Solo convierte lo que falta, asi que se puede correr por tandas (el segundo
argumento limita cuantas hace en esta pasada) y volver a llamar hasta que diga 0.
ponytail: antes las rutas estaban clavadas en el script y apuntaban a una
carpeta que ya no existe (Alek 2026-09-03).
"""
import os, sys, glob
from PIL import Image
sys.path.insert(0, '.')
from generar_catalogo import normaliza_ruta_foto

base = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser('~/mnt/RAAC/FOTOS PRODUCTOS')
tope = int(sys.argv[2]) if len(sys.argv) > 2 else 10**9
base = os.path.abspath(base)
raiz = os.path.dirname(base)  # para que rel empiece en "FOTOS PRODUCTOS/"

n = saltadas = 0
for src in sorted(glob.glob(base + '/**/*.png', recursive=True)):
    rel = os.path.relpath(src, raiz)
    # las carpetas de trabajo no se publican
    if any(p in rel.upper() for p in ('_PARA BORRAR', '_SUELTAS', 'SIN LIGAR', '_ARCHIVO', '_ZIP')):
        continue
    dst = normaliza_ruta_foto(rel)[len('FOTOS PRODUCTOS/'):]
    out = os.path.join('public', 'fotos', dst)
    if os.path.exists(out):
        saltadas += 1
        continue
    if n >= tope:
        break
    os.makedirs(os.path.dirname(out), exist_ok=True)
    im = Image.open(src).convert('RGB')
    im.thumbnail((700, 700), Image.LANCZOS)
    im.save(out, 'WEBP', quality=70, method=6)
    n += 1
print(f'convertidas {n} · ya estaban {saltadas}')
