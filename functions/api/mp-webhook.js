/** WEBHOOK DE MERCADO PAGO — es lo que hace que el pedido de MP le llegue a RAAC.
 *
 *  Por que hace falta: con PayPal el servidor confirma el cobro en el mismo
 *  momento (accion 'capturar'). Con Mercado Pago no: el cliente se va al sitio
 *  de MP, paga alla, y puede cerrar el navegador antes de volver. Si el aviso
 *  dependiera del regreso a /gracias/, un pago de OXXO (que se paga horas
 *  despues) nunca avisaria a nadie.
 *
 *  Mercado Pago le pega a esta URL cuando cambia el estado de un pago. El
 *  servidor NO le cree al mensaje: agarra el id, le pregunta a MP por el pago
 *  con su propio token y solo avisa si quedo 'approved'.
 *  ⇒ Un id inventado da 404 y no manda nada. Por eso no hace falta validar firma.
 *
 *  Se configura solo: mercadopago.js manda notification_url en cada preferencia.
 *
 *  DEDUPE (opcional): MP reenvia la misma notificacion varias veces. Si en
 *  Cloudflare Pages -> Settings -> Functions se crea un KV namespace con el
 *  binding PEDIDOS, cada pago se avisa UNA sola vez. Sin el KV todo funciona
 *  igual, nada mas que puede llegar el mismo correo repetido.
 */
import { avisarPedido } from './_correo.js';

const ok = () => new Response('ok', { status: 200 });

export async function onRequestPost({ request, env }) {
  // A MP SIEMPRE se le contesta 200. Si se le contesta error, reintenta durante
  // dias; y un correo que no salio no es razon para que MP crea que el pago fallo.
  try {
    await procesar(request, env);
  } catch (e) {
    console.error('mp-webhook', e);
  }
  return ok();
}

// MP a veces avisa por GET con los datos en la query
export const onRequestGet = onRequestPost;

async function procesar(request, env) {
  const token = env.MP_ACCESS_TOKEN;
  if (!token) return;

  const url = new URL(request.url);
  let cuerpo = {};
  try { cuerpo = await request.json(); } catch { /* puede venir vacio */ }

  const tipo = cuerpo?.type || cuerpo?.topic || url.searchParams.get('type') || url.searchParams.get('topic');
  const id =
    cuerpo?.data?.id || cuerpo?.id ||
    url.searchParams.get('data.id') || url.searchParams.get('id');

  if (tipo !== 'payment' || !id) return; // merchant_order y demas: se ignoran

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return; // id que no es nuestro, o que no existe
  const pago = await r.json();

  if (pago.status !== 'approved') return; // pendiente, rechazado o cancelado: no se avisa

  // Una sola vez por pago, si hay KV
  if (env.PEDIDOS) {
    const llave = `mp:${pago.id}`;
    if (await env.PEDIDOS.get(llave)) return;
    await env.PEDIDOS.put(llave, '1', { expirationTtl: 60 * 60 * 24 * 90 });
  }

  const m = pago.metadata || {};
  // El envio viaja como un renglon mas en la preferencia: se saca de la lista
  const renglones = pago.additional_info?.items || [];
  const items = renglones
    .filter((i) => String(i.id) !== 'ENVIO')
    .map((i) => ({
      codigo: String(i.id || ''),
      nombre: String(i.title || ''),
      formato: '',
      cant: Number(i.quantity || 0),
      precio: Number(i.unit_price || 0),
    }));

  const envio = Number(m.envio ?? renglones.find((i) => String(i.id) === 'ENVIO')?.unit_price ?? 0);
  const productos = Number(m.productos ?? items.reduce((s, i) => s + i.precio * i.cant, 0));

  await avisarPedido(env, {
    metodo: `Mercado Pago (${pago.payment_type_id || pago.payment_method_id || 'en línea'})`,
    referencia: String(pago.id),
    items, productos, envio,
    total: Number(pago.transaction_amount || productos + envio),
    zona: m.zona || '',
    kilos: m.kilos || 0,
    nombre: m.nombre || pago.payer?.first_name || '',
    correo: m.correo || pago.payer?.email || '',
    telefono: m.telefono || '',
    calle: m.calle || m.direccion || '',
    colonia: m.colonia || '',
    referencias: m.referencias || '',
    cp: m.cp || '',
    fecha: pago.date_approved ? new Date(pago.date_approved) : new Date(),
  });
}
