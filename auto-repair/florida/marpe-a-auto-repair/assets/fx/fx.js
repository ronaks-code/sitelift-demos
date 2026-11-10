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

/* fx ken-burns */
/* ken-burns: slow zoom and pan of the hero photo (default: the largest photo in the first block of <main>, plus [data-fx-ken-burns] img).
   Only runs when the photo's frame (or the one around it) clips overflow, and never on .ph placeholders.
   opt: {seconds: 22} (18 to 24 looks right). Reduced motion: static. */
FX.def('ken-burns', function (c) {
  if (FX.reduced) return;
  var els = c.els('main > :first-child img, [data-fx-ken-burns] img').filter(function (i) { return !i.closest('.ph') && i.getBoundingClientRect().width > 160; });
  if (!c.sel && els.length > 1) {
    var a = function (i) { var r = i.getBoundingClientRect(); return r.width * r.height; };
    var by = els.filter(function (i) { return i.closest('[data-fx-ken-burns]'); });
    els = by.length ? by : [els.sort(function (x, y) { return a(y) - a(x); })[0]];
  }
  els.forEach(function (img) {
    for (var n = img.parentElement, k = 0; n && k < 3 && n !== document.body; n = n.parentElement, k++) {
      if (/hidden|clip/.test(getComputedStyle(n).overflowY)) {
        img.setAttribute('data-fx-kb', ''); if (c.opt.seconds) img.style.setProperty('--fx-kb-t', (+c.opt.seconds) + 's'); return;
      }
    }
  });
});

/* fx stars-fill */
/* stars-fill: elements whose own text is only stars (default [class*=star], or sel) fill left to right once, when seen.
   The text node is wrapped in a span (inline, same glyphs, aria-hidden left as it was). No reduced-motion animation. opt: {ms: 900} */
FX.def('stars-fill', function (c) {
  if (FX.reduced) return;
  var ms = +c.opt.ms || 900, els = c.els('[class*=star]').filter(function (e) {
    return !e.children.length && /^[\s★☆]+$/.test(e.textContent) && /[★☆]/.test(e.textContent);
  });
  els.forEach(function (el) {
    var s = document.createElement('span');
    s.className = 'fx-stars-in fx-stars-w';
    while (el.firstChild) s.appendChild(el.firstChild);
    el.appendChild(s);
    FX.seen([el], function () {
      s.classList.remove('fx-stars-w');
      s.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0 0' }], { duration: ms, easing: 'cubic-bezier(.45,.05,.2,1)' });
    });
  });
});

/* fx section-tint */
/* section-tint: the page ground crossfades between soft section colours as you scroll. Sections opt in with data-fx-tint="--surface"
   (any CSS variable or colour); otherwise the module alternates transparent sections between the page colour and faint washes of
   --primary and --accent. Sections with their own background are never tinted. Skipped if the page ground can't show a layer.
   opt: {amount: 7} (percent of brand colour in the auto washes) */
FX.def('section-tint', function (c) {
  var d = document, h = d.documentElement, a = +c.opt.amount || 7;
  var clear = function (e) { var s = getComputedStyle(e); return (/^rgba\(.*, 0\)$|^transparent$/.test(s.backgroundColor)) && s.backgroundImage === 'none'; };
  if (!clear(h) || !d.querySelector('main')) return;
  var main = d.querySelector('main');
  if (!clear(main)) return;
  var secs = c.els('main > section, main > div, main > article').filter(clear);
  if (secs.length < 2) return;
  var auto = ['var(--bg)', 'color-mix(in srgb,var(--primary) ' + a + '%,var(--bg))', 'var(--bg)', 'color-mix(in srgb,var(--accent) ' + a + '%,var(--bg))'], n = 0;
  var tint = secs.map(function (s) {
    var t = s.getAttribute('data-fx-tint'), v = t ? (t.indexOf('--') === 0 ? 'var(' + t + ')' : t) : auto[n++ % 4];
    return { el: s, c: v };
  });
  var L = d.createElement('div'); L.className = 'fx-st-layer'; L.setAttribute('aria-hidden', 'true'); L.style.cssText = 'position:fixed;inset:0;pointer-events:none';
  d.body.insertBefore(L, d.body.firstChild);
  var cur = '', busy = 0;
  function pick() {
    busy = 0;
    var mid = innerHeight * .5, best = tint[0];
    for (var i = 0; i < tint.length; i++) { var r = tint[i].el.getBoundingClientRect(); if (r.top <= mid) best = tint[i]; if (r.top > mid) break; }
    if (best.c !== cur) { cur = best.c; L.style.backgroundColor = cur; }
  }
  addEventListener('scroll', function () { if (!busy) { busy = 1; requestAnimationFrame(pick); } }, { passive: true });
  addEventListener('resize', pick, { passive: true });
  pick();
});
