/* Ceramic motion: a soft gloss highlight follows the pointer across photo plates, water beads form on the hero plate, review meters fill segment by segment. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-cm');
  document.querySelectorAll('[data-gloss]').forEach(function (p) {
    var box = p.querySelector('.cm-plate-img');
    p.addEventListener('pointermove', function (e) {
      var r = box.getBoundingClientRect();
      box.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      box.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });
})();
