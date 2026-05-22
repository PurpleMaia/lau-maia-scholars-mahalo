/* ============================================================
   PURPLE MAIʻA — MUʻO IN SAN FRANCISCO  |  main.js
   ============================================================ */

(function () {
  'use strict';

  /* ---- Nav shrink + scroll progress ---- */
  const nav = document.getElementById('site-nav');
  const progressFill = document.getElementById('scroll-progress-fill');

  function updateNav() {
    if (nav) {
      nav.classList.toggle('scrolled', window.scrollY > 80);
    }
    if (progressFill) {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(Math.max(window.scrollY / docHeight, 0), 1) : 0;
      progressFill.style.transform = 'scaleX(' + progress + ')';
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  window.addEventListener('resize', updateNav, { passive: true });
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

  /* ---- Photo lightbox: FLIP expand-from-grid + ESC/click-out/scroll/swipe to close ---- */
  (function setupLightbox() {
    const lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    const lightboxImg = lightbox.querySelector('.lightbox-img');
    const closeBtn = lightbox.querySelector('.lightbox-close');
    const prevBtn = lightbox.querySelector('.lightbox-prev');
    const nextBtn = lightbox.querySelector('.lightbox-next');
    const photos = Array.from(document.querySelectorAll('.grid-tile.photo-tile picture img'));
    if (photos.length === 0) return;

    let currentIndex = -1;
    let isOpen = false;
    let isAnimating = false;
    let previousFocus = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    function getCurrentOrigin() { return photos[currentIndex] || null; }

    function setOriginVisibility(visible) {
      const p = getCurrentOrigin();
      if (p) p.style.visibility = visible ? '' : 'hidden';
    }

    function animateOpen(originRect) {
      const naturalRect = lightboxImg.getBoundingClientRect();
      const dx = originRect.left - naturalRect.left;
      const dy = originRect.top - naturalRect.top;
      const sx = originRect.width / naturalRect.width;
      const sy = originRect.height / naturalRect.height;

      lightboxImg.style.transition = 'none';
      lightboxImg.style.transformOrigin = 'top left';
      lightboxImg.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      lightboxImg.offsetHeight; // reflow

      requestAnimationFrame(() => {
        lightboxImg.style.transition = 'transform 0.36s cubic-bezier(0.2, 0.8, 0.2, 1)';
        lightboxImg.style.transform = '';
      });

      // After the open animation finishes, clear inline transform state so
      // next/prev navigation doesn't animate from the previous grid origin.
      setTimeout(() => {
        lightboxImg.style.transition = '';
        lightboxImg.style.transformOrigin = '';
        lightboxImg.style.transform = '';
      }, 400);
    }

    function animateClose(targetRect, onDone) {
      const currentRect = lightboxImg.getBoundingClientRect();
      const dx = targetRect.left - currentRect.left;
      const dy = targetRect.top - currentRect.top;
      const sx = targetRect.width / currentRect.width;
      const sy = targetRect.height / currentRect.height;

      lightboxImg.style.transition = 'transform 0.3s cubic-bezier(0.5, 0, 0.4, 1)';
      lightboxImg.style.transformOrigin = 'top left';
      lightboxImg.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ')';
      setTimeout(onDone, 300);
    }

    function openAt(index, originEl) {
      if (isOpen || isAnimating) return;
      isAnimating = true;
      currentIndex = index;
      const photo = photos[currentIndex];
      const originRect = (originEl || photo).getBoundingClientRect();
      previousFocus = document.activeElement;

      lightboxImg.src = photo.src;
      lightboxImg.alt = photo.alt || '';
      lightbox.style.display = 'flex';

      function start() {
        lightbox.classList.add('open');
        animateOpen(originRect);
        setOriginVisibility(false);
        document.body.style.overflow = 'hidden';
        lightbox.setAttribute('aria-hidden', 'false');
        closeBtn.focus({ preventScroll: true });
        setTimeout(() => { isOpen = true; isAnimating = false; }, 360);
      }
      if (lightboxImg.complete && lightboxImg.naturalWidth > 0) {
        requestAnimationFrame(start);
      } else {
        lightboxImg.onload = () => requestAnimationFrame(start);
      }
    }

    function close() {
      if (!isOpen || isAnimating) return;
      isAnimating = true;
      const photo = getCurrentOrigin();
      if (!photo) return;
      const targetRect = photo.getBoundingClientRect();
      lightbox.classList.remove('open');

      animateClose(targetRect, () => {
        lightbox.style.display = 'none';
        lightboxImg.style.transition = 'none';
        lightboxImg.style.transform = '';
        setOriginVisibility(true);
        document.body.style.overflow = '';
        lightbox.setAttribute('aria-hidden', 'true');
        if (previousFocus) try { previousFocus.focus({ preventScroll: true }); } catch (e) {}
        isOpen = false;
        isAnimating = false;
      });
    }

    function go(delta) {
      if (!isOpen) return;
      setOriginVisibility(true);
      currentIndex = (currentIndex + delta + photos.length) % photos.length;

      // STEP 1: forcefully kill any inline transform/transition before navigating.
      // This prevents the residual FLIP transform from animating the new image
      // out of the grid origin point.
      lightboxImg.style.transition = 'none';
      lightboxImg.style.transform = 'none';
      lightboxImg.style.transformOrigin = '';
      lightboxImg.offsetHeight; // force reflow so the above takes effect

      // STEP 2: enable only the opacity transition, then fade out.
      lightboxImg.style.transition = 'opacity 0.13s ease-out';
      lightboxImg.style.opacity = '0';

      setTimeout(() => {
        const photo = photos[currentIndex];
        lightboxImg.src = photo.src;
        lightboxImg.alt = photo.alt || '';

        const fadeBackIn = () => {
          lightboxImg.style.opacity = '1';
          setOriginVisibility(false);
        };

        if (lightboxImg.complete && lightboxImg.naturalWidth > 0) {
          requestAnimationFrame(fadeBackIn);
        } else {
          lightboxImg.onload = () => requestAnimationFrame(fadeBackIn);
        }
      }, 150);
    }

    // Open on photo click
    photos.forEach((photo, i) => {
      photo.addEventListener('click', () => openAt(i, photo));
    });

    // Close button
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); go(-1); });
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); go(1); });

    // Click outside (anywhere on the lightbox that isn't a button) to close
    lightbox.addEventListener('click', (e) => {
      if (!isOpen) return;
      if (e.target.closest('.lightbox-close, .lightbox-prev, .lightbox-next')) return;
      close();
    });

    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    // Wheel-to-close (desktop)
    window.addEventListener('wheel', () => { if (isOpen) close(); }, { passive: true });

    // Touch swipe (mobile)
    lightbox.addEventListener('touchstart', (e) => {
      if (!isOpen || e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    }, { passive: true });

    lightbox.addEventListener('touchmove', (e) => {
      if (!isOpen || e.touches.length !== 1) return;
      const dx = e.touches[0].clientX - touchStartX;
      const dy = e.touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 25 && Math.abs(dx) > Math.abs(dy)) isSwiping = true;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      if (!isOpen) return;
      if (!isSwiping) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (dx < -50) go(1);
      else if (dx > 50) go(-1);
      isSwiping = false;
    }, { passive: true });
  })();

})();
