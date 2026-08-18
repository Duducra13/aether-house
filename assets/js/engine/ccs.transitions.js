/* ============================================================
   CCS WEB EXPERIENCE ENGINE — transitions
   ------------------------------------------------------------
   Transição entre páginas sem quebrar a navegação:
   - Usa a View Transitions API quando disponível (compatível com
     prefers-reduced-motion: a API própria desativa o efeito).
   - Fallback tradicional: se a API não existir, navega direto.
   - Intercepta apenas links internos do mesmo site, mesmos dados
     (mesmo protocolo/host) e com href sem hash.
   - Nunca intercepta: target=_blank, download, links com
     modificadores (Ctrl/Cmd/Shift/Alt), botões ou âncoras (#).
   - Se algo der errado, a navegação normal acontece (nunca quebra).
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  var supportVT = typeof document !== "undefined" &&
    "startViewTransition" in document;

  /* Mesmo site? (mesmo protocolo + host). Sem isso, deixa o
     browser lidar normalmente. */
  function isSameOrigin(href) {
    try {
      return new URL(href, window.location.href).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function shouldSkip(link) {
    if (!link.href) return true;
    if (link.hasAttribute("download")) return true;
    if (link.target && link.target !== "_self") return true;
    if (link.getAttribute("href").charAt(0) === "#") return true;
    if (!isSameOrigin(link.href)) return true;
    return false;
  }

  function handleClick(e) {
    var link = e.target.closest && e.target.closest("a");
    if (!link || shouldSkip(link)) return;

    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    var url = link.href;

    function navigate() {
      window.location.href = url;
    }

    if (!supportVT) {
      /* Fallback tradicional: navega direto. Nada de fancy que
         possa quebrar a navegação. */
      navigate();
      return;
    }

    try {
      document.startViewTransition(function () {
        navigate();
      });
    } catch (err) {
      navigate();
    }
  }

  function init() {
    /* Classe para CSS: permite estilizar o ::view-transition. */
    if (supportVT) document.documentElement.classList.add("vt");
    document.addEventListener("click", handleClick);
  }

  CCS.transitions = {
    start: init,
    supportViewTransitions: supportVT
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
