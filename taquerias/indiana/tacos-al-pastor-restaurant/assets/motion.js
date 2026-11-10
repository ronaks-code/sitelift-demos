/* Cottage motion: the hero stamp thumps down once, the polaroid pile sways like it is pinned, and the polaroids straighten on hover (CSS). */
(function () {
  if (!window.SL || SL.reduced) return;
  var s = document.querySelector('.kc-stamp');
  if (s) s.animate([{ transform: 'rotate(14deg) scale(2.4)', opacity: 0 }, { transform: 'rotate(14deg) scale(.92)', opacity: 1, offset: .7 }, { transform: 'rotate(14deg) scale(1)', opacity: 1 }], { duration: 700, delay: 600, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'backwards' });
  var a = document.querySelector('.kc-pile .kc-pol-a'), b = document.querySelector('.kc-pile .kc-pol-b');
  if (a) a.animate([{ transform: 'rotate(-4deg)' }, { transform: 'rotate(-2.6deg) translateY(-4px)' }], { duration: 4200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  if (b) b.animate([{ transform: 'rotate(5deg)' }, { transform: 'rotate(3.4deg) translateY(4px)' }], { duration: 5000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
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
