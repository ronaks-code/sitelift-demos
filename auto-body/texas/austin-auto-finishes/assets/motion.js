/* Showroom motion: letterbox bars open + slow pan on the hero (CSS, gated by js-sw), filmstrip arrows. */
(function () {
  if (!window.SL) return;
  var strip = document.querySelector('[data-strip]');
  if (strip) {
    var box = document.createElement('div'); box.className = 'sw-arrows';
    ['‹', '›'].forEach(function (c, i) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = c; b.setAttribute('aria-label', i ? 'Next photos' : 'Previous photos');
      b.addEventListener('click', function () { strip.scrollBy({ left: (i ? 1 : -1) * strip.clientWidth * 0.7, behavior: SL.reduced ? 'auto' : 'smooth' }); });
      box.appendChild(b);
    });
    strip.parentNode.insertBefore(box, strip.nextSibling);
  }
  if (!SL.reduced) document.body.classList.add('js-sw');
})();
