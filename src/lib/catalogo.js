import bruto from '../data/galeria.json';
import hex from '../data/colores.json';
import FAM from '../data/familias.json';

export const COLORES = hex;

// ------------------------------------------------------------------ CONTACTO
// Datos del brief 2026-09-10. Un solo lugar: cabecera, pie, /contacto y los
// botones de WhatsApp leen de aqui.
export const CONTACTO = {
  nombre: 'Rústicos Artesanales',
  descriptor: 'Acabados artesanales para tu proyecto',
  direccion: 'Av. División del Norte 2604, San Diego Churubusco, Coyoacán, 04120, CDMX',
  direccionCorta: 'Av. División del Norte 2604, Coyoacán',
  telefonos: ['55 5605 0514', '55 7090 4623'],
  whatsapp: '52 55 6501 5280',
  whatsappBonito: '+52 55 6501 5280',
  correo: 'info@rusticosartesanalescdmx.com',
  horario: [
    { dias: 'Lunes a viernes', horas: '9:00 – 19:00' },
    { dias: 'Sábados', horas: '9:00 – 16:00' },
  ],
  instagram: 'https://www.instagram.com/rusticosartesanalescdmx/',
  facebook: 'https://www.facebook.com/RusticosArtesanales/',
  usuario: '@rusticosartesanalescdmx',
  mapsGoogle: 'https://maps.google.com/?q=Av.+Divisi%C3%B3n+del+Norte+2604%2C+San+Diego+Churubusco%2C+Coyoac%C3%A1n%2C+04120+Ciudad+de+M%C3%A9xico',
  mapsApple: 'https://maps.apple.com/?q=Av.+Divisi%C3%B3n+del+Norte+2604%2C+Coyoac%C3%A1n%2C+Ciudad+de+M%C3%A9xico',
  mapaEmbed: 'https://maps.google.com/maps?q=Av.%20Divisi%C3%B3n%20del%20Norte%202604%2C%20Coyoac%C3%A1n%2C%20CDMX&z=16&output=embed',
};

const tel = (t) => 'tel:+52' + t.replace(/\s+/g, '');
export const telHref = tel;
export const waHref = (texto) =>
  `https://wa.me/${CONTACTO.whatsapp.replace(/\s+/g, '')}` +
  (texto ? `?text=${encodeURIComponent(texto)}` : '');

// --------------------------------------------------------------------- ARBOL
// El arbol del SITIO: comercial y corto, con los nombres de cara al cliente.
// NO es el del CATALOGO MAESTRO (interno) y no se fuerza que coincidan.
//
// ⚠ PROPUESTA (brief 2026-09-10, bloqueante abierto): falta que Alek/Federico
// confirmen la lista y los nombres del menu. Se cambia AQUI y en
// generar_galeria.py (clasificar) y todo el sitio se reacomoda solo.
//
// `specs` son las especificaciones tecnicas de formatos de la categoria: lo
// que se puede sostener con el catalogo. Los formatos y piezas por m² se
// calculan de la galeria; aqui van solo las notas fijas.
export const ARBOL = [
  {
    slug: 'talavera-lisa', nombre: 'Talavera lisa', grupo: 'Talavera',
    portada: ['especial azul', 'azul colonial', 'liso azul'],
    lema: 'Un solo color, esmaltado. La base de todo.',
    subs: [
      { slug: 'esmaltada', nombre: 'Esmaltada' },
      { slug: 'deslavada', nombre: 'Deslavada' },
      { slug: 'mate', nombre: 'Mate' },
    ],
    specs: {
      intro: 'Azulejo de barro esmaltado, de talleres de Dolores Hidalgo. Se instala en muros, cocinas, baños, escaleras y fachadas.',
      notas: [
        'La caja de talavera trae 1 m² en todos los formatos.',
        'El 10 × 10 mide 10.8 × 10.8 cm reales.',
        'Producto artesanal: variaciones de color y medida de hasta 5% entre piezas.',
      ],
    },
  },
  {
    slug: 'talavera-decorada', nombre: 'Talavera decorada', grupo: 'Talavera',
    portada: ['cupula azul', 'girasol azul'],
    lema: 'Un diseño por pieza, en la carta de colores de la talavera.',
    subs: [
      { slug: 'sencillo', nombre: 'Sencillo' },
      { slug: 'elaborado', nombre: 'Elaborado' },
      { slug: 'ilustrado', nombre: 'Ilustrado' },
    ],
    specs: {
      intro: 'Diseños tradicionales y contemporáneos decorados sobre azulejo de talavera. Se combinan con la talavera lisa del mismo color.',
      notas: [
        'La caja trae 1 m² en todos los formatos.',
        'El diseño es el producto: cada diseño se pinta en los colores que se muestran.',
        'Variaciones de color y trazo de hasta 5% entre piezas: es un producto artesanal.',
      ],
    },
  },
  {
    slug: 'relieve', nombre: 'Relieve', grupo: 'Talavera',
    lema: 'Textura que se siente con la mano.',
    subs: [
      { slug: 'clasico', nombre: 'Clásico' },
      { slug: 'mate', nombre: 'Mate' },
      { slug: 'especiales', nombre: 'Especiales' },
    ],
    portada: ['lluvia rojo'],
    specs: {
      intro: 'Azulejo con el diseño en relieve. Se usa en cenefas, muros de acento y fachadas.',
      notas: ['La caja trae 1 m² en todos los formatos.'],
    },
  },
  {
    slug: 'boutique', nombre: 'Boutique', grupo: 'Talavera',
    porSubs: true,   // se entra por forma: escama, españolito, hexagonito
    lema: 'Formas que rompen la cuadrícula.',
    subs: [
      { slug: 'escama', nombre: 'Escama' },
      { slug: 'espanolito', nombre: 'Españolito' },
      { slug: 'hexagonito', nombre: 'Hexagonito' },
    ],
    portada: ['escama deslavado azul', 'escama azul', 'hexagonito azul'],
    specs: {
      intro: 'Piezas de talavera en formas especiales, en los mismos acabados y colores del azulejo liso. Se venden por pieza.',
      notas: ['Cada forma tiene su propio rendimiento por m²; lo indicamos por forma.'],
    },
  },
  {
    slug: 'texturizados', nombre: 'Texturizados', grupo: 'Talavera',
    portada: ['verde', 'azul', 'terracota'],
    lema: 'Estriado y petatillo: relieve fino sobre el liso.',
    subs: [{ slug: 'estriado', nombre: 'Estriado' }, { slug: 'petatillo', nombre: 'Petatillo' }],
    specs: {
      intro: 'Azulejo liso con textura fina en la superficie. Misma carta de colores que la talavera lisa.',
      notas: ['La caja trae 1 m² en todos los formatos.'],
    },
  },
  {
    slug: 'cintillas', nombre: 'Cintillas', grupo: 'Talavera',
    portada: ['terracota', 'vino', 'rojo'],
    lema: 'La franja que remata o dibuja el muro.',
    subs: [
      { slug: '5x10', nombre: '5 × 10 cm' },
      { slug: '5x15', nombre: '5 × 15 cm' },
      { slug: '5x20', nombre: '5 × 20 cm' },
      { slug: '7-5x15', nombre: '7.5 × 15 cm' },
      { slug: '7x20', nombre: '7 × 20 cm' },
      { slug: '10x20', nombre: '10 × 20 cm' },
    ],
    specs: {
      intro: 'Tiras de talavera en seis medidas. Se colocan en espiga, ladrillo o corrido, solas o combinadas con azulejo.',
      notas: ['Mismo barro y esmalte que el azulejo: los colores coinciden.'],
    },
  },
  {
    slug: 'terminaciones', nombre: 'Terminaciones', grupo: 'Talavera',
    portada: ['ángulo verde especial', 'angulo verde', 'verde especial', 'vino'],
    lema: 'La pieza que cierra el muro.',
    subs: [
      { slug: 'angulo', nombre: 'Ángulo' },
      { slug: 'bagueta', nombre: 'Bagueta' },
      { slug: 'remate', nombre: 'Remate' },
      { slug: 'codo', nombre: 'Codo' },
      { slug: 'una', nombre: 'Uña' },
      { slug: 'lapiz', nombre: 'Lápiz' },
      { slug: 'listelo', nombre: 'Listelo' },
      { slug: 'pecho-paloma', nombre: 'Pecho paloma' },
      { slug: 'trenza', nombre: 'Trenza' },
    ],
    specs: {
      intro: 'Molduras y remates de talavera en el mismo color y acabado del azulejo, para cerrar cantos, esquinas y cenefas.',
      notas: [
        'Se venden por pieza: las de 10 cm rinden 10 piezas por metro lineal y las de 15 cm, 7.',
        'Codo y uña son piezas sueltas para esquinas: no forman corrida.',
      ],
    },
  },
  {
    slug: 'lavabos', nombre: 'Lavabos', grupo: 'Baño',
    portada: ['dona veracruz'],
    lema: 'Talavera que se usa todos los días.',
    subs: [{ slug: 'lavabo', nombre: 'Lavabos' }],
    specs: {
      intro: 'Lavabos de talavera decorados: dona, canoa, aguamanil y sobreponer. Van con cualquier mueble o cubierta.',
      notas: ['Medidas de referencia: dona 40 cm de diámetro × 12 cm; canoa 54 × 38 × 11 cm.', 'Cada lavabo se decora pieza por pieza: el diseño puede variar ligeramente entre una y otra.'],
    },
  },
  {
    slug: 'muebles-de-bano', nombre: 'Muebles de baño', grupo: 'Baño',
    portada: ['romano talavereado azul'],
    lema: 'Un mueble, muchos lavabos.',
    subs: [{ slug: 'mueble', nombre: 'Muebles' }],
    specs: {
      intro: 'Muebles de herrería y madera con cubierta de talavera, pensados para combinar con el lavabo y el azulejo.',
      notas: ['Tamaños: micro 40 × 40, mini 50 × 45, mediano 60 × 50 y grande 65 × 51 cm (varían por modelo).'],
    },
  },
  {
    slug: 'wc-decorados', nombre: 'WC decorados', grupo: 'Baño',
    portada: ['cupula azul', 'girasol'],
    lema: 'El baño completo, en talavera.',
    subs: [{ slug: 'wc', nombre: 'WC' }],
    specs: {
      intro: 'Sanitarios decorados con los mismos diseños de los lavabos y la talavera decorada.',
      notas: ['Se decoran bajo pedido en el diseño y color que elijas.'],
    },
  },
  {
    slug: 'barro', nombre: 'Barro', grupo: 'Pisos',
    portada: ['artesanal'],
    lema: 'Loseta y ladrillo de barro natural.',
    subs: [{ slug: 'loseta', nombre: 'Losetas' }],
    specs: {
      intro: 'Pisos y recubrimientos de barro cocido: loseta artesanal, extruida, hexagonal y ladrillo. Para interiores, terrazas y patios.',
      notas: ['El barro natural se sella después de instalado.', 'Variaciones de tono entre piezas: es barro cocido, no cerámica industrial.'],
    },
  },
  {
    slug: 'mosaico-de-pasta', nombre: 'Mosaico de pasta', grupo: 'Pisos',
    porSubs: true,   // se navega por numero de colores, no con filtro (Alek 2026-09-12)
    portada: ['5 colores', '4 colores'],
    lema: 'Dibujos de cemento pigmentado, pieza por pieza.',
    subs: [
      { slug: '1-color', nombre: '1 color' },
      { slug: '2-colores', nombre: '2 colores' },
      { slug: '3-colores', nombre: '3 colores' },
      { slug: '4-colores', nombre: '4 colores' },
      { slug: '5-colores', nombre: '5 colores' },
    ],
    specs: {
      intro: 'Mosaico hidráulico de 20 × 20 cm. Se fabrica con el número de colores que pida el diseño.',
      notas: ['Se pule y sella una vez instalado.'],
    },
  },
  {
    slug: 'piedra', nombre: 'Piedra', grupo: 'Piedra y cantera',
    portada: ['tomboleado travertino', 'pepita'],
    lema: 'Fachaletas y mallas de piedra natural.',
    subs: [
      { slug: 'fachaletas', nombre: 'Fachaletas' },
      { slug: 'mallas', nombre: 'Mallas' },
    ],
    specs: {
      intro: 'Piedra natural cortada en fachaleta (piedrín, tronchado, tomboleado, cintilla) o montada en malla (pepita, paladiana, tronchado) para fachadas, muros y jardines.',
      notas: ['Las fachaletas de largo variable se combinan en obra; el ancho es fijo (5 o 10 cm).'],
    },
  },
  {
    slug: 'cantera', nombre: 'Cantera', grupo: 'Piedra y cantera',
    lema: 'Laminados, cintillas y piezas de cantera.',
    subs: [],
    specs: {
      intro: 'Cantera en laminado, cintilla y piezas especiales. La tenemos en tienda; las fotos vienen en camino.',
      notas: [],
    },
  },
  {
    slug: 'recinto', nombre: 'Recinto', grupo: 'Piedra y cantera',
    lema: 'Piedra volcánica para pisos y muros.',
    subs: [],
    specs: {
      intro: 'Recinto en loseta y pepita. Lo tenemos en tienda; las fotos vienen en camino.',
      notas: [],
    },
  },
  {
    slug: 'teja', nombre: 'Teja', grupo: 'Techos',
    lema: 'Teja de barro y sus terminaciones.',
    // Alek 2026-09-12: primero las de pano instalado, no la pieza suelta.
    portada: ['casa grande terracota', 'casa grande flameado santa', 'estriada', 'teja corcega terracota natural'],
    subs: [],
    specs: {
      intro: 'Teja de barro en varios acabados, con sus terminaciones (cumbrera, cónica, media caña). Formatos y acabados varían; lo confirmamos en tienda.',
      notas: [],
    },
  },
  {
    slug: 'complementos', nombre: 'Complementos', grupo: 'Complementos',
    porSubs: true,
    lema: 'Lo que hace falta para instalar y cuidar el acabado.',
    portada: ['crest', 'niasa'],
    subs: [
      { slug: 'pegazulejo', nombre: 'Pegazulejo y adhesivos' },
      { slug: 'sellador', nombre: 'Selladores' },
      { slug: 'junteador', nombre: 'Junteadores' },
      { slug: 'herramienta', nombre: 'Herramienta' },
    ],
    specs: {
      intro: 'Pegazulejo, adhesivos, selladores y junteadores para instalar y proteger el acabado. Manejamos Crest, Niasa y Mapei; lo que no esté en foto lo tenemos en tienda.',
      notas: ['El sellador se elige según el material y el uso: pregúntanos antes de comprar.'],
    },
  },
];

// Los GRUPOS son el primer nivel de navegacion (Alek 2026-09-10: de lo
// general a lo particular, sin menu desplegable). /catalogo/<slug>/
export const GRUPOS_DEF = [
  { slug: 'talavera', nombre: 'Talavera', lema: 'Azulejo de barro esmaltado y decorado, con todo lo que lo acompaña.' },
  { slug: 'bano', nombre: 'Baño', lema: 'Lavabos, muebles y WC decorados, para combinar con el azulejo.' },
  { slug: 'pisos', nombre: 'Pisos', lema: 'Barro cocido y mosaico de pasta para interiores, terrazas y patios.' },
  { slug: 'piedra-y-cantera', nombre: 'Piedra y cantera', lema: 'Piedra natural, cantera y recinto para fachadas, muros y jardines.' },
  { slug: 'techos', nombre: 'Techos', lema: 'Teja de barro y sus terminaciones.' },
  { slug: 'complementos', nombre: 'Complementos', lema: 'Pegazulejo, selladores y junteadores para instalar y cuidar el acabado.' },
];
export const GRUPOS = GRUPOS_DEF.map((g) => g.nombre);
export const porGrupo = (g) => ARBOL.filter((c) => c.grupo === g);
export const buscarGrupo = (slug) => GRUPOS_DEF.find((g) => g.slug === slug);
export const grupoDe = (c) => GRUPOS_DEF.find((g) => g.nombre === c.grupo);

// ------------------------------------------------------------------- PIEZAS
export const piezas = bruto;
export const porCat = (cat) => piezas.filter((p) => p.cat === cat);
export const porSub = (cat, sub) => piezas.filter((p) => p.cat === cat && p.sub === sub);
export const buscarCat = (slug) => ARBOL.find((c) => c.slug === slug);

/** URL de la ficha: /categoria/subcategoria/slug/. El id ya trae el prefijo de
 *  su familia (loseta-artesanal, teja-cumbrera-...); se recorta para no
 *  repetirlo en la URL. Verificado: no genera colisiones en las 1,160 piezas. */
export const slugDe = (p) =>
  p.id.startsWith(p.sub + '-') && p.id.length > p.sub.length + 1 ? p.id.slice(p.sub.length + 1) : p.id;
export const rutaDe = (p) => `/${p.cat}/${p.sub}/${slugDe(p)}/`;

/** Otras piezas de la misma subcategoria; primero las que comparten color. */
export function similares(p, n = 12) {
  const col = new Set(p.colores || []);
  const comparte = (x) => (x.colores || []).some((c) => col.has(c));
  return porSub(p.cat, p.sub)
    .filter((x) => x.id !== p.id)
    .sort((a, b) => comparte(b) - comparte(a))
    .slice(0, n);
}

/** La medida nominal no es la real: el 10X10 de talavera mide 10.8. */
const MEDIDA_REAL = { '10X10': '10.8 × 10.8 cm' };
export const medida = (f) => {
  const s = String(f || '').toUpperCase();
  if (MEDIDA_REAL[s]) return MEDIDA_REAL[s];
  if (s === 'UNICO') return 'Pieza única';
  if (s === 'PZA') return 'Pieza';
  return s.replace(/^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/, '$1 × $2 cm')
          .replace(/^(\d+) CM$/, '$1 cm de ancho');
};

/** Tabla de formatos de una categoria: por subcategoria, los formatos que
 *  existen en la galeria con sus piezas por m². Sale del JSON, no se escribe
 *  a mano, asi siempre coincide con lo que se muestra. */
export function formatosDe(cat) {
  const c = buscarCat(cat);
  if (!c) return [];
  const out = [];
  for (const s of c.subs) {
    const items = porSub(cat, s.slug);
    // Un renglon por FORMATO. Si el maestro trae dos rendimientos para el
    // mismo formato (15X15 con 49 y con 44), gana el mas frecuente.
    const votos = new Map();
    for (const p of items) {
      for (const f of p.formatos || []) {
        if (!f.formato) continue;
        const v = votos.get(f.formato) || { formato: f.formato, medida: f.medida, pz: new Map() };
        const k = f.pz_m2 || '';
        v.pz.set(k, (v.pz.get(k) || 0) + 1);
        if (!v.medida && f.medida) v.medida = f.medida;
        votos.set(f.formato, v);
      }
    }
    const formatos = [...votos.values()].map((v) => {
      const pz_m2 = [...v.pz.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { formato: v.formato, medida: v.medida, pz_m2: pz_m2 || undefined };
    });
    if (formatos.length) out.push({ sub: s, formatos });
  }
  return out;
}

/** Portadas de una categoria: primero las piezas preferidas (`portada` en el
 *  ARBOL, por nombre), luego una por familia de color distinta, para que las
 *  tarjetas no salgan todas del mismo tono (Alek 2026-09-10: casi todo salia
 *  amarillo porque "Amarillo" va primero en el abecedario). */
export function portadas(cat, n = 1) {
  const c = buscarCat(cat);
  const items = porCat(cat);
  const out = [];
  const fam = (p) => FAM[(p.colores || [])[0]] || 'Multicolor';
  for (const pref of c?.portada || []) {
    const p = items.find((x) => x.nombre.toLowerCase().includes(pref) && !out.includes(x));
    if (p) out.push(p);
    if (out.length >= n) return out;
  }
  const usadas = new Set(out.map(fam));
  for (const p of items) {
    if (out.length >= n) break;
    if (out.includes(p) || usadas.has(fam(p))) continue;
    out.push(p); usadas.add(fam(p));
  }
  for (const p of items) {
    if (out.length >= n) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/** Cuantos colores distintos hay en un conjunto. */
export const coloresDe = (items) => {
  const s = new Set();
  for (const p of items) for (const c of p.colores || []) s.add(c);
  return [...s];
};
