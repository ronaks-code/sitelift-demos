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

/* fx section-tint */
/* section-tint: the page ground crossfades between soft section colours as you scroll. Sections opt in with data-fx-tint="--surface"
   (any CSS variable or colour); otherwise the module alternates transparent sections between the page colour and faint washes of
   --primary and --accent. Sections with their own background are never tinted. Skipped if the page ground can't show a layer.
   opt: {amount: 7} (percent of brand colour in the auto washes) */
FX.def('section-tint', function (c) {
  var d = document, h = d.documentElement, a = +c.opt.amount || 7;
  var clear = function (e) { var s = getComputedStyle(e); return (/^rgba\(.*, 0\)$|^transparent$/.test(s.backgroundColor)) && s.backgroundImage === 'none'; };
  if (!clear(h) || !d.querySelector('main')) return;
  var main = d.querySelector('main');
  if (!clear(main)) return;
  var secs = c.els('main > section, main > div, main > article').filter(clear);
  if (secs.length < 2) return;
  var auto = ['var(--bg)', 'color-mix(in srgb,var(--primary) ' + a + '%,var(--bg))', 'var(--bg)', 'color-mix(in srgb,var(--accent) ' + a + '%,var(--bg))'], n = 0;
  var tint = secs.map(function (s) {
    var t = s.getAttribute('data-fx-tint'), v = t ? (t.indexOf('--') === 0 ? 'var(' + t + ')' : t) : auto[n++ % 4];
    return { el: s, c: v };
  });
  var L = d.createElement('div'); L.className = 'fx-st-layer'; L.setAttribute('aria-hidden', 'true'); L.style.cssText = 'position:fixed;inset:0;pointer-events:none';
  d.body.insertBefore(L, d.body.firstChild);
  var cur = '', busy = 0;
  function pick() {
    busy = 0;
    var mid = innerHeight * .5, best = tint[0];
    for (var i = 0; i < tint.length; i++) { var r = tint[i].el.getBoundingClientRect(); if (r.top <= mid) best = tint[i]; if (r.top > mid) break; }
    if (best.c !== cur) { cur = best.c; L.style.backgroundColor = cur; }
  }
  addEventListener('scroll', function () { if (!busy) { busy = 1; requestAnimationFrame(pick); } }, { passive: true });
  addEventListener('resize', pick, { passive: true });
  pick();
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
