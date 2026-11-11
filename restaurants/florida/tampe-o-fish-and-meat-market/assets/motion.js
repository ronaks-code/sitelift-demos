/* Index motion: the index rows draw their rules and slide in one after another on load; a thin marker follows the hovered row; the marquee rolls (CSS). */
(function () {
  if (!window.SL || SL.reduced) return;
  document.querySelectorAll('.ix-rows li').forEach(function (li, i) {
    li.animate([{ clipPath: 'inset(0 100% 0 0)', transform: 'translateX(-16px)' }, { clipPath: 'inset(0 0 0 0)', transform: 'none' }], { duration: 700, delay: 200 + i * 110, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
  });
  var f = document.querySelector('.ix-fig img,.ix-fig .ph');
  if (f) f.animate([{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0)' }], { duration: 1100, delay: 300, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' });
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
