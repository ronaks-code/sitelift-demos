/* Diner motion: bulbs chase around the sign and the checker strip slides (both CSS); the OPEN pill pulses its light, the chrome-ringed photo swings in like a jukebox door. */
(function () {
  if (!window.SL || SL.reduced) return;
  var o = document.querySelector('.dn-open');
  if (o) o.animate([{ boxShadow: '0 5px 0 var(--ink),0 0 0 rgba(255,255,255,0)' }, { boxShadow: '0 5px 0 var(--ink),0 0 26px rgba(255,255,255,.7)' }], { duration: 1400, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  var w = document.querySelector('.dn-window');
  if (w) w.animate([{ transform: 'perspective(700px) rotateY(-70deg)', opacity: 0 }, { transform: 'perspective(700px) rotateY(0)', opacity: 1 }], { duration: 1000, delay: 200, easing: 'cubic-bezier(.3,1.3,.5,1)', fill: 'backwards' });
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
