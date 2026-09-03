/** Pruebas del aviso de pedido. No tocan la red: el fetch se sustituye.
 *  Correr:  node test_correo.mjs
 */
import assert from 'node:assert';
import { armarCorreo, avisarPedido } from './functions/api/_correo.js';
import { onRequestPost as webhook } from './functions/api/mp-webhook.js';

const PEDIDO = {
  metodo: 'PayPal', referencia: 'CAP-1',
  items: [
    { codigo: 'AZL0001', nombre: 'Azulejo Liso Azul', formato: '10X10', cant: 3, precio: 710 },
    { codigo: 'TER0009', nombre: 'Lápiz Brillante Amarillo', formato: '15 CM', cant: 2, precio: 350 },
  ],
  productos: 2830, envio: 450, total: 3280, zona: 'normal', kilos: 46,
  nombre: 'Juan Pérez', correo: 'juan@ejemplo.com', telefono: '5554147383',
  calle: 'División del Norte 123', colonia: 'Del Valle', referencias: 'portón verde', cp: '03100',
};

let paso = 0;
const prueba = (t, f) => { f(); paso++; console.log('  ok ·', t); };

console.log('\nARMADO DEL CORREO');

prueba('el asunto trae total, zona y nombre', () => {
  const c = armarCorreo(PEDIDO);
  assert.match(c.asunto, /\$3,280\.00/);
  assert.match(c.asunto, /CDMX/);
  assert.match(c.asunto, /Juan Pérez/);
});

prueba('el cuerpo trae los SKU, las cantidades y los importes', () => {
  const c = armarCorreo(PEDIDO);
  for (const t of ['AZL0001', 'TER0009', '$2,130.00', '$700.00', '$450.00', '$3,280.00']) {
    assert.ok(c.html.includes(t), 'falta en el html: ' + t);
  }
  assert.ok(c.texto.includes('AZL0001') && c.texto.includes('CP 03100'));
});

prueba('la dirección completa va en el correo', () => {
  const c = armarCorreo(PEDIDO);
  for (const t of ['División del Norte 123', 'Del Valle', 'portón verde', '5554147383']) {
    assert.ok(c.html.includes(t), 'falta: ' + t);
  }
});

prueba('el html escapa lo que teclea el cliente (nada de inyección)', () => {
  const c = armarCorreo({ ...PEDIDO, nombre: '<script>malo</script>' });
  assert.ok(!c.html.includes('<script>malo'));
  assert.ok(c.html.includes('&lt;script&gt;'));
});

prueba('un descuadre entre lo cobrado y lo calculado sale marcado', () => {
  const c = armarCorreo({ ...PEDIDO, total: 100, descuadre: 3280 });
  assert.match(c.html, /REVISAR/);
  assert.match(c.texto, /REVISAR/);
  assert.ok(!armarCorreo(PEDIDO).html.includes('REVISAR'));
});

prueba('la zona fuera de rango se lee de un vistazo', () => {
  assert.match(armarCorreo({ ...PEDIDO, zona: 'alta' }).asunto, /Conurbados/);
});

console.log('\nENVÍO (sin red)');

prueba('sin RESEND_API_KEY no truena: devuelve el motivo', async () => {
  const r = avisarPedido({ CORREO_AVISO: 'a@b.c' }, PEDIDO);
  r.then((x) => assert.equal(x.error, 'falta_RESEND_API_KEY'));
});

prueba('sin destinatario tampoco truena', async () => {
  avisarPedido({ RESEND_API_KEY: 'x' }, PEDIDO).then((x) => assert.equal(x.error, 'falta_destinatario'));
});

// ---- el resto es asincrono
const espiar = (respuestas) => {
  const llamadas = [];
  globalThis.fetch = async (url, opciones = {}) => {
    llamadas.push({ url: String(url), body: opciones.body ? JSON.parse(opciones.body) : null, opciones });
    for (const [pedazo, resp] of respuestas) {
      if (String(url).includes(pedazo)) return resp();
    }
    return new Response('no', { status: 404 });
  };
  return llamadas;
};
const respOk = (o) => () => new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });

const PAGO_MP = {
  id: 987654321, status: 'approved', transaction_amount: 3280,
  payment_type_id: 'ticket', payment_method_id: 'oxxo',
  date_approved: '2026-09-02T10:00:00.000-06:00',
  payer: { email: 'juan@ejemplo.com' },
  additional_info: {
    items: [
      { id: 'AZL0001', title: 'Azulejo Liso Azul 10X10', quantity: 3, unit_price: 710 },
      { id: 'ENVIO', title: 'Envío', quantity: 1, unit_price: 450 },
    ],
  },
  metadata: {
    nombre: 'Juan Pérez', correo: 'juan@ejemplo.com', telefono: '5554147383',
    calle: 'División del Norte 123', colonia: 'Del Valle', referencias: 'portón verde',
    cp: '03100', zona: 'normal', productos: 2130, envio: 450, kilos: 45,
  },
};

const ENV = { MP_ACCESS_TOKEN: 'tok', RESEND_API_KEY: 'llave', CORREO_AVISO: 'federico@raac.mx, roxana@raac.mx' };
const pega = (cuerpo) => new Request('https://x.pages.dev/api/mp-webhook', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
});

(async () => {
  console.log('\nWEBHOOK DE MERCADO PAGO');

  {
    const ll = espiar([['/v1/payments/', respOk(PAGO_MP)], ['api.resend.com', respOk({ id: 'e1' })]]);
    const r = await webhook({ request: pega({ type: 'payment', data: { id: 987654321 } }), env: ENV });
    assert.equal(r.status, 200);
    const correo = ll.find((c) => c.url.includes('resend'));
    assert.ok(correo, 'no se mandó el correo');
    assert.deepEqual(correo.body.to, ['federico@raac.mx', 'roxana@raac.mx']);
    assert.match(correo.body.subject, /\$3,280\.00 · CDMX · Juan Pérez/);
    assert.ok(correo.body.html.includes('AZL0001'), 'falta el SKU');
    assert.ok(!correo.body.html.includes('Envío</strong>'), 'el renglón de envío no debe ir como producto');
    assert.ok(correo.body.html.includes('División del Norte 123'), 'falta la dirección de metadata');
    assert.ok(correo.body.html.includes('oxxo') || correo.body.html.includes('ticket'), 'falta el método');
    paso++; console.log('  ok · pago aprobado: manda el correo completo a los 2 destinatarios');
  }

  for (const estado of ['pending', 'rejected', 'in_process', 'cancelled']) {
    const ll = espiar([['/v1/payments/', respOk({ ...PAGO_MP, status: estado })], ['api.resend.com', respOk({})]]);
    await webhook({ request: pega({ type: 'payment', data: { id: 1 } }), env: ENV });
    assert.ok(!ll.some((c) => c.url.includes('resend')), `no debe avisar en ${estado}`);
  }
  paso++; console.log('  ok · pendiente, rechazado o cancelado: NO avisa');

  {
    const ll = espiar([['api.resend.com', respOk({})]]); // el pago da 404
    await webhook({ request: pega({ type: 'payment', data: { id: 'inventado' } }), env: ENV });
    assert.ok(!ll.some((c) => c.url.includes('resend')));
    paso++; console.log('  ok · un id inventado no manda nada (por eso no hace falta firma)');
  }

  {
    const ll = espiar([['/v1/payments/', respOk(PAGO_MP)], ['api.resend.com', respOk({})]]);
    await webhook({ request: pega({ type: 'merchant_order', data: { id: 5 } }), env: ENV });
    assert.equal(ll.length, 0, 'merchant_order ni siquiera debe consultar');
    paso++; console.log('  ok · los avisos que no son de pago se ignoran');
  }

  {
    const guardado = new Map();
    const kv = { get: async (k) => guardado.get(k) || null, put: async (k, v) => void guardado.set(k, v) };
    const ll = espiar([['/v1/payments/', respOk(PAGO_MP)], ['api.resend.com', respOk({})]]);
    for (let i = 0; i < 3; i++) await webhook({ request: pega({ type: 'payment', data: { id: 987654321 } }), env: { ...ENV, PEDIDOS: kv } });
    assert.equal(ll.filter((c) => c.url.includes('resend')).length, 1, 'con KV debe avisar una sola vez');
    paso++; console.log('  ok · con KV, 3 notificaciones del mismo pago = 1 solo correo');
  }

  {
    const ll = espiar([['/v1/payments/', respOk(PAGO_MP)], ['api.resend.com', () => new Response('caido', { status: 500 })]]);
    const r = await webhook({ request: pega({ type: 'payment', data: { id: 1 } }), env: ENV });
    assert.equal(r.status, 200, 'a MP siempre se le contesta 200');
    paso++; console.log('  ok · si Resend se cae, a MP se le contesta 200 igual');
  }

  {
    const ll = espiar([['/v1/payments/', respOk(PAGO_MP)], ['api.resend.com', respOk({})]]);
    await webhook({ request: pega({ type: 'payment', data: { id: 1 } }), env: { ...ENV, CORREO_CLIENTE: 'si' } });
    const correos = ll.filter((c) => c.url.includes('resend'));
    assert.equal(correos.length, 2);
    assert.deepEqual(correos[1].body.to, ['juan@ejemplo.com']);
    paso++; console.log('  ok · con CORREO_CLIENTE=si, el cliente recibe su confirmación');
  }

  // ---- FOLIO Y REGISTRO DEL PEDIDO (Alek 2026-09-03) ----
  {
    const { nuevoFolio, avisarPedido, armarCorreo } = await import('./functions/api/_correo.js');

    const f = nuevoFolio(new Date('2026-09-03T20:00:00Z'));
    assert.match(f, /^BT-0903-[A-Z0-9]{6}$/, `folio con formato: ${f}`);
    assert.equal(/[01OIL]/.test(f.slice(9)), false, 'el folio no trae caracteres ambiguos (0 O 1 I L)');
    assert.notEqual(nuevoFolio(), nuevoFolio(), 'dos folios seguidos no se repiten');
    paso++; console.log('  ok · el folio se dicta sin ambigüedad y no se repite');

    const guardados = [];
    const env = { ...ENV, SITIO: 'https://bodegadetalavera.com',
      PEDIDOS: { put: async (k, v) => guardados.push([k, v]), get: async () => null } };
    espiar([['api.resend.com', respOk({})]]);
    await avisarPedido(env, {
      metodo: 'PayPal', referencia: 'ABC', items: [{ nombre: 'Azulejo', cant: 2, precio: 500, codigo: 'A' }],
      productos: 1000, envio: 350, total: 1350, zona: 'Coyoacán', nombre: 'Juan', correo: 'j@x.com', cp: '04120',
      acepto_en: '2026-09-03T18:00:00Z', version_terminos: '2026-09-03',
    });
    assert.equal(guardados.length, 1, 'el pedido se guarda en el KV');
    const g = JSON.parse(guardados[0][1]);
    assert.equal(guardados[0][0], `pedido:${g.folio}`, 'la llave del KV es el folio');
    assert.ok(g.fecha && g.items && g.acepto_en, 'se guarda el pedido COMPLETO, no un flag');
    paso++; console.log('  ok · el pedido queda guardado en el KV con su folio');

    const c = armarCorreo({ ...g, sitio: 'https://bodegadetalavera.com' });
    assert.ok(c.asunto.startsWith(g.folio), 'el folio encabeza el asunto');
    assert.match(c.html, /\/pedido\/\?f=BT-/, 'el correo lleva el link de seguimiento');
    assert.match(c.texto, /CONSTANCIA DE ACEPTACION/, 'el correo lleva la constancia');
    paso++; console.log('  ok · el correo lleva folio, link de seguimiento y constancia');

    // sin KV el cobro no se cae: el registro es best-effort, como el aviso
    espiar([['api.resend.com', respOk({})]]);
    const r = await avisarPedido({ ...ENV, PEDIDOS: undefined }, { items: [], total: 0, nombre: 'X' });
    assert.ok(r, 'sin KV, avisarPedido sigue devolviendo resultado');
    paso++; console.log('  ok · sin el KV configurado, el pago sigue funcionando');
  }

  console.log(`\n${paso} pruebas en verde\n`);
})();
