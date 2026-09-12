/** Secuencias ligadas al scroll (home "pieza de autor", brief 2026-09-10).
 *
 *  Cada <section data-secuencia> es un bloque alto (--largo pantallas) con un
 *  lienzo pegado (sticky). Mientras el bloque cruza la pantalla, el avance
 *  0..1 elige el cuadro a dibujar. Sin librerias: IntersectionObserver para
 *  no trabajar fuera de pantalla, requestAnimationFrame para dibujar una sola
 *  vez por scroll, y precarga de todos los cuadros antes de empezar.
 *
 *  Los cuadros son fotos fijas tomadas en tripie (ver brief): el motor no
 *  interpola, solo cambia de cuadro. Con 24–60 fotos se ve fluido.
 *
 *  Con prefers-reduced-motion se muestra el ULTIMO cuadro fijo y nada mas.
 */
export function montarSecuencias() {
  const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-secuencia]').forEach((sec) => montar(sec, reducido));
}

function montar(sec, reducido) {
  const lienzo = sec.querySelector('canvas');
  const capas = [...sec.querySelectorAll('[data-desde]')];
  const barra = sec.querySelector('.sec-barra i');
  if (!lienzo) return;
  const ctx = lienzo.getContext('2d');
  const base = sec.dataset.secuencia;            // /secuencias/hornos/
  const total = Number(sec.dataset.cuadros || 0);
  const ext = sec.dataset.ext || 'webp';
  const nombre = (i) => `${base}${String(i + 1).padStart(3, '0')}.${ext}`;

  const cuadros = new Array(total);
  let listos = 0, ultimo = -1, pedido = false;

  function ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = lienzo.getBoundingClientRect();
    lienzo.width = Math.round(r.width * dpr);
    lienzo.height = Math.round(r.height * dpr);
    ultimo = -1;
    dibujar();
  }

  function pintar(img) {
    if (!img) return;
    const W = lienzo.width, H = lienzo.height;
    const s = Math.max(W / img.naturalWidth, H / img.naturalHeight); // cover
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
  }

  function avance() {
    const r = sec.getBoundingClientRect();
    const alto = r.height - window.innerHeight;
    if (alto <= 0) return 1;
    return Math.min(1, Math.max(0, -r.top / alto));
  }

  function dibujar() {
    pedido = false;
    const a = reducido ? 1 : avance();
    const i = Math.min(total - 1, Math.round(a * (total - 1)));
    if (i !== ultimo && cuadros[i] && cuadros[i].complete) {
      pintar(cuadros[i]);
      ultimo = i;
    }
    if (barra) barra.style.transform = `scaleX(${a})`;
    capas.forEach((c) => {
      const d = Number(c.dataset.desde), h = Number(c.dataset.hasta ?? 1);
      c.classList.toggle('on', a >= d && a < h);
    });
  }

  function alScroll() {
    if (!pedido) { pedido = true; requestAnimationFrame(dibujar); }
  }

  function precargar() {
    for (let i = 0; i < total; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { listos++; if (i === 0 || listos === total) { ultimo = -1; dibujar(); } };
      img.onerror = () => { listos++; };
      img.src = nombre(i);
      cuadros[i] = img;
    }
  }

  // solo trabaja cuando el bloque esta cerca de la pantalla
  let activo = false;
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting && !activo) {
        activo = true;
        precargar();
        window.addEventListener('scroll', alScroll, { passive: true });
        window.addEventListener('resize', ajustar);
        ajustar();
      } else if (!e.isIntersecting && activo) {
        activo = false;
        window.removeEventListener('scroll', alScroll);
        window.removeEventListener('resize', ajustar);
      }
    });
  }, { rootMargin: '100% 0px' });
  io.observe(sec);
}
