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

/* fx spotlight */
/* spotlight: a soft light follows the pointer over cards (accent border glow plus a faint inner light) and over dark
   sections (faint light only). One shared overlay moves onto the hovered element; the element also gets --fx-x/--fx-y.
   Mouse only (FX.fine), nothing with reduced motion. opt: {dark: "section[class*=dark]"} for the big-section selector */
FX.def('spotlight', function (c) {
  if (!FX.fine || FX.reduced) return;
  var d = document, cards = c.els('[class*=card], .review, blockquote'), S = c.sel || '[class*=card], .review, blockquote';
  var D = c.opt.dark || 'section[class*=dark]', cur = null, ox = 0, oy = 0, pend = 0, ev;
  var o = d.createElement('div'); o.className = 'fx-sp'; o.setAttribute('aria-hidden', 'true'); o.innerHTML = '<b></b><i></i>';
  d.body.appendChild(o);
  function place() {
    if (!cur) return; var b = cur.getBoundingClientRect();
    o.style.cssText = 'left:' + b.left + 'px;top:' + b.top + 'px;width:' + b.width + 'px;height:' + b.height + 'px;border-radius:' + getComputedStyle(cur).borderRadius;
    o.style.setProperty('--fx-x', ox + 'px'); o.style.setProperty('--fx-y', oy + 'px');
    if (cur) { cur.style.setProperty('--fx-x', ox + 'px'); cur.style.setProperty('--fx-y', oy + 'px'); }
  }
  function frame() {
    pend = 0; if (!cur) return;
    var b = cur.getBoundingClientRect(); ox = ev.clientX - b.left; oy = ev.clientY - b.top; place();
  }
  function off() { if (cur) { cur = null; o.classList.remove('on'); } }
  d.addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    var t = e.target.closest ? e.target : e.target.parentElement, el = t && t.closest ? (t.closest(S) || t.closest(D)) : null;
    if (el && (el === d.body || el === d.documentElement)) el = null;
    if (!el) return off();
    if (el !== cur) { cur = el; var b = el.getBoundingClientRect(); o.classList.toggle('big', b.width > 720 || b.height > 520); o.classList.add('on'); }
    ev = e; if (!pend) { pend = 1; requestAnimationFrame(frame); }
  }, { passive: true });
  d.addEventListener('mouseout', function (e) { if (!e.relatedTarget) off(); });
  addEventListener('scroll', function () { if (cur) place(); }, { passive: true });
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

/* fx typewriter */
/* typewriter: types the hero eyebrow (or any [data-fx-typewriter] element) once, 35 to 55ms per character, with a blinking caret that
   goes away shortly after. The full text is reserved from the start (untyped part transparent) and kept in aria-label plus a
   visually hidden copy, so screen readers and layout never see a partial string. Plain-text elements only.
   Reduced motion: the full text, no caret. opt: {speed: 45} (average ms per character), {delay: 400} */
FX.def('typewriter', function (c) {
  if (FX.reduced) return;
  var d = document, sp = +c.opt.speed || 45, dl = c.opt.delay == null ? 400 : +c.opt.delay;
  c.els('main > :first-child [class*=eyebrow]').forEach(function (el) {
    var t = el.textContent.trim();
    if (!t || el.children.length || el.getAttribute('data-fx-tw')) return;
    el.setAttribute('data-fx-tw', '1'); el.setAttribute('aria-label', t);
    var sr = d.createElement('span'), a = d.createElement('span'), b = d.createElement('span');
    sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; sr.textContent = t;
    a.className = 'fx-tw-t'; a.setAttribute('aria-hidden', 'true'); b.className = 'fx-tw-r'; b.setAttribute('aria-hidden', 'true'); b.textContent = '\u2060' + t;
    el.textContent = ''; el.appendChild(sr); el.appendChild(a); el.appendChild(b);
    FX.seen([el], function () {
      var i = 0; el.classList.add('fx-tw-live');
      setTimeout(function next() {
        i++; a.textContent = t.slice(0, i) + '\u2060'; b.textContent = '\u2060' + t.slice(i);
        if (i < t.length) setTimeout(next, sp * (.8 + Math.random() * .4));
        else setTimeout(function () { el.classList.remove('fx-tw-live'); }, 1800);
      }, dl);
    }, '0px');
  });
});

/* fx sheen */
/* sheen: a diagonal light sweep that crosses the primary buttons every few seconds and on hover (CSS, see sheen.css).
   This script only handles an optional image: opt {hero: "selector"} puts the same sweep over that block (the hero image
   box). Nothing with reduced motion. */
FX.def('sheen', function (c) {
  if (FX.reduced || !c.opt.hero) return;
  FX.$$(c.opt.hero).forEach(function (t) {
    var s = document.createElement('span'); s.className = 'fx-sheen-img'; s.setAttribute('aria-hidden', 'true');
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative'; t.style.overflow = 'hidden'; t.appendChild(s);
  });
});
