/* =============================================
   CARD-INTERACTION.JS — Gustavo Wenzel Portfolio

   Transição shared-element ao clicar num .scene:

   1. Salva os bounds + dados do scene no sessionStorage
      (lidos pela página de destino para a entrada do hero).
   2. Cria um overlay fixed com a imagem do projeto como fundo.
   3. Anima clip-path dos bounds exatos do scene até tela cheia —
      dando a ilusão de que a própria cena se transforma na hero.
   4. Navega para a página do projeto após a transição.

   Suporte a teclado (Enter / Space).
   Respeita prefers-reduced-motion.
============================================= */

(function () {
  'use strict';

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var scenes = document.querySelectorAll('.scene');
  if (!scenes.length) return;

  scenes.forEach(function (scene) {
    var link = scene.querySelector('.scene__link');
    if (!link) return;

    scene.setAttribute('tabindex', '0');

    scene.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(scene, link);
      }
    });

    link.addEventListener('click', function (e) {
      e.preventDefault();
      activate(scene, link);
    });
  });

  function activate(scene, link) {
    var href = link.getAttribute('href');
    if (!href) return;
    storeBounds(scene);
    if (prefersReduced) {
      window.location.href = href;
      return;
    }
    runTransition(scene, href);
  }

  function storeBounds(scene) {
    try {
      var rect = scene.getBoundingClientRect();
      var img  = scene.querySelector('.scene__img');
      sessionStorage.setItem('card-transition', JSON.stringify({
        project: scene.dataset.project,
        index:   scene.dataset.index,
        top:     rect.top,
        left:    rect.left,
        width:   rect.width,
        height:  rect.height,
        imgSrc:  img ? img.getAttribute('src') : '',
      }));
    } catch (_) {}
  }

  function runTransition(scene, href) {
    var rect = scene.getBoundingClientRect();
    var vw   = window.innerWidth;
    var vh   = window.innerHeight;
    var img  = scene.querySelector('.scene__img');

    /* clip-path inset(top right bottom left) — parte dos bounds do scene */
    var t = Math.max(0, Math.round(rect.top));
    var r = Math.max(0, Math.round(vw - rect.right));
    var b = Math.max(0, Math.round(vh - rect.bottom));
    var l = Math.max(0, Math.round(rect.left));

    var overlay = document.createElement('div');
    overlay.className = 'page-transition-overlay';

    /* Usa a mesma imagem do scene como fundo do overlay */
    var bgUrl   = img ? img.getAttribute('src') : '';
    var bgStyle = bgUrl
      ? 'background:url(' + bgUrl + ') center top / cover no-repeat'
      : 'background:#080808';

    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9999',
      'pointer-events:none',
      bgStyle,
      'clip-path:inset(' + t + 'px ' + r + 'px ' + b + 'px ' + l + 'px)',
      'transition:clip-path 0.72s cubic-bezier(0.16,1,0.3,1)',
    ].join(';');

    document.body.appendChild(overlay);

    /* Dois rAF: garante pintura do estado inicial antes da transição */
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.style.clipPath = 'inset(0px 0px 0px 0px)';
      });
    });

    /* Navega após a animação completar */
    setTimeout(function () {
      window.location.href = href;
    }, 780);
  }

}());
