(() => {
  const english = document.documentElement.lang === 'en';
  const t = (pt, en) => english ? en : pt;
  const localEdition = t('bpm','web');
  const readingEditionKey = 'poiema-reading-edition-' + localEdition;
  const fontKey = 'poiema-reading-font';
  const editions = () => ({...versions, [localEdition]:t('Bíblia Portuguesa Mundial','World English Bible')});
  const readPreference = (key, fallback) => { try { return localStorage.getItem(key) || fallback; } catch { return fallback; } };
  const savePreference = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  let dialog, reading, opener, revision = 0, scrollFrame = 0, lastSaved = 0, lastScroll = 0;
  let edition = readPreference(readingEditionKey, localEdition), compare = '', font = Math.min(28, Math.max(16, Number(readPreference(fontKey,20)) || 20));

  function readerBody() { return dialog.querySelector('.guide-reader-body'); }

  function ensureDialog() {
    if (dialog) return;
    dialog = document.createElement('dialog');
    dialog.className = 'guide-dialog guide-reader';
    dialog.setAttribute('aria-labelledby','guide-reader-title');
    dialog.innerHTML = `<header class="guide-dialog-head guide-reader-head">
      <div><h2 id="guide-reader-title"></h2><small data-reader-location></small></div>
      <div class="guide-reader-head-actions">
        <div class="guide-reading-steps"><button type="button" data-reader-step="-1" aria-label="${t('Capítulo anterior','Previous chapter')}">←</button><button type="button" data-reader-step="1" aria-label="${t('Próximo capítulo','Next chapter')}">→</button></div>
        <button type="button" data-reader-options aria-expanded="false" aria-controls="guide-reader-options" aria-label="${t('Opções de leitura','Reading options')}">${t('Opções','Options')}</button>
        <form method="dialog"><button aria-label="${t('Fechar leitura','Close reading')}">×</button></form>
      </div></header>
      <div class="guide-reader-tools" id="guide-reader-options" hidden>
        <label>${t('Tradução','Translation')}<select data-reader-edition></select></label>
        <label>${t('Comparar com','Compare with')}<select data-reader-compare></select></label>
        <div class="guide-reader-font" role="group" aria-label="${t('Tamanho do texto','Text size')}"><button data-reader-font="-2" aria-label="${t('Diminuir fonte','Decrease text size')}">A−</button><button data-reader-font="2" aria-label="${t('Aumentar fonte','Increase text size')}">A+</button></div>
        <div class="guide-reader-file-actions">
          <button type="button" data-reader-find>${t('Ir para passagem','Go to passage')}</button>
          <button type="button" data-reader-copy>${t('Copiar link da passagem','Copy passage link')}</button>
          <button type="button" data-reader-offline>${t('Salvar livro offline','Save book offline')}</button>
        </div>
      </div>
      <section class="guide-reader-overview" id="guide-reader-overview" aria-labelledby="guide-reader-overview-title" hidden>
        <div class="guide-reader-overview-head"><h3 id="guide-reader-overview-title" tabindex="-1"></h3>
          <button type="button" data-reader-overview-close aria-label="${t('Fechar resumo','Close overview')}">×</button></div>
        <div data-reader-overview-content aria-live="polite"></div>
      </section>
      <div class="guide-reader-body" tabindex="0" aria-label="${t('Texto do capítulo','Chapter text')}"></div>
      <footer class="guide-reader-foot"><div>
        <button type="button" data-reader-overview-toggle aria-expanded="false" aria-controls="guide-reader-overview">${t('Ver resumo','View overview')}</button>
        <button type="button" data-reader-topic="cena">${t('Estudar trecho','Study passage')} <span aria-hidden="true">↗</span></button>
        <button data-reader-bookmark aria-pressed="false"></button>
        <button data-reader-journey hidden></button>
      </div><p role="status"></p>
      </footer>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      revision++;
      if (dialog.returnValue!=='navigation') {
        const url = new URL(location.href);
        if (url.searchParams.has('read')) {
          url.searchParams.delete('read');
          window.history.replaceState(window.history.state,'',url);
        }
      }
      window.PoiemaGuide.refreshResume();
      if (opener?.isConnected && !opener.closest('dialog:not([open])')) opener.focus({preventScroll:true});
      else document.querySelector('#guide-resume button,.guide-search-launch')?.focus({preventScroll:true});
    });
    dialog.addEventListener('click', handleClick);
    dialog.addEventListener('change', event => {
      if (event.target.matches('[data-reader-edition]')) {
        edition = event.target.value;
        savePreference(readingEditionKey, edition);
        if (compare === edition) compare = '';
      } else if (event.target.matches('[data-reader-compare]')) compare = event.target.value;
      else return;
      fillTranslations();
      loadText();
    });
    readerBody().addEventListener('scroll', () => {
      if (!dialog.open || scrollFrame || readerBody().scrollTop === lastScroll) return;
      scrollFrame = requestAnimationFrame(() => {
        scrollFrame = 0;
        lastScroll = readerBody().scrollTop;
        const area = readerBody().getBoundingClientRect();
        const rows = readerBody().querySelectorAll('[data-reader-row]');
        const row = Array.from(rows).find(element => element.getBoundingClientRect().bottom > area.top + 18);
        if (row) remember(Number(row.dataset.readerRow));
      });
    }, {passive:true});
  }

  function fillTranslations() {
    const choices = Object.entries(editions());
    if (!editions()[edition]) edition = localEdition;
    dialog.querySelector('[data-reader-edition]').innerHTML = choices.map(([id,name]) => `<option value="${esc(id)}" ${id===edition?'selected':''}>${esc(name)}</option>`).join('');
    dialog.querySelector('[data-reader-compare]').innerHTML = `<option value="">${t('Uma tradução','Single translation')}</option>` + choices.filter(([id]) => id !== edition).map(([id,name]) => `<option value="${esc(id)}" ${id===compare?'selected':''}>${esc(name)}</option>`).join('');
  }

  function adjacent(offset) {
    let {bookId,chapter} = reading;
    chapter += offset;
    if (chapter < 1) { bookId--; chapter = book(bookId)?.chapters; }
    else if (chapter > book(bookId).chapters) { bookId++; chapter = 1; }
    return book(bookId) ? {bookId,chapter} : null;
  }

  function open({bookId,chapter,from=1,to=from,verse=from}, origin = document.activeElement) {
    if (!book(bookId) || !Number.isInteger(chapter) || chapter < 1 || chapter > book(bookId).chapters) return;
    ensureDialog();
    const wasOpen = dialog.open;
    if (!wasOpen) opener = origin;
    reading = {bookId,chapter,from,to,verse};
    setOverviewVisible(false);
    setOptionsVisible(false);
    lastSaved = 0;
    dialog.style.setProperty('--reading-size',font + 'px');
    dialog.querySelector('h2').textContent = ref(reading);
    dialog.querySelector('[data-reader-step="-1"]').disabled = !adjacent(-1);
    dialog.querySelector('[data-reader-step="1"]').disabled = !adjacent(1);
    const journey = dialog.querySelector('[data-reader-journey]');
    const journeyId = bookId===43 && chapter===4 ? 'joao-4' : [[40,14],[41,6],[42,9],[43,6]].some(([b,c]) => b===bookId && c===chapter) ? 'quatro-evangelhos' : '';
    journey.hidden = !journeyId;
    journey.dataset.journeyOpen = journeyId;
    journey.textContent = journeyId==='joao-4' ? t('Entre na passagem','Step into the passage') : t('Comparar os quatro Evangelhos','Compare the four Gospels');
    dialog.querySelector('[data-reader-offline]').disabled = false;
    fillTranslations();
    if (!wasOpen) { dialog.returnValue = ''; dialog.showModal(); }
    loadText();
  }

  async function getText(version, {bookId,chapter}) {
    if (version !== localEdition) {
      const result = await getJson(`/api/chapter/${bookId}/${chapter}?version=${encodeURIComponent(version)}`);
      return {...result, verses:Object.fromEntries(result.verses.map((text,i) => [i+1,text]))};
    }
    const verses = (await portalBookText(bookId))[chapter];
    if (!verses) throw new Error('Missing Bible text');
    return {verses, versionName:editions()[version], copyright:t('Domínio público','Public domain'),
      sourceUrl:`https://bible.helloao.org/api/${t('por_bsl','eng_web')}/${book(bookId).commentaryId}/${chapter}.json`};
  }

  const credit = data => data ? `<p><strong>${esc(data.versionName)}</strong> · ${esc(data.copyright)} ${/^https:\/\//.test(data.sourceUrl) ? `<a href="${esc(data.sourceUrl)}" target="_blank" rel="noopener">${t('Fonte','Source')} ↗</a>` : ''}</p>` : '';

  async function loadText() {
    const current = ++revision, target = reading, status = dialog.querySelector('[role=status]');
    const body = readerBody();
    body.innerHTML = `<p>${t('Carregando o capítulo…','Loading the chapter…')}</p>`;
    status.textContent = '';
    refreshBookmark();
    const [primary, parallel] = await Promise.allSettled([getText(edition,target), compare ? getText(compare,target) : null]);
    if (current !== revision || !dialog.open) return;
    let text = primary.value;
    const alt = parallel.value;
    if (!text && edition !== localEdition) {
      text = await getText(localEdition,target).catch(() => null);
      if (current !== revision || !dialog.open) return;
    }
    if (!text) {
      body.innerHTML = `<p role="alert">${t('O texto deste capítulo está indisponível.','This chapter’s text is unavailable.')} <button data-reader-retry>${t('Tentar novamente','Try again')}</button></p>`;
      return;
    }
    const lines = Object.entries(text.verses).filter(([,line]) => line);
    const numbers = lines.map(([n]) => Number(n));
    const validVerse = numbers.includes(target.verse);
    const selected = validVerse ? target.verse : numbers[0];
    if (!validVerse && target.verse > 1) status.textContent = t('Esta edição usa outra numeração de versículos neste capítulo.', 'This edition uses different verse numbering for this chapter.');
    if (primary.status === 'rejected') status.textContent = t('Tradução indisponível. Exibindo a edição local.', 'Translation unavailable. Showing the local edition.');
    if (parallel.status === 'rejected') status.textContent = t('A tradução para comparação está indisponível.', 'The comparison translation is unavailable.');
    const paired = alt && alt.versionName !== text.versionName;
    body.innerHTML = `${paired ? `<div class="guide-compare-labels"><strong>${esc(text.versionName)}</strong><strong>${esc(alt.versionName)}</strong></div>` : ''}<div class="guide-reader-lines ${paired?'guide-reader-paired':''}">${lines.map(([n,line]) => `<div data-reader-row="${n}" class="${n>=target.from && n<=target.to?'guide-reading-range':''}"><p><button type="button" data-reader-verse="${n}" aria-label="${t('Selecionar versículo','Select verse')} ${n}" aria-pressed="${Number(n)===selected}">${n}</button>${esc(line)}</p>${paired ? `<p>${esc(alt.verses[n] || '—')}</p>` : ''}</div>`).join('')}</div><div class="guide-reader-credit">${credit(text)}${paired?credit(alt):''}</div>`;
    target.verse = selected;
    const row = body.querySelector(`[data-reader-row="${selected}"]`);
    if (row) {
      body.scrollTop = selected === numbers[0] ? 0 : row.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 8;
      lastScroll = body.scrollTop;
      remember(selected);
    }
    refreshBookmark();
  }

  function setOverviewVisible(visible) {
    dialog.querySelector('#guide-reader-overview').hidden = !visible;
    const toggle = dialog.querySelector('[data-reader-overview-toggle]');
    toggle.setAttribute('aria-expanded',String(visible));
    toggle.textContent = visible ? t('Ocultar resumo','Hide overview') : t('Ver resumo','View overview');
    lastScroll = readerBody().scrollTop;
  }

  function closeOverview() {
    setOverviewVisible(false);
    dialog.querySelector('[data-reader-overview-toggle]').focus({preventScroll:true});
  }

  async function toggleOverview() {
    const panel = dialog.querySelector('#guide-reader-overview');
    if (!panel.hidden) return closeOverview();
    const target = reading;
    const heading = panel.querySelector('h3');
    const content = panel.querySelector('[data-reader-overview-content]');
    heading.textContent = t('Resumo de ','Overview of ') + ref(target);
    content.textContent = t('Carregando resumo…','Loading overview…');
    content.setAttribute('aria-busy','true');
    setOverviewVisible(true);
    panel.scrollTop = 0;
    heading.focus({preventScroll:true});

    try {
      target.overview ??= getResource(`/api/library/${target.bookId}/${target.chapter}`).then(data => data.study);
      const study = await target.overview;
      if (target !== reading || panel.hidden || !dialog.open) return;
      if (!study?.overview) throw new Error('Missing chapter overview');
      const parts = study.outline || [];
      content.innerHTML = `<p>${esc(study.overview)}</p>${parts.length ?
        `<details><summary>${t('Partes do capítulo','Parts of the chapter')}</summary><ul>${parts.map(part => `<li><span>${esc(part.from)}–${esc(part.to)}</span> ${esc(part.title)}</li>`).join('')}</ul></details>` : ''}`;
    } catch {
      delete target.overview;
      if (target === reading && !panel.hidden) content.textContent = t('Resumo indisponível neste momento.','The overview is currently unavailable.');
    } finally {
      if (target === reading) {
        content.removeAttribute('aria-busy');
        lastScroll = readerBody().scrollTop;
      }
    }
  }

  function remember(verse) {
    if (lastSaved === verse) return;
    lastSaved = verse;
    window.PoiemaGuide.savePosition(reading.bookId,reading.chapter,verse);
  }

  const markKey = () => [reading.bookId,reading.chapter,reading.verse].join('.');
  function refreshBookmark() {
    const button = dialog.querySelector('[data-reader-bookmark]');
    dialog.querySelector('[data-reader-location]').textContent = t('Versículo ','Verse ') + reading.verse;
    const marked = Boolean(notebookEntries()[markKey()]?.marked);
    button.setAttribute('aria-pressed',String(marked));
    button.textContent = marked ? t('Remover marcação','Remove bookmark') : t('Guardar versículo','Bookmark verse');
  }

  async function handleClick(event) {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.readerStep) {
      const next = adjacent(Number(button.dataset.readerStep));
      if (next) open(next);
    } else if (button.dataset.readerFont) {
      font = Math.min(28,Math.max(16,font+Number(button.dataset.readerFont)));
      dialog.style.setProperty('--reading-size',font+'px');
      savePreference(fontKey,font);
    } else if (button.hasAttribute('data-reader-options')) {
      setOptionsVisible(dialog.querySelector('#guide-reader-options').hidden);
    } else if (button.hasAttribute('data-reader-find')) return window.PoiemaGuide.search();
    else if (button.hasAttribute('data-reader-copy')) return copyPassage();
    else if (button.hasAttribute('data-reader-overview-toggle')) return toggleOverview();
    else if (button.hasAttribute('data-reader-overview-close')) return closeOverview();
    else if (button.hasAttribute('data-reader-retry')) loadText();
    else if (button.dataset.readerVerse) {
      reading.verse = Number(button.dataset.readerVerse);
      dialog.querySelector('[data-reader-verse][aria-pressed="true"]')?.setAttribute('aria-pressed','false');
      button.setAttribute('aria-pressed','true');
      remember(reading.verse);
      refreshBookmark();
    } else if (button.hasAttribute('data-reader-bookmark')) {
      const entries = notebookEntries(), id = markKey(), previous = entries[id];
      if (previous?.marked && !previous.note) delete entries[id];
      else entries[id] = {...previous, bookId:reading.bookId, chapter:reading.chapter, verse:reading.verse, note:previous?.note || '', marked:!previous?.marked, updated:Date.now()};
      try {
        localStorage.setItem(notebookKey, JSON.stringify(entries));
        refreshBookmark();
        window.PoiemaGuide.refreshResume();
      } catch { dialog.querySelector('[role=status]').textContent = t('Não foi possível guardar neste navegador.','Could not save in this browser.'); }
    } else if (button.dataset.readerTopic) {
      const {bookId,chapter,from,verse,to} = reading, focusOrigin = opener;
      dialog.close();
      return enterLibraryPortal(focusOrigin,{bookId,chapter},{verse, topic:button.dataset.readerTopic},() => open({bookId,chapter,from,to,verse},focusOrigin));
    } else if (button.hasAttribute('data-reader-offline')) {
      const {bookId} = reading;
      button.disabled = true;
      const status = dialog.querySelector('[role=status]'), current = revision;
      status.textContent = t('Salvando o livro…','Saving the book…');
      try {
        await saveOffline(bookId);
        if (current === revision) status.textContent = t('Livro pronto para leitura offline na edição de domínio público.','Book ready for offline reading in the public-domain edition.');
      } catch {
        if (current === revision) status.textContent = t('Não foi possível salvar o livro offline.','Could not save the book for offline reading.');
      } finally {
        if (current === revision) button.disabled = false;
      }
    }
  }

  function setOptionsVisible(visible) {
    dialog.querySelector('#guide-reader-options').hidden = !visible;
    dialog.querySelector('[data-reader-options]').setAttribute('aria-expanded',String(visible));
    lastScroll = readerBody().scrollTop;
  }

  function openFromURL() {
    const value = new URLSearchParams(location.search).get('read');
    if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(value || '')) return;
    const [bookId,chapter,from,to=from] = value.split('.').map(Number);
    if (from>=1 && to>=from && to<=176) open({bookId,chapter,from,to},document.querySelector('.brand'));
  }

  async function copyPassage() {
    const {bookId,chapter,from,to,verse} = reading;
    const url = pageURL('bible');
    const digits = [bookId,chapter,verse];
    if (verse===from && to>from) digits.push(to);
    url.searchParams.set('read',digits.join('.'));
    const status = dialog.querySelector('[role=status]');
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = t('Link da passagem copiado.','Passage link copied.');
    } catch {
      status.innerHTML = `<label>${t('Copie o link da passagem','Copy the passage link')} <input type="url" readonly value="${esc(url.href)}"></label>`;
      status.querySelector('input').select();
    }
  }

  async function saveOffline(bookId) {
    if (!navigator.serviceWorker || !window.caches) throw new Error('Offline storage is unavailable');
    await navigator.serviceWorker.register('./reader-offline.js');
    await navigator.serviceWorker.ready;
    const cache = await caches.open('poiema-reading-v1');
    const shell = ['index.html','styles.css','language.js','app.js','portal.js','guide-content.js','practice-guides.js','study-practice.js','discovery-content.js','discoveries.js','study-guide.js','guide-reader.js','notes-core.js','notes.js','graph.js','vendor/leaflet/leaflet.js','vendor/leaflet/leaflet.css','en/app.js','en/portal.js','en/books.json','en/studies.json'];
    const startup = STATIC_MODE ? ['books.json','studies.json','versions.json','book-guides.json'] : ['api/books','api/studies','api/status','api/versions','api/book-guides'];
    const editionFolder = t('media/portal-text','en/bible/web');
    await cache.addAll([...shell,...startup,`${editionFolder}/${bookId}.json`].map(path => new URL('./'+path,location.href)));
    await Promise.allSettled(['scenes/manifest.json','en/scenes.json','media/poiema-logo.jpeg','scenes/galilee-storm.jpg'].map(path => cache.add(new URL('./'+path,location.href))));
  }

  window.PoiemaReader = {open,openFromURL};
})();
