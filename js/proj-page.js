/* =============================================
   PROJ-PAGE.JS — Scroll reveals para páginas de projeto
   Inner-reveal: dispara quando 40% da composição já está
   visível — usuário vê a imagem base antes da transição.
   Sem dependências | RAF-throttled scroll listener
============================================= */
(function () {
  'use strict';

  /* ── Composition reveals ─────────────────────────────────
     Estratégia: checa o ponto que fica a 40% da altura
     da composição (de cima). Quando esse ponto cruza
     72% da viewport de cima para baixo → dispara.

     Para uma composição de 80vh:
       ponto = 32vh abaixo do topo da comp
       disparo quando topo da comp < 72 - 32 = 40vh do topo da vp
       → ~60vh da composição já está visível antes do reveal
  ──────────────────────────────────────────────────────── */
  var comps   = Array.from(document.querySelectorAll('.proj-comp'));
  var pending = comps.slice();

  function checkComps() {
    if (!pending.length) return;
    var vH = window.innerHeight;
    pending = pending.filter(function (comp) {
      var rect       = comp.getBoundingClientRect();
      var checkPoint = rect.top + rect.height * 0.40;
      if (checkPoint < vH * 0.72) {
        comp.classList.add('is-revealed');
        return false;
      }
      return true;
    });
    if (!pending.length) {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', checkComps);
    }
  }

  if (comps.length) {
    var rafId = null;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(function () { rafId = null; checkComps(); });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', checkComps, { passive: true });
    checkComps();
  }

  /* ── Scroll-reveal genérico (.js-reveal → .is-visible) ── */
  var reveals = document.querySelectorAll('.js-reveal');
  if (reveals.length) {
    var revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { revealObs.observe(el); });
  }

}());
