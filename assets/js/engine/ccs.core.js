/* ============================================================
   CCS WEB EXPERIENCE ENGINE — core
   ------------------------------------------------------------
   Namespace global `window.CCS` + detecção de capacidades.
   Nenhuma dependência. Carregado por main.js via <script defer>.

   Módulos do motor:
     ccs.loader.js         — boot progressivo + resolução vendor/CDN
     ccs.experience.js     — cenas 3D (Three.js) com fallback
     ccs.motion-enhance.js — motion com GSAP + ScrollTrigger
   ============================================================ */
(function () {
  "use strict";

  var mq = function (q) { return window.matchMedia(q).matches; };

  var CCS = {

    /* Capacidades do dispositivo (uma única leitura por sessão) */
    features: {
      js: true,
      reduced: mq("(prefers-reduced-motion: reduce)"),
      coarse: mq("(pointer: coarse)"),
      fine: mq("(pointer: fine)"),
      hover: mq("(hover: hover)")
    },

    /* WebGL detectado (cache). Usado para decidir entre cena 3D
       e fallback — a regra é: SEMPRE ter fallback estático. */
    _webgl: null,
    hasWebGL: function () {
      if (CCS._webgl !== null) return CCS._webgl;
      try {
        var c = document.createElement("canvas");
        CCS._webgl = !!(window.WebGLRenderingContext &&
          (c.getContext("webgl") || c.getContext("experimental-webgl")));
      } catch (e) {
        CCS._webgl = false;
      }
      return CCS._webgl;
    },

    /* Carrega um script clássico e resolve quando executado */
    loadScript: function (src) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = src;
        s.async = true;
        s.onload = function () { resolve(s); };
        s.onerror = function () { reject(new Error("Falha ao carregar: " + src)); };
        document.head.appendChild(s);
      });
    },

    /* Carrega um ES module (com fallback de origem) */
    loadModule: function (src) {
      return import(src);
    },

    /* Helper: multiplicador de DPR limitado (performance) */
    clampDPR: function () {
      return Math.min(window.devicePixelRatio || 1, 2);
    },

    /* Marca o html com a classe de motion avançado (GSAP ativo) */
    enableGSAPMode: function () {
      if (!CCS.features.reduced) document.documentElement.classList.add("gsap");
    }
  };

  document.documentElement.classList.add("js");
  if (CCS.features.reduced) document.documentElement.classList.add("reduced-motion");
  if (CCS.features.coarse) document.documentElement.classList.add("touch");

  window.CCS = CCS;
})();
