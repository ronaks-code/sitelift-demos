/* Reveal motion: the nav gains a hairline shadow on scroll; hovering or focusing one photo of a look lifts its partner. */
(function () {
  if (!window.SL || SL.reduced) return;
  var nav = document.querySelector('[data-rl-nav]');
  if (nav) {
    var on = function () { nav.classList.toggle('rl-stuck', window.scrollY > 8); };
    window.addEventListener('scroll', on, { passive: true }); on();
  }
  var g = document.querySelector('.rl-looks');
  if (!g) return;
  var partner = function (f) { return f.classList.contains('rl-g-b') ? f.nextElementSibling : f.previousElementSibling; };
  var set = function (e, v) {
    var f = e.target.closest && e.target.closest('.rl-g'); if (!f) return;
    var p = partner(f); f.classList.toggle('rl-pair-on', v); if (p) p.classList.toggle('rl-pair-on', v);
  };
  g.addEventListener('mouseover', function (e) { set(e, true); });
  g.addEventListener('mouseout', function (e) { set(e, false); });
  g.addEventListener('focusin', function (e) { set(e, true); });
  g.addEventListener('focusout', function (e) { set(e, false); });
})();
