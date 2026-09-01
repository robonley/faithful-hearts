(() => {
  const CATALOG_URL = 'catalog.json';
  const volumeGrid = document.getElementById('volume_grid');
  const continueButton = document.getElementById('continue_button');
  const updateMessage = document.getElementById('update_message');
  const lastUpdated = document.getElementById('last_updated');
  const checkButton = document.getElementById('check_updates');

  const storageKey = id => `faithfulHearts:${id}:completed`;
  const lastKey = id => `faithfulHearts:${id}:lastNight`;

  function getCompleted(id) {
    try { return JSON.parse(localStorage.getItem(storageKey(id)) || '[]'); }
    catch { return []; }
  }

  function renderVolume(volume) {
    const card = document.createElement('article');
    card.className = `volume_card ${volume.status}`;
    const completed = getCompleted(volume.id);
    const percent = volume.nights ? Math.round((completed.length / volume.nights) * 100) : 0;
    const lastNight = localStorage.getItem(lastKey(volume.id)) || 'night1';
    const statusText = volume.status === 'available' ? 'Available' : 'Planned';
    const action = volume.status === 'available'
      ? `<a class="volume_open" href="${volume.href}#${lastNight}">${completed.length ? 'Continue' : 'Begin volume'}</a>`
      : `<span class="volume_planned">This volume will appear automatically after it is published.</span>`;
    const progress = volume.status === 'available'
      ? `<div class="volume_progress"><div class="volume_progress_track"><div class="volume_progress_fill" style="width:${percent}%"></div></div><p class="volume_progress_text">${completed.length} of ${volume.nights} evenings complete</p></div>`
      : '';
    card.innerHTML = `
      <div class="volume_card_header">
        <div class="volume_number">Volume ${volume.number}</div>
        <div class="volume_status">${statusText}</div>
      </div>
      <h3>${volume.title}</h3>
      <p class="volume_detail">${volume.weeks} · ${volume.nights} evenings</p>
      <p>${volume.description}</p>
      ${progress}
      <div class="volume_actions">${action}</div>`;
    return card;
  }

  async function loadCatalog(showMessage = false) {
    if (showMessage) {
      updateMessage.textContent = 'Checking the library…';
      checkButton.disabled = true;
    }
    try {
      const response = await fetch(`${CATALOG_URL}?v=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error('Catalogue request failed');
      const catalog = await response.json();
      volumeGrid.replaceChildren(...catalog.volumes.map(renderVolume));
      lastUpdated.textContent = `Updated ${catalog.updated}`;
      const firstAvailable = catalog.volumes.find(v => v.status === 'available');
      if (firstAvailable) {
        const completed = getCompleted(firstAvailable.id);
        const lastNight = localStorage.getItem(lastKey(firstAvailable.id)) || 'night1';
        continueButton.href = `${firstAvailable.href}#${lastNight}`;
        continueButton.textContent = completed.length ? 'Continue reading' : 'Begin Volume One';
      }
      const priorVersion = localStorage.getItem('faithfulHearts:catalogVersion');
      localStorage.setItem('faithfulHearts:catalogVersion', catalog.version);
      if (showMessage) {
        updateMessage.textContent = priorVersion && priorVersion !== catalog.version
          ? 'New content is now in your library.'
          : 'Your library is current.';
      }
    } catch (error) {
      updateMessage.textContent = 'You appear to be offline. Saved content is still available.';
      try {
        const cached = await fetch(CATALOG_URL);
        const catalog = await cached.json();
        volumeGrid.replaceChildren(...catalog.volumes.map(renderVolume));
        lastUpdated.textContent = `Updated ${catalog.updated}`;
      } catch {
        volumeGrid.innerHTML = '<p>The library could not be loaded.</p>';
      }
    } finally {
      checkButton.disabled = false;
    }
  }

  checkButton.addEventListener('click', async () => {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) await registration.update();
    }
    await loadCatalog(true);
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service_worker.js'));
  }

  loadCatalog(false);
})();
