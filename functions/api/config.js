/** Le dice al navegador que metodos de pago estan configurados.
 *  Solo expone llaves PUBLICAS — nunca los secretos. */
export function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      mercadopago: Boolean(env.MP_ACCESS_TOKEN),
      paypal: env.PAYPAL_CLIENT_ID || null,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}
