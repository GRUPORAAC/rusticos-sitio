/** Tabulador de envio — Alek 2026-09-03. Sustituye la tarifa plana $450/$1,150.
 *
 *  LO QUE DICE LA EVIDENCIA (23 cotizaciones de Luis + 9 de Lalamove, ver contexto):
 *  1. EL PESO NO MUEVE EL PRECIO en CDMX. Medido dos veces: Luis cobro $600 por
 *     1,600 kg y $600 por 200 kg; Lalamove cobro $313 en Van (1 ton) y $668 en
 *     camion de 3.5 ton por el MISMO destino. Lo que mueve el precio es la distancia.
 *  2. El peso solo decide QUE VEHICULO cabe — es un escalon, no una rampa.
 *  3. Hay tarifa minima: $236 Lalamove, $300 piso de Luis.
 *
 *  ⇒ El cobro es por ANILLO DE DISTANCIA desde Div. del Norte 2604 (CP 04120),
 *    y el peso solo se usa para un CORTE: arriba de 1,000 kg ya no cabe en una
 *    van y el pedido sale a WhatsApp, igual que el foraneo.
 *
 *  Cada tarifa va entre lo que cobra Lalamove y lo que cobra Luis hoy: cubre el
 *  precio dinamico de Lalamove y la maniobra de carga (que Lalamove NO incluye y
 *  Luis si), y aun asi le gana al precio de lista de Luis.
 *  ponytail: tabla propia, sin API. Lalamove en vivo es el nivel 2 y no bloquea.
 */

export const MAX_KG = 1000; // capacidad de una van; arriba de esto se cotiza aparte

/** [nombre, cp_desde, cp_hasta, costo] — el ORDEN IMPORTA: gana el primero que casa. */
export const ANILLOS = [
  // Anillo C — poniente alto de Alvaro Obregon (Santa Rosa Xochiac $604 en Lalamove).
  // Va ANTES que el anillo B para ganarle al rango general de Alvaro Obregon.
  ['Álvaro Obregón (poniente)', 1700, 1899, 750],

  // Anillo A — la zona de la tienda. Luis: $300-450. Lalamove: $236 (su minimo).
  ['Benito Juárez',  3000,  3999, 350],
  ['Coyoacán',       4000,  4999, 350],
  ['Tlalpan',       14000, 14999, 350],

  // Anillo B — el grueso de la ciudad. Luis: $500-700. Lalamove: $287-449.
  ['Álvaro Obregón',  1000,  1999, 500],
  ['Cuauhtémoc',      6000,  6999, 500],
  ['Iztacalco',       8000,  8999, 500],
  ['Iztapalapa',      9000,  9999, 500],
  ['Miguel Hidalgo', 11000, 11999, 500],
  ['Xochimilco',     13000, 13999, 500],
  ['Venustiano Carranza', 15000, 15999, 500],

  // Anillo C — la periferia. Luis: $800+. Lalamove: $563-604.
  // Magdalena Contreras entera va aqui: es cerro (Huayatla $563 en Lalamove,
  // y Luis llego a cobrar $1,800 por ese mismo destino).
  ['Azcapotzalco',    2000,  2999, 750],
  ['Cuajimalpa',      5000,  5999, 750],
  ['Gustavo A. Madero', 7000, 7999, 750],
  ['Magdalena Contreras', 10000, 10999, 750],
  ['Tláhuac',        12000, 12999, 750],
  ['Milpa Alta',     16000, 16999, 750],

  // Anillo D — los 16 conurbados del Edomex. Lalamove a Ecatepec: $910.
  ['Nezahualcóyotl',      57000, 57999, 1150],
  ['Naucalpan de Juárez', 53000, 53999, 1150],
  ['La Paz (Los Reyes)',  56400, 56529, 1150],
  ['Huixquilucan',        52760, 52799, 1150],
  ['Tlalnepantla de Baz', 54000, 54199, 1150],
  ['Valle de Chalco',     56610, 56619, 1150],
  ['Chimalhuacán',        56330, 56369, 1150],
  ['Atizapán de Zaragoza',52900, 52999, 1150],
  ['Chicoloapan',         56370, 56399, 1150],
  ['Chalco',              56600, 56609, 1150],
  ['Chalco',              56620, 56649, 1150],
  ['Ixtapaluca',          56530, 56599, 1150],
  ['Ecatepec de Morelos', 55000, 55599, 1150],
  ['Coacalco de Berriozábal', 55700, 55739, 1150],
  ['Tultitlán',           54900, 54999, 1150],
  ['Texcoco',             56100, 56269, 1150],
  ['Cuautitlán Izcalli',  54700, 54769, 1150],
];

/** Cotiza el envio. `kilos` opcional: si pasa de MAX_KG sale de zona.
 *  @returns {{zona:''|'ok'|'fuera', lugar:string, costo:number|null, motivo:string}} */
export function cotizar(cp, kilos = 0) {
  const s = String(cp ?? '').trim();
  if (!/^\d{5}$/.test(s)) return { zona: '', lugar: '', costo: null, motivo: '' };
  const n = parseInt(s, 10);
  for (const [lugar, a, b, costo] of ANILLOS) {
    if (n >= a && n <= b) {
      if (kilos > MAX_KG) return { zona: 'fuera', lugar, costo: null, motivo: 'peso' };
      return { zona: 'ok', lugar, costo, motivo: '' };
    }
  }
  return { zona: 'fuera', lugar: '', costo: null, motivo: 'cp' };
}
