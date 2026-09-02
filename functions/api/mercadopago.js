/** Crea la preferencia de pago de Mercado Pago.
 *  Corre en el servidor de Cloudflare: el ACCESS TOKEN nunca toca el navegador.
 *  Se configura en Cloudflare Pages -> Settings -> Variables -> Secret:
 *     MP_ACCESS_TOKEN
 */
import { validar } from './_pedido.js';

export async function onRequestPost({ request, env }) {
  const token = env.MP_ACCESS_TOKEN;
  if (!token) {
    return json({ error: 'falta_credencial', mensaje: 'Falta configurar MP_ACCESS_TOKEN en Cloudflare.' }, 503);
  }

  let pedido;
  try {
    pedido = await request.json();
  } catch {
    return json({ error: 'json_invalido' }, 400);
  }

  // El servidor NO confia en los precios ni en el envio que manda el navegador:
  // los relee del catalogo y recalcula el envio con el CP (Alek 2026-08-29).
  const origen = new URL(request.url).origin;
  const v = await validar(pedido, origen);
  if (!v.ok) return json({ error: v.error }, 400);
  const items = v.items;
  const cuerpo = {
    items: [
      ...items.map((i) => ({
        id: String(i.codigo),
        title: `${i.nombre} ${i.formato}`.slice(0, 250),
        quantity: Math.round(i.cant),
        unit_price: i.precio,
        currency_id: 'MXN',
      })),
      { id: 'ENVIO', title: 'Envío', quantity: 1, unit_price: v.envio, currency_id: 'MXN' },
    ],
    payer: {
      name: (pedido.nombre || '').slice(0, 100),
      email: (pedido.correo || '').slice(0, 100),
    },
    back_urls: {
      success: `${origen}/gracias/`,
      failure: `${origen}/carrito/`,
      pending: `${origen}/gracias/`,
    },
    auto_return: 'approved',
    statement_descriptor: 'BODEGA TALAVERA',
    // Todo lo que el aviso va a necesitar viaja en metadata: el webhook lo lee
    // de vuelta del pago y no hace falta guardar el pedido en ningun lado.
    metadata: {
      nombre: (pedido.nombre || '').slice(0, 120),
      correo: (pedido.correo || '').slice(0, 120),
      telefono: pedido.telefono || '',
      direccion: pedido.direccion || '',
      calle: (pedido.calle || '').slice(0, 200),
      colonia: (pedido.colonia || '').slice(0, 120),
      referencias: (pedido.referencias || '').slice(0, 200),
      cp: pedido.cp || '',
      zona: v.zona,
      productos: v.productos,
      envio: v.envio,
      kilos: v.kilos,
    },
    // A donde le avisa MP cuando el pago se aprueba (incluido el OXXO que se
    // paga horas despues). Sin esto el pedido no le llega a nadie.
    notification_url: `${origen}/api/mp-webhook`,
    external_reference: `BT-${Date.now()}`,
  };

  const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(cuerpo),
  });
  const data = await r.json();
  if (!r.ok) return json({ error: 'mercadopago', detalle: data }, 502);

  return json({ url: data.init_point || data.sandbox_init_point, id: data.id });
}

const json = (o, s = 200) =>
  new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
