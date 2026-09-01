#!/usr/bin/env python3
"""Liga cada fila a la foto de SU color, en terminaciones y en boutique.

Las fotos se llaman "<PIEZA> <descriptor>" donde el descriptor mezcla color y
acabado con los nombres del proveedor ("LISTELO Amarillo Liso"); el catalogo
los separa en COLOR y ACABADO y usa los nombres de RAAC ("Mostaza"/"Liso").
El cruce exige coincidencia EXACTA de palabras, probando cada ALIAS por
separado. Si no hay foto de ese color se deja la generica de la familia y el
sitio la marca solo como "foto de referencia".
"""
import re, sys, unicodedata, openpyxl

RAIZ = 'FOTOS PRODUCTOS'

# carpeta de fotos -> como identificar la fila
GRUPOS = [
    # (prefijo de carpeta, funcion que dice si la fila pertenece, generica)
    ('TALAVERA/TERMINACIONES/ANGULO',            'Ángulo',       'TALAVERA/TERMINACIONES/Ángulo.PNG'),
    ('TALAVERA/TERMINACIONES/BAGUETA',           'Bagueta',      'TALAVERA/TERMINACIONES/Bagueta.PNG'),
    ('TALAVERA/TERMINACIONES/CODO',              'Codo',         'TALAVERA/TERMINACIONES/Codo.PNG'),
    ('TALAVERA/TERMINACIONES/REMATE',            'Remate',       'TALAVERA/TERMINACIONES/Remate.PNG'),
    ('TALAVERA/TERMINACIONES/UÑA',               'Uña',          'TALAVERA/TERMINACIONES/Uña.PNG'),
    ('TALAVERA/TERMINACIONES/CORNIZAS/LAPIZ',    'Lápiz',        'TALAVERA/TERMINACIONES/Lápiz .PNG'),
    ('TALAVERA/TERMINACIONES/CORNIZAS/LISTELO',  'Listelo',      'TALAVERA/TERMINACIONES/Listelo.PNG'),
    ('TALAVERA/TERMINACIONES/CORNIZAS/PECHO PALOMA', 'Pecho Paloma', 'TALAVERA/TERMINACIONES/Pecho Paloma .PNG'),
    ('TALAVERA/TERMINACIONES/CORNIZAS/TRENZA',   'Trenza',       'TALAVERA/TERMINACIONES/Trenza.PNG'),
    ('TALAVERA/BOUTIQUE/ESCAMA',                 'Escama',       'TALAVERA/BOUTIQUE/Escamas .PNG'),
    ('TALAVERA/BOUTIQUE/ESPANOLITA',             'Español',      'TALAVERA/BOUTIQUE/Españolita.PNG'),
    ('TALAVERA/BOUTIQUE/HEXAGONITO',             'Hexagonito',   'TALAVERA/BOUTIQUE/Hexagonito.PNG'),
]

def pal(s):
    s = unicodedata.normalize('NFKD', str(s or ''))
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return {w for w in re.split(r'[^a-z0-9]+', s.lower()) if w}

def main(xlsx, listado, salida):
    disco = [l.strip() for l in open(listado, encoding='utf-8') if l.strip()]
    indice = {}
    for carpeta, _, _ in GRUPOS:
        pieza = pal(carpeta.split('/')[-1])
        # el nombre del archivo repite la pieza: "ESCAMA/Escamas Arena.png"
        for f in disco:
            if f.startswith(carpeta + '/'):
                nombre = f.split('/')[-1]
                desc = pal(nombre.rsplit('.', 1)[0]) - pieza - {'escamas', 'espanolita', 'lapiz'}
                indice.setdefault(carpeta, []).append((desc, f))

    wb = openpyxl.load_workbook(xlsx)
    s = wb['CATALOGO']
    h = {c.value: c.column for c in s[1]}
    ligadas = genericas = 0
    sin_foto = set()
    usadas = set()

    for r in range(2, s.max_row + 1):
        if str(s.cell(r, h['BODEGA']).value or '').upper() != 'SI':
            continue
        prod = str(s.cell(r, h['PRODUCTO']).value or '')
        tp = str(s.cell(r, h['TIPO_PIEZA']).value or '')
        pf = str(s.cell(r, h['PIEZA_FORMA']).value or '')
        etiqueta = f'{prod} {tp} {pf}'

        # "Español" debe casar con ESPAÑOLITO y ESPAÑOLA: match por prefijo de palabra
        pals = pal(etiqueta)
        def casa(clave):
            return all(any(w.startswith(k) for w in pals) for k in pal(clave))
        grupo = next((g for g in GRUPOS if casa(g[1])), None)
        if not grupo:
            continue
        carpeta, _, generica = grupo

        color = str(s.cell(r, h['COLOR']).value or '').strip()
        ac = pal(s.cell(r, h['ACABADO']).value)
        nombres = [color] + [a.strip() for a in str(s.cell(r, h['ALIAS']).value or '').split('/') if a.strip()]
        candidatos = [c for n in nombres for c in (pal(n) | ac, pal(n)) if c]

        mejor = next((f for desc, f in indice.get(carpeta, []) if any(desc == c for c in candidatos)), None)
        if mejor:
            s.cell(r, h['FOTO']).value = f'{RAIZ}/{mejor}'
            usadas.add(mejor)
            ligadas += 1
        else:
            s.cell(r, h['FOTO']).value = f'{RAIZ}/{generica}'
            genericas += 1
            if color:
                sin_foto.add((carpeta.split('/')[-1], color, str(s.cell(r, h['ACABADO']).value)))

    wb.save(salida)
    print(f'ligadas a su color: {ligadas} · con foto generica: {genericas}')

    huerfanas = [f for c, _, _ in GRUPOS for d, f in indice.get(c, []) if f not in usadas]
    print(f'\nFOTOS EN DISCO QUE NINGUN PRODUCTO USA: {len(huerfanas)}')
    for f in sorted(huerfanas):
        print('   ·', f.replace('TALAVERA/', ''))
    print(f'\nCOMBINACIONES SIN FOTO DE SU COLOR: {len(sin_foto)}')
    for c, col, acab in sorted(sin_foto):
        print(f'   {c:14} {col} · {acab}')

if __name__ == '__main__':
    main(*sys.argv[1:4])
