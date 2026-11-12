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
