/* ============================================================
   CCS WEB EXPERIENCE ENGINE — loader
   ------------------------------------------------------------
   Boot progressivo. Regras (ver biblioteca/experiencias/README.md):
   - O conteúdo NUNCA depende de GSAP ou Three.js.
   - GSAP carrega só se houver [data-scrub]/[data-horizontal]/[data-timeline]/[data-parallax-depth].
   - Three.js carrega só se houver [data-engine="3d"].
   - Vendor local primeiro; CDN (jsdelivr) como fallback.
   - Sem WebGL / sem rede / erro → fallback estático visível.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  var VER = {
    three: "0.160.0",
    gsap: "3.12.5"
  };

  var LOCAL = {
    gsap:   "assets/js/vendor/gsap.min.js",
    scroll: "assets/js/vendor/ScrollTrigger.min.js"
  };

  var CDN = {
    gsap:   "https://cdn.jsdelivr.net/npm/gsap@%V%/dist/gsap.min.js",
    scroll: "https://cdn.jsdelivr.net/npm/gsap@%V%/dist/ScrollTrigger.min.js"
  };

  function resolveScript(localPath, cdnPath) {
    return CCS.loadScript(localPath).catch(function () {
      return CCS.loadScript(cdnPath);
    });
  }

  /* ----------------------------------------------------------
     THREE.JS (experiências 3D)
     Resolve { THREE, GLTFLoader, DRACOLoader } de uma vez:
     - vendor local (three-all.module.js, gerado por npm run vendor)
     - CDN +esm (jsdelivr) como fallback
     ---------------------------------------------------------- */
  var threePromise = null;

  function loadThree() {
    if (threePromise) return threePromise;
    var threeCDN = "https://cdn.jsdelivr.net/npm/three@" + VER.three;

    /* Local: um único módulo com THREE, GLTFLoader e DRACOLoader */
    threePromise = CCS.loadModule("assets/js/vendor/three-all.module.js").then(function (m) {
      if (m.THREE && m.GLTFLoader) return m;
      throw new Error("bundle local incompleto");
    }).catch(function () {
      /* CDN: three partes +esm (cada uma resolve os imports) */
      return Promise.all([
        CCS.loadModule(threeCDN + "/+esm"),
        CCS.loadModule(threeCDN + "/examples/jsm/loaders/GLTFLoader.js/+esm"),
        CCS.loadModule(threeCDN + "/examples/jsm/loaders/DRACOLoader.js/+esm")
      ]).then(function (mods) {
        return { THREE: mods[0], GLTFLoader: mods[1].GLTFLoader, DRACOLoader: mods[2].DRACOLoader };
      });
    });
    return threePromise;
  }

  function bootThree(host) {
    if (!CCS.hasWebGL()) {
      console.warn("CCS 3D: WebGL indisponível — usando fallback estático.");
      fallback(host); return;
    }
    if (CCS.features.reduced && !host.getAttribute("data-reduced-ok")) {
      /* reduced-motion: não inicia cena animada; mostra o fallback */
      console.warn("CCS 3D: prefers-reduced-motion ativo — fallback. Adicione data-reduced-ok no shell para exibir a cena estática.");
      fallback(host);
      return;
    }

    loadThree().then(function (mods) {
      CCS.experience.start(host, mods.THREE, mods.GLTFLoader, mods.DRACOLoader);
    }).catch(function (e) {
      console.warn("CCS 3D: falha ao carregar o Three.js (" + (e && e.message) + ") — fallback estático.");
      fallback(host);
    });
  }

  function fallback(host) {
    var fb = host.querySelector("[data-fallback]");
    if (fb) {
      fb.removeAttribute("hidden");
      fb.setAttribute("aria-hidden", "false");
    }
    host.classList.add("is-fallback");
  }

  /* ----------------------------------------------------------
     GSAP + ScrollTrigger (motion avançado no scroll)
     ---------------------------------------------------------- */
  function bootMotion() {
    var hasTargets = document.querySelector(
      "[data-scrub], [data-horizontal], [data-timeline], [data-parallax-depth]"
    );
    if (!hasTargets || CCS.features.reduced) return;

    resolveScript(LOCAL.gsap, CDN.gsap.replace("%V%", VER.gsap))
      .then(function () {
        return resolveScript(LOCAL.scroll, CDN.scroll.replace("%V%", VER.gsap));
      })
      .then(function () {
        if (!window.gsap || !window.ScrollTrigger) throw new Error("GSAP indisponível");
        /* GSAP assume o parallax: desliga a camada vanilla (evita transform duplo) */
        if (window.CCS && CCS.motionBase) CCS.motionBase.disableParallax();
        CCS.enableGSAPMode();
        if (window.CCS && CCS.motionEnhance) CCS.motionEnhance.start();
        /* Storytelling dirigido por scroll com pin (data-story + data-pin) */
        if (window.CCS && CCS.motion) CCS.motion.upgrade();
      })
      .catch(function () {
        /* Sem GSAP: o CSS + IO continuam funcionando. Nada quebra. */
      });
  }

  /* ----------------------------------------------------------
     BOOT — cenas 3D iniciam apenas quando entram na viewport
     (lazy init). Sem IntersectionObserver, inicia direto.
     ---------------------------------------------------------- */
  function init() {
    var hosts = Array.prototype.slice.call(
      document.querySelectorAll("[data-engine='3d']")
    );
    if (!hosts.length) { bootMotion(); return; }

    var IO = window.IntersectionObserver;
    if (!IO) {
      hosts.forEach(bootThree);
      bootMotion();
      return;
    }

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var host = entry.target;
        obs.unobserve(host);
        bootThree(host);
      });
    }, { rootMargin: "10% 0px 10% 0px", threshold: 0 });

    hosts.forEach(function (host) { obs.observe(host); });
    bootMotion();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
