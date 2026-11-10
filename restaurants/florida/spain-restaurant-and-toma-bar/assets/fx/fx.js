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

/* fx bg-mesh */
/* bg-mesh: a slow drifting gradient mesh behind the hero: four large soft radial blobs in the brand colours at low alpha,
   moved with CSS transform keyframes (no blur filter, cheap on phones). One layer, first child of the target; static with
   reduced motion. opt: {strength: 0..1 (default .6)} */
FX.def('bg-mesh', function (c) {
  var s = c.opt.strength == null ? 0.6 : Math.max(0, Math.min(1, +c.opt.strength));
  c.els('main > :first-child').slice(0, 1).forEach(function (t) {
    var L = document.createElement('div'), i;
    L.className = 'fx-mesh'; L.setAttribute('aria-hidden', 'true'); L.style.cssText = 'position:absolute;inset:0;pointer-events:none'; L.style.opacity = s;
    for (i = 0; i < 4; i++) L.appendChild(document.createElement('i'));
    // Containing block first, then insert: setting position after the layer is in moves the blobs (counted as layout shift).
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';
    t.style.isolation = 'isolate'; t.insertBefore(L, t.firstChild);
  });
});

/* fx reveal-plus */
/* reveal-plus: richer reveals on top of core's .rv (core adds .in). opt: {style: "rise" | "blur" | "clip", step: 70} (ms between
   items that enter together, so grids and lists cascade instead of popping at once). Reduced motion: core already shows all. */
FX.def('reveal-plus', function (c) {
  if (FX.reduced || !('IntersectionObserver' in window)) return;
  var h = document.documentElement, st = String(c.opt.style || 'rise'), step = +c.opt.step || 70;
  if (st === 'blur' || st === 'clip') h.classList.add('fx-rp-' + st);
  var els = c.els('.rv').filter(function (e) { return !e.classList.contains('in'); });
  var io = new IntersectionObserver(function (es) {
    var hit = es.filter(function (e) { return e.isIntersecting; }).map(function (e) { return e.target; });
    hit.sort(function (a, b) { var A = a.getBoundingClientRect(), B = b.getBoundingClientRect(); return (A.top - B.top) || (A.left - B.left); });
    hit.forEach(function (e, i) {
      io.unobserve(e);
      e.style.transitionDelay = Math.min(i, 6) * step + 'ms';
      setTimeout(function () { e.style.transitionDelay = ''; }, 1500);
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach(function (e) { io.observe(e); });
});

/* fx btn-fill */
/* btn-fill: inserts the fill layer and tracks which side the pointer entered/left from. Mouse only. */
FX.def('btn-fill', function (c) {
  if (!FX.fine) return;
  var acc = FX.color('--accent');
  c.els('.btn').forEach(function (b) {
    if (b.matches('.callbar') || b.querySelector(':scope > .fx-bf-l')) return;
    var cs = getComputedStyle(b), l = document.createElement('span');
    l.className = 'fx-bf-l'; l.setAttribute('aria-hidden', 'true'); l.style.cssText = 'position:absolute;inset:0;pointer-events:none'; b.insertBefore(l, b.firstChild);
    b.classList.add('fx-bf');
    if (cs.position === 'static') b.classList.add('fx-bf-r');
    if (cs.backgroundColor === acc) b.classList.add('fx-bf-ink');
    else if (/rgba\(.*, 0\)|transparent/.test(cs.backgroundColor)) b.classList.add('fx-bf-alt');
    b.style.transition = (parseFloat(cs.transitionDuration) ? cs.transition + ', ' : '') + 'color .4s cubic-bezier(.2,.7,.2,1), border-color .4s cubic-bezier(.2,.7,.2,1)';
    function set(e) {
      var r = b.getBoundingClientRect(), k = function (v) { return Math.max(-1, Math.min(1, v)).toFixed(2); };
      b.style.setProperty('--fx-dx', k((e.clientX - r.left) / r.width * 2 - 1));
      b.style.setProperty('--fx-dy', k((e.clientY - r.top) / r.height * 2 - 1));
    }
    b.addEventListener('pointerenter', set); b.addEventListener('pointerleave', set);
    b.addEventListener('focus', function () { b.style.setProperty('--fx-dx', 0); b.style.setProperty('--fx-dy', 0); });
  });
});

/* fx lightbox-plus */
/* lightbox-plus: replaces core's lightbox for a[data-lb] (capture-phase click + stopImmediatePropagation so core never opens).
   Dialog with caption, "3 / 12" counter, prev/next, arrow keys, Escape, swipe, focus trap, focus back on the thumbnail, images grouped by
   their gallery container (items hidden by a filter chip are skipped). Opens by growing from the thumbnail unless motion is reduced.
   opt: {label: "Photo viewer", close: "Close", prev: "Previous photo", next: "Next photo"} */
FX.def('lightbox-plus', function (c) {
  var d = document, o = c.opt, lb, img, cap, num, items = [], at = 0, from = null, B = {};
  function mk(cls, label, t) { var b = d.createElement('button'); b.type = 'button'; b.className = 'fx-lb-b ' + cls; b.setAttribute('aria-label', label); b.textContent = t; return b; }
  function build() {
    lb = d.createElement('div'); lb.className = 'fx-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', o.label || 'Photo viewer');
    lb.style.background = FX.rgba(FX.color('--dark'), .94);
    var f = d.createElement('figure'); f.className = 'fx-lb-f';
    img = d.createElement('img'); img.className = 'fx-lb-img'; img.alt = '';
    cap = d.createElement('figcaption'); cap.className = 'fx-lb-cap';
    num = d.createElement('div'); num.className = 'fx-lb-n'; num.setAttribute('aria-live', 'polite');
    B.x = mk('fx-lb-x', o.close || 'Close', '×'); B.p = mk('fx-lb-p', o.prev || 'Previous photo', '‹'); B.n = mk('fx-lb-nx', o.next || 'Next photo', '›');
    f.appendChild(img); f.appendChild(cap);
    [f, num, B.x, B.p, B.n].forEach(function (e) { lb.appendChild(e); });
    d.body.appendChild(lb);
    B.x.onclick = close; B.p.onclick = function () { go(-1); }; B.n.onclick = function () { go(1); };
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === f) close(); });
    var sx = null;
    lb.addEventListener('pointerdown', function (e) { sx = e.target.closest('button') ? null : e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (sx !== null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1);
      sx = null;
    });
    d.addEventListener('keydown', key, true);
  }
  function text(a) {
    var fig = a.closest('figure'), fc = fig && fig.querySelector('figcaption'), im = a.querySelector('img');
    return a.getAttribute('data-cap') || (fc && fc.textContent.trim()) || (im && im.alt) || '';
  }
  function show(i, dir) {
    at = (i + items.length) % items.length;
    var a = items[at], t = text(a);
    num.textContent = at + 1 + ' / ' + items.length; cap.textContent = t; img.alt = t;
    lb.classList.toggle('fx-lb-1', items.length < 2);
    img.onload = function () { if (!FX.reduced) flip(dir); };
    img.src = a.getAttribute('href');
    [1, -1].forEach(function (s) { new Image().src = items[(at + s + items.length) % items.length].getAttribute('href'); });
  }
  function flip(dir) {
    var r = img.getBoundingClientRect();
    if (dir) { img.animate([{ opacity: 0, transform: 'translateX(' + 36 * dir + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); return; }
    var th = from && from.querySelector('img'), t = th && th.getBoundingClientRect();
    if (!t || !t.width || !r.width) { img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); return; }
    img.animate([{ opacity: .3, transform: 'translate(' + (t.left + t.width / 2 - r.left - r.width / 2) + 'px,' + (t.top + t.height / 2 - r.top - r.height / 2) + 'px) scale(' + t.width / r.width + ')' },
      { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  function go(n) { if (items.length > 1) show(at + n, n); }
  function open(a) {
    if (!lb) build();
    from = a;
    var root = a.parentElement;
    while (root && root !== d.body && root.querySelectorAll('a[data-lb]').length < 2) root = root.parentElement;
    items = FX.$$('a[data-lb]', root || d).filter(function (x) { return x === a || (x.getAttribute('href') && x.getClientRects().length); });
    lb.classList.add('open');
    if (!FX.reduced) lb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    show(items.indexOf(a), 0);
    B.x.focus();
  }
  function close() {
    lb.classList.remove('open'); img.removeAttribute('src');
    if (from && from.isConnected) from.focus({ preventScroll: true });
  }
  function key(e) {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      var f = [B.x, B.p, B.n].filter(function (b) { return b.offsetParent; }), i = f.indexOf(d.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lb]');
    if (!a || !a.getAttribute('href')) return;
    e.preventDefault(); e.stopImmediatePropagation(); open(a);
  }, true);
});

/* fx nav-stagger */
/* nav-stagger: when the mobile menu opens (core.js toggles body.nav-open), the links inside the drawer rise in one after another
   (40ms apart). The drawer is the toggle's aria-controls target, else the header links that were not visible before opening.
   WAAPI with a backwards fill: links wait invisible during their delay, and always end (or are cancelled) fully visible.
   Off with reduced motion. opt: {gap: 40} */
FX.def('nav-stagger', function (c) {
  if (FX.reduced) return;
  var d = document, gap = c.opt.gap == null ? 40 : +c.opt.gap, was = [];
  function vis() { return FX.$$('header a, nav a').filter(function (a) { return a.offsetParent !== null; }); }
  was = vis();
  function links() {
    var t = d.querySelector('[data-nav-toggle][aria-controls]'), dr = t && d.getElementById(t.getAttribute('aria-controls'));
    var l = dr ? FX.$$('a', dr) : vis().filter(function (a) { return was.indexOf(a) < 0; });
    return l.filter(function (a) { return a.offsetParent !== null; });
  }
  new MutationObserver(function () {
    if (!d.body.classList.contains('nav-open')) { was = vis(); return; }
    links().forEach(function (a, i) {
      a.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 420, delay: 60 + i * gap, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
    });
  }).observe(d.body, { attributes: true, attributeFilter: ['class'] });
});
