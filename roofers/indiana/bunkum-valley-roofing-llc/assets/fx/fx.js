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

/* fx count-up */
/* count-up: real numbers (rating, review count, years) count up once when they scroll into view. The element's width is
   locked to its final text first (no layout shift); the final text is exactly what was there (prefix/suffix kept);
   years (1900-2099) and numbers under 2 are left alone. Reduced motion / no JS: the final number, untouched.
   opt: {ms: 1400} */
FX.def('count-up', function (c) {
  if (FX.reduced) return;
  var ms = +c.opt.ms || 1400;
  var els = c.els('[data-count],[class*="stat"] b,[class*="stat"] strong,[class*="stat"] dd,[class*="stat"] [class*="num"]');
  els = els.filter(function (el) { return !el.children.length && /^\D{0,2}\d[\d,]*(\.\d+)?\D{0,8}$/.test(el.textContent.trim()); });
  els.forEach(function (el) {
    var t = el.textContent.trim(), m = t.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
    var end = parseFloat(m[2].replace(/,/g, ''));
    if (!isFinite(end) || end < 2 || (end >= 1900 && end < 2100 && m[2].indexOf('.') < 0)) return;
    var dec = (m[2].split('.')[1] || '').length, comma = m[2].indexOf(',') > -1;
    var fmt = function (v) { var s = v.toFixed(dec); return comma ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s; };
    if (getComputedStyle(el).display === 'inline') el.style.display = 'inline-block';
    el.style.fontVariantNumeric = 'tabular-nums';
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    el.setAttribute('data-fx-final', t);
    FX.seen([el], function () {
      var t0 = performance.now();
      el.setAttribute('aria-label', t);
      (function step(now) {
        var k = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - k, 4);
        el.textContent = k < 1 ? m[1] + fmt(end * e) + m[3] : t;
        if (k < 1) requestAnimationFrame(step); else el.removeAttribute('aria-label');
      })(t0);
    });
  });
});

/* fx review-marquee */
/* review-marquee: a reviews grid (4+ cards) becomes a slow endless marquee of the kit's own cards: fixed card width min(380px,80vw),
   aria-hidden clones, pauses on hover/focus and with a visible pause button (WCAG 2.2.2), faded edges. The conversion is synchronous at
   init so nothing shifts later. Default container: the parent of 3+ blockquote/[class*=review] cards inside a section whose id or
   class mentions review (or testimonial); or set sel to the container itself. Reduced motion: the kit's grid, untouched.
   opt: {speed: 45 (px per second), pause: "Pause reviews", play: "Play reviews"} */
FX.def('review-marquee', function (c) {
  if (FX.reduced) return;
  var d = document, o = c.opt, list = c.els('');
  function has(e, cand) { return cand.indexOf(e) > -1 || cand.some(function (x) { return e.contains(x); }); }
  if (!c.sel) FX.$$('section[id*=review i],section[class*=review i],section[id*=testimonial i],section[class*=testimonial i]').forEach(function (s) {
    var cand = FX.$$('blockquote,[class*=review]', s).filter(function (e) { return !e.querySelector('blockquote,[class*=review]'); }), best = null;
    cand.forEach(function (e) {
      for (var x = e, i = 0; x.parentElement && x.parentElement !== s && i < 3; x = x.parentElement, i++) {
        var p = x.parentElement, n = [].filter.call(p.children, function (k) { return has(k, cand); }).length;
        if (n >= 3 && n === p.children.length && (!best || n > best[1])) best = [p, n];
      }
    });
    if (best) list.push(best[0]);
  });
  list.forEach(function (m) {
    var cards = [].slice.call(m.children);
    if (cards.length < 4 || m.closest('.fx-rm')) return;
    var cs = getComputedStyle(m), gap = parseFloat(cs.columnGap);
    if (!(gap >= 0)) gap = 20;
    var wrap = d.createElement('div'), clip = d.createElement('div'), ctl = d.createElement('div'), btn = d.createElement('button');
    wrap.className = 'fx-rm'; clip.className = 'fx-rm-clip'; ctl.className = 'fx-rm-ctl';
    wrap.style.margin = cs.margin; if (cs.maxWidth !== 'none') wrap.style.maxWidth = cs.maxWidth;
    wrap.style.setProperty('--fx-rm-gap', gap + 'px');
    m.parentNode.insertBefore(wrap, m); wrap.appendChild(clip); clip.appendChild(m); wrap.appendChild(ctl);
    m.classList.add('fx-rm-track');
    cards.forEach(function (k) {
      k.classList.add('in');
      var n = k.cloneNode(true);
      n.setAttribute('aria-hidden', 'true'); n.inert = true;
      FX.$$('[id]', n).forEach(function (e) { e.removeAttribute('id'); });
      n.removeAttribute('id'); n.classList.add('in');
      m.appendChild(n);
    });
    var P = o.pause || 'Pause reviews', Y = o.play || 'Play reviews';
    btn.type = 'button'; btn.className = 'fx-rm-btn'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', P);
    btn.innerHTML = '<i></i><span></span>'; btn.lastChild.textContent = o.pause ? o.pause.split(' ')[0] : 'Pause';
    btn.addEventListener('click', function () {
      var p = wrap.classList.toggle('fx-rm-p');
      btn.setAttribute('aria-pressed', p); btn.setAttribute('aria-label', p ? Y : P); btn.lastChild.textContent = p ? (o.play ? o.play.split(' ')[0] : 'Play') : (o.pause ? o.pause.split(' ')[0] : 'Pause');
    });
    ctl.appendChild(btn);
    function speed() { wrap.style.setProperty('--fx-rm-d', Math.max(20, m.getBoundingClientRect().width / 2 / (+o.speed || 45)).toFixed(1) + 's'); }
    speed();
    if ('ResizeObserver' in window) new ResizeObserver(speed).observe(m); else addEventListener('resize', speed);
    FX.vis(wrap, function (v) { wrap.classList.toggle('fx-rm-off', !v); });
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
