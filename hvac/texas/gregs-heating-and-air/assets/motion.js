/* Bug Out: the picker. Without JS the chips are plain links to the service anchors. */
(function () {
  if (!window.SL) return;
  var p = document.querySelector('[data-picker]');
  if (!p) return;
  var ans = p.querySelector('[data-answer]'), chips = p.querySelectorAll('[data-pick]');
  chips.forEach(function (c) {
    c.setAttribute('role', 'button');
    c.addEventListener('click', function (e) {
      e.preventDefault();
      chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
      var items = (c.getAttribute('data-items') || '').replace(/ · $/, '');
      ans.textContent = c.getAttribute('data-desc') + (items ? ' What we do: ' + items + '.' : '');
      ans.classList.add('on');
    });
    c.addEventListener('keydown', function (e) { if (e.key === ' ') { e.preventDefault(); c.click(); } });
  });
})();
