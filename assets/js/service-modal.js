// Detailed service copy lives in JSON so it can be edited from the admin panel.
(async () => {
  const modal = document.getElementById('serviceModal');
  if (!modal) return;
  let details;
  try {
    const url = new URL(modal.dataset.serviceDetails, document.baseURI);
    url.searchParams.set('_', Date.now());
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error('Service descriptions unavailable');
    details = await response.json();
  } catch (error) {
    console.error('Could not load service descriptions', error);
    return;
  }
  const dialog = modal.querySelector('.service-modal-dialog');
  const title = document.getElementById('serviceModalTitle');
  const intro = document.getElementById('serviceModalIntro');
  const points = document.getElementById('serviceModalPoints');
  const result = document.getElementById('serviceModalResult');
  const note = document.getElementById('serviceModalNote');
  const price = document.getElementById('serviceModalPrice');
  const discount = document.getElementById('serviceModalDiscount');
  const order = document.getElementById('serviceModalOrder');
  const closeButton = modal.querySelector('.service-modal-close');
  let returnFocus = null;
  let previousOverflow = '';

  function open(card) {
    const serviceId = card.dataset.serviceId || card.id;
    const detail = details[serviceId];
    if (!detail) return;
    returnFocus = document.activeElement;
    previousOverflow = document.body.style.overflow;
    const serviceName = card.querySelector('h3, .svc-name').textContent.trim();
    title.textContent = serviceName;
    intro.textContent = detail.intro;
    points.replaceChildren(...detail.points.map(text => {
      const item = document.createElement('li');
      item.textContent = text;
      return item;
    }));
    note.textContent = detail.note || "";
    note.hidden = !detail.note;
    result.textContent = detail.result;
    price.textContent = card.querySelector('strong, .svc-tier').textContent.trim();
    discount.hidden = ['zapis', 'ozvuchka', 'dizain', 'social-design', 'reels-shoot', 'site', 'video'].includes(serviceId);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    dialog.scrollTop = 0;
    closeButton.focus();
  }

  function close() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    if (returnFocus?.isConnected) returnFocus.focus();
  }

  document.querySelectorAll('.service-catalog .catalog-card').forEach(card => {
    const link = card.querySelector('a[href]');
    if (!link) return;
    link.textContent = 'Подробнее →';
    link.setAttribute('aria-haspopup', 'dialog');
    card.addEventListener('click', event => {
      event.preventDefault();
      open(card);
    });
  });
  document.querySelectorAll('.svc-row[data-service-id]').forEach(row => {
    row.setAttribute('aria-haspopup', 'dialog');
    row.addEventListener('click', event => {
      event.preventDefault();
      open(row);
    });
  });

  order.addEventListener('click', () => {
    if (order.getAttribute('href') === '#contact') close();
  });

  modal.querySelectorAll('[data-service-close]').forEach(element => element.addEventListener('click', close));
  document.addEventListener('keydown', event => {
    if (!modal.classList.contains('open')) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const focusable = discount.hidden ? [closeButton, order] : [closeButton, discount, order];
    const current = focusable.indexOf(document.activeElement);
    if (event.shiftKey && current <= 0) { event.preventDefault(); order.focus(); }
    else if (!event.shiftKey && current === focusable.length - 1) { event.preventDefault(); closeButton.focus(); }
  });
})();
