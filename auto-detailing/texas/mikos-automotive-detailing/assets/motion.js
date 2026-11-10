/* Stitch motion: dashed stitch lines "sew" in around cards (CSS clip, driven by the reveal class); scissors travel along the cut line. */
(function () {
  if (!window.SL || SL.reduced) return;
  document.body.classList.add('js-sh');
})();
