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

/* fx parallax */
/* parallax: photos drift 6 to 10% slower than the page, inside a frame that clips them (a photo is only moved when its frame
   or the frame around it has overflow hidden/clip, or a fixed aspect ratio). Small photos and logos are skipped.
   opt: {amount: 5} (percent of the photo height each way; half on phones) */
FX.def('parallax', function (c) {
  if (FX.reduced) return;
  var amp = (+c.opt.amount || 5) / (FX.small ? 2 : 1), css = window.CSS && CSS.supports('animation-timeline: view()');
  var list = [];
  c.els('main > :first-child img, [data-layer] img').forEach(function (img) {
    var r = img.getBoundingClientRect();
    if (r.width < 160 || r.height < 120 || /logo|icon/i.test(img.className + img.alt + img.src) || img.closest('.ph')) return;
    var p = img.parentElement, ok = 0;
    for (var n = p, i = 0; n && i < 3 && n !== document.body; n = n.parentElement, i++) {
      var s = getComputedStyle(n);
      if (/hidden|clip/.test(s.overflowY) || (i === 0 && s.aspectRatio !== 'auto' && s.display !== 'inline')) { ok = n; break; }
    }
    if (!ok) return;
    if (ok === p && !/hidden|clip/.test(getComputedStyle(p).overflowY)) p.style.overflow = 'clip';
    img.setAttribute('data-fx-px', ''); img.style.setProperty('--fx-px', amp + '%');
    if (css) img.classList.add('fx-px-css'); else list.push({ img: img, box: p });
  });
  if (css || !list.length) return;
  var busy = 0;
  function tick() {
    busy = 0;
    list.forEach(function (o) {
      var r = o.box.getBoundingClientRect(), k = (innerHeight - r.top) / (innerHeight + r.height);
      if (k < -.05 || k > 1.05) return;
      o.img.style.transform = 'translate3d(0,' + ((k - .5) * 2 * amp * o.img.offsetHeight / 100).toFixed(1) + 'px,0) scale(1.12)';
    });
  }
  function req() { if (!busy) { busy = 1; requestAnimationFrame(tick); } }
  addEventListener('scroll', req, { passive: true }); addEventListener('resize', req, { passive: true }); tick();
});

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

/* fx click-burst */
/* click-burst: a click or tap on a button (.btn) or call link (a[href^="tel:"]) throws a small burst of dots (or the site's
   --glyph with opt glyph) in the primary and accent colours from the click point. Fixed overlay, gone after ~600ms, never
   delays or blocks the click. Touch works too. Nothing with reduced motion. opt: {glyph: true, n: 10} */
FX.def('click-burst', function (c) {
  if (FX.reduced) return;
  var d = document, S = c.sel || '.btn, a[href^="tel:"]', N = Math.min(16, Math.max(6, +c.opt.n || (FX.fine ? 11 : 9)));
  d.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest(S) : null;
    if (!t || !t.animate) return;
    var x = e.clientX, y = e.clientY, b = t.getBoundingClientRect();
    if (!e.detail && !x && !y) { x = b.left + b.width / 2; y = b.top + b.height / 2; }   // keyboard activation: from the button centre
    var box = d.createElement('div'); box.className = 'fx-cb2'; box.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < N; i++) {
      var p = d.createElement('i'), a = (i / N) * 6.2832 + Math.random() * 0.6, r = 34 + Math.random() * 46, dx = Math.cos(a) * r, dy = Math.sin(a) * r;
      p.style.cssText = 'left:' + x + 'px;top:' + y + 'px;color:var(--' + (i % 2 ? 'accent' : 'primary') + ');font-size:' + (11 + Math.random() * 6) + 'px';
      if (c.opt.glyph) p.className = 'g'; else p.style.width = p.style.height = (5 + Math.random() * 5) + 'px';
      p.animate([{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
        { transform: 'translate(calc(-50% + ' + dx * 0.8 + 'px),calc(-50% + ' + dy * 0.8 + 'px)) scale(1)', opacity: 1, offset: 0.5 },
        { transform: 'translate(calc(-50% + ' + dx + 'px),calc(-50% + ' + (dy + 22) + 'px)) scale(.4) rotate(' + (Math.random() * 120 - 60) + 'deg)', opacity: 0 }],
        { duration: 520 + Math.random() * 80, easing: 'cubic-bezier(.15,.7,.25,1)', fill: 'forwards' });
      box.appendChild(p);
    }
    d.body.appendChild(box); setTimeout(function () { box.remove(); }, 640);
  }, { passive: true });
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
