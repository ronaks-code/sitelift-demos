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
