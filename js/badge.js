/* =============================================
   BADGE.JS — Gustavo Wenzel Portfolio
   Crachá 3D procedural — Three.js puro

   VISUAL
   ──────
   • ExtrudeGeometry (rounded rect) para o corpo
   • PlaneGeometry overlays para frente e verso (UV 0-1 garantido)
   • CanvasTexture para foto + texto + verso decorativo
   • TorusGeometry para o ilhós metálico

   FÍSICA (Verlet PBD — comportamento premium controlado)
   ──────────────────────────────────────────────────────
   • 8 nós, cordão curto e firme (total ≈ 0.44 u)
   • G=4.0, DAMPING=3.2 → ζ≈0.53 (near critically damped)
   • Settle em ~1–2 oscilações, sem deriva para fora da Home
   • Limites de posição: X e Y clampeados no solver
   • Drag com resistência — não prende direto no cursor
============================================= */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ─── Container ─── */
const container = document.getElementById('badge-container');
if (!container) throw new Error('[badge.js] #badge-container não encontrado');

/* ─── Renderer ─── */
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping         = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace    = THREE.SRGBColorSpace;

const canvas = renderer.domElement;
Object.assign(canvas.style, {
  position: 'absolute', inset: '0',
  width: '100%', height: '100%',
  display: 'block', opacity: '0'
});
container.appendChild(canvas);

const cW = () => container.clientWidth  || 1;
const cH = () => container.clientHeight || 1;

/* ─── Cena / Câmera ─── */
const CAM_Z = 3.8;
const FOV   = 42;
const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(FOV, cW() / cH(), 0.01, 100);
camera.position.z = CAM_Z;

/* ─── Ambiente PBR ─── */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

/* ─── Iluminação ─── */
scene.add(new THREE.AmbientLight(0xf0ede8, 0.35));

const kL = new THREE.DirectionalLight(0xfff8e8, 1.1);
kL.position.set(-1.5, 3.0, 2.8);
scene.add(kL);

const rL = new THREE.DirectionalLight(0xb8c8ff, 0.52);
rL.position.set(3.0, -0.4, -2.2);
scene.add(rL);

const fL = new THREE.DirectionalLight(0xfff0e0, 0.48);
fL.position.set(1.2, -1.6, 1.8);
scene.add(fL);

/* ═══════════════════════════════════════════
   DIMENSÕES DO CRACHÁ (world units)
   ═══════════════════════════════════════════ */
const CARD_W = 1.18;
const CARD_H = 1.88;
const CARD_D = 0.024;
const CARD_R = 0.072;
const HALF_H = CARD_H / 2; // 0.94

/* ═══════════════════════════════════════════
   FÍSICA — CORDÃO FIRME E CURTO
   ═══════════════════════════════════════════ */
const SEGMENTS   = 8;     // nós (cordão curto)
const SEG_LEN    = 0.055; // comprimento de repouso por segmento
const GRAVITY    = 4.0;   // gravidade virtual suave
const DAMPING    = 3.2;   // amortecimento alto → settle em ~1–2 oscilações
const ITERATIONS = 18;    // solver rígido
const SUBSTEPS   = 3;

// Âncora acima do frustum (top ≈ 1.46)
const anchorBase = new THREE.Vector3(0, 1.55, 0);
const anchor     = anchorBase.clone();

// Posição de repouso do crachá:
// rope end Y ≈ 1.55 - 8×0.055 = 1.11
// badge center Y ≈ 1.11 - 0.94 = 0.17  (parte superior da cena, amplo espaço abaixo)
const ROPE_REST_Y = anchorBase.y - SEGMENTS * SEG_LEN; // ≈ 1.11

// Limite de deslocamento do último nó (evita sair da Home)
const MAX_SWING_X  = 0.80;  // deslocamento lateral máximo
const MIN_ROPE_Y   = ROPE_REST_Y - 0.50; // deslocamento vertical máximo para baixo

const rPos  = [];
const rPrev = [];
for (let i = 0; i <= SEGMENTS; i++) {
  const v = new THREE.Vector3(0, anchorBase.y - i * SEG_LEN, 0);
  rPos.push(v.clone());
  rPrev.push(v.clone());
}

function stepRope(dt) {
  const dtSq    = dt * dt;
  const dampMul = Math.exp(-DAMPING * dt);

  for (let i = 1; i <= SEGMENTS; i++) {
    const vx = (rPos[i].x - rPrev[i].x) * dampMul;
    const vy = (rPos[i].y - rPrev[i].y) * dampMul;
    const vz = (rPos[i].z - rPrev[i].z) * dampMul;
    rPrev[i].copy(rPos[i]);
    rPos[i].x += vx;
    rPos[i].y += vy - GRAVITY * dtSq;
    rPos[i].z += vz;
  }

  for (let it = 0; it < ITERATIONS; it++) {
    rPos[0].copy(anchor);

    for (let i = 0; i < SEGMENTS; i++) {
      const a = rPos[i], b = rPos[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < 1e-10) continue;
      const diff = (dist - SEG_LEN) / dist;
      const cx = dx * diff, cy = dy * diff, cz = dz * diff;
      if (i === 0) {
        b.x -= cx; b.y -= cy; b.z -= cz;
      } else {
        a.x += cx * 0.5; a.y += cy * 0.5; a.z += cz * 0.5;
        b.x -= cx * 0.5; b.y -= cy * 0.5; b.z -= cz * 0.5;
      }
    }

    rPos[0].copy(anchor);
    if (dragging) rPos[SEGMENTS].copy(dragAttach);
  }

  // Limites de posição — mantém crachá dentro da Home
  rPos[SEGMENTS].x = Math.max(-MAX_SWING_X, Math.min(MAX_SWING_X, rPos[SEGMENTS].x));
  rPos[SEGMENTS].y = Math.max(MIN_ROPE_Y,   Math.min(anchorBase.y, rPos[SEGMENTS].y));
}

/* ═══════════════════════════════════════════
   SHAPE COMPARTILHADO
   ═══════════════════════════════════════════ */
function makeBadgeShape() {
  const sh = new THREE.Shape();
  const hw = CARD_W / 2, hh = CARD_H / 2, r = CARD_R;
  sh.moveTo(-hw + r, -hh);
  sh.lineTo( hw - r, -hh);
  sh.quadraticCurveTo( hw, -hh,  hw, -hh + r);
  sh.lineTo( hw,  hh - r);
  sh.quadraticCurveTo( hw,  hh,  hw - r,  hh);
  sh.lineTo(-hw + r,  hh);
  sh.quadraticCurveTo(-hw,  hh, -hw,  hh - r);
  sh.lineTo(-hw, -hh + r);
  sh.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return sh;
}


/* ─── Hierarquia ─── */
const pivot     = new THREE.Group(); // física — origem no ilhós (topo do badge)
const cardGroup = new THREE.Group(); // flip frente/verso
cardGroup.position.set(0, -HALF_H, 0); // badge center fica abaixo do pivot
pivot.add(cardGroup);
scene.add(pivot);

/* ─── Corpo: ExtrudeGeometry ─── */
const cardShape = makeBadgeShape();
const bodyGeo   = new THREE.ExtrudeGeometry(cardShape, {
  depth:          CARD_D,
  bevelEnabled:   true,
  bevelThickness: 0.004,
  bevelSize:      0.004,
  bevelSegments:  5
});
bodyGeo.center();

const edgeMat = new THREE.MeshStandardMaterial({
  color: 0xeeeae4, roughness: 0.28, metalness: 0.07, envMapIntensity: 1.4
});
const capMat = new THREE.MeshStandardMaterial({
  color: 0xf6f2ed, roughness: 0.42, metalness: 0.00, envMapIntensity: 0.7
});
cardGroup.add(new THREE.Mesh(bodyGeo, [edgeMat, capMat]));

/* ─── Ilhós ─── */
const eyelet = new THREE.Mesh(
  new THREE.TorusGeometry(0.026, 0.007, 10, 24),
  new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.95, roughness: 0.10, envMapIntensity: 2.0 })
);
eyelet.position.set(0, HALF_H, 0);
cardGroup.add(eyelet);

/* ═══════════════════════════════════════════
   CANVAS TEXTURES
   ═══════════════════════════════════════════ */
const TEX_W = 592;
const TEX_H = Math.round(TEX_W * (CARD_H / CARD_W)); // ≈ 944

function canvasRR(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y + h - r, r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,         r);
  ctx.closePath();
}

function createFrontTexture(photoImg) {
  const cv  = document.createElement('canvas');
  cv.width  = TEX_W;
  cv.height = TEX_H;
  const ctx = cv.getContext('2d');

  /* Fundo off-white */
  ctx.fillStyle = '#f5f1ec';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  /* Faixa dourada no topo */
  const tg = ctx.createLinearGradient(0, 0, TEX_W, 0);
  tg.addColorStop(0,    '#8c6430');
  tg.addColorStop(0.35, '#c9a96e');
  tg.addColorStop(0.50, '#e8cb96');
  tg.addColorStop(0.65, '#c9a96e');
  tg.addColorStop(1,    '#8c6430');
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, TEX_W, 10);

  /* Área da foto (top 57%) */
  const pm = 26, pt = 22;
  const ph = Math.round(TEX_H * 0.57);
  const pw = TEX_W - pm * 2;

  ctx.save();
  canvasRR(ctx, pm, pt, pw, ph, 5);
  ctx.clip();

  if (photoImg && photoImg.naturalWidth) {
    const ia = photoImg.naturalWidth / photoImg.naturalHeight;
    const fa = pw / ph;
    let sw, sh, sx, sy;
    if (ia > fa) {
      sh = photoImg.naturalHeight; sw = sh * fa;
      sx = (photoImg.naturalWidth - sw) / 2; sy = 0;
    } else {
      sw = photoImg.naturalWidth; sh = sw / fa;
      sx = 0; sy = (photoImg.naturalHeight - sh) * 0.22;
    }
    try {
      ctx.drawImage(photoImg, sx, sy, sw, sh, pm, pt, pw, ph);
    } catch (_) {
      /* canvas taint fallback */
      const pg = ctx.createLinearGradient(pm, pt, pm, pt + ph);
      pg.addColorStop(0, '#2e2a24'); pg.addColorStop(1, '#1c1914');
      ctx.fillStyle = pg; ctx.fillRect(pm, pt, pw, ph);
    }
  } else {
    /* Placeholder cinza se foto falhar */
    const pg = ctx.createLinearGradient(pm, pt, pm, pt + ph);
    pg.addColorStop(0, '#2e2a24'); pg.addColorStop(1, '#1c1914');
    ctx.fillStyle = pg; ctx.fillRect(pm, pt, pw, ph);
  }
  ctx.restore();

  /* Borda sutil na foto */
  ctx.strokeStyle = 'rgba(201,169,110,0.30)';
  ctx.lineWidth   = 1.5;
  canvasRR(ctx, pm, pt, pw, ph, 5);
  ctx.stroke();

  /* Divisor dourado */
  const divY = pt + ph + 18;
  const dg = ctx.createLinearGradient(pm, 0, TEX_W - pm, 0);
  dg.addColorStop(0,    'transparent');
  dg.addColorStop(0.08, '#c9a96e');
  dg.addColorStop(0.92, '#c9a96e');
  dg.addColorStop(1,    'transparent');
  ctx.fillStyle = dg;
  ctx.fillRect(pm, divY, pw, 1.5);

  /* Nome */
  const nameSize = Math.round(TEX_W * 0.088); // ~52px
  const nameY    = divY + 52;
  ctx.textAlign  = 'center';
  ctx.fillStyle  = '#0d0b07';
  ctx.font       = `600 ${nameSize}px Georgia, serif`;
  ctx.fillText('Gustavo Wendel', TEX_W / 2, nameY);

  /* Linha fina abaixo do nome */
  ctx.fillStyle = 'rgba(201,169,110,0.40)';
  ctx.fillRect(TEX_W / 2 - 52, nameY + 12, 104, 1);

  /* Cargo */
  ctx.fillStyle = '#4a4030';
  ctx.font      = `500 ${Math.round(TEX_W * 0.046)}px Arial, sans-serif`;
  ctx.fillText('FRONT-END DEVELOPER', TEX_W / 2, nameY + nameSize + 4);

  /* Micro-detalhe: código de ID fictício */
  const idY = TEX_H - 54;
  ctx.fillStyle = 'rgba(100,90,72,0.65)';
  ctx.font      = `400 ${Math.round(TEX_W * 0.030)}px monospace`;
  ctx.fillText('ID · 2024 · GW-FE-001', TEX_W / 2, idY);

  /* Barras decorativas pequenas */
  const bcY = TEX_H - 38;
  const bcW = Math.round(TEX_W * 0.44);
  const bcX = (TEX_W - bcW) / 2;
  ctx.fillStyle = 'rgba(201,169,110,0.40)';
  let bx = bcX;
  for (let i = 0; bx < bcX + bcW; i++) {
    const bw = 2 + ((Math.sin(i * 19.7 + 2.1) > 0.2) ? 3 : 0);
    ctx.fillRect(bx, bcY, bw, 16);
    bx += bw + 2;
  }

  /* Faixa preta no rodapé */
  ctx.fillStyle = '#19160f';
  ctx.fillRect(0, TEX_H - 10, TEX_W, 10);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace  = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function drawQR(ctx, x, y, size) {
  const N = 21, cell = size / N;
  function pr(r, c) {
    const v = Math.sin(r * 127.1 + c * 311.7 + 91.3) * 43758.5453;
    return (v - Math.floor(v)) > 0.46;
  }
  function finder(lr, lc) {
    if (lr < 0 || lr > 6 || lc < 0 || lc > 6) return false;
    if (lr === 0 || lr === 6 || lc === 0 || lc === 6) return true;
    if (lr === 1 || lr === 5 || lc === 1 || lc === 5) return false;
    return true;
  }
  ctx.fillStyle = '#000';
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      let on = pr(r, c);
      if      (r < 8 && c < 8)         on = finder(r, c);
      else if (r < 8 && c >= N - 8)    on = finder(r, c - (N - 7));
      else if (r >= N - 8 && c < 8)    on = finder(r - (N - 7), c);
      else if ((r === 6 && c >= 8 && c < N - 8) ||
               (c === 6 && r >= 8 && r < N - 8)) on = (r + c) % 2 === 0;
      if (on) ctx.fillRect(x + c * cell, y + r * cell, cell - 0.4, cell - 0.4);
    }
  }
}

function createBackTexture() {
  const cv  = document.createElement('canvas');
  cv.width  = TEX_W;
  cv.height = TEX_H;
  const ctx = cv.getContext('2d');

  /* Fundo escuro */
  ctx.fillStyle = '#0f0e0c';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  /* Grid sutil */
  ctx.strokeStyle = 'rgba(201,169,110,0.055)';
  ctx.lineWidth   = 0.5;
  for (let x = 0; x < TEX_W; x += 30) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, TEX_H); ctx.stroke();
  }
  for (let y = 0; y < TEX_H; y += 30) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(TEX_W, y); ctx.stroke();
  }

  /* Faixas douradas topo e base */
  const sg = ctx.createLinearGradient(0, 0, TEX_W, 0);
  sg.addColorStop(0,    'rgba(140,100,48,0)');
  sg.addColorStop(0.20, 'rgba(201,169,110,0.75)');
  sg.addColorStop(0.80, 'rgba(201,169,110,0.75)');
  sg.addColorStop(1,    'rgba(140,100,48,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(0, 0,          TEX_W, 8);
  ctx.fillRect(0, TEX_H - 8,  TEX_W, 8);

  /* QR code */
  const qrSz = Math.round(TEX_W * 0.44);
  const qrX  = (TEX_W - qrSz) / 2;
  const qrY  = Math.round(TEX_H * 0.16);
  ctx.fillStyle = '#fff';
  canvasRR(ctx, qrX - 10, qrY - 10, qrSz + 20, qrSz + 20, 6);
  ctx.fill();
  drawQR(ctx, qrX, qrY, qrSz);

  /* URL */
  ctx.fillStyle = '#c9a96e';
  ctx.textAlign = 'center';
  ctx.font      = `600 ${Math.round(TEX_W * 0.040)}px monospace`;
  ctx.fillText('gustavowendel.dev', TEX_W / 2, qrY + qrSz + 36);

  /* Barcode decorativo */
  const bcY = qrY + qrSz + 64;
  const bcW = Math.round(TEX_W * 0.60);
  const bcX = (TEX_W - bcW) / 2;
  let bx = bcX;
  ctx.fillStyle = 'rgba(201,169,110,0.42)';
  for (let i = 0; bx < bcX + bcW; i++) {
    const v  = Math.sin(i * 19.7 + 3.3) * 43758.5453;
    const fr = v - Math.floor(v);
    const bw = 2 + (fr > 0.5 ? 3 : 0) + (fr > 0.75 ? 2 : 0);
    ctx.fillRect(bx, bcY, bw, 26);
    bx += bw + 2 + (fr > 0.65 ? 2 : 0);
  }

  /* Tagline */
  ctx.fillStyle = 'rgba(240,237,232,0.35)';
  ctx.font      = `300 ${Math.round(TEX_W * 0.036)}px Arial, sans-serif`;
  ctx.fillText('crafting interfaces that feel alive', TEX_W / 2, bcY + 52);

  /* Cantos decorativos */
  ctx.fillStyle = 'rgba(201,169,110,0.28)';
  [[26, 26], [TEX_W - 26, 26], [26, TEX_H - 26], [TEX_W - 26, TEX_H - 26]].forEach(([cx, cy]) => {
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill();
  });

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace  = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ─── Overlays de face ─── */
function buildFaceOverlays(frontTex, backTex) {
  /* MeshBasicMaterial: face impressa não é afetada por luz 3D (mais realista e legível) */
  const polyOpts = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 };

  const fMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_W, CARD_H),
    new THREE.MeshBasicMaterial({ map: frontTex, ...polyOpts })
  );
  fMesh.position.z = CARD_D / 2 + 0.006;
  cardGroup.add(fMesh);

  const bGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const bUV  = bGeo.attributes.uv.array;
  for (let i = 0; i < bUV.length; i += 2) bUV[i] = 1 - bUV[i];
  bGeo.attributes.uv.needsUpdate = true;

  const bMesh = new THREE.Mesh(bGeo, new THREE.MeshBasicMaterial({ map: backTex, ...polyOpts }));
  bMesh.rotation.y = Math.PI;
  bMesh.position.z = -(CARD_D / 2 + 0.006);
  cardGroup.add(bMesh);
}

/* ═══════════════════════════════════════════
   CORDÃO — ribbon quad strip
   ═══════════════════════════════════════════ */
const RIBBON_W = 0.048;
const RBN      = (SEGMENTS + 1) * 2;
const rbnPos   = new Float32Array(RBN * 3);
const rbnUV    = new Float32Array(RBN * 2);
const rbnIdx   = [];
for (let i = 0; i < SEGMENTS; i++) {
  const b = i * 2;
  rbnIdx.push(b, b+2, b+1,  b+2, b+3, b+1);
}
const ribbonGeo = new THREE.BufferGeometry();
ribbonGeo.setAttribute('position', new THREE.BufferAttribute(rbnPos, 3));
ribbonGeo.setAttribute('uv',       new THREE.BufferAttribute(rbnUV,  2));
ribbonGeo.setIndex(rbnIdx);

function createRibbonTexture() {
  const cv = document.createElement('canvas');
  cv.width = 32; cv.height = 128;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 32, 0);
  g.addColorStop(0,    '#8c6430');
  g.addColorStop(0.20, '#c9a96e');
  g.addColorStop(0.50, '#e8cb96');
  g.addColorStop(0.80, '#c9a96e');
  g.addColorStop(1,    '#8c6430');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 128);
  ctx.strokeStyle = 'rgba(255,240,190,0.22)';
  ctx.lineWidth   = 1.4;
  for (let y = -32; y < 160; y += 7) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(32, y + 32); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(60,38,10,0.16)';
  ctx.lineWidth   = 1.0;
  for (let y = -32; y < 160; y += 7) {
    ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(0, y + 32); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS    = THREE.ClampToEdgeWrapping;
  tex.wrapT    = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

const ribbonMesh = new THREE.Mesh(ribbonGeo, new THREE.MeshStandardMaterial({
  map: createRibbonTexture(), roughness: 0.70, metalness: 0.08,
  side: THREE.DoubleSide, envMapIntensity: 0.6
}));
scene.add(ribbonMesh);

function updateRibbon() {
  const N = SEGMENTS + 1;
  let total = 0;
  const lens = [0];
  for (let i = 1; i < N; i++) {
    total += rPos[i].distanceTo(rPos[i - 1]);
    lens.push(total);
  }
  for (let i = 0; i < N; i++) {
    let tx, ty;
    if (i < N - 1) { tx = rPos[i+1].x-rPos[i].x; ty = rPos[i+1].y-rPos[i].y; }
    else            { tx = rPos[i].x-rPos[i-1].x; ty = rPos[i].y-rPos[i-1].y; }
    const tl = Math.sqrt(tx*tx+ty*ty) || 1;
    tx /= tl; ty /= tl;
    const rx = -ty, ry = tx;
    const hw = RIBBON_W / 2;
    const vt = total > 0 ? lens[i] / total : i / (N - 1);
    const base = i * 6;
    rbnPos[base]   = rPos[i].x - rx*hw; rbnPos[base+1] = rPos[i].y - ry*hw; rbnPos[base+2] = rPos[i].z;
    rbnPos[base+3] = rPos[i].x + rx*hw; rbnPos[base+4] = rPos[i].y + ry*hw; rbnPos[base+5] = rPos[i].z;
    const ub = i * 4;
    rbnUV[ub] = 0; rbnUV[ub+1] = vt; rbnUV[ub+2] = 1; rbnUV[ub+3] = vt;
  }
  ribbonGeo.attributes.position.needsUpdate = true;
  ribbonGeo.attributes.uv.needsUpdate       = true;
  ribbonGeo.computeVertexNormals();
}

/* ═══════════════════════════════════════════
   ESTADO
   ═══════════════════════════════════════════ */
let ready       = false;
let dragging    = false;
const dragTarget = new THREE.Vector3(); // posição alvo do drag (lerped)
const dragAttach = new THREE.Vector3(); // posição efetiva (com resistência)
let gMX = 0, gMY = 0;
let tiltX = 0, tiltY = 0;
let flipTarget  = 0;
let flipCurrent = 0;
let t = 0, prevTime = 0;
let visible = true;

/* ─── Screen → World ─── */
function screenTo3D(clientX, clientY) {
  const r    = container.getBoundingClientRect();
  const ndcX =  ((clientX - r.left) / r.width)  * 2 - 1;
  const ndcY = -((clientY - r.top)  / r.height) * 2 + 1;
  const v    = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
  const dir  = v.sub(camera.position).normalize();
  const ft   = -camera.position.z / dir.z;
  return camera.position.clone().add(dir.multiplyScalar(ft));
}

/* ─── Clamp para drag ─── */
function clampDragWorld(w) {
  w.x = Math.max(-0.70, Math.min(0.70, w.x));
  // Limita badge center entre -0.45 e 0.5 em Y
  w.y = Math.max(-0.45 - HALF_H + HALF_H, Math.min(0.50, w.y));
  // → dragAttach.y = w.y + HALF_H ∈ [0.49, 1.44]
}

/* ═══════════════════════════════════════════
   EVENTOS
   ═══════════════════════════════════════════ */
window.addEventListener('mousemove', (e) => {
  gMX = (e.clientX / window.innerWidth  - 0.5) * 2;
  gMY = (e.clientY / window.innerHeight - 0.5) * 2;
  if (dragging) {
    const w = screenTo3D(e.clientX, e.clientY);
    clampDragWorld(w);
    dragTarget.set(w.x, w.y + HALF_H, w.z);
  }
}, { passive: true });

document.addEventListener('mouseleave', () => { gMX = 0; gMY = 0; });

container.addEventListener('mousedown', (e) => {
  dragging = true;
  const w = screenTo3D(e.clientX, e.clientY);
  clampDragWorld(w);
  dragTarget.set(w.x, w.y + HALF_H, w.z);
  dragAttach.copy(dragTarget);
  container.style.cursor = 'grabbing';
  e.preventDefault();
});

window.addEventListener('mouseup', () => {
  if (!dragging) return;
  dragging = false;
  container.style.cursor = '';
});

container.addEventListener('dblclick', () => {
  flipTarget = Math.abs(flipCurrent - Math.PI) < 0.5 ? 0 : Math.PI;
});

container.addEventListener('touchstart', (e) => {
  dragging = true;
  const touch = e.touches[0];
  const w = screenTo3D(touch.clientX, touch.clientY);
  clampDragWorld(w);
  dragTarget.set(w.x, w.y + HALF_H, w.z);
  dragAttach.copy(dragTarget);
  e.preventDefault();
}, { passive: false });

container.addEventListener('touchmove', (e) => {
  if (!dragging) return;
  const touch = e.touches[0];
  const w = screenTo3D(touch.clientX, touch.clientY);
  clampDragWorld(w);
  dragTarget.set(w.x, w.y + HALF_H, w.z);
  gMX = (touch.clientX / window.innerWidth  - 0.5) * 2;
  gMY = (touch.clientY / window.innerHeight - 0.5) * 2;
  e.preventDefault();
}, { passive: false });

window.addEventListener('touchend', () => { dragging = false; });

/* ═══════════════════════════════════════════
   RESIZE + VISIBILITY
   ═══════════════════════════════════════════ */
function resize() {
  renderer.setSize(cW(), cH());
  camera.aspect = cW() / cH();
  camera.updateProjectionMatrix();
}
resize();
new ResizeObserver(resize).observe(container);
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(container);

/* ═══════════════════════════════════════════
   INIT — carrega foto e monta overlays
   ═══════════════════════════════════════════ */
function initBadge(photoImg) {
  const frontTex = createFrontTexture(photoImg);
  const backTex  = createBackTexture();
  buildFaceOverlays(frontTex, backTex);
  ready = true;

  const ph = container.querySelector('.hero__badge-photo');
  if (ph) ph.style.display = 'none';
  canvas.style.transition = 'opacity 1.2s cubic-bezier(0.16,1,0.3,1)';
  canvas.style.opacity    = '1';
}

/* Carrega foto via blob URL para evitar canvas taint no WebGL */
(async () => {
  let photoImg = null;
  try {
    const resp = await fetch('assets/foto-perfil.png');
    if (resp.ok) {
      const url = URL.createObjectURL(await resp.blob());
      photoImg  = await new Promise((res, rej) => {
        const img = new Image();
        img.onload  = () => { URL.revokeObjectURL(url); res(img); };
        img.onerror = () => { URL.revokeObjectURL(url); rej(); };
        img.src = url;
      });
    }
  } catch (_) { /* sem foto */ }
  initBadge(photoImg);
})();

/* ═══════════════════════════════════════════
   RAF LOOP
   ═══════════════════════════════════════════ */
function tick(now) {
  requestAnimationFrame(tick);
  if (!visible) return;

  const dt = prevTime ? Math.min((now - prevTime) * 0.001, 0.05) : 0.016;
  prevTime = now;
  t += dt;

  /* Micro-breathing da âncora */
  anchor.x = Math.sin(t * 0.38) * 0.002 + Math.cos(t * 0.22) * 0.0015;

  /* Drag com resistência — não prende direto no cursor */
  if (dragging) {
    dragAttach.x += (dragTarget.x - dragAttach.x) * 0.18;
    dragAttach.y += (dragTarget.y - dragAttach.y) * 0.18;
  }

  /* Física em substeps */
  const subDt = dt / SUBSTEPS;
  for (let s = 0; s < SUBSTEPS; s++) stepRope(subDt);

  /* Ribbon */
  updateRibbon();

  /* Pivot no ilhós (topo do badge = último nó da corda) */
  const end  = rPos[SEGMENTS];
  const prev = rPos[SEGMENTS - 1];
  pivot.position.set(end.x, end.y, end.z);

  /* Rotação: tangente da corda (sutil, clampeada) + tilt por mouse */
  const rawZ = Math.atan2(end.x - prev.x, -(end.y - prev.y));
  const ropeZ = Math.max(-0.22, Math.min(0.22, rawZ));

  tiltX += (-gMY * 0.10 - tiltX) * 0.045;
  tiltY += ( gMX * 0.15 - tiltY) * 0.045;
  pivot.rotation.set(tiltX, tiltY, ropeZ);

  /* Flip suave frente ↔ verso */
  flipCurrent += (flipTarget - flipCurrent) * 0.072;
  cardGroup.rotation.y = flipCurrent;

  renderer.render(scene, camera);
}
requestAnimationFrame(tick);
