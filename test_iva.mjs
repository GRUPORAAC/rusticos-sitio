/** check: el IVA se desglosa, no se suma. El total nunca puede cambiar. */
import { desglosar, TASA_IVA } from './src/lib/iva.js';
let f = 0;
const ok = (c, m) => { if (!c) { console.log('  FALLA:', m); f++; } };

for (const t of [0, 1, 995, 1055, 1350, 3175, 350, 1150, 12345.67, 0.01, 99999.99]) {
  const { subtotal, iva } = desglosar(t);
  ok(Math.abs(subtotal + iva - t) < 0.005, `${t}: subtotal ${subtotal} + iva ${iva} = ${subtotal + iva}, deberia dar ${t}`);
  ok(iva >= 0 && subtotal >= 0, `${t}: no puede haber negativos`);
}
// el iva desglosado es ~13.79% del total, NO el 16% del total
const d = desglosar(1160);
ok(d.subtotal === 1000, `1160 con IVA incluido deberia venir de 1000, dio ${d.subtotal}`);
ok(d.iva === 160, `el IVA de 1160 deberia ser 160, dio ${d.iva}`);
// y sobre todo: NO se suma
ok(desglosar(1000).subtotal < 1000, 'el subtotal SIEMPRE es menor que el precio publicado');
console.log(f ? `\n${f} FALLAS` : '\nOK — el IVA se desglosa hacia atras, el total no cambia');
process.exit(f ? 1 : 0);
