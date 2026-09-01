import os, sys, unicodedata, re, glob
from PIL import Image
sys.path.insert(0,'.')
from generar_catalogo import normaliza_ruta_foto
ORIG=['/home/claude/trabajo/salida','/home/claude/trabajo/fase2/salida']
n=0
for base in ORIG:
    for src in glob.glob(base+'/**/*.png', recursive=True):
        rel=os.path.relpath(src, base)                       # FOTOS PRODUCTOS/...
        dst=normaliza_ruta_foto(rel)[len('FOTOS PRODUCTOS/'):]
        out=os.path.join('fotos',dst)
        if os.path.exists(out): continue
        os.makedirs(os.path.dirname(out),exist_ok=True)
        im=Image.open(src).convert('RGB'); im.thumbnail((700,700), Image.LANCZOS)
        im.save(out,'WEBP',quality=70,method=6); n+=1
print('convertidas',n)
