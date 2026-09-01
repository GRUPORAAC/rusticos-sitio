/** PayPal con verificacion EN EL SERVIDOR.
 *
 *  Antes el navegador creaba y capturaba la orden por su cuenta: se le podia
 *  decir a la pagina "ya pague" sin haber pagado. Ahora el servidor crea la
 *  orden con el total que el mismo calcula, y despues le pregunta a PayPal si
 *  el cobro realmente se completo.
 *
 *  Secretos en Cloudflare Pages -> Settings -> Variables and Secrets:
 *     PAYPAL_CLIENT_ID  (publico, tambien lo usa el navegador)
 *     PAYPAL_SECRET     (SECRET, nunca sale del servidor)
 *     PAYPAL_ENTORNO    'sandbox' para pruebas, 'live' para cobrar de verdad
 */
import { validar, json } from './_pedido.js';

const api = (env) =>
  (env.PAYPAL_ENTORNO || 'sandbox') === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

async function token(env) {
  const r = await fetch(`${api(env)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env.PAYPAL_CLIENT_ID}:${env.PAYPAL_SECRET}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) return null;
  return (await r.json()).access_token;
}

export async function onRequestPost({ request, env }) {
  if (!env.PAYPAL_CLIENT_ID || !env.PAYPAL_SECRET) {
    return json({ error: 'falta_credencial', mensaje: 'Faltan PAYPAL_CLIENT_ID y PAYPAL_SECRET en Cloudflare.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: 'json_invalido' }, 400); }

  const t = await token(env);
  if (!t) return json({ error: 'paypal_auth' }, 502);
  const cab = { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` };

  // ---- crear la orden con el total que calcula el servidor
  if (body.accion === 'crear') {
    const v = await validar(body.pedido, new URL(request.url).origin);
    if (!v.ok) return json({ error: v.error }, 400);

    const r = await fetch(`${api(env)}/v2/checkout/orders`, {
      method: 'POST',
      headers: cab,
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'MXN', value: v.total.toFixed(2) },
          description: 'Pedido Bodega de Talavera',
        }],
      }),
    });
    const d = await r.json();
    if (!r.ok) return json({ error: 'paypal_crear', detalle: d }, 502);
    return json({ id: d.id, total: v.total });
  }

  // ---- capturar y CONFIRMAR con PayPal que el dinero entro
  if (body.accion === 'capturar') {
    const id = String(body.orderID || '');
    if (!id) return json({ error: 'sin_orden' }, 400);

    const r = await fetch(`${api(env)}/v2/checkout/orders/${id}/capture`, { method: 'POST', headers: cab });
    const d = await r.json();
    if (!r.ok) return json({ error: 'paypal_capturar', detalle: d }, 502);

    const cap = d?.purchase_units?.[0]?.payments?.captures?.[0];
    if (d.status !== 'COMPLETED' || cap?.status !== 'COMPLETED') {
      return json({ error: 'pago_no_completado', estado: d.status }, 402);
    }
    return json({ ok: true, id: d.id, monto: cap.amount?.value, moneda: cap.amount?.currency_code });
  }

  return json({ error: 'accion_invalida' }, 400);
}
