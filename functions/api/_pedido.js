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

export const TARIFAS = { normal: 450, alta: 1150 };

const ALTA = [
  [57000, 57999], [53000, 53999], [56400, 56529], [52760, 52799],
  [54000, 54199], [56610, 56619], [56330, 56369], [52900, 52999],
  [56370, 56399], [56600, 56609], [56620, 56649], [56530, 56599],
  [55000, 55599], [55700, 55739], [54900, 54999], [56100, 56269],
  [54700, 54769],
];

export function envioDe(cp) {
  const n = parseInt(String(cp || '').trim(), 10);
  if (!/^\d{5}$/.test(String(cp || '').trim()) || isNaN(n)) return null;
  if (n >= 1000 && n <= 16999) return TARIFAS.normal;
  for (const [a, b] of ALTA) if (n >= a && n <= b) return TARIFAS.alta;
  return null; // fuera de zona: se cotiza por WhatsApp, no se cobra en linea
}

export function zonaDe(cp) {
  const n = parseInt(String(cp || '').trim(), 10);
  if (!/^\d{5}$/.test(String(cp || '').trim()) || isNaN(n)) return 'fuera';
  if (n >= 1000 && n <= 16999) return 'normal';
  for (const [a, b] of ALTA) if (n >= a && n <= b) return 'alta';
  return 'fuera';
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

  const envio = envioDe(pedido?.cp);
  if (envio === null) return { ok: false, error: 'cp_fuera_de_zona' };

  const productos = Math.round(items.reduce((s, i) => s + i.precio * i.cant, 0) * 100) / 100;
  return {
    ok: true, items, envio, productos,
    total: Math.round((productos + envio) * 100) / 100,
    zona: zonaDe(pedido?.cp),
    kilos: Math.round(kilos * 100) / 100,
  };
}

export const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
