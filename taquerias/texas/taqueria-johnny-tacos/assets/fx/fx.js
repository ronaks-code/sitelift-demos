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

/* fx tilt */
/* tilt: cards lean toward the pointer (max 5deg, perspective 900px) with a soft glare; resets on leave. Mouse only, off with
   reduced motion, never on cards wider than 700px or holding form fields. opt: {max: 5, glare: true} */
FX.def('tilt', function (c) {
  if (!FX.fine || FX.reduced) return;
  var max = +c.opt.max || 5, all = c.els('[class*=card]:not([class*=cards])');
  all.filter(function (e) {
    return !e.querySelector('input,textarea,select') && !all.some(function (o) { return o !== e && o.contains(e); });
  }).forEach(function (el) {
    var g, r, tr = el.style.transition, live = 0;
    if (c.opt.glare !== false) {
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';   // before appending: no layout shift
      g = document.createElement('span'); g.className = 'fx-tilt-g'; g.setAttribute('aria-hidden', 'true'); el.appendChild(g);
    }
    function ease(ms) { el.style.transition = getComputedStyle(el).transition + ', transform ' + ms + 'ms cubic-bezier(.2,.7,.2,1)'; }
    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      r = el.getBoundingClientRect();
      if (r.width > 700) return;
      live = 1; el.style.transition = tr; ease(220); if (g) g.classList.add('on');
    });
    el.addEventListener('pointermove', function (e) {
      if (!live) return;
      var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.transform = 'perspective(900px) rotateX(' + (-y * 2 * max).toFixed(2) + 'deg) rotateY(' + (x * 2 * max).toFixed(2) + 'deg)';
      if (g) { g.style.setProperty('--gx', (x + .5) * 100 + '%'); g.style.setProperty('--gy', (y + .5) * 100 + '%'); }
    });
    el.addEventListener('pointerleave', function () {
      if (!live) return;
      live = 0; el.style.transition = tr; ease(650); el.style.transform = ''; if (g) g.classList.remove('on');
      setTimeout(function () { if (!live) el.style.transition = tr; }, 700);
    });
  });
});

/* fx magnetic */
/* magnetic: buttons lean toward the pointer when it is close (max ~9px, the label a little more) and spring back on leave.
   Uses the independent `translate` property (no clash with a kit's own transform), one rAF loop that sleeps when everything is at rest.
   Mouse only, off with reduced motion. opt: {range: 80, max: 9} */
FX.def('magnetic', function (c) {
  if (!FX.fine || FX.reduced) return;
  var R = +c.opt.range || 80, M = +c.opt.max || 9, run = 0, px = -9e3, py = -9e3;
  // press-style buttons (hard offset shadow, no blur) already move on hover; leaning them too makes them wobble (Vinay 2026-11-09)
  function pressy(e) {
    return getComputedStyle(e).boxShadow.replace(/rgba?\([^)]*\)/g, '').split(',').some(function (sh) {
      var n = (sh.match(/-?[\d.]+px/g) || []).map(parseFloat);   // x y blur spread
      return n.length >= 2 && !(n[2] > 0) && (n[0] || n[1]);
    });
  }
  var it = c.els('.btn').filter(function (e) { return !e.matches('.callbar') && !pressy(e); }).map(function (e) {
    var l = e.querySelector('span');
    if (l && getComputedStyle(l).display === 'inline') l.style.display = 'inline-block';
    return { e: e, l: l, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  });
  if (!it.length) return;
  function tick() {
    var busy = 0;
    it.forEach(function (o) {
      o.vx = (o.vx + (o.tx - o.x) * .14) * .74; o.vy = (o.vy + (o.ty - o.y) * .14) * .74;
      o.x += o.vx; o.y += o.vy;
      if (Math.abs(o.tx - o.x) + Math.abs(o.ty - o.y) + Math.abs(o.vx) + Math.abs(o.vy) < .04) { o.x = o.tx; o.y = o.ty; o.vx = o.vy = 0; } else busy = 1;
      var on = o.x || o.y;
      o.e.style.translate = on ? o.x.toFixed(2) + 'px ' + o.y.toFixed(2) + 'px' : '';
      if (o.l) o.l.style.translate = on ? (o.x * .45).toFixed(2) + 'px ' + (o.y * .45).toFixed(2) + 'px' : '';
    });
    run = busy ? requestAnimationFrame(tick) : 0;
  }
  function aim() {
    it.forEach(function (o) {
      var r = o.e.getBoundingClientRect(), cx = r.left + r.width / 2 - o.x, cy = r.top + r.height / 2 - o.y;
      var dx = px - cx, dy = py - cy;
      var d = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0));
      if (d < R && r.bottom > 0 && r.top < innerHeight) {
        var k = .22 + .2 * (1 - d / R);
        o.tx = Math.max(-M, Math.min(M, dx * k)); o.ty = Math.max(-M, Math.min(M, dy * k));
      } else { o.tx = o.ty = 0; }
    });
    if (!run && !document.hidden) run = requestAnimationFrame(tick);
  }
  addEventListener('pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; aim(); }, { passive: true });
  document.addEventListener('mouseleave', function () { px = py = -9e3; aim(); });
  addEventListener('scroll', function () { if (px > -9e3) aim(); }, { passive: true });
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
