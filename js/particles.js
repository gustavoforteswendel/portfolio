/* ============================================================
   PARTICLES.JS — Gustavo Wenzel Portfolio
   Rede neural de partículas no fundo do hero
   2D Canvas API | Sem dependências | Pausa fora da viewport
   ============================================================ */
(function () {
  const canvas = document.getElementById('hero-particles');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;

  /* ── Config ──────────────────────────────────────────────── */
  const N        = 72;     // partículas
  const CONN_D   = 150;    // distância máxima p/ conexão (px lógicos)
  const SPD      = 0.22;   // velocidade máxima
  const MIN_R    = 0.6;
  const MAX_R    = 1.8;

  /* ── Partícula ────────────────────────────────────────────── */
  function Particle() {
    this.reset = function () {
      this.x  = Math.random() * W;
      this.y  = Math.random() * H;
      this.vx = (Math.random() - 0.5) * SPD;
      this.vy = (Math.random() - 0.5) * SPD;
      this.r  = MIN_R + Math.random() * (MAX_R - MIN_R);
      this.a  = 0.18 + Math.random() * 0.38;
      /* cor: off-white (60%) ou dourado (40%) */
      this.gold = Math.random() < 0.40;
    };
    this.reset();
  }

  let particles = [];

  function init() {
    particles = Array.from({ length: N }, () => new Particle());
  }

  /* ── Resize ──────────────────────────────────────────────── */
  function resize() {
    dpr = Math.min(window.devicePixelRatio, 2);
    W   = canvas.offsetWidth;
    H   = canvas.offsetHeight;
    if (W === 0 || H === 0) return;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);
    init();
  }

  /* ── Mouse parallax ─────────────────────────────────────── */
  let mx = 0, my = 0;
  window.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  }, { passive: true });

  /* ── Visibility ─────────────────────────────────────────── */
  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.01 }).observe(canvas);

  /* ── RAF ──────────────────────────────────────────────────── */
  function tick() {
    requestAnimationFrame(tick);
    if (!visible || W === 0) return;

    ctx.clearRect(0, 0, W, H);

    /* Atualiza posições */
    for (const p of particles) {
      /* Repulsão suave do mouse */
      const dx = p.x - mx, dy = p.y - my;
      const d2 = dx*dx + dy*dy;
      if (d2 < 8000) {
        const d = Math.sqrt(d2) || 1;
        p.vx += (dx / d) * 0.015;
        p.vy += (dy / d) * 0.015;
      }

      p.x += p.vx;
      p.y += p.vy;

      /* Amortecimento */
      p.vx *= 0.988;
      p.vy *= 0.988;

      /* Reposicionar quando sai da tela */
      if (p.x < -20) p.x = W + 20;
      else if (p.x > W + 20) p.x = -20;
      if (p.y < -20) p.y = H + 20;
      else if (p.y > H + 20) p.y = -20;

      /* Desenha ponto */
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.gold
        ? `rgba(201,169,110,${p.a})`
        : `rgba(240,237,232,${p.a * 0.7})`;
      ctx.fill();
    }

    /* Conexões */
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b  = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d > CONN_D) continue;

        const alpha = (1 - d / CONN_D) * 0.11;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = `rgba(201,169,110,${alpha})`;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }
    }
  }

  /* ── Init ─────────────────────────────────────────────────── */
  window.addEventListener('resize', () => { resize(); });
  resize();
  tick();
})();
