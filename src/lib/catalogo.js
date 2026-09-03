import bruto from '../data/productos.json';
import hex from '../data/colores.json';

export const COLORES = hex;

/** Un producto puede ser bicolor: "Azul / Terracota". */
export const coloresDe = (p) =>
  (p.color || '').split('/').map((c) => c.trim()).filter(Boolean);

/** Nombres del catalogo en MAYUSCULAS -> texto legible, sin perder acentos. */
export function bonito(s) {
  if (!s) return '';
  return String(s)
    .toLowerCase()
    .split(' ')
    .map((w) => (w.length > 2 || /^\d/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
    .replace(/\b(\d+)x(\d+)\b/gi, '$1×$2');
}

/** El PRODUCTO trae prefijos que la navegacion ya dice. Se recortan. */
const PREFIJOS = [/^DECORADO\s+/i, /^RELIEVE\s+/i, /^TERMINACION\s+/i, /^AZULEJO\s+/i];
export function nombreCorto(p) {
  let n = p.producto || '';
  for (const re of PREFIJOS) n = n.replace(re, '');
  return bonito(n);
}

export const productos = bruto.map((p) => ({
  ...p,
  nombre: nombreCorto(p),
  foto: '/' + p.foto.replace(/^FOTOS PRODUCTOS\//i, 'fotos/'),
  galeria: (p.galeria || []).map((g) => '/' + g.replace(/^FOTOS PRODUCTOS\//i, 'fotos/')),
  desde: Math.min(...p.formatos.map((f) => f.precio_venta)),
  colores: (p.color || '').split('/').map((c) => c.trim()).filter(Boolean),
}));

export const ARBOL = [
  {
    slug: 'azulejo', nombre: 'Azulejo',
    lema: 'El liso de siempre, en 40 colores.',
    subs: [
      { slug: 'esmaltados', nombre: 'Esmaltados' },
      { slug: 'deslavados', nombre: 'Deslavados' },
      { slug: 'mates', nombre: 'Mates' },
    ],
  },
  {
    slug: 'decorados', nombre: 'Decorados',
    lema: 'Pintados a mano, uno por uno.',
    subs: [
      { slug: 'sencillo', nombre: 'Sencillo' },
      { slug: 'elaborado', nombre: 'Elaborado' },
      { slug: 'ilustrado', nombre: 'Ilustrado' },
    ],
  },
  {
    slug: 'relieve', nombre: 'Relieve',
    lema: 'Textura que se siente con la mano.',
    subs: [
      { slug: 'clasico', nombre: 'Clásico' },
      { slug: 'mate', nombre: 'Mate' },
    ],
  },
  {
    slug: 'boutique', nombre: 'Boutique',
    lema: 'Formas que rompen la cuadrícula.',
    subs: [
      { slug: 'escama', nombre: 'Escama' },
      { slug: 'espanolito', nombre: 'Españolito' },
      { slug: 'hexagonito', nombre: 'Hexagonito' },
    ],
  },
  {
    slug: 'cintilla', nombre: 'Cintilla',
    lema: 'La franja que remata el muro.',
    subs: [
      { slug: 'esmaltadas', nombre: 'Esmaltadas' },
      { slug: 'deslavadas', nombre: 'Deslavadas' },
    ],
  },
  {
    slug: 'texturizado', nombre: 'Texturizado',
    lema: 'Estriado y petatillo: relieve fino en el liso.',
    subs: [{ slug: 'estriado-petatillo', nombre: 'Estriado y Petatillo' }],
  },
  {
    slug: 'terminaciones', nombre: 'Terminaciones',
    lema: 'La pieza que cierra el muro.',
    subs: [
      { slug: 'angulo', nombre: 'Ángulo' },
      { slug: 'bagueta', nombre: 'Bagueta' },
      { slug: 'remate', nombre: 'Remate' },
      { slug: 'codo', nombre: 'Codo' },
      { slug: 'lapiz', nombre: 'Lápiz' },
      { slug: 'listelo', nombre: 'Listelo' },
      { slug: 'pecho-paloma', nombre: 'Pecho Paloma' },
      { slug: 'trenza', nombre: 'Trenza' },
    ],
  },
  {
    slug: 'pegazulejo', nombre: 'Pegazulejo',
    lema: 'Lo que necesitas para pegarlo.',
    subs: [{ slug: 'pegazulejo', nombre: 'Pegazulejo' }],
  },
];

export const porCat = (cat) => productos.filter((p) => p.cat === cat);
export const porSub = (cat, sub) => productos.filter((p) => p.cat === cat && p.sub === sub);
export const buscarUrl = (url) => productos.find((p) => p.url === url);

/** Precio formateado en pesos, sin centavos. */
/** Plazo de entrega. No hay "sobre pedido": lo que cambia es el plazo (Alek 2026-08-29).
 *  Sin dato en el catalogo se muestra el rango completo, nunca una promesa falsa. */
export function plazo(p) {
  const d = (p.disponibilidad || '').toUpperCase();
  if (d.startsWith('EN BODEGA')) return { txt: '5 a 7 días hábiles', tag: 'En existencia', hay: true };
  if (d) return { txt: '15 a 25 días hábiles', tag: 'Bajo pedido', hay: false };
  return { txt: '5 a 25 días hábiles según disponibilidad', tag: null, hay: null };
}

/** Como se lee la unidad de venta. Un solo lugar para las 4 pantallas. */
export const uni = (u) =>
  ({ M2: 'm²', ML: 'metro lineal', BULTO: 'bulto' }[String(u || '').toUpperCase()] || 'pieza');

export const pesos = (n) =>
  '$' + Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 });

/** Terminaciones del mismo ACABADO + COLOR — el bloque "Termina tu instalación". */
export function terminacionesDe(p) {
  if (!p.acabado || !p.color) return [];
  return productos.filter(
    (t) => t.cat === 'terminaciones' && t.acabado === p.acabado && t.color === p.color
  );
}

/** La medida nominal no es la real: el 10X10 de talavera mide 10.8 (Alek 2026-09-02). */
const MEDIDA_REAL = { '10X10': '10.8 × 10.8 cm' };
export const medida = (f) =>
  MEDIDA_REAL[String(f || '').toUpperCase()] ||
  String(f || '').toUpperCase().replace(/^(\d+(?:\.\d+)?)X(\d+(?:\.\d+)?)$/, '$1 × $2 cm');

/** En decorados y relieve el DISEÑO es el producto: dos diseños distintos no son
 *  "el mismo en otro color". Ahi no hay selector de color, van como similares. */
const SIN_SELECTOR_DE_COLOR = new Set(['decorados', 'relieve']);

/** Otros colores del mismo modelo: el selector de color NAVEGA entre productos. */
export function hermanos(p) {
  if (!p.color || SIN_SELECTOR_DE_COLOR.has(p.cat)) return [];
  const base = (x) => `${x.cat}|${x.sub}|${(x.tipo_pieza || '')}`;
  return productos
    .filter((x) => base(x) === base(p) && x.acabado === p.acabado && x.color !== p.color)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Productos similares: misma categoria y subcategoria, otro diseño. */
export function similares(p, n = 8) {
  return productos
    .filter((x) => x.cat === p.cat && x.sub === p.sub && x.url !== p.url)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, n);
}

/** Azulejo liso <-> decorado que comparten color. El liso y el dibujo se
 *  instalan juntos, asi que cada ficha recomienda el complemento del otro lado. */
export function combinaCon(p, n = 8) {
  const destino = { azulejo: 'decorados', decorados: 'azulejo' }[p.cat];
  if (!destino || !p.colores.length) return [];
  return productos
    .filter((x) => x.cat === destino && x.colores.some((c) => p.colores.includes(c)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))
    .slice(0, n);
}
