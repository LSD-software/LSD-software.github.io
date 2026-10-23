/* LSD Software — lightweight cinematic motion, no dependency. */
(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const init = () => {
    const body = document.body;
    if (!body) return;
    body.classList.add('motion-wow-ready');
    if (reduceMotion) return;

    // Reveal only meaningful content blocks; never hide controls, forms, or game canvases.
    const revealSelectors = [
      'main > section', 'main .home-game-card', 'main .project-card', 'main .feature-card',
      'main .about-card', 'main .content-card', 'main .glass-card', 'main article',
      'main .section-heading', 'main .hero-content', 'main .hero-copy'
    ];
    const nodes = [...new Set(revealSelectors.flatMap(selector => [...document.querySelectorAll(selector)]))]
      .filter(el => !el.closest('[hidden], [aria-hidden="true"]') && !el.matches('form, canvas, iframe, video, .no-motion'));
    if ('IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('motion-visible');
          revealObserver.unobserve(entry.target);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' });
      nodes.forEach((el, index) => {
        el.classList.add('motion-reveal');
        el.style.setProperty('--motion-delay', `${Math.min(index % 5, 4) * 65}ms`);
        revealObserver.observe(el);
      });
      // Ensure the initial viewport never feels blank on slower devices.
      requestAnimationFrame(() => nodes.filter(el => el.getBoundingClientRect().top < innerHeight * .88)
        .forEach(el => el.classList.add('motion-visible')));
    }

    if (!finePointer) return;
    let pointerFrame = 0;
    document.addEventListener('pointermove', event => {
      if (event.pointerType !== 'mouse' || pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        body.style.setProperty('--motion-pointer-x', `${event.clientX}px`);
        body.style.setProperty('--motion-pointer-y', `${event.clientY}px`);
        pointerFrame = 0;
      });
    }, { passive: true });

    // Small, restrained 3D response for content cards only (never interactive game surfaces).
    const tiltCards = [...document.querySelectorAll('main .home-game-card, main .project-card, main .feature-card, main .about-card, main .content-card, main .glass-card')]
      .filter(el => !el.closest('.game-frame, canvas, iframe, .no-motion'));
    tiltCards.forEach(card => {
      card.classList.add('motion-tilt');
      card.addEventListener('pointermove', event => {
        if (event.pointerType !== 'mouse') return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const rotateY = (x - .5) * 3.5;
        const rotateX = (.5 - y) * 3.0;
        card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-2px)`;
        card.classList.add('motion-tilt-active');
      }, { passive: true });
      card.addEventListener('pointerleave', () => {
        card.style.transform = '';
        card.classList.remove('motion-tilt-active');
      }, { passive: true });
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
