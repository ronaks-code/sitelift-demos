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
