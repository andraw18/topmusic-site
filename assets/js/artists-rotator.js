// The spreadsheet order defines both each card's playlist and how long each artist stays visible.
(function(){
  const tiles = document.querySelectorAll('[data-artist-slot]');
  if (!tiles.length) return;

  // A higher position in each spreadsheet group gets a longer turn on the card.
  const displayDurations = [11000, 9000, 7500, 6300, 5200, 4300];
  const dataUrl = new URL(tiles[0].closest('.artists-rotator').dataset.artistData, location.href);
  dataUrl.searchParams.set('_', Date.now());
  fetch(dataUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error('Artist list unavailable');
      return response.json();
    })
    .then(groups => {
      const ticker = document.querySelector('.hero-ticker .ticker-inner');
      if (ticker) {
        const seen = new Set();
        const artists = groups.flat().filter(artist => {
          if (!artist?.name || !artist?.url || seen.has(artist.url)) return false;
          seen.add(artist.url);
          return true;
        });
        const makeGroup = (hidden = false) => {
          const group = document.createElement('div');
          group.className = 'ticker-group';
          if (hidden) group.setAttribute('aria-hidden', 'true');
          artists.forEach(artist => {
            const item = document.createElement('span');
            item.className = 't-item';
            const label = document.createElement('span');
            label.textContent = artist.name;
            item.append(label);
            group.append(item);
          });
          return group;
        };
        ticker.replaceChildren(makeGroup(), makeGroup(true));
        ticker.style.setProperty('--ticker-duration', `${Math.max(45, artists.length * 3)}s`);
      }
      tiles.forEach((tile, slot) => {
        const group = groups[slot];
        if (!Array.isArray(group) || !group.length) return;
        const name = tile.querySelector('.rotating-artist-name');
        tile.style.backgroundImage = `url("${group[0].image}")`;
        tile.href = group[0].url;
        name.textContent = group[0].name;
        if (group.length < 2) return;
        let index = 0;
        let timer;
        let changing = false;
        let paused = false;
        let hovered = false;
        let focused = false;
        let transitionTimer;

        const schedule = (stagger = 0) => {
          if (paused || changing) return;
          window.clearTimeout(timer);
          timer = window.setTimeout(() => {
            if (paused) return;
            changing = true;
            tile.classList.add('is-changing');
            transitionTimer = window.setTimeout(() => {
              if (paused) return;
              index = (index + 1) % group.length;
              const artist = group[index];
              tile.style.backgroundImage = `url("${artist.image}")`;
              tile.href = artist.url;
              name.textContent = artist.name;
              tile.classList.remove('is-changing');
              changing = false;
              schedule();
            }, 220);
          }, (displayDurations[index] || displayDurations.at(-1)) + stagger);
        };
        const pause = () => {
          paused = true;
          window.clearTimeout(timer);
          window.clearTimeout(transitionTimer);
          changing = false;
          tile.classList.remove('is-changing');
        };
        const resume = () => {
          if (hovered || focused) return;
          paused = false;
          schedule();
        };
        tile.addEventListener('mouseenter', () => { hovered = true; pause(); });
        tile.addEventListener('mouseleave', () => { hovered = false; resume(); });
        tile.addEventListener('focus', () => { focused = true; pause(); });
        tile.addEventListener('blur', () => { focused = false; resume(); });
        schedule(slot * 1550);
      });
    })
    .catch(error => console.error('Could not load artists', error));
})();
