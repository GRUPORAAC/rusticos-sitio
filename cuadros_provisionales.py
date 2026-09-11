"""Cuadros PROVISIONALES para las tres secuencias de la home.

    python cuadros_provisionales.py

El material fotografico real (brief 2026-09-10: tripie fijo, luz identica,
manual bloqueado, 24-60 tomas por secuencia) todavia no llega. Mientras, esto
genera 36 cuadros por secuencia en la paleta de la marca para que el motor de
scroll se pueda ver y ajustar. Cuando lleguen las fotos:

    1. Recortarlas TODAS igual (mismo encuadre) y guardarlas como
       public/secuencias/<id>/001.webp, 002.webp, ...
    2. Poner el numero de cuadros en src/data/secuencias.json y
       "placeholder": false.
    3. Borrar este script si ya no hace falta.
"""
import math
import os

from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H, N = 1600, 1000, 36
CACAO, TERRACOTA, ARENA, MARFIL = (60, 42, 36), (180, 90, 42), (216, 184, 154), (250, 246, 239)


def mezcla(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def fondo(color):
    im = Image.new("RGB", (W, H), color)
    d = ImageDraw.Draw(im)
    # trama muy suave de azulejo 10x10 para que se sienta el material
    paso = 100
    for x in range(0, W, paso):
        d.line([(x, 0), (x, H)], fill=mezcla(color, CACAO, 0.05), width=2)
    for y in range(0, H, paso):
        d.line([(0, y), (W, y)], fill=mezcla(color, CACAO, 0.05), width=2)
    return im


def cupula(d, cx, cy, r, color, ancho=10):
    """Silueta del simbolo de la marca (cupula), a trazo."""
    d.arc([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=color, width=ancho)
    d.line([(cx - r * 1.6, cy), (cx - r, cy)], fill=color, width=ancho)
    d.line([(cx + r, cy), (cx + r * 1.6, cy)], fill=color, width=ancho)
    d.rectangle([cx - r * 0.18, cy - r * 1.45, cx + r * 0.18, cy - r], outline=color, width=ancho)
    d.line([(cx, cy - r * 1.75), (cx, cy - r * 1.45)], fill=color, width=ancho)
    d.rectangle([cx - r * 0.35, cy - r * 0.5, cx + r * 0.35, cy], fill=color)


def hornos(t):
    # el barro se calienta: arena -> terracota; el brillo crece al centro
    im = fondo(mezcla(ARENA, TERRACOTA, t * 0.85))
    glow = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    r = int(200 + 500 * t)
    g.ellipse([W / 2 - r, H / 2 - r * 0.7, W / 2 + r, H / 2 + r * 0.7], fill=mezcla((0, 0, 0), (150, 80, 30), t))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im = ImageChops.add(im, glow)
    d = ImageDraw.Draw(im)
    cupula(d, W / 2, H * 0.62, 190, mezcla(CACAO, MARFIL, t * 0.6))
    return im


def esmaltado(t):
    # una franja de esmalte barre la pieza de izquierda a derecha (serigrafia)
    im = fondo(ARENA)
    d = ImageDraw.Draw(im)
    borde = int(W * t)
    d.rectangle([0, 0, borde, H], fill=mezcla(ARENA, (46, 76, 155), 0.9))
    for k in range(0, 8):
        x = borde - k * 18
        if x > 0:
            d.line([(x, 0), (x, H)], fill=mezcla((46, 76, 155), MARFIL, k / 8), width=6)
    cupula(d, W / 2, H * 0.62, 190, MARFIL if borde > W / 2 + 190 else CACAO)
    return im


def mueble(t):
    # el "mueble" es fijo; cambia el lavabo (color y forma) por tercios
    im = fondo(MARFIL)
    d = ImageDraw.Draw(im)
    d.rectangle([W * 0.28, H * 0.55, W * 0.72, H * 0.9], fill=CACAO)                 # mueble
    d.rectangle([W * 0.25, H * 0.52, W * 0.75, H * 0.57], fill=mezcla(CACAO, ARENA, 0.5))  # cubierta
    paleta = [(46, 76, 155), TERRACOTA, (62, 125, 58)]
    k = min(2, int(t * 3))
    f = (t * 3) - k
    col = mezcla(paleta[k], paleta[(k + 1) % 3], max(0, f - 0.7) / 0.3)
    r = 130 + 20 * math.sin(t * math.pi * 3)
    d.ellipse([W / 2 - r * 1.3, H * 0.52 - r * 0.55, W / 2 + r * 1.3, H * 0.52 + r * 0.55], fill=MARFIL, outline=col, width=16)
    d.ellipse([W / 2 - r * 0.9, H * 0.52 - r * 0.35, W / 2 + r * 0.9, H * 0.52 + r * 0.35], fill=col)
    return im



SECS = {"hornos": hornos, "esmaltado": esmaltado, "mueble": mueble}

if __name__ == "__main__":
    for nombre, fn in SECS.items():
        carpeta = os.path.join("public", "secuencias", nombre)
        os.makedirs(carpeta, exist_ok=True)
        for i in range(N):
            t = i / (N - 1)
            im = fn(t)
            im.save(os.path.join(carpeta, f"{i + 1:03d}.webp"), "WEBP", quality=68, method=4)
        print(nombre, N, "cuadros")
