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

/* fx timeline-draw */
/* timeline-draw: process / steps lists get a vertical line through the step numbers that draws as you scroll (scroll-driven CSS where
   supported, otherwise it grows step by step as each step is reached); each number gives a small pop when reached.
   Works for numbers that are a child element or a ::before/::after counter. The list keeps its layout and markup.
   Lists that already have a background image are skipped. Reduced motion: the full line, no pop. */
FX.def('timeline-draw', function (c) {
  var css = !FX.reduced && window.CSS && CSS.supports('animation-timeline: view()') && CSS.supports('animation-range: 0% 100%');
  c.els('ol[class*=step], ol[class*=process], [class*=process] ol, [class*=steps]').forEach(function (ol) {
    var li = [].slice.call(ol.children).filter(function (k) { return k.offsetHeight > 0; });
    if (li.length < 2 || getComputedStyle(ol).backgroundImage !== 'none') return;
    var mk = [];
    function measure() {
      var o = ol.getBoundingClientRect(), bl = parseFloat(getComputedStyle(ol).borderLeftWidth) || 0, bt = parseFloat(getComputedStyle(ol).borderTopWidth) || 0;
      mk = li.map(function (k) {
        var s = getComputedStyle(k), tr = new DOMMatrix(s.transform), r = k.getBoundingClientRect(), x, y, w, ps = '';
        var first = k.firstElementChild, fs = first && first.getBoundingClientRect();
        var b = getComputedStyle(k, '::before'), a = getComputedStyle(k, '::after');
        var pe = b.content !== 'none' && b.content !== 'normal' ? '::before' : (a.content !== 'none' && a.content !== 'normal' && a.position !== 'absolute' ? '::after' : '');
        var left = r.left - tr.m41 - o.left - bl, top = r.top - tr.m42 - o.top - bt;
        if (first && fs.width <= 90 && fs.height <= 90 && !/^(P|H\d|DIV)$/.test(first.tagName)) { x = fs.left - o.left - bl + fs.width / 2; y = fs.top - o.top - bt + fs.height / 2; }
        else if (pe) {
          var q = pe === '::before' ? b : a, W = parseFloat(q.width) || 24, H = parseFloat(q.height) || 24;
          if (q.position === 'absolute') { x = left + (parseFloat(q.left) || 0) + W / 2 - (q.left === 'auto' ? W / 2 : 0); y = top + (parseFloat(q.top) || 0) + H / 2; }
          else { x = left + (parseFloat(s.paddingLeft) || 0) + W / 2; y = top + (parseFloat(s.paddingTop) || 0) + H / 2; }
          ps = pe;
        } else { x = left + 14; y = top + 14; }
        return { x: x, y: y, el: ps ? k : (first && fs.width <= 90 && !/^(P|H\d|DIV)$/.test(first.tagName) ? first : null), pe: ps };
      });
      var y0 = mk[0].y, y1 = mk[mk.length - 1].y;
      ol.style.setProperty('--fx-x', (mk[0].x - 1).toFixed(1) + 'px'); ol.style.setProperty('--fx-y', y0.toFixed(1) + 'px'); ol.style.setProperty('--fx-h', Math.max(0, y1 - y0).toFixed(1) + 'px');
    }
    measure();
    ol.setAttribute('data-fx-td', '');
    if (window.ResizeObserver) new ResizeObserver(measure).observe(ol);
    if (FX.reduced) return;
    if (css) ol.classList.add('fx-td-css');
    else { ol.classList.add('fx-td-io'); ol.style.setProperty('--fx-p', 0); }
    li.forEach(function (k, i) {
      FX.seen([k], function () {
        var m = mk[i], h1 = mk[mk.length - 1].y - mk[0].y;
        if (!css) ol.style.setProperty('--fx-p', h1 > 0 ? Math.max(0, (m.y - mk[0].y) / h1).toFixed(3) : 1);
        if (Element.prototype.animate && m.el) m.el.animate([{ transform: 'scale(.82)' }, { transform: 'scale(1.18)', offset: .55 }, { transform: 'scale(1)' }],
          { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)', pseudoElement: m.pe || undefined });
      }, '0px 0px -38% 0px');
    });
  });
});

/* fx hours-toast */
/* hours-toast: once per browser session, 3.5s after load, a small toast says whether the business is open ("Open now · until 6 PM") or
   when it opens next ("Closed now · opens 8 AM tomorrow"), from the first [data-hours] JSON (same format core.js reads:
   [[dayIndex 0=Sun, "HH:MM", "HH:MM"], ...]). Nothing when the hours are empty. role=status, close button, hides itself after 7s.
   opt: {open: "Open now · until {t}", closed: "Closed now · opens {t}", delay: 3500, ms: 7000} */
FX.def('hours-toast', function (c) {
  var d = document, o = c.opt, el = d.querySelector('[data-hours]'), H;
  try { if (sessionStorage.getItem('fx-hours-toast')) return; } catch (e) {}
  try { H = JSON.parse(el && el.getAttribute('data-hours')); } catch (e) { return; }
  if (!H || !H.length) return;
  var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function mins(s) { var a = s.split(':'); return +a[0] * 60 + +a[1]; }
  function fmt(s) {
    var m = mins(s);
    if (m === 0 || m >= 1439) return 'midnight';
    var h = Math.floor(m / 60), r = m % 60;
    return (h % 12 || 12) + (r ? ':' + (r < 10 ? '0' : '') + r : '') + (h < 12 ? ' AM' : ' PM');
  }
  function say() {
    var n = new Date(), day = n.getDay(), m = n.getHours() * 60 + n.getMinutes(), i, rs;
    function on(dd) { return H.filter(function (r) { return r[0] === dd; }).sort(function (a, b) { return mins(a[1]) - mins(b[1]); }); }
    rs = on(day);
    for (i = 0; i < rs.length; i++) if (m >= mins(rs[i][1]) && m < mins(rs[i][2])) return (o.open || 'Open now · until {t}').replace('{t}', fmt(rs[i][2]));
    for (i = 0; i < 8; i++) {
      rs = on((day + i) % 7).filter(function (r) { return i || mins(r[1]) > m; });
      if (rs.length) return (o.closed || 'Closed now · opens {t}').replace('{t}', fmt(rs[0][1]) + (i === 0 ? '' : i === 1 ? ' tomorrow' : ' ' + days[(day + i) % 7]));
    }
    return '';
  }
  var msg = say();
  if (!msg) return;
  setTimeout(function () {
    if (d.querySelector('.fx-ht')) return;
    var t = d.createElement('div'), x = d.createElement('button'), s = d.createElement('span');
    t.className = 'fx-ht' + (d.querySelector('.callbar') ? ' fx-ht-cb' : ''); t.setAttribute('role', 'status');
    s.className = 'fx-ht-t'; s.textContent = msg;
    x.type = 'button'; x.className = 'fx-ht-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    t.appendChild(s); t.appendChild(x); d.body.appendChild(t);
    try { sessionStorage.setItem('fx-hours-toast', '1'); } catch (e) {}
    var ease = { duration: 450, easing: 'cubic-bezier(.2,.7,.2,1)' };
    if (!FX.reduced) t.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], ease);
    var gone = 0, timer;
    function hide() {
      if (gone) return; gone = 1; clearTimeout(timer);
      var a = FX.reduced ? null : t.animate([{ opacity: 1 }, { opacity: 0, transform: 'translateY(10px)' }], { duration: 250, easing: 'ease-in' });
      if (a) a.onfinish = function () { t.remove(); }; else t.remove();
    }
    x.addEventListener('click', hide);
    timer = setTimeout(hide, +o.ms || 7000);
  }, o.delay == null ? 3500 : +o.delay);
});
