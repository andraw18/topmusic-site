const nav = document.querySelector('.division-nav');
const menu = document.querySelector('.division-menu');

if (nav && menu) {
  const setOpen = (open) => {
    nav.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    menu.textContent = open ? '×' : '≡';
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menu.addEventListener('click', () => {
    setOpen(!nav.classList.contains('open'));
  });
  nav.querySelectorAll('.division-links a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('in');
  });
}, { threshold: 0.08 });

document.querySelectorAll('.rv').forEach((element) => revealObserver.observe(element));

const setupSlider = ({
  rootSelector,
  trackSelector,
  slideSelector,
  previousSelector,
  nextSelector,
  dotsSelector,
  countSelector,
  getItemsPerView = () => 1
}) => {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  const track = root.querySelector(trackSelector);
  const slides = Array.from(root.querySelectorAll(slideSelector));
  const previous = root.querySelector(previousSelector);
  const next = root.querySelector(nextSelector);
  const dots = dotsSelector ? root.querySelector(dotsSelector) : null;
  const count = countSelector ? root.querySelector(countSelector) : null;
  let activeIndex = 0;

  if (!track || slides.length < 2 || !previous || !next) return;

  const getPageCount = () => Math.ceil(slides.length / getItemsPerView());
  const dotButtons = dots ? Array.from({ length: getPageCount() }, (_, index) => {
    const dot = document.createElement('button');
    dot.className = 'slider-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Перейти к слайду ${index + 1}`);
    dots.appendChild(dot);
    return dot;
  }) : [];

  const render = () => {
    const itemsPerView = getItemsPerView();
    const pageCount = getPageCount();
    activeIndex = Math.min(activeIndex, pageCount - 1);
    track.style.transform = `translateX(-${activeIndex * 100}%)`;
    slides.forEach((slide, index) => {
      const isVisible = index >= activeIndex * itemsPerView && index < (activeIndex + 1) * itemsPerView;
      slide.classList.toggle('active', isVisible);
      slide.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    });
    dotButtons.forEach((dot, index) => {
      dot.classList.toggle('active', index === activeIndex);
      dot.setAttribute('aria-current', index === activeIndex ? 'true' : 'false');
    });
    if (count) count.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
  };

  const move = (direction) => {
    const pageCount = getPageCount();
    activeIndex = (activeIndex + direction + pageCount) % pageCount;
    render();
  };

  previous.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  dotButtons.forEach((dot, index) => dot.addEventListener('click', () => {
    activeIndex = index;
    render();
  }));
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') move(-1);
    if (event.key === 'ArrowRight') move(1);
  });
  window.addEventListener('resize', render);
  render();
};

const interiorSlider = document.querySelector('[data-interior-slider]');
if (interiorSlider) {
  setupSlider({
    rootSelector: '[data-interior-slider]',
    trackSelector: '[data-interior-track]',
    slideSelector: '.interior-slide',
    previousSelector: '[data-interior-prev]',
    nextSelector: '[data-interior-next]',
    countSelector: '[data-interior-count]'
  });
}

const equipmentTrack = document.querySelector('[data-equipment-track]');
if (equipmentTrack) {
  const getEquipmentName = (value) => value
    .replace(/^(Пульт|Мониторы|Монитры|Звуковые карты|Компрессор|Де-эссер|Эквалайзер|Предусилитель|Процессор эффектов|Процессор эффеков|Мастеринг прибор|Магнитофон|Гитарный кабинет|Басовый кабинет)\s+/i, '')
    .replace(/\s+\(Стереопара\)/i, '')
    .replace(/\s+-\s+500 rack/i, '');
  const getEquipmentType = (value) => value.split(' ')[0];

  const equipmentCatalog = window.GTEAM_EQUIPMENT_IMAGES || {};
  const equipmentEntries = Object.entries(equipmentCatalog);
  const microphoneEntries = equipmentEntries.filter(([label]) => /^(Goodfly|AKG|UAD Sphere|Audix|UAD Standart|Neumann|Rode|ARK|Biv-|Nevaton|Октава)/i.test(label));
  const otherEntries = equipmentEntries.filter(([label]) => !/^(Goodfly|AKG|UAD Sphere|Audix|UAD Standart|Neumann|Rode|ARK|Biv-|Nevaton|Октава|Пульт Amek Big|Yamaha Recording Custom|Общие фотки)/i.test(label));
  const splitIntoPools = (entries) => [0, 1, 2].map((offset) => entries.filter((_, index) => index % 3 === offset));
  const equipmentSlots = [
    [['Yamaha Recording Custom', equipmentCatalog['Yamaha Recording Custom']]],
    ...splitIntoPools(microphoneEntries),
    [['Пульт Amek Big', equipmentCatalog['Пульт Amek Big']]],
    ...splitIntoPools(otherEntries)
  ];

  equipmentSlots.forEach((pool, slotIndex) => {
    const [label, source] = pool[0];
    const slide = document.createElement('figure');
    slide.className = 'equipment-showcase-slide';
    slide.tabIndex = 0;
    slide.setAttribute('role', 'button');
    const renderEquipment = ([nextLabel, nextSource]) => {
      const name = getEquipmentName(nextLabel);
      slide.setAttribute('aria-label', `Открыть карточку: ${name}`);
      slide.dataset.equipmentName = name;
      slide.dataset.equipmentType = getEquipmentType(nextLabel);
      slide.innerHTML = `<img src="${nextSource}" alt="${name}" loading="lazy"><figcaption>${name}<span>${getEquipmentType(nextLabel)} / открыть</span></figcaption>`;
    };
    renderEquipment([label, source]);
    equipmentTrack.appendChild(slide);
    if (pool.length > 1) {
      let itemIndex = 0;
      let isPaused = false;
      slide.addEventListener('mouseenter', () => { isPaused = true; });
      slide.addEventListener('mouseleave', () => { isPaused = false; });
      slide.addEventListener('focusin', () => { isPaused = true; });
      slide.addEventListener('focusout', () => { isPaused = false; });
      window.setInterval(() => {
        if (isPaused) return;
        slide.classList.add('is-changing');
        window.setTimeout(() => {
          itemIndex = (itemIndex + 1) % pool.length;
          renderEquipment(pool[itemIndex]);
          slide.classList.remove('is-changing');
        }, 220);
      }, 4200 + slotIndex * 350);
    }
  });
}

setupSlider({
  rootSelector: '[data-equipment-slider]',
  trackSelector: '[data-equipment-track]',
  slideSelector: '.equipment-showcase-slide',
  previousSelector: '[data-equipment-prev]',
  nextSelector: '[data-equipment-next]',
  countSelector: '[data-equipment-count]',
  getItemsPerView: () => window.innerWidth <= 900 ? 2 : 4
});

const bookingForm = document.querySelector('[data-booking-form]');
if (bookingForm) {
  bookingForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(bookingForm);
    const subject = encodeURIComponent('Бронирование студии G-TEAM');
    const body = encodeURIComponent([
      `Имя: ${data.get('name')}`,
      `Телефон / Telegram: ${data.get('contact')}`,
      `Дата: ${data.get('date')}`,
      `Время: ${data.get('time')}`,
      `Продолжительность: ${data.get('duration')}`,
      `Задача: ${data.get('message') || 'Не указана'}`
    ].join('\n'));
    const status = bookingForm.querySelector('.booking-status');
    if (status) status.textContent = 'Открываем письмо с заявкой...';
    window.location.href = `mailto:hello@garvishensky.pro?subject=${subject}&body=${body}`;
  });
}

const equipmentModal = document.getElementById('equipmentModal');
if (equipmentModal) {
  const equipmentDescriptions = {
    'AMEK Big': 'Крупноформатная аналоговая консоль для записи, маршрутизации и суммирования. Даёт плотную середину, живой аналоговый характер и позволяет собирать сложные сессии в едином тракте.',
    'Genelec 8351': 'Трёхполосные коаксиальные мониторы с точной стереокартиной и высокой детализацией. Используем для сведения, контроля пространства и поиска мелких проблем в миксе.',
    'Yamaha NS10M': 'Классическая контрольная пара с подчёркнутой серединой. Помогает понять, будет ли вокал и основа трека уверенно звучать на бытовых системах.',
    'Universal Audio Apollo X6 / X16 / 8': 'Основные аудиоинтерфейсы студии: качественное преобразование сигнала, низкая задержка и обработка UAD во время записи.',
    'Goodfly M251': 'Ламповый микрофон с открытым верхом и объёмной серединой. Особенно хорошо подходит для выразительного поп-вокала и мягких акустических источников.',
    'Goodfly U47': 'Ламповая модель с крупным, тёплым и собранным звуком. Выбираем для вокала, которому нужны вес, близость и уверенная середина.',
    'AKG C414': 'Универсальный конденсаторный микрофон с несколькими диаграммами направленности. Подходит для вокала, акустических инструментов, усилителей и room-записи.',
    'Universal Audio Sphere DLX': 'Моделирующая стереосистема, позволяющая выбирать характер микрофона и диаграмму направленности после записи. Удобна для быстрого поиска подходящего тембра.',
    'Audix D6': 'Динамический микрофон для источников с мощным низом. Используется на басовых кабинетах, бочке и других низкочастотных инструментах.',
    'Universal Audio SD-1': 'Динамический микрофон с плотной серединой и хорошей защитой от звуков помещения. Подходит для речи, рэп-вокала и близкой записи.',
    'Neumann UM57': 'Винтажный ламповый микрофон с насыщенной серединой и музыкальным верхом. Используем для солирующего вокала и источников, которым нужен благородный окрас.',
    'Rode NT2': 'Конденсаторный микрофон с детальным и достаточно ярким звучанием. Универсален для вокала, акустической гитары и дополнительных комнатных планов.',
    'ARK FET': 'Транзисторный конденсаторный микрофон с быстрым откликом. Хорошо передаёт атаку, детали и динамику голоса или инструмента.',
    'BIV-1': 'Согласованная стереопара для объёмной записи инструментов и помещения. Позволяет естественно сохранить ширину и акустику пространства.',
    'Nevaton MC 59-E': 'Малодиафрагменная стереопара с точной передачей атаки и тембра. Используется для акустических инструментов, overhead и room-позиций.',
    'Октава МК-012А-01': 'Компактная конденсаторная стереопара для акустических источников. Даёт натуральную детальность без лишней жёсткости.',
    'Black Lion Audio Bluey': 'FET-компрессор с быстрым, характерным и энергичным звуком. Добавляет вокалу или инструменту плотность, атаку и ощущение законченности.',
    'DBX 566': 'Двухканальный ламповый компрессор для мягкого контроля динамики. Помогает сделать вокал и стереоисточники плотнее без агрессивного ограничения.',
    'Empirical Labs EL8-X Distressor': 'Один из самых гибких студийных компрессоров: от прозрачного контроля до жёсткой окрашенной компрессии. Используется на вокале, басе и барабанах.',
    '2×1176 Custom': 'Пара быстрых FET-компрессоров в духе классического 1176. Уверенно держит пики и добавляет источнику характерную атаку.',
    'DBX 560': 'Компактный VCA-компрессор 500-й серии. Подходит для ритмичных источников, баса и точного динамического контроля.',
    'DBX 520': 'Де-эссер для аккуратного подавления резких свистящих частот. Позволяет сохранить яркость вокала без неприятной агрессии.',
    'CAPI FC526': 'Компрессор 500-й серии с трансформаторным характером. Добавляет плотность и музыкально подчёркивает атаку.',
    'G.Ten': 'Аналоговый эквалайзер для тональной коррекции и окрашивания. Используется, когда источнику нужно добавить вес, присутствие или воздух.',
    'IGS IQ505': 'Параметрический эквалайзер 500-й серии для точной работы с частотным балансом. Подходит как для записи, так и для сведения.',
    'CAPI BT50': 'Музыкальный эквалайзер в стиле классических американских консолей. Хорош для широких, естественных коррекций и подчёркивания характера.',
    'WesAudio Dione': 'Стерео VCA-компрессор шинного типа. Склеивает микс, делает ритм собраннее и добавляет ощущение единого движения.',
    'BAE 73MPL': 'Микрофонный предусилитель с насыщенным трансформаторным звуком. Добавляет голосу и инструментам плотную середину и вес.',
    'CAPI VP312': 'Дискретный предусилитель с быстрым откликом и выразительной атакой. Подходит для вокала, барабанов и инструментов.',
    'CAPI VP28': 'Двухкаскадный предусилитель 500-й серии с широкими возможностями окрашивания. Может звучать чисто или заметно насыщать сигнал.',
    'Universal Audio 6176': 'Ламповый предусилитель и FET-компрессор в одном канале. Классический вокальный тракт с тёплой основой и быстрым контролем пиков.',
    'Lark LA-2A': 'Оптический ламповый компрессор для плавного и музыкального выравнивания. Особенно органично работает на вокале и басе.',
    'SPL Vitalizer MK2': 'Психоакустический процессор для улучшения читаемости, ширины и ощущения деталей. Применяется дозированно на группах или финальном миксе.',
    'Magnetec EQP-1DM': 'Ламповый программный эквалайзер в духе Pultec. Позволяет широко и музыкально формировать низ и верх.',
    'TC Finalizer 96K': 'Цифровой мастеринг-процессор для финального контроля динамики, частотного баланса и уровня готового микса.',
    'Warm Audio WA-1B': 'Ламповый оптический компрессор с плавным, дорогим характером. Хорошо удерживает вокал, не лишая его естественной динамики.',
    'Manley Vari-Mu': 'Ламповый стереокомпрессор для шин и мастеринга. Мягко склеивает материал, добавляя объём, плотность и характер.',
    'Eventide Eclipse': 'Мощный цифровой процессор пространственных и модуляционных эффектов. Используется для необычных delay, reverb и sound-design цепочек.',
    'TC Electronic D-Two': 'Ритмический delay-процессор для музыкальных повторов и пространственной обработки. Особенно полезен для вокала и синтезаторов.',
    'Lexicon 300L': 'Студийный процессор высокого класса с фирменными объёмными реверберациями. Создаёт глубокое пространство без потери читаемости.',
    'Vermona VSR3': 'Аналоговый пружинный ревербератор с узнаваемым винтажным характером. Добавляет живую текстуру вокалу, гитарам и синтезаторам.',
    'Yamaha SPX90': 'Классический мультиэффект с характерными алгоритмами 1980-х. Используется для gated reverb, pitch-эффектов и винтажной атмосферы.',
    'Lexicon PCM70': 'Культовый цифровой процессор реверберации и delay. Даёт музыкальное, плотное пространство для вокала и инструментов.',
    'Dolby Type A Modified': 'Модифицированный шумоподавитель, применяемый как эффект для яркого и воздушного высокочастотного окраса.',
    'Tascam TSR-8': 'Восьмидорожечный катушечный магнитофон. Позволяет получить естественную ленточную компрессию, насыщение и мягкий верх.',
    'Marshall TSL 602': 'Ламповый гитарный комбо с несколькими каналами. Подходит для чистых, кранчевых и плотных перегруженных партий.',
    'Hartke HA1200': 'Басовый усилительный тракт с собранным низом и читаемой атакой. Используем для записи бас-гитары через кабинет и комбинированный сигнал.',
    'Yamaha Recording Custom': 'Yamaha Recording Custom — это легендарная серия ударных установок, которая давно стала эталоном для студийной работы. Точный, сфокусированный тон и контролируемый резонанс позволяют уверенно записывать барабаны в разных жанрах и сохранять естественную динамику исполнения.'
  };
  const normalizeEquipmentName = (value) => value
    .toLowerCase()
    .replace(/×/g, 'x')
    .replace(/^(пульт|мониторы|монитры|звуковые карты|компрессор|де-ессер|эквалайзер|предусилитель|процессор эффектов|процессор эффеков|процессор|мастеринг прибор|магнитофон|гитарный кабинет|басовый кабинет)\s+/i, '')
    .replace(/\(стереопара\)/gi, '')
    .replace(/[^a-zа-яё0-9]/gi, '');
  const equipmentImageCatalog = Object.fromEntries(
    Object.entries(window.GTEAM_EQUIPMENT_IMAGES || {}).map(([name, source]) => [normalizeEquipmentName(name), source])
  );
  const equipmentImageAliases = {
    'Empirical Labs EL8-X Distressor': 'el8xdistressor',
    'WesAudio Dione': 'wesdione',
    'CAPI VP28': 'capivp28500rack',
    'Universal Audio 6176': 'uad6176',
    'Magnetec EQP-1DM': 'magnetecprogramequalizereqp1dm',
    'Warm Audio WA-1B': 'wa1b',
    'TC Electronic D-Two': 'tcd2',
    'Universal Audio Sphere DLX': 'uadspheredlx',
    'Universal Audio SD-1': 'uadstandartsd01',
    'Октава МК-012А-01': 'октаваmk012а01'
  };

  const title = equipmentModal.querySelector('[data-equipment-title]');
  const type = equipmentModal.querySelector('[data-equipment-type]');
  const description = equipmentModal.querySelector('[data-equipment-description]');
  const image = equipmentModal.querySelector('[data-equipment-image]');
  const closeButton = equipmentModal.querySelector('[data-equipment-close]');

  const closeEquipment = () => {
    equipmentModal.classList.remove('open');
    equipmentModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('equipment-open');
  };

  document.querySelectorAll('.equipment-list li:not(.equipment-category)').forEach((item) => {
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.setAttribute('aria-haspopup', 'dialog');

    const openEquipment = () => {
      const itemName = item.childNodes[0]?.textContent.trim() || item.textContent.trim();
      const itemType = item.querySelector('small')?.textContent.trim() || 'Studio equipment';
      const group = item.closest('.equipment-group');
      const groupImage = group?.querySelector('.equipment-image img');
      const catalogKey = equipmentImageAliases[itemName] || normalizeEquipmentName(itemName);
      title.textContent = itemName;
      type.textContent = itemType;
      description.textContent = equipmentDescriptions[itemName] || `${itemName} — часть рабочего тракта студии G-TEAM. Используем прибор в зависимости от источника, жанра и требуемого характера звучания.`;
      image.src = equipmentImageCatalog[catalogKey] || groupImage?.src || '';
      image.alt = itemName;
      equipmentModal.classList.add('open');
      equipmentModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('equipment-open');
      closeButton.focus();
    };

    item.addEventListener('click', openEquipment);
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openEquipment();
      }
    });
  });

  document.querySelectorAll('.equipment-showcase-slide').forEach((slide) => {
    const openShowcaseEquipment = () => {
      const itemName = slide.dataset.equipmentName || '';
      const itemType = slide.dataset.equipmentType || 'Studio equipment';
      const descriptionKey = Object.keys(equipmentDescriptions).find((key) => normalizeEquipmentName(key) === normalizeEquipmentName(itemName));
      title.textContent = itemName;
      type.textContent = itemType;
      description.textContent = equipmentDescriptions[descriptionKey] || `${itemName} — часть рабочего тракта студии G-TEAM. Используем прибор в зависимости от источника, жанра и требуемого характера звучания.`;
      image.src = slide.querySelector('img')?.src || '';
      image.alt = itemName;
      equipmentModal.classList.add('open');
      equipmentModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('equipment-open');
      closeButton.focus();
    };

    slide.addEventListener('click', openShowcaseEquipment);
    slide.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openShowcaseEquipment();
      }
    });
  });

  equipmentModal.querySelectorAll('[data-equipment-close]').forEach((element) => {
    element.addEventListener('click', closeEquipment);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && equipmentModal.classList.contains('open')) closeEquipment();
  });
}
