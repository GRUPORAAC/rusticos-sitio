/** AVISO DE PEDIDO POR CORREO (Resend).
 *
 *  El hueco que esto cierra (contexto RAAC 2026-09-01): el cliente pagaba, veia
 *  "gracias", y ni Federico ni Roxana se enteraban. El unico registro estaba en
 *  el panel de la pasarela.
 *
 *  REGLA DE ORO DE ESTE ARCHIVO: **un aviso nunca tumba un cobro**. Todo lo de
 *  aqui va envuelto en try/catch y devuelve un resultado, nunca lanza. Si Resend
 *  esta caido o falta la llave, el pago ya ocurrio y el cliente ve su "gracias"
 *  igual.
 *
 *  Variables en Cloudflare Pages -> Settings -> Variables and Secrets:
 *     RESEND_API_KEY   (SECRET)  la llave de https://resend.com/api-keys
 *     CORREO_AVISO     (texto)   a quien le llega, separado por comas
 *                                ej: "federico@bodegadetalavera.com, roxana@..."
 *     CORREO_DE        (texto)   remitente. Necesita dominio verificado en Resend.
 *                                Mientras no lo este: "Bodega de Talavera <onboarding@resend.dev>"
 *                                OJO: con onboarding@resend.dev, Resend SOLO deja
 *                                enviar al correo dueno de la cuenta.
 *     CORREO_CLIENTE   (texto)   "si" para mandarle tambien su confirmacion al cliente.
 *                                Requiere dominio verificado; dejar apagado hasta entonces.
 */

const RESEND = 'https://api.resend.com/emails';

const esc = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const pesos = (n) =>
  '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const cant = (n) => (Number.isInteger(Number(n)) ? String(n) : String(Number(n)));

/** Fecha y hora de CDMX, que es la que le sirve a quien surte el pedido. */
function fechaMx(d = new Date()) {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(d);
}

const ZONAS = {
  normal: 'CDMX',
  alta: 'Conurbados (tarifa alta)',
  fuera: 'FUERA DE ZONA',
};

/** Arma el cuerpo del aviso. Se exporta aparte para poder probarlo sin red. */
export function armarCorreo(p) {
  const {
    metodo = 'Pago', referencia = '', items = [], productos = 0, envio = 0, total = 0,
    zona = '', kilos = 0, nombre = '', correo = '', telefono = '',
    calle = '', colonia = '', referencias = '', cp = '', fecha = new Date(),
    descuadre = null, acepto_en = null, version_terminos = '',
    folio = '', guardado = false, sitio = 'https://bodegadetalavera.com',
  } = p || {};

  // `fecha` llega como Date desde las pruebas y como texto ISO desde el KV
  const cuando = fecha instanceof Date ? fecha : new Date(fecha);
  const zonaTxt = ZONAS[zona] || zona || '—';
  const asunto = `${folio ? folio + ' · ' : ''}Pedido nuevo · ${pesos(total)} · ${zonaTxt} · ${nombre || 'sin nombre'}`;
  const liga = folio ? `${sitio}/pedido/?f=${encodeURIComponent(folio)}` : '';

  const filas = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 10px;border-bottom:1px solid #eee">
          <strong>${esc(i.nombre)}</strong> ${esc(i.formato || '')}<br>
          <span style="color:#777;font-size:12px">SKU ${esc(i.codigo)}</span>
        </td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${esc(cant(i.cant))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${pesos(i.precio)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #eee;text-align:right;white-space:nowrap">${pesos(i.precio * i.cant)}</td>
      </tr>`
    )
    .join('');

  const total_ = (et, v, fuerte) =>
    `<tr>
      <td colspan="3" style="padding:6px 10px;text-align:right;${fuerte ? 'font-weight:700' : 'color:#555'}">${et}</td>
      <td style="padding:6px 10px;text-align:right;white-space:nowrap;${fuerte ? 'font-weight:700;font-size:17px' : ''}">${pesos(v)}</td>
    </tr>`;

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:620px;margin:0 auto;color:#2E3641">
  <div style="background:#383188;color:#FDFAF3;padding:18px 20px;border-radius:8px 8px 0 0">
    <div style="font-size:19px;font-weight:700">Pedido nuevo — Bodega de Talavera</div>
    <div style="font-size:13px;opacity:.85;margin-top:4px">${esc(fechaMx(cuando))}</div>
  </div>
  <div style="border:1px solid #e6e2d8;border-top:0;border-radius:0 0 8px 8px;padding:20px;background:#FDFAF3">
${descuadre !== null && descuadre !== undefined
    ? `<p style="background:#F77759;color:#fff;padding:10px 12px;border-radius:6px;font-weight:700;margin:0 0 16px">
         REVISAR: la pasarela cobro ${pesos(total)} y el sitio esperaba ${pesos(descuadre)}.
       </p>`
    : ''}

    <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:18px">
      <thead>
        <tr style="background:#f1ede3">
          <th align="left"  style="padding:8px 10px">Producto</th>
          <th align="right" style="padding:8px 10px">Cant.</th>
          <th align="right" style="padding:8px 10px">P. unit.</th>
          <th align="right" style="padding:8px 10px">Importe</th>
        </tr>
      </thead>
      <tbody>${filas}</tbody>
      <tfoot>
        ${total_('Productos', productos)}
        ${total_('Subtotal', productos / 1.16)}
        ${total_('IVA 16%', productos - productos / 1.16)}
        ${total_(`Envío (${esc(zonaTxt)})`, envio)}
        ${total_('TOTAL PAGADO', total, true)}
      </tfoot>
    </table>

    <table style="width:100%;font-size:14px;border-collapse:collapse">
      <tr><td colspan="2" style="padding-top:6px;font-weight:700;color:#F77759">ENTREGA</td></tr>
      <tr><td style="padding:4px 0;color:#777;width:110px">Nombre</td><td>${esc(nombre)}</td></tr>
      <tr><td style="padding:4px 0;color:#777">Teléfono</td><td><a href="https://wa.me/52${esc(String(telefono).replace(/\D/g, ''))}">${esc(telefono)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#777">Correo</td><td><a href="mailto:${esc(correo)}">${esc(correo)}</a></td></tr>
      <tr><td style="padding:4px 0;color:#777">Calle</td><td>${esc(calle)}</td></tr>
      <tr><td style="padding:4px 0;color:#777">Colonia</td><td>${esc(colonia)}</td></tr>
      <tr><td style="padding:4px 0;color:#777">C.P.</td><td>${esc(cp)} — ${esc(zonaTxt)}</td></tr>
      ${referencias ? `<tr><td style="padding:4px 0;color:#777">Referencias</td><td>${esc(referencias)}</td></tr>` : ''}
      <tr><td colspan="2" style="padding-top:14px;font-weight:700;color:#F77759">PAGO</td></tr>
      <tr><td style="padding:4px 0;color:#777">Método</td><td>${esc(metodo)}</td></tr>
      <tr><td style="padding:4px 0;color:#777">Referencia</td><td><code>${esc(referencia)}</code></td></tr>
      <tr><td style="padding:4px 0;color:#777">Peso</td><td>${esc(kilos)} kg aprox.</td></tr>
    </table>

    <p style="font-size:12px;color:#8a8578;margin:20px 0 0;border-top:1px solid #e6e2d8;padding-top:12px">
      <strong>Constancia:</strong> el cliente aceptó la variación de color del 5%, la merma del 5% por
      traslados y cortes, y los términos y condiciones versión <strong>${esc(version_terminos || '—')}</strong>
      el <strong>${acepto_en ? esc(fechaMx(new Date(acepto_en))) : '—'}</strong> (hora del servidor).
      ${guardado ? '' : '<br><strong style="color:#F77759">OJO: este pedido NO se pudo guardar (falta el KV PEDIDOS). Guarda este correo.</strong>'}
    </p>
    ${liga ? `<p style="font-size:13px;margin:14px 0 0"><a href="${liga}" style="color:#383188;font-weight:700">Ver el pedido ${esc(folio)} →</a></p>` : ''}
    <p style="font-size:12px;color:#8a8578;margin:10px 0 0">
      Confirmar disponibilidad y avisarle el plazo: <strong>5–7 días</strong> si está en existencia,
      <strong>15–25</strong> si va bajo pedido.
    </p>
  </div>
</div>`;

  const texto = [
    `PEDIDO NUEVO — Bodega de Talavera`,
    folio ? `Folio ${folio}` : null,
    fechaMx(cuando),
    '',
    ...items.map((i) => `  ${cant(i.cant)} x ${i.nombre} ${i.formato || ''} [${i.codigo}] = ${pesos(i.precio * i.cant)}`),
    '',
    `  Subtotal: ${pesos(productos / 1.16)}`,
    `  IVA 16%:  ${pesos(productos - productos / 1.16)}`,
    `  Envio (${zonaTxt}): ${pesos(envio)}`,
    `  TOTAL: ${pesos(total)}`,
    '',
    `ENTREGA`,
    `  ${nombre} · ${telefono} · ${correo}`,
    `  ${calle}, ${colonia}. CP ${cp} (${zonaTxt})`,
    referencias ? `  Ref: ${referencias}` : null,
    '',
    descuadre !== null && descuadre !== undefined
      ? `!! REVISAR: se cobro ${pesos(total)} y el sitio esperaba ${pesos(descuadre)}`
      : null,
    `PAGO`,
    `  ${metodo} · ${referencia}`,
    `  Peso aprox: ${kilos} kg`,
    '',
    liga ? `  Seguimiento: ${liga}` : null,
    '',
    `CONSTANCIA DE ACEPTACION`,
    `  Terminos version ${version_terminos || '—'}`,
    `  Aceptados el ${acepto_en ? fechaMx(new Date(acepto_en)) : '—'} (hora del servidor)`,
  ]
    .filter((l) => l !== null)
    .join('\n');

  return { asunto, html, texto };
}

/** Manda un correo por Resend. Devuelve {ok} — nunca lanza. */
async function mandar(env, { para, asunto, html, texto }) {
  const llave = env.RESEND_API_KEY;
  if (!llave) return { ok: false, error: 'falta_RESEND_API_KEY' };
  if (!para.length) return { ok: false, error: 'falta_destinatario' };
  try {
    const r = await fetch(RESEND, {
      method: 'POST',
      headers: { Authorization: `Bearer ${llave}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.CORREO_DE || 'Bodega de Talavera <onboarding@resend.dev>',
        to: para,
        subject: asunto,
        html,
        text: texto,
      }),
    });
    if (!r.ok) return { ok: false, error: 'resend_' + r.status, detalle: await r.text() };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: 'red', detalle: String(e) };
  }
}

/** Folio del pedido: BT-MMDD-XXXXXX.
 *  El alfabeto no trae 0/O/1/I/L para que se pueda dictar por telefono sin dudas.
 *  Los 6 caracteres al azar (~10^9) son lo que hace que el folio NO se pueda
 *  adivinar: es la unica llave del link de seguimiento (Alek 2026-09-03). */
export function nuevoFolio(fecha = new Date()) {
  const A = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const mx = new Date(fecha.getTime() - 6 * 3600 * 1000); // CDMX = UTC-6
  const dd = String(mx.getUTCMonth() + 1).padStart(2, '0') + String(mx.getUTCDate()).padStart(2, '0');
  const r = crypto.getRandomValues(new Uint8Array(6));
  return `BT-${dd}-${[...r].map((n) => A[n % A.length]).join('')}`;
}

/** Guarda el pedido. Es el REGISTRO; el correo es solo el aviso.
 *  ponytail: el KV `PEDIDOS` ya existia (lo usa mp-webhook para no avisar dos
 *  veces del mismo pago) — se guarda el pedido COMPLETO para que el dia que se
 *  quiera D1 y reportes, migrar sea leer el KV y volcarlo. Sin KV el pago sigue
 *  funcionando: un aviso (o un registro) nunca tumba un cobro. */
async function guardar(env, pedido) {
  if (!env?.PEDIDOS) return false;
  try {
    await env.PEDIDOS.put(`pedido:${pedido.folio}`, JSON.stringify(pedido));
    return true;
  } catch (e) {
    return false;
  }
}

/** Avisa del pedido a RAAC y, si esta encendido, al cliente.
 *  Nunca lanza: el que la llama puede ignorar el resultado sin riesgo. */
export async function avisarPedido(env, pedido) {
  pedido = { ...pedido, folio: pedido.folio || nuevoFolio(), fecha: pedido.fecha || new Date().toISOString() };
  pedido.guardado = await guardar(env, pedido);
  const { asunto, html, texto } = armarCorreo({ ...pedido, sitio: env?.SITIO || 'https://bodegadetalavera.com' });

  const para = String(env.CORREO_AVISO || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const r = await mandar(env, { para, asunto, html, texto });

  // Copia de confirmacion al cliente (apagada hasta que el dominio este verificado)
  if (String(env.CORREO_CLIENTE || '').toLowerCase() === 'si' && pedido?.correo) {
    await mandar(env, {
      para: [pedido.correo],
      asunto: `Recibimos tu pedido · Bodega de Talavera`,
      html:
        `<p style="font-family:system-ui,sans-serif">Gracias por tu compra. Este es el detalle de tu pedido; ` +
        `te escribimos por WhatsApp para confirmarte la fecha de entrega.</p>` + html,
      texto: `Gracias por tu compra. Este es el detalle de tu pedido.\n\n${texto}`,
    });
  }

  return r;
}
