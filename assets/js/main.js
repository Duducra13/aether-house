/* ============================================================
   MAIN — comportamentos essenciais da página
   Vanilla JS, zero dependências, progressivo e acessível.
   ============================================================ */
(function () {
  "use strict";

  /* Marca o ambiente com JS ativo (permite reveals sem quebrar
     o conteúdo quando JS não carrega). */
  document.documentElement.classList.add("js");

  var isTouch = window.matchMedia("(pointer: coarse)").matches;

  /* ----------------------------------------------------------
     HEADER — estado scrolled (borda ao rolar)
     ---------------------------------------------------------- */
  var header = document.querySelector(".header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ----------------------------------------------------------
     MENU MOBILE — acessível: aria-expanded, foco, ESC
     ---------------------------------------------------------- */
  var toggle = document.querySelector(".nav__toggle");
  var menu = document.querySelector(".nav__menu");

  if (toggle && menu) {
    var closeMenu = function () {
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Abrir menu");
      menu.classList.remove("is-open");
      document.body.classList.remove("menu-open");
    };

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      if (open) {
        closeMenu();
      } else {
        toggle.setAttribute("aria-expanded", "true");
        toggle.setAttribute("aria-label", "Fechar menu");
        menu.classList.add("is-open");
        document.body.classList.add("menu-open");
        var first = menu.querySelector("a");
        if (first) first.focus();
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        closeMenu();
        toggle.focus();
      }
    });

    /* Fechar ao clicar em um link do menu */
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
  }

  /* ----------------------------------------------------------
     ACCORDION — FAQ (aria-expanded)
     ---------------------------------------------------------- */
  document.querySelectorAll(".accordion__trigger").forEach(function (trigger) {
    trigger.addEventListener("click", function () {
      var item = trigger.closest(".accordion__item");
      var panel = item.querySelector(".accordion__panel");
      var isOpen = trigger.getAttribute("aria-expanded") === "true";

      item.querySelectorAll("[aria-expanded]").forEach(function (t) {
        t.setAttribute("aria-expanded", "false");
        t.closest(".accordion__item").querySelector(".accordion__panel").classList.remove("is-open");
      });

      if (!isOpen) {
        trigger.setAttribute("aria-expanded", "true");
        panel.classList.add("is-open");
      }
    });
  });

  /* ----------------------------------------------------------
     TABS — role=tablist, navegação por teclado
     ---------------------------------------------------------- */
  document.querySelectorAll("[role='tablist']").forEach(function (tablist) {
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll("[role='tab']"));
    var panels = Array.prototype.slice.call(tablist.querySelectorAll(".tabs__panel"));

    function selectTab(tab) {
      tabs.forEach(function (t) {
        t.setAttribute("aria-selected", "false");
        t.tabIndex = -1;
      });
      tab.setAttribute("aria-selected", "true");
      tab.tabIndex = 0;
      panels.forEach(function (p) {
        p.classList.toggle("is-active", p.id === tab.getAttribute("aria-controls"));
      });
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { selectTab(tab); });

      tab.addEventListener("keydown", function (e) {
        var next = null;
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          next = tabs[(i + 1) % tabs.length];
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          next = tabs[(i - 1 + tabs.length) % tabs.length];
        }
        if (next) {
          e.preventDefault();
          selectTab(next);
          next.focus();
        }
        if (e.key === "Home") { e.preventDefault(); selectTab(tabs[0]); tabs[0].focus(); }
        if (e.key === "End") { e.preventDefault(); selectTab(tabs[tabs.length - 1]); tabs[tabs.length - 1].focus(); }
      });
    });
  });

  /* ----------------------------------------------------------
     LIGHTBOX — galeria com <dialog> (foco, ESC, backdrop)
     ---------------------------------------------------------- */
  var lightbox = document.getElementById("lightbox");
  if (lightbox) {
    var lightboxImg = lightbox.querySelector(".lightbox__img");

    document.querySelectorAll("[data-lightbox]").forEach(function (btn) {
      if (btn.hasAttribute("data-gallery")) return; /* gerenciado por ccs.gallery.js */
      btn.addEventListener("click", function () {
        var src = btn.getAttribute("data-lightbox");
        var alt = btn.getAttribute("data-alt") || "";
        lightboxImg.src = src;
        lightboxImg.alt = alt;
        if (typeof lightbox.showModal === "function") {
          lightbox.showModal();
          lightbox.querySelector(".lightbox__close").focus();
        }
      });
    });

    var closeLb = function () { if (lightbox.open) lightbox.close(); };
    var closeBtn = lightbox.querySelector(".lightbox__close");
    if (closeBtn) closeBtn.addEventListener("click", closeLb);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLb();
    });
  }

  /* ----------------------------------------------------------
     ANO AUTOMÁTICO no rodapé
     ---------------------------------------------------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ----------------------------------------------------------
     Barra fixa mobile — não cobrir conteúdo ao âncorar
     ---------------------------------------------------------- */
  if (isTouch) document.body.classList.add("has-mobilebar");
})();
