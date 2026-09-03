/** Valida un pedido del navegador y devuelve el total que MANDA.
 *
 *  Regla (Alek 2026-08-29): el servidor NUNCA confia en los precios que le
 *  manda el navegador. Cualquiera puede editar el carrito en su propia maquina
 *  y mandar precio 1. El precio se relee de /data/precios.json, que se genera
 *  del catalogo en cada build.
 *
 *  El envio tambien se recalcula aqui a partir del CP, con las mismas tarifas
 *  que usa la pagina. Si el CP queda fuera de zona no hay cobro en linea.
 */

// ⚠️ COPIA DE src/lib/envio.js — las Functions no pueden importar de src/.
// test_envio.mjs compara las dos tablas y FALLA si divergen. Si tocas una, toca la otra.
export const MAX_KG = 1000;

// Version de los terminos que el cliente esta aceptando. Cambiala cuando cambien
// /terminos/ o /devoluciones/: la constancia dice QUE TEXTO acepto, no solo que
// marco una casilla. (Alek 2026-09-03)
export const VERSION_TERMINOS = '2026-09-03';

export const ANILLOS = [
  ['Álvaro Obregón (poniente)', 1700, 1899, 750],
  ['Benito Juárez', 3000, 3999, 350],
  ['Coyoacán', 4000, 4999, 350],
  ['Tlalpan', 14000, 14999, 350],
  ['Álvaro Obregón', 1000, 1999, 500],
  ['Cuauhtémoc', 6000, 6999, 500],
  ['Iztacalco', 8000, 8999, 500],
  ['Iztapalapa', 9000, 9999, 500],
  ['Miguel Hidalgo', 11000, 11999, 500],
  ['Xochimilco', 13000, 13999, 500],
  ['Venustiano Carranza', 15000, 15999, 500],
  ['Azcapotzalco', 2000, 2999, 750],
  ['Cuajimalpa', 5000, 5999, 750],
  ['Gustavo A. Madero', 7000, 7999, 750],
  ['Magdalena Contreras', 10000, 10999, 750],
  ['Tláhuac', 12000, 12999, 750],
  ['Milpa Alta', 16000, 16999, 750],
  ['Nezahualcóyotl', 57000, 57999, 1150],
  ['Naucalpan de Juárez', 53000, 53999, 1150],
  ['La Paz (Los Reyes)', 56400, 56529, 1150],
  ['Huixquilucan', 52760, 52799, 1150],
  ['Tlalnepantla de Baz', 54000, 54199, 1150],
  ['Valle de Chalco', 56610, 56619, 1150],
  ['Chimalhuacán', 56330, 56369, 1150],
  ['Atizapán de Zaragoza', 52900, 52999, 1150],
  ['Chicoloapan', 56370, 56399, 1150],
  ['Chalco', 56600, 56609, 1150],
  ['Chalco', 56620, 56649, 1150],
  ['Ixtapaluca', 56530, 56599, 1150],
  ['Ecatepec de Morelos', 55000, 55599, 1150],
  ['Coacalco de Berriozábal', 55700, 55739, 1150],
  ['Tultitlán', 54900, 54999, 1150],
  ['Texcoco', 56100, 56269, 1150],
  ['Cuautitlán Izcalli', 54700, 54769, 1150],
];

function anilloDe(cp) {
  const s = String(cp ?? '').trim();
  if (!/^\d{5}$/.test(s)) return null;
  const n = parseInt(s, 10);
  for (const a of ANILLOS) if (n >= a[1] && n <= a[2]) return a;
  return null;
}

/** null = no se cobra en linea (CP fuera de zona, o pedido de mas de una van). */
export function envioDe(cp, kilos = 0) {
  const a = anilloDe(cp);
  if (!a || kilos > MAX_KG) return null;
  return a[3];
}

export function zonaDe(cp) {
  const a = anilloDe(cp);
  return a ? a[0] : 'fuera';
}

/** @returns {{ok:true, items:Array, envio:number, total:number, zona:string} | {ok:false, error:string}} */
export async function validar(pedido, origen) {
  const crudos = Array.isArray(pedido?.items) ? pedido.items : [];
  if (!crudos.length) return { ok: false, error: 'carrito_vacio' };
  if (crudos.length > 100) return { ok: false, error: 'carrito_demasiado_grande' };

  const r = await fetch(`${origen}/data/precios.json`);
  if (!r.ok) return { ok: false, error: 'sin_catalogo' };
  const precios = await r.json();

  const items = [];
  let kilos = 0;
  for (const i of crudos) {
    const codigo = String(i?.codigo || '');
    const d = precios[codigo];
    if (d === undefined) return { ok: false, error: `codigo_desconocido:${codigo}` };

    // precio, minimo y paso salen del catalogo, nunca del navegador
    const precio = typeof d === 'number' ? d : d.p;
    const minimo = (typeof d === 'object' && d.min) || 1;
    const paso = (typeof d === 'object' && d.paso) || 1;

    const cant = Number(i?.cant);
    if (!isFinite(cant) || cant > 9999) return { ok: false, error: `cantidad_invalida:${codigo}` };
    // media caja de relieve 10X10, minimo 3 m2 en 15X15 y 20X20 (Alek 2026-09-01)
    if (cant < minimo) return { ok: false, error: `cantidad_minima:${codigo}:${minimo}` };
    if (Math.abs(Math.round(cant / paso) * paso - cant) > 1e-6) {
      return { ok: false, error: `cantidad_invalida:${codigo}` };
    }

    if (typeof d === 'object' && d.kg) kilos += d.kg * cant;
    items.push({
      codigo,
      nombre: String(i?.nombre || codigo).slice(0, 120),
      formato: String(i?.formato || '').slice(0, 40),
      cant,
      precio, // el del catalogo, NO el del navegador
    });
  }

  // el corte de peso se evalua DESPUES de sumar los kilos de todas las lineas
  const envio = envioDe(pedido?.cp, kilos);
  if (envio === null) {
    return { ok: false, error: envioDe(pedido?.cp) === null ? 'cp_fuera_de_zona' : 'pedido_muy_pesado' };
  }

  // CONSTANCIA DEL CONSENTIMIENTO (Alek 2026-09-03).
  // Antes la casilla era solo un `required` de HTML: se quitaba con el inspector
  // y el pedido pasaba igual. Ahora el servidor la EXIGE y la sella con SU reloj
  // — la hora del navegador no sirve como constancia, cualquiera la cambia.
  if (pedido?.acepto !== true) return { ok: false, error: 'terminos_no_aceptados' };
  const acepto_en = new Date().toISOString();

  const productos = Math.round(items.reduce((s, i) => s + i.precio * i.cant, 0) * 100) / 100;
  return {
    ok: true, items, envio, productos, acepto_en, version_terminos: VERSION_TERMINOS,
    total: Math.round((productos + envio) * 100) / 100,
    zona: zonaDe(pedido?.cp),
    kilos: Math.round(kilos * 100) / 100,
  };
}

export const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
