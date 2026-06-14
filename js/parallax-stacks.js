/* =============================================
   PARALLAX-STACKS.JS — Gustavo Wenzel Portfolio

   FASE 1 — Frase editorial (#stacks-phrase-outer)
   ────────────────────────────────────────────────
   • sticky 100vh com 220vh de outer para espaço de scroll
   • 5 palavras reveladas uma a uma conforme p1 (0→1) avança
   • Cada palavra usa translateY(110% → 0%) dentro de overflow:hidden
   • Eyebrow visível desde o início; frase dissolve nos últimos 12% do p1

   FASE 2 — Mapa neural (#stacks-outer)
   ──────────────────────────────────────
   • sticky 100vh com 240vh de outer
   • Ícones absolutos: parallax vertical (p2 × depth × VH × 0.38) +
     deslocamento de mouse suave por item (lerp independente)
   • Canvas HTML5 sobre os ícones: linhas pontilhadas animadas,
     pontos de pulso nos midpoints, anel pulsante por ícone
   • Hover: ícone ganha contraste/escala; conexões vizinhas acendem;
     descrição faz line-reveal abaixo do nome
   • Dispersão: canvas + ícones dissolvem em p2 0.80→1.0
============================================= */
(function () {
  'use strict';

  /* ─── DOM ─── */
  var phraseOuter = document.getElementById('stacks-phrase-outer');
  var phraseInner = document.getElementById('stacks-phrase-inner');
  var stacksOuter = document.getElementById('stacks-outer');
  var netCanvas   = document.getElementById('stacks-net');
  var stkCanvas   = document.getElementById('stacks-canvas');

  if (!phraseOuter || !stacksOuter || !netCanvas || !stkCanvas) return;

  var ctx = netCanvas.getContext('2d');

  /* ─── Utils ─── */
  function isMobile() { return window.innerWidth < 768; }
  var reducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t)  { return t * t * t; }

  /* ─── Phase 1: letras individuais ─── */
  var letters = Array.from(document.querySelectorAll('.sphrase__letter'));
  var nL = letters.length;

  /* Ordem de saída: pseudo-aleatória determinística por índice de letra */
  function pseudoRand(s) {
    var x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }
  var exitRank = (function () {
    /* Gera pares {i, rand} e ordena — exitRank[i] = posição de i na fila de saída */
    var pairs = letters.map(function (_, i) { return { i: i, r: pseudoRand(i + 3) }; });
    pairs.sort(function (a, b) { return a.r - b.r; });
    var rank = new Array(nL);
    pairs.forEach(function (p, pos) { rank[p.i] = pos; });
    return rank;
  }());

  /* ─── Phase 2: connection graph (by item index) ─── */
  var CONNS = [
    [0,1],[0,2],[0,5],[0,6],   /* JS  ← React, HTML, GSAP, Three.js */
    [1,4],[1,7],               /* React → Next.js, Figma             */
    [2,3],[3,1],               /* HTML → CSS → React                 */
    [4,8],[5,6],[8,9]          /* Next.js→Git, GSAP→Three.js, Git→PostgreSQL */
  ];

  /* ─── Phase 2: partículas de fundo ─── */
  var PART_N = 55;
  var particles = (function () {
    var arr = [];
    for (var i = 0; i < PART_N; i++) {
      arr.push({
        xp:    pseudoRand(i * 7.3  + 1.1),
        yp:    pseudoRand(i * 13.7 + 5.2),
        sz:    0.8 + pseudoRand(i * 3.1 + 9.9) * 1.7,
        alpha: 0.04 + pseudoRand(i * 5.5 + 2.3) * 0.08,
        phase: pseudoRand(i * 11.1 + 7.7) * Math.PI * 2,
        spd:   0.0004 + pseudoRand(i * 4.7 + 3.1) * 0.0006,
        mouse: 0.08  + pseudoRand(i * 6.3 + 0.5) * 0.12
      });
    }
    return arr;
  }());

  /* ─── Phase 2: tech items ─── */
  var stkEls = Array.from(stkCanvas.querySelectorAll('.stk'));
  var items  = stkEls.map(function (el) {
    return {
      el:    el,
      lp:    parseFloat(el.style.left) / 100,
      tp:    parseFloat(el.style.top)  / 100,
      sz:    parseFloat(el.dataset.sz) || 48,
      depth: parseFloat(el.dataset.depth) || 0.4,
      mouse: parseFloat(el.dataset.mouse)  || 0.25,
      cx: 0, cy: 0,
      _x: 0, _y: 0
    };
  });

  /* ─── Hover tracking ─── */
  var hoveredIdx = -1;
  items.forEach(function (item, i) {
    item.el.addEventListener('mouseenter', function () { hoveredIdx = i; });
    item.el.addEventListener('mouseleave', function () { hoveredIdx = -1; });
  });

  /* ─── Cached geometry ─── */
  var phraseTop = 0, phraseH = 0;
  var stacksTop = 0, stacksH = 0;

  function updateGeometry() {
    var W = window.innerWidth, H = window.innerHeight;

    phraseTop = phraseOuter.getBoundingClientRect().top + window.scrollY;
    phraseH   = phraseOuter.offsetHeight;
    stacksTop = stacksOuter.getBoundingClientRect().top + window.scrollY;
    stacksH   = stacksOuter.offsetHeight;

    /* Base icon centers (in viewport coords — valid when sticky top:0) */
    items.forEach(function (item) {
      item.cx = item.lp * W + item.sz * 0.5;
      item.cy = item.tp * H + item.sz * 0.5;
    });

    /* Canvas resolution (DPR-aware) */
    var dpr = window.devicePixelRatio || 1;
    netCanvas.width  = Math.round(W * dpr);
    netCanvas.height = Math.round(H * dpr);
    netCanvas.style.width  = W + 'px';
    netCanvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ─── Scroll + mouse state ─── */
  var scrollY = window.scrollY;
  var mx = 0, my = 0;

  window.addEventListener('scroll', function () {
    scrollY = window.scrollY;
  }, { passive: true });

  window.addEventListener('mousemove', function (e) {
    mx = (e.clientX / window.innerWidth  - 0.5) * 2;
    my = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateGeometry, 120);
  });

  /* ─── RAF loop ─── */
  function tick(now) {
    requestAnimationFrame(tick);

    /* ══ FASE 1: Letra por letra ══ */
    var p1Scrollable = phraseH - window.innerHeight;
    var p1 = p1Scrollable > 0
      ? Math.max(0, Math.min(1, (scrollY - phraseTop) / p1Scrollable))
      : 0;

    letters.forEach(function (letter, i) {
      /* ENTRADA: letras aparecem em sequência, p1 0.00→0.60
         Cada letra usa uma janela de 0.06 de p1 para aparecer */
      var apT = (i / Math.max(nL - 1, 1)) * 0.60;
      var apP = Math.max(0, Math.min(1, (p1 - apT) / 0.06));
      var apOp  = easeOut(apP);
      var apBlur = (1 - apP) * 7;

      /* SAÍDA: letras somem em ordem aleatória, p1 0.65→0.90
         exitRank[i] determina em que ponto da fila de saída cada letra está */
      var exT = 0.65 + (exitRank[i] / Math.max(nL - 1, 1)) * 0.25;
      var exP = Math.max(0, Math.min(1, (p1 - exT) / 0.07));
      var exOp  = 1 - easeIn(exP);
      var exBlur = exP * 7;

      var op   = apOp * exOp;
      var blur = apBlur + exBlur;

      letter.style.opacity = op.toFixed(3);
      letter.style.filter  = blur > 0.05 ? 'blur(' + blur.toFixed(1) + 'px)' : '';
    });

    /* Eyebrow some no final da sequência de saída */
    phraseInner.style.opacity = Math.max(0, 1 - (p1 - 0.92) / 0.08).toFixed(3);

    /* ══ FASE 2: Mapa neural ══ */
    var p2Scrollable = stacksH - window.innerHeight;
    var p2 = p2Scrollable > 0
      ? Math.max(0, Math.min(1, (scrollY - stacksTop) / p2Scrollable))
      : 0;

    if (isMobile() || reducedMotion) {
      ctx.clearRect(0, 0, netCanvas.width, netCanvas.height);
      stkCanvas.style.opacity = '';
      netCanvas.style.opacity = '';
      items.forEach(function (item) { item.el.style.transform = ''; });
      return;
    }

    /* Dispersão: dissolve em p2 0.80→1.0 */
    var mapOp = Math.max(0, Math.min(1, 1 - (p2 - 0.80) / 0.20)).toFixed(3);
    stkCanvas.style.opacity = mapOp;
    netCanvas.style.opacity = mapOp;

    /* Parallax + mouse por ícone */
    var VH = window.innerHeight;
    items.forEach(function (item) {
      var tX = mx * item.mouse * 30;
      var tY = my * item.mouse * 18;
      item._x += (tX - item._x) * 0.065;
      item._y += (tY - item._y) * 0.065;

      var dy = -p2 * item.depth * VH * 0.38;
      item.el.style.transform =
        'translate(' + item._x.toFixed(2) + 'px,' + (dy + item._y).toFixed(2) + 'px)';
    });

    /* ── Desenha rede neural ── */
    ctx.clearRect(0, 0, netCanvas.width, netCanvas.height);
    var W = window.innerWidth;

    /* Partículas de fundo */
    particles.forEach(function (p) {
      var px    = p.xp * W  + mx * p.mouse * 22;
      var py    = p.yp * VH + my * p.mouse * 14;
      var pulse = 0.5 + 0.5 * Math.sin(now * p.spd + p.phase);
      ctx.save();
      ctx.globalAlpha = p.alpha * (0.45 + pulse * 0.55);
      ctx.fillStyle   = '#f0ede8';
      ctx.beginPath();
      ctx.arc(px, py, p.sz, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* Conexões */
    CONNS.forEach(function (conn, ci) {
      var a = items[conn[0]], b = items[conn[1]];
      var dyA = -p2 * a.depth * VH * 0.38, dyB = -p2 * b.depth * VH * 0.38;
      var ax = a.cx + a._x, ay = a.cy + a._y + dyA;
      var bx = b.cx + b._x, by = b.cy + b._y + dyB;
      var isHot = (hoveredIdx === conn[0] || hoveredIdx === conn[1]);

      /* Linha pontilhada */
      ctx.save();
      ctx.globalAlpha   = isHot ? 0.55 : 0.22;
      ctx.strokeStyle   = isHot ? '#c9a96e' : '#f0ede8';
      ctx.lineWidth     = isHot ? 1.2 : 0.6;
      ctx.setLineDash([3, 9]);
      ctx.lineDashOffset = -(now * 0.022) % 12;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();

      /* Ponto de pulso no midpoint */
      var midX = (ax + bx) * 0.5, midY = (ay + by) * 0.5;
      var pulse = 0.5 + 0.5 * Math.sin(now * 0.0008 + ci * 1.1);
      ctx.save();
      ctx.globalAlpha = isHot ? 0.65 : pulse * 0.22;
      ctx.fillStyle   = isHot ? '#c9a96e' : '#f0ede8';
      ctx.beginPath();
      ctx.arc(midX, midY, isHot ? 3 : 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    /* Anel pulsante por ícone */
    items.forEach(function (item, i) {
      var dy = -p2 * item.depth * VH * 0.38;
      var cx = item.cx + item._x, cy = item.cy + item._y + dy;
      var pulse = 0.4 + 0.3 * Math.sin(now * 0.0009 + i * 1.5);
      var isHot = (hoveredIdx === i);

      ctx.save();
      ctx.globalAlpha = isHot ? 0.40 : pulse * 0.13;
      ctx.strokeStyle = isHot ? '#c9a96e' : '#f0ede8';
      ctx.lineWidth   = 0.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(cx, cy, item.sz * 0.5 + 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  /* ─── Init ─── */
  updateGeometry();
  requestAnimationFrame(tick);

}());
