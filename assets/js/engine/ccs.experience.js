/* ============================================================
   CCS WEB EXPERIENCE ENGINE — experience (3D / Three.js)
   ------------------------------------------------------------
   Cenas 3D progressivas e acessíveis. Baseado na implementação
   validada em projetos/ (carros-3d).

   Como usar no HTML:
     <section id="hero-3d" class="shell" data-engine="3d">
       <canvas class="ccs-3d__canvas"></canvas>
       <div data-fallback hidden>...conteúdo estático de reserva...</div>
       <script type="application/json" class="ccs-3d__config">
         { "models": [
             { "id": "produto", "url": "assets/models/products/produto.glb",
               "name": "Produto", "spec": "Especificação real" } ],
           "default": "produto",
           "autoRotate": true }
       </script>
     </section>

   Fallback automático quando: sem WebGL, reduced-motion (por
   padrão), falha de rede/CDN ou falha ao carregar o modelo.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS) return;

  var easeOutCubic = function (t) { return 1 - Math.pow(1 - t, 3); };
  var easeInCubic = function (t) { return t * t * t; };

  /* Executa um easing linear (sem depender de GSAP) */
  function run(duration, fn, done) {
    var t0 = performance.now();
    (function frame(now) {
      var p = Math.min(1, (now - t0) / duration);
      fn(p);
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    })(t0);
  }

  /* Ponte scroll -> cena 3D (item Scroll<->Three):
     - com ScrollTrigger (GSAP) → scrub suave dirigido pelo scroll;
     - sem GSAP → fallback vanilla (rAF no evento scroll).
     O progresso (0..1) é entregue ao callback em cada frame. */
  function wireScroll(host, onProgress) {
    if (window.ScrollTrigger && window.gsap) {
      window.ScrollTrigger.create({
        trigger: host,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6,
        onUpdate: function (self) { onProgress(self.progress); }
      });
      return;
    }
    function update() {
      var r = host.getBoundingClientRect();
      var vh = window.innerHeight || document.documentElement.clientHeight;
      var total = host.offsetHeight + vh;
      onProgress(Math.max(0, Math.min(1, (vh - r.top) / total)));
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    update();
  }

  /* Ponte GSAP<->Three (item: CCS3D.animate):
     anima propriedades numéricas de um Object3D (ex. position.y,
     rotation.y, scale) com GSAP quando disponível, senão via rAF
     própria. Retorna um handle com .kill() para cancelar. */
  function tweenObject(obj, props, duration, ease, done) {
    var flat = {};
    (function flatten(prefix, src) {
      for (var k in src) {
        if (!Object.prototype.hasOwnProperty.call(src, k)) continue;
        var v = src[k];
        var key = prefix ? prefix + "." + k : k;
        if (typeof v === "number") flat[key] = v;
        else if (v && typeof v === "object") flatten(key, v);
      }
    })("", props);

    function getPath(path) {
      return path.split(".").reduce(function (a, k) {
        return a ? a[k] : undefined;
      }, obj);
    }
    function setPath(path, v) {
      var parts = path.split(".");
      var o = obj;
      for (var i = 0; i < parts.length - 1; i++) o = o[parts[i]];
      o[parts[parts.length - 1]] = v;
    }

    var keys = Object.keys(flat);
    if (!keys.length) { if (done) done(); return { kill: function () {} }; }

    if (window.gsap) {
      var vars = {};
      keys.forEach(function (k) { vars[k] = flat[k]; });
      vars.duration = (duration || 1000) / 1000;
      vars.ease = ease || "power3.out";
      if (done) vars.onComplete = done;
      var tween = window.gsap.to(obj, vars);
      return { kill: function () { tween.kill(); } };
    }

    var from = {};
    keys.forEach(function (k) { from[k] = getPath(k); });
    var d = duration || 1000;
    var t0 = performance.now();
    var killed = false;
    (function frame(now) {
      if (killed) return;
      var p = Math.min(1, (now - t0) / d);
      var e = ease === "linear" ? p : 1 - Math.pow(1 - p, 3);
      keys.forEach(function (k) {
        setPath(k, from[k] + (flat[k] - from[k]) * e);
      });
      if (p < 1) requestAnimationFrame(frame);
      else if (done) done();
    })(t0);
    return { kill: function () { killed = true; } };
  }

  /* CCS3D — API pública para o DOM/páginas animarem cenas 3D */
  function defineCCS3D() {
    if (window.CCS3D) return window.CCS3D;
    var scenes = [];
    var api = {
      scenes: scenes,
      registerScene: function (host, ctx) {
        scenes.push({ host: host, ctx: ctx });
      },
      unregisterScene: function (host) {
        for (var i = 0; i < scenes.length; i++) {
          if (scenes[i].host === host) { scenes.splice(i, 1); break; }
        }
      },
      animate: function (obj, props, opts) {
        opts = opts || {};
        return tweenObject(obj, props, opts.duration, opts.ease, opts.onComplete);
      }
    };
    window.CCS3D = api;
    return api;
  }

  function parseConfig(host) {
    var cfgEl = host.querySelector(".ccs-3d__config");
    if (cfgEl) {
      try { return JSON.parse(cfgEl.textContent); } catch (e) { /* usa default */ }
    }
    var models = [];
    host.querySelectorAll("[data-model]").forEach(function (btn) {
      models.push({
        id: btn.getAttribute("data-model-id") || btn.getAttribute("data-model"),
        url: btn.getAttribute("data-model"),
        name: btn.getAttribute("data-model-name") || "",
        spec: btn.getAttribute("data-model-spec") || ""
      });
    });
    return { models: models, default: models.length ? models[0].id : null, autoRotate: true };
  }

  function showFallback(host) {
    var fb = host.querySelector("[data-fallback]");
    if (fb) {
      fb.removeAttribute("hidden");
      fb.setAttribute("aria-hidden", "false");
    }
    host.classList.add("is-fallback");
  }

  /* Cena abstrata de demonstração — apenas para páginas internas
     (kit/experiencias). Clientes usam modelos reais (GLB). */
  function buildDemoScene(THREE, scene, config) {
    var brand = getComputedStyle(document.documentElement);
    var c1 = (brand.getPropertyValue("--color-primary") || "#1a3c34").trim();
    var c2 = (brand.getPropertyValue("--color-accent") || "#d98e2b").trim();

    var group = new THREE.Group();
    var mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(c1), roughness: 0.35, metalness: 0.55 });
    var mat2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(c2), roughness: 0.4, metalness: 0.6 });

    var geo = new THREE.TorusKnotGeometry(1, 0.32, 128, 24);
    var knot = new THREE.Mesh(geo, mat);
    knot.position.y = 0.15;
    group.add(knot);

    var ringGeo = new THREE.TorusGeometry(2.05, 0.045, 24, 128);
    var ring = new THREE.Mesh(ringGeo, mat2);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.userData.demo = true;
    return group;
  }

  function start(host, THREE, GLTFLoaderCtor, DRACOLoaderCtor) {
    var config = parseConfig(host);
    if (!config.models || !config.models.length) {
      if (host.hasAttribute("data-demo")) { bootDemo(host, THREE); return; }
      showFallback(host); return;
    }

    var canvas = host.querySelector("canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      host.appendChild(canvas);
    }

    var renderer, scene, camera, clock, group = null, current = null;
    var cache = {};
    var busy = false;
    var drag = { active: false, last: 0, rotY: 0 };
    var isReduced = CCS.features.reduced;
    var scrollDriven = host.hasAttribute("data-scroll-stage");
    var scrollProgress = 0;

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { console.warn("CCS 3D: falha ao criar o WebGLRenderer — fallback.", e); showFallback(host); return; }

    renderer.setPixelRatio(CCS.clampDPR());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(4.2, 1.9, 5.2);
    camera.lookAt(0, 0.4, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x101820, 1.2));
    var key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(5, 6, 4);
    scene.add(key);
    var warm = new THREE.DirectionalLight(0xff9a5e, 1.1);
    warm.position.set(-5, 2, -4);
    scene.add(warm);

    var grid = new THREE.GridHelper(10, 20, 0x30404c, 0x182830);
    grid.position.y = -0.02;
    scene.add(grid);

    var loader = new GLTFLoaderCtor();
    if (DRACOLoaderCtor) {
      var draco = new DRACOLoaderCtor();
      draco.setDecoderPath("assets/js/vendor/draco/");
      loader.setDRACOLoader(draco);
    }

    clock = new THREE.Clock();

    var pickBtns = host.querySelectorAll("[data-model]");
    var infoEl = host.querySelector(".ccs-3d__info");
    var loadingEl = host.querySelector(".shell__loading");

    function byId(id) {
      for (var i = 0; i < config.models.length; i++) {
        if (config.models[i].id === id) return config.models[i];
      }
      return config.models[0];
    }

    function updatePick(id) {
      pickBtns.forEach(function (btn) {
        var on = btn.getAttribute("data-model") === id;
        btn.classList.toggle("is-active", on);
        if (btn.getAttribute("aria-pressed")) btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      if (infoEl) {
        var c = byId(id);
        infoEl.textContent = c.name + (c.spec ? " · " + c.spec : "");
      }
    }

    function stageObject(obj) {
      var box = new THREE.Box3().setFromObject(obj);
      var size = box.getSize(new THREE.Vector3());
      var center = box.getCenter(new THREE.Vector3());
      var scale = 2.6 / Math.max(size.x, size.y, size.z);
      obj.scale.setScalar(scale);
      obj.position.y = -center.y * scale;
      obj.rotation.y = Math.PI * 0.75;
    }

    function loadModel(c, done) {
      if (cache[c.id]) { done(cache[c.id]); return; }
      loader.load(c.url, function (gltf) {
        stageObject(gltf.scene);
        cache[c.id] = gltf.scene;
        done(gltf.scene);
      }, undefined, function (e) { console.warn("CCS 3D: falha ao carregar o modelo '" + c.url + "' — fallback.", e); showFallback(host); });
    }

    function enterObject(g, done) {
      if (isReduced) { if (done) done(); return; }
      var baseY = g.position.y;
      g.position.x = 8;
      g.position.y = baseY - 0.6;
      g.scale.setScalar(0.84);
      run(1300, function (p) {
        var e = easeOutCubic(p);
        g.position.x = 8 * (1 - e);
        g.position.y = baseY - 0.6 + 0.6 * e;
        g.scale.setScalar(0.84 + 0.16 * e);
        key.intensity = 1.8 + 1.4 * Math.sin(p * Math.PI) * (1 - p);
      }, done);
    }

    function exitObject(g, done) {
      if (isReduced) { if (done) done(); return; }
      var baseY = g.position.y;
      run(400, function (p) {
        var e = easeInCubic(p);
        g.position.x = -8 * e;
        g.position.y = baseY - 0.4 * e;
        g.scale.setScalar(1 - 0.16 * e);
      }, done);
    }

    function show(id) {
      if (busy || (current === id && group)) return;
      busy = true;
      updatePick(id);

      function place(obj) {
        var next = new THREE.Group();
        next.add(obj);
        scene.add(next);
        enterObject(next, function () {
          if (group && group !== next) scene.remove(group);
          group = next;
          current = id;
          busy = false;
          if (loadingEl) { loadingEl.style.display = "none"; loadingEl = null; }
        });
      }

      function proceed() {
        if (group) {
          exitObject(group, function () {
            if (group) scene.remove(group);
            group = null;
            loadModel(byId(id), place);
          });
        } else {
          loadModel(byId(id), place);
        }
      }

      if (!cache[id] && config.models.length > 1 && !isReduced) {
        /* Pré-carrega o próximo modelo em paralelo (cache quente) */
        config.models.forEach(function (m) {
          if (m.id !== id) loadModel(m, function () {});
        });
      }
      proceed();
    }

    pickBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        show(btn.getAttribute("data-model"));
      });
    });

    /* Controles: arrastar para girar (mouse + toque) */
    var down = function (e) { drag.active = true; drag.last = (e.touches ? e.touches[0].clientX : e.clientX); };
    var move = function (e) {
      if (!drag.active) return;
      var x = (e.touches ? e.touches[0].clientX : e.clientX);
      drag.rotY += (x - drag.last) * 0.01;
      drag.last = x;
    };
    var up = function () { drag.active = false; };

    canvas.addEventListener("mousedown", down);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    canvas.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("touchmove", move, { passive: true });
    window.addEventListener("touchend", up);

    function resize() {
      var w = host.clientWidth || host.offsetWidth || 600;
      var h = host.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) {
      new ResizeObserver(resize).observe(host);
    }
    resize();

    var disposed = false;
    (function tick() {
      if (disposed) return;
      requestAnimationFrame(tick);
      clock.getElapsedTime();
      if (group) {
        var child = group.children[0];
        if (scrollDriven) {
          child.rotation.y = scrollProgress * Math.PI * 2 * (config.scrollRotate || 1);
        } else {
          if (!drag.active && config.autoRotate !== false) child.rotation.y += isReduced ? 0 : 0.004;
          child.rotation.y += drag.rotY;
          drag.rotY = 0;
        }
      }
      renderer.render(scene, camera);
    })();

    show(config.default || config.models[0].id);

    if (scrollDriven) {
      wireScroll(host, function (p) { scrollProgress = p; });
    }
    defineCCS3D().registerScene(host, {
      get scene() { return scene; },
      get camera() { return camera; },
      get group() { return group; },
      get renderer() { return renderer; }
    });

    /* Libera memória ao sair da página (SPA/pré-render) */
    window.addEventListener("pagehide", function () {
      disposed = true;
      cache = {};
      if (renderer) { renderer.dispose(); }
      if (window.CCS3D) window.CCS3D.unregisterScene(host);
    }, { once: true });
  }

  /* Demonstração abstrata (só páginas internas) */
  function bootDemo(host, THREE) {
    var canvas = host.querySelector("canvas") || (function () {
      var c = document.createElement("canvas");
      host.appendChild(c);
      return c;
    })();

    var renderer, scene, camera;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) { showFallback(host); return; }

    renderer.setPixelRatio(CCS.clampDPR());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 1.4, 6);
    camera.lookAt(0, 0.2, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x101820, 1.3));
    var key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(4, 6, 4);
    scene.add(key);

    var group = buildDemoScene(THREE, scene, {});
    scene.add(group);

    var isReduced = CCS.features.reduced;
    var disposed = false;
    var scrollDriven = host.hasAttribute("data-scroll-stage");
    var scrollProgress = 0;

    function resize() {
      var w = host.clientWidth || host.offsetWidth || 600;
      var h = host.clientHeight || 420;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener("resize", resize);
    if (window.ResizeObserver) new ResizeObserver(resize).observe(host);
    resize();

    (function tick() {
      if (disposed) return;
      requestAnimationFrame(tick);
      if (!isReduced) {
        if (scrollDriven) {
          group.rotation.y = scrollProgress * Math.PI * 2;
          group.children[0].rotation.x = 0.15 * scrollProgress;
        } else {
          group.rotation.y += 0.005;
          group.children[0].rotation.x += 0.002;
        }
      }
      renderer.render(scene, camera);
    })();

    if (scrollDriven) {
      wireScroll(host, function (p) { scrollProgress = p; });
    }
    defineCCS3D().registerScene(host, {
      get scene() { return scene; },
      get camera() { return camera; },
      get group() { return group; },
      get renderer() { return renderer; }
    });

    window.addEventListener("pagehide", function () {
      disposed = true;
      renderer.dispose();
      if (window.CCS3D) window.CCS3D.unregisterScene(host);
    }, { once: true });
  }

  CCS.experience = { start: start, showFallback: showFallback };
})();
