// The reading journey and the connections inside the text:
// - remembers which chapters were read (this browser only) and shows progress on Home and in the book index;
// - in the reader: a "in this chapter" line (when, who, where), the names of people and places as links
//   that open a short card, and an end-of-chapter panel with the next steps and connected readings.
// Data comes from the knowledge graph (public/graph.js); pure logic lives in insight-core.js.
(() => {
  if (typeof document === 'undefined') return;
  const core = globalThis.PoiemaInsightCore;
  const EN = document.documentElement.lang === 'en';
  const t = (pt, en) => (EN ? en : pt);
  const KEY = 'poiema-progress-v1';
  const html = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const number = value => value.toLocaleString(EN ? 'en-US' : 'pt-BR');

  // ---------- progress ----------
  let store;
  function progress() {
    if (store) return store;
    store = { chapters: {}, days: [] };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (saved && typeof saved.chapters === 'object' && saved.chapters) for (const [key, at] of Object.entries(saved.chapters)) if (/^\d{1,2}:\d{1,3}$/.test(key) && Number.isFinite(at)) store.chapters[key] = at;
      if (Array.isArray(saved?.days)) store.days = saved.days.filter(day => /^\d{4}-\d\d-\d\d$/.test(day)).slice(-400);
    } catch {}
    return store;
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(store)); return true; } catch { return false; } }
  const isRead = (bookId, chapter) => Boolean(progress().chapters[`${bookId}:${chapter}`]);
  function markRead(bookId, chapter, read = true) {
    const data = progress(), key = `${bookId}:${chapter}`;
    if (read === Boolean(data.chapters[key])) return;
    if (read) {
      data.chapters[key] = Date.now();
      const today = core.dayStamp(new Date());
      if (!data.days.includes(today)) data.days = [...data.days, today].slice(-400);
    } else delete data.chapters[key];
    persist(); refreshHome();
  }
  const stats = () => core.progressStats(progress().chapters, books);

  function homeCard() {
    const data = progress(), summary = stats();
    if (!summary.read) return '';
    const [lastKey] = Object.entries(data.chapters).sort((a, b) => b[1] - a[1])[0];
    const [bookId, chapter] = lastKey.split(':').map(Number);
    const current = book(bookId), inBook = summary.perBook.get(bookId) ?? 0;
    const next = core.nextUnread(data.chapters, books, bookId, chapter);
    const days = core.streak(data.days);
    const line = [`${current.name}: ${inBook} ${t('de', 'of')} ${current.chapters}`, days > 1 ? t(`${days} dias seguidos`, `${days} days in a row`) : '', `${number(summary.percent)}% ${t('da Bíblia', 'of the Bible')}`].filter(Boolean).join(' · ');
    return `<div class="ix-progress-copy"><small>${t('Sua leitura', 'Your reading')}</small>
      <h2>${summary.read === 1 ? t('1 capítulo lido', '1 chapter read') : t(`${number(summary.read)} capítulos lidos`, `${number(summary.read)} chapters read`)}</h2>
      <p>${html(line)}</p>
      <div class="ix-meter" role="img" aria-label="${html(current.name)}: ${inBook} ${t('de', 'of')} ${current.chapters}"><span style="width:${Math.round((inBook / current.chapters) * 100)}%"></span></div></div>
      ${next ? `<button type="button" class="guide-passage" data-guide-read="${next.bookId}.${next.chapter}.1">${t('Ler', 'Read')} ${html(ref(next))} <span aria-hidden="true">→</span></button>` : ''}`;
  }
  function refreshHome() {
    const slot = document.querySelector('#guide-progress');
    if (slot) { const markup = homeCard(); slot.innerHTML = markup; slot.hidden = !markup; }
    document.querySelectorAll('[data-ix-book]').forEach(node => { node.outerHTML = bookBadge(Number(node.dataset.ixBook)); });
  }
  // A small mark beside a book in the index: chapters read, or a check when the book is finished.
  function bookBadge(bookId) {
    const item = book(bookId), read = stats().perBook.get(bookId) ?? 0;
    if (!item) return '';
    if (!read) return `<small class="ix-book" data-ix-book="${bookId}" hidden></small>`;
    const done = read >= item.chapters;
    return `<small class="ix-book ${done ? 'ix-book-done' : ''}" data-ix-book="${bookId}" title="${t('Capítulos lidos', 'Chapters read')}">${done ? '✓' : `${read}/${item.chapters}`}</small>`;
  }

  // ---------- reader ----------
  let scope = null;       // {dialog, bookId, chapter, token, entities: Map('p:slug' → entity)}
  let token = 0, readTimer = 0, observer = null;
  const graph = () => window.PoiemaGraph?.data;
  const entityName = entity => (EN ? entity.n : entity.pt || entity.n);
  const yearLabel = value => window.PoiemaGraph.span(value);

  function chapterEntities(D, bookId, chapter) {
    const lo = bookId * 1e6 + chapter * 1e3, hi = lo + 999;
    const collect = (table, lookup, kind) => {
      const list = [];
      for (const [slug, codes] of Object.entries(table)) {
        const verses = [];
        for (const code of codes) { if (code > hi) break; if (code > lo) verses.push(code - lo); }
        const entity = verses.length && lookup.get(slug);
        if (entity) list.push({ kind, id: slug, entity, verses });
      }
      return list.sort((a, b) => b.verses.length - a.verses.length || b.entity.v - a.entity.v);
    };
    const events = [];
    for (const [id, codes] of Object.entries(D.refs.e)) if (codes.some(code => code > lo && code <= hi)) { const event = D.event.get(Number(id)); if (event) events.push(event); }
    return { people: collect(D.refs.p, D.person, 'p'), places: collect(D.refs.l, D.place, 'l'), events };
  }

  function contextStrip(D, found, bookId, chapter) {
    const years = D.years[bookId]?.[chapter];
    const when = years ? yearLabel(years[0]) + (years[1] !== years[0] ? ` – ${yearLabel(years[1])}` : '') : '';
    // Two records can carry the same name (a region and its city); the line shows each name once.
    const once = list => { const seen = new Set(); return list.filter(item => { const label = entityName(item.entity); return !seen.has(label) && seen.add(label); }); };
    const people = once(found.people.filter(item => item.id !== 'god_1324')), places = once(found.places);
    if (!people.length && !places.length && !found.events.length) return '';
    const names = list => list.slice(0, 3).map(item => entityName(item.entity)).join(', ') + (list.length > 3 ? ` +${list.length - 3}` : '');
    const chips = list => list.slice(0, 14).map(item => `<button type="button" class="ix-chip" data-ix="${item.kind}:${html(item.id)}">${html(entityName(item.entity))}</button>`).join('');
    const summary = [when, people.length ? names(people) : '', places.length ? names(places) : ''].filter(Boolean).join(' · ');
    return `<details class="ix-context"><summary><strong>${t('Neste capítulo', 'In this chapter')}</strong><span>${html(summary)}</span></summary>
      ${found.events.length ? `<h4>${t('O que acontece', 'What happens')}</h4><ul class="ix-events">${found.events.slice(0, 6).map(event => `<li><button type="button" class="ix-chip" data-ix="e:${event.i}">${html(window.PoiemaGraph.eventName(event))}</button></li>`).join('')}</ul>` : ''}
      ${people.length ? `<h4>${t('Quem aparece', 'Who appears')}</h4><div class="ix-chips">${chips(people)}</div>` : ''}
      ${places.length ? `<h4>${t('Onde', 'Where')}</h4><div class="ix-chips">${chips(places)}</div>` : ''}
      <p class="ix-fine">${t('Toque em um nome sublinhado no texto para ver quem é, a família e o mapa. Datas da cronologia tradicional; lugares aproximados.', 'Tap an underlined name in the text to see who it is, the family and the map. Dates follow a traditional chronology; places are approximate.')}</p></details>`;
  }

  function markRows(lines, found) {
    const byVerse = new Map();
    for (const item of [...found.people, ...found.places]) {
      if (item.id === 'god_1324') continue;
      const forms = core.nameForms(item.entity, item.kind);
      for (const verse of item.verses) (byVerse.get(verse) ?? byVerse.set(verse, []).get(verse)).push({ kind: item.kind, id: item.id, forms });
    }
    for (const row of lines.querySelectorAll('[data-reader-row]')) {
      const entities = byVerse.get(Number(row.dataset.readerRow));
      const paragraph = entities && row.querySelector('p');
      const node = paragraph && [...paragraph.childNodes].find(child => child.nodeType === 3 && child.textContent.trim());
      if (!node) continue;
      const segments = core.markNames(node.textContent, entities);
      if (!segments.some(segment => segment.id)) continue;
      const fragment = document.createDocumentFragment();
      for (const segment of segments) {
        if (!segment.id) { fragment.append(segment.text); continue; }
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'ix-name'; button.dataset.ix = `${segment.kind}:${segment.id}`; button.textContent = segment.text;
        fragment.append(button);
      }
      node.replaceWith(fragment);
    }
  }

  // Chapters that share the rarer people, places and events of this one.
  function connected(D, found, bookId, chapter) {
    const mine = `${bookId}:${chapter}`, link = new Map();
    const tally = (codes, label, weight, isEvent) => {
      for (const key of new Set(codes.map(code => `${Math.floor(code / 1e6)}:${Math.floor((code % 1e6) / 1e3)}`))) {
        if (key === mine) continue;
        const row = link.get(key) ?? link.set(key, { score: 0, names: new Set(), event: false }).get(key);
        row.score += weight; row.names.add(label); row.event ||= isEvent;
      }
    };
    for (const item of [...found.people, ...found.places]) { const codes = (item.kind === 'p' ? D.refs.p : D.refs.l)[item.id] ?? []; if (codes.length <= 45) tally(codes, entityName(item.entity), 1 / Math.log2(codes.length + 2), false); }
    for (const event of found.events) tally(D.refs.e[event.i] ?? [], window.PoiemaGraph.eventName(event), 1.5, true);
    return [...link].filter(([, row]) => row.event || row.names.size >= 2).sort((a, b) => b[1].score - a[1].score).slice(0, 4)
      .map(([key, row]) => { const [b, c] = key.split(':').map(Number); return { bookId: b, chapter: c, why: [...row.names].slice(0, 3).join(', ') }; });
  }
  const readLink = (item, note) => `<li><button type="button" class="ix-link" data-guide-read="${item.bookId}.${item.chapter}.${item.verse || 1}">${html(ref(item))}${item.verse ? ':' + item.verse : ''} <span aria-hidden="true">↗</span></button>${note ? `<small>${html(note)}</small>` : ''}</li>`;

  function endPanel(bookId, chapter) {
    const read = isRead(bookId, chapter);
    const next = book(bookId).chapters > chapter ? { bookId, chapter: chapter + 1 } : book(bookId + 1) ? { bookId: bookId + 1, chapter: 1 } : null;
    return `<section class="ix-end" data-ix-end aria-label="${t('Fim do capítulo', 'End of the chapter')}">
      <header><h3>${t('Fim de', 'End of')} ${html(ref({ bookId, chapter }))}</h3>
        <button type="button" class="ix-read" data-ix-toggle-read aria-pressed="${read}">${read ? t('✓ Capítulo lido', '✓ Chapter read') : t('Marcar como lido', 'Mark as read')}</button></header>
      <div class="ix-actions">
        ${next ? `<button type="button" class="ix-primary" data-reader-step="1">${t('Próximo', 'Next')}: ${html(ref(next))} <span aria-hidden="true">→</span></button>` : ''}
        <button type="button" data-reader-topic="cena">${t('Estudar este capítulo', 'Study this chapter')} <span aria-hidden="true">↗</span></button>
        <button type="button" data-reader-topic="quem">${t('Quem, onde e quando', 'Who, where and when')} <span aria-hidden="true">↗</span></button>
        <button type="button" data-ix-note>${t('Anotar no caderno', 'Write in the notebook')}</button>
      </div>
      <div class="ix-related" data-ix-related></div></section>`;
  }

  async function fillRelated(current) {
    const { dialog, bookId, chapter } = current;
    const slot = dialog.querySelector('[data-ix-related]');
    if (!slot) return;
    const blocks = [];
    try {
      const data = await getResource(`/api/library/${bookId}/${chapter}`);
      const byChapter = new Map();
      for (const link of data.crossRefs ?? []) {
        if (link.bookId === bookId && link.chapter === chapter) continue;
        const key = `${link.bookId}:${link.chapter}`, row = byChapter.get(key);
        if (!row || link.score > row.score) byChapter.set(key, { ...link, total: (row?.total ?? 0) + link.score });
        else row.total += link.score;
      }
      const top = [...byChapter.values()].sort((a, b) => b.total - a.total).slice(0, 4);
      if (top.length) blocks.push(`<div><h4>${t('Leia em paralelo', 'Read alongside')}</h4><ul>${top.map(link => readLink(link, `${t('a partir do v.', 'from v.')} ${link.fromVerse}`)).join('')}</ul></div>`);
    } catch {}
    if (current.found && graph()) {
      const list = connected(graph(), current.found, bookId, chapter);
      if (list.length) blocks.push(`<div><h4>${t('Mesmas pessoas, lugares e acontecimentos', 'Same people, places and events')}</h4><ul>${list.map(item => readLink(item, item.why)).join('')}</ul></div>`);
    }
    if (current.token === token && slot.isConnected) slot.innerHTML = blocks.length ? `<h4 class="ix-related-title">${t('Continue por conexão', 'Continue by connection')}</h4><div class="ix-related-grid">${blocks.join('')}</div>` : '';
  }

  function watchEnd(current) {
    observer?.disconnect(); clearTimeout(readTimer);
    const end = current.dialog.querySelector('[data-ix-end]'), root = current.dialog.querySelector('.guide-reader-body');
    if (!end || !root || typeof IntersectionObserver === 'undefined') return;
    const opened = Date.now();
    observer = new IntersectionObserver(entries => {
      clearTimeout(readTimer);
      if (!entries.some(entry => entry.isIntersecting)) return;
      // Reaching the end counts as reading only after some time on the chapter (a short psalm shows its end at once).
      readTimer = setTimeout(() => { if (current.token === token && current.dialog.open) { markRead(current.bookId, current.chapter); paintRead(current); } }, Math.max(2500, 12000 - (Date.now() - opened)));
    }, { root, threshold: 0.4 });
    observer.observe(end);
  }
  function paintRead(current) {
    const button = current.dialog.querySelector('[data-ix-toggle-read]');
    if (!button) return;
    const read = isRead(current.bookId, current.chapter);
    button.setAttribute('aria-pressed', String(read));
    button.textContent = read ? t('✓ Capítulo lido', '✓ Chapter read') : t('Marcar como lido', 'Mark as read');
  }

  // Called by the reader each time a chapter's text is drawn.
  function decorate(dialog, reading) {
    const lines = dialog.querySelector('.guide-reader-lines');
    if (!lines) return;
    closeSheet();
    const current = scope = { dialog, bookId: reading.bookId, chapter: reading.chapter, token: ++token, found: null };
    lines.insertAdjacentHTML('afterend', endPanel(current.bookId, current.chapter));
    watchEnd(current);
    const paired = lines.classList.contains('guide-reader-paired');
    (window.PoiemaGraph?.load() ?? Promise.reject()).then(D => {
      if (current.token !== token || !lines.isConnected) return;
      current.found = chapterEntities(D, current.bookId, current.chapter);
      lines.insertAdjacentHTML('beforebegin', contextStrip(D, current.found, current.bookId, current.chapter));
      if (!paired) markRows(lines, current.found);
    }).catch(() => {}).finally(() => { if (current.token === token) fillRelated(current); });
  }

  // ---------- the card of a person, place or event ----------
  function topChapters(codes, skip) {
    const count = new Map();
    for (const code of codes) { const key = `${Math.floor(code / 1e6)}:${Math.floor((code % 1e6) / 1e3)}`; if (key !== skip) count.set(key, (count.get(key) ?? 0) + 1); }
    return [...count].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([key]) => { const [bookId, chapter] = key.split(':').map(Number); return { bookId, chapter }; });
  }
  function cardHTML(kind, id) {
    const D = graph(); if (!D) return '';
    const chip = slug => { const person = D.person.get(slug); return person ? `<button type="button" class="ix-chip" data-ix="p:${html(slug)}">${html(entityName(person))}</button>` : ''; };
    const skip = scope ? `${scope.bookId}:${scope.chapter}` : '';
    const more = codes => { const list = topChapters(codes ?? [], skip); return list.length ? `<h4>${t('Onde mais aparece', 'Where else it appears')}</h4><ul class="ix-more">${list.map(item => readLink(item)).join('')}</ul>` : ''; };
    const foot = `<footer><button type="button" class="ix-primary" data-ix-atlas="${kind}:${html(id)}">${kind === 'l' ? t('Ver no mapa', 'See on the map') : t('Abrir no atlas', 'Open in the atlas')} <span aria-hidden="true">↗</span></button></footer>`;
    if (kind === 'p') {
      const p = D.person.get(id); if (!p) return '';
      const life = yearLabel(p.by) + (p.dy !== undefined && p.by !== undefined ? ` – ${yearLabel(p.dy)}` : '');
      const family = [[t('Pai', 'Father'), p.f ? [p.f] : []], [t('Mãe', 'Mother'), p.m ? [p.m] : []], [t('Cônjuge', 'Spouse'), p.w ?? []], [t('Filhos', 'Children'), (p.k ?? []).slice(0, 6)]].filter(([, list]) => list.length);
      return `<small class="ix-kind">${t('Pessoa', 'Person')}${p.grp?.length ? ' · ' + html(p.grp[0]) : ''}</small><h3 id="ix-sheet-title">${html(entityName(p))}</h3>
        ${p.ds && !EN ? `<p>${html(p.ds)}</p>` : ''}<p class="ix-fine">${[life, `${number(p.v)} ${t('versículos', 'verses')}`].filter(Boolean).join(' · ')}</p>
        ${(D.eventsOf.get(id) ?? []).length ? `<h4>${t('Acontecimentos', 'Events')}</h4><div class="ix-chips ix-flush">${D.eventsOf.get(id).slice(0, 4).map(event => `<button type="button" class="ix-chip" data-ix="e:${event.i}">${html(window.PoiemaGraph.eventName(event))}</button>`).join('')}</div>` : ''}
        ${family.length ? `<dl class="ix-family">${family.map(([label, list]) => `<div><dt>${label}</dt><dd>${list.map(chip).join('')}${label === t('Filhos', 'Children') && p.k.length > 6 ? ` <small>+${p.k.length - 6}</small>` : ''}</dd></div>`).join('')}</dl>` : ''}
        ${more(D.refs.p[id])}${foot}`;
    }
    if (kind === 'l') {
      const p = D.place.get(id); if (!p) return '';
      const parent = p.po && D.place.get(p.po);
      return `<small class="ix-kind">${html(p.t ?? t('Lugar', 'Place'))}${parent ? ` · ${t('em', 'in')} ${html(entityName(parent))}` : ''}</small><h3 id="ix-sheet-title">${html(entityName(p))}</h3>
        ${p.ds && !EN ? `<p>${html(p.ds)}</p>` : ''}<p class="ix-fine">${[p.c, `${number(p.v)} ${t('versículos', 'verses')}`].filter(Boolean).map(html).join(' · ')}</p>
        ${more(D.refs.l[id])}${foot}`;
    }
    const e = D.event.get(Number(id)); if (!e) return '';
    return `<small class="ix-kind">${t('Acontecimento', 'Event')} · ${html(yearLabel(e.y))}</small><h3 id="ix-sheet-title">${html(window.PoiemaGraph.eventName(e))}</h3>
      ${e.p?.length ? `<dl class="ix-family"><div><dt>${t('Quem', 'Who')}</dt><dd>${e.p.slice(0, 8).map(chip).join('')}</dd></div></dl>` : ''}
      ${more(D.refs.e[e.i])}${foot}`;
  }
  let sheet = null, sheetOrigin = null;
  function openSheet(kind, id, origin) {
    const host = origin?.closest('dialog') ?? scope?.dialog;
    const body = cardHTML(kind, id);
    if (!host || !body) return;
    if (!sheet || sheet.parentNode !== host) { sheet?.remove(); sheet = document.createElement('aside'); sheet.className = 'ix-sheet'; sheet.setAttribute('role', 'region'); sheet.setAttribute('aria-labelledby', 'ix-sheet-title'); host.append(sheet); sheetOrigin = origin; }
    sheet.innerHTML = `<button type="button" class="ix-close" data-ix-close aria-label="${t('Fechar', 'Close')}">×</button>${body}`;
    sheet.scrollTop = 0;
    sheet.querySelector('[data-ix-close]').focus({ preventScroll: true });
  }
  function closeSheet(restore = false) {
    if (!sheet) return false;
    sheet.remove(); sheet = null;
    if (restore && sheetOrigin?.isConnected) sheetOrigin.focus({ preventScroll: true });
    sheetOrigin = null;
    return true;
  }

  document.addEventListener('click', event => {
    const name = event.target.closest('[data-ix]');
    if (name) { event.preventDefault(); const [kind, ...rest] = name.dataset.ix.split(':'); openSheet(kind, rest.join(':'), sheet?.contains(name) ? sheetOrigin : name); return; }
    if (event.target.closest('[data-ix-close]')) return void closeSheet(true);
    const atlas = event.target.closest('[data-ix-atlas]');
    if (atlas) { const [kind, ...rest] = atlas.dataset.ixAtlas.split(':'); closeSheet(); window.PoiemaGraph.open({ kind, id: rest.join(':') }); return; }
    if (event.target.closest('[data-ix-toggle-read]') && scope) { markRead(scope.bookId, scope.chapter, !isRead(scope.bookId, scope.chapter)); paintRead(scope); return; }
    if (event.target.closest('[data-ix-note]') && scope) {
      const label = ref({ bookId: scope.bookId, chapter: scope.chapter });
      window.PoiemaNotes?.compose?.({ title: label, text: `${label}\n\n` });
      return;
    }
    if (sheet && !sheet.contains(event.target)) closeSheet();
  });
  // Escape closes the card first; the reader stays open.
  document.addEventListener('cancel', event => { if (sheet && event.target === sheet.parentNode && closeSheet(true)) event.preventDefault(); }, true);

  window.PoiemaInsight = { decorate, homeCard, refreshHome, bookBadge, markRead, isRead, stats };
})();
