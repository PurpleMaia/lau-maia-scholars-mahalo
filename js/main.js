/* ============================================================
   PURPLE MAIʻA — MUʻO IN SAN FRANCISCO  |  main.js
   ============================================================ */

(function () {
  'use strict';

  /* ---- Nav shrink on scroll ---- */
  const nav = document.getElementById('site-nav');

  function updateNav() {
    if (!nav) return;
    nav.classList.toggle('scrolled', window.scrollY > 80);
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();

  /* ---- Scroll reveal via IntersectionObserver (hosts/days/mahalo pages) ---- */
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

  if (prefersReduced) {
    revealEls.forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    revealEls.forEach(el => observer.observe(el));
  }

  /* ---- Days page: smooth-scroll anchor sub-nav ---- */
  const daysLinks = document.querySelectorAll('.days-subnav-link');

  if (daysLinks.length > 0) {
    daysLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;

        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--nav-h'), 10) || 72;
        const subNavH = document.querySelector('.days-subnav')?.offsetHeight || 44;
        const offset = navH + subNavH + 16;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: prefersReduced ? 'auto' : 'smooth' });
      });
    });

    const daySections = document.querySelectorAll('.day-section');
    const subNavH = () => (document.querySelector('.days-subnav')?.offsetHeight || 44);

    function updateActiveDay() {
      const navH = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--nav-h'), 10) || 72;
      const scrollY = window.scrollY + navH + subNavH() + 32;

      let active = null;
      daySections.forEach(sec => {
        if (sec.offsetTop <= scrollY) active = sec.id;
      });

      daysLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === '#' + active);
      });
    }

    window.addEventListener('scroll', updateActiveDay, { passive: true });
    updateActiveDay();
  }

  /* ---- Grid: scroll-driven reveal + hover group ---- */
  const gridCanvas = document.getElementById('grid-canvas');

  if (gridCanvas) {

    const gridTiles = Array.from(gridCanvas.querySelectorAll('.grid-tile'));

    /* ── Scroll reveal via IntersectionObserver ──
       Tiles stagger by ring so outer columns (ring 0) always pop first. */
    if (prefersReduced) {
      gridTiles.forEach(t => t.classList.add('tile-visible'));
    } else {
      const gridObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const ring  = parseInt(entry.target.dataset.ring ?? 0);
            const delay = ring * 90;
            entry.target.style.transitionDelay = delay + 'ms';
            entry.target.classList.add('tile-visible');
            setTimeout(() => { entry.target.style.transitionDelay = ''; }, 600 + delay);
            gridObserver.unobserve(entry.target);
          });
        },
        { threshold: 0.06, rootMargin: '0px 0px -30px 0px' }
      );
      gridTiles.forEach(t => gridObserver.observe(t));
    }

  }

})();
