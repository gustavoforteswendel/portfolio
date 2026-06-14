/* =============================================
   HORIZONTAL-SCROLL.JS — Gustavo Wenzel Portfolio

   Galeria editorial de painéis com largura variável.

   MECANISMO PRINCIPAL
   ───────────────────
   • Cada painel tem uma "atividade" (0 → 1) calculada a partir de um
     índice contínuo (panelT: 0 → n-1) que avança com o scroll.
   • Atividade 1 = painel dominante (~82vw, imagem a plena luz)
   • Atividade 0 = tira lateral (~6vw, imagem escura e clipada)
   • A função easeInOutCubic é simétrica: sum(activity[i]) = 1 em
     qualquer posição → largura total do track constante = 106vw.
   • O track é transladado em X apenas o suficiente para manter o
     painel ativo centrado na viewport.
   • Cada painel recebe via CSS custom properties os valores de
     filtro, clip-path e transform calculados pelo rAF.

   ANIMAÇÕES POR PAINEL
   ────────────────────
   • Imagem: clip-path inset(0 0 X% 0) → revela de cima para baixo
   • Imagem: filter brightness/saturation + transform scale
   • Título: translateY(Y%) dentro de wrapper overflow:hidden
   • Detalhes: opacity + translateY com entrada atrasada
   • Número: opacity + translateY

   MOBILE (< 768px)
   ────────────────
   • Nenhum JS aplica largura ou animação — CSS trata tudo.
============================================= */

(function () {
  'use strict';

  /* --- Utilitários --- */
  function isMobile() { return window.innerWidth < 768; }

  /* Ease simétrica: easeInOutCubic(x) + easeInOutCubic(1-x) = 1 sempre
     Garante que sum(activities) = 1 → largura total do track constante */
  function ease(x) {
    return x < 0.5
      ? 4 * x * x * x
      : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  var prefersReducedMotion = typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- DOM --- */
  var outer        = document.getElementById('projects-outer');
  var track        = document.getElementById('projects-track');
  var counterEl    = document.getElementById('projects-counter');
  var progressFill = document.getElementById('projects-progress-fill');

  if (!outer || !track) return;

  var scenes = Array.from(track.querySelectorAll('.scene'));
  var n      = scenes.length;
  if (!n) return;

  /* Pre-resolve bg elements para clip-path */
  var bgEls = scenes.map(function (s) { return s.querySelector('.scene__bg'); });

  /* --- Constantes de layout --- */
  var MIN_W = 6;    /* vw — tira inativa */
  var MAX_W = 82;   /* vw — painel dominante */
  var RANGE = MAX_W - MIN_W;  /* 76vw */

  /* --- Constantes de scroll --- */
  var LERP        = 0.055;   /* coeficiente de lerp */
  var PANEL_DWELL = 2.2;     /* alturas de viewport por transição */

  /* --- Estado --- */
  var scrollProgress = 0;
  var lerpedProgress = 0;
  var activeIndex    = 0;
  var lastTime       = 0;

  /* --- Setup: define altura do outer --- */
  function setup() {
    if (isMobile()) {
      outer.style.height = '';
      return;
    }
    /* Cada painel contribui com PANEL_DWELL alturas de viewport.
       O primeiro painel não precisa de dwell extra, apenas os (n-1) seguintes. */
    var scrollable = Math.round(PANEL_DWELL * (n - 1) * window.innerHeight);
    outer.style.height = (scrollable + window.innerHeight) + 'px';
  }

  /* --- Lê progresso do scroll (0 → 1) --- */
  function readScroll() {
    if (isMobile()) return;
    var rect       = outer.getBoundingClientRect();
    var scrollable = outer.offsetHeight - window.innerHeight;
    if (scrollable <= 0) return;
    var raw = -rect.top / scrollable;
    scrollProgress = raw < 0 ? 0 : raw > 1 ? 1 : raw;
  }

  /* --- Formata contador --- */
  function fmt(i, total) {
    return String(i).padStart(2, '0') + ' / ' + String(total).padStart(2, '0');
  }

  /* --- RAF loop --- */
  function tick(now) {
    requestAnimationFrame(tick);

    /* Lerp frame-rate independente */
    var dt    = lastTime ? Math.min(now - lastTime, 50) : 16.67;
    lastTime  = now;
    var lerpT = 1 - Math.pow(1 - LERP, dt * 0.06);
    var delta = scrollProgress - lerpedProgress;
    lerpedProgress += Math.abs(delta) > 0.00005 ? delta * lerpT : delta;

    /* Progress fill */
    if (progressFill) {
      progressFill.style.transform = 'scaleX(' + lerpedProgress + ')';
    }

    if (isMobile()) return;  /* layout vertical — CSS cuida do resto */

    /* ── Índice de painel contínuo: 0 → n-1 ── */
    var panelT = lerpedProgress * (n - 1);

    /* ── Atividade de cada painel (0 → 1) ──
       Triangle function + ease simétrica → sum sempre = 1 */
    var activities = [];
    for (var i = 0; i < n; i++) {
      activities.push(ease(Math.max(0, 1 - Math.abs(panelT - i))));
    }

    /* ── Larguras (em vw) ── */
    var widths = [];
    for (var i = 0; i < n; i++) {
      widths.push(MIN_W + activities[i] * RANGE);
    }

    /* Aplica largura a cada painel */
    for (var i = 0; i < n; i++) {
      scenes[i].style.width = widths[i].toFixed(3) + 'vw';
    }

    /* ── Calcula centros dos painéis no espaço do track ── */
    var onePx   = window.innerWidth / 100;  /* 1vw em px */
    var cumPx   = 0;
    var centers = [];
    for (var i = 0; i < n; i++) {
      var wPx = widths[i] * onePx;
      centers.push(cumPx + wPx * 0.5);
      cumPx += wPx;
    }

    /* Interpola o "centro ativo" entre o painel atual e o próximo */
    var pFloor       = Math.floor(panelT);
    var pCeil        = Math.min(n - 1, pFloor + 1);
    var frac         = panelT - pFloor;
    var activeCenter = centers[pFloor] * (1 - frac) + centers[pCeil] * frac;

    /* Track translateX: mantém centro ativo no centro da viewport */
    var trackX = window.innerWidth * 0.5 - activeCenter;
    track.style.transform = 'translateX(' + trackX.toFixed(2) + 'px)';

    /* ── Índice ativo (inteiro) — para contador e classe ── */
    var newActive = Math.round(panelT);
    if (newActive < 0)     newActive = 0;
    if (newActive >= n)    newActive = n - 1;
    if (newActive !== activeIndex) {
      activeIndex = newActive;
      for (var j = 0; j < n; j++) {
        scenes[j].classList.toggle('is-active', j === newActive);
      }
      if (counterEl) counterEl.textContent = fmt(newActive + 1, n);
    }

    /* ── Visuais por painel via CSS custom properties ── */
    if (prefersReducedMotion) {
      /* Sem animação: is-active no CSS define o estado final */
      return;
    }

    for (var i = 0; i < n; i++) {
      var act = activities[i];
      var sc  = scenes[i];

      /* Border-radius: arredondado nas tiras, reto ao dominar */
      sc.style.setProperty('--scene-radius', ((1 - act) * 12).toFixed(1) + 'px');

      /* Imagem: filtro + escala */
      sc.style.setProperty('--img-br',    (0.10 + act * 0.90).toFixed(3));
      sc.style.setProperty('--img-sat',   (0.18 + act * 0.82).toFixed(3));
      sc.style.setProperty('--img-scale', (1.0  + (1 - act) * 0.055).toFixed(4));

      /* Clip-path na bg: revela a imagem de cima para baixo.
         inset(0 0 X% 0) — X=100% totalmente escondida, X=0 totalmente visível */
      var clipBot = (1 - act) * 100;
      if (bgEls[i]) {
        bgEls[i].style.clipPath = 'inset(0 0 ' + clipBot.toFixed(1) + '% 0)';
      }

      /* Título: sobe de baixo para cima ao ativar (dentro de wrapper overflow:hidden) */
      sc.style.setProperty('--title-y', ((1 - act) * 110).toFixed(1) + '%');

      /* Detalhes: entrada atrasada (começa quando atividade passa de 40%) */
      var detAct = Math.max(0, (act - 0.4) / 0.6);
      sc.style.setProperty('--details-op', detAct.toFixed(3));
      sc.style.setProperty('--details-y',  ((1 - detAct) * 16).toFixed(1) + 'px');

      /* Número: aparece com atividade */
      sc.style.setProperty('--num-op', act.toFixed(3));
      sc.style.setProperty('--num-y',  ((1 - act) * 10).toFixed(1) + 'px');
    }
  }

  /* --- Eventos --- */
  window.addEventListener('scroll', readScroll, { passive: true });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      setup();
      readScroll();
    }, 120);
  });

  /* --- Init --- */
  setup();
  if (scenes[0]) scenes[0].classList.add('is-active');
  requestAnimationFrame(tick);

}());
