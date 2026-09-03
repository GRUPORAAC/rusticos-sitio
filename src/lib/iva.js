/** Desglose de IVA — Alek 2026-09-03.
 *  🔑 LOS PRECIOS PUBLICADOS YA INCLUYEN IVA (precio total al consumidor).
 *  Por eso NO se suma 16% encima: se DESGLOSA hacia atras. Sumarlo cobraria
 *  el impuesto dos veces.
 *  El total nunca cambia: subtotal + iva === el precio que el cliente vio.
 */
export const TASA_IVA = 0.16;

/** @returns {{subtotal:number, iva:number}} — subtotal + iva === conIva, exacto. */
export function desglosar(conIva) {
  const t = Math.round(Number(conIva || 0) * 100) / 100;
  const subtotal = Math.round((t / (1 + TASA_IVA)) * 100) / 100;
  return { subtotal, iva: Math.round((t - subtotal) * 100) / 100 };
}
