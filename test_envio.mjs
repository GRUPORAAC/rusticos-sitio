/** Verifica el tabulador de envio. `node test_envio.mjs`
 *  Lo que protege:
 *   1. Que las DOS copias de la tabla (navegador y servidor) sean identicas.
 *      Si divergen, el sitio le cobra al cliente algo distinto de lo que valida
 *      el servidor y el pedido se cae al pagar.
 *   2. Que ningun destino real medido quede cobrado por debajo de lo que
 *      cuesta el flete.
 */
import { cotizar, ANILLOS as A_WEB, MAX_KG as KG_WEB } from './src/lib/envio.js';
import { envioDe, ANILLOS as A_API, MAX_KG as KG_API } from './functions/api/_pedido.js';

let fallos = 0;
const ok = (cond, msg) => { if (!cond) { console.log('  ✗ ' + msg); fallos++; } };

// 1. Las dos tablas, identicas
ok(JSON.stringify(A_WEB) === JSON.stringify(A_API), 'las tablas de anillos DIVERGEN entre src/lib/envio.js y functions/api/_pedido.js');
ok(KG_WEB === KG_API, `MAX_KG distinto: web ${KG_WEB} vs api ${KG_API}`);

// 2. Las dos funciones dan el mismo numero en todo CP de 5 digitos que nos importa
for (let n = 1000; n <= 57999; n += 7) {
  const cp = String(n).padStart(5, '0');
  const a = cotizar(cp).costo, b = envioDe(cp);
  ok(a === b, `${cp}: web ${a} vs api ${b}`);
}

// 3. Los destinos medidos: lo que cobramos vs lo que nos cuesta
//    [CP, destino, costo Lalamove Regular, costo Luis]
const REALES = [
  ['03810', 'El Rosedal (BJ)',              236,  300],
  ['04369', 'Sto. Domingo, Coyoacán',       236,  350],
  ['04000', 'Centro de Coyoacán',           236,  450],
  ['01020', 'Guadalupe Inn',                287,  500],
  ['01060', 'San Ángel Inn',                313,  600],
  ['06700', 'Roma Norte',                   361,  600],
  ['08500', 'Agrícola Oriental',            449,  600],
  ['01830', 'Santa Rosa Xochiac',           604,  800],
  ['10360', 'Huayatla, San Jerónimo',       563, 1800],
  ['55000', 'Ecatepec',                     910, null],
];
console.log('\n  destino                     cobramos   Lalamove    Luis   margen');
for (const [cp, nombre, lalamove, luis] of REALES) {
  const c = cotizar(cp).costo;
  ok(c !== null, `${nombre} (${cp}) quedo FUERA de zona`);
  ok(c >= lalamove, `${nombre}: cobramos $${c} y Lalamove cuesta $${lalamove} — PERDIDA de $${lalamove - c}`);
  console.log(`  ${nombre.padEnd(26)} $${String(c).padStart(5)}    $${String(lalamove).padStart(5)}   ${luis ? '$' + String(luis).padStart(5) : '  s/d'}   +$${c - lalamove}`);
}

// 4. El corte de peso
ok(cotizar('04120', 999).costo === 350, '999 kg deberia cobrarse normal');
ok(cotizar('04120', 1001).zona === 'fuera', '1,001 kg deberia salir de zona');
ok(cotizar('04120', 1001).motivo === 'peso', 'el motivo deberia ser "peso", no CP');
ok(envioDe('04120', 1001) === null, 'el servidor tambien debe rechazar 1,001 kg');

// 5. Fuera de zona
for (const cp of ['72000', '76000', '00999', '', 'abc', '1234'])
  ok(cotizar(cp).costo === null && envioDe(cp) === null, `${cp} deberia quedar fuera`);

console.log(fallos ? `\n  ${fallos} FALLO(S)` : '\n  ✓ todo en verde');
process.exit(fallos ? 1 : 0);
