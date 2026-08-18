/* ============================================================
   CCS WEB EXPERIENCE ENGINE — motion (sistema de presets)
   ------------------------------------------------------------
   Camada 2D/2.5D/3D de motion dirigido por design, de propósito
   claro e acessível. Referências: biblioteca/motion/regras.md e
   biblioteca/direcoes-visuais/.

   Pilares:
   - PRESETS codificados: cada direção de arte traz seus próprios
     valores de easing, duração, reveal, stagger, blur, parallax,
     hover e intensidade. Aplicar um preset muda o ritmo do site
     inteiro sem tocar no HTML.
   - SPLIT TEXT: quebra títulos em palavras/caracteres/linhas com
     stagger e blur opcional. NUNCA automático — só via [data-split].
   - STORYTELLING: transições de estado dirigidas pelo scroll
     (fundo, cor, escala, posição, rotação). Sem GSAP funciona
     com IntersectionObserver; com GSAP ganha pin + scrub.
   - SCROLL PROGRESS: barra/linha/circular/minimal, opcional.
   - POINTER ENVIRONMENT: spotlight, proximity, cursor follower e
     distorção de hover. Só desktop (hover + fine), sutil e
     desativável via atributo. Nunca essencial para o conteúdo.

   Técnica progressiva: nada roda sem JS; reduced-motion desativa
   tudo que não é essencial; touch nunca depende de hover.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  var reduced = CCS.features.reduced;
  var isTouch = CCS.features.coarse;
  var canHover = CCS.features.hover && CCS.features.fine;

  /* ============================================================
     PRESETS — motion por direção de arte
     ------------------------------------------------------------
     Campos:
       ease       curvas de easing (cubic-bezier aplicado em CSS e
                  nome equivalente para GSAP)
       duration   duração base de reveals/entradas (ms)
       revealY    deslocamento vertical do reveal (px)
       stagger    intervalo entre elementos de uma sequência (ms)
       scale      escala de entrada (< 1 = cresce ao entrar)
       blur       desfoque de entrada (px; 0 = sem blur)
       parallax   multiplicador da velocidade do parallax (2.5D)
       hover      intensidade de efeitos de hover/tilt (0..1)
       intensity  intensidade geral do motion (0 = quase nada)
       ref        direção visual de origem (biblioteca/direcoes-visuais)
     ============================================================ */
  var PRESETS = {

    luxury: {
      label: "Luxury", ease: "cubic-bezier(0.16, 1, 0.3, 1)", gsapEase: "power3.out",
      duration: 900, revealY: 28, stagger: 120, scale: 0.97, blur: 6,
      parallax: 0.35, hover: 0.5, intensity: 0.35, ref: "luxury.md / dark-premium.md"
    },

    cinematic: {
      label: "Cinematic", ease: "cubic-bezier(0.65, 0, 0.35, 1)", gsapEase: "power2.inOut",
      duration: 1200, revealY: 48, stagger: 160, scale: 0.92, blur: 12,
      parallax: 0.5, hover: 0.6, intensity: 0.5, ref: "experimental.md / street.md"
    },

    editorial: {
      label: "Editorial", ease: "cubic-bezier(0.22, 1, 0.36, 1)", gsapEase: "power2.out",
      duration: 800, revealY: 32, stagger: 90, scale: 1, blur: 4,
      parallax: 0.3, hover: 0.5, intensity: 0.4, ref: "editorial.md"
    },

    brutalist: {
      label: "Brutalista", ease: "cubic-bezier(0.6, 0.04, 0.98, 0.335)", gsapEase: "power4.in",
      duration: 400, revealY: 16, stagger: 40, scale: 0.9, blur: 0,
      parallax: 0.15, hover: 0.2, intensity: 0.6, ref: "brutalista.md"
    },

    minimal: {
      label: "Minimalista", ease: "cubic-bezier(0.4, 0, 0.2, 1)", gsapEase: "power1.out",
      duration: 500, revealY: 12, stagger: 50, scale: 0.995, blur: 0,
      parallax: 0.1, hover: 0.15, intensity: 0.2, ref: "minimalista.md / swiss.md"
    },

    organic: {
      label: "Organic", ease: "cubic-bezier(0.45, 0.05, 0.55, 0.95)", gsapEase: "sine.inOut",
      duration: 750, revealY: 24, stagger: 90, scale: 0.98, blur: 2,
      parallax: 0.3, hover: 0.4, intensity: 0.35, ref: "organic.md / vintage.md"
    },

    automotive: {
      label: "Automotive", ease: "cubic-bezier(0.16, 1, 0.3, 1)", gsapEase: "power3.out",
      duration: 650, revealY: 36, stagger: 60, scale: 0.94, blur: 4,
      parallax: 0.45, hover: 0.6, intensity: 0.55, ref: "segmentos/AUTOMOTIVO.md"
    },

    fashion: {
      label: "Fashion", ease: "cubic-bezier(0.22, 1, 0.36, 1)", gsapEase: "power3.inOut",
      duration: 850, revealY: 40, stagger: 110, scale: 0.95, blur: 8,
      parallax: 0.4, hover: 0.55, intensity: 0.45, ref: "editorial.md / dark-premium.md"
    },

    technology: {
      label: "Technology", ease: "cubic-bezier(0.33, 1, 0.68, 1)", gsapEase: "power2.out",
      duration: 450, revealY: 18, stagger: 45, scale: 0.97, blur: 2,
      parallax: 0.2, hover: 0.35, intensity: 0.45, ref: "tech.md / futurista.md"
    },

    hospitality: {
      label: "Hospitality", ease: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", gsapEase: "sine.out",
      duration: 700, revealY: 22, stagger: 80, scale: 0.99, blur: 1,
      parallax: 0.25, hover: 0.3, intensity: 0.3, ref: "segmentos/HOSPITALIDADE.md"
    },

    restaurant: {
      label: "Restaurant", ease: "cubic-bezier(0.22, 1, 0.36, 1)", gsapEase: "power2.out",
      duration: 650, revealY: 26, stagger: 70, scale: 0.98, blur: 2,
      parallax: 0.25, hover: 0.35, intensity: 0.35, ref: "segmentos/ALIMENTACAO.md"
    },

    medical: {
      label: "Medical", ease: "cubic-bezier(0.4, 0, 0.2, 1)", gsapEase: "power1.out",
      duration: 550, revealY: 14, stagger: 60, scale: 1, blur: 0,
      parallax: 0.12, hover: 0.15, intensity: 0.2, ref: "segmentos/SAUDE.md"
    },

    corporate: {
      label: "Corporate", ease: "cubic-bezier(0.25, 0.1, 0.25, 1)", gsapEase: "power1.inOut",
      duration: 600, revealY: 16, stagger: 60, scale: 0.99, blur: 0,
      parallax: 0.15, hover: 0.2, intensity: 0.25, ref: "corporate-premium.md"
    },

    playful: {
      label: "Playful", ease: "cubic-bezier(0.34, 1.56, 0.64, 1)", gsapEase: "back.out(1.4)",
      duration: 550, revealY: 30, stagger: 55, scale: 0.9, blur: 0,
      parallax: 0.3, hover: 0.7, intensity: 0.6, ref: "creative-agency.md / street.md"
    },

    industrial: {
      label: "Industrial", ease: "cubic-bezier(0.77, 0, 0.175, 1)", gsapEase: "power4.out",
      duration: 500, revealY: 28, stagger: 50, scale: 0.93, blur: 0,
      parallax: 0.2, hover: 0.3, intensity: 0.5, ref: "industrial.md"
    }
  };

  var PRESET_VARS = {
    "--motion-ease": "ease",
    "--motion-duration": function (p) { return p.duration + "ms"; },
    "--motion-reveal-y": function (p) { return p.revealY + "px"; },
    "--motion-stagger": function (p) { return p.stagger + "ms"; },
    "--motion-entrance-scale": "scale",
    "--motion-entrance-blur": function (p) { return p.blur + "px"; },
    "--motion-parallax-speed": "parallax",
    "--motion-hover-strength": "hover",
    "--motion-intensity": "intensity"
  };

  /* Aplica um preset: define as custom properties em um escopo
     (documentElement por padrão) e marca o atributo para CSS. */
  function applyPreset(name, scope) {
    var preset = PRESETS[name];
    if (!preset) {
      if (window.console) console.warn("CCS motion: preset desconhecido '" + name + "'. Use CCS.motion.presets.");
      return null;
    }
    var el = scope || document.documentElement;
    Object.keys(PRESET_VARS).forEach(function (cssVar) {
      var key = PRESET_VARS[cssVar];
      el.style.setProperty(cssVar, typeof key === "function" ? key(preset) : preset[key]);
    });
    el.setAttribute("data-motion-preset", name);
    return preset;
  }

  /* Preset ativo pelo HTML: <html data-motion-preset="luxury"> ou
     <body data-motion-preset="luxury">. Sem marcação, mantém os
     tokens padrão do design system (não aplica nada). */
  var activePreset = null;
  function applyActivePreset() {
    var root = document.documentElement;
    var name = root.getAttribute("data-motion-preset") ||
               (document.body && document.body.getAttribute("data-motion-preset"));
    if (name) activePreset = applyPreset(name, root);
  }

  /* ============================================================
     SPLIT TEXT — [data-split]
     ------------------------------------------------------------
     <h2 data-split>              → quebra em palavras
     <h2 data-split="chars">      → quebra em caracteres
     <h2 data-split="lines">      → quebra em linhas (mede offset)
     A revelação acontece quando o elemento entra na viewport
     (classe .is-split). NUNCA automático: só onde marcado.
     ============================================================ */

  /* Quebra os nós de texto de um elemento em wrappers de palavra.
     Preserva filhos inline (em, strong, a). Retorna os .split-inner
     de cada palavra (targets de animação). */
  function wrapWords(el) {
    var inners = [];
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.nodeValue.trim() === "") continue;
      nodes.push(n);
    }
    nodes.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach(function (chunk) {
        if (chunk === "") return;
        var span = document.createElement("span");
        if (/^\s+$/.test(chunk)) {
          span.className = "split-space";
          span.appendChild(document.createTextNode(" "));
        } else {
          span.className = "split-word";
          var inner = document.createElement("span");
          inner.className = "split-inner";
          inner.textContent = chunk;
          span.appendChild(inner);
          inners.push(inner);
        }
        frag.appendChild(span);
      });
      node.parentNode.insertBefore(frag, node);
      node.parentNode.removeChild(node);
    });
    return inners;
  }

  /* Quebra cada palavra em caracteres. Retorna os .split-inner. */
  function splitChars(wordInners) {
    var charInners = [];
    wordInners.forEach(function (w) {
      var word = w.parentNode;
      var chars = w.textContent.split("");
      var frag = document.createDocumentFragment();
      chars.forEach(function (ch) {
        var cspan = document.createElement("span");
        cspan.className = "split-char";
        var cinner = document.createElement("span");
        cinner.className = "split-inner";
        cinner.textContent = ch;
        cspan.appendChild(cinner);
        frag.appendChild(cspan);
        charInners.push(cinner);
      });
      word.insertBefore(frag, w);
      word.removeChild(w);
    });
    return charInners;
  }

  /* Agrupa palavras em linhas por posição vertical. Retorna os
     .split-inner de cada linha. */
  function groupLines(wordInners) {
    var rows = [];
    wordInners.forEach(function (w) {
      var top = w.getBoundingClientRect().top;
      var last = rows[rows.length - 1];
      if (!last || Math.abs(top - last.top) > 2) {
        last = { top: top, inners: [] };
        rows.push(last);
      }
      last.inners.push(w);
    });
    var lineInners = [];
    rows.forEach(function (row) {
      var line = document.createElement("span");
      line.className = "split-line";
      var inner = document.createElement("span");
      inner.className = "split-inner";
      row.inners.forEach(function (w) {
        inner.appendChild(w.parentNode);
      });
      line.appendChild(inner);
      inner.parentNode.insertBefore(line, inner);
      lineInners.push(inner);
    });
    return lineInners;
  }

  function splitText(el, mode) {
    if (!el || el.__ccsSplit) return { element: el, words: [], chars: [], lines: [] };
    el.__ccsSplit = true;
    el.classList.add("is-split-ready");
    mode = mode || el.getAttribute("data-split") || "words";

    var words = wrapWords(el);
    var chars = [];
    var lines = [];

    if (mode === "chars") chars = splitChars(words);
    if (mode === "lines") lines = groupLines(words);

    return { element: el, words: words, chars: chars, lines: lines };
  }

  function initSplitText() {
    var targets = document.querySelectorAll("[data-split]");
    if (!targets.length) return;

    targets.forEach(function (el) {
      var result = splitText(el);
      el.__ccsSplitResult = result;

      /* Stagger: cada pedaço (palavra/caractere/linha) recebe um
         --split-delay proporcional ao intervalo do preset. */
      var units = result.lines.length ? result.lines
                 : result.chars.length ? result.chars
                 : result.words;
      units.forEach(function (unit, i) {
        var staggerMs = (activePreset && activePreset.stagger) || 45;
        unit.style.setProperty("--split-delay", (i * staggerMs) + "ms");
      });

      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      el.setAttribute("role", "text");
    });

    if (reduced) {
      targets.forEach(function (el) { el.classList.add("is-split"); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-split");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });

    targets.forEach(function (el) { io.observe(el); });
  }

  /* ============================================================
     STORYTELLING — [data-story] + [data-scene]
     ------------------------------------------------------------
     <section data-story>
       <div data-story-bg></div>          (fundo que muda de cor)
       <div class="story__scene" data-scene>…</div>
       <div class="story__scene" data-scene>…</div>
     </section>

     Sem GSAP: o IntersectionObserver marca a cena ativa
     (.is-active / data-active no container) e a cena atual
     fica visível — transições via CSS. Com GSAP + data-pin:
     a seção é fixada e as cenas animam com scrub no scroll.
     Reduzido/touch: todas as cenas ficam empilhadas e visíveis
     (nenhuma essencial escondida).
     ============================================================ */

  function storySetActive(story, index) {
    var scenes = story.__ccsScenes || [];
    scenes.forEach(function (s, i) {
      s.classList.toggle("is-active", i === index);
    });
    story.setAttribute("data-active", String(index));
  }

  function initStoriesVanilla() {
    if (reduced) return; /* cenas nascem visíveis em reduced-motion */

    document.querySelectorAll("[data-story]").forEach(function (story) {
      var scenes = Array.prototype.slice.call(story.querySelectorAll("[data-scene]"));
      if (!scenes.length) return;
      story.__ccsScenes = scenes;

      /* em telas pequenas / sem hover, empilha tudo visível */
      if (isTouch) {
        scenes.forEach(function (s) { s.classList.add("is-active"); });
        story.setAttribute("data-active", "all");
        return;
      }

      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          storySetActive(story, scenes.indexOf(entry.target));
          io.unobserve(entry.target);
        });
      }, { threshold: 0.6, rootMargin: "0px 0px -15% 0px" });

      scenes.forEach(function (s) { io.observe(s); });
      storySetActive(story, 0);
    });
  }

  /* Upgrade GSAP: storytelling com pin + scrub. Chamado pelo
     loader quando GSAP/ScrollTrigger carregam. */
  function upgradeStories() {
    if (!window.gsap || !window.ScrollTrigger) return;
    if (reduced) return;

    document.querySelectorAll("[data-story][data-pin]").forEach(function (story) {
      var scenes = story.__ccsScenes ||
        Array.prototype.slice.call(story.querySelectorAll("[data-scene]"));
      if (!scenes.length) return;
      story.__ccsScenes = scenes;

      gsap.registerPlugin(ScrollTrigger);

      /* remove estados do modo vanilla para não conflitar */
      scenes.forEach(function (s) {
        s.classList.remove("is-active");
        gsap.set(s, { autoAlpha: 0, y: 40 });
      });

      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: story,
          start: "top top",
          end: "+=" + (scenes.length * 80) + "%",
          pin: true,
          scrub: 1,
          anticipatePin: 1
        }
      });

      var i;
      for (i = 0; i < scenes.length; i++) {
        if (i > 0) {
          tl.to(scenes[i - 1], { autoAlpha: 0, y: -40, duration: 1 }, ">");
        }
        tl.to(scenes[i], { autoAlpha: 1, y: 0, duration: 1 }, ">")
          .fromTo(scenes[i].querySelectorAll("[data-story-reveal]") || [],
                  { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.1, duration: 0.6 }, "-=0.4");
      }

      var bg = story.querySelector("[data-story-bg]");
      if (bg) {
        var colors = scenes.map(function (s) {
          return s.getAttribute("data-story-color") || "transparent";
        });
        colors.forEach(function (color, idx) {
          if (idx === 0) return;
          tl.to(bg, { backgroundColor: color, duration: 1 }, ">-0.8");
        });
      }

      story.__ccsTimeline = tl;
    });
  }

  /* ============================================================
     SCROLL PROGRESS — [data-scroll-progress]
     ------------------------------------------------------------
     <div data-scroll-progress="bar">        barra fixa no topo
     <div data-scroll-progress="line">       linha no fluxo
     <svg data-scroll-progress="circular">   anel circular
     <div data-scroll-progress="minimal">    ponto/linha mínima

     A variável --progress (0..1) é atualizada no elemento. O CSS
     desenha cada variante. data-progress-target="#id" limita o
     progresso à passagem de um elemento pela viewport.
     ============================================================ */

  var progressEls = [];

  function updateProgress() {
    var doc = document.documentElement;
    var max = (doc.scrollHeight - window.innerHeight) || 1;
    progressEls.forEach(function (el) {
      var p;
      var targetId = el.getAttribute("data-progress-target");
      if (targetId) {
        var target = document.querySelector(targetId);
        if (!target) { p = 0; }
        else {
          var rect = target.getBoundingClientRect();
          var vh = window.innerHeight || doc.clientHeight;
          var total = target.offsetHeight + vh;
          p = Math.max(0, Math.min(1, (vh - rect.top) / total));
        }
      } else {
        p = Math.max(0, Math.min(1, (window.scrollY || window.pageYOffset) / max));
      }
      el.style.setProperty("--progress", p.toFixed(4));
    });
  }

  function initProgress() {
    progressEls = Array.prototype.slice.call(
      document.querySelectorAll("[data-scroll-progress]")
    );
    if (!progressEls.length) return;

    var raf = false;
    var onScroll = function () {
      if (!raf) { raf = true; requestAnimationFrame(function () { raf = false; updateProgress(); }); }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", onScroll);
    updateProgress();
  }

  /* ============================================================
     POINTER ENVIRONMENT — [data-pointer-env]
     ------------------------------------------------------------
     data-pointer-env="spotlight"   brilho/radial segue o cursor
     data-pointer-env="proximity"   filhos [data-proximity] se
                                    aproximam do cursor (sutil)
     data-pointer-env="cursor"      [data-cursor="follower"] segue
                                    o cursor (desktop)
     data-pointer-env="distort"     imagens [data-distort] ganham
                                    leve inclinação no hover

     Regras: só desktop (hover + pointer fine), desativado em
     reduced-motion, NUNCA essencial, sempre desativável
     (data-pointer-env="off" remove o efeito).
     ============================================================ */

  function initPointer() {
    if (reduced || !canHover) return;
    if (!document.querySelector("[data-pointer-env]")) return;

    /* SPOTLIGHT — --spot-x / --spot-y no elemento */
    document.querySelectorAll('[data-pointer-env="spotlight"]').forEach(function (env) {
      env.addEventListener("pointermove", function (e) {
        var rect = env.getBoundingClientRect();
        env.style.setProperty("--spot-x", ((e.clientX - rect.left) / rect.width).toFixed(3));
        env.style.setProperty("--spot-y", ((e.clientY - rect.top) / rect.height).toFixed(3));
      });
    });

    /* PROXIMITY — filhos [data-proximity] deslizam sutilmente */
    document.querySelectorAll('[data-pointer-env="proximity"]').forEach(function (env) {
      var items = Array.prototype.slice.call(env.querySelectorAll("[data-proximity]"));
      if (!items.length) return;
      var strength = 14;
      env.addEventListener("pointermove", function (e) {
        var rect = env.getBoundingClientRect();
        var cx = (e.clientX - rect.left) / rect.width - 0.5;
        var cy = (e.clientY - rect.top) / rect.height - 0.5;
        items.forEach(function (item) {
          var s = parseFloat(item.getAttribute("data-proximity")) || 1;
          item.style.transform =
            "translate3d(" + (cx * strength * s).toFixed(1) + "px," +
                            (cy * strength * s).toFixed(1) + "px,0)";
        });
      });
      env.addEventListener("pointerleave", function () {
        items.forEach(function (item) { item.style.transform = ""; });
      });
    });

    /* CURSOR FOLLOWER — elemento segue o cursor com suavização */
    var follower = document.querySelector('[data-cursor="follower"]');
    if (follower) {
      var fx = -100, fy = -100, tx = -100, ty = -100, raf = null;
      window.addEventListener("pointermove", function (e) {
        tx = e.clientX;
        ty = e.clientY;
        if (!raf) {
          raf = true;
          (function loop() {
            fx += (tx - fx) * 0.16;
            fy += (ty - fy) * 0.16;
            follower.style.transform = "translate3d(" + fx + "px," + fy + "px,0) translate(-50%,-50%)";
            raf = (Math.abs(tx - fx) > 0.5 || Math.abs(ty - fy) > 0.5)
              ? requestAnimationFrame(loop) : null;
          })();
        }
      });
    }

    /* DISTORT — imagens com leve inclinação dirigida pelo cursor */
    document.querySelectorAll('[data-pointer-env="distort"] [data-distort]').forEach(function (img) {
      var maxTilt = 4;
      img.addEventListener("pointermove", function (e) {
        var rect = img.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        img.style.transform =
          "perspective(700px) rotateY(" + (px * maxTilt).toFixed(2) + "deg)" +
          " rotateX(" + (-py * maxTilt).toFixed(2) + "deg) scale(1.03)";
      });
      img.addEventListener("pointerleave", function () {
        img.style.transform = "";
      });
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  function start() {
    applyActivePreset();
    initSplitText();
    initStoriesVanilla();
    initProgress();
    initPointer();
  }

  CCS.motion = {
    presets: PRESETS,
    apply: applyPreset,
    get: function (name) { return PRESETS[name] || null; },
    splitText: splitText,
    upgrade: upgradeStories,
    start: start,
    _updateProgress: updateProgress
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
