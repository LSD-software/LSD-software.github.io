/* LSD motion + image-format enhancement. Progressive enhancement only; game logic untouched. */
(function(){
  'use strict';
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const safe = (el) => !el.closest('canvas, .game-canvas, #gameCanvas, .game-board, .game-stage, .console-screen, .p5Canvas, [data-no-motion]');
  document.documentElement.classList.add('lsd-motion-ready');

  // Reveal large content sections as they enter view; never hide content if observer is unavailable.
  if(!reduced && 'IntersectionObserver' in window){
    const candidates = document.querySelectorAll('main > section, main > article, #hubMain > section, .hub-games-grid > *, .shop-grid > *, .leaderboard-list > *');
    const io = new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('lsd-in-view');io.unobserve(entry.target);}
    }),{threshold:.08,rootMargin:'0px 0px -24px 0px'});
    candidates.forEach((el,i)=>{if(safe(el)){el.classList.add('lsd-reveal');el.style.transitionDelay=Math.min(i%6,5)*35+'ms';io.observe(el);}});
  } else {
    document.querySelectorAll('.lsd-reveal').forEach(el=>el.classList.add('lsd-in-view'));
  }

  // Subtle click feedback for consumer-facing controls, excluding gameplay controls.
  if(!reduced){document.addEventListener('click',function(event){
    const target=event.target.closest('button, .btn, .hub-nav-btn, .shop-tab, a.button, [role="button"]');
    if(!target || !safe(target) || target.matches('[data-no-ripple], .game-control, .virtual-key, .controller-button')) return;
    const rect=target.getBoundingClientRect();if(!rect.width||!rect.height)return;
    const wave=document.createElement('span');wave.className='lsd-ripple-wave';
    const size=Math.max(rect.width,rect.height)*1.6;wave.style.width=size+'px';wave.style.height=size+'px';
    wave.style.left=(event.clientX-rect.left-size/2)+'px';wave.style.top=(event.clientY-rect.top-size/2)+'px';
    target.classList.add('lsd-ripple');target.appendChild(wave);wave.addEventListener('animationend',()=>wave.remove(),{once:true});
  },{passive:true});}

  // AVIF first for raster images under /img/ when the browser supports it; original source remains fallback.
  // Do not rewrite game art/data assets: only shared brand/profile/shop assets.
  const shared = /(^|\/)img\/(?:cosmetics\/|logo(?:LSD|CG|Console|Pesca)\.(?:png)|icon\.png|bg\.png)/i;
  document.querySelectorAll('img[src]').forEach(img=>{
    if(img.dataset.formatChecked || !shared.test(img.getAttribute('src')||''))return;
    const src=img.getAttribute('src');if(!/\.(png|jpe?g)$/i.test(src))return;
    const avif=src.replace(/\.(png|jpe?g)$/i,'.avif');const probe=new Image();
    probe.onload=()=>{img.src=avif;img.dataset.formatChecked='avif';};
    probe.onerror=()=>{img.dataset.formatChecked='fallback';};probe.src=avif;
  });
})();
