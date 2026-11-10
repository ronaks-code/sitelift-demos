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

/* fx magnetic */
/* magnetic: buttons lean toward the pointer when it is close (max ~9px, the label a little more) and spring back on leave.
   Uses the independent `translate` property (no clash with a kit's own transform), one rAF loop that sleeps when everything is at rest.
   Mouse only, off with reduced motion. opt: {range: 80, max: 9} */
FX.def('magnetic', function (c) {
  if (!FX.fine || FX.reduced) return;
  var R = +c.opt.range || 80, M = +c.opt.max || 9, run = 0, px = -9e3, py = -9e3;
  // press-style buttons (hard offset shadow, no blur) already move on hover; leaning them too makes them wobble (Vinay 2026-11-09)
  function pressy(e) {
    return getComputedStyle(e).boxShadow.replace(/rgba?\([^)]*\)/g, '').split(',').some(function (sh) {
      var n = (sh.match(/-?[\d.]+px/g) || []).map(parseFloat);   // x y blur spread
      return n.length >= 2 && !(n[2] > 0) && (n[0] || n[1]);
    });
  }
  var it = c.els('.btn').filter(function (e) { return !e.matches('.callbar') && !pressy(e); }).map(function (e) {
    var l = e.querySelector('span');
    if (l && getComputedStyle(l).display === 'inline') l.style.display = 'inline-block';
    return { e: e, l: l, x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  });
  if (!it.length) return;
  function tick() {
    var busy = 0;
    it.forEach(function (o) {
      o.vx = (o.vx + (o.tx - o.x) * .14) * .74; o.vy = (o.vy + (o.ty - o.y) * .14) * .74;
      o.x += o.vx; o.y += o.vy;
      if (Math.abs(o.tx - o.x) + Math.abs(o.ty - o.y) + Math.abs(o.vx) + Math.abs(o.vy) < .04) { o.x = o.tx; o.y = o.ty; o.vx = o.vy = 0; } else busy = 1;
      var on = o.x || o.y;
      o.e.style.translate = on ? o.x.toFixed(2) + 'px ' + o.y.toFixed(2) + 'px' : '';
      if (o.l) o.l.style.translate = on ? (o.x * .45).toFixed(2) + 'px ' + (o.y * .45).toFixed(2) + 'px' : '';
    });
    run = busy ? requestAnimationFrame(tick) : 0;
  }
  function aim() {
    it.forEach(function (o) {
      var r = o.e.getBoundingClientRect(), cx = r.left + r.width / 2 - o.x, cy = r.top + r.height / 2 - o.y;
      var dx = px - cx, dy = py - cy;
      var d = Math.hypot(Math.max(Math.abs(dx) - r.width / 2, 0), Math.max(Math.abs(dy) - r.height / 2, 0));
      if (d < R && r.bottom > 0 && r.top < innerHeight) {
        var k = .22 + .2 * (1 - d / R);
        o.tx = Math.max(-M, Math.min(M, dx * k)); o.ty = Math.max(-M, Math.min(M, dy * k));
      } else { o.tx = o.ty = 0; }
    });
    if (!run && !document.hidden) run = requestAnimationFrame(tick);
  }
  addEventListener('pointermove', function (e) { if (e.pointerType && e.pointerType !== 'mouse') return; px = e.clientX; py = e.clientY; aim(); }, { passive: true });
  document.addEventListener('mouseleave', function () { px = py = -9e3; aim(); });
  addEventListener('scroll', function () { if (px > -9e3) aim(); }, { passive: true });
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

/* fx mask-reveal */
/* mask-reveal: images in later sections wipe in (clip-path inset, 900ms, from the bottom, or from the left) with a tiny scale settle
   when they enter the view. Images already visible at load, tiny images (< 120px) and logos are never hidden.
   opt: {dir: "up" | "left"}. Reduced motion: images are shown as they are. */
FX.def('mask-reveal', function (c) {
  if (FX.reduced || !Element.prototype.animate) return;
  var dir = c.opt.dir === 'left' ? 'left' : 'up', hide = dir === 'left' ? 'inset(0 100% 0 0)' : 'inset(100% 0 0 0)';
  var imgs = c.els('main section:not(:first-child) img').filter(function (i) {
    var r = i.getBoundingClientRect();
    return r.width >= 120 && r.height >= 120 && r.top > innerHeight && !/logo|icon/i.test(i.className + i.alt + i.src) && !i.closest('.ph');
  });
  imgs.forEach(function (i) { i.setAttribute('data-fx-mr', dir); });
  FX.seen(imgs, function (i) {
    var p = i.parentElement, clipped = 0;
    for (var n = p, k = 0; n && k < 3 && n !== document.body; n = n.parentElement, k++) if (/hidden|clip/.test(getComputedStyle(n).overflowY)) { clipped = 1; break; }
    i.removeAttribute('data-fx-mr');
    i.animate([{ clipPath: hide, transform: 'scale(' + (clipped ? 1.06 : 1) + ')' }, { clipPath: 'inset(0 0 0 0)', transform: 'scale(1)' }],
      { duration: 900, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  }, '0px 0px -6% 0px');
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
