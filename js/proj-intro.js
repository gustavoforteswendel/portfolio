/* ============================================================
   PROJ-INTRO.JS — Introdução editorial da galeria de projetos
   Entrada letra a letra + saída blur pseudo-aleatória
   Mesma lógica de parallax-stacks.js | Sem dependências
============================================================ */
(function () {
  'use strict';

  var outer   = document.getElementById('proj-intro-outer');
  var section = document.getElementById('proj-intro');
  if (!outer || !section) return;

  /* ── Build letter spans ──────────────────────────────────
     Lê os [data-pi-w] do HTML, destrói e reconstrói como
     spans individuais por letra — idêntico ao padrão stacks.
  ──────────────────────────────────────────────────────── */
  var phrase  = section.querySelector('.pi-phrase');
  var wordEls = phrase ? Array.from(phrase.querySelectorAll('[data-pi-w]')) : [];
  var letters = [];

  if (phrase && wordEls.length) {
    /* Guarda definição antes de limpar */
    var wordDefs = wordEls.map(function (w) {
      return { text: w.textContent, em: w.hasAttribute('data-em') };
    });

    phrase.innerHTML = '';

    wordDefs.forEach(function (wd, wi) {
      /* Espaço entre palavras */
      if (wi > 0) {
        var sp = document.createElement('span');
        sp.className   = 'pi-letter pi-letter--space';
        sp.textContent = ' ';
        phrase.appendChild(sp);
        letters.push(sp);
      }

      wd.text.split('').forEach(function (ch) {
        var span = document.createElement('span');
        span.className   = 'pi-letter' + (wd.em ? ' pi-letter--em' : '');
        span.textContent = ch;
        phrase.appendChild(span);
        letters.push(span);
      });
    });
  }

  var nL = letters.length;

  /* ── Outros elementos ── */
  var eyebrow = section.querySelector('.pi-eyebrow');
  var details = section.querySelector('.pi-details');
  var bridge  = section.querySelector('.pi-bridge');
  var frags   = section.querySelectorAll('.pi-frag');

  /* ── Pseudo-aleatório determinístico (mesmo de stacks) ── */
  function pseudoRand(s) {
    var x = Math.sin(s * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* Ordem de saída: rank pseudo-aleatório por índice de letra */
  var exitRank = (function () {
    var pairs = letters.map(function (_, i) { return { i: i, r: pseudoRand(i + 3) }; });
    pairs.sort(function (a, b) { return a.r - b.r; });
    var rank = new Array(nL);
    pairs.forEach(function (p, pos) { rank[p.i] = pos; });
    return rank;
  }());

  /* ── Easing ── */
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeIn(t)  { return t * t * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* ── Progresso de scroll 0→1 ── */
  function getP() {
    var sTop = outer.offsetTop;
    var sH   = outer.offsetHeight;
    var vH   = window.innerHeight;
    return clamp((window.scrollY - sTop) / (sH - vH), 0, 1);
  }

  /* ── Visibilidade — pausa quando fora da viewport ── */
  var visible = false;
  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
  }, { threshold: 0 }).observe(outer);

  /* ── Update ─────────────────────────────────────────────
     Timeline (p = 0→1 dentro da proj-intro-outer):

     p 0.03–0.12  eyebrow fade-in
     p 0.04–0.62  letras entram sequencialmente, blur 6→0
     p 0.58–0.68  detalhes + bridge entram
     p 0.65–0.90  letras somem em ordem pseudo-aleatória, blur 0→8
     p 0.68–0.80  detalhes + bridge somem
     p 0.72–0.82  eyebrow some
     p 0.80–1.00  fragmentos derivam para os lados e somem
  ──────────────────────────────────────────────────────── */
  function update() {
    if (!visible) return;
    var p = getP();

    /* ── Eyebrow ── */
    if (eyebrow) {
      var ebIn  = easeOut(clamp((p - 0.03) / 0.09, 0, 1));
      var ebOut = easeOut(clamp((p - 0.72) / 0.10, 0, 1));
      eyebrow.style.opacity   = (ebIn * (1 - ebOut)).toFixed(3);
      eyebrow.style.transform = 'translateY(' + ((1 - ebIn) * 14).toFixed(1) + 'px)';
    }

    /* ── Letras: entrada sequencial + saída pseudo-aleatória ── */
    letters.forEach(function (letter, i) {
      /* ENTRADA: p 0.04→0.62 — cada letra tem janela de ~0.06 */
      var apT  = 0.04 + (i / Math.max(nL - 1, 1)) * 0.58;
      var apP  = clamp((p - apT) / 0.06, 0, 1);
      var apOp = easeOut(apP);
      var apBl = (1 - apP) * 6;

      /* SAÍDA: p 0.65→0.90 — ordem pseudo-aleatória */
      var exT  = 0.65 + (exitRank[i] / Math.max(nL - 1, 1)) * 0.25;
      var exP  = clamp((p - exT) / 0.07, 0, 1);
      var exOp = 1 - easeIn(exP);
      var exBl = exP * 8;

      var op   = apOp * exOp;
      var blur = apBl + exBl;

      letter.style.opacity = op.toFixed(3);
      letter.style.filter  = blur > 0.05 ? 'blur(' + blur.toFixed(1) + 'px)' : '';
    });

    /* ── Detalhes + bridge ── */
    var dIn  = easeOut(clamp((p - 0.58) / 0.10, 0, 1));
    var dOut = easeOut(clamp((p - 0.68) / 0.12, 0, 1));
    if (details) {
      details.style.opacity   = (dIn * (1 - dOut)).toFixed(3);
      details.style.transform = 'translateY(' + ((1 - dIn) * 10).toFixed(1) + 'px)';
    }
    if (bridge) {
      bridge.style.opacity = (dIn * (1 - dOut) * 0.6).toFixed(3);
    }

    /* ── Fragmentos: fade-in escalonado + parallax + saída lateral ── */
    frags.forEach(function (frag) {
      var speed  = parseFloat(frag.dataset.speed) || 0.25;
      var baseOp = parseFloat(frag.dataset.op)    || 0.45;
      var dir    = frag.dataset.dir === 'r' ? 1 : -1;
      var delay  = parseFloat(frag.dataset.delay) || 0;

      var fadeIn = easeOut(clamp((p - delay) / 0.10, 0, 1));
      var yShift = -p * speed * 110;
      var exitFP = easeOut(clamp((p - 0.80) / 0.20, 0, 1));
      var xShift = exitFP * dir * 100;

      frag.style.opacity   = (fadeIn * (1 - exitFP * 0.95) * baseOp).toFixed(3);
      frag.style.transform = 'translateY(' + yShift.toFixed(1) + 'px) translateX(' + xShift.toFixed(1) + 'px)';
    });
  }

  /* ── RAF throttle ── */
  var rafId = null;
  function onScroll() {
    if (rafId) return;
    rafId = requestAnimationFrame(function () { rafId = null; update(); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', update,   { passive: true });
  update();
}());
