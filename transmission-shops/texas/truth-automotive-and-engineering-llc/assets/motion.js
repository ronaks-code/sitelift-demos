/* Marque motion: the rating rolls like an odometer. Falls back to the plain number (no JS / reduced motion). */
(function () {
  if (!window.SL || SL.reduced) return;
  document.querySelectorAll('[data-odo]').forEach(function (el) {
    var txt = el.getAttribute('data-odo'); if (!txt) return;
    el.setAttribute('aria-label', txt); el.textContent = '';
    var strips = [];
    txt.split('').forEach(function (ch) {
      if (!/\d/.test(ch)) { var s = document.createElement('span'); s.className = 'od-c'; s.textContent = ch; s.setAttribute('aria-hidden', 'true'); el.appendChild(s); return; }
      var col = document.createElement('span'), strip = document.createElement('span'), n;
      col.className = 'od-col'; strip.className = 'od-strip'; col.setAttribute('aria-hidden', 'true');
      for (n = 0; n < 10; n++) { var i = document.createElement('i'); i.textContent = n; strip.appendChild(i); }
      strip.style.transform = 'translateY(0)'; strip.dataset.to = ch; col.appendChild(strip); el.appendChild(col); strips.push(strip);
    });
    requestAnimationFrame(function () { requestAnimationFrame(function () { strips.forEach(function (s) { s.style.transform = 'translateY(-' + (+s.dataset.to * 10) + '%)'; }); }); });
  });
})();
