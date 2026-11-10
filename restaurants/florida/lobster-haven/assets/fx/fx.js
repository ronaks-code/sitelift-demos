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

/* fx img-zoom */
/* img-zoom: finds each image's clipping frame (an ancestor with overflow hidden/clip around just that image); if there is none,
   clips the display:block link around it; if neither is possible the image is left alone. Mouse only, off with reduced motion. */
FX.def('img-zoom', function (c) {
  if (!FX.fine || FX.reduced) return;
  c.els('a[data-lb] img,[class*=gal] img').forEach(function (img) {
    if (img.closest('.ph,[class*=logo]')) return;
    var a = img.closest('a'), fig = img.closest('figure'), f = null, p = img.parentElement, i = 0;
    for (; p && i < 3 && p.querySelectorAll('img').length === 1; p = p.parentElement, i++) {
      if (getComputedStyle(p).overflow !== 'visible') { f = p; break; }
    }
    if (!f) {
      if (a && a.contains(img) && getComputedStyle(a).display === 'block') { a.classList.add('fx-zoom-clip'); f = a; } else return;
    }
    img.classList.add('fx-zoom');
    var host = fig && fig.querySelectorAll('img').length === 1 ? fig : (a && a.contains(img) ? a : f);
    host.classList.add('fx-zoom-host');
    var cap = fig && fig.querySelector('figcaption'); if (cap) cap.classList.add('fx-zoom-cap');
  });
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
