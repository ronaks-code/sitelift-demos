/* Family Garage motion: the hero photo settles in from a slight zoom; on the home page the floating header docks
   (solid, fixed) once the hero has scrolled away. Docking is a state change, so it also runs with reduced motion
   (base.css removes the slide-in animation then). Content never depends on this script. */
(function () {
  if (!window.SL) return;
  var d = document, top = d.querySelector('[data-fg-top]'), hero = d.querySelector('.fg-hero');
  if (!SL.reduced) d.body.classList.add('js-fg');
  if (!top || !hero || !d.body.classList.contains('fg-home')) return;
  var on = false, tick = false;
  function check() {
    tick = false;
    var past = hero.getBoundingClientRect().bottom < 90;
    if (past !== on) { on = past; top.classList.toggle('is-solid', on); }
  }
  addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(check); } }, { passive: true });
  check();
})();
