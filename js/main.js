/* =============================================
   MAIN.JS — Gustavo Wenzel Portfolio
   Comportamentos core: nav, intersection observer, mobile menu
============================================= */

(function () {
  'use strict';

  /* --- NAV: classe ao scrollar --- */
  const nav = document.getElementById('nav');

  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('nav--scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* --- NAV: link ativo por seção visível --- */
  const navLinks = document.querySelectorAll('.nav__link');
  const sections = document.querySelectorAll('section[id]');

  if (navLinks.length && sections.length) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('id');
            navLinks.forEach((link) => {
              const href = link.getAttribute('href');
              link.classList.toggle('nav__link--active', href === `#${id}`);
            });
          }
        });
      },
      { threshold: 0.45 }
    );

    sections.forEach((s) => sectionObserver.observe(s));
  }

  /* --- NAV: mobile toggle --- */
  const toggle   = document.getElementById('nav-toggle');
  const linkList = document.getElementById('nav-links');

  if (toggle && linkList) {
    toggle.addEventListener('click', () => {
      const isOpen = linkList.classList.toggle('nav__links--open');
      toggle.classList.toggle('nav__toggle--active', isOpen);
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    /* Fechar ao clicar em um link */
    linkList.querySelectorAll('.nav__link').forEach((link) => {
      link.addEventListener('click', () => {
        linkList.classList.remove('nav__links--open');
        toggle.classList.remove('nav__toggle--active');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

})();
