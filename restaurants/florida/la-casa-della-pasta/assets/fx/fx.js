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

/* fx heading-scrub */
/* heading-scrub: marks the section headings (h2 by default) the CSS animates. Letter-spacing is deliberately not animated (it would
   reflow the text); the heading lifts, fades up and un-clips instead. Browsers without scroll-driven animations: nothing happens. */
FX.def('heading-scrub', function (c) {
  if (FX.reduced || !(window.CSS && CSS.supports('animation-timeline: view()'))) return;
  c.els('main h2').forEach(function (e) { e.setAttribute('data-fx-hs', ''); });
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

/* fx highlight-sweep */
/* highlight-sweep: the hero's <em> (or [data-fx-highlight], or any configured element) gets a marker band behind the bottom 40% of
   the text, or a 3px underline, swept in --accent when it scrolls into view. opt: {style: "marker" | "underline"}
   Reduced motion: the finished highlight, static. */
FX.def('highlight-sweep', function (c) {
  var st = c.opt.style === 'underline' ? 'underline' : 'marker';
  c.els('[data-fx-highlight], main > :first-child h1 em').forEach(function (el) {
    // A block/flex <em> (some kits break the emphasised words onto their own line) would paint the band across the whole
    // column: mark an inline wrapper of its contents instead, so the band follows the words.
    if (getComputedStyle(el).display !== 'inline') {
      var w = document.createElement('span'); while (el.firstChild) w.appendChild(el.firstChild); el.appendChild(w); el = w;
    }
    el.setAttribute('data-fx-hl', st);
    if (FX.reduced) { el.classList.add('fx-hl-on'); return; }
    FX.seen([el], function () { setTimeout(function () { el.classList.add('fx-hl-on'); }, 350); }, '0px');
  });
});

/* fx stars-fill */
/* stars-fill: elements whose own text is only stars (default [class*=star], or sel) fill left to right once, when seen.
   The text node is wrapped in a span (inline, same glyphs, aria-hidden left as it was). No reduced-motion animation. opt: {ms: 900} */
FX.def('stars-fill', function (c) {
  if (FX.reduced) return;
  var ms = +c.opt.ms || 900, els = c.els('[class*=star]').filter(function (e) {
    return !e.children.length && /^[\s★☆]+$/.test(e.textContent) && /[★☆]/.test(e.textContent);
  });
  els.forEach(function (el) {
    var s = document.createElement('span');
    s.className = 'fx-stars-in fx-stars-w';
    while (el.firstChild) s.appendChild(el.firstChild);
    el.appendChild(s);
    FX.seen([el], function () {
      s.classList.remove('fx-stars-w');
      s.animate([{ backgroundPosition: '100% 0' }, { backgroundPosition: '0 0' }], { duration: ms, easing: 'cubic-bezier(.45,.05,.2,1)' });
    });
  });
});

/* fx lightbox-plus */
/* lightbox-plus: replaces core's lightbox for a[data-lb] (capture-phase click + stopImmediatePropagation so core never opens).
   Dialog with caption, "3 / 12" counter, prev/next, arrow keys, Escape, swipe, focus trap, focus back on the thumbnail, images grouped by
   their gallery container (items hidden by a filter chip are skipped). Opens by growing from the thumbnail unless motion is reduced.
   opt: {label: "Photo viewer", close: "Close", prev: "Previous photo", next: "Next photo"} */
FX.def('lightbox-plus', function (c) {
  var d = document, o = c.opt, lb, img, cap, num, items = [], at = 0, from = null, B = {};
  function mk(cls, label, t) { var b = d.createElement('button'); b.type = 'button'; b.className = 'fx-lb-b ' + cls; b.setAttribute('aria-label', label); b.textContent = t; return b; }
  function build() {
    lb = d.createElement('div'); lb.className = 'fx-lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', o.label || 'Photo viewer');
    lb.style.background = FX.rgba(FX.color('--dark'), .94);
    var f = d.createElement('figure'); f.className = 'fx-lb-f';
    img = d.createElement('img'); img.className = 'fx-lb-img'; img.alt = '';
    cap = d.createElement('figcaption'); cap.className = 'fx-lb-cap';
    num = d.createElement('div'); num.className = 'fx-lb-n'; num.setAttribute('aria-live', 'polite');
    B.x = mk('fx-lb-x', o.close || 'Close', '×'); B.p = mk('fx-lb-p', o.prev || 'Previous photo', '‹'); B.n = mk('fx-lb-nx', o.next || 'Next photo', '›');
    f.appendChild(img); f.appendChild(cap);
    [f, num, B.x, B.p, B.n].forEach(function (e) { lb.appendChild(e); });
    d.body.appendChild(lb);
    B.x.onclick = close; B.p.onclick = function () { go(-1); }; B.n.onclick = function () { go(1); };
    lb.addEventListener('click', function (e) { if (e.target === lb || e.target === f) close(); });
    var sx = null;
    lb.addEventListener('pointerdown', function (e) { sx = e.target.closest('button') ? null : e.clientX; });
    lb.addEventListener('pointerup', function (e) {
      if (sx !== null && Math.abs(e.clientX - sx) > 50) go(e.clientX < sx ? 1 : -1);
      sx = null;
    });
    d.addEventListener('keydown', key, true);
  }
  function text(a) {
    var fig = a.closest('figure'), fc = fig && fig.querySelector('figcaption'), im = a.querySelector('img');
    return a.getAttribute('data-cap') || (fc && fc.textContent.trim()) || (im && im.alt) || '';
  }
  function show(i, dir) {
    at = (i + items.length) % items.length;
    var a = items[at], t = text(a);
    num.textContent = at + 1 + ' / ' + items.length; cap.textContent = t; img.alt = t;
    lb.classList.toggle('fx-lb-1', items.length < 2);
    img.onload = function () { if (!FX.reduced) flip(dir); };
    img.src = a.getAttribute('href');
    [1, -1].forEach(function (s) { new Image().src = items[(at + s + items.length) % items.length].getAttribute('href'); });
  }
  function flip(dir) {
    var r = img.getBoundingClientRect();
    if (dir) { img.animate([{ opacity: 0, transform: 'translateX(' + 36 * dir + 'px)' }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,.7,.2,1)' }); return; }
    var th = from && from.querySelector('img'), t = th && th.getBoundingClientRect();
    if (!t || !t.width || !r.width) { img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 }); return; }
    img.animate([{ opacity: .3, transform: 'translate(' + (t.left + t.width / 2 - r.left - r.width / 2) + 'px,' + (t.top + t.height / 2 - r.top - r.height / 2) + 'px) scale(' + t.width / r.width + ')' },
      { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.7,.2,1)' });
  }
  function go(n) { if (items.length > 1) show(at + n, n); }
  function open(a) {
    if (!lb) build();
    from = a;
    var root = a.parentElement;
    while (root && root !== d.body && root.querySelectorAll('a[data-lb]').length < 2) root = root.parentElement;
    items = FX.$$('a[data-lb]', root || d).filter(function (x) { return x === a || (x.getAttribute('href') && x.getClientRects().length); });
    lb.classList.add('open');
    if (!FX.reduced) lb.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220 });
    show(items.indexOf(a), 0);
    B.x.focus();
  }
  function close() {
    lb.classList.remove('open'); img.removeAttribute('src');
    if (from && from.isConnected) from.focus({ preventScroll: true });
  }
  function key(e) {
    if (!lb || !lb.classList.contains('open')) return;
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    else if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else if (e.key === 'Tab') {
      var f = [B.x, B.p, B.n].filter(function (b) { return b.offsetParent; }), i = f.indexOf(d.activeElement);
      e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lb]');
    if (!a || !a.getAttribute('href')) return;
    e.preventDefault(); e.stopImmediatePropagation(); open(a);
  }, true);
});
