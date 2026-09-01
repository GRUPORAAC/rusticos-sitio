# check: ninguna ficha publicada usa una foto compartida con otro color
import json, collections, sys
d = json.load(open('src/data/productos.json', encoding='utf-8'))
por = collections.defaultdict(set)
for p in d:
    por[p['foto']].add(p.get('color'))
malas = {f: c for f, c in por.items() if len(c) > 1}
assert not malas, f'foto compartida por varios colores: {list(malas)[:3]}'
assert not any(p.get('foto_generica') for p in d), 'quedo una ficha marcada como generica'
print(f'OK  {len(d)} fichas, todas con foto propia de su color')
