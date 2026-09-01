/** Zonas de envio — decision 2026-08-28 (decision 2 de 4).
 *  El carrito solo cobra CDMX + 16 conurbados. Lo demas sale a WhatsApp.
 *  ponytail: tarifa plana por zona. Lalamove en vivo es el nivel 2 y no bloquea.
 *  ⚠️ ESTOS DOS MONTOS LOS DEFINE FEDERICO — aqui van propuestos:
 *     normal, sobre la tarifa minima de Lalamove ($236) y el promedio en CDMX
 *     alta, sobre los $910 medidos a Ecatepec + margen */
export const TARIFAS = { normal: 450, alta: 1150 };

// Bloques de CP completos, no min-max: las bases publicas omiten codigos.
// OJO: Chalco y La Paz tienen rangos PARTIDOS — el hueco de Chalco
// (56610-56619) es Valle de Chalco, otro municipio.
const ALTA = [
  ['Nezahualcóyotl', 57000, 57999], ['Naucalpan de Juárez', 53000, 53999],
  ['La Paz (Los Reyes)', 56400, 56529], ['Huixquilucan', 52760, 52799],
  ['Tlalnepantla de Baz', 54000, 54199], ['Valle de Chalco', 56610, 56619],
  ['Chimalhuacán', 56330, 56369], ['Atizapán de Zaragoza', 52900, 52999],
  ['Chicoloapan', 56370, 56399], ['Chalco', 56600, 56609], ['Chalco', 56620, 56649],
  ['Ixtapaluca', 56530, 56599], ['Ecatepec de Morelos', 55000, 55599],
  ['Coacalco de Berriozábal', 55700, 55739], ['Tultitlán', 54900, 54999],
  ['Texcoco', 56100, 56269], ['Cuautitlán Izcalli', 54700, 54769],
];

/** @returns {{zona:'normal'|'alta'|'fuera', lugar:string, costo:number|null}} */
export function zonaDe(cp) {
  const n = parseInt(String(cp).trim(), 10);
  if (!/^\d{5}$/.test(String(cp).trim()) || isNaN(n)) return { zona: 'fuera', lugar: '', costo: null };
  if (n >= 1000 && n <= 16999) return { zona: 'normal', lugar: 'Ciudad de México', costo: TARIFAS.normal };
  for (const [lugar, a, b] of ALTA) {
    if (n >= a && n <= b) return { zona: 'alta', lugar, costo: TARIFAS.alta };
  }
  return { zona: 'fuera', lugar: '', costo: null };
}
