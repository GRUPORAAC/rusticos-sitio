/** Filtro por familia de color y por tono. `mapa` es url -> [colores].
 *  `fams` es color -> familia. Oculta bloques que se quedan sin productos. */
export function montarFiltro(mapa, fams) {
  const fila = document.querySelector('.filtro-color');
  if (!fila) return;
  const tarjetas = [...document.querySelectorAll('.tarjeta')];
  // La categoria pinta UNA sola rejilla: los encabezados de subcategoria son
  // filas del grid. Se oculta el encabezado que se queda sin tarjetas visibles.
  const encabezados = [...document.querySelectorAll('.sub-t[data-sub]')];
  const vacio = document.querySelector('.vacio-filtro');
  const btnQuitar = document.getElementById('quitar-filtro');

  function aplicar(fam, color) {
    if (btnQuitar) btnQuitar.hidden = !fam && !color;
    tarjetas.forEach((t) => {
      const url = t.getAttribute('href').split('/').filter(Boolean).pop();
      const cs = mapa[url] || [];
      const ok = color ? cs.includes(color) : fam ? cs.some((c) => fams[c] === fam) : true;
      t.hidden = !ok;
    });
    encabezados.forEach((h) => {
      let n = h.nextElementSibling, vivo = false;
      while (n && !n.matches('.sub-t')) {
        if (n.matches('.tarjeta') && !n.hidden) { vivo = true; break; }
        n = n.nextElementSibling;
      }
      h.hidden = !vivo;
    });
    if (vacio) vacio.hidden = tarjetas.some((t) => !t.hidden);
  }

  // familia
  document.querySelectorAll('.fila .gota, .fila .pastilla').forEach((b) =>
    b.addEventListener('click', () => {
      document.querySelectorAll('.fila .gota, .fila .pastilla').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      const fam = b.dataset.fam || '';
      document.querySelectorAll('.tonos').forEach((t) => (t.hidden = t.dataset.de !== fam));
      document.querySelectorAll('.tonos .pastilla-tono').forEach((x) => x.classList.add('on'));
      document.querySelectorAll('.tonos .gota').forEach((x) => x.classList.remove('on'));
      aplicar(fam, '');
    })
  );

  // tono dentro de la familia
  document.querySelectorAll('.tonos .gota, .tonos .pastilla-tono').forEach((b) =>
    b.addEventListener('click', () => {
      const caja = b.closest('.tonos');
      caja.querySelectorAll('.gota, .pastilla-tono').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      aplicar(b.dataset.fam, b.dataset.color || '');
    })
  );

  // quitar el filtro y volver a verlo todo
  if (btnQuitar) {
    btnQuitar.addEventListener('click', () => {
      document.querySelectorAll('.fila .gota').forEach((x) => x.classList.remove('on'));
      document.querySelector('.fila .pastilla').classList.add('on');
      document.querySelectorAll('.tonos').forEach((t) => (t.hidden = true));
      aplicar('', '');
    });
  }
}
