
// PAGE WARP + RED DISTORTION
(function(){
  const body = document.body;
  if (!body || body.dataset.warpInit === '1') return;
  body.dataset.warpInit = '1';

  const root = document.getElementById('pageRoot');
  if (!root) return;

  const triggerWarp = () => {
    const cold = Math.random() < 0.28;
    root.classList.toggle('ice-warp', cold);
    root.classList.toggle('red-warp', !cold);
    window.setTimeout(() => root.classList.remove('red-warp'), 950);
    window.setTimeout(() => root.classList.remove('ice-warp'), 950);
  };

  window.setTimeout(triggerWarp, 3500);
  const loop = () => {
    const wait = 10000 + Math.random() * 9000;
    window.setTimeout(() => {
      if (Math.random() < 0.95) triggerWarp();
      loop();
    }, wait);
  };
  loop();
})();

// Text reviews: one-card navigation, native swipe/scroll, and full quotes on demand.
(function(){
  const section = document.getElementById('reviews');
  if (!section) return;
  const track = section.querySelector('.reviews-track');
  const cards = [...track.querySelectorAll('.rv-card')];
  const previous = section.querySelector('[data-review-prev]');
  const next = section.querySelector('[data-review-next]');
  const refreshMore = () => cards.forEach(card => {
    if (card.classList.contains('is-expanded')) return;
    const text = card.querySelector('.rv-text');
    card.querySelector('.rv-more').hidden = text.scrollHeight <= text.clientHeight + 2;
  });
  const update = () => {
    previous.disabled = track.scrollLeft < 2;
    next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
  };
  const move = direction => {
    const step = cards[1]?.offsetLeft - cards[0]?.offsetLeft || cards[0]?.offsetWidth || 1;
    track.scrollBy({left: direction * step, behavior: 'smooth'});
  };
  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', update, {passive:true});
  window.addEventListener('resize', () => { update(); refreshMore(); });
  track.addEventListener('click', event => {
    const button = event.target.closest('.rv-more');
    if (!button) return;
    const expanded = button.closest('.rv-card').classList.toggle('is-expanded');
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? 'Свернуть ↑' : 'Читать полностью ↓';
    if (!expanded) refreshMore();
  });
  update();
  refreshMore();
  document.fonts?.ready.then(refreshMore);
})();

// HERO VIDEO LOOP
(function(){
  const video = document.getElementById('heroVideo');
  if (!video) return;
  video.loop = true;
  video.setAttribute('loop', '');
  const safePlay = () => {
    const p = video.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  video.addEventListener('loadedmetadata', safePlay, { once: true });
  safePlay();
})();

// LAZY VIDEOS
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

// TRACK PLAYER
(function(){
  const btn = document.getElementById('soundBtn');
  if (!btn) return;

  const NOTE_FREQ = {
    C2: 65.41,
    D2: 73.42,
    Eb2: 77.78,
    F2: 87.31,
    G2: 98.00,
    Ab2: 103.83,
    Bb1: 58.27,
    C3: 130.81
  };

  const seq = [
    {kick:true,bass:'C2',hat:false},
    {kick:false,bass:'Eb2',hat:true},
    {kick:false,bass:'G2',hat:false},
    {kick:true,bass:'Bb1',hat:true},
    {kick:false,bass:'C2',hat:false},
    {kick:false,bass:'Ab2',hat:true},
    {kick:false,bass:'G2',hat:false},
    {kick:true,bass:'F2',hat:true}
  ];

  let ctx = null;
  let master = null;
  let timer = null;
  let playing = false;
  let step = 0;
  const stepMs = 340;

  const setState = (on) => {
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'Остановить трек' : 'Включить трек');
  };

  const ensureAudio = async () => {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.12;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 22;
      comp.ratio.value = 3.6;
      comp.attack.value = 0.006;
      comp.release.value = 0.18;

      const send = ctx.createGain();
      send.gain.value = 0.14;
      const dry = ctx.createGain();
      dry.gain.value = 1;

      const delay = ctx.createDelay(0.32);
      delay.delayTime.value = 0.12;
      const fb = ctx.createGain();
      fb.gain.value = 0.22;
      delay.connect(fb);
      fb.connect(delay);

      master.connect(dry);
      master.connect(send);
      send.connect(delay);
      delay.connect(comp);
      fb.connect(comp);
      dry.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') await ctx.resume();
  };

  const env = (gainNode, t, a = 0.004, d = 0.26, s = 0.5, r = 0.18, peak = 1) => {
    gainNode.gain.cancelScheduledValues(t);
    gainNode.gain.setValueAtTime(0.0001, t);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    gainNode.gain.exponentialRampToValueAtTime(Math.max(peak * s, 0.0001), t + a + d);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, t + a + d + r);
  };

  const kick = (t) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'sine';
    o.frequency.setValueAtTime(148, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.13);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(240, t);
    g.gain.value = 0.001;
    env(g, t, 0.003, 0.1, 0.35, 0.16, 1);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.35);
  };

  const bass = (freq, t) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    o.detune.setValueAtTime(-3, t);
    f.type = 'lowpass';
    f.frequency.setValueAtTime(Math.min(900, freq * 7.5), t);
    f.Q.value = 1.2;
    env(g, t, 0.006, 0.2, 0.55, 0.2, 0.78);
    o.connect(f);
    f.connect(g);
    g.connect(master);
    o.start(t);
    o.stop(t + 0.62);
  };

  const hat = (t) => {
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
    noise.buffer = buf;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    f.type = 'highpass';
    f.frequency.setValueAtTime(5200, t);
    env(g, t, 0.002, 0.035, 0.18, 0.06, 0.18);
    noise.connect(f);
    f.connect(g);
    g.connect(master);
    noise.start(t);
    noise.stop(t + 0.09);
  };

  const tick = () => {
    const t = ctx.currentTime + 0.015;
    const slot = seq[step % seq.length];
    if (slot.kick) kick(t);
    if (slot.bass) bass(NOTE_FREQ[slot.bass] || 65.41, t);
    if (slot.hat) hat(t + 0.02);
    step = (step + 1) % seq.length;
  };

  const start = async () => {
    await ensureAudio();
    if (playing) return;
    playing = true;
    setState(true);
    tick();
    timer = window.setInterval(tick, stepMs);
  };

  const stop = () => {
    playing = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    setState(false);
  };

  btn.addEventListener('click', () => {
    if (playing) stop();
    else start().catch(() => {});
  });
})();

// BEGINNER ADVICE MODAL
(function(){
  const btn = document.getElementById('adviceBtn');
  const modal = document.getElementById('adviceModal');
  if (!btn || !modal) return;

  const titleEl = document.getElementById('adviceStepTitle');
  const bodyEl = document.getElementById('adviceStepBody');
  const noEl = document.getElementById('adviceNo');
  const dotsEl = document.getElementById('adviceDots');
  const prevBtn = document.getElementById('advicePrev');
  const nextBtn = document.getElementById('adviceNext');
  const closeBtn = document.getElementById('adviceClose');

  const steps = [
    {"title": "Поспешил – алгоритмы насмешил", "body": "Подготовь несколько законченных треков и выпускай их последовательно с интервалом 15–20 дней. Смотри на реакцию аудитории и после 3–5 релизов без результата корректируй продвижение."},
    {"title": "Один артист – один жанр", "body": "Выбери жанр и работай в нём последовательно. Если хочется выпускать музыку в разных жанрах, создай для них отдельные профили артиста."},
    {"title": "Постоянство – путь к успеху", "body": "Публикуй контент каждые несколько дней и выпускай новую музыку хотя бы раз в месяц."},
    {"title": "Не звучи как нейросеть", "body": "Качество твоей музыки конкурирует в том числе с AI-артистами. Внимательно работай над материалом и звучанием."},
    {"title": "Злой звукач – беда для фонограммы", "body": "Дай звукорежиссёру ясный бриф: референсы, настроение, пожелания к вокалу и общему звуку. Так результат будет ближе к твоей идее."},
    {"title": "Сам себе режиссёр", "body": "Не спрашивай мнение всех подряд. Слушай полезную обратную связь, но решение о релизе принимай сам и доверяй своему вкусу."},
    {"title": "Проверяй работу", "body": "Послушай песню на телефоне, в машине и в наушниках, а клип посмотри на телевизоре и телефоне. Запиши замечания и обсуди правки с командой."}
  ];

  let index = 0;

  const renderDots = () => {
    dotsEl.innerHTML = '';
    steps.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `advice-dot${i === index ? ' on' : ''}`;
      dot.setAttribute('aria-label', `Совет ${i + 1}`);
      dot.addEventListener('click', () => {
        index = i;
        render();
      });
      dotsEl.appendChild(dot);
    });
  };

  const render = () => {
    const step = steps[index];
    if (!step) return;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    noEl.textContent = String(index + 1).padStart(2, '0');
    if (nextBtn) nextBtn.textContent = index === steps.length - 1 ? 'Связаться' : 'Далее';
    renderDots();
  };

  const open = () => {
    index = 0;
    render();
    modal.classList.add('on');
    modal.setAttribute('aria-hidden', 'false');
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    document.body.classList.add('advice-open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    modal.classList.remove('on');
    modal.setAttribute('aria-hidden', 'true');
    btn.classList.remove('active');
    btn.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('advice-open');
    document.body.style.overflow = '';
  };

  const next = () => {
    if (index === steps.length - 1) {
      close();
      const contact = document.getElementById('contact');
      if (contact) contact.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    index = (index + 1) % steps.length;
    render();
  };

  const prev = () => {
    index = (index - 1 + steps.length) % steps.length;
    render();
  };

  btn.addEventListener('click', open);
  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', (e) => {
    if (e.target === modal || e.target.dataset.close === 'true') close();
  });
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('on')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  });
})();

// LOADER
(function(){
  const ld = document.getElementById('ld');
  if(!ld) return;
  const safeClose = () => ld.classList.add('out');
  setTimeout(safeClose, 2400);
})();

// NAV
const syncHomeNav = () => document.getElementById('nav').classList.toggle('stuck', window.scrollY > 24);
syncHomeNav();
window.addEventListener('scroll', syncHomeNav, {passive:true});

const tracksToggle = document.getElementById('tracksToggle');
const tracksList = document.getElementById('trList');
const moreTracks = [
  {n:11,name:"Лошадиная сила",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/41519816/track/150120876?utm_source=web&utm_medium=copy_link"},
  {n:12,name:"Я начинаю свой бой",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/41541105/track/150166602?utm_source=web&utm_medium=copy_link"},
  {n:13,name:"Танцуем в 80х ремикс",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/42408877/track/152151468?utm_source=web&utm_medium=copy_link"},
  {n:14,name:"В забайкалье",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/41810940/track/150792874?utm_source=web&utm_medium=copy_link"},
  {n:15,name:"Больше чем люблю",artist:"SLAVA CRYSTALL, Anvir",url:"https://music.yandex.ru/album/40106281/track/146991827"},
  {n:16,name:"Ты не придёшь",artist:"Илья Тимошек, Андрей Бурдуковский",url:"https://music.yandex.ru/album/37249014/track/140635985?utm_source=web&utm_medium=copy_link"},
  {n:17,name:"Om Namo",artist:"ANDRAW",url:"https://music.yandex.ru/album/33989866/track/132865056?utm_source=web&utm_medium=copy_link"},
  {n:18,name:"Ты не знаешь",artist:"Пчела",url:"https://music.yandex.ru/album/34396817/track/133900422"},
  {n:19,name:"Выбирай себя",artist:"LEMU",url:"https://music.yandex.ru/album/41487745/track/150049750?utm_source=web&utm_medium=copy_link"},
  {n:20,name:"Стены слышат",artist:"LEMU",url:"https://music.yandex.ru/album/38211686/track/142895697"},
  {n:21,name:"Огонь Любви",artist:"Восток",url:"https://music.yandex.ru/album/40895208/track/137960159?utm_source=web&utm_medium=copy_link"},
  {n:22,name:"Птицы",artist:"Черемуха",url:"https://disk.yandex.ru/d/hysRVHPnHiyBAQ"},
  {n:23,name:"Твоя Красота",artist:"Гэсэр",url:"https://disk.yandex.ru/d/Jgk-qaJpdA06mQ"},
  {n:24,name:"Без ответа",artist:"Андрей Бурдуковский, Alexandr Pierce",url:"https://music.yandex.ru/album/38648670/track/143992790?utm_source=web&utm_medium=copy_link"},
  {n:25,name:"Любви пули",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/37393672/track/140964516?utm_source=web&utm_medium=copy_link"},
  {n:26,name:"Атом",artist:"MILANA BURMISS",url:"https://music.yandex.ru/album/41807803/track/150781604"},
  {n:27,name:"Магнит",artist:"Алина Дерябина",url:"https://music.yandex.ru/album/35009152/track/135259784"},
  {n:28,name:"Лети (Концертная версия)",artist:"Mishel Dar, Василиса Лёвшина",url:"https://disk.yandex.ru/d/Sl3Wsfsd60nmHg"},
  {n:29,name:"С гитарой у костра",artist:"Андрей Бурдуковский, Дмитрий Гревцев",url:"https://music.yandex.ru/album/36222698/track/138189730?utm_source=web&utm_medium=copy_link"},
  {n:30,name:"Танцуем в 80х",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/33577379/track/131857754?utm_source=web&utm_medium=copy_link"},
  {n:31,name:"Время Рождества",artist:"Ольга Сиу",url:"https://music.yandex.ru/album/34756337/track/134749744"},
  {n:32,name:"Любовь-морковь",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/37862756/track/142035909?utm_source=web&utm_medium=copy_link"},
  {n:33,name:"Не время отступать",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/37848429/track/141983282?utm_source=web&utm_medium=copy_link"},
  {n:34,name:"Мир другой",artist:"Восток",url:"https://music.yandex.ru/album/40895208/track/147374285?utm_source=web&utm_medium=copy_link"},
  {n:35,name:"Moon",artist:"ANDRAW",url:"https://music.yandex.ru/album/37918402/track/142175277?utm_source=web&utm_medium=copy_link"},
  {n:36,name:"Приходи",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/34401640/track/133909730"},
  {n:37,name:"Гори оно всё огнём",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/artist/17483440/tracks"},
  {n:38,name:"Мой вайб",artist:"LEMU",url:"https://music.yandex.ru/album/35950303/track/136058295"},
  {n:39,name:"Магия",artist:"LEMU",url:"https://music.yandex.ru/album/35835794/track/137240773"},
  {n:40,name:"Пока мы живы (Acoustic)",artist:"LEMU",url:"https://music.yandex.ru/album/36130010/track/129675143"},
  {n:41,name:"Мир в котором мир",artist:"LEMU",url:"https://music.yandex.ru/album/28116958/track/119043922"},
  {n:42,name:"Женщины ждут и верят",artist:"Сёстры Селезнёвы",url:"https://music.yandex.ru/album/35551010/track/136457267"},
  {n:43,name:"Рыбка",artist:"Сёстры Селезнёвы",url:"https://music.yandex.ru/album/34733737/track/134696035"},
  {n:44,name:"Времена кассет",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/41564556/track/150216402?utm_source=web&utm_medium=copy_link"},
  {n:45,name:"Без вас, девчонки",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/40944649/track/148829652?utm_source=web&utm_medium=copy_link"},
  {n:46,name:"Где же ты теперь, любовь",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/38152243/track/142744641?utm_source=web&utm_medium=copy_link"},
  {n:47,name:"Ecstatic",artist:"ANDRAW",url:"https://music.yandex.ru/album/35287266/track/135861906"},
  {n:48,name:"Unda Fay",artist:"ANDRAW",url:"https://music.yandex.ru/album/35287266/track/135861906"},
  {n:49,name:"Батюшка Владимир",artist:"Сёстры Селезнёвы",url:"https://music.yandex.ru/album/34635940/track/134461995"},
  {n:50,name:"Сладко в облака",artist:"Сёстры Селезнёвы",url:"https://music.yandex.ru/album/35230945/track/135724290"},
  {n:51,name:"Wrigo",artist:"Elfguitar",url:"https://music.yandex.ru/album/37270532/track/140681241"},
  {n:52,name:"In Vivo",artist:"Elfguitar",url:"https://music.yandex.ru/album/36668018/track/139260118"},
  {n:53,name:"Gravitas",artist:"Elfguitar",url:"https://music.yandex.ru/album/35434817/track/136197422"},
  {n:54,name:"Adventus",artist:"Elfguitar",url:"https://music.yandex.ru/album/30901131/track/125262842"},
  {n:55,name:"Зачем тебе розы",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/37127168/track/140352658"},
  {n:56,name:"Дождь идёт по крыше",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/34152523/track/133294123"},
  {n:57,name:"Замуж по любви",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/34061423/track/133039325"},
  {n:58,name:"Последний поцелуй",artist:"Андрей Бурдуковский, Bixame",url:"https://music.yandex.ru/album/40021150/track/146812715"},
  {n:59,name:"Иллюзия чувств",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/35071217/track/135391316"},
  {n:60,name:"Мы больше не дети",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/36312192/track/138413686"},
  {n:61,name:"Километры",artist:"Андрей Бурдуковский, Alexandr Pierce",url:"https://music.yandex.ru/album/40306572/track/147414265"},
  {n:62,name:"Говоришь прощай",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/27960874/track/118693844"},
  {n:63,name:"Шатуновая",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/33964460/track/132805689"},
  {n:64,name:"Не залатать",artist:"Андрей Бурдуковский, Дмитрий Гревцев",url:"https://music.yandex.ru/album/36387823/track/138590597"},
  {n:65,name:"Последний звонок",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/31279290/track/126118900"},
  {n:66,name:"Проложу маршруты",artist:"Андрей Бурдуковский",url:"https://music.yandex.ru/album/27634562/track/117960754"},
  {n:67,name:"Прошлый разговор",artist:"Андрей Бурдуковский, Дмитрий Гревцев",url:"https://music.yandex.ru/album/28984342/track/121011706"},
  {n:68,name:"Когда-нибудь",artist:"LEMU",url:"https://music.yandex.ru/album/30290124/track/123882251"},
  {n:69,name:"Твоё имя",artist:"LEMU",url:"https://music.yandex.ru/album/30290124/track/123882251"},
  {n:70,name:"Дороги",artist:"LEMU",url:"https://music.yandex.ru/album/30290124/track/123882251"},
  {n:71,name:"Metamorphose",artist:"ANDRAW",url:"https://music.yandex.ru/album/35287266/track/135861906"},
  {n:72,name:"Manvantara",artist:"ANDRAW",url:"https://music.yandex.ru/album/30849175/track/125148916"},
  {n:73,name:"Cosmic Voyager",artist:"ANDRAW",url:"https://music.yandex.ru/album/37172680/track/140457429"},
  {n:74,name:"Сияю",artist:"КОФЕБУКЕТЫ",url:"https://music.yandex.ru/album/37272572/track/140685842"}
];
let loadedTracks = 0;

function updateTracksButton() {
  const remaining = moreTracks.length - loadedTracks;
  if (!remaining) {
    tracksToggle.closest('.tr-more').hidden = true;
    return;
  }
  tracksToggle.textContent = `// ЕЩЁ ${Math.min(10, remaining)} ТРЕКОВ ↓`;
}

if (tracksToggle && tracksList) {
  tracksToggle.addEventListener('click', () => {
    const batch = moreTracks.slice(loadedTracks, loadedTracks + 10);
    batch.forEach(track => {
      const number = String(track.n).padStart(2, '0');
      const service = track.url.includes('disk.yandex.ru') ? 'Яндекс Диск' : 'Яндекс Музыка';
      const row = document.createElement('a');
      row.className = 'tr-row tr-row-new';
      row.href = track.url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
      row.innerHTML = `<div class="tr-n-wrap"><span class="tr-n">${number}</span><span class="tr-play">↗</span></div><div class="tr-info"><div class="tr-cover">${number}</div><div><div class="tr-name">${track.name}</div><div class="tr-artist">${track.artist}</div></div></div><span class="tr-service">${service}</span><span class="tr-dur">↗</span>`;
      tracksList.appendChild(row);
    });
    loadedTracks += batch.length;
    updateTracksButton();
  });
}

let mobOpen=false;
function toggleMob(){
  mobOpen=!mobOpen;
  const mobNav=document.getElementById('mobNav');
  const burger=document.getElementById('burger');
  if(mobNav) mobNav.classList.toggle('open',mobOpen);
  if(mobNav) mobNav.setAttribute('aria-hidden', mobOpen ? 'false' : 'true');
  if(burger) burger.classList.toggle('open',mobOpen);
  if(burger) burger.setAttribute('aria-expanded', String(mobOpen));
  if(burger) burger.setAttribute('aria-label', mobOpen ? 'Закрыть меню' : 'Открыть меню');
  document.body.style.overflow=mobOpen?'hidden':'';
}
function closeMob(){
  mobOpen=false;
  const mobNav=document.getElementById('mobNav');
  const burger=document.getElementById('burger');
  if(mobNav) mobNav.classList.remove('open');
  if(mobNav) mobNav.setAttribute('aria-hidden', 'true');
  if(burger) burger.classList.remove('open');
  if(burger) burger.setAttribute('aria-expanded', 'false');
  if(burger) burger.setAttribute('aria-label', 'Открыть меню');
  document.body.style.overflow='';
}

document.addEventListener('keydown',(event)=>{
  if(event.key==='Escape' && mobOpen) closeMob();
});

// WAVEFORM
const wf7=document.getElementById('wf7');
if(wf7){for(let i=0;i<18;i++){const b=document.createElement('div');b.className='wf-b';b.style.animationDelay=(Math.random()*.9)+'s';b.style.animationDuration=(.7+Math.random()*.7)+'s';wf7.appendChild(b);}}

// COUNTER
const cObs=new IntersectionObserver(es=>{es.forEach(e=>{
  if(!e.isIntersecting)return;
  const el=e.target,raw=el.textContent,num=parseFloat(raw)||0,suf=raw.replace(/[\d.]/g,'');
  let s=null;
  function step(ts){if(!s)s=ts;const pg=Math.min((ts-s)/1400,1);el.textContent=Math.round(num*(1-Math.pow(1-pg,3)))+suf;if(pg<1)requestAnimationFrame(step);}
  requestAnimationFrame(step);cObs.unobserve(el);
});},{threshold:.5});
document.querySelectorAll('.a-stat-n').forEach(el=>cObs.observe(el));

// REVEAL
const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in');}),{threshold:.05});
document.querySelectorAll('.rv').forEach(el=>obs.observe(el));

;
