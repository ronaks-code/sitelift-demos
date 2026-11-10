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

/* fx bg-particles */
/* bg-particles: canvas particles behind the hero. opt kind: "dust" (default, slow drifting motes), "sparks" (rising embers in
   the accent colour), "bubbles" (rising translucent circles). Up to 60 particles (25 on small screens), paused off-screen
   and when the tab is hidden; one static frame with reduced motion. opt: {kind, count} */
FX.def('bg-particles', function (c) {
  var kind = ({ sparks: 1, bubbles: 1 })[c.opt.kind] ? c.opt.kind : 'dust';
  c.els('main > :first-child').slice(0, 1).forEach(function (t) {
    var cv = document.createElement('canvas'), g = cv.getContext('2d'), W = 0, H = 0, dpr = 1, ps = [], vis = 1, raf = 0, last = 0;
    if (!g) return;
    cv.className = 'fx-pt'; cv.setAttribute('aria-hidden', 'true'); cv.style.cssText = 'position:absolute;inset:0;pointer-events:none';
    if (getComputedStyle(t).position === 'static') t.style.position = 'relative';   // before inserting: no layout shift
    t.style.isolation = 'isolate'; t.insertBefore(cv, t.firstChild);
    var cP = FX.color('--primary'), cA = FX.color('--accent'), cI = FX.color('--ink');
    var cols = kind === 'sparks' ? [cA, cA, cP] : kind === 'bubbles' ? [cA, cP] : [cI, cP, cA];
    var R = Math.random;
    function max() { return Math.min(60, +c.opt.count || (FX.small ? 25 : 60)); }
    function make(init) {
      var r = kind === 'bubbles' ? 4 + R() * 12 : kind === 'sparks' ? 1.4 + R() * 2.2 : 1.2 + R() * 2.4;
      var p = { x: R() * W, y: init ? R() * H : kind === 'dust' ? R() * H : H + r + R() * 40, r: r, ph: R() * 6.28, col: cols[(R() * cols.length) | 0],
        a: kind === 'dust' ? 0.4 + R() * 0.45 : 0.5 + R() * 0.4, life: 0 };
      p.vy = kind === 'dust' ? -3 - R() * 6 : kind === 'sparks' ? -(30 + R() * 50) : -(12 + R() * 26);
      p.vx = kind === 'dust' ? (R() - 0.5) * 6 : 0; p.sw = 8 + R() * 20;
      return p;
    }
    function size() {
      var b = t.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(1, b.width); H = Math.max(1, b.height);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      while (ps.length < max()) ps.push(make(1));
      ps.length = Math.min(ps.length, max());
    }
    function step(dt) {
      ps.forEach(function (p, i) {
        p.ph += dt * (kind === 'dust' ? 0.4 : 1.4);
        p.y += p.vy * dt; p.x += p.vx * dt + Math.sin(p.ph) * p.sw * dt * (kind === 'dust' ? 0.3 : 1);
        if (p.y < -20 || p.x < -20 || p.x > W + 20) { ps[i] = make(0); if (kind === 'dust') ps[i].y = H + 10; }
      });
    }
    function draw() {
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      ps.forEach(function (p) {
        var k = kind === 'dust' ? 1 : Math.pow(Math.max(0, Math.min(1, p.y / H)), kind === 'sparks' ? 0.5 : 1), a = p.a * (kind === 'dust' ? 0.6 + 0.4 * Math.sin(p.ph * 2) : k);
        g.beginPath();
        if (kind === 'bubbles') {
          g.arc(p.x, p.y, p.r, 0, 6.283); g.fillStyle = FX.rgba(p.col, a * 0.12); g.fill();
          g.lineWidth = 1.2; g.strokeStyle = FX.rgba(p.col, a * 0.55); g.stroke();
          g.beginPath(); g.arc(p.x, p.y, p.r * 0.62, 3.6, 4.4); g.strokeStyle = FX.rgba(p.col, a * 0.7); g.stroke();
        } else {
          g.arc(p.x, p.y, kind === 'sparks' ? p.r * (0.5 + k * 0.7) : p.r, 0, 6.283);
          g.fillStyle = FX.rgba(p.col, a); g.fill();
          if (kind !== 'bubbles') { g.beginPath(); g.arc(p.x, p.y, p.r * (kind === 'dust' ? 3.5 : 3.4 * k), 0, 6.283); g.fillStyle = FX.rgba(p.col, a * (kind === 'dust' ? 0.1 : 0.28)); g.fill(); }
        }
      });
    }
    function frame(now) {
      raf = 0; if (!vis || document.hidden) return;
      step(Math.min(0.05, (now - last) / 1000)); last = now; draw(); raf = requestAnimationFrame(frame);
    }
    function go() { if (!raf && vis && !document.hidden && !FX.reduced) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    size();
    if (FX.reduced) { for (var i = 0; i < 40; i++) step(0.05); draw(); }
    else { draw(); FX.vis(t, function (v) { vis = v; go(); }); document.addEventListener('visibilitychange', go); }
    if (window.ResizeObserver) new ResizeObserver(function () { size(); if (FX.reduced || !raf) draw(); }).observe(t);
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

/* fx typewriter */
/* typewriter: types the hero eyebrow (or any [data-fx-typewriter] element) once, 35 to 55ms per character, with a blinking caret that
   goes away shortly after. The full text is reserved from the start (untyped part transparent) and kept in aria-label plus a
   visually hidden copy, so screen readers and layout never see a partial string. Plain-text elements only.
   Reduced motion: the full text, no caret. opt: {speed: 45} (average ms per character), {delay: 400} */
FX.def('typewriter', function (c) {
  if (FX.reduced) return;
  var d = document, sp = +c.opt.speed || 45, dl = c.opt.delay == null ? 400 : +c.opt.delay;
  c.els('main > :first-child [class*=eyebrow]').forEach(function (el) {
    var t = el.textContent.trim();
    if (!t || el.children.length || el.getAttribute('data-fx-tw')) return;
    el.setAttribute('data-fx-tw', '1'); el.setAttribute('aria-label', t);
    var sr = d.createElement('span'), a = d.createElement('span'), b = d.createElement('span');
    sr.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap'; sr.textContent = t;
    a.className = 'fx-tw-t'; a.setAttribute('aria-hidden', 'true'); b.className = 'fx-tw-r'; b.setAttribute('aria-hidden', 'true'); b.textContent = '\u2060' + t;
    el.textContent = ''; el.appendChild(sr); el.appendChild(a); el.appendChild(b);
    FX.seen([el], function () {
      var i = 0; el.classList.add('fx-tw-live');
      setTimeout(function next() {
        i++; a.textContent = t.slice(0, i) + '\u2060'; b.textContent = '\u2060' + t.slice(i);
        if (i < t.length) setTimeout(next, sp * (.8 + Math.random() * .4));
        else setTimeout(function () { el.classList.remove('fx-tw-live'); }, 1800);
      }, dl);
    }, '0px');
  });
});
