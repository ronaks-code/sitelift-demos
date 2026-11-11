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

/* fx cursor-blend */
/* cursor-blend: one white circle that inverts whatever is under it (mix-blend-mode: difference). Grows over images and
   headings, shrinks over links. Native cursor hidden except in form fields and iframes. Mouse only, off with reduced
   motion. Mark extra grow targets with [data-cursor-grow]. opt: {grow: "extra selector"} */
FX.def('cursor-blend', function (c) {
  if (!FX.fine || FX.reduced) return;
  var d = document, h = d.documentElement, el = d.createElement('div'), x = -99, y = -99, px = x, py = y, busy = 0;
  var G = '[data-cursor-grow],h1,h2,a[data-lb] img' + (c.opt.grow ? ',' + c.opt.grow : '');
  el.className = 'fx-cb'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i></i>';
  d.body.appendChild(el);
  function tick() {
    px += (x - px) * 0.35; py += (y - py) * 0.35;
    el.style.transform = 'translate3d(' + px + 'px,' + py + 'px,0)';
    if (Math.abs(x - px) + Math.abs(y - py) > 0.2) requestAnimationFrame(tick); else busy = 0;
  }
  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    if (!el.classList.contains('on')) { px = x; py = y; el.classList.add('on'); h.classList.add('fx-cb-on'); }
    if (!busy) { busy = 1; requestAnimationFrame(tick); }
  }, { passive: true });
  d.addEventListener('mouseout', function (e) { if (!e.relatedTarget) el.classList.remove('on'); });
  d.addEventListener('pointerdown', function () { el.classList.add('down'); }, { passive: true });
  d.addEventListener('pointerup', function () { el.classList.remove('down'); }, { passive: true });
  d.addEventListener('pointerover', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    if (!t || !t.closest) return;
    var field = t.closest('input,textarea,select,[contenteditable],iframe');
    el.classList.toggle('is-field', !!field);
    el.classList.toggle('is-grow', !field && !!t.closest(G));
    el.classList.toggle('is-link', !field && !t.closest(G) && !!t.closest('a,button,[role=button],label,summary'));
  }, { passive: true });
});

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

/* fx duotone */
/* duotone: gallery images are shown in the brand's two tones (dark from --dark, light from --primary eased toward the page light)
   through an inline SVG filter, and ease back to full colour on hover/focus (mouse) or while centred in the view (touch).
   One filter per image so each fades on its own; one shared rAF loop that sleeps when idle. Skips placeholders and logos.
   Reduced motion: same states, switched instantly. opt: {mix: 0.5} (how far the light tone moves toward the page light) */
FX.def('duotone', function (c) {
  var d = document, ns = 'http://www.w3.org/2000/svg';
  function rgb(v) { return (String(FX.color(v)).match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number); }
  function lum(a) { return (.2126 * a[0] + .7152 * a[1] + .0722 * a[2]) / 255; }
  var dark = rgb('--dark'), ink = rgb('--ink'), pri = rgb('--primary'), bg = rgb('--bg'), od = rgb('--on-dark');
  var top = lum(bg) > lum(od) ? bg : od, k = c.opt.mix == null ? .5 : +c.opt.mix, lite;
  function mix(a, b, t) { return a.map(function (v, i) { return v + (b[i] - v) * t; }); }
  lite = mix(pri, top, k);
  while (lum(lite) < .55 && k < 1) { k += .1; lite = mix(pri, top, k); }
  if (lum(dark) > lum(lite) * .6) dark = lum(ink) < lum(dark) ? ink : mix(dark, [0, 0, 0], .6);
  var imgs = c.els('a[data-lb] img').filter(function (i) { return !i.closest('.ph,[class*=logo]') && !/logo/i.test(i.src); });
  if (!imgs.length) return;
  var svg = d.createElementNS(ns, 'svg'), f = function (a) { return a.map(function (v) { return (v / 255).toFixed(3); }); };
  svg.setAttribute('width', 0); svg.setAttribute('height', 0); svg.setAttribute('aria-hidden', 'true'); svg.style.cssText = 'position:absolute;pointer-events:none';
  var D = f(dark), Lt = f(lite), st = [], run = 0;
  var fn = function (ch, i) { return '<feFunc' + ch + ' type="table" tableValues="' + D[i] + ' ' + Lt[i] + '"/>'; };
  svg.innerHTML = imgs.map(function (_, n) {
    return '<filter id="fx-duo-' + n + '" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">' +
      '<feColorMatrix type="matrix" values=".2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 .2126 .7152 .0722 0 0 0 0 0 1 0"/>' +
      '<feComponentTransfer result="d">' + fn('R', 0) + fn('G', 1) + fn('B', 2) + '</feComponentTransfer>' +
      '<feComposite in="d" in2="SourceGraphic" operator="arithmetic" k1="0" k2="1" k3="0" k4="0"/></filter>';
  }).join('');
  d.body.appendChild(svg);
  var mixers = svg.querySelectorAll('feComposite');
  function paint(s) { s.m.setAttribute('k2', (1 - s.t).toFixed(3)); s.m.setAttribute('k3', s.t.toFixed(3)); }
  function tick() {
    var busy = 0;
    st.forEach(function (s) {
      if (s.t === s.to) return;
      s.t = FX.reduced ? s.to : (s.to > s.t ? Math.min(s.to, s.t + .06) : Math.max(s.to, s.t - .06));
      paint(s); if (s.t !== s.to) busy = 1;
    });
    run = busy ? requestAnimationFrame(tick) : 0;
  }
  function aim(s, to) { s.to = to; if (!run) run = requestAnimationFrame(tick); }
  var io = !FX.fine && 'IntersectionObserver' in window && new IntersectionObserver(function (es) {
    es.forEach(function (e) { aim(e.target.__fxd, e.isIntersecting ? 1 : 0); });
  }, { rootMargin: '-44% 0px -44% 0px' });
  imgs.forEach(function (img, n) {
    var s = { m: mixers[n], t: 0, to: 0 }; st.push(s); img.__fxd = s; img.style.filter = 'url(#fx-duo-' + n + ')';
    if (io) { io.observe(img); return; }
    var host = img.closest('a') || img;
    ['mouseenter', 'focusin'].forEach(function (ev) { host.addEventListener(ev, function () { aim(s, 1); }); });
    ['mouseleave', 'focusout'].forEach(function (ev) { host.addEventListener(ev, function () { aim(s, 0); }); });
  });
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
