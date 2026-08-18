/* ============================================================
   AETHER HOUSE — Procedural Architectural 3D Scene
   Premium modern villa with Tadao Ando / Kengo Kuma aesthetics.
   Concrete, glass, wood, gold — built entirely from Three.js geometry.
   ============================================================ */
(function () {
  "use strict";

  var CCS = window.CCS;
  if (!CCS || !CCS.hasWebGL()) return;

  var isReduced = CCS.features.reduced;

  function createScene(host, THREE) {
    var old = host.querySelector("canvas");
    if (old) old.remove();
    var canvas = document.createElement("canvas");
    host.appendChild(canvas);

    var renderer, scene, camera, clock;
    var building, scrollProgress = 0;
    var scrollDriven = host.hasAttribute("data-scroll-stage");
    var drag = { active: false, last: 0, rotY: 0, targetRotY: 0 };
    var disposed = false;
    var mouseNorm = { x: 0, y: 0 };

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
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = !isReduced;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f2ed);
    scene.fog = new THREE.FogExp2(0xf5f2ed, 0.018);

    camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
    camera.position.set(9, 5.5, 11);
    camera.lookAt(0, 1.8, 0);

    /* --------------------------------------------------------
       PROCEDURAL TEXTURES
       -------------------------------------------------------- */
    function makeCanvasTexture(w, h, draw) {
      var c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      var ctx = c.getContext("2d");
      draw(ctx, w, h);
      var tex = new THREE.CanvasTexture(c);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      return tex;
    }

    var concreteMap = makeCanvasTexture(512, 512, function (ctx, w, h) {
      var img = ctx.createImageData(w, h);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        var v = 140 + (Math.random() - 0.5) * 30;
        var px = (i / 4) % w;
        var py = Math.floor((i / 4) / w);
        var streak = Math.sin(px * 0.02 + py * 0.15) * 8;
        v += streak;
        d[i] = v;
        d[i + 1] = v - 2;
        d[i + 2] = v - 5;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
      ctx.fillStyle = "rgba(0,0,0,0.04)";
      for (var i = 0; i < 200; i++) {
        var rx = Math.random() * w;
        var ry = Math.random() * h;
        ctx.fillRect(rx, ry, 1 + Math.random() * 2, 1);
      }
    });
    concreteMap.repeat.set(3, 3);

    var concreteNormal = makeCanvasTexture(256, 256, function (ctx, w, h) {
      var img = ctx.createImageData(w, h);
      var d = img.data;
      for (var i = 0; i < d.length; i += 4) {
        d[i] = 128 + (Math.random() - 0.5) * 16;
        d[i + 1] = 128 + (Math.random() - 0.5) * 16;
        d[i + 2] = 230;
        d[i + 3] = 255;
      }
      ctx.putImageData(img, 0, 0);
    });
    concreteNormal.wrapS = concreteNormal.wrapT = THREE.RepeatWrapping;
    concreteNormal.repeat.set(3, 3);

    var woodMap = makeCanvasTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = "#5a4333";
      ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < 80; i++) {
        var y = Math.random() * h;
        ctx.strokeStyle = "rgba(30,20,12," + (0.15 + Math.random() * 0.25) + ")";
        ctx.lineWidth = 0.5 + Math.random() * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        var cx = 0;
        while (cx < w) {
          cx += 10 + Math.random() * 20;
          ctx.lineTo(cx, y + (Math.random() - 0.5) * 3);
        }
        ctx.stroke();
      }
    });
    woodMap.repeat.set(2, 2);

    /* --------------------------------------------------------
       MATERIALS
       -------------------------------------------------------- */
    var concrete = new THREE.MeshStandardMaterial({
      map: concreteMap,
      normalMap: concreteNormal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      roughness: 0.82,
      metalness: 0.04,
      color: 0x9a9590
    });

    var darkConcrete = new THREE.MeshStandardMaterial({
      map: concreteMap,
      normalMap: concreteNormal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughness: 0.88,
      metalness: 0.02,
      color: 0x7a7570
    });

    var lightConcrete = new THREE.MeshStandardMaterial({
      map: concreteMap,
      roughness: 0.78,
      metalness: 0.03,
      color: 0xb0aaa4
    });

    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x8899aa,
      roughness: 0.04,
      metalness: 0.08,
      transmission: 0.8,
      thickness: 0.15,
      ior: 1.45,
      transparent: true,
      opacity: 0.45,
      envMapIntensity: 1.2
    });

    var glassTinted = new THREE.MeshPhysicalMaterial({
      color: 0x99aabb,
      roughness: 0.03,
      metalness: 0.1,
      transmission: 0.75,
      thickness: 0.12,
      ior: 1.5,
      transparent: true,
      opacity: 0.4
    });

    var woodMat = new THREE.MeshStandardMaterial({
      map: woodMap,
      roughness: 0.65,
      metalness: 0.0,
      color: 0xb09570
    });

    var darkWood = new THREE.MeshStandardMaterial({
      map: woodMap,
      roughness: 0.7,
      metalness: 0.0,
      color: 0x7a6550
    });

    var goldAccent = new THREE.MeshStandardMaterial({
      color: 0xc9a96e,
      roughness: 0.22,
      metalness: 0.75
    });

    var warmLightMat = new THREE.MeshStandardMaterial({
      color: 0xffcc77,
      emissive: 0xffaa44,
      emissiveIntensity: 2.0,
      roughness: 0.5,
      metalness: 0.0
    });

    var coolLightMat = new THREE.MeshStandardMaterial({
      color: 0xeeddcc,
      emissive: 0xddccaa,
      emissiveIntensity: 1.5,
      roughness: 0.5,
      metalness: 0.0
    });

    var groundMat = new THREE.MeshStandardMaterial({
      color: 0x8a8580,
      roughness: 0.95,
      metalness: 0.0
    });

    var stonePathMat = new THREE.MeshStandardMaterial({
      color: 0x9a9590,
      roughness: 0.85,
      metalness: 0.02
    });

    var hedgeMat = new THREE.MeshStandardMaterial({
      color: 0x5a7a4a,
      roughness: 0.92,
      metalness: 0.0
    });

    var grassMat = new THREE.MeshStandardMaterial({
      color: 0x4a6a3a,
      roughness: 0.95,
      metalness: 0.0
    });

    var waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x3388aa,
      roughness: 0.0,
      metalness: 0.15,
      transmission: 0.5,
      thickness: 0.4,
      transparent: true,
      opacity: 0.8
    });

    var interiorWall = new THREE.MeshStandardMaterial({
      color: 0xddd8d0,
      roughness: 0.9,
      metalness: 0.0
    });

    var sofaMat = new THREE.MeshStandardMaterial({
      color: 0x8a8078,
      roughness: 0.75,
      metalness: 0.0
    });

    var tableMat = new THREE.MeshStandardMaterial({
      map: woodMap,
      color: 0xa08a70,
      roughness: 0.5,
      metalness: 0.05
    });

    var rugMat = new THREE.MeshStandardMaterial({
      color: 0x7a7068,
      roughness: 0.95,
      metalness: 0.0
    });

    var terraceFloorMat = new THREE.MeshStandardMaterial({
      color: 0x9a9590,
      roughness: 0.75,
      metalness: 0.02,
      map: concreteMap
    });

    /* --------------------------------------------------------
       GROUND
       -------------------------------------------------------- */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      groundMat
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    var grassPatch = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 16),
      grassMat
    );
    grassPatch.rotation.x = -Math.PI / 2;
    grassPatch.position.set(-1, 0.005, 0);
    grassPatch.receiveShadow = true;
    scene.add(grassPatch);

    /* --------------------------------------------------------
       BUILDING GROUP
       -------------------------------------------------------- */
    building = new THREE.Group();

    /* -- Helper: add mesh to building with shadow ---------- */
    function bAdd(geo, mat, x, y, z, shadow, receive) {
      var m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (shadow) m.castShadow = true;
      if (receive !== false) m.receiveShadow = true;
      building.add(m);
      return m;
    }

    /* --------------------------------------------------------
       MAIN GROUND FLOOR VOLUME
       -------------------------------------------------------- */
    bAdd(new THREE.BoxGeometry(7, 2.6, 5), darkConcrete, 0, 1.3, 0, true);

    /* Recessed entry porch (carved into main volume) */
    bAdd(new THREE.BoxGeometry(2.2, 2.6, 5.02), darkConcrete, 0, 1.3, 0, false);

    /* Back wall (solid) */
    bAdd(new THREE.BoxGeometry(7.02, 2.6, 0.15), concrete, 0, 1.3, -2.5, true);

    /* Left wall (solid with window cutout feel — slightly inset) */
    bAdd(new THREE.BoxGeometry(0.15, 2.6, 5), concrete, -3.5, 1.3, 0, true);

    /* Right wall lower portion (solid base below glass) */
    bAdd(new THREE.BoxGeometry(0.15, 0.6, 5), concrete, 3.5, 0.3, 0, true);

    /* Front lower parapet (concrete base below glass) */
    bAdd(new THREE.BoxGeometry(7, 0.5, 0.15), concrete, 0, 0.25, 2.5, true);

    /* Front glass curtain wall — ground floor (3 panes) */
    var glassPaneW = 1.4;
    for (var gp = 0; gp < 3; gp++) {
      if (gp === 1) continue;
      bAdd(
        new THREE.BoxGeometry(glassPaneW, 1.9, 0.06),
        gp === 0 ? glassMat : glassTinted,
        -2.1 + gp * (glassPaneW + 0.15), 1.55, 2.5
      );
    }

    /* Large glass pane (center) */
    bAdd(new THREE.BoxGeometry(1.8, 1.9, 0.06), glassMat, 0, 1.55, 2.5);

    /* Narrow glass beside entry */
    bAdd(new THREE.BoxGeometry(0.8, 1.9, 0.06), glassTinted, 1.65, 1.55, 2.5);

    /* Right side glass wall — ground floor */
    bAdd(new THREE.BoxGeometry(0.06, 1.9, 3.5), glassMat, 3.5, 1.55, -0.5);

    /* Glass partition between entry and main room */
    bAdd(new THREE.BoxGeometry(0.05, 2.4, 2.8), glassTinted, -1.0, 1.2, -0.2);

    /* --------------------------------------------------------
       UPPER VOLUME — cantilevered forward
       -------------------------------------------------------- */
    bAdd(new THREE.BoxGeometry(6, 2.2, 4.5), concrete, -0.3, 3.7, 0.5, true);

    /* Upper left wall */
    bAdd(new THREE.BoxGeometry(0.15, 2.2, 4.5), concrete, -3.3, 3.7, 0.5, true);

    /* Upper back wall */
    bAdd(new THREE.BoxGeometry(6.02, 2.2, 0.15), darkConcrete, -0.3, 3.7, -1.75, true);

    /* Upper right wall (partial) */
    bAdd(new THREE.BoxGeometry(0.15, 2.2, 2.5), concrete, 2.7, 3.7, -0.5, true);

    /* Upper front glass wall — large panoramic */
    bAdd(new THREE.BoxGeometry(5.2, 1.7, 0.06), glassMat, -0.3, 3.95, 2.75);

    /* Upper side glass (right) */
    bAdd(new THREE.BoxGeometry(0.06, 1.7, 1.8), glassTinted, 2.7, 3.95, 1.65);

    /* --------------------------------------------------------
       CANTILEVER / OVERHANG
       -------------------------------------------------------- */
    bAdd(new THREE.BoxGeometry(4, 0.18, 5.2), concrete, 0.5, 2.6, 0.5, true);

    /* Cantilever underside accent strip */
    bAdd(new THREE.BoxGeometry(3.6, 0.03, 4.8), goldAccent, 0.5, 2.51, 0.5);

    /* --------------------------------------------------------
       ROOF / TERRACE
       -------------------------------------------------------- */
    bAdd(new THREE.BoxGeometry(6.2, 0.15, 4.8), concrete, -0.3, 4.82, 0.5, true);
    bAdd(new THREE.BoxGeometry(6.4, 0.12, 5), darkConcrete, -0.3, 4.88, 0.5, true);

    /* Roof terrace floor (slightly raised parapet feel) */
    bAdd(new THREE.BoxGeometry(5.8, 0.06, 4.4), terraceFloorMat, -0.3, 4.96, 0.5);

    /* Terrace glass railing (front) */
    bAdd(new THREE.BoxGeometry(5, 0.6, 0.04), glassTinted, -0.3, 5.26, 2.7);

    /* Terrace railing top rail (gold) */
    bAdd(new THREE.BoxGeometry(5.1, 0.035, 0.035), goldAccent, -0.3, 5.58, 2.7);

    /* Terrace glass railing (side) */
    bAdd(new THREE.BoxGeometry(0.04, 0.6, 1.8), glassTinted, 2.7, 5.26, 1.8);

    /* Side rail top */
    bAdd(new THREE.BoxGeometry(0.035, 0.035, 1.9), goldAccent, 2.7, 5.58, 1.8);

    /* --------------------------------------------------------
       CONCRETE COLUMNS
       -------------------------------------------------------- */
    var colGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.6, 12);
    var colPositions = [
      [3.2, 1.3, 2.3],
      [3.2, 1.3, -1.5],
      [-3.2, 1.3, 2.3],
      [-3.2, 1.3, -1.5]
    ];
    for (var ci = 0; ci < colPositions.length; ci++) {
      var cp = colPositions[ci];
      bAdd(colGeo, lightConcrete, cp[0], cp[1], cp[2], true);
    }

    /* Upper columns */
    var colGeoUp = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 10);
    var colPosUp = [
      [2.4, 3.7, 2.5],
      [2.4, 3.7, -1.3],
      [-2.9, 3.7, 2.5],
      [-2.9, 3.7, -1.3]
    ];
    for (var ci2 = 0; ci2 < colPosUp.length; ci2++) {
      var cp2 = colPosUp[ci2];
      bAdd(colGeoUp, lightConcrete, cp2[0], cp2[1], cp2[2], true);
    }

    /* --------------------------------------------------------
       WOOD SLAT ACCENTS (Kengo Kuma style)
       -------------------------------------------------------- */
    function addWoodSlats(x, y, z, count, slatH, gap, rotY) {
      var slatGeo = new THREE.BoxGeometry(0.04, slatH, 0.06);
      var group = new THREE.Group();
      for (var i = 0; i < count; i++) {
        var s = new THREE.Mesh(slatGeo, woodMat);
        s.position.set(0, 0, (i - (count - 1) / 2) * gap);
        s.castShadow = true;
        group.add(s);
      }
      group.position.set(x, y, z);
      group.rotation.y = rotY || 0;
      building.add(group);
    }

    /* Left facade vertical wood slats */
    addWoodSlats(-3.58, 1.3, 0, 14, 2.2, 0.32, 0);

    /* Upper left wood slats */
    addWoodSlats(-3.38, 3.7, 0.5, 10, 1.8, 0.42, 0);

    /* Front horizontal wood louvers (above ground floor glass) */
    var louverCount = 12;
    var louverGeo = new THREE.BoxGeometry(6.5, 0.05, 0.12);
    for (var li = 0; li < louverCount; li++) {
      var louver = new THREE.Mesh(louverGeo, woodMat);
      louver.position.set(0, 2.7 + li * 0.08, 2.55);
      louver.castShadow = true;
      building.add(louver);
    }

    /* --------------------------------------------------------
       GOLD ACCENT STRIPS
       -------------------------------------------------------- */
    bAdd(new THREE.BoxGeometry(7.04, 0.045, 0.045), goldAccent, 0, 2.6, 2.53);
    bAdd(new THREE.BoxGeometry(6.04, 0.035, 0.035), goldAccent, -0.3, 4.82, 2.77);
    bAdd(new THREE.BoxGeometry(0.035, 2.6, 0.035), goldAccent, -3.52, 1.3, 2.52);
    bAdd(new THREE.BoxGeometry(0.035, 2.2, 0.035), goldAccent, -3.32, 3.7, 2.77);

    /* --------------------------------------------------------
       INTERIOR FURNITURE (visible through glass)
       -------------------------------------------------------- */
    var interiorGroup = new THREE.Group();
    interiorGroup.position.set(0, 0, 0);

    /* Ground floor living area — sofa */
    var sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.35, 0.8), sofaMat);
    sofaBase.position.set(0.5, 0.18, 0.5);
    sofaBase.castShadow = true;
    interiorGroup.add(sofaBase);

    var sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 0.12), sofaMat);
    sofaBack.position.set(0.5, 0.55, 0.12);
    interiorGroup.add(sofaBack);

    var sofaArmL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.8), sofaMat);
    sofaArmL.position.set(-0.54, 0.5, 0.5);
    interiorGroup.add(sofaArmL);

    var sofaArmR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.8), sofaMat);
    sofaArmR.position.set(1.54, 0.5, 0.5);
    interiorGroup.add(sofaArmR);

    /* Sofa cushions */
    var cushionMat = new THREE.MeshStandardMaterial({ color: 0x4a4540, roughness: 0.8 });
    for (var sci = 0; sci < 2; sci++) {
      var cushion = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.6), cushionMat);
      cushion.position.set(-0.15 + sci * 1.1, 0.41, 0.5);
      interiorGroup.add(cushion);
    }

    /* Coffee table */
    var tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.6), tableMat);
    tableTop.position.set(0.5, 0.42, 1.3);
    tableTop.castShadow = true;
    interiorGroup.add(tableTop);

    var tableLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.38, 6);
    var tableLegs = [[0, 0.21, 1.05], [1.0, 0.21, 1.05], [0, 0.21, 1.55], [1.0, 0.21, 1.55]];
    for (var tli = 0; tli < tableLegs.length; tli++) {
      var tl = tableLegs[tli];
      var leg = new THREE.Mesh(tableLegGeo, tableMat);
      leg.position.set(tl[0], tl[1], tl[2]);
      interiorGroup.add(leg);
    }

    /* Area rug */
    var rug = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.02, 2.0), rugMat);
    rug.position.set(0.5, 0.01, 0.9);
    interiorGroup.add(rug);

    /* Floor lamp */
    var lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.6, 8), goldAccent);
    lampPole.position.set(-1.8, 0.8, 0.3);
    interiorGroup.add(lampPole);

    var lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.04, 12), goldAccent);
    lampBase.position.set(-1.8, 0.02, 0.3);
    interiorGroup.add(lampBase);

    var lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.1, 0.2, 12, 1, true), warmLightMat);
    lampShade.position.set(-1.8, 1.68, 0.3);
    interiorGroup.add(lampShade);

    /* Second floor — dining table visible */
    var diningTable = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.8), tableMat);
    diningTable.position.set(-0.3, 2.65, 0.8);
    diningTable.castShadow = true;
    interiorGroup.add(diningTable);

    var dtLegGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.7, 6);
    var dtLegs = [[-0.9, 3.0, 0.45], [0.3, 3.0, 0.45], [-0.9, 3.0, 1.15], [0.3, 3.0, 1.15]];
    for (var dti = 0; dti < dtLegs.length; dti++) {
      var dl = dtLegs[dti];
      var dtLeg = new THREE.Mesh(dtLegGeo, tableMat);
      dtLeg.position.set(dl[0], dl[1], dl[2]);
      interiorGroup.add(dtLeg);
    }

    /* Chairs around dining table */
    var chairMat = darkWood;
    var chairPositions = [
      [-0.7, 2.75, 0.3], [0.1, 2.75, 0.3],
      [-0.7, 2.75, 1.3], [0.1, 2.75, 1.3]
    ];
    for (var chi = 0; chi < chairPositions.length; chi++) {
      var ch = chairPositions[chi];
      var chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), chairMat);
      chairSeat.position.set(ch[0], ch[1], ch[2]);
      interiorGroup.add(chairSeat);
      var chairBack2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.03), chairMat);
      var backZ = ch[2] < 0.8 ? ch[2] - 0.14 : ch[2] + 0.14;
      chairBack2.position.set(ch[0], ch[1] + 0.16, backZ);
      interiorGroup.add(chairBack2);
    }

    /* Interior back wall (ground floor) */
    var ibWall = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.4, 0.1), interiorWall);
    ibWall.position.set(0, 1.2, -2.35);
    interiorGroup.add(ibWall);

    /* Interior floor */
    var iFloor = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.08, 4.8), new THREE.MeshStandardMaterial({
      color: 0x2a2520, roughness: 0.4, metalness: 0.05
    }));
    iFloor.position.set(0, 0.04, 0);
    interiorGroup.add(iFloor);

    /* Upper floor slab */
    var upperSlab = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.15, 4.2), concrete);
    upperSlab.position.set(-0.3, 2.6, 0.4);
    interiorGroup.add(upperSlab);

    building.add(interiorGroup);

    /* --------------------------------------------------------
       SWIMMING POOL
       -------------------------------------------------------- */
    /* Pool basin */
    var poolOuter = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 0.5, 2.2),
      lightConcrete
    );
    poolOuter.position.set(4.5, 0.15, 0);
    poolOuter.receiveShadow = true;
    poolOuter.castShadow = true;
    building.add(poolOuter);

    /* Pool interior walls */
    var poolInner = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.45, 1.9),
      new THREE.MeshStandardMaterial({ color: 0x1a1815, roughness: 0.3, metalness: 0.1 })
    );
    poolInner.position.set(4.5, 0.2, 0);
    building.add(poolInner);

    /* Water surface */
    var waterGeo = new THREE.PlaneGeometry(4.1, 1.8, 32, 32);
    var water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(4.5, 0.38, 0);
    water.receiveShadow = true;
    building.add(water);

    /* Pool edge cap (gold trim) */
    bAdd(new THREE.BoxGeometry(4.6, 0.035, 0.035), goldAccent, 4.5, 0.42, 1.1);
    bAdd(new THREE.BoxGeometry(4.6, 0.035, 0.035), goldAccent, 4.5, 0.42, -1.1);
    bAdd(new THREE.BoxGeometry(0.035, 0.035, 2.2), goldAccent, 2.25, 0.42, 0);
    bAdd(new THREE.BoxGeometry(0.035, 0.035, 2.2), goldAccent, 6.75, 0.42, 0);

    /* Pool light glow (underwater) */
    var poolLight = new THREE.PointLight(0x44aadd, 2.5, 8);
    poolLight.position.set(4.5, 0.1, 0);
    building.add(poolLight);

    /* --------------------------------------------------------
       LANDSCAPE — PATHWAY
       -------------------------------------------------------- */
    var pathPositions = [
      [1.0, 3.8], [1.6, 4.5], [2.0, 5.2],
      [2.6, 5.8], [3.2, 6.4], [3.6, 7.0]
    ];
    var pathStoneGeo = new THREE.BoxGeometry(0.55, 0.05, 0.55);
    for (var psi = 0; psi < pathPositions.length; psi++) {
      var ps = pathPositions[psi];
      var stone = new THREE.Mesh(pathStoneGeo, stonePathMat);
      stone.position.set(ps[0], 0.03, ps[1]);
      stone.rotation.y = Math.random() * 0.4 - 0.2;
      stone.receiveShadow = true;
      building.add(stone);
    }

    /* --------------------------------------------------------
       LANDSCAPE — TREES
       -------------------------------------------------------- */
    function addTree(x, z, trunkH, crownR, crownH) {
      var trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, trunkH, 8),
        darkWood
      );
      trunk.position.set(x, trunkH / 2, z);
      trunk.castShadow = true;
      building.add(trunk);

      var crown = new THREE.Mesh(
        new THREE.ConeGeometry(crownR, crownH, 10),
        hedgeMat
      );
      crown.position.set(x, trunkH + crownH * 0.4, z);
      crown.castShadow = true;
      building.add(crown);
    }

    addTree(-5.5, -2, 2.5, 1.0, 2.0);
    addTree(-6.5, 1, 2.0, 0.8, 1.8);
    addTree(7, -2.5, 1.8, 0.7, 1.6);
    addTree(6.5, 3, 2.2, 0.9, 1.9);
    addTree(-5, 4, 1.6, 0.65, 1.4);
    addTree(8, 0, 2.4, 0.85, 2.0);

    /* --------------------------------------------------------
       LANDSCAPE — GARDEN BEDS & HEDGES
       -------------------------------------------------------- */
    /* Raised garden bed (left side) */
    bAdd(new THREE.BoxGeometry(2.5, 0.35, 1.2), concrete, -4.5, 0.17, -1, true);

    /* Plants in garden bed */
    var plantGeo = new THREE.SphereGeometry(0.18, 6, 6);
    for (var pi = 0; pi < 8; pi++) {
      var plant = new THREE.Mesh(plantGeo, hedgeMat);
      plant.position.set(
        -3.8 + (Math.random() - 0.5) * 2.2,
        0.5 + Math.random() * 0.15,
        -1 + (Math.random() - 0.5) * 0.9
      );
      plant.scale.y = 0.6 + Math.random() * 0.5;
      plant.castShadow = true;
      building.add(plant);
    }

    /* Hedge row along front */
    var hedgeGeo = new THREE.BoxGeometry(0.7, 0.55, 0.7);
    var hedgePositions = [
      [-5, 0.27, 2.5], [-4.2, 0.27, 2.8],
      [-3.4, 0.27, 3.0]
    ];
    for (var hi = 0; hi < hedgePositions.length; hi++) {
      var hp = hedgePositions[hi];
      var hedge = new THREE.Mesh(hedgeGeo, hedgeMat);
      hedge.position.set(hp[0], hp[1], hp[2]);
      hedge.rotation.y = Math.random() * 0.3;
      hedge.castShadow = true;
      building.add(hedge);
    }

    /* --------------------------------------------------------
       LANDSCAPE — STEPPING STONES (pool approach)
       -------------------------------------------------------- */
    var poolPathPositions = [
      [3.5, 2.0], [3.8, 2.6], [4.2, 3.2], [4.5, 3.8]
    ];
    var pStoneGeo = new THREE.BoxGeometry(0.45, 0.04, 0.45);
    for (var ppi = 0; ppi < poolPathPositions.length; ppi++) {
      var pp = poolPathPositions[ppi];
      var pStone = new THREE.Mesh(pStoneGeo, stonePathMat);
      pStone.position.set(pp[0], 0.025, pp[1]);
      pStone.rotation.y = Math.random() * 0.5;
      pStone.receiveShadow = true;
      building.add(pStone);
    }

    /* --------------------------------------------------------
       EXTERIOR LIGHTING FIXTURES
       -------------------------------------------------------- */
    function addExteriorLight(x, y, z) {
      var fixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.06, 0.3, 8),
        goldAccent
      );
      fixture.position.set(x, y, z);
      building.add(fixture);

      var glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        warmLightMat
      );
      glow.position.set(x, y + 0.18, z);
      building.add(glow);

      var pl = new THREE.PointLight(0xffcc88, 0.6, 5);
      pl.position.set(x, y + 0.2, z);
      building.add(pl);
    }

    addExteriorLight(3.5, 0.2, 2.4);
    addExteriorLight(-3.5, 0.2, 2.4);
    addExteriorLight(-3.5, 0.2, -2.4);
    addExteriorLight(3.5, 0.2, -2.4);

    /* --------------------------------------------------------
       INTERIOR LIGHTS (visible warm glow through glass)
       -------------------------------------------------------- */
    var interiorLights = [];

    function addInteriorLight(x, y, z, intensity, color) {
      var pl = new THREE.PointLight(color || 0xffaa66, intensity || 1.2, 10);
      pl.position.set(x, y, z);
      if (!isReduced) pl.castShadow = false;
      building.add(pl);
      interiorLights.push(pl);

      var bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffddaa,
          emissive: color || 0xffaa66,
          emissiveIntensity: 3.0
        })
      );
      bulb.position.set(x, y, z);
      building.add(bulb);
      return pl;
    }

    /* Ground floor main room */
    addInteriorLight(0, 2.2, 0, 2.0, 0xffaa66);
    addInteriorLight(-1.8, 2.2, 0.3, 1.2, 0xffcc88);
    addInteriorLight(1.5, 2.2, 1.0, 1.0, 0xffbb77);

    /* Second floor */
    addInteriorLight(-0.3, 4.5, 0.8, 1.8, 0xffaa66);
    addInteriorLight(1.5, 4.5, -0.5, 0.8, 0xffcc88);

    /* Entry porch */
    addInteriorLight(0, 2.2, 1.8, 1.2, 0xffddaa);

    /* --------------------------------------------------------
       KEY LIGHTING
       -------------------------------------------------------- */
    var ambient = new THREE.AmbientLight(0xfff8f0, 0.4);
    scene.add(ambient);

    var hemi = new THREE.HemisphereLight(0xffffff, 0xb0a898, 1.2);
    scene.add(hemi);

    /* Key light — warm sunlight */
    var key = new THREE.DirectionalLight(0xfff5e8, 2.0);
    key.position.set(8, 14, 6);
    key.castShadow = !isReduced;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 35;
    key.shadow.camera.left = -12;
    key.shadow.camera.right = 12;
    key.shadow.camera.top = 12;
    key.shadow.camera.bottom = -12;
    key.shadow.bias = -0.001;
    key.shadow.radius = 3;
    scene.add(key);

    /* Warm fill from interior direction */
    var fill = new THREE.DirectionalLight(0xffe8cc, 0.8);
    fill.position.set(-3, 4, -5);
    scene.add(fill);

    /* Gold rim light */
    var rim = new THREE.PointLight(0xc9a96e, 1.2, 30);
    rim.position.set(-5, 6, 5);
    scene.add(rim);

    /* Cool accent from opposite side */
    var coolRim = new THREE.PointLight(0x88aadd, 0.6, 25);
    coolRim.position.set(6, 4, -4);
    scene.add(coolRim);

    /* Warm bounce from ground level */
    var bounce = new THREE.PointLight(0xffddaa, 0.6, 12);
    bounce.position.set(0, 0.3, 3);
    scene.add(bounce);

    scene.add(building);

    /* --------------------------------------------------------
       PARTICLES / DUST MOTES
       -------------------------------------------------------- */
    var particles;
    if (!isReduced) {
      var pCount = 60;
      var pGeo = new THREE.BufferGeometry();
      var pPositions = new Float32Array(pCount * 3);
      var pSpeeds = new Float32Array(pCount);
      for (var pi2 = 0; pi2 < pCount; pi2++) {
        pPositions[pi2 * 3] = (Math.random() - 0.5) * 14;
        pPositions[pi2 * 3 + 1] = Math.random() * 6;
        pPositions[pi2 * 3 + 2] = (Math.random() - 0.5) * 14;
        pSpeeds[pi2] = 0.003 + Math.random() * 0.006;
      }
      pGeo.setAttribute("position", new THREE.BufferAttribute(pPositions, 3));
      var pMat = new THREE.PointsMaterial({
        color: 0xc9a96e,
        size: 0.035,
        transparent: true,
        opacity: 0.5,
        sizeAttenuation: true,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      particles = new THREE.Points(pGeo, pMat);
      particles._speeds = pSpeeds;
      scene.add(particles);
    }

    /* --------------------------------------------------------
       CLOCK
       -------------------------------------------------------- */
    clock = new THREE.Clock();

    /* --------------------------------------------------------
       RESIZE HANDLER
       -------------------------------------------------------- */
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

    /* --------------------------------------------------------
       HIDE LOADING
       -------------------------------------------------------- */
    var loadingEl = host.querySelector(".shell__loading");
    if (loadingEl) loadingEl.style.display = "none";

    /* --------------------------------------------------------
       DRAG CONTROLS
       -------------------------------------------------------- */
    function onDown(e) {
      drag.active = true;
      drag.last = e.touches ? e.touches[0].clientX : e.clientX;
    }
    function onMove(e) {
      if (!drag.active) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      drag.targetRotY += (x - drag.last) * 0.006;
      drag.last = x;
    }
    function onUp() { drag.active = false; }

    canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    canvas.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onUp);

    /* Mouse parallax (subtle camera shift) */
    function onMouseParallax(e) {
      mouseNorm.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseNorm.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("mousemove", onMouseParallax, { passive: true });

    /* --------------------------------------------------------
       SCROLL-DRIVEN CAMERA
       -------------------------------------------------------- */
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

    /* --------------------------------------------------------
       ANIMATION LOOP
       -------------------------------------------------------- */
    (function tick() {
      if (disposed) return;
      requestAnimationFrame(tick);
      var t = clock.getElapsedTime();

      if (building) {
        /* Smooth drag rotation */
        drag.rotY += (drag.targetRotY - drag.rotY) * 0.06;
        if (!drag.active) drag.targetRotY *= 0.96;

        if (scrollDriven) {
          var angle = scrollProgress * Math.PI * 0.7;
          var radius = 13 - scrollProgress * 5;
          camera.position.x = Math.sin(angle) * radius;
          camera.position.z = Math.cos(angle) * radius;
          camera.position.y = 5.5 - scrollProgress * 3;
          camera.lookAt(0, 2, 0);
          building.rotation.y = drag.rotY;
        } else {
          if (!isReduced && !drag.active) {
            drag.targetRotY += 0.0015;
          }
          building.rotation.y = drag.rotY;

          /* Parallax camera shift from mouse */
          if (!isReduced) {
            camera.position.x += (mouseNorm.x * 0.8 - camera.position.x + 9) * 0.02;
            camera.position.y += (-mouseNorm.y * 0.3 - camera.position.y + 5.5) * 0.02;
            camera.lookAt(0, 2, 0);
          }
        }

        /* Subtle building float */
        if (!isReduced) {
          building.position.y = Math.sin(t * 0.4) * 0.02;
        }

        /* Water ripple animation */
        if (water && water.geometry && !isReduced) {
          var pos = water.geometry.attributes.position;
          var arr = pos.array;
          for (var wi = 0; wi < pos.count; wi++) {
            var wx = arr[wi * 3];
            var wy = arr[wi * 3 + 1];
            arr[wi * 3 + 2] =
              Math.sin(wx * 2.5 + t * 1.2) * 0.015 +
              Math.cos(wy * 3.0 + t * 0.9) * 0.012 +
              Math.sin((wx + wy) * 1.8 + t * 1.5) * 0.008;
          }
          pos.needsUpdate = true;
          water.geometry.computeVertexNormals();
        }

        /* Interior light subtle flicker */
        if (!isReduced && interiorLights.length > 0) {
          for (var ili = 0; ili < interiorLights.length; ili++) {
            var il = interiorLights[ili];
            var base = il._baseIntensity || il.intensity;
            if (!il._baseIntensity) il._baseIntensity = il.intensity;
            il.intensity = base + Math.sin(t * 1.8 + ili * 2.3) * 0.08 +
                           Math.sin(t * 3.1 + ili * 1.7) * 0.04;
          }
        }

        /* Dust mote drift */
        if (particles && !isReduced) {
          var pArr = particles.geometry.attributes.position.array;
          var spds = particles._speeds;
          for (var di = 0; di < spds.length; di++) {
            pArr[di * 3 + 1] += spds[di];
            pArr[di * 3] += Math.sin(t * 0.3 + di) * 0.001;
            pArr[di * 3 + 2] += Math.cos(t * 0.25 + di * 0.7) * 0.001;
            if (pArr[di * 3 + 1] > 6.5) {
              pArr[di * 3 + 1] = -0.5;
              pArr[di * 3] = (Math.random() - 0.5) * 14;
              pArr[di * 3 + 2] = (Math.random() - 0.5) * 14;
            }
          }
          particles.geometry.attributes.position.needsUpdate = true;
        }
      }

      renderer.render(scene, camera);
    })();

    /* --------------------------------------------------------
       CLEANUP
       -------------------------------------------------------- */
    window.addEventListener("pagehide", function () {
      disposed = true;
      if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
      }
      if (scene) {
        scene.traverse(function (obj) {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(function (m) { m.dispose(); });
            } else {
              obj.material.dispose();
            }
          }
        });
      }
    }, { once: true });
  }

  /* --------------------------------------------------------
     LOAD THREE.JS VIA CCS MODULE LOADER
     -------------------------------------------------------- */
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

  /* --------------------------------------------------------
     BOOT
     -------------------------------------------------------- */
  function boot() {
    var hosts = document.querySelectorAll('[data-engine="3d"][data-architectural]');
    hosts.forEach(function (host) {
      loadThreeJS().then(function (THREE) {
        createScene(host, THREE);
      }).catch(function () {
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
