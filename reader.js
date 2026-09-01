(() => {
  const volumeId = document.querySelector('meta[name="faithful-hearts-volume"]')?.content || 'volume';
  const total = Number(document.querySelector('meta[name="faithful-hearts-night-count"]')?.content || document.querySelectorAll('article.night').length);
  const completedKey = `faithfulHearts:${volumeId}:completed`;
  const lastKey = `faithfulHearts:${volumeId}:lastNight`;
  const themeKey = 'faithfulHearts:readerTheme';
  const articles = [...document.querySelectorAll('article.night')];
  const buttons = [...document.querySelectorAll('.pwa_complete_button')];
  const progressText = document.getElementById('reader_progress');
  const progressFill = document.getElementById('reader_progress_fill');
  const continueLink = document.getElementById('reader_continue');
  const resetButton = document.getElementById('reader_reset');
  const themeButton = document.getElementById('reader_theme_button');
  const contentsButton = document.getElementById('reader_contents_button');
  const contentsMenu = document.getElementById('reader_contents_menu');
  const contentsCloseButton = document.getElementById('reader_contents_close');
  const contentsSearch = document.getElementById('reader_contents_search');
  const contentsSearchClear = document.getElementById('reader_contents_search_clear');
  const contentsList = document.getElementById('reader_contents_list');
  const contentsEmpty = document.getElementById('reader_contents_empty');

  function readCompleted() {
    try { return new Set(JSON.parse(localStorage.getItem(completedKey) || '[]')); }
    catch { return new Set(); }
  }

  let completed = readCompleted();

  function saveCompleted() {
    localStorage.setItem(completedKey, JSON.stringify([...completed]));
  }

  function firstIncomplete() {
    const article = articles.find(a => !completed.has(a.id));
    return article?.id || articles.at(-1)?.id || 'top';
  }

  function updateUI() {
    buttons.forEach(button => {
      const id = button.dataset.nightId;
      const isDone = completed.has(id);
      button.setAttribute('aria-pressed', String(isDone));
      button.textContent = isDone ? 'Completed' : 'Mark this evening complete';
      document.getElementById(id)?.classList.toggle('pwa_completed', isDone);
    });
    const count = completed.size;
    progressText.textContent = `${count} of ${total} evenings complete`;
    progressFill.style.width = `${Math.min(100, Math.round((count / total) * 100))}%`;
    continueLink.href = `#${firstIncomplete()}`;
    continueLink.textContent = count === total ? 'Review the volume' : 'Continue reading';
  }

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const id = button.dataset.nightId;
      if (completed.has(id)) completed.delete(id); else completed.add(id);
      saveCompleted();
      localStorage.setItem(lastKey, id);
      updateUI();
    });
  });

  resetButton?.addEventListener('click', () => {
    const confirmed = window.confirm('Reset completion marks for this volume?');
    if (!confirmed) return;
    completed = new Set();
    saveCompleted();
    localStorage.setItem(lastKey, 'night1');
    updateUI();
  });

  function setLastNight(id) {
    if (!id || !document.getElementById(id)) return;
    localStorage.setItem(lastKey, id);
  }

  window.addEventListener('hashchange', () => setLastNight(location.hash.slice(1)));
  if (location.hash) setLastNight(location.hash.slice(1));

  const observer = new IntersectionObserver(entries => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (visible) setLastNight(visible.target.id);
  }, { rootMargin: '-25% 0px -60% 0px', threshold: [0.05, 0.25, 0.5] });
  articles.forEach(article => observer.observe(article));

  const themes = ['default', 'large', 'dim'];
  function applyTheme(theme) {
    document.body.classList.toggle('reader_large_text', theme === 'large');
    document.body.classList.toggle('reader_dim', theme === 'dim');
    localStorage.setItem(themeKey, theme);
    themeButton?.setAttribute('aria-label', `Reading appearance: ${theme}`);
  }
  let theme = localStorage.getItem(themeKey) || 'default';
  applyTheme(theme);
  themeButton?.addEventListener('click', () => {
    const next = themes[(themes.indexOf(theme) + 1) % themes.length];
    theme = next;
    applyTheme(theme);
  });


  const searchInput = document.getElementById('night_search_input');
  const searchClear = document.getElementById('night_search_clear');
  const searchResults = document.getElementById('night_search_results');
  let nightData = [];
  try {
    nightData = JSON.parse(document.getElementById('night_data')?.textContent || '[]');
  } catch {
    nightData = [];
  }

  const sourceContents = document.querySelector('#contents nav');
  if (contentsList && sourceContents) {
    contentsList.replaceChildren(...[...sourceContents.cloneNode(true).children]);
  }

  const nightSearchData = new Map(nightData.map(item => {
    return [item.id, `${item.title} ${item.account}`.toLowerCase()];
  }));

  function fuzzyMatch(query, text) {
    const needle = query.toLowerCase().replace(/[^a-z0-9]/g, '');
    const haystack = text.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!needle) return true;
    for (let start = haystack.indexOf(needle[0]); start !== -1; start = haystack.indexOf(needle[0], start + 1)) {
      let position = start + 1;
      let matches = true;
      for (const character of needle.slice(1)) {
        const nextPosition = haystack.indexOf(character, position);
        if (nextPosition === -1 || nextPosition - position > 3) {
          matches = false;
          break;
        }
        position = nextPosition + 1;
      }
      if (matches) return true;
    }
    return false;
  }

  function filterContents(query) {
    if (!contentsList) return;
    const headings = [...contentsList.querySelectorAll(':scope > h3')];
    const links = [...contentsList.querySelectorAll(':scope > a')];
    const matchingSections = new Set();

    let section;
    [...contentsList.children].forEach(child => {
      if (child.matches('h3')) {
        section = child;
        return;
      }
      if (!child.matches('a')) return;
      const id = child.getAttribute('href')?.slice(1) || '';
      const searchText = `${child.textContent} ${nightSearchData.get(id) || ''}`;
      const matches = fuzzyMatch(query, searchText);
      child.hidden = !matches;
      if (matches && section) matchingSections.add(section);
    });

    headings.forEach(heading => {
      const headingMatches = fuzzyMatch(query, heading.textContent || '');
      heading.hidden = !headingMatches && !matchingSections.has(heading);
    });
    if (contentsEmpty) contentsEmpty.hidden = links.some(link => !link.hidden);
  }

  contentsSearch?.addEventListener('input', event => filterContents(event.target.value));
  contentsSearch?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      contentsSearch.value = '';
      filterContents('');
    }
  });
  contentsSearchClear?.addEventListener('click', () => {
    if (contentsSearch) contentsSearch.value = '';
    filterContents('');
    contentsSearch?.focus();
  });

  function setContentsMenu(open) {
    if (!contentsMenu || !contentsButton) return;
    contentsMenu.hidden = !open;
    contentsButton.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('reader_menu_open', open);
    if (open) contentsSearch?.focus();
    else contentsButton.focus();
  }

  contentsButton?.addEventListener('click', () => setContentsMenu(contentsMenu?.hidden));
  contentsCloseButton?.addEventListener('click', () => setContentsMenu(false));
  contentsMenu?.addEventListener('click', event => {
    if (event.target.closest('[data-reader-menu-close], a')) setContentsMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && contentsMenu && !contentsMenu.hidden) setContentsMenu(false);
  });

  const searchableNights = nightData.map(item => {
    const articleText = document.getElementById(item.id)?.innerText || '';
    return { ...item, searchText: `${item.title} ${item.account} ${articleText}`.toLowerCase() };
  });

  function closeSearch() {
    if (!searchResults || !searchInput) return;
    searchResults.hidden = true;
    searchResults.replaceChildren();
    searchInput.setAttribute('aria-expanded', 'false');
  }

  function showSearchResults(query) {
    if (!searchResults || !searchInput) return;
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2) {
      closeSearch();
      return;
    }
    const matches = searchableNights.filter(item => item.searchText.includes(normalized)).slice(0, 8);
    searchResults.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.className = 'pwa_search_empty';
      empty.textContent = 'No evenings matched that search.';
      searchResults.append(empty);
    } else {
      matches.forEach(item => {
        const result = document.createElement('button');
        result.type = 'button';
        result.className = 'pwa_search_result';
        result.innerHTML = `<strong>Night ${item.number}: ${item.title}</strong><span>${item.account}</span>`;
        result.addEventListener('click', () => {
          location.hash = item.id;
          setLastNight(item.id);
          searchInput.value = '';
          closeSearch();
        });
        searchResults.append(result);
      });
    }
    searchResults.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }

  searchInput?.addEventListener('input', event => showSearchResults(event.target.value));
  searchInput?.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      searchInput.value = '';
      closeSearch();
    }
  });
  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    closeSearch();
    searchInput?.focus();
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.pwa_search')) closeSearch();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('service_worker.js'));
  }

  updateUI();
})();
