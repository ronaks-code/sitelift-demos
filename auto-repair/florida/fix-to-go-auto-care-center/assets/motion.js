/* Bay Door motion: adds the class that lets the CSS roll the door up and light the windows. Nothing hidden without it. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-door');
})();
