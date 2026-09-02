// check: el servidor ignora los precios del navegador y recalcula el envio
import { validar, envioDe } from './functions/api/_pedido.js';

const PRECIOS = {
  AZL0011: { p: 500, min: 1, paso: 1, kg: 15 },
  TEM009A: { p: 160, min: 1, paso: 1, kg: 0.5 },
  ARM0053: { p: 3150, min: 0.5, paso: 0.5, kg: 15 },   // relieve 10X10: media caja
  ARM0055: { p: 3175, min: 3, paso: 1, kg: 17 },       // relieve 20X20: minimo 3 m2
};
globalThis.fetch = async () => ({ ok: true, json: async () => PRECIOS });

let fallas = 0;
const ok = (c, m) => { if (!c) { console.log('  FALLA:', m); fallas++; } else console.log('  ok:', m); };

// 1. precio manipulado desde el navegador: se ignora
let v = await validar({ items: [{ codigo: 'AZL0011', cant: 2, precio: 1 }], cp: '04120' }, 'http://x');
ok(v.ok && v.items[0].precio === 500, 'usa el precio del catalogo ($500), no el que mando el cliente ($1)');
ok(v.total === 500 * 2 + 450, `total correcto: ${v.total} (2x500 + 450 de envio)`);

// 2. envio manipulado: se ignora, se recalcula por CP
v = await validar({ items: [{ codigo: 'AZL0011', cant: 1 }], cp: '57000', envio: 0 }, 'http://x');
ok(v.ok && v.envio === 1150, `envio recalculado por CP de Neza: ${v.envio}`);

// 3. codigo inventado: se rechaza
v = await validar({ items: [{ codigo: 'NOEXISTE', cant: 1 }], cp: '04120' }, 'http://x');
ok(!v.ok && v.error.startsWith('codigo_desconocido'), 'rechaza codigo que no esta en el catalogo');

// 4. cantidad invalida
v = await validar({ items: [{ codigo: 'AZL0011', cant: -3 }], cp: '04120' }, 'http://x');
ok(!v.ok, 'rechaza cantidad negativa');

// 5. CP fuera de zona: no se cobra en linea
v = await validar({ items: [{ codigo: 'AZL0011', cant: 1 }], cp: '44100' }, 'http://x');
ok(!v.ok && v.error === 'cp_fuera_de_zona', 'CP de Guadalajara no se cobra en linea');

// 6. carrito vacio
v = await validar({ items: [], cp: '04120' }, 'http://x');
ok(!v.ok, 'rechaza carrito vacio');

// 7. media caja de relieve 10X10: se acepta y cobra la mitad
v = await validar({ items: [{ codigo: 'ARM0053', cant: 0.5 }], cp: '04120' }, 'http://x');
ok(v.ok && v.total === 3150 * 0.5 + 450, `media caja de relieve: ${v.total}`);

// 8. un cuarto de caja: no existe ese paso
v = await validar({ items: [{ codigo: 'ARM0053', cant: 0.25 }], cp: '04120' }, 'http://x');
ok(!v.ok, 'rechaza 0.25 m2 de relieve 10X10 (el paso es 0.5)');

// 9. 20X20 pide minimo 3 m2
v = await validar({ items: [{ codigo: 'ARM0055', cant: 2 }], cp: '04120' }, 'http://x');
ok(!v.ok && v.error.startsWith('cantidad_minima'), 'rechaza 2 m2 de relieve 20X20 (minimo 3)');
v = await validar({ items: [{ codigo: 'ARM0055', cant: 3 }], cp: '04120' }, 'http://x');
ok(v.ok, 'acepta 3 m2 de relieve 20X20');

// 10. el peso del pedido se suma para el envio
v = await validar({ items: [{ codigo: 'ARM0055', cant: 3 }, { codigo: 'TEM009A', cant: 4 }], cp: '04120' }, 'http://x');
ok(v.kilos === 17 * 3 + 0.5 * 4, `kilos del pedido: ${v.kilos}`);

ok(envioDe('04120') === 450 && envioDe('55000') === 1150 && envioDe('abc') === null, 'tarifas por CP');
console.log(fallas ? `\n${fallas} FALLAS` : '\nOK — el servidor manda en precios y envio');
process.exit(fallas ? 1 : 0);
