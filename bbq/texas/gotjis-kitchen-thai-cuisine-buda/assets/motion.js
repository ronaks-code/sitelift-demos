/* Truck motion: the awning sways, the OPEN lamp flickers on once at load, and the stop card slides in like a window shutter. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.querySelectorAll('.tk-top .tk-awning').forEach(function (a) {
    a.animate([{ transform: 'skewX(0deg)', transformOrigin: 'top' }, { transform: 'skewX(-1.2deg)', transformOrigin: 'top' }, { transform: 'skewX(0deg)', transformOrigin: 'top' }], { duration: 5200, iterations: Infinity, easing: 'ease-in-out' });
  });
  var l = document.querySelector('[data-lamp]');
  if (l) l.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: .2 }, { opacity: 1 }, { opacity: .6 }, { opacity: 1 }], { duration: 900, delay: 300, fill: 'backwards' });
  var s = document.querySelector('.tk-stop');
  if (s) s.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, delay: 400, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' });
})();

/* Headline fit (not motion, so it also runs with reduced motion): a wide brand font can make one word wider than its box;
   shrink that headline step by step until every word fits. Without JS, kit.css lets the word wrap instead. */
(function () {
  var hs = document.querySelectorAll('main h1');
  if (!hs.length) return;
  document.documentElement.classList.add('js-fit');
  function over(h) { return [h].concat([].slice.call(h.querySelectorAll('*'))).some(function (e) { return e.clientWidth && e.scrollWidth > e.clientWidth + 3; }); }
  function run() {
    hs.forEach(function (h) {
      h.style.fontSize = ''; h.style.overflowWrap = '';
      var s = parseFloat(getComputedStyle(h).fontSize), min = s * 0.5, n = 0;
      while (n++ < 40 && s > min && over(h)) { s *= 0.94; h.style.fontSize = s + 'px'; }
      if (over(h)) h.style.overflowWrap = 'break-word';
    });
  }
  // measure only once entrance animations (slide-ins, reveals) are done: a moving headline is not an overflowing one
  function settle() {
    var as = [];
    hs.forEach(function (h) { if (h.getAnimations) as = as.concat(h.getAnimations({ subtree: true }).filter(function (a) { var tm = a.effect && a.effect.getTiming ? a.effect.getTiming() : null; return tm && tm.iterations !== Infinity; })); });
    return Promise.all(as.map(function (a) { return a.finished.catch(function () {}); }));
  }
  var go = function () { return settle().then(run); };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(go);
  setTimeout(go, 1400);
  var t; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(run, 150); });
})();
