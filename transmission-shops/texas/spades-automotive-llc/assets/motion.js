/* Route motion: van drives the map route, pins pulse, route dashes crawl. Under reduced motion the van is parked at the destination. */
(function () {
  if (!window.SL) return;
  var van = document.querySelector('[data-van]');
  if (SL.reduced) {
    if (van) { var am = van.querySelector('animateMotion'); if (am) am.remove(); van.setAttribute('transform', 'translate(500 100)'); }
    return;
  }
  document.body.classList.add('js-rt');
})();
