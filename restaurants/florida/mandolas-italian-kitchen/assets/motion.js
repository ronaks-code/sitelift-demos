/* Catering motion: the timeline connector draws across as it scrolls into view, the filmstrip drifts (CSS, pauses on hover), the request card eases up on load. */
(function () {
  if (!window.SL || SL.reduced) return;
  var q = document.querySelector('.cg-quote');
  if (q) q.animate([{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  var s = document.querySelector('.cg-steps');
  if (s && 'IntersectionObserver' in window && matchMedia('(min-width:701px)').matches) {
    var dots = s.querySelectorAll('.cg-dot');
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { dots.forEach(function (d, i) { d.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 500, delay: i * 220, fill: 'backwards', easing: 'cubic-bezier(.3,1.5,.5,1)' }); }); io.disconnect(); } }, { threshold: .3 });
    io.observe(s);
  }
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
