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

/* fx parallax */
/* parallax: photos drift 6 to 10% slower than the page, inside a frame that clips them (a photo is only moved when its frame
   or the frame around it has overflow hidden/clip, or a fixed aspect ratio). Small photos and logos are skipped.
   opt: {amount: 5} (percent of the photo height each way; half on phones) */
FX.def('parallax', function (c) {
  if (FX.reduced) return;
  var amp = (+c.opt.amount || 5) / (FX.small ? 2 : 1), css = window.CSS && CSS.supports('animation-timeline: view()');
  var list = [];
  c.els('main > :first-child img, [data-layer] img').forEach(function (img) {
    var r = img.getBoundingClientRect();
    if (r.width < 160 || r.height < 120 || /logo|icon/i.test(img.className + img.alt + img.src) || img.closest('.ph')) return;
    var p = img.parentElement, ok = 0;
    for (var n = p, i = 0; n && i < 3 && n !== document.body; n = n.parentElement, i++) {
      var s = getComputedStyle(n);
      if (/hidden|clip/.test(s.overflowY) || (i === 0 && s.aspectRatio !== 'auto' && s.display !== 'inline')) { ok = n; break; }
    }
    if (!ok) return;
    if (ok === p && !/hidden|clip/.test(getComputedStyle(p).overflowY)) p.style.overflow = 'clip';
    img.setAttribute('data-fx-px', ''); img.style.setProperty('--fx-px', amp + '%');
    if (css) img.classList.add('fx-px-css'); else list.push({ img: img, box: p });
  });
  if (css || !list.length) return;
  var busy = 0;
  function tick() {
    busy = 0;
    list.forEach(function (o) {
      var r = o.box.getBoundingClientRect(), k = (innerHeight - r.top) / (innerHeight + r.height);
      if (k < -.05 || k > 1.05) return;
      o.img.style.transform = 'translate3d(0,' + ((k - .5) * 2 * amp * o.img.offsetHeight / 100).toFixed(1) + 'px,0) scale(1.12)';
    });
  }
  function req() { if (!busy) { busy = 1; requestAnimationFrame(tick); } }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req, { passive: true }); tick();
});

/* fx mask-reveal */
/* mask-reveal: images in later sections wipe in (clip-path inset, 900ms, from the bottom, or from the left) with a tiny scale settle
   when they enter the view. Images already visible at load, tiny images (< 120px) and logos are never hidden.
   opt: {dir: "up" | "left"}. Reduced motion: images are shown as they are. */
FX.def('mask-reveal', function (c) {
  if (FX.reduced || !Element.prototype.animate) return;
  var dir = c.opt.dir === 'left' ? 'left' : 'up', hide = dir === 'left' ? 'inset(0 100% 0 0)' : 'inset(100% 0 0 0)';
  var imgs = c.els('main section:not(:first-child) img').filter(function (i) {
    var r = i.getBoundingClientRect();
    return r.width >= 120 && r.height >= 120 && r.top > innerHeight && !/logo|icon/i.test(i.className + i.alt + i.src) && !i.closest('.ph');
  });
  imgs.forEach(function (i) { i.setAttribute('data-fx-mr', dir); });
  FX.seen(imgs, function (i) {
    var p = i.parentElement, clipped = 0;
    for (var n = p, k = 0; n && k < 3 && n !== document.body; n = n.parentElement, k++) if (/hidden|clip/.test(getComputedStyle(n).overflowY)) { clipped = 1; break; }
    i.removeAttribute('data-fx-mr');
    i.animate([{ clipPath: hide, transform: 'scale(' + (clipped ? 1.06 : 1) + ')' }, { clipPath: 'inset(0 0 0 0)', transform: 'scale(1)' }],
      { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }, '0px 0px -6% 0px');
});

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
