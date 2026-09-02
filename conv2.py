import os, sys, glob
from PIL import Image
sys.path.insert(0,'.')
from generar_catalogo import normaliza_ruta_foto
BASE=os.path.expanduser('~/mnt/RAAC')
n=0; skip=0
for src in glob.glob(BASE+'/FOTOS PRODUCTOS/**/*', recursive=True):
    if not os.path.isfile(src) or not src.upper().endswith(('.PNG','.JPG','.JPEG')): continue
    rel=os.path.relpath(src, BASE)
    dst=normaliza_ruta_foto(rel)[len('FOTOS PRODUCTOS/'):]
    out=os.path.join('public/fotos',dst)
    if os.path.exists(out): skip+=1; continue
    os.makedirs(os.path.dirname(out),exist_ok=True)
    im=Image.open(src).convert('RGB'); im.thumbnail((700,700), Image.LANCZOS)
    im.save(out,'WEBP',quality=80,method=6); n+=1
print("convertidas:",n,"| ya estaban:",skip)
