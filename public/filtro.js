/** Filtros de la galeria: subcategoria + familia de color + tono.
 *  `mapa` es id -> { sub, colores[] }; `fams` es color -> familia.
 *  Todo pasa en el navegador sobre la galeria ya pintada: sin peticiones. */
export function montarFiltro(mapa, fams) {
  const piezas = [...document.querySelectorAll('.pieza')];
  const vacio = document.querySelector('.vacio-filtro');
  const cuenta = document.getElementById('cuenta-filtro');
  const btnQuitar = document.getElementById('quitar-filtro');
  const estado = { sub: '', fam: '', color: '' };

  function aplicar() {
    let n = 0;
    piezas.forEach((el) => {
      const d = mapa[el.dataset.id] || { sub: '', colores: [] };
      const okSub = !estado.sub || d.sub === estado.sub;
      const cs = d.colores || [];
      const okColor = estado.color
        ? cs.includes(estado.color)
        : estado.fam ? cs.some((c) => fams[c] === estado.fam) : true;
      const ok = okSub && okColor;
      el.hidden = !ok;
      if (ok) n++;
    });
    if (vacio) vacio.hidden = n > 0;
    if (cuenta) cuenta.textContent = n;
    const activo = !!(estado.sub || estado.fam || estado.color);
    if (btnQuitar) btnQuitar.hidden = !activo;
    // la URL recuerda el filtro para poder compartirlo
    const u = new URL(location.href);
    ['sub', 'fam', 'color'].forEach((k) => (estado[k] ? u.searchParams.set(k, estado[k]) : u.searchParams.delete(k)));
    history.replaceState(null, '', u);
  }

  function pintar() {
    document.querySelectorAll('[data-sub-btn]').forEach((b) =>
      b.classList.toggle('on', (b.dataset.subBtn || '') === estado.sub));
    document.querySelectorAll('[data-fam-btn]').forEach((b) =>
      b.classList.toggle('on', (b.dataset.famBtn || '') === estado.fam));
    document.querySelectorAll('.tonos').forEach((t) => (t.hidden = t.dataset.de !== estado.fam || !estado.fam));
    document.querySelectorAll('[data-color-btn]').forEach((b) =>
      b.classList.toggle('on', (b.dataset.colorBtn || '') === estado.color && b.dataset.famBtn === undefined));
    aplicar();
  }

  document.querySelectorAll('[data-sub-btn]').forEach((b) =>
    b.addEventListener('click', () => { estado.sub = b.dataset.subBtn || ''; pintar(); }));
  document.querySelectorAll('[data-fam-btn]').forEach((b) =>
    b.addEventListener('click', () => {
      const f = b.dataset.famBtn || '';
      estado.fam = estado.fam === f ? '' : f;
      estado.color = '';
      pintar();
    }));
  document.querySelectorAll('[data-color-btn]').forEach((b) =>
    b.addEventListener('click', () => {
      const c = b.dataset.colorBtn || '';
      estado.color = estado.color === c ? '' : c;
      pintar();
    }));
  if (btnQuitar) btnQuitar.addEventListener('click', () => {
    estado.sub = estado.fam = estado.color = '';
    pintar();
  });

  // filtro que viene en la URL (liga compartida o "regresar")
  const u = new URL(location.href);
  estado.sub = u.searchParams.get('sub') || '';
  estado.fam = u.searchParams.get('fam') || '';
  estado.color = u.searchParams.get('color') || '';
  if (estado.color && !estado.fam) estado.fam = fams[estado.color] || '';
  pintar();
}

/** Visor: clic en una pieza la amplia. Flechas y Esc funcionan; en celular
 *  se desliza. No hay pagina por producto (brief): esto es todo el detalle. */
export function montarVisor() {
  const visor = document.getElementById('visor');
  if (!visor) return;
  const img = visor.querySelector('img');
  const pie = visor.querySelector('.visor-pie');
  const sub = visor.querySelector('.visor-sub');
  const cerrar = visor.querySelector('.visor-cerrar');
  const prev = visor.querySelector('.visor-prev');
  const next = visor.querySelector('.visor-next');
  let lista = [], i = 0, ultimo = null;

  // Una entrada por FOTO, no por pieza: asi las flechas, el teclado y el
  // swipe recorren tambien las tomas extra de un mismo producto.
  const visibles = () => [...document.querySelectorAll('.pieza')]
    .filter((p) => !p.hidden)
    .flatMap((el) => (el.dataset.fotos || el.querySelector('img').src).split('|')
      .filter(Boolean)
      .map((src, n, todas) => ({
        el, src,
        nombre: el.dataset.nombre || '',
        sub: todas.length > 1 ? `${el.dataset.sub || ''} · ${n + 1}/${todas.length}`.replace(/^ · /, '') : (el.dataset.sub || ''),
      })));

  function mostrar(k) {
    i = (k + lista.length) % lista.length;
    const v = lista[i];
    img.src = v.src;
    img.alt = v.nombre;
    pie.textContent = v.nombre;
    sub.textContent = v.sub;
    prev.hidden = next.hidden = lista.length < 2;
  }
  function abrir(el) {
    lista = visibles();
    ultimo = document.activeElement;
    visor.hidden = false;
    document.body.style.overflow = 'hidden';
    mostrar(lista.findIndex((v) => v.el === el));
    requestAnimationFrame(() => visor.classList.add('on'));
    cerrar.focus();
  }
  function salir() {
    visor.classList.remove('on');
    document.body.style.overflow = '';
    setTimeout(() => { visor.hidden = true; img.src = ''; }, 250);
    if (ultimo && ultimo.focus) ultimo.focus();
  }

  document.querySelectorAll('.pieza').forEach((el) => {
    el.addEventListener('click', (e) => { e.preventDefault(); abrir(el); });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(el); } });
  });
  cerrar.addEventListener('click', salir);
  prev.addEventListener('click', () => mostrar(i - 1));
  next.addEventListener('click', () => mostrar(i + 1));
  visor.addEventListener('click', (e) => { if (e.target === visor || e.target.classList.contains('visor-marco')) salir(); });
  document.addEventListener('keydown', (e) => {
    if (visor.hidden) return;
    if (e.key === 'Escape') salir();
    else if (e.key === 'ArrowLeft') mostrar(i - 1);
    else if (e.key === 'ArrowRight') mostrar(i + 1);
  });
  let x0 = null;
  visor.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  visor.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) mostrar(dx < 0 ? i + 1 : i - 1);
    x0 = null;
  }, { passive: true });
}
