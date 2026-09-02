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
import { avisarPedido } from './_correo.js';

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

    // El pedido viaja COMPLETO a PayPal: productos, cantidades y direccion.
    // Antes solo iba el total y Federico no sabia ni que se vendio ni a donde
    // mandarlo (hallazgo 2026-09-01).
    const p = body.pedido || {};
    const estado = v.zona === 'normal' ? 'Ciudad de Mexico' : 'Estado de Mexico';
    const unidad = { currency_code: 'MXN' };

    const base = {
      description: `Pedido Bodega de Talavera (${v.items.length} producto${v.items.length > 1 ? 's' : ''})`,
      custom_id: `CP ${p.cp || '?'} · Tel ${String(p.telefono || '?').slice(0, 20)}`.slice(0, 127),
      amount: {
        ...unidad,
        value: v.total.toFixed(2),
        breakdown: {
          item_total: { ...unidad, value: v.productos.toFixed(2) },
          shipping: { ...unidad, value: v.envio.toFixed(2) },
        },
      },
      items: v.items.map((i) => ({
        name: `${i.nombre} ${i.formato}`.trim().slice(0, 127),
        sku: i.codigo.slice(0, 127),
        quantity: String(i.cant),
        unit_amount: { ...unidad, value: i.precio.toFixed(2) },
      })),
      shipping: {
        name: { full_name: String(p.nombre || '').slice(0, 300) },
        address: {
          address_line_1: String(p.calle || p.direccion || '').slice(0, 300),
          address_line_2: String(p.colonia || '').slice(0, 300),
          admin_area_2: estado,
          admin_area_1: estado,
          postal_code: String(p.cp || ''),
          country_code: 'MX',
        },
      },
    };

    const crear = (unidades) =>
      fetch(`${api(env)}/v2/checkout/orders`, {
        method: 'POST',
        headers: cab,
        body: JSON.stringify({ intent: 'CAPTURE', purchase_units: [unidades] }),
      });

    let r = await crear(base);
    let d = await r.json();
    // Si PayPal se queja del desglose o de la direccion, se cobra igual con el
    // total pelon: nunca se cae el pago por un dato de adorno.
    if (!r.ok) {
      r = await crear({ description: base.description, custom_id: base.custom_id, amount: { ...unidad, value: v.total.toFixed(2) } });
      d = await r.json();
    }
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

    // ---- el aviso: el pedido ya se cobro, ahora hay que avisarle a RAAC.
    // Va DESPUES de confirmar el cobro y envuelto en try/catch: si el correo
    // falla, el cliente ve su "gracias" igual y el dinero ya entro.
    let aviso = 'sin_pedido';
    try {
      const p = body.pedido || {};
      const v = await validar(p, new URL(request.url).origin);
      if (v.ok) {
        const cobrado = Number(cap.amount?.value || 0);
        const res = await avisarPedido(env, {
          metodo: 'PayPal' + ((env.PAYPAL_ENTORNO || 'sandbox') === 'live' ? '' : ' (SANDBOX — prueba)'),
          referencia: cap.id || d.id,
          items: v.items, productos: v.productos, envio: v.envio,
          // se reporta lo que PayPal cobro de verdad, no lo que el sitio esperaba
          total: cobrado || v.total,
          zona: v.zona, kilos: v.kilos,
          nombre: p.nombre, correo: p.correo, telefono: p.telefono,
          calle: p.calle || p.direccion, colonia: p.colonia, referencias: p.referencias, cp: p.cp,
          descuadre: Math.abs(cobrado - v.total) > 0.01 ? v.total : null,
        });
        aviso = res.ok ? 'enviado' : res.error;
      } else {
        aviso = 'pedido_invalido:' + v.error;
      }
    } catch (e) {
      aviso = 'error:' + String(e).slice(0, 120);
    }

    return json({ ok: true, id: d.id, monto: cap.amount?.value, moneda: cap.amount?.currency_code, aviso });
  }

  return json({ error: 'accion_invalida' }, 400);
}
