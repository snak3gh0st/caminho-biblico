// The notes area: free-form notes kept in this browser, organized on the device with PoiemaNotesCore
// (Bible references, themes, related passages, questions, things to practise). When the local server has
// an AI key and paid calls are allowed, a button can also ask it to organize a note.
(() => {
  if (typeof document === 'undefined') return;
  const core = globalThis.PoiemaNotesCore;
  const EN = document.documentElement.lang === 'en';
  const t = (pt, en) => (EN ? en : pt);
  const KEY = 'poiema-notes-v1';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

  let notes = [], activeId = null, books = [], enBooks = [], index = null, indexState = '', panel = null, opener = null, status = '', aiBusy = false;
  let analysisTimer, saveTimer;

  function load() {
    try { const data = JSON.parse(localStorage.getItem(KEY)); notes = Array.isArray(data?.notes) ? data.notes.filter(note => note && typeof note.id === 'string') : []; } catch { notes = []; }
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
    return notes.length ? notes.map(note => `<li><button type="button" data-notes-select="${esc(note.id)}" aria-current="${note.id === activeId}"><strong>${esc(titleOf(note))}</strong><small>${new Date(note.updated).toLocaleDateString(EN ? 'en-US' : 'pt-BR')}</small></button></li>`).join('') : `<li class="notes-hint">${t('Nenhuma anotação ainda.', 'No notes yet.')}</li>`;
  }

  function shell() {
    const note = active();
    return `<div class="notes-shell">
      <header class="notes-head"><h2 id="notes-title">${t('Anotações', 'Notes')}</h2><div><button type="button" data-notes="export" ${note ? '' : 'disabled'}>${t('Baixar', 'Download')}</button><button type="button" data-notes="close" aria-label="${t('Fechar anotações', 'Close notes')}">×</button></div></header>
      <p class="notes-privacy">${t('Suas anotações ficam só neste navegador. A organização abaixo acontece no seu aparelho e não envia nada para ninguém.', 'Your notes stay in this browser only. The organizing below happens on your device and sends nothing to anyone.')}</p>
      <div class="notes-body">
        <aside class="notes-list" aria-label="${t('Suas anotações', 'Your notes')}"><button type="button" class="notes-new" data-notes="new">+ ${t('Nova anotação', 'New note')}</button><ul>${listHTML()}</ul></aside>
        <section class="notes-editor">${note ? `<label>${t('Título (opcional)', 'Title (optional)')}<input type="text" maxlength="120" value="${esc(note.title)}" data-notes-field="title"></label><label>${t('Anotação', 'Note')}<textarea maxlength="20000" rows="16" data-notes-field="text" placeholder="${t('Escreva livremente. Cite passagens como João 3:16 ou Sl 23, faça perguntas, anote o que quer praticar.', 'Write freely. Cite passages like John 3:16 or Ps 23, ask questions, note what you want to practise.')}">${esc(note.text)}</textarea></label><div class="notes-foot"><small role="status">${esc(status)}</small><button type="button" data-notes="delete">${t('Apagar', 'Delete')}</button></div>` : `<p class="notes-hint">${t('Crie uma anotação para começar.', 'Create a note to start.')}</p>`}</section>
        <section class="notes-organized" aria-live="polite" aria-label="${t('Anotação organizada', 'Organized note')}">${organizedHTML(note)}</section>
      </div></div>`;
  }
  function refreshOrganized() {
    const target = panel?.querySelector('.notes-organized');
    if (target && !panel.hidden) target.innerHTML = organizedHTML(active());
    panel?.querySelector('.notes-list ul') && (panel.querySelector('.notes-list ul').innerHTML = listHTML());
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
    panel = document.createElement('div');
    panel.id = 'notes-panel'; panel.className = 'notes-panel'; panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'notes-title');
    document.body.append(panel);
    panel.addEventListener('input', event => {
      const field = event.target.closest('[data-notes-field]'), note = active();
      if (!field || !note) return;
      note[field.dataset.notesField] = field.value; note.updated = Date.now();
      clearTimeout(saveTimer); saveTimer = setTimeout(persist, 350);
      clearTimeout(analysisTimer); analysisTimer = setTimeout(refreshOrganized, 700);
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
        if (note && confirm(t('Apagar esta anotação? Isso não pode ser desfeito.', 'Delete this note? This cannot be undone.'))) { notes = notes.filter(item => item !== note); activeId = notes[0]?.id ?? null; persist(); draw(); }
        return;
      }
      if (action === 'export') return download();
      if (action === 'ai') return askAI();
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); close(); }
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll('button:not([disabled]),input,textarea,a[href]')].filter(item => item.offsetParent);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    return panel;
  }

  async function open(id) {
    opener = document.activeElement;
    load(); ensurePanel();
    if (id && notes.some(note => note.id === id)) activeId = id;
    else if (!notes.some(note => note.id === activeId)) activeId = notes[0]?.id ?? null;
    if (!notes.length) { newNote(); } else draw();
    panel.hidden = false; document.body.classList.add('notes-open');
    await loadReferences(); refreshOrganized(); loadIndex();
  }
  function close(restoreFocus = true) {
    if (!panel) return;
    clearTimeout(saveTimer); persist();
    panel.hidden = true; document.body.classList.remove('notes-open');
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  }

  function markdown(note) {
    const result = analyze(note.text);
    const list = items => items.map(item => `- ${item}`).join('\n');
    return [`# ${titleOf(note)}`, '', note.text.trim(), '',
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

  window.PoiemaNotes = { open, close, chapterBlock };
})();
