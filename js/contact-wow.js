/* Contact page micro-interactions: subtle 3D tilt and pointer glow, no dependencies. */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const init = () => {
    const hero = document.querySelector('.contact-hero');
    const cards = [...document.querySelectorAll('[data-contact-tilt]')];
    if (!hero) return;
    hero.classList.add('contact-motion-ready');
    if (reduce || !fine) return;
    const tilt = (el, event, max = 3.5) => {
      const r = el.getBoundingClientRect();
      const x = (event.clientX - r.left) / r.width;
      const y = (event.clientY - r.top) / r.height;
      el.style.setProperty('--card-x', `${x * 100}%`);
      el.style.setProperty('--card-y', `${y * 100}%`);
      const ry = (x - .5) * max;
      const rx = (.5 - y) * max * .75;
      el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-2px)`;
    };
    cards.forEach(card => {
      card.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') tilt(card, e, 5); }, { passive: true });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; card.style.removeProperty('--card-x'); card.style.removeProperty('--card-y'); }, { passive: true });
    });
    hero.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      hero.style.setProperty('--hero-pointer-x', `${x * 100}%`);
      hero.style.setProperty('--hero-pointer-y', `${y * 100}%`);
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { hero.style.removeProperty('--hero-pointer-x'); hero.style.removeProperty('--hero-pointer-y'); }, { passive: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
