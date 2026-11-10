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

/* fx header-hide */
/* header-hide: the site header slides up when you scroll down past 120px and comes back when you scroll up. Never hides while focus
   is inside it or the mobile menu is open (body.nav-open). Only acts on a sticky/fixed header. Reduced motion: same, instant.
   opt: {after: 120} (px scrolled before it may hide) */
FX.def('header-hide', function (c) {
  var d = document, hd = c.els('body > header, header:first-of-type')[0], after = +c.opt.after || 120;
  if (!hd || !/sticky|fixed/.test(getComputedStyle(hd).position)) return;
  hd.classList.add('fx-hh');
  var last = scrollY, busy = 0, off = 0;
  function set(v) { if (v !== off) { off = v; hd.classList.toggle('fx-hh-off', !!v); } }
  function tick() {
    busy = 0;
    var y = Math.max(0, scrollY), dy = y - last;
    if (hd.contains(d.activeElement) || d.body.classList.contains('nav-open') || y <= after) set(0);
    else if (dy > 6) set(1);
    else if (dy < -6) set(0);
    if (Math.abs(dy) > 6 || y <= after) last = y;
  }
  addEventListener('scroll', function () { if (!busy) { busy = 1; requestAnimationFrame(tick); } }, { passive: true });
  hd.addEventListener('focusin', function () { set(0); });
});

/* fx timeline-draw */
/* timeline-draw: process / steps lists get a vertical line through the step numbers that draws as you scroll (scroll-driven CSS where
   supported, otherwise it grows step by step as each step is reached); each number gives a small pop when reached.
   Works for numbers that are a child element or a ::before/::after counter. The list keeps its layout and markup.
   Lists that already have a background image are skipped. Reduced motion: the full line, no pop. */
FX.def('timeline-draw', function (c) {
  var css = !FX.reduced && window.CSS && CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: 0% 100%');
  c.els('ol[class*=step], ol[class*=process], [class*=process] ol, [class*=steps]').forEach(function (ol) {
    var li = [].slice.call(ol.children).filter(function (k) { return k.offsetHeight > 0; });
    if (li.length < 2 || getComputedStyle(ol).backgroundImage !== 'none') return;
    var mk = [];
    function measure() {
      var o = ol.getBoundingClientRect(), bl = parseFloat(getComputedStyle(ol).borderLeftWidth) || 0, bt = parseFloat(getComputedStyle(ol).borderTopWidth) || 0;
      mk = li.map(function (k) {
        var s = getComputedStyle(k), tr = new DOMMatrix(s.transform), r = k.getBoundingClientRect(), x, y, w, ps = '';
        var first = k.firstElementChild, fs = first && first.getBoundingClientRect();
        var b = getComputedStyle(k, '::before'), a = getComputedStyle(k, '::after');
        var pe = b.content !== 'none' && b.content !== 'normal' ? '::before' : (a.content !== 'none' && a.content !== 'normal' && a.position !== 'absolute' ? '::after' : '');
        var left = r.left - tr.m41 - o.left - bl, top = r.top - tr.m42 - o.top - bt;
        if (first && fs.width <= 90 && fs.height <= 90 && !/^(P|H\d|DIV)$/.test(first.tagName)) { x = fs.left - o.left - bl + fs.width / 2; y = fs.top - o.top - bt + fs.height / 2; }
        else if (pe) {
          var q = pe === '::before' ? b : a, W = parseFloat(q.width) || 24, H = parseFloat(q.height) || 24;
          if (q.position === 'absolute') { x = left + (parseFloat(q.left) || 0) + W / 2 - (q.left === 'auto' ? W / 2 : 0); y = top + (parseFloat(q.top) || 0) + H / 2; }
          else { x = left + (parseFloat(s.paddingLeft) || 0) + W / 2; y = top + (parseFloat(s.paddingTop) || 0) + H / 2; }
          ps = pe;
        } else { x = left + 14; y = top + 14; }
        return { x: x, y: y, el: ps ? k : (first && fs.width <= 90 && !/^(P|H\d|DIV)$/.test(first.tagName) ? first : null), pe: ps };
      });
      var y0 = mk[0].y, y1 = mk[mk.length - 1].y;
      ol.style.setProperty('--fx-x', (mk[0].x - 1).toFixed(1) + 'px'); ol.style.setProperty('--fx-y', y0.toFixed(1) + 'px'); ol.style.setProperty('--fx-h', Math.max(0, y1 - y0).toFixed(1) + 'px');
    }
    measure();
    ol.setAttribute('data-fx-td', '');
    if (window.ResizeObserver) new ResizeObserver(measure).observe(ol);
    if (FX.reduced) return;
    if (css) ol.classList.add('fx-td-css');
    else { ol.classList.add('fx-td-io'); ol.style.setProperty('--fx-p', 0); }
    li.forEach(function (k, i) {
      FX.seen([k], function () {
        var m = mk[i], h1 = mk[mk.length - 1].y - mk[0].y;
        if (!css) ol.style.setProperty('--fx-p', h1 > 0 ? Math.max(0, (m.y - mk[0].y) / h1).toFixed(3) : 1);
        if (Element.prototype.animate && m.el) m.el.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.18)', offset: .55 }, { transform: 'scale(1)' }],
          { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: m.pe || undefined });
      }, '0px 0px -38% 0px');
    });
  });
});

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
