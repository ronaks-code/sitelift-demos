/* Glaze motion: sprinkles fall slowly through the hero, the donut ring turns, sticker cards wobble on hover (CSS). */
(function () {
  if (!window.SL || SL.reduced) return;
  var box = document.querySelector('.gz-conf');
  if (box) for (var i = 0; i < 26; i++) {
    var e = document.createElement('i'); e.style.left = Math.random() * 100 + '%'; e.style.top = '-30px'; e.style.transform = 'rotate(' + Math.random() * 180 + 'deg)'; box.appendChild(e);
    var h = box.offsetHeight + 60;
    e.animate([{ translate: '0 0', rotate: '0deg' }, { translate: (Math.random() * 60 - 30) + 'px ' + h + 'px', rotate: (Math.random() * 360) + 'deg' }], { duration: 9000 + Math.random() * 9000, delay: -Math.random() * 12000, iterations: Infinity, easing: 'linear' });
  }
  var r = document.querySelector('.gz-ring-pic');
  if (r) r.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 60000, iterations: Infinity });
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
