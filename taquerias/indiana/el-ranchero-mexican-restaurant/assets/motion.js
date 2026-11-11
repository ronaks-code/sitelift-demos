/* Comal motion: hero arch rises in with a bounce, the seal spins slowly, the ring behind it turns. */
(function () {
  if (!window.SL || SL.reduced) return;
  var a = document.querySelector('.cm-arch'); if (!a) return;
  a.animate([{ transform: 'translateY(40px) scale(.94)', opacity: 0 }, { transform: 'translateY(-8px) scale(1.01)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.3,.7,.2,1)', fill: 'backwards' });
  var s = a.querySelector('.cm-seal'), r = a.querySelector('.cm-arch-ring');
  if (s) s.animate([{ transform: 'rotate(10deg)' }, { transform: 'rotate(370deg)' }], { duration: 26000, iterations: Infinity });
  if (r) addEventListener('scroll', function () { r.style.transform = 'translateY(' + Math.min(scrollY, 500) * -0.06 + 'px)'; }, { passive: true });
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
