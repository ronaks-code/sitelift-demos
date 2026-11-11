/* Flour motion: sprinkles drift around the hero photo; the oval floats; the headline lines slide in from opposite sides. */
(function () {
  if (!window.SL || SL.reduced) return;
  var sp = document.querySelector('.fl-sprinkles');
  if (sp) for (var i = 0; i < 16; i++) {
    var e = document.createElement('i'), a = Math.random() * 360;
    e.style.left = (50 + 48 * Math.cos(a * Math.PI / 180)) + '%'; e.style.top = (50 + 48 * Math.sin(a * Math.PI / 180)) + '%';
    e.style.transform = 'rotate(' + (Math.random() * 180) + 'deg)'; sp.appendChild(e);
    e.animate([{ translate: '0 0' }, { translate: (Math.random() * 24 - 12) + 'px ' + (Math.random() * 30 - 15) + 'px' }], { duration: 2800 + Math.random() * 3000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  }
  var o = document.querySelector('.fl-oval-pic');
  if (o) o.animate([{ translate: '0 -6px' }, { translate: '0 8px' }], { duration: 4200, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' });
  var l1 = document.querySelector('.fl-l1'), l2 = document.querySelector('.fl-l2');
  var k = { duration: 1000, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' };
  if (l1) l1.animate([{ translate: '-8vw', opacity: 0 }, { translate: '0', opacity: 1 }], k);
  if (l2) l2.animate([{ translate: '8vw', opacity: 0 }, { translate: '0', opacity: 1 }], { ...k, delay: 150 });
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
