/* ============================================================
   CCS WEB EXPERIENCE ENGINE — motion-enhance (GSAP)
   ------------------------------------------------------------
   Camada opcional de motion dirigido por scroll. Só roda se o
   loader carregou GSAP + ScrollTrigger com sucesso (class `gsap`
   no <html>). Sem eles, o CSS + IntersectionObserver continuam
   funcionando — nada essencial depende disto.

   Atributos:
     [data-scrub="fade"]     fade-in dirigido pelo scroll
     [data-scrub="y"]        translateY dirigido pelo scroll
     [data-scrub="scale"]    scale dirigido pelo scroll
     [data-parallax-depth]   parallax de profundidade (0.1–0.5)
     [data-horizontal]       seção fixada com trilho horizontal
     [data-timeline]         revela os filhos sequencialmente
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS || CCS.features.reduced) return;

  function start() {
    if (!window.gsap || !window.ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add("gsap-ready");

    /* ---------------------------------------------------------
       SCRUB básico — fade / y / scale
       (usa objeto scrollTrigger explícito; props top-level
        scrub/start/end geram avisos mesmo com plugin registrado)
       --------------------------------------------------------- */
    document.querySelectorAll("[data-scrub]").forEach(function (el) {
      var kind = el.getAttribute("data-scrub");
      var vars = { ease: "none" };
      if (kind === "fade") { vars.opacity = 0; }
      else if (kind === "y") { vars.y = 48; vars.opacity = 0; }
      else if (kind === "scale") { vars.scale = 0.92; vars.opacity = 0; }
      vars.scrollTrigger = {
        trigger: el,
        start: el.getAttribute("data-start") || "top 85%",
        end: el.getAttribute("data-end") || "top 45%",
        scrub: true
      };
      gsap.from(el, vars);
    });

    /* ---------------------------------------------------------
       PARALLAX de profundidade (profundidade relativa)
       --------------------------------------------------------- */
    document.querySelectorAll("[data-parallax-depth]").forEach(function (el) {
      var depth = parseFloat(el.getAttribute("data-parallax-depth")) || 0.2;
      gsap.fromTo(el,
        { yPercent: -18 * depth },
        {
          yPercent: 18 * depth,
          ease: "none",
          scrollTrigger: {
            trigger: el,
            start: "top bottom",
            end: "bottom top",
            scrub: true
          }
        }
      );
    });

    /* ---------------------------------------------------------
       SCROLL HORIZONTAL — seção fixada, trilho desliza
       <section class="scroll-story" data-horizontal>
         <div class="scroll-story__track">
           <div class="scroll-story__slide">…</div>
         </div>
       </section>
       --------------------------------------------------------- */
    document.querySelectorAll("[data-horizontal]").forEach(function (section) {
      var track = section.querySelector(".scroll-story__track");
      if (!track) return;
      var slides = track.children;
      var getAmount = function () {
        return track.scrollWidth - section.clientWidth;
      };
      var tween = gsap.to(track, {
        x: function () { return -getAmount(); },
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: function () { return "+=" + getAmount(); },
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
          anticipatePin: 1
        }
      });
      /* A11y: permite navegar o track por teclado mesmo fixado */
      Array.prototype.forEach.call(slides, function (slide) {
        slide.setAttribute("tabindex", "0");
      });
      ScrollTrigger.addEventListener("refresh", function () { tween.invalidate(); });
    });

    /* ---------------------------------------------------------
       TIMELINE de entrada — filhos revelados em sequência
       [data-timeline] + [data-step] nos filhos
       --------------------------------------------------------- */
    document.querySelectorAll("[data-timeline]").forEach(function (wrapper) {
      var steps = wrapper.querySelectorAll("[data-step]");
      if (!steps.length) return;
      gsap.set(steps, { autoAlpha: 0, y: 24 });
      gsap.to(steps, {
        autoAlpha: 1, y: 0,
        duration: 0.6,
        stagger: 0.18,
        ease: "power3.out",
        scrollTrigger: {
          trigger: wrapper,
          start: "top 80%",
          toggleActions: "play none none reverse"
        }
      });
    });
  }

  CCS.motionEnhance = { start: start };
})();
