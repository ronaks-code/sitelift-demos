/* Smoke motion: embers rise from the bottom of the hero and fade; hero photo slowly pushes in; section rows slide their numbers in. */
(function () {
  if (!window.SL || SL.reduced) return;
  var box = document.querySelector('.sm-embers');
  if (box) for (var i = 0; i < 22; i++) {
    var e = document.createElement('i'), x = Math.random() * 100, dur = 5000 + Math.random() * 6000, dx = (Math.random() * 80 - 40);
    e.style.left = x + '%'; e.style.width = e.style.height = (2 + Math.random() * 4) + 'px'; box.appendChild(e);
    e.animate([{ transform: 'translate(0,0)', opacity: 0 }, { opacity: .95, offset: .15 }, { transform: 'translate(' + dx + 'px,-' + (box.offsetHeight * (0.5 + Math.random() * 0.5)) + 'px)', opacity: 0 }],
      { duration: dur, delay: Math.random() * 6000, iterations: Infinity, easing: 'ease-out' });
  }
  var bg = document.querySelector('.sm-bg>img,.sm-bg>picture>img,.sm-bg>.ph');
  if (bg) bg.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.07)' }], { duration: 18000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
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
