/* Airflow motion: nav underline glider, hero season switch. Without JS the switch is hidden and the underline is static. */
(function () {
  if (!window.SL) return;
  var hero = document.querySelector('.af-hero');
  document.querySelectorAll('.af-season button').forEach(function (b) {
    b.addEventListener('click', function () {
      var s = b.getAttribute('data-season');
      hero.setAttribute('data-season', s);
      document.querySelectorAll('.af-season button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
    });
  });
  if (SL.reduced) return;
  var ul = document.querySelector('[data-glide]'), g = ul && ul.querySelector('.af-glide');
  if (!g) return;
  document.body.classList.add('js-glide');
  var cur = ul.querySelector('[aria-current]');
  var move = function (a) { if (!a) { g.style.opacity = 0; return; } g.style.opacity = 1; g.style.width = a.offsetWidth + 'px'; g.style.transform = 'translateX(' + (a.parentNode.offsetLeft) + 'px)'; };
  ul.querySelectorAll('a').forEach(function (a) { a.addEventListener('mouseenter', function () { move(a); }); a.addEventListener('focus', function () { move(a); }); });
  ul.addEventListener('mouseleave', function () { move(cur); });
  move(cur);
})();
