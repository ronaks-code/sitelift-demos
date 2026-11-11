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

/* fx heading-scrub */
/* heading-scrub: marks the section headings (h2 by default) the CSS animates. Letter-spacing is deliberately not animated (it would
   reflow the text); the heading lifts, fades up and un-clips instead. Browsers without scroll-driven animations: nothing happens. */
FX.def('heading-scrub', function (c) {
  if (FX.reduced || !(window.CSS && CSS.supports('animation-timeline: view()'))) return;
  c.els('main h2').forEach(function (e) { e.setAttribute('data-fx-hs', ''); });
});

/* fx split-reveal */
/* split-reveal: the hero h1 reveals word by word on load (each word slides up from a clipped line box, ~50ms apart).
   Only text nodes are split, so <em>, <br> and spans keep working. The h1 gets aria-label with its text, the pieces are aria-hidden.
   opt: {chars: true} splits letters instead (only for headings of 22 characters or fewer), {step: 50} ms between pieces.
   Failsafe: everything is natural again after the animation or after 2.5s at the latest. Reduced motion: untouched. */
FX.def('split-reveal', function (c) {
  if (FX.reduced || !Element.prototype.animate) return;
  var d = document, h1 = c.els('main > :first-child h1')[0];
  if (!h1 || h1.getAttribute('data-fx-sr')) return;
  var txt = h1.textContent.replace(/\s+/g, ' ').trim(), chars = !!c.opt.chars && txt.length <= 22, units = [];
  function mk(s) {
    var u = d.createElement('span'), i = d.createElement('span');
    u.className = 'fx-sr-u'; u.setAttribute('aria-hidden', 'true'); i.className = 'fx-sr-i'; i.textContent = s; u.appendChild(i); units.push(i); return u;
  }
  (function walk(n) {
    [].slice.call(n.childNodes).forEach(function (k) {
      if (k.nodeType === 1) { if (!/^(BR|SVG|IMG)$/i.test(k.tagName)) walk(k); return; }
      if (k.nodeType !== 3 || !k.nodeValue.trim()) return;
      var f = d.createDocumentFragment();
      k.nodeValue.split(/(\s+)/).forEach(function (w) {
        if (!w) return;
        if (/^\s+$/.test(w)) { f.appendChild(d.createTextNode(w)); return; }
        if (!chars) { var u = mk(w); u.classList.add('fx-sr-w'); f.appendChild(u); return; }
        var g = d.createElement('span'); g.className = 'fx-sr-w'; g.setAttribute('aria-hidden', 'true');
        w.split('').forEach(function (ch) { g.appendChild(mk(ch)); }); f.appendChild(g);
      });
      k.parentNode.replaceChild(f, k);
    });
  })(h1);
  if (!units.length) return;
  h1.setAttribute('aria-label', txt); h1.setAttribute('data-fx-sr', '1'); h1.classList.add('fx-sr-run');
  var step = Math.min(+c.opt.step || (chars ? 30 : 50), 900 / units.length), done = 0;
  function end() { if (!done) { done = 1; h1.classList.remove('fx-sr-run'); units.forEach(function (u) { u.getAnimations().forEach(function (a) { a.cancel(); }); }); } }
  var all = units.map(function (u, i) {
    return u.animate([{ transform: 'translateY(135%)' }, { transform: 'translateY(0)' }],
      { duration: 800, delay: 120 + i * step, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' }).finished;
  });
  Promise.all(all).then(end, end);
  setTimeout(end, 2500);
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
