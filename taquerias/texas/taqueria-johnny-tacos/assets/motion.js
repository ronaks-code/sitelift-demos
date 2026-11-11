/* Neon motion: tube-sign flicker. On load the sign stutters on, then every few seconds one tube drops out for a moment. */
(function () {
  if (!window.SL || SL.reduced) return;
  var t = [].slice.call(document.querySelectorAll('.nn-flick'));
  if (!t.length) return;
  var blink = function (el, seq, i) {
    i = i || 0; if (i >= seq.length) { el.classList.remove('off'); return; }
    el.classList.toggle('off', i % 2 === 0); setTimeout(function () { blink(el, seq, i + 1); }, seq[i]);
  };
  t.forEach(function (el, k) { setTimeout(function () { blink(el, [90, 70, 140, 60, 220, 50, 70]); }, 200 + k * 260); });
  setInterval(function () { blink(t[Math.floor(Math.random() * t.length)], [70, 90, 60, 160, 50]); }, 5200);
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
