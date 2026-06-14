/* ============================================================
   INTRO.JS — Gustavo Fortes Portfolio
   MacBook fechado → abre lentamente → zoom na tela → revela home
   Three.js r167 | ES module
   ============================================================ */

import * as THREE       from 'three';
import { GLTFLoader }   from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ── DOM ─────────────────────────────────────────────────── */
const overlay  = document.getElementById('intro-overlay');
const skipBtn  = document.getElementById('intro-skip');
const siteWrap = document.getElementById('site-wrap');
if (!overlay || !siteWrap) {
  document.body.classList.add('intro-done');
  document.body.dispatchEvent(new CustomEvent('introDone'));
  throw new Error('[intro] elementos não encontrados');
}

/* ── Skip imediato ──────────────────────────────────────── */
const skipNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches
             || sessionStorage.getItem('gw-intro-seen') === '1';

/* Guarda de chamada única — impede finishIntro() rodar duas vezes */
let _introDone = false;
function finishIntro() {
  if (_introDone) return;
  _introDone = true;
  sessionStorage.setItem('gw-intro-seen', '1');
  overlay.style.opacity = '0';
  siteWrap.classList.add('site--visible');
  overlay.addEventListener('transitionend', () => {
    overlay.remove();
    document.body.classList.add('intro-done');
    document.body.dispatchEvent(new CustomEvent('introDone'));
  }, { once: true });
}

if (skipNow) {
  overlay.remove();
  siteWrap.style.transition = 'none'; // sem transição para visitas repetidas
  siteWrap.classList.add('site--visible');
  document.body.classList.add('intro-done');
  document.body.dispatchEvent(new CustomEvent('introDone'));
} else {
  setTimeout(() => {
    if (skipBtn) { skipBtn.style.opacity = '1'; skipBtn.style.pointerEvents = 'auto'; }
  }, 1200);
  skipBtn?.addEventListener('click', finishIntro);
  runIntro();
}

/* ══════════════════════════════════════════════════════════
   INTRO
══════════════════════════════════════════════════════════ */
function runIntro() {
  /* ── Helpers ──────────────────────────────────────────── */
  const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));
  const inv     = (a, b, v) => clamp((v - a) / (b - a), 0, 1);
  const easeIO  = t => t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeS   = t => -(Math.cos(Math.PI * t) - 1) / 2; // sine ease

  /* ── Renderer ─────────────────────────────────────────── */
  const cv = document.getElementById('intro-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene  = new THREE.Scene();
  scene.background = new THREE.Color(0x060504);
  scene.fog = new THREE.FogExp2(0x060504, 0.14);

  /* ── Camera ───────────────────────────────────────────── */
  const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 100);
  const CAM_A  = new THREE.Vector3(0.1, 0.32, 3.8);  // inicial — afastada
  const CAM_B  = new THREE.Vector3(0,   0.20, 0.55);  // final   — dentro da tela
  const LK_A   = new THREE.Vector3(0, 0.06, 0);
  const LK_B   = new THREE.Vector3(0, 0.22, -0.12);
  camera.position.copy(CAM_A);
  camera.lookAt(LK_A);

  function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  /* ── Ambiente PBR ─────────────────────────────────────── */
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  /* ── Luzes ────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xf0ede8, 0.35));

  const kL = new THREE.DirectionalLight(0xfff0d8, 1.6);
  kL.position.set(-1.5, 3.5, 2.5);
  scene.add(kL);

  const fL = new THREE.DirectionalLight(0xb8ccff, 0.35);
  fL.position.set(3, -1, -2);
  scene.add(fL);

  /* Luz da tela — aparece conforme tela acende */
  const scrLight = new THREE.PointLight(0x6688ff, 0, 2.5);
  scrLight.position.set(0, 0.25, 0.2);
  scene.add(scrLight);

  /* ── Partículas de fundo ──────────────────────────────── */
  const N_PT = 240;
  const ptBuf = new Float32Array(N_PT * 3);
  for (let i = 0; i < N_PT; i++) {
    ptBuf[i*3]   = (Math.random() - .5) * 10;
    ptBuf[i*3+1] = (Math.random() - .5) * 7;
    ptBuf[i*3+2] = (Math.random() - .5) * 5 - 1;
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(ptBuf, 3));
  const ptMat = new THREE.PointsMaterial({
    color: 0xc9a96e, size: 0.016, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false
  });
  scene.add(new THREE.Points(ptGeo, ptMat));

  /* ── Canvas da tela do notebook ───────────────────────── */
  const SW = 960, SH = 600;
  const scrCv = document.createElement('canvas');
  scrCv.width = SW; scrCv.height = SH;
  const sCtx  = scrCv.getContext('2d');

  /* flipY:true (padrão Three.js) corrige o eixo V deste modelo.
     O eixo U está invertido no UV da tela — resolvido com mirror X no drawScreen. */
  const screenTex = new THREE.CanvasTexture(scrCv);
  screenTex.flipY = true;

  let scrBright = 0, typedCh = 0;

  function drawScreen() {
    const s = scrBright;

    /* ── Fundo escuro com brilho central suave ── */
    sCtx.fillStyle = '#080706';
    sCtx.fillRect(0, 0, SW, SH);

    if (s < 0.02) { screenTex.needsUpdate = true; return; }

    /* Glow central muito sutil */
    const gBg = sCtx.createRadialGradient(SW*0.42, SH*0.48, 0, SW*0.42, SH*0.48, SW*0.55);
    gBg.addColorStop(0, `rgba(24,18,10,${0.9*s})`);
    gBg.addColorStop(1, 'transparent');
    sCtx.fillStyle = gBg;
    sCtx.fillRect(0, 0, SW, SH);

    /* Dot grid */
    sCtx.fillStyle = `rgba(255,255,255,${0.028*s})`;
    for (let x = 60; x < SW; x += 60) {
      for (let y = 60; y < SH; y += 60) {
        sCtx.beginPath();
        sCtx.arc(x, y, 0.7, 0, Math.PI*2);
        sCtx.fill();
      }
    }

    /* Nav: GF */
    sCtx.font      = `500 20px "Cormorant Garamond", Georgia, serif`;
    sCtx.textAlign = 'left';
    sCtx.fillStyle = `rgba(240,237,232,${0.7*s})`;
    sCtx.fillText('GF', 48, 44);

    /* Linha nav dourada */
    sCtx.fillStyle = `rgba(201,169,110,${0.28*s})`;
    sCtx.fillRect(0, 60, SW, 0.5);

    /* ── Nome — typewriter ── */
    const LINE_Y = SH * 0.36;
    const FS     = Math.round(SW * 0.092); // ≈ 88px
    const LINE_H = Math.round(SW * 0.100); // ≈ 96px

    /* Gustavo */
    const g7 = Math.min(7, Math.floor(typedCh));
    if (g7 > 0) {
      sCtx.font      = `300 ${FS}px "Cormorant Garamond", Georgia, serif`;
      sCtx.fillStyle = `rgba(240,237,232,${s})`;
      sCtx.textAlign = 'left';
      sCtx.fillText('Gustavo'.slice(0, g7), 48, LINE_Y);
    }

    /* Fortes — dourado itálico */
    const w6 = Math.max(0, Math.min(6, Math.floor(typedCh - 7)));
    if (w6 > 0) {
      sCtx.font      = `300 italic ${FS}px "Cormorant Garamond", Georgia, serif`;
      sCtx.fillStyle = `rgba(201,169,110,${s})`;
      sCtx.fillText('Fortes'.slice(0, w6), 48, LINE_Y + LINE_H);
    }

    /* Cursor piscando */
    const totalChars = 13;
    if (typedCh < totalChars && Math.floor(Date.now()/480) % 2 === 0) {
      const curX = typedCh < 7
        ? 48 + Math.floor(typedCh) * (FS * 0.52)
        : 48 + Math.floor(typedCh - 7) * (FS * 0.55);
      const curY = typedCh < 7 ? LINE_Y - FS * 0.85 : LINE_Y + LINE_H - FS * 0.85;
      sCtx.fillStyle = `rgba(201,169,110,${s * 0.8})`;
      sCtx.fillRect(curX, curY, 2, FS * 0.9);
    }

    /* Linha separadora dourada */
    if (typedCh >= 12) {
      const la    = clamp((typedCh - 12) / 2, 0, 1) * s;
      const lineW = 220 * la;
      const gL    = sCtx.createLinearGradient(48, 0, 48 + 220, 0);
      gL.addColorStop(0, `rgba(201,169,110,${0.7 * la})`);
      gL.addColorStop(1, 'transparent');
      sCtx.fillStyle = gL;
      sCtx.fillRect(48, LINE_Y + LINE_H * 1.6, lineW, 1);
    }

    /* Subtítulo */
    if (typedCh >= 13) {
      const da   = clamp((typedCh - 13) / 3, 0, 1) * s;
      sCtx.font  = `300 ${Math.round(SW * 0.021)}px "Inter", system-ui, sans-serif`;
      sCtx.fillStyle = `rgba(120,116,108,${da})`;
      sCtx.textAlign = 'left';
      sCtx.fillText('DESIGNER & DEVELOPER', 50, LINE_Y + LINE_H * 2.1);
    }

    screenTex.needsUpdate = true;
  }

  /* ── Carrega modelo ────────────────────────────────────── */
  let model = null, mixer = null, lidAction = null, animDur = 2;
  let screenMesh = null, modelReady = false;

  const loader = new GLTFLoader();
  loader.load('macbook_pro_13_inch_2020.glb', gltf => {
    model = gltf.scene;

    /* Escala automática */
    const box  = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    model.scale.setScalar(2.1 / Math.max(size.x, size.z));
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.position.y -= 0.06;
    scene.add(model);

    /* Tela → CanvasTexture */
    model.traverse(node => {
      if (!node.isMesh) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat, mi) => {
        if (!mat || mat.name !== 'Material.002') return;
        screenMesh = node;
        const m = mat.clone();
        m.map = screenTex;
        m.emissiveMap = screenTex;
        m.emissive = new THREE.Color(0xffffff);
        m.emissiveIntensity = 0;
        m.roughness = 0.05; m.metalness = 0;
        m.needsUpdate = true;
        if (Array.isArray(node.material)) node.material[mi] = m;
        else node.material = m;
      });
    });

    /* Animação — parada no início (tampa fechada) */
    if (gltf.animations.length) {
      mixer     = new THREE.AnimationMixer(model);
      lidAction = mixer.clipAction(gltf.animations[0]);
      animDur   = gltf.animations[0].duration;
      lidAction.clampWhenFinished = true;
      lidAction.loop = THREE.LoopOnce;
      lidAction.play(); // PRECISA estar playing para mixer.setTime funcionar
      mixer.setTime(0); // posição inicial
    }

    modelReady = true;
    clock.start();
  });

  /* ── Timeline ─────────────────────────────────────────────
     Tampa abre E câmera avança SIMULTANEAMENTE desde o início.
     A tela acende quando a tampa está na metade + câmera mais próxima.
     T  0.3–6.0  : tampa abre (lento, durante toda a sequência)
     T  0.5–8.0  : câmera avança em paralelo
     T  3.0–5.8  : tela acende + texto digita
     T  8.0      : transição → home revela
  ───────────────────────────────────────────────────────── */
  const T_LID    = [0.3, 6.0];
  const T_SCR    = [3.0, 5.8];
  const T_ZOOM   = [0.5, 8.0];
  const T_END    = 8.0;

  /* Só a PRIMEIRA METADE da animação = abertura da tampa.
     A segunda metade fecha de volta. */
  const ANIM_PEAK = 0.5; // fração de animDur onde a tampa está max. aberta

  const clock = new THREE.Clock(false);

  /* ── RAF ──────────────────────────────────────────────── */
  function tick() {
    requestAnimationFrame(tick);
    if (!modelReady) { renderer.render(scene, camera); return; }

    const t  = clock.getElapsedTime();

    /* Partículas fade in */
    ptMat.opacity = clamp(t / 1.0, 0, 0.5);

    /* ── Tampa abre (apenas fase de abertura) ── */
    if (mixer) {
      const lidP   = easeS(inv(...T_LID, t));
      const target = lidP * animDur * ANIM_PEAK;
      mixer.setTime(target);
    }

    /* ── Tela acende ── */
    const scrP   = easeOut(inv(...T_SCR, t));
    scrBright    = scrP;
    typedCh      = scrP * 16; // 7 Gustavo + 6 Fortes + 3 extras (linha, subtítulo)
    if (screenMesh) {
      const mat = Array.isArray(screenMesh.material)
        ? screenMesh.material.find(m => m.name === 'Material.002')
        : screenMesh.material;
      if (mat) mat.emissiveIntensity = scrP * 1.1;
    }
    scrLight.intensity = scrP * 0.7;
    drawScreen();

    /* ── Câmera zoom ── */
    const zP = easeIO(inv(...T_ZOOM, t));
    camera.position.lerpVectors(CAM_A, CAM_B, zP);
    const lookNow = new THREE.Vector3().lerpVectors(LK_A, LK_B, zP);
    camera.lookAt(lookNow);

    /* ── Transição — usa _introDone global do módulo ── */
    if (t >= T_END) finishIntro();

    renderer.render(scene, camera);
  }

  tick();
}
