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

/* fx scroll-progress */
/* scroll-progress: 3px bar in --primary at the top of the page showing scroll progress, above sticky headers, click-through.
   Scroll-driven CSS animation where supported; otherwise a passive scroll listener throttled with rAF. No smoothing.
   opt: {height: 3} (px, 2 to 4) */
FX.def('scroll-progress', function (c) {
  var d = document, b = d.createElement('div'), h = Math.max(2, Math.min(4, +c.opt.height || 3));
  b.className = 'fx-sp-bar'; b.setAttribute('aria-hidden', 'true'); b.style.height = h + 'px';
  d.body.appendChild(b);
  if (!FX.reduced && window.CSS && CSS.supports('animation-timeline: scroll()')) { b.classList.add('fx-sp-css'); return; }
  var busy = 0, de = d.documentElement;
  function set() {
    busy = 0;
    var m = de.scrollHeight - innerHeight;
    b.style.transform = 'scaleX(' + (m > 0 ? Math.min(1, Math.max(0, scrollY / m)) : 0) + ')';
  }
  function req() { if (!busy) { busy = 1; requestAnimationFrame(set); } }
  addEventListener('scroll', req, { passive: true });
  addEventListener('resize', req, { passive: true });
  set();
});

/* fx before-after */
/* before-after: a [data-ba] stage holding two stacked photos (before, after), or adjacent gallery figures captioned
   "Before"/"After", becomes a drag slider over the first photo's box (native range input: keyboard + screen readers).
   Side-by-side pairs stay static. Reduced motion: no hint sweep. opt: {labels: ["Before", "After"], label} */
FX.def('before-after', function (c) {
  var d = document, L = c.opt.labels || ['Before', 'After'], used = [];
  function txt(f, i) {
    var n = f.querySelector('figcaption'), a = f.querySelector('a[data-cap]');
    return ((n && n.textContent) || (a && a.getAttribute('data-cap')) || i.alt || '').trim();
  }
  function clone(i, cls) {
    var n = i.cloneNode(false); n.className = cls; n.removeAttribute('id'); n.removeAttribute('data-fx-before-after'); n.loading = 'eager'; return n;
  }
  function build(u1, u2, i1, i2) {
    var host = u1.tagName === 'IMG' ? u1.parentElement : u1;
    if (host.querySelector('.fx-ba')) return;
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var box = d.createElement('div'), inp = d.createElement('input'), B = clone(i1, ''), A = clone(i2, 'fx-ba-b');
    box.className = 'fx-ba'; B.alt = '';
    inp.type = 'range'; inp.min = 0; inp.max = 100; inp.step = 2; inp.value = 50; inp.className = 'fx-ba-in';
    inp.setAttribute('aria-label', c.opt.label || 'Before and after comparison');
    box.appendChild(B); box.appendChild(A);
    box.insertAdjacentHTML('beforeend', '<span class="fx-ba-bar"><i></i></span><span class="fx-ba-l fx-ba-l1"></span><span class="fx-ba-l fx-ba-l2"></span>');
    var l1 = box.children[3], l2 = box.children[4];
    l1.textContent = L[0]; l2.textContent = L[1];
    box.appendChild(inp); host.appendChild(box);
    box.style.borderRadius = getComputedStyle(i1).borderRadius;
    function place() {
      var h = host.getBoundingClientRect(), r = i1.getBoundingClientRect();
      box.style.left = r.left - h.left + 'px'; box.style.top = r.top - h.top + 'px'; box.style.width = r.width + 'px'; box.style.height = r.height + 'px';
    }
    function set(v) {
      v = Math.max(0, Math.min(100, v)); box.style.setProperty('--p', v + '%'); inp.value = v;
      l1.style.opacity = v < 14 ? 0 : 1; l2.style.opacity = v > 86 ? 0 : 1;
    }
    place(); set(50);
    if ('ResizeObserver' in window) { var ro = new ResizeObserver(place); ro.observe(host); ro.observe(i1); } else addEventListener('resize', place);
    host.querySelectorAll('a').forEach(function (a) { a.tabIndex = -1; });
    var cap = host.querySelector('figcaption');
    if (cap && /^\s*before/i.test(cap.textContent)) cap.style.visibility = 'hidden';
    if (u2 !== host && u2 !== u1) u2.hidden = true;
    var down = 0, touched = 0;
    function at(e) { var r = box.getBoundingClientRect(); set((e.clientX - r.left) / r.width * 100); }
    box.addEventListener('pointerdown', function (e) {
      if (e.button) return;
      e.preventDefault(); down = touched = 1; box.classList.add('drag');
      try { box.setPointerCapture(e.pointerId); } catch (x) {}
      box.classList.add('m'); inp.focus({ preventScroll: true }); at(e);
    });
    box.addEventListener('pointermove', function (e) { if (down) at(e); });
    function up() { down = 0; box.classList.remove('drag'); }
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    inp.addEventListener('keydown', function () { box.classList.remove('m'); });
    inp.addEventListener('blur', function () { box.classList.remove('m'); });
    inp.addEventListener('input', function () { touched = 1; set(+inp.value); });
    if (!FX.reduced) FX.seen([box], function () {
      var t0 = performance.now();
      (function step(now) {
        if (touched) return;
        var k = Math.min(1, (now - t0) / 1600);
        set(50 - 15 * Math.sin(k * Math.PI));
        if (k < 1) requestAnimationFrame(step);
      })(t0);
    }, '0px 0px -25% 0px');
  }
  c.els('[data-ba]').forEach(function (m) {
    var im = m.querySelectorAll('img');
    if (im.length !== 2) return;
    // stacked stage only (else the after photo shows twice); data-ba="slider" forces it
    var r1 = im[0].getBoundingClientRect(), r2 = im[1].getBoundingClientRect();
    var ov = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left)) * Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
    if (m.getAttribute('data-ba') !== 'slider' && ov < 0.5 * r1.width * r1.height) return;
    var u = [im[0], im[1]].map(function (i) { var n = i; while (n.parentElement && n.parentElement !== m) n = n.parentElement; return n; });
    used.push(u[0], u[1]); build(u[0], u[1], im[0], im[1]);
  });
  FX.$$('figure').forEach(function (f) {
    var n = f.nextElementSibling, i1 = f.querySelector('img'), i2 = n && n.tagName === 'FIGURE' && n.querySelector('img');
    if (!i1 || !i2 || used.indexOf(f) > -1 || f.closest('[data-ba]') || f.querySelector('.fx-ba')) return;
    if (/^\s*before/i.test(txt(f, i1)) && /^\s*after/i.test(txt(n, i2))) { used.push(f, n); build(f, n, i1, i2); }
  });
});

/* fx heading-scrub */
/* heading-scrub: marks the section headings (h2 by default) the CSS animates. Letter-spacing is deliberately not animated (it would
   reflow the text); the heading lifts, fades up and un-clips instead. Browsers without scroll-driven animations: nothing happens. */
FX.def('heading-scrub', function (c) {
  if (FX.reduced || !(window.CSS && CSS.supports('animation-timeline: view()'))) return;
  c.els('main h2').forEach(function (e) { e.setAttribute('data-fx-hs', ''); });
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

/* fx sticky-cta */
/* sticky-cta: floating "Call" + booking/contact pill. Appears once the hero has scrolled away; hides while the footer or the page's own
   booking button is on screen. Labels come from the links' own text (shortened) or opt. Mobile: no-op when the kit has a .callbar.
   opt: {call: "Call", book: "Book now", label: "Quick contact"} */
FX.def('sticky-cta', function (c) {
  var d = document, o = c.opt, tel = d.querySelector('a[href^="tel:"]');
  var book = d.querySelector('a[href*="booking.html"]') || d.querySelector('a[href*="contact.html"]');
  if (!tel && !book) return;
  function short(t, fb) {
    t = (t || '').replace(/[\d()+\-.\s]{7,}/g, ' ').replace(/\s+/g, ' ').trim();
    return t && t.length <= 18 ? t : fb;
  }
  var bar = d.createElement('div'), href = book && book.getAttribute('href');
  bar.className = 'fx-sc' + (d.querySelector('.callbar') ? ' fx-sc-nb' : '');
  bar.setAttribute('role', 'group'); bar.setAttribute('aria-label', o.label || 'Quick contact');
  function add(cls, h, t) { var a = d.createElement('a'); a.className = cls; a.href = h; a.textContent = t; bar.appendChild(a); }
  if (tel) add('fx-sc-call', tel.getAttribute('href'), o.call || short(tel.textContent, 'Call'));
  if (book) add('fx-sc-book', href, o.book || short(book.textContent, /contact/.test(href) ? 'Contact us' : 'Book now'));
  d.body.appendChild(bar);
  var gone = 0, foot = 0, near = 0, hero = d.querySelector('[data-hero]') || d.querySelector('main > :first-child');
  function upd() { bar.classList.toggle('on', !!gone && !foot && !near); }
  function watch(els, fn) {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) { fn(es); upd(); });
    els.forEach(function (e) { io.observe(e); });
  }
  if (hero) watch([hero], function (es) { var e = es[es.length - 1]; gone = !e.isIntersecting && e.boundingClientRect.bottom <= 0; });
  else addEventListener('scroll', function () { gone = scrollY > innerHeight * .6; upd(); }, { passive: true });
  var f = d.querySelector('body > footer') || d.querySelector('footer');
  if (f) watch([f], function (es) { foot = es[es.length - 1].isIntersecting; });
  var tg = FX.$$(book ? 'a[href="' + href + '"]' : 'a[href^="tel:"]').filter(function (a) { return !a.closest('header,nav,.callbar,.fx-sc'); }), seen = [];
  if (tg.length) watch(tg, function (es) {
    es.forEach(function (e) { var i = seen.indexOf(e.target); if (e.isIntersecting && i < 0) seen.push(e.target); else if (!e.isIntersecting && i > -1) seen.splice(i, 1); });
    near = seen.length;
  });
});
