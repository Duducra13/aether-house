/* ============================================================
   CCS WEB EXPERIENCE ENGINE — gallery
   ------------------------------------------------------------
   Galerias reutilizáveis e acessíveis, sem dependência externa:
     [data-gallery="carousel"]     carousel com track, setas,
                                   dots, progresso, swipe e
                                   autoplay opcional (com pausa)
     [data-gallery="lightbox"]     lightbox de grupo com teclado,
                                   contador e legendas (usando
                                   <dialog>)
     [data-gallery="beforeafter"]  comparador antes/depois (ARIA)
     [data-zoom]                   zoom de imagem (hover desktop,
                                   clique para alternar)

   Regras:
     - Teclado: setas/ESC funcional; foco visível.
     - Swipe em toque; alvos ≥ 44px.
     - Autoplay NUNCA agressivo: pausa em hover/foco e desligado
       em prefers-reduced-motion.
     - Sem JS: tudo permanece visível (nada é escondido).
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  var reduced = CCS.features.reduced;

  /* ============================================================
     CAROUSEL — [data-gallery="carousel"]
     ------------------------------------------------------------
     <div class="carousel" data-gallery="carousel" data-autoplay="5">
       <div class="carousel__track"> <div class="carousel__slide">…
       <button class="carousel__prev"> <button class="carousel__next">
       <div class="carousel__dots">
       <div class="carousel__progress"><span></span></div>
     </div>
     ============================================================ */
  function setupCarousel(root) {
    var track = root.querySelector(".carousel__track");
    if (!track) return;
    var slides = Array.prototype.slice.call(track.children);
    if (!slides.length) return;

    var prev = root.querySelector(".carousel__prev");
    var next = root.querySelector(".carousel__next");
    var dotsBox = root.querySelector(".carousel__dots");
    var progress = root.querySelector(".carousel__progress > span");
    var loop = root.hasAttribute("data-loop");
    var autoplay = parseFloat(root.getAttribute("data-autoplay")) || 0;
    var index = 0;
    var timer = null;
    var maxIndex = slides.length - 1;

    function go(i) {
      if (loop) {
        index = ((i % slides.length) + slides.length) % slides.length;
      } else {
        index = Math.max(0, Math.min(maxIndex, i));
      }
      var offset = -index * 100;
      track.style.transform = "translate3d(" + offset + "%,0,0)";
      if (prev) prev.disabled = loop ? false : index === 0;
      if (next) next.disabled = loop ? false : index === maxIndex;
      Array.prototype.forEach.call(slides, function (s, si) {
        s.setAttribute("aria-hidden", si === index ? "false" : "true");
      });
      if (dotsBox) {
        Array.prototype.forEach.call(dotsBox.children, function (d, di) {
          d.classList.toggle("is-active", di === index);
        });
      }
      if (progress) progress.style.transform = "scaleX(" + ((index + 1) / slides.length) + ")";
      if (root.getAttribute("role") !== "region") root.setAttribute("aria-label", "Galeria");
      if (root._carouselLabel) root._carouselLabel.textContent = (index + 1) + " / " + slides.length;
    }

    /* Dots + contador (aria-live para leitores) */
    if (dotsBox) {
      slides.forEach(function (_, i) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot";
        dot.setAttribute("aria-label", "Ir para o slide " + (i + 1));
        dot.addEventListener("click", function () { go(i); });
        dotsBox.appendChild(dot);
      });
    }
    var counter = root.querySelector(".carousel__counter");
    if (counter) {
      counter.setAttribute("aria-live", "polite");
      root._carouselLabel = counter;
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    /* Swipe (toque) */
    var startX = 0, dragging = false;
    track.addEventListener("touchstart", function (e) {
      startX = e.touches[0].clientX;
      dragging = true;
    }, { passive: true });
    track.addEventListener("touchmove", function (e) {
      if (dragging) e.preventDefault();
    }, { passive: false });
    track.addEventListener("touchend", function (e) {
      if (!dragging) return;
      dragging = false;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 44) go(index + (dx < 0 ? 1 : -1));
    });

    /* Autoplay: pausa em hover/foco; desligado em reduced-motion */
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function play() {
      if (!autoplay || reduced) return;
      if (timer) return;
      timer = setInterval(function () {
        go(loop ? index + 1 : Math.min(index + 1, maxIndex));
        if (!loop && index === maxIndex) stop();
      }, autoplay * 1000);
    }
    if (autoplay && !reduced) {
      play();
      root.addEventListener("mouseenter", stop);
      root.addEventListener("mouseleave", play);
      root.addEventListener("focusin", stop);
      root.addEventListener("focusout", play);
    }

    go(0);
  }

  /* ============================================================
     LIGHTBOX — [data-gallery="lightbox"]
     ------------------------------------------------------------
     <button data-gallery="lightbox" data-group="obras"
             data-lightbox="assets/img/obra-1.jpg"
             data-caption="Obra 1">
     Botões com o mesmo data-group formam um conjunto navegável.
     Usa um <dialog> compartilhado criado automaticamente.
     ============================================================ */
  var lightboxGroups = {};
  var dialogInitialized = false;

  function ensureDialog() {
    var dialog = document.getElementById("ccs-lightbox");
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.id = "ccs-lightbox";
    dialog.className = "ccs-lightbox";
    dialog.setAttribute("aria-label", "Visualização ampliada");
    dialog._currentGroup = "default";
    dialog._show = null;
    dialog.innerHTML =
      '<button class="ccs-lightbox__close" type="button" aria-label="Fechar">×</button>' +
      '<button class="ccs-lightbox__prev" type="button" aria-label="Anterior">‹</button>' +
      '<div class="ccs-lightbox__stage">' +
      '  <img class="ccs-lightbox__img" alt="" />' +
      '  <p class="ccs-lightbox__caption"></p>' +
      '</div>' +
      '<button class="ccs-lightbox__next" type="button" aria-label="Próximo">›</button>' +
      '<p class="ccs-lightbox__count" aria-live="polite"></p>';
    document.body.appendChild(dialog);

    dialog.querySelector(".ccs-lightbox__close").addEventListener("click", function () {
      dialog.close();
    });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    dialog.querySelector(".ccs-lightbox__prev").addEventListener("click", function () {
      if (dialog._show) dialog._show(dialog._index - 1);
    });
    dialog.querySelector(".ccs-lightbox__next").addEventListener("click", function () {
      if (dialog._show) dialog._show(dialog._index + 1);
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft" && dialog._show) dialog._show(dialog._index - 1);
      if (e.key === "ArrowRight" && dialog._show) dialog._show(dialog._index + 1);
      if (e.key === "Escape") dialog.close();
    });

    dialogInitialized = true;
    return dialog;
  }

  function setupLightbox(root) {
    var dialog = ensureDialog();
    var img = dialog.querySelector(".ccs-lightbox__img");
    var caption = dialog.querySelector(".ccs-lightbox__caption");
    var countEl = dialog.querySelector(".ccs-lightbox__count");
    var group = root.getAttribute("data-group") || "default";

    lightboxGroups[group] = (lightboxGroups[group] || []).concat([root]);

    root.addEventListener("click", function () {
      var gEls = lightboxGroups[group] || [root];
      var idx = gEls.indexOf(root);
      if (idx >= 0) show(idx);
    });

    function show(idx) {
      var gEls = lightboxGroups[group] || [];
      if (!gEls.length) return;
      idx = ((idx % gEls.length) + gEls.length) % gEls.length;
      var current = gEls[idx];
      var src = current.getAttribute("data-lightbox") || current.getAttribute("data-src") || "";
      var cap = current.getAttribute("data-caption") || current.getAttribute("data-alt") || "";
      img.src = src;
      img.alt = cap;
      caption.textContent = cap;
      countEl.textContent = (idx + 1) + " / " + gEls.length;
      dialog.querySelector(".ccs-lightbox__prev").disabled = false;
      dialog.querySelector(".ccs-lightbox__next").disabled = false;
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
        dialog.querySelector(".ccs-lightbox__close").focus();
      }
      dialog._index = idx;
      dialog._currentGroup = group;
      dialog._show = show;
    }
  }

  /* ============================================================
     BEFORE/AFTER — [data-gallery="beforeafter"]
     ------------------------------------------------------------
     <div data-gallery="beforeafter" role="slider" tabindex="0"
          aria-label="Antes e depois"
          aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">
       <div class="ba__after"> <img src="depois.jpg"> </div>
       <div class="ba__before"> <img src="antes.jpg"> </div>
       <div class="ba__handle"></div>
     </div>
     ============================================================ */
  function setupBeforeAfter(root) {
    var before = root.querySelector(".ba__before");
    var handle = root.querySelector(".ba__handle");
    if (!before || !handle) return;

    function setPos(p) {
      p = Math.max(0, Math.min(100, p));
      before.style.clipPath = "inset(0 " + (100 - p) + "% 0 0)";
      handle.style.left = p + "%";
      root.setAttribute("aria-valuenow", String(Math.round(p)));
    }

    root.setAttribute("role", "slider");
    root.setAttribute("tabindex", "0");
    if (!root.hasAttribute("aria-valuemin")) root.setAttribute("aria-valuemin", "0");
    if (!root.hasAttribute("aria-valuemax")) root.setAttribute("aria-valuemax", "100");
    if (!root.hasAttribute("aria-valuenow")) root.setAttribute("aria-valuenow", "50");
    if (!root.hasAttribute("aria-label")) root.setAttribute("aria-label", "Comparação antes e depois");

    var dragging = false;
    function fromEvent(e) {
      var rect = root.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      return (x / rect.width) * 100;
    }
    root.addEventListener("pointerdown", function (e) { dragging = true; setPos(fromEvent(e)); });
    window.addEventListener("pointermove", function (e) { if (dragging) setPos(fromEvent(e)); });
    window.addEventListener("pointerup", function () { dragging = false; });

    root.addEventListener("keydown", function (e) {
      var now = parseFloat(root.getAttribute("aria-valuenow")) || 50;
      if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); setPos(now - 5); }
      if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); setPos(now + 5); }
      if (e.key === "Home") { e.preventDefault(); setPos(0); }
      if (e.key === "End") { e.preventDefault(); setPos(100); }
    });

    setPos(parseFloat(root.getAttribute("aria-valuenow")) || 50);
  }

  /* ============================================================
     ZOOM — [data-zoom] em um container de imagem
     ------------------------------------------------------------
     <div data-zoom>
       <img src="..." alt="..." />
     </div>
     Desktop: zoom por hover. Toque: zoom por toque alternado.
     O CSS aplica scale na classe .is-zoomed.
     ============================================================ */
  function setupZoom(root) {
    var img = root.querySelector("img");
    if (!img) return;
    var canHover = CCS.features.hover && CCS.features.fine;

    if (canHover && !reduced) {
      root.addEventListener("pointerenter", function () { root.classList.add("is-zoomed"); });
      root.addEventListener("pointerleave", function () { root.classList.remove("is-zoomed"); });
    } else {
      root.addEventListener("click", function () { root.classList.toggle("is-zoomed"); });
    }
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function init() {
    document.querySelectorAll('[data-gallery="carousel"]').forEach(setupCarousel);
    document.querySelectorAll('[data-gallery="lightbox"]').forEach(setupLightbox);
    document.querySelectorAll('[data-gallery="beforeafter"]').forEach(setupBeforeAfter);
    document.querySelectorAll("[data-zoom]").forEach(setupZoom);
  }

  CCS.gallery = {
    carousel: setupCarousel,
    lightbox: setupLightbox,
    beforeAfter: setupBeforeAfter,
    zoom: setupZoom,
    start: init
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
