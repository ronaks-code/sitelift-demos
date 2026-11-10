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
