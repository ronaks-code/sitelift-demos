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

/* fx bg-topo */
/* bg-topo: topographic contour lines behind the hero: nested, wobbly closed curves around two peaks, drifting very slowly.
   Generated SVG (same lines on every load for a given page), ink at ~10% with every fifth line in the primary colour.
   Static with reduced motion. opt: {seed: number, rings: 9} */
FX.def('bg-topo', function (c) {
  var N = Math.min(14, Math.max(5, +c.opt.rings || 9)), seed = +c.opt.seed || 7;
  for (var i = 0, s = location.pathname; i < s.length; i++) seed = (seed * 31 + s.charCodeAt(i)) % 9973;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  c.els('main > :first-child').slice(0, 1).forEach(function (t) {
    var L = document.createElement('div'), svg = '<svg viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice">';
    L.className = 'fx-topo'; L.setAttribute('aria-hidden', 'true'); L.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    [[880, 250, 1], [190, 520, 0.8]].forEach(function (pk, gi) {
      var w = [rnd() * 6, rnd() * 6, rnd() * 6], a = [0.1 + rnd() * 0.08, 0.06 + rnd() * 0.06, 0.03 + rnd() * 0.04], rot = rnd() * 6, x = [2, 3, 5];
      svg += '<g class="fx-topo-g' + gi + '">';
      for (var k = 1; k <= N; k++) {
        var R = 34 * k * pk[2] + 20, d = '';
        for (var j = 0; j < 72; j++) {
          var th = j / 72 * 6.2832, r = R * (1 + a[0] * Math.sin(2 * th + w[0] + k * 0.22) + a[1] * Math.sin(3 * th + w[1] - k * 0.17) + a[2] * Math.sin(5 * th + w[2] + k * 0.3));
          d += (j ? 'L' : 'M') + (pk[0] + r * Math.cos(th + rot) * 1.25).toFixed(0) + ' ' + (pk[1] + r * Math.sin(th + rot) * 0.8).toFixed(0);
        }
        svg += '<path d="' + d + 'Z"' + (k % 5 === 0 ? ' class="m"' : '') + '/>';
      }
      svg += '</g>';
    });
    L.innerHTML = svg + '</svg>';
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';   // before inserting: no layout shift
    t.style.isolation = 'isolate'; t.insertBefore(L, t.firstChild);
  });
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

/* fx scroll-progress */
/* scroll-progress: 3px bar in --primary at the top of the page showing scroll progress, above sticky headers, click-through.
   Scroll-driven CSS animation where supported; otherwise a passive scroll listener throttled with rAF. No smoothing.
   opt: {height: 3} (px, 2 to 4) */
FX.def('scroll-progress', function (c) {
  var d = document, b = d.createElement('div'), h = Math.max(2, Math.min(4, +c.opt.height || 3));
  b.className = 'fx-sp-bar'; b.setAttribute('aria-hidden', 'true'); b.style.height = h + 'px';
  d.body.appendChild(b);
  if (!FX.reduced && window.CSS && CSS.supports('animation-timeline: scroll()')) { b.classList.add('fx-sp-css'); return; }
  var busy = 0, de = d.documentElement;
  function set() {
    busy = 0;
    var m = de.scrollHeight - innerHeight;
    b.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0) + ')';
  }
  function req() { if (!busy) { busy = 1; requestAnimationFrame(set); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req, { passive: true });
  set();
});
