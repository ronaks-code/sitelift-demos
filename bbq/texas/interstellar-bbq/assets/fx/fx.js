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

/* fx cursor-ring */
/* cursor-ring: a precise dot on the pointer and a soft ring that follows with a little lag. Over links/buttons the ring
   grows; over gallery photos and call links it becomes a labelled pill ("View", "Call"). Mouse only (FX.fine), off with
   reduced motion; text fields keep the native caret. opt: {labels: {view, call, book}, blend: true} */
FX.def('cursor-ring', function (c) {
  if (!FX.fine || FX.reduced) return;
  var d = document, h = d.documentElement, o = c.opt, L = o.labels || {};
  var lab = { view: L.view || 'View', call: L.call || 'Call', book: L.book || '' };
  var el = d.createElement('div');
  el.className = 'fx-cur' + (o.blend ? ' fx-cur-blend' : ''); el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<i class="fx-cur-ring"><b><span></span></b></i><i class="fx-cur-dot"></i>';
  d.body.appendChild(el);
  var ring = el.firstChild, dot = el.lastChild, txt = ring.querySelector('span');
  var x = -100, y = -100, rx = -100, ry = -100, busy = 0;
  h.classList.add('fx-cur-on');
  function tick() {
    rx += (x - rx) * 0.2; ry += (y - ry) * 0.2;
    ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    if (Math.abs(x - rx) + Math.abs(y - ry) > 0.2) requestAnimationFrame(tick); else busy = 0;
  }
  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    dot.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
    if (!el.classList.contains('on')) { rx = x; ry = y; el.classList.add('on'); }
    if (!busy) { busy = 1; requestAnimationFrame(tick); }
  }, { passive: true });
  d.addEventListener('mouseout', function (e) { if (!e.relatedTarget) el.classList.remove('on'); });
  d.addEventListener('pointerdown', function () { el.classList.add('down'); }, { passive: true });
  d.addEventListener('pointerup', function () { el.classList.remove('down'); }, { passive: true });
  d.addEventListener('pointerover', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    if (!t || !t.closest) return;
    var field = t.closest('input,textarea,select,[contenteditable],iframe');
    var cue = t.closest('[data-cursor]');
    var a = t.closest('a,button,[role=button],label,summary,[data-f]');
    var s = '';
    if (cue) s = cue.getAttribute('data-cursor');
    else if (a && a.matches('a[data-lb],[data-lb] a')) s = lab.view;
    else if (a && /^tel:/i.test(a.getAttribute('href') || '')) s = lab.call;
    else if (a && lab.book && /book/i.test(a.getAttribute('href') || '')) s = lab.book;
    el.classList.toggle('is-field', !!field);
    el.classList.toggle('is-link', !!a && !s);
    el.classList.toggle('is-label', !!s);
    if (s) txt.textContent = s;
  }, { passive: true });
});

/* fx hero-zoomout */
/* hero-zoomout: hero photo starts at scale 1.08 and, over the first 70vh of scrolling, eases to 1 while its edges inset 4% with
   rounded corners (the frame's own overflow hides the rest). Default: the largest photo in the first block of <main>.
   Scroll-driven CSS where supported, rAF scroll fallback otherwise. Reduced motion: untouched. */
FX.def('hero-zoomout', function (c) {
  if (FX.reduced) return;
  var els = c.els('main > :first-child img').filter(function (i) { return !i.closest('.ph') && i.getBoundingClientRect().width > 160; });
  if (!c.sel && els.length > 1) {
    var a = function (i) { var r = i.getBoundingClientRect(); return r.width * r.height; };
    els = [els.sort(function (x, y) { return a(y) - a(x); })[0]];
  }
  if (!els.length) return;
  var img = els[0], css = window.CSS && CSS.supports('animation-timeline: scroll()');
  img.classList.add('fx-hz');
  if (css) { img.classList.add('fx-hz-css'); return; }
  var busy = 0, ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  function tick() {
    busy = 0;
    var k = ease(Math.min(1, Math.max(0, scrollY / (innerHeight * .7))));
    img.style.transform = 'scale(' + (1.08 - .08 * k).toFixed(4) + ')';
    img.style.clipPath = 'inset(' + (4 * k).toFixed(2) + '% round calc(var(--radius, 12px) * ' + k.toFixed(3) + '))';
  }
  addEventListener('scroll', function () { if (!busy) { busy = 1; requestAnimationFrame(tick); } }, { passive: true });
  tick();
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
