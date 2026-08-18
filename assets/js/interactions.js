/* ============================================================
   INTERACTIONS — experiências de mouse (ver interacoes/mouse.md)
   ------------------------------------------------------------
   TILT (data-tilt)  — card inclina 3D conforme o cursor (máx 4-6°)
   MAGNETIC (data-magnetic) — botão "atraído" pelo cursor
   Só desktop (pointer: fine + hover), desativado em
   prefers-reduced-motion. NUNCA essencial para acessar conteúdo.
   ============================================================ */
(function () {
  "use strict";

  var canHover = window.matchMedia("(hover: hover)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;
  var isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!canHover || !finePointer || isReduced) return;

  document.documentElement.classList.add("tilt");

  /* ----------------------------------------------------------
     TILT
     ---------------------------------------------------------- */
  var MAX_TILT = 5;

  document.querySelectorAll("[data-tilt]").forEach(function (card) {
    card.addEventListener("pointermove", function (e) {
      var rect = card.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width - 0.5;
      var py = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform =
        "perspective(800px) rotateX(" + (-py * MAX_TILT).toFixed(2) + "deg) rotateY(" + (px * MAX_TILT).toFixed(2) + "deg)";
    });

    card.addEventListener("pointerleave", function () {
      card.style.transform = "";
    });
  });

  /* ----------------------------------------------------------
     MAGNETIC BUTTON
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
    var strength = 0.25;
    btn.addEventListener("pointermove", function (e) {
      var rect = btn.getBoundingClientRect();
      var dx = e.clientX - (rect.left + rect.width / 2);
      var dy = e.clientY - (rect.top + rect.height / 2);
      btn.style.transform = "translate(" + (dx * strength).toFixed(1) + "px," + (dy * strength).toFixed(1) + "px)";
    });

    btn.addEventListener("pointerleave", function () {
      btn.style.transform = "";
    });
  });
})();
