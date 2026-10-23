/* Page-specific interactions: gentle 3D tilt, scroll reveals, and no hidden content without JS support. */
(() => {
  const cards = [...document.querySelectorAll('[data-project-reveal]')];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!cards.length) return;

  if (!reduceMotion && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('projects-motion-ready');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('project-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
    cards.forEach((card, index) => {
      card.style.transitionDelay = `${Math.min(index % 3, 2) * 75}ms`;
      observer.observe(card);
    });
  }

  if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  cards.forEach(card => {
    let frame = 0;
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        card.style.transform = `translateY(-7px) rotateX(${(0.5 - y) * 3.2}deg) rotateY(${(x - 0.5) * 3.2}deg)`;
        card.style.setProperty('--pointer-x', `${x * 100}%`);
        card.style.setProperty('--pointer-y', `${y * 100}%`);
      });
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      card.style.transform = '';
    }, { passive: true });
  });
})();
