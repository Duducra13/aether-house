/* ============================================================
   AETHER HOUSE — Procedural Architectural 3D Scene
   Builds a modern villa using Three.js geometry.
   Replaces the demo torus knot with real architectural forms.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  console.log("[AH-3D] IIFE running, CCS=" + typeof CCS + ", hasWebGL=" + (CCS ? CCS.hasWebGL() : "N/A"));
  if (!CCS || !CCS.hasWebGL()) return;

  var isReduced = CCS.features.reduced;

  function createScene(host, THREE) {
    /* Always create a fresh canvas to avoid conflicts with CCS.experience */
    var old = host.querySelector("canvas");
    if (old) old.remove();
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    var renderer, scene, camera, clock;
    var building, scrollProgress = 0;
    var scrollDriven = host.hasAttribute("data-scroll-stage");
    var drag = { active: false, last: 0, rotY: 0, targetRotY: 0 };
    var disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      var fb = host.querySelector("[data-fallback]");
      if (fb) fb.removeAttribute("hidden");
      host.classList.add("is-fallback");
      return;
    }

    renderer.setPixelRatio(CCS.clampDPR());
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = !isReduced;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0b09);
    scene.fog = new THREE.FogExp2(0x0c0b09, 0.04);

    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(8, 4, 10);
    camera.lookAt(0, 1.5, 0);

    /* Lighting */
    var hemi = new THREE.HemisphereLight(0xf0ece4, 0x161412, 0.6);
    scene.add(hemi);

    var key = new THREE.DirectionalLight(0xfff5e6, 2.0);
    key.position.set(6, 10, 8);
    key.castShadow = !isReduced;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.camera.left = -10;
    key.shadow.camera.right = 10;
    key.shadow.camera.top = 10;
    key.shadow.camera.bottom = -10;
    key.shadow.bias = -0.002;
    scene.add(key);

    var fill = new THREE.DirectionalLight(0xc9a96e, 0.5);
    fill.position.set(-4, 3, -6);
    scene.add(fill);

    var rim = new THREE.PointLight(0xc9a96e, 0.8, 20);
    rim.position.set(-3, 5, 4);
    scene.add(rim);

    /* Materials */
    var concrete = new THREE.MeshStandardMaterial({
      color: 0x2a2722,
      roughness: 0.85,
      metalness: 0.05
    });

    var darkConcrete = new THREE.MeshStandardMaterial({
      color: 0x1e1c18,
      roughness: 0.9,
      metalness: 0.02
    });

    var glass = new THREE.MeshPhysicalMaterial({
      color: 0x8a9aa8,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.7,
      thickness: 0.1,
      transparent: true,
      opacity: 0.6
    });

    var wood = new THREE.MeshStandardMaterial({
      color: 0x6b5240,
      roughness: 0.7,
      metalness: 0.0
    });

    var accent = new THREE.MeshStandardMaterial({
      color: 0xc9a96e,
      roughness: 0.3,
      metalness: 0.6
    });

    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x161412,
      roughness: 0.95,
      metalness: 0.0
    });

    /* Ground plane */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    /* Building group */
    building = new THREE.Group();

    /* Main volume — lower block */
    var mainBody = new THREE.Mesh(
      new THREE.BoxGeometry(6, 2.2, 4),
      concrete
    );
    mainBody.position.set(0, 1.1, 0);
    mainBody.castShadow = true;
    mainBody.receiveShadow = true;
    building.add(mainBody);

    /* Upper volume — cantilevered */
    var upperBlock = new THREE.Mesh(
      new THREE.BoxGeometry(5, 1.8, 3.5),
      darkConcrete
    );
    upperBlock.position.set(-0.5, 3.1, 0.25);
    upperBlock.castShadow = true;
    upperBlock.receiveShadow = true;
    building.add(upperBlock);

    /* Cantilever overhang */
    var overhang = new THREE.Mesh(
      new THREE.BoxGeometry(3.5, 0.15, 4.5),
      concrete
    );
    overhang.position.set(1.5, 2.25, 0);
    overhang.castShadow = true;
    building.add(overhang);

    /* Glass curtain wall — lower */
    var glassWall1 = new THREE.Mesh(
      new THREE.PlaneGeometry(4.5, 2),
      glass
    );
    glassWall1.position.set(0.5, 1.1, 2.01);
    building.add(glassWall1);

    /* Glass curtain wall — upper */
    var glassWall2 = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 1.6),
      glass
    );
    glassWall2.position.set(-0.5, 3.1, 2.01);
    building.add(glassWall2);

    /* Wood accent panels */
    var panel1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 2, 3.8),
      wood
    );
    panel1.position.set(-3.01, 1.1, 0);
    panel1.castShadow = true;
    building.add(panel1);

    var panel2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 1.6, 3.2),
      wood
    );
    panel2.position.set(-2.01, 3.1, 0.25);
    panel2.castShadow = true;
    building.add(panel2);

    /* Gold accent strip */
    var strip = new THREE.Mesh(
      new THREE.BoxGeometry(6.02, 0.06, 0.06),
      accent
    );
    strip.position.set(0, 2.2, 2.03);
    building.add(strip);

    /* Upper accent strip */
    var strip2 = new THREE.Mesh(
      new THREE.BoxGeometry(5.02, 0.04, 0.04),
      accent
    );
    strip2.position.set(-0.5, 4.0, 2.03);
    building.add(strip2);

    /* Pool / water feature */
    var pool = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.05, 1.5),
      new THREE.MeshPhysicalMaterial({
        color: 0x1a3040,
        roughness: 0.0,
        metalness: 0.2,
        transmission: 0.4,
        transparent: true,
        opacity: 0.7
      })
    );
    pool.position.set(2.5, 0.02, 3);
    pool.receiveShadow = true;
    building.add(pool);

    /* Pool edge */
    var poolEdge = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.12, 1.7),
      concrete
    );
    poolEdge.position.set(2.5, -0.02, 3);
    poolEdge.receiveShadow = true;
    building.add(poolEdge);

    /* Landscape elements — low hedges */
    var hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x2d3a28,
      roughness: 0.9,
      metalness: 0.0
    });

    for (var i = 0; i < 3; i++) {
      var hedge = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.6),
        hedgeMat
      );
      hedge.position.set(-4 + i * 0.9, 0.25, 3.5);
      hedge.castShadow = true;
      building.add(hedge);
    }

    /* Stepping stones */
    for (var j = 0; j < 4; j++) {
      var stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.04, 0.5),
        new THREE.MeshStandardMaterial({ color: 0x3a3730, roughness: 0.8 })
      );
      stone.position.set(2 + j * 0.8, 0.02, 4.5 + j * 0.3);
      stone.receiveShadow = true;
      building.add(stone);
    }

    scene.add(building);

    /* Clock */
    clock = new THREE.Clock();

    /* Resize handler */
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

    /* Hide loading */
    var loadingEl = host.querySelector(".shell__loading");
    if (loadingEl) loadingEl.style.display = "none";

    /* Drag controls */
    function onDown(e) {
      drag.active = true;
      drag.last = e.touches ? e.touches[0].clientX : e.clientX;
    }
    function onMove(e) {
      if (!drag.active) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      drag.targetRotY += (x - drag.last) * 0.008;
      drag.last = x;
    }
    function onUp() { drag.active = false; }

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    /* Scroll-driven camera */
    function wireScroll() {
      if (window.ScrollTrigger && window.gsap) {
        window.ScrollTrigger.create({
          trigger: host,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.8,
          onUpdate: function (self) { scrollProgress = self.progress; }
        });
        return;
      }
      function update() {
        var r = host.getBoundingClientRect();
        var vh = window.innerHeight || document.documentElement.clientHeight;
        var total = host.offsetHeight + vh;
        scrollProgress = Math.max(0, Math.min(1, (vh - r.top) / total));
      }
      window.addEventListener("scroll", update, { passive: true });
      window.addEventListener("resize", update, { passive: true });
      update();
    }
    if (scrollDriven) wireScroll();

    /* Animation loop */
    (function tick() {
      if (disposed) return;
      requestAnimationFrame(tick);
      var t = clock.getElapsedTime();

      if (building) {
        /* Smooth drag rotation */
        drag.rotY += (drag.targetRotY - drag.rotY) * 0.08;
        if (!drag.active) drag.targetRotY *= 0.95;

        if (scrollDriven) {
          /* Scroll-driven camera orbit */
          var angle = scrollProgress * Math.PI * 0.6;
          var radius = 12 - scrollProgress * 4;
          camera.position.x = Math.sin(angle) * radius;
          camera.position.z = Math.cos(angle) * radius;
          camera.position.y = 4 - scrollProgress * 2;
          camera.lookAt(0, 1.5, 0);
          building.rotation.y = drag.rotY;
        } else {
          /* Auto-rotate + drag */
          if (!isReduced && !drag.active) {
            drag.targetRotY += 0.002;
          }
          building.rotation.y = drag.rotY;
        }

        /* Subtle float */
        building.position.y = Math.sin(t * 0.5) * 0.03;
      }

      renderer.render(scene, camera);
    })();

    /* Cleanup */
    window.addEventListener("pagehide", function () {
      disposed = true;
      if (renderer) renderer.dispose();
    }, { once: true });
  }

  /* Load Three.js via CCS module loader (vendor local → CDN fallback) */
  function loadThreeJS() {
    if (window.THREE) return Promise.resolve(window.THREE);
    var LOCAL = "assets/js/vendor/three-all.module.js";
    var CDN = "https://cdn.jsdelivr.net/npm/three@0.160.0/+esm";
    return CCS.loadModule(LOCAL).then(function (m) {
      if (m.THREE) return m.THREE;
      throw new Error("bundle incompleto");
    }).catch(function () {
      return CCS.loadModule(CDN).then(function (m) { return m; });
    });
  }

  /* Boot when DOM ready */
  function boot() {
    console.log("[AH-3D] boot() called, CCS=" + typeof CCS);
    var hosts = document.querySelectorAll('[data-engine="3d"][data-architectural]');
    console.log("[AH-3D] found " + hosts.length + " architectural shells");
    hosts.forEach(function (host) {
      console.log("[AH-3D] loading Three.js...");
      loadThreeJS().then(function (THREE) {
        console.log("[AH-3D] Three.js loaded, version=" + THREE.REVISION);
        createScene(host, THREE);
        console.log("[AH-3D] createScene completed");
      }).catch(function (e) {
        console.warn("[AH-3D] FAILED: " + (e && e.message));
        var fb = host.querySelector("[data-fallback]");
        if (fb) fb.removeAttribute("hidden");
        host.classList.add("is-fallback");
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
