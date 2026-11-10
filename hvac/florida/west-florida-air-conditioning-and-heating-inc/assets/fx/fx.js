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

/* fx header-hide */
/* header-hide: the site header slides up when you scroll down past 120px and comes back when you scroll up. Never hides while focus
   is inside it or the mobile menu is open (body.nav-open). Only acts on a sticky/fixed header. Reduced motion: same, instant.
   opt: {after: 120} (px scrolled before it may hide) */
FX.def('header-hide', function (c) {
  var d = document, hd = c.els('body > header, header:first-of-type')[0], after = +c.opt.after || 120;
  if (!hd || !/sticky|fixed/.test(getComputedStyle(hd).position)) return;
  hd.classList.add('fx-hh');
  var last = scrollY, busy = 0, off = 0;
  function set(v) { if (v !== off) { off = v; hd.classList.toggle('fx-hh-off', !!v); } }
  function tick() {
    busy = 0;
    var y = Math.max(0, scrollY), dy = y - last;
    if (hd.contains(d.activeElement) || d.body.classList.contains('nav-open') || y <= after) set(0);
    else if (dy > 6) set(1);
    else if (dy < -6) set(0);
    if (Math.abs(dy) > 6 || y <= after) last = y;
  }
  addEventListener('scroll', function () { if (!busy) { busy = 1; requestAnimationFrame(tick); } }, { passive: true });
  hd.addEventListener('focusin', function () { set(0); });
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
