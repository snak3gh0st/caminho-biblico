// The notes area: free-form notes kept in this browser, organized on the device with PoiemaNotesCore
// (Bible references, themes, related passages, questions, things to practise). When the local server has
// an AI key and paid calls are allowed, a button can also ask it to organize a note.
(() => {
  if (typeof document === 'undefined') return;
  const core = globalThis.PoiemaNotesCore;
  const EN = document.documentElement.lang === 'en';
  const t = (pt, en) => (EN ? en : pt);
  const KEY = 'poiema-notes-v1';
  const MARKS = 'poiema-verse-notebook';
  let filter = '';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  let notes = [], activeId = null, books = [], enBooks = [], index = null, indexState = '', panel = null, opener = null, status = '', aiBusy = false;
  let analysisTimer, saveTimer;

  function readNotebook() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(data?.notes) ? data.notes.filter(note=>note && typeof note.id==='string') : [];
    } catch { return []; }
  }
  function load() { notes=readNotebook(); }
  function studyEntries() {
    return (panel?.open?notes:readNotebook()).flatMap(note=>{
      const practice=window.PoiemaPractice?.normalizeRecord(note.practice);
      return practice?[{...note,practice}]:[];
    });
  }
  function recallEntries() {
    return (panel?.open?notes:readNotebook()).flatMap(note=>{
      const recall=window.PoiemaWorkshop?.normalizeRecall(note.recall);
      return recall?[{...note,recall}]:[];
    });
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify({ notes })); status = ''; } catch { status = t('O navegador não conseguiu salvar. Baixe a anotação para não perdê-la.', 'Your browser could not save. Download the note so you do not lose it.'); }
  }
  const active = () => notes.find(note => note.id === activeId);
  const bookName = id => books.find(book => book.id === Number(id))?.name ?? '';
  const label = ref => `${bookName(ref.bookId)} ${ref.chapter}${ref.from ? `:${ref.from}${ref.to && ref.to !== ref.from ? '–' + ref.to : ''}` : ''}`;
  const studyURL = (bookId, chapter, verse) => { const url = new URL(location.pathname, location.origin); url.searchParams.set('lang', EN ? 'en' : 'pt'); url.hash = `study=${bookId}.${chapter}.${verse || 1}`; return url.href; };
  const link = ref => `<a href="${esc(studyURL(ref.bookId, ref.chapter, ref.from))}" data-notebook-open="${ref.bookId}.${ref.chapter}.${ref.from || 1}" data-notes-link>${esc(label(ref))} ↗</a>`;
  const titleOf = note => (note.title || note.text.split('\n').find(line => line.trim()) || t('Sem título', 'Untitled')).trim().slice(0, 60);

  async function loadReferences() {
    if (books.length) return;
    books = window.poiemaBooks ?? [];
    if (!books.length) try { books = await (await fetch('./books.json')).json(); } catch { books = []; }
    try { enBooks = await (await fetch('./en/books.json')).json(); } catch { enBooks = []; }
    if (EN && enBooks.length) books = enBooks;
  }
  async function loadIndex() {
    if (index || indexState === 'loading') return;
    indexState = 'loading';
    try { index = await (await fetch(EN ? './en/note-index.json' : './note-index.json')).json(); indexState = 'ready'; }
    catch { indexState = 'failed'; }
    refreshOrganized();
  }
  const analyze = text => core.analyze(text, { books, extraBooks: EN ? [] : enBooks, index, language: EN ? 'en' : 'pt' });

  // What the library page needs to know about a note without analysing it again.
  function remember(note, result) {
    note.cites = [...new Set(result.refs.map(ref => `${ref.bookId}:${ref.chapter}`))];
    note.rel = [...new Set([...result.themes.flatMap(theme => theme.passages), ...result.related].map(item => `${item.bookId}:${item.chapter}`))].slice(0, 12);
  }

  function organizedHTML(note) {
    if (!note || !note.text.trim()) return `<p class="notes-hint">${t('Escreva uma anotação. Enquanto você escreve, o app encontra as passagens citadas, os temas e outras passagens do estudo que falam do mesmo assunto.', 'Write a note. As you write, the app finds the passages you cite, the themes, and other passages in the study that speak about the same things.')}</p>`;
    const result = analyze(note.text);
    remember(note, result);
    const parts = [];
    if (result.refs.length) parts.push(`<section><h3>${t('Passagens citadas', 'Passages you cite')}</h3><ul>${result.refs.map(ref => `<li>${link(ref)}</li>`).join('')}</ul></section>`);
    const named = window.PoiemaGraph?.loaded ? window.PoiemaGraph.entitiesIn(result.refs.reduce((text, ref) => text.replace(ref.raw, ' '), note.text)) : null;
    if (named?.people.length || named?.places.length) parts.push(`<section><h3>${t('Pessoas e lugares citados', 'People and places mentioned')}</h3>${named.people.length ? `<div class="gx-chips">${named.people.map(person => window.PoiemaGraph.personChip(person.i)).join('')}</div>` : ''}${named.places.length ? `<div class="gx-chips">${named.places.map(place => window.PoiemaGraph.placeChip(place.i)).join('')}</div>` : ''}<small>${t('Toque para ver a família, o mapa e as passagens.', 'Tap to see the family, the map and the passages.')}</small></section>`);
    if (result.themes.length) parts.push(`<section><h3>${t('Temas', 'Themes')}</h3>${result.themes.map(theme => `<details><summary><strong>${esc(theme.name)}</strong> <small>${esc(theme.words.join(', '))}</small></summary>${theme.passages.length ? `<ul>${theme.passages.map(item => `<li>${link(item)} <small>${esc(item.title)}</small></li>`).join('')}</ul>` : `<p class="notes-hint">${indexState === 'failed' ? t('O índice de passagens não carregou.', 'The passage index did not load.') : t('Buscando passagens…', 'Looking for passages…')}</p>`}</details>`).join('')}</section>`);
    if (result.related.length) parts.push(`<section><h3>${t('Outras passagens que podem ajudar', 'Other passages that may help')}</h3><ul>${result.related.map(item => `<li>${link(item)} <small>${esc(item.title)}</small><small class="notes-why">${t('Palavras em comum', 'Shared words')}: ${esc(item.shared.slice(0, 4).join(', '))}</small></li>`).join('')}</ul></section>`);
    if (result.questions.length) parts.push(`<section><h3>${t('Perguntas em aberto', 'Open questions')}</h3><ul>${result.questions.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section>`);
    if (result.todos.length) parts.push(`<section><h3>${t('Para colocar em prática', 'To put into practice')}</h3><ul>${result.todos.map(line => `<li>${esc(line)}</li>`).join('')}</ul></section>`);
    if (result.summary.length) parts.push(`<section><h3>${t('Em poucas frases', 'In a few sentences')}</h3>${result.summary.map(line => `<p>${esc(line)}</p>`).join('')}</section>`);
    if (!parts.length) parts.push(`<p class="notes-hint">${t('Ainda não achei referências ou temas. Cite passagens (por exemplo, João 3:16) ou escreva um pouco mais.', 'No references or themes found yet. Cite passages (for example, John 3:16) or write a little more.')}</p>`);
    parts.push(aiHTML(note));
    persist();
    return parts.join('');
  }

  function aiHTML(note) {
    const ready = Boolean(window.poiemaAiReady);
    const result = note.ai;
    const body = result ? `<h3>${t('Organizado com IA', 'Organized with AI')}</h3>${result.summary ? `<p>${esc(result.summary)}</p>` : ''}${result.themes?.length ? `<ul>${result.themes.map(theme => `<li><strong>${esc(theme.name)}</strong> ${esc(theme.why)}</li>`).join('')}</ul>` : ''}${result.references?.length ? `<h4>${t('Passagens sugeridas', 'Suggested passages')}</h4><ul>${result.references.map(ref => `<li>${link(ref)} <small>${esc(ref.why)}</small></li>`).join('')}</ul>` : ''}${result.questions?.length ? `<h4>${t('Perguntas para estudar', 'Questions to study')}</h4><ul>${result.questions.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}${result.nextSteps?.length ? `<h4>${t('Próximos passos', 'Next steps')}</h4><ul>${result.nextSteps.map(line => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}` : '';
    if (!ready && !result) return '';
    return `<section class="notes-ai">${body}${ready ? `<button type="button" data-notes="ai" ${aiBusy ? 'disabled' : ''}>${aiBusy ? t('Organizando…', 'Organizing…') : result ? t('Organizar de novo com IA', 'Organize again with AI') : t('Organizar com IA', 'Organize with AI')}</button><small>${t('Envia o texto desta anotação para a OpenAI e pode gerar custo.', 'Sends the text of this note to OpenAI and may cost money.')}</small>` : ''}</section>`;
  }

  function listHTML() {
    const query = core.normalize(filter.trim());
    const visible = notes.filter(note => core.normalize(note.title + ' ' + note.text).includes(query));
    return visible.length ? visible.map(note => `<li><button type="button" data-notes-select="${esc(note.id)}" aria-current="${note.id === activeId}"><strong>${esc(titleOf(note))}</strong><small>${new Date(note.updated).toLocaleDateString(EN ? 'en-US' : 'pt-BR')}</small></button></li>`).join('') : `<li class="notes-hint">${query ? t('Nenhuma anotação encontrada.', 'No notes found.') : t('Nenhuma anotação ainda.', 'No notes yet.')}</li>`;
  }

  function savedPassages() {
    const query = core.normalize(filter.trim());
    const entries = Object.values(notebookEntries()).sort((a,b) => b.updated - a.updated)
      .filter(entry => core.normalize(label({...entry,from:entry.verse}) + ' ' + (entry.note || '')).includes(query));
    return entries.map(entry => `<li>${link({...entry,from:entry.verse})}${entry.note ? `<small>${esc(entry.note)}</small>` : ''}</li>`).join('');
  }

  function shell() {
    const note = active();
    const passages = savedPassages();
    const practice = window.PoiemaPractice;
    const selectedStudy = practice?.normalizeRecord(note?.practice);
    return `<div class="notes-shell">
      <header class="notes-head"><h2 id="notes-title">${t('Caderno', 'Notebook')}</h2><div><button type="button" data-notes="export" ${note ? '' : 'disabled'}>${t('Baixar nota', 'Download note')}</button><button type="button" data-notes="backup">${t('Fazer backup', 'Back up')}</button><button type="button" data-notes="restore">${t('Restaurar backup', 'Restore backup')}</button><input type="file" accept=".json,application/json" data-notes-file hidden><button type="button" data-notes="close" aria-label="${t('Fechar anotações', 'Close notes')}">×</button></div></header>
      <p class="notes-privacy">${t('Suas anotações ficam só neste navegador. A organização abaixo acontece no seu aparelho e não envia nada para ninguém.', 'Your notes stay in this browser only. The organizing below happens on your device and sends nothing to anyone.')}</p>
      <p class="notes-backup-status" role="status" data-notes-backup-status></p>
      <div data-notes-practice-queue>${practice?.notebookQueue(studyEntries()) || ''}</div>
      <div data-notes-recall-queue>${window.PoiemaWorkshop?.notebookQueue(recallEntries()) || ''}</div>
      <div class="notes-body">
        <aside class="notes-list" aria-label="${t('Suas anotações', 'Your notes')}"><button type="button" class="notes-new" data-notes="new">+ ${t('Nova anotação', 'New note')}</button><label class="notes-search">${t('Buscar no caderno','Search notebook')}<input type="search" data-notes-search value="${esc(filter)}"></label><ul>${listHTML()}</ul><details class="notes-bookmarks" ${passages ? 'open' : ''}><summary>${t('Passagens guardadas','Saved passages')}</summary><ul>${passages}</ul></details></aside>
        <section class="notes-editor"><div data-notes-practice-detail>${selectedStudy ? practice.notebookDetail({...note,practice:selectedStudy}) : ''}</div>${note ? `<label>${t('Título (opcional)', 'Title (optional)')}<input type="text" maxlength="120" value="${esc(note.title)}" data-notes-field="title"></label><label>${t('Anotação', 'Note')}<textarea maxlength="20000" rows="16" data-notes-field="text" placeholder="${t('Escreva livremente. Cite passagens como João 3:16 ou Sl 23, faça perguntas, anote o que quer praticar.', 'Write freely. Cite passages like John 3:16 or Ps 23, ask questions, note what you want to practise.')}">${esc(note.text)}</textarea></label><div class="notes-foot"><small role="status">${esc(status)}</small><button type="button" data-notes="delete">${t('Apagar', 'Delete')}</button></div>` : `<p class="notes-hint">${t('Crie uma anotação para começar.', 'Create a note to start.')}</p>`}</section>
        <section class="notes-organized" aria-live="polite" aria-label="${t('Anotação organizada', 'Organized note')}">${organizedHTML(note)}</section>
      </div></div>`;
  }
  function refreshOrganized() {
    const target = panel?.querySelector('.notes-organized');
    if (target && panel.open) target.innerHTML = organizedHTML(active());
    if (panel?.querySelector('.notes-list ul')) panel.querySelector('.notes-list ul').innerHTML = listHTML();
    if (panel?.querySelector('.notes-bookmarks ul')) panel.querySelector('.notes-bookmarks ul').innerHTML = savedPassages();
  }
  function draw() {
    panel.innerHTML = shell();
    panel.querySelector('[data-notes-field=text]')?.focus({ preventScroll: true });
  }

  function newNote() {
    const note = { id: (crypto.randomUUID?.() ?? String(Date.now())), title: '', text: '', created: Date.now(), updated: Date.now() };
    notes.unshift(note); notes = notes.slice(0, 200); activeId = note.id; persist(); draw();
  }

  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('dialog');
    panel.id = 'notes-panel'; panel.className = 'notes-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'notes-title');
    document.body.append(panel);
    panel.addEventListener('input', event => {
      if (event.target.matches('[data-notes-search]')) {
        filter = event.target.value;
        panel.querySelector('.notes-list ul').innerHTML = listHTML();
        panel.querySelector('.notes-bookmarks ul').innerHTML = savedPassages();
        return;
      }
      const field = event.target.closest('[data-notes-field]'), note = active();
      if (!field || !note) return;
      note[field.dataset.notesField] = field.value; note.updated = Date.now();
      clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350);
      clearTimeout(analysisTimer); analysisTimer = setTimeout(refreshOrganized, 700);
    });
    panel.addEventListener('change', event => {
      if (!event.target.matches('[data-notes-file]')) return;
      const file = event.target.files[0];
      event.target.value = '';
      if (file) restoreBackup(file);
    });
    panel.addEventListener('click', async event => {
      const select = event.target.closest('[data-notes-select]');
      if (select) { activeId = select.dataset.notesSelect; delete active()?.ai; draw(); return; }
      if (event.target.closest('[data-notes-link]')) { if (!event.metaKey && !event.ctrlKey && !event.shiftKey) close(false); return; }
      const action = event.target.closest('[data-notes]')?.dataset.notes;
      if (action === 'close') return close();
      if (action === 'new') return newNote();
      if (action === 'delete') {
        const note = active();
        if (note && confirm(t('Apagar esta anotação? Isso não pode ser desfeito.', 'Delete this note? This cannot be undone.'))) { notes = notes.filter(item => item !== note); activeId = notes[0]?.id ?? null; persist(); draw(); window.PoiemaPractice?.refreshHome(); }
        return;
      }
      if (action === 'export') return download();
      if (action === 'backup') return backup();
      if (action === 'restore') return panel.querySelector('[data-notes-file]').click();
      if (action === 'ai') return askAI();
    });
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    return panel;
  }

  async function open(id) {
    opener = document.activeElement;
    load(); ensurePanel(); filter = '';
    if (id && notes.some(note => note.id === id)) activeId = id;
    else if (!notes.some(note => note.id === activeId)) activeId = notes[0]?.id ?? null;
    if (!panel.open) panel.showModal();
    if (!notes.length) { newNote(); } else draw(); document.body.classList.add('notes-open');
    await loadReferences(); refreshOrganized(); loadIndex();
    window.PoiemaGraph?.load().then(refreshOrganized).catch(() => {});
  }
  // Starts a new note already titled (the reader's "write in the notebook").
  async function compose({ title = '', text = '' } = {}) {
    load();
    const empty = notes.find(note => note.title === title && note.text.trim() === text.trim());
    if (empty) return open(empty.id);
    if (notes.length >= 200) return open();
    const note = { id: (crypto.randomUUID?.() ?? String(Date.now())), title, text, created: Date.now(), updated: Date.now() };
    notes.unshift(note); persist();
    await open(note.id);
    const field = panel?.querySelector('[data-notes-field=text]');
    if (field) { field.focus({ preventScroll: true }); field.setSelectionRange(field.value.length, field.value.length); }
  }
  function close(restoreFocus = true) {
    if (!panel?.open) return;
    clearTimeout(saveTimer); persist();
    panel.close(); document.body.classList.remove('notes-open');
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  }

  function markdown(note) {
    const result = analyze(note.text);
    const list = items => items.map(item => `- ${item}`).join('\n');
    const practice = window.PoiemaPractice?.normalizeRecord(note.practice);
    const history = practice?.reviews.map(item=>`- ${item.date} · ${item.outcome==='done'?t('Consegui praticar','I put it into practice'):t('Quero ajustar','I want to adjust it')}${item.note?'\n  '+item.note:''}`).join('\n');
    const practiceText = practice ? `## ${t('Aplicação','Application')}\n\n${practice.action}\n\n${t('Revisão','Review')} · ${practice.reviewOn}${history?'\n\n'+history:''}` : '';
    return [`# ${titleOf(note)}`, '', note.text.trim(), '', practiceText,
      result.refs.length ? `## ${t('Passagens citadas', 'Passages you cite')}\n${list(result.refs.map(label))}\n` : '',
      result.themes.length ? `## ${t('Temas', 'Themes')}\n${list(result.themes.map(theme => theme.name))}\n` : '',
      result.related.length ? `## ${t('Passagens relacionadas', 'Related passages')}\n${list(result.related.map(item => `${label(item)} — ${item.title}`))}\n` : '',
      result.questions.length ? `## ${t('Perguntas em aberto', 'Open questions')}\n${list(result.questions)}\n` : ''].filter(Boolean).join('\n');
  }
  function download() {
    const note = active(); if (!note) return;
    const url = URL.createObjectURL(new Blob([markdown(note)], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = `${titleOf(note).replace(/[^\p{L}\d]+/gu, '-').replace(/^-|-$/g, '') || 'anotacao'}.md`;
    document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function backup() {
    const payload = {format:'poiema-notebook',version:1,notes,passages:Object.values(notebookEntries())};
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'poiema-caderno-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url),2000);
  }

  const timestamp = value => Number.isSafeInteger(value) && value > 0 && value <= 8640000000000000 ? value : 0;
  function validPassage(entry) {
    const catalog = books.length ? books : window.poiemaBooks || [];
    const item = catalog.find(book => book.id === entry?.bookId);
    return item && Number.isInteger(entry.chapter) && entry.chapter >= 1 && entry.chapter <= item.chapters &&
      Number.isInteger(entry.verse) && entry.verse >= 1 && entry.verse <= 176 && typeof entry.note === 'string' && entry.note.length <= 4000;
  }

  async function restoreBackup(file) {
    const message = text => { const field = panel.querySelector('[data-notes-backup-status]'); if (field) field.textContent = text; };
    try {
      if (file.size > 12_000_000) throw new Error();
      const data = JSON.parse(await file.text());
      if (data?.format !== 'poiema-notebook' || data.version !== 1 || !Array.isArray(data.notes) || !Array.isArray(data.passages)) throw new Error();
      const merged = new Map(notes.map(note => [note.id,note]));
      for (const entry of data.notes) {
        if (!entry || typeof entry.id !== 'string' || !/^[a-z0-9_-]{1,100}$/i.test(entry.id) || typeof entry.title !== 'string' || entry.title.length > 120 || typeof entry.text !== 'string' || entry.text.length > 20000) throw new Error();
        const updated = timestamp(entry.updated);
        const practice=entry.practice===undefined ? null : window.PoiemaPractice?.normalizeRecord(entry.practice);
        if (entry.practice!==undefined && !practice) throw new Error();
        const note={id:entry.id,title:entry.title,text:entry.text,created:timestamp(entry.created),updated};
        if (entry.recall!==undefined) {
          const recall=window.PoiemaWorkshop?.normalizeRecall(entry.recall);
          if (!recall) throw new Error();
          note.recall=recall;
        }
        if (practice) {
          note.practice=practice;
          note.cites=[practice.reference.slice(0,2).join(':')];
        }
        if (!merged.has(entry.id) || updated>merged.get(entry.id).updated) merged.set(entry.id,note);
      }
      if (merged.size > 200) throw new Error();
      const marks = notebookEntries();
      for (const entry of data.passages) {
        if (!validPassage(entry)) throw new Error();
        const id = [entry.bookId,entry.chapter,entry.verse].join('.');
        if (!marks[id] || timestamp(entry.updated) > marks[id].updated) marks[id] = {bookId:entry.bookId,chapter:entry.chapter,verse:entry.verse,note:entry.note,marked:entry.marked === true,updated:timestamp(entry.updated)};
      }
      const next = [...merged.values()].sort((a,b) => b.updated - a.updated);
      const before = localStorage.getItem(KEY);
      localStorage.setItem(KEY,JSON.stringify({notes:next}));
      try { localStorage.setItem(MARKS,JSON.stringify(marks)); }
      catch (error) {
        if (before === null) localStorage.removeItem(KEY);
        else localStorage.setItem(KEY,before);
        throw error;
      }
      notes = next;
      filter = '';
      activeId = next[0]?.id ?? null;
      draw();
      window.PoiemaPractice?.refreshHome();
      message(t('Backup restaurado. As anotações e passagens guardadas foram reunidas.', 'Backup restored. Notes and saved passages have been merged.'));
    } catch {
      message(t('Não foi possível restaurar este arquivo. Confira se é um backup do Caderno e se há espaço no navegador.', 'Could not restore this file. Check that it is a Notebook backup and that your browser has storage available.'));
    }
  }

  async function askAI() {
    const note = active(); if (!note || aiBusy || !note.text.trim()) return;
    aiBusy = true; refreshOrganized();
    try {
      const response = await fetch('/api/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: note.text, language: EN ? 'en' : 'pt' }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t('A IA não respondeu.', 'The AI did not answer.'));
      note.ai = data.result; persist();
    } catch (error) { status = error.message; panel?.querySelector('[role=status]') && (panel.querySelector('[role=status]').textContent = status); }
    aiBusy = false; refreshOrganized();
  }

  // The study view lists the notes that cite or relate to the chapter being read.
  function chapterBlock(reading) {
    load();
    const mark = `${reading.bookId}:${reading.chapter}`;
    const cited = notes.filter(note => note.cites?.includes(mark)), related = notes.filter(note => !note.cites?.includes(mark) && note.rel?.includes(mark));
    if (!cited.length && !related.length) return '';
    const row = (note, why) => `<li><button type="button" data-notes-open="${esc(note.id)}">${esc(titleOf(note))}</button> <small>${why}</small></li>`;
    return `<aside class="notes-chapter"><h4>${t('Suas anotações sobre este capítulo', 'Your notes about this chapter')}</h4><ul>${cited.map(note => row(note, t('cita este capítulo', 'cites this chapter'))).join('')}${related.slice(0, 3).map(note => row(note, t('trata de assuntos parecidos', 'covers similar subjects'))).join('')}</ul></aside>`;
  }
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-notes-open]');
    if (target) { event.preventDefault(); open(target.dataset.notesOpen); }
  });

  function saveNotebookEntry(note,existing) {
    const next=[note,...notes.filter(entry=>entry!==existing)];
    localStorage.setItem(KEY,JSON.stringify({notes:next}));
    notes=next;
    if (panel?.open) {
      panel.querySelector('[data-notes-practice-queue]').innerHTML=window.PoiemaPractice?.notebookQueue(studyEntries()) || '';
      panel.querySelector('[data-notes-recall-queue]').innerHTML=window.PoiemaWorkshop?.notebookQueue(recallEntries()) || '';
      if (note.id===activeId && note.practice) panel.querySelector('[data-notes-practice-detail]').innerHTML=window.PoiemaPractice.notebookDetail(note);
      refreshOrganized();
    }
    window.PoiemaWorkshop?.refreshHome();
    return note.id;
  }

  function saveDiscovery({title,text,cites,id,recallReference}) {
    if (!panel?.open) load();
    const existing=notes.find(note=>note.id===id);
    if (!existing && notes.length>=200) throw new Error('Notebook full');
    const now=Date.now();
    const note={...existing,id:existing?.id || crypto.randomUUID(),title,text,cites,created:existing?.created || now,updated:now};
    const recall=note.recall || (recallReference && window.PoiemaWorkshop?.schedule(recallReference));
    if (recall) note.recall=recall;
    return saveNotebookEntry(note,existing);
  }

  function saveStudy({id,title,text,practice,previous}) {
    const record=window.PoiemaPractice?.normalizeRecord(practice);
    if (!record) throw new Error('Invalid study application');
    if (!panel?.open) load();
    const existing=id ? notes.find(note=>note.id===id) : null;
    if (id && (!existing || previous && JSON.stringify(existing.practice)!==JSON.stringify(previous))) throw new Error('Study changed');
    if (!existing && notes.length>=200) throw new Error('Notebook full');
    const now=Date.now();
    const note={
      ...existing,id:existing?.id || crypto.randomUUID(),title:title ?? existing?.title,text:text ?? existing?.text,
      practice:record,cites:[...new Set([...(existing?.cites || []),record.reference.slice(0,2).join(':')])],
      created:existing?.created || now,updated:now,
    };
    const recall=note.recall || window.PoiemaWorkshop?.schedule(record.reference);
    if (recall) note.recall=recall;
    return saveNotebookEntry(note,existing);
  }

  function saveRecall(id,record,previous) {
    const recall=window.PoiemaWorkshop?.normalizeRecall(record);
    if (!panel?.open) load();
    const existing=notes.find(note=>note.id===id);
    if (!recall || !existing || JSON.stringify(existing.recall)!==JSON.stringify(previous)) throw new Error('Review changed');
    return saveNotebookEntry({...existing,recall,updated:Date.now()},existing);
  }

  window.PoiemaNotes = {open,compose,close,chapterBlock,saveDiscovery,saveStudy,studyEntries,recallEntries,saveRecall};
})();
