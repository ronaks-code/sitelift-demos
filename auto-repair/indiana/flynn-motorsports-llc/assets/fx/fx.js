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

/* fx bg-particles */
/* bg-particles: canvas particles behind the hero. opt kind: "dust" (default, slow drifting motes), "sparks" (rising embers in
   the accent colour), "bubbles" (rising translucent circles). Up to 60 particles (25 on small screens), paused off-screen
   and when the tab is hidden; one static frame with reduced motion. opt: {kind, count} */
FX.def('bg-particles', function (c) {
  var kind = ({ sparks: 1, bubbles: 1 })[c.opt.kind] ? c.opt.kind : 'dust';
  c.els('main > :first-child').slice(0, 1).forEach(function (t) {
    var cv = document.createElement('canvas'), g = cv.getContext('2d'), W = 0, H = 0, dpr = 1, ps = [], vis = 1, raf = 0, last = 0;
    if (!g) return;
    cv.className = 'fx-pt'; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';   // before inserting: no layout shift
    t.style.isolation = 'isolate'; t.insertBefore(cv, t.firstChild);
    var cP = FX.color('--primary'), cA = FX.color('--accent'), cI = FX.color('--ink');
    var cols = kind === 'sparks' ? [cA, cA, cP] : kind === 'bubbles' ? [cA, cP] : [cI, cP, cA];
    var R = Math.random;
    function max() { return Math.min(60, +c.opt.count || (FX.small ? 25 : 60)); }
    function make(init) {
      var r = kind === 'bubbles' ? 4 + R() * 12 : kind === 'sparks' ? 1.4 + R() * 2.2 : 1.2 + R() * 2.4;
      var p = { x: R() * W, y: init ? R() * H : kind === 'dust' ? R() * H : H + r + R() * 40, r: r, ph: R() * 6.28, col: cols[(R() * cols.length) | 0],
        a: kind === 'dust' ? 0.4 + R() * 0.45 : 0.5 + R() * 0.4, life: 0 };
      p.vy = kind === 'dust' ? -3 - R() * 6 : kind === 'sparks' ? -(30 + R() * 50) : -(12 + R() * 26);
      p.vx = kind === 'dust' ? (R() - 0.5) * 6 : 0; p.sw = 8 + R() * 20;
      return p;
    }
    function size() {
      var b = t.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, b.width); H = Math.max(1, b.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      while (ps.length < max()) ps.push(make(1));
      ps.length = Math.min(ps.length, max());
    }
    function step(dt) {
      ps.forEach(function (p, i) {
        p.ph += dt * (kind === 'dust' ? 0.4 : 1.4);
        p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.ph) * p.sw * dt * (kind === 'dust' ? 0.3 : 1);
        if (p.y < -20 || p.x < -20 || p.x > W + 20) { ps[i] = make(0); if (kind === 'dust') ps[i].y = H + 10; }
      });
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        var k = kind === 'dust' ? 1 : Math.pow(Math.max(0, Math.min(1, p.y / H)), kind === 'sparks' ? 0.5 : 1), a = p.a * (kind === 'dust' ? 0.6 + 0.4 * Math.sin(p.ph * 2) : k);
        g.beginPath();
        if (kind === 'bubbles') {
          g.arc(p.x, p.y, p.r, 0, 6.283); g.fillStyle = FX.rgba(p.col, a * 0.12); g.fill();
          g.lineWidth = 1.2; g.strokeStyle = FX.rgba(p.col, a * 0.55); g.stroke();
          g.beginPath(); g.arc(p.x, p.y, p.r * 0.62, 3.6, 4.4); g.strokeStyle = FX.rgba(p.col, a * 0.7); g.stroke();
        } else {
          g.arc(p.x, p.y, kind === 'sparks' ? p.r * (0.5 + k * 0.7) : p.r, 0, 6.283);
          g.fillStyle = FX.rgba(p.col, a); g.fill();
          if (kind !== 'bubbles') { g.beginPath(); g.arc(p.x, p.y, p.r * (kind === 'dust' ? 3.5 : 3.4 * k), 0, 6.283); g.fillStyle = FX.rgba(p.col, a * (kind === 'dust' ? 0.1 : 0.28)); g.fill(); }
        }
      });
    }
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      step(Math.min(0.05, (now - last) / 1000)); last = now; draw(); raf = requestAnimationFrame(frame);
    }
    function go() { if (!raf && vis && !document.hidden && !FX.reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    size();
    if (FX.reduced) { for (var i = 0; i < 40; i++) step(0.05); draw(); }
    else { draw(); FX.vis(t, function (v) { vis = v; go(); }); document.addEventListener('visibilitychange', go); }
    if (window.ResizeObserver) new ResizeObserver(function () { size(); if (FX.reduced || !raf) draw(); }).observe(t);
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
