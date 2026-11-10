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
