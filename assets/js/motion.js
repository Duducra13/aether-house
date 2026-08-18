/* ============================================================
   MOTION — reveals no scroll, stagger, parallax, contadores
   Regras: biblioteca/motion/regras.md
   - Reveal uma única vez por elemento.
   - Stagger 40-90ms.
   - Respeita prefers-reduced-motion (nada disso roda).
   - Contadores só com números comprovados (ver biblioteca/conversao).
   ============================================================ */
(function () {
  "use strict";

  var isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ----------------------------------------------------------
     REVEAL + STAGGER (IntersectionObserver)
     ---------------------------------------------------------- */
  function setupReveal() {
    var targets = document.querySelectorAll("[data-reveal]");
    if (!targets.length) return;

    if (isReduced) return; /* permanece visível (técnica progressiva) */

    /* Stagger: preenche --reveal-delay nos filhos de [data-stagger] */
    document.querySelectorAll("[data-stagger]").forEach(function (parent) {
      Array.prototype.forEach.call(parent.children, function (child, i) {
        if (child.matches("[data-reveal]") && !child.style.getPropertyValue("--reveal-delay")) {
          child.style.setProperty("--reveal-delay", i * 70 + "ms");
        }
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     PARALLAX — profundidade sutil (data-parallax-depth)
     Semântica única: [data-parallax-depth="0.1".."0.5"]
     Fallback vanilla (rAF). Se o GSAP estiver ativo (html.gsap),
     o motion-enhance assume e esta camada desliga para não
     escrever transform duas vezes no mesmo elemento.
     ---------------------------------------------------------- */
  var parallaxItems = [];
  var parallaxHandlers = [];

  function updateParallax() {
    var mid = window.innerHeight * 0.5;
    parallaxItems.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var depth = parseFloat(el.getAttribute("data-parallax-depth")) || 0.2;
      depth = Math.max(0.1, Math.min(0.5, depth));
      var offset = (mid - (rect.top + rect.height / 2)) * 0.12 * depth;
      offset = Math.max(-40 * depth, Math.min(40 * depth, offset));
      el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
    });
  }

  function setupParallax() {
    parallaxItems = Array.prototype.slice.call(
      document.querySelectorAll("[data-parallax-depth]")
    );
    if (!parallaxItems.length || isReduced) return;
    /* GSAP ativo: motion-enhance assume o parallax. */
    if (document.documentElement.classList.contains("gsap")) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    var raf = false;
    function onScroll() {
      if (!raf) { raf = true; requestAnimationFrame(updateParallax); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    parallaxHandlers.push(onScroll);
    updateParallax();
  }

  /* Desliga o parallax vanilla quando o GSAP assume (chamado pelo loader) */
  function disableParallax() {
    parallaxHandlers.forEach(function (fn) {
      window.removeEventListener("scroll", fn);
      window.removeEventListener("resize", fn);
    });
    parallaxHandlers = [];
    parallaxItems.forEach(function (el) {
      el.style.transform = "";
    });
  }

  /* ----------------------------------------------------------
     CONTADORES — animam ao entrar na tela (data-count)
     ---------------------------------------------------------- */
  function setupCounters() {
    var counters = document.querySelectorAll("[data-count]");
    if (!counters.length) return;

    var animate = function (el) {
      var end = parseFloat(el.getAttribute("data-count")) || 0;
      var decimals = (el.getAttribute("data-count").split(".")[1] || "").length;
      var suffix = el.getAttribute("data-suffix") || "";
      var prefix = el.getAttribute("data-prefix") || "";
      var duration = isReduced ? 0 : 900;
      var start = null;

      function tick(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        var value = end * eased;
        el.textContent = prefix + value.toFixed(decimals) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if (isReduced) {
      counters.forEach(function (el) {
        el.textContent = (el.getAttribute("data-prefix") || "") + el.getAttribute("data-count") + (el.getAttribute("data-suffix") || "");
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    counters.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------
     MARQUEE — pausa em hover (só onde há hover)
     ---------------------------------------------------------- */
  function setupMarquee() {
    document.querySelectorAll(".marquee").forEach(function (mq) {
      var track = mq.querySelector(".marquee__track");
      if (!track || isReduced) return;
      mq.addEventListener("mouseenter", function () { track.classList.add("is-paused"); });
      mq.addEventListener("mouseleave", function () { track.classList.remove("is-paused"); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setupReveal();
    setupParallax();
    setupCounters();
    setupMarquee();
    window.CCS = window.CCS || {};
    window.CCS.motionBase = { disableParallax: disableParallax };
  });
})();
