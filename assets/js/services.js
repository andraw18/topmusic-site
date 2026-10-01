
// lazy video load
(function(){
  const videos = Array.from(document.querySelectorAll('video[data-lazy-video]'));
  if (!videos.length) return;

  const loadVideo = (video) => {
    if (video.dataset.lazyLoaded === '1') return;
    const sources = Array.from(video.querySelectorAll('source[data-src]'));
    if (!sources.length) return;

    sources.forEach(source => {
      source.src = source.dataset.src;
      delete source.dataset.src;
    });

    video.dataset.lazyLoaded = '1';
    video.load();
    if (video.autoplay) {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  };

  if (!('IntersectionObserver' in window)) {
    videos.forEach(loadVideo);
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      loadVideo(entry.target);
      io.unobserve(entry.target);
    });
  }, { threshold: 0.1, rootMargin: '180px 0px' });

  videos.forEach(video => io.observe(video));
})();

// reveal
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')}),{threshold:.04});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));

// Match the home-page header and reduce section navigation to a compact control after the hero.
(function(){
  const nav=document.getElementById('nav');
  const hero=document.querySelector('.ph');
  const burger=document.getElementById('burger');
  const mobileMenu=document.getElementById('mobNav');
  const switcher=document.getElementById('sectionSwitcher');
  const switcherButton=switcher?.querySelector('.section-switcher-toggle');
  if(!nav||!hero||!burger||!mobileMenu||!switcher||!switcherButton)return;

  const setMenuOpen=open=>{
    mobileMenu.classList.toggle('open',open);
    mobileMenu.setAttribute('aria-hidden',String(!open));
    burger.classList.toggle('open',open);
    burger.setAttribute('aria-expanded',String(open));
    burger.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
    document.body.style.overflow=open?'hidden':'';
  };
  const setSwitcherOpen=open=>{
    switcher.classList.toggle('is-open',open);
    switcherButton.setAttribute('aria-expanded',String(open));
  };
  const syncScroll=()=>{
    nav.classList.toggle('stuck',window.scrollY>24);
    const showSwitcher=hero.getBoundingClientRect().bottom<=nav.getBoundingClientRect().bottom+12;
    switcher.classList.toggle('is-visible',showSwitcher);
    if(!showSwitcher)setSwitcherOpen(false);
  };

  burger.addEventListener('click',()=>setMenuOpen(!mobileMenu.classList.contains('open')));
  mobileMenu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenuOpen(false)));
  switcher.addEventListener('pointerenter',()=>{
    if(matchMedia('(hover:hover) and (pointer:fine)').matches)setSwitcherOpen(true);
  });
  switcher.addEventListener('pointerleave',()=>setSwitcherOpen(false));
  switcher.addEventListener('focusout',event=>{
    if(!switcher.contains(event.relatedTarget))setSwitcherOpen(false);
  });
  switcherButton.addEventListener('click',event=>{
    const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    setSwitcherOpen(finePointer||event.detail===0?true:!switcher.classList.contains('is-open'));
  });
  switcher.querySelectorAll('.section-switcher-panel a').forEach(link=>link.addEventListener('click',()=>setSwitcherOpen(false)));
  document.addEventListener('click',event=>{
    if(!switcher.contains(event.target))setSwitcherOpen(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(mobileMenu.classList.contains('open'))setMenuOpen(false);
    if(switcher.classList.contains('is-open')){setSwitcherOpen(false);switcherButton.focus();}
  });
  window.addEventListener('scroll',syncScroll,{passive:true});
  window.addEventListener('resize',syncScroll);
  syncScroll();
})();

// scroll to anchor
if(location.hash){
  setTimeout(()=>{
    const el=document.getElementById(location.hash.slice(1));
    if(el)el.scrollIntoView({behavior:'smooth',block:'start'});
  },400);
}
