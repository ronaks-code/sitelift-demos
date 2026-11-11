/* Swatch motion: fan opens on load; before/after slider (works without motion too). */
(function () {
  if (!window.SL) return;
  document.querySelectorAll('[data-ba]').forEach(function (s) {
    var r = s.querySelector('input');
    var set = function () { s.style.setProperty('--x', r.value + '%'); };
    r.addEventListener('input', set); set();
  });
  if (!SL.reduced && document.querySelector('.sw-fan')) document.body.classList.add('js-fan');
})();
