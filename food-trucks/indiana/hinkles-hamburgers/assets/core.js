/* SiteLift kit core (no libraries): reveal on scroll, mobile nav, gallery filter + lightbox, form -> text/email, open-now badge.
   Kit motion.js files add their own effects and must check window.SL.reduced first. */
(function () {
  var d = document, reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  d.documentElement.classList.remove('no-js');
  window.SL = { reduced: reduced };

  // reveal
  var rv = d.querySelectorAll('.rv');
  if (reduced || !('IntersectionObserver' in window)) rv.forEach(function (e) { e.classList.add('in'); });
  else {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(function (e) { io.observe(e); });
  }

  // mobile nav: any [data-nav-toggle] toggles .nav-open on <body>
  d.querySelectorAll('[data-nav-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var open = d.body.classList.toggle('nav-open');
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') d.body.classList.remove('nav-open'); });

  // scrolled state for sticky/transparent navs
  var onS = function () { d.body.classList.toggle('scrolled', scrollY > 40); };
  addEventListener('scroll', onS, { passive: true }); onS();

  // gallery filter
  d.querySelectorAll('[data-filter]').forEach(function (bar) {
    var scope = d.querySelector(bar.getAttribute('data-filter'));
    bar.querySelectorAll('[data-f]').forEach(function (c) {
      c.addEventListener('click', function () {
        var f = c.getAttribute('data-f');
        bar.querySelectorAll('[data-f]').forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
        scope.querySelectorAll('[data-cat]').forEach(function (it) { it.classList.toggle('hide', f !== 'all' && it.getAttribute('data-cat') !== f); });
      });
    });
  });

  // lightbox: any a[data-lb] with an href to an image
  var lb;
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-lb]');
    if (!a || !a.getAttribute('href')) return;
    e.preventDefault();
    if (!lb) {
      lb = d.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
      lb.innerHTML = '<img alt=""><p></p><button type="button" aria-label="Close">×</button>';
      d.body.appendChild(lb);
      lb.addEventListener('click', function (ev) { if (ev.target === lb || ev.target.tagName === 'BUTTON') lb.classList.remove('open'); });
      d.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') lb.classList.remove('open'); });
    }
    lb.querySelector('img').src = a.getAttribute('href');
    lb.querySelector('img').alt = a.getAttribute('data-cap') || '';
    lb.querySelector('p').textContent = a.getAttribute('data-cap') || '';
    lb.classList.add('open'); lb.querySelector('button').focus();
  });

  // contact form: no backend on a mockup, so it opens a text message (phones) or email with the details filled in.
  // Unchecked radios/checkboxes and buttons are skipped; a text/email link can't carry files, so chosen photos become a
  // note in the message and on the page ("add your photos when you reply").
  // data-phone may be a tel:/sms: href or a formatted number: normalise it once, before any booking frame's own handler reads it
  d.querySelectorAll('form[data-phone]').forEach(function (f) {
    f.setAttribute('data-phone', (f.getAttribute('data-phone') || '').replace(/^(?:tel|sms):/i, '').replace(/[^\d+]/g, ''));
  });
  d.querySelectorAll('form[data-send]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var lines = [], photos = 0;
      f.querySelectorAll('input,select,textarea').forEach(function (i) {
        if (i.disabled || i.type === 'submit' || i.type === 'button' || i.type === 'reset') return;
        if ((i.type === 'radio' || i.type === 'checkbox') && !i.checked) return;
        if (i.type === 'file') { photos += i.files ? i.files.length : 0; return; }
        if (i.value && i.name) lines.push(i.name + ': ' + i.value);
      });
      if (photos && !lines.some(function (l) { return /^photos?\b/i.test(l); })) lines.push('Photos: ' + photos + ' to send. I\'ll add ' + (photos === 1 ? 'it' : 'them') + ' when you reply.');
      var body = encodeURIComponent(lines.join('\n'));
      var phone = (f.getAttribute('data-phone') || '').replace(/^tel:/i, '').replace(/[^\d+]/g, ''), mail = f.getAttribute('data-email');
      var mobile = /iPhone|Android|iPad/i.test(navigator.userAgent);
      if (phone && (mobile || !mail)) location.href = 'sms:' + phone + (/iPhone|iPad/.test(navigator.userAgent) ? '&' : '?') + 'body=' + body;
      else if (mail) location.href = 'mailto:' + mail + '?subject=' + encodeURIComponent('Website request') + '&body=' + body;
      if (photos) {
        var st = f.querySelector('[data-send-status]');
        if (!st) { st = d.createElement('p'); st.className = 'form-note'; st.setAttribute('data-send-status', ''); st.setAttribute('role', 'status'); f.appendChild(st); }
        st.textContent = 'A text or email link can\'t attach photos, so add your photos when you reply.';
      }
    });
  });

  // open-now: [data-hours] holds JSON [[dayIndex(0=Sun), "HH:MM", "HH:MM"], ...] from business.hours_schema.
  // No schema hours -> "[]": never claim "Closed now"; hide the badge, plus the wrapper/label it leaves behind
  // (an ancestor with [data-hours-wrap], else an ancestor left with no text, or a short label row like <dt>Today</dt>).
  function hideHours(el) {
    el.hidden = true;
    var w = el.closest('[data-hours-wrap]');
    if (w) { w.classList.add('sl-hours-off'); return; }
    for (var p = el.parentElement, i = 0; p && i < 3 && !/^(BODY|MAIN|HEADER|FOOTER|NAV|SECTION|ARTICLE|ASIDE|UL|OL|DL|FORM)$/.test(p.tagName); i++, p = p.parentElement) {
      var txt = (p.innerText || '').trim(), cur = el;
      var kids = [].filter.call(p.children, function (c) { return c !== cur && !c.contains(cur) && c.getAttribute('aria-hidden') !== 'true' && !c.hidden; });
      var label = kids.length === 1 && !kids[0].children.length && (kids[0].compareDocumentPosition(cur) & 4) &&
        txt === (kids[0].innerText || '').trim() && txt.length <= 14 && !/\d/.test(txt);
      if ((txt && !label) || p.querySelector('img,picture,video,iframe,canvas,svg:not([aria-hidden="true"]),a,button,input,select,textarea,.ph')) break;
      p.classList.add('sl-hours-off'); el = p;
    }
  }
  d.querySelectorAll('[data-hours]').forEach(function (el) {
    try {
      var h = JSON.parse(el.getAttribute('data-hours')), n = new Date(), day = n.getDay(), m = n.getHours() * 60 + n.getMinutes(), open = false;
      if (!h || !h.length) { hideHours(el); return; }
      h.forEach(function (r) { if (r[0] === day) { var a = r[1].split(':'), b = r[2].split(':'); if (m >= +a[0] * 60 + +a[1] && m < +b[0] * 60 + +b[1]) open = true; } });
      el.textContent = open ? 'Open now' : 'Closed now';
      el.classList.add(open ? 'is-open' : 'is-closed');
    } catch (err) { hideHours(el); }
  });
})();
