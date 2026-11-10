/* SiteLift fx runtime + loader. Vanilla, no dependencies, no network beyond its own module files.
   A site turns effects on in site.json "fx"; render.py writes assets/fx/fx.js = this runtime + ONLY the chosen modules
   (already defined, so nothing else is fetched) and assets/fx/fx.css = their CSS. Unbundled (gallery/demo pages) it
   lazy-loads fx/<id>.js (+ fx/<id>.css when the entry has "css":1).
   Config: <script src=".../fx.js" defer data-fx='[{"id":"tilt","sel":".card","opt":{}}]'></script>  ("a,b,c" works too).
   Module contract (README.md): FX.def(id, function (c) {...}); c = {id, sel, opt, els(defaultSel)}.
   Rules for every module: static fallback for reduced motion, hover-only effects off on touch, never hides content if
   JS fails, no layout shift, keyboard/focus safe. */
(function () {
  var d = document, h = d.documentElement, me = d.currentScript;
  if (window.FX && window.FX.v) return;
  var mm = function (q) { return !!(window.matchMedia && matchMedia(q).matches); };
  var base = me && me.src ? me.src.replace(/[^\/]*$/, '') : 'assets/fx/';
  var raw = ((me && me.getAttribute('data-fx')) || '').trim(), list;
  try { list = raw.charAt(0) === '[' ? JSON.parse(raw) : raw.split(','); } catch (e) { list = []; }
  list = list.map(function (x) { return typeof x === 'string' ? { id: x.trim() } : x; }).filter(function (x) { return x && x.id; });
  var FX = window.FX = { v: 1, mods: {}, cfg: {} };
  FX.reduced = mm('(prefers-reduced-motion: reduce)');
  FX.fine = mm('(hover: hover) and (pointer: fine)');   // a real mouse: cursors + hover-only effects run only here
  FX.small = mm('(max-width: 760px)');
  FX.$$ = function (sel, root) { try { return sel ? [].slice.call((root || d).querySelectorAll(sel)) : []; } catch (e) { return []; } };
  // resolved rgb() of a CSS variable (works with color-mix etc.), for canvas modules
  FX.color = function (v, fb) {
    var s = d.createElement('i');
    s.style.cssText = 'position:absolute;width:0;height:0;color:var(' + v + ',' + (fb || '#888') + ')';
    d.body.appendChild(s); var c = getComputedStyle(s).color; d.body.removeChild(s); return c;
  };
  FX.rgba = function (c, a) { var m = String(c).match(/[\d.]+/g) || [0, 0, 0]; return 'rgba(' + m[0] + ',' + m[1] + ',' + m[2] + ',' + a + ')'; };
  // fn(el) once per element when it scrolls into view (immediately without IntersectionObserver)
  FX.seen = function (els, fn, margin) {
    if (!('IntersectionObserver' in window)) { els.forEach(fn); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
    }, { rootMargin: margin || '0px 0px -10% 0px' });
    els.forEach(function (e) { io.observe(e); });
  };
  // fn(true|false) as el enters/leaves the viewport: pause canvases and loops off-screen
  FX.vis = function (el, fn) {
    if (!('IntersectionObserver' in window)) { fn(true); return; }
    new IntersectionObserver(function (es) { fn(es[es.length - 1].isIntersecting); }).observe(el);
  };
  FX.idle = function (fn) { (window.requestIdleCallback || function (f) { setTimeout(f, 120); })(fn); };
  FX.css = function (id) {
    if (d.querySelector('link[data-fx-css="' + id + '"]')) return;
    var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = base + 'fx/' + id + '.css'; l.setAttribute('data-fx-css', id);
    d.head.appendChild(l);
  };
  function ctx(id) {
    var c = FX.cfg[id] || {};
    return { id: id, sel: c.sel || '', opt: c.opt || {},
      els: function (def) {
        var out = [], add = function (e) { if (out.indexOf(e) < 0) out.push(e); };
        FX.$$('[data-fx-' + id + ']').forEach(add);
        FX.$$(c.sel || def).forEach(add);
        return out;
      } };
  }
  function run(id) {
    var c = FX.cfg[id];
    if (!c || c.done || !FX.mods[id]) return;
    c.done = 1;
    var x = ctx(id);
    if (x.sel) FX.$$(x.sel).forEach(function (e) { e.setAttribute('data-fx-' + id, ''); });   // module CSS targets [data-fx-<id>]
    h.classList.add('fx-' + id);
    try { FX.mods[id](x); } catch (e) { h.classList.remove('fx-' + id); if (window.console) console.warn('fx ' + id, e); }
  }
  FX.def = function (id, fn) { FX.mods[id] = fn; if (FX.ready) run(id); };
  // switch an effect on (also used by the gallery/demo at runtime)
  FX.add = function (x) {
    x = typeof x === 'string' ? { id: x } : x;
    if (!FX.cfg[x.id]) FX.cfg[x.id] = x;
    if (x.css) FX.css(x.id);
    if (FX.mods[x.id]) { if (FX.ready) run(x.id); return; }
    if (x.js === 0) {   // CSS-only module: tag configured elements so its CSS can target [data-fx-<id>]
      FX.$$(x.sel).forEach(function (e) { e.setAttribute('data-fx-' + x.id, ''); });
      h.classList.add('fx-' + x.id); return;
    }
    var s = d.createElement('script'); s.src = base + 'fx/' + x.id + '.js'; s.async = true; d.head.appendChild(s);
  };
  h.classList.add('fx');
  if (FX.reduced) h.classList.add('fx-reduced');
  if (FX.fine) h.classList.add('fx-fine');
  list.forEach(function (x) { FX.cfg[x.id] = x; });
  function go() { FX.ready = 1; list.forEach(function (x) { if (FX.mods[x.id]) run(x.id); else FX.add(x); }); }
  // bundled modules follow this code in the same file: start after they have registered
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', go); else setTimeout(go, 0);
})();

/* fx bg-waves */
/* bg-waves: four thin sine lines drifting sideways across the bottom of the hero, in primary/accent at low alpha, fading
   out toward the top. Animated SVG paths moved by CSS only (no JS loop); static with reduced motion. opt: {n: 4} lines */
FX.def('bg-waves', function (c) {
  var n = Math.min(5, Math.max(3, +c.opt.n || 4));
  c.els('main > :first-child').slice(0, 1).forEach(function (t) {
    var L = document.createElement('div'), h = '', i;
    L.className = 'fx-waves'; L.setAttribute('aria-hidden', 'true'); L.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    for (i = 0; i < n; i++) {
      var a = 5 + i * 3.5, k = 2 + (i % 2), ph = i * 1.3, p = '';   // amplitude, periods per half, phase
      for (var x = 0; x <= 400; x += 5) p += (x ? 'L' : 'M') + (x * 5) + ' ' + (50 + a * Math.sin(x / 200 * 2 * Math.PI * k + ph)).toFixed(1);
      h += '<svg viewBox="0 0 2000 100" preserveAspectRatio="none" style="bottom:' + (2 + i * 4.5) + '%;animation-duration:' + (46 + i * 14) +
        's;animation-direction:' + (i % 2 ? 'reverse' : 'normal') + '"><path d="' + p + '" style="stroke:var(--' + (i % 2 ? 'accent' : 'primary') +
        ');opacity:' + (0.5 - i * 0.07).toFixed(2) + '"/></svg>';
    }
    L.innerHTML = h;
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';   // before inserting: no layout shift
    t.style.isolation = 'isolate'; t.insertBefore(L, t.firstChild);
  });
});

/* fx count-up */
/* count-up: real numbers (rating, review count, years) count up once when they scroll into view. The element's width is
   locked to its final text first (no layout shift); the final text is exactly what was there (prefix/suffix kept);
   years (1900-2099) and numbers under 2 are left alone. Reduced motion / no JS: the final number, untouched.
   opt: {ms: 1400} */
FX.def('count-up', function (c) {
  if (FX.reduced) return;
  var ms = +c.opt.ms || 1400;
  var els = c.els('[data-count],[class*="stat"] b,[class*="stat"] strong,[class*="stat"] dd,[class*="stat"] [class*="num"]');
  els = els.filter(function (el) { return !el.children.length && /^\D{0,2}\d[\d,]*(\.\d+)?\D{0,8}$/.test(el.textContent.trim()); });
  els.forEach(function (el) {
    var t = el.textContent.trim(), m = t.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    var end = parseFloat(m[2].replace(/,/g, ''));
    if (!isFinite(end) || end < 2 || (end >= 1900 && end < 2100 && m[2].indexOf('.') < 0)) return;
    var dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') > -1;
    var fmt = function (v) { var s = v.toFixed(dec); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s; };
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    el.setAttribute('data-fx-final', t);
    FX.seen([el], function () {
      var t0 = performance.now();
      el.setAttribute('aria-label', t);
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4);
        el.textContent = k < 1 ? m[1] + fmt(end * e) + m[3] : t;
        if (k < 1) requestAnimationFrame(step); else el.removeAttribute('aria-label');
      })(t0);
    });
  });
});

/* fx heading-scrub */
/* heading-scrub: marks the section headings (h2 by default) the CSS animates. Letter-spacing is deliberately not animated (it would
   reflow the text); the heading lifts, fades up and un-clips instead. Browsers without scroll-driven animations: nothing happens. */
FX.def('heading-scrub', function (c) {
  if (FX.reduced || !(window.CSS && CSS.supports('animation-timeline: view()'))) return;
  c.els('main h2').forEach(function (e) { e.setAttribute('data-fx-hs', ''); });
});
