/* ============================================================
   HERO-NOTEBOOK.JS — Gustavo Wenzel Portfolio
   MacBook 3D decorativo flutuando no hero — inicia após intro
   Three.js r167 | ES module | alpha:true (fundo transparente)
   ============================================================ */

import * as THREE     from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/* ── Aguarda evento da intro (ou skip imediato) ──────────── */
if (document.body.classList.contains('intro-done')) {
  initNotebook();
} else {
  document.body.addEventListener('introDone', initNotebook, { once: true });
}

/* ══════════════════════════════════════════════════════════ */
function initNotebook() {
  const canvas = document.getElementById('hero-notebook-canvas');
  if (!canvas) return;

  /* ── Renderer com fundo transparente ─────────────────── */
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: true, alpha: true
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  /* ── Scene — sem background (transparente) ───────────── */
  const scene = new THREE.Scene();

  /* ── Camera ──────────────────────────────────────────── */
  const camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
  camera.position.set(0, 0.45, 5.2);
  camera.lookAt(0, 0, 0);

  /* ── Luzes simples (sem PMREMGenerator — evita artefatos com alpha) */
  scene.add(new THREE.AmbientLight(0xf0ede8, 0.55));

  const kL = new THREE.DirectionalLight(0xfff5e0, 1.5);
  kL.position.set(-2, 4, 3);
  scene.add(kL);

  const fL = new THREE.DirectionalLight(0xaabbff, 0.25);
  fL.position.set(3, -1, -2);
  scene.add(fL);

  /* ── Mouse ───────────────────────────────────────────── */
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    mx = (e.clientX / innerWidth)  * 2 - 1;
    my = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });

  /* ── Visibilidade ────────────────────────────────────── */
  let visible = true;
  new IntersectionObserver(
    ([e]) => { visible = e.isIntersecting; },
    { threshold: 0.01 }
  ).observe(canvas);

  /* ── Resize ──────────────────────────────────────────── */
  function resize() {
    const w = canvas.clientWidth  || innerWidth  * 0.58;
    const h = canvas.clientHeight || innerHeight;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ── Carrega modelo ──────────────────────────────────── */
  let model = null;
  let tiltX = 0, tiltY = 0;
  const clock = new THREE.Clock();

  const loader = new GLTFLoader();
  loader.load('macbook_pro_13_inch_2020.glb', gltf => {
    model = gltf.scene;

    /* Escala automática */
    const box  = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(2.2 / Math.max(size.x, size.z));

    /* Centraliza */
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.position.y -= 0.08;

    /* Ângulo inicial — levemente de lado */
    model.rotation.y = 0.22;

    /* Substitui a tela (Material.002) por material escuro limpo
       — evita o preview do Sketchfab e o artefato gráfico */
    model.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat, mi) => {
        if (!mat || mat.name !== 'Material.002') return;
        const dark = new THREE.MeshStandardMaterial({
          color:        new THREE.Color(0x07080f),
          roughness:    0.08,
          metalness:    0.0,
          emissive:     new THREE.Color(0x050810),
          emissiveIntensity: 0.3,
        });
        if (Array.isArray(node.material)) node.material[mi] = dark;
        else node.material = dark;
      });
    });

    /* Tampa aberta — metade da animação (peak de abertura) */
    if (gltf.animations.length) {
      const mixer  = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(gltf.animations[0]);
      const dur    = gltf.animations[0].duration;
      action.play();
      mixer.setTime(dur * 0.5);
    }

    scene.add(model);

    /* Inicia render apenas após carregar */
    resize();
    window.addEventListener('resize', resize, { passive: true });
    tick();
  });

  /* ── RAF ─────────────────────────────────────────────── */
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;

    const t = clock.getElapsedTime();

    /* Rotação flutuante */
    model.rotation.y = 0.22 + Math.sin(t * 0.30) * 0.22;

    /* Flutuação vertical */
    model.position.y = -0.08 + Math.sin(t * 0.52) * 0.055;

    /* Mouse tilt suave */
    tiltX += (my * 0.055 - tiltX) * 0.04;
    tiltY += (mx * 0.030 - tiltY) * 0.04;
    model.rotation.x = tiltX;

    /* Câmera deriva levemente */
    camera.position.x += (tiltY * 0.18 - camera.position.x) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
}
