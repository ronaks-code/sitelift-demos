// Flitch Coffee — tiny vanilla helpers (nav, open-now, reveal, today's hours)
(function () {
  var d = document;
  // mobile nav
  var t = d.querySelector('.navtoggle'), n = d.getElementById('nav');
  if (t && n) {
    t.addEventListener('click', function () {
      var on = n.classList.toggle('on');
      t.setAttribute('aria-expanded', on ? 'true' : 'false');
      t.setAttribute('aria-label', on ? 'Close navigation' : 'Open navigation');
    });
    d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && n.classList.contains('on')) t.click(); });
  }
  // open now (Austin time) — open every day 7am–3pm
  try {
    var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    var get = function (k) { return (parts.find(function (p) { return p.type === k; }) || {}).value; };
    var h = (+get('hour')) % 24, m = +get('minute'), wd = get('weekday');
    var mins = h * 60 + m, open = mins >= 420 && mins < 900;
    var label = open ? 'Open now · til 3pm' : (mins < 420 ? 'Opens 7am today' : 'Opens 7am tomorrow');
    d.querySelectorAll('.status').forEach(function (s) { s.textContent = label; s.classList.toggle('open', open); });
    var row = d.querySelector('.hours tr[data-d="' + wd + '"]');
    if (row) row.classList.add('today');
  } catch (e) {}
  // mobile action bar: slide in once past the hero
  var bar = d.querySelector('.mbar');
  if (bar) {
    var onS = function () { bar.classList.toggle('show', window.scrollY > 360); };
    window.addEventListener('scroll', onS, { passive: true }); onS();
  }
  // reveal on scroll
  var els = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  } else els.forEach(function (e) { e.classList.add('in'); });
})();
