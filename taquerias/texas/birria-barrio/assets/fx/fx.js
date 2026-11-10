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

/* fx cursor-trail */
/* cursor-trail: the native cursor stays; a short soft trail of small dots (primary fading to accent) follows it, each dot
   chasing the one before and shrinking and fading. One rAF loop that sleeps when the pointer is still. Mouse only, off
   with reduced motion. opt: {glyph: true} uses the site's --glyph character instead of dots, {n: 9} dot count. */
FX.def('cursor-trail', function (c) {
  if (!FX.fine || FX.reduced) return;
  var d = document, n = Math.min(14, Math.max(4, +c.opt.n || 9)), root = d.createElement('div'), dots = [], busy = 0, mx = -99, my = -99;
  root.className = 'fx-ct' + (c.opt.glyph ? ' fx-ct-glyph' : ''); root.setAttribute('aria-hidden', 'true');
  for (var i = 0; i < n; i++) {
    var e = d.createElement('i'), k = i / (n - 1);
    e.style.color = 'color-mix(in srgb, var(--primary) ' + Math.round(100 - k * 100) + '%, var(--accent))';
    root.appendChild(e); dots.push({ e: e, x: -99, y: -99, s: 1 - k * 0.8, o: 0.85 - k * 0.7 });
  }
  d.body.appendChild(root);
  function tick() {
    var px = mx, py = my, moving = 0;
    dots.forEach(function (p, i) {
      var f = 0.36 - i * 0.02;
      p.x += (px - p.x) * f; p.y += (py - p.y) * f;
      if (Math.abs(px - p.x) + Math.abs(py - p.y) > 0.3) moving = 1;
      p.e.style.transform = 'translate3d(' + p.x + 'px,' + p.y + 'px,0) scale(' + p.s + ')';
      px = p.x; py = p.y;
    });
    if (moving) requestAnimationFrame(tick); else busy = 0;
  }
  addEventListener('pointermove', function (e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    mx = e.clientX; my = e.clientY;
    if (!root.classList.contains('on')) { dots.forEach(function (p) { p.x = mx; p.y = my; }); root.classList.add('on'); }
    if (!busy && !d.hidden) { busy = 1; requestAnimationFrame(tick); }
  }, { passive: true });
  d.addEventListener('mouseout', function (e) { if (!e.relatedTarget) root.classList.remove('on'); });
  dots.forEach(function (p) { p.e.style.opacity = p.o; });
});

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

/* fx marquee */
/* marquee: turns a list (the ticker / strip) into an endless marquee. Copies are aria-hidden; speed follows content width
   (default 40px/s); pauses on hover, on focus, and with a small pause button. Skips lists that already animate themselves.
   opt: {speed: 40} (px per second), {reverse: true}, {pause: "Pause scrolling", play: "Play scrolling"}.
   Reduced motion: the list stays as the kit had it (static, wrapping allowed). */
FX.def('marquee', function (c) {
  if (FX.reduced) return;
  var d = document, o = c.opt, speed = +o.speed || 40;
  c.els('ul[class*=ticker], [class*=marquee]:not(html) ul, [data-fx-marquee]').forEach(function (ul) {
    var kids = [].slice.call(ul.children).filter(function (k) { return k.tagName === 'LI'; });
    if (kids.length < 2 || ul.getAttribute('data-fx-mq')) return;
    if ([ul].concat(kids).some(function (e) { return getComputedStyle(e).animationName !== 'none'; })) return;
    var clones = [], btn, w = 0;
    function copy(k) {
      var n = k.cloneNode(true); n.setAttribute('aria-hidden', 'true'); n.removeAttribute('id');
      [].slice.call(n.querySelectorAll('a,button,input,[tabindex]')).forEach(function (x) { x.setAttribute('tabindex', '-1'); });
      return n;
    }
    function build() {
      clones.forEach(function (n) { n.remove(); }); clones = [];
      var pre = copy(kids[kids.length - 1]); ul.insertBefore(pre, kids[0]); clones.push(pre);   // so the first item has a predecessor, like every copy
      ul.setAttribute('data-fx-mq', '');
      var a = kids[0].offsetLeft, set = copy(kids[0]); ul.appendChild(set); clones.push(set);
      for (var i = 1; i < kids.length; i++) { var x = copy(kids[i]); ul.appendChild(x); clones.push(x); }
      var P = set.offsetLeft - a;
      if (P < 20) return;
      var need = Math.ceil(ul.clientWidth / P) + 1, n = 1;
      while (n++ < need) kids.forEach(function (k) { var x = copy(k); ul.appendChild(x); clones.push(x); });
      var pw = a - pre.offsetLeft;
      ul.style.setProperty('--fx-mq-a', -pw + 'px'); ul.style.setProperty('--fx-mq-b', -(pw + P) + 'px');
      ul.style.setProperty('--fx-mq-t', (P / speed).toFixed(1) + 's'); ul.style.setProperty('--fx-mq-dir', o.reverse ? 'reverse' : 'normal');
      w = ul.clientWidth;
    }
    build();
    if (!btn && w) {
      btn = d.createElement('button'); btn.type = 'button'; btn.className = 'fx-mq-btn'; btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('aria-label', o.pause || 'Pause scrolling');
      btn.addEventListener('click', function () {
        var p = btn.getAttribute('aria-pressed') !== 'true';
        btn.setAttribute('aria-pressed', p); btn.setAttribute('aria-label', p ? (o.play || 'Play scrolling') : (o.pause || 'Pause scrolling'));
        ul.toggleAttribute('data-fx-mq-paused', p);
      });
      ul.parentNode.insertBefore(btn, ul.nextSibling);
    }
    function place() { if (btn) { btn.style.left = ul.offsetLeft + ul.offsetWidth - 36 + 'px'; btn.style.top = ul.offsetTop + (ul.offsetHeight - 28) / 2 + 'px'; } }
    place();
    if (window.ResizeObserver) {
      var t; new ResizeObserver(function () { clearTimeout(t); t = setTimeout(function () { if (ul.clientWidth !== w) build(); place(); }, 200); }).observe(ul);
    }
  });
});
