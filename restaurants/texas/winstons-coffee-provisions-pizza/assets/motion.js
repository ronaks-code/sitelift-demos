/* Counter motion: steam curls up from the corner of the sticky photo, and the sticky photo gently scales as you scroll the right column. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.querySelectorAll('.ct-steam i').forEach(function (s, i) {
    s.animate([{ transform: 'translateY(0) scaleX(1)', opacity: 0 }, { opacity: .8, offset: .3 }, { transform: 'translateY(-70px) scaleX(2.2)', opacity: 0 }], { duration: 3200 + i * 500, delay: i * 700, iterations: Infinity, easing: 'ease-out' });
  });
  var p = document.querySelector('.ct-side-pic>img,.ct-side-pic>picture>img,.ct-side-pic>.ph');
  if (p && matchMedia('(min-width:1001px)').matches) addEventListener('scroll', function () { p.style.transform = 'scale(' + (1 + Math.min(scrollY, 1600) / 1600 * 0.1) + ')'; }, { passive: true });
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
