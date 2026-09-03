/** Consulta de un pedido por folio.  GET /api/pedido?f=BT-0903-K7M2QX
 *
 *  🔒 NO DEVUELVE DATOS PERSONALES. El folio es la unica llave y viaja en un
 *  correo, asi que hay que asumir que puede acabar en manos de un tercero
 *  (reenvio, captura de pantalla). Nombre, telefono, correo y direccion NO
 *  salen de aqui: quien tenga el folio ve QUE se compro y COMO va, no A QUIEN
 *  se le entrega. (Alek 2026-09-03)
 */
const json = (o, s = 200) => new Response(JSON.stringify(o), {
  status: s,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export async function onRequestGet({ request, env }) {
  const folio = String(new URL(request.url).searchParams.get('f') || '').trim().toUpperCase();
  if (!/^BT-\d{4}-[A-Z0-9]{6}$/.test(folio)) return json({ error: 'folio_invalido' }, 400);
  if (!env.PEDIDOS) return json({ error: 'sin_registro' }, 503);

  const crudo = await env.PEDIDOS.get(`pedido:${folio}`);
  if (!crudo) return json({ error: 'no_encontrado' }, 404);

  const p = JSON.parse(crudo);
  // lista blanca: se nombra lo que SALE, no lo que se esconde — asi un campo
  // nuevo en el pedido no se filtra solo por haberlo agregado alla.
  return json({
    folio: p.folio,
    fecha: p.fecha,
    estado: p.estado || 'confirmado',
    items: (p.items || []).map((i) => ({ nombre: i.nombre, formato: i.formato, cant: i.cant, precio: i.precio })),
    productos: p.productos, envio: p.envio, total: p.total,
    zona: p.zona, kilos: p.kilos,
    metodo: p.metodo,
    acepto_en: p.acepto_en, version_terminos: p.version_terminos,
  });
}
