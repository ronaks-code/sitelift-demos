/* Paleta motion: hero popsicles bob up and down out of phase, a soft shine sweeps across the photo popsicle, flavor cards bob (CSS). */
(function () {
  if (!window.SL || SL.reduced) return;
  document.querySelectorAll('.pa-pop').forEach(function (p, i) {
    p.animate([{ transform: 'translateY(0) rotate(-1.2deg)' }, { transform: 'translateY(-14px) rotate(1.2deg)' }], { duration: 2600 + i * 380, delay: -i * 600, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  });
  var pic = document.querySelector('.pa-p3 .pa-pop-pic');
  if (pic) {
    var s = document.createElement('i'); s.style.cssText = 'position:absolute;top:0;bottom:0;left:-40%;width:30%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.45),transparent);transform:skewX(-14deg);pointer-events:none';
    pic.style.position = 'relative'; pic.appendChild(s);
    s.animate([{ left: '-40%' }, { left: '130%' }], { duration: 1800, delay: 1200, iterations: Infinity, easing: 'ease-in-out', endDelay: 3500 });
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
