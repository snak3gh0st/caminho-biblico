(() => {
  const english = document.documentElement.lang === 'en';
  const t = (pt, en) => english ? en : pt;
  const title = pair => pair[english ? 1 : 0];
  const positionKey = 'poiema-reader-position';
  const historyKey = 'poiema-reading-history';
  let recentPositions;
  let searchDialog, searchRevision = 0, indexRequest, idf;

  function validPosition(saved) {
    return book(saved?.bookId) && Number.isInteger(saved.chapter) && saved.chapter >= 1 &&
      saved.chapter <= book(saved.bookId).chapters && Number.isInteger(saved.verse) && saved.verse >= 1 && saved.verse <= 176;
  }

  function readingHistory() {
    if (recentPositions) return recentPositions;
    recentPositions = [];
    try {
      const saved = JSON.parse(localStorage.getItem(historyKey));
      const previous = JSON.parse(localStorage.getItem(positionKey));
      if (Array.isArray(saved)) recentPositions = saved.filter(validPosition).slice(0,6);
      if (validPosition(previous) && !recentPositions.length) recentPositions.push(previous);
    } catch {}
    return recentPositions;
  }

  function savePosition(bookId, chapter, verse) {
    const history = readingHistory(), position = {bookId,chapter,verse};
    if (history[0]?.bookId===bookId && history[0]?.chapter===chapter && history[0]?.verse===verse) return;
    recentPositions = [position,...history.filter(item => item.bookId!==bookId || item.chapter!==chapter)].slice(0,6);
    try {
      localStorage.setItem(positionKey,JSON.stringify(position));
      localStorage.setItem(historyKey,JSON.stringify(recentPositions));
    } catch {}
  }

  const rangeLabel = ([bookId, chapter, from, to]) => `${ref({bookId, chapter})}${from ? ':' + from : ''}${to && to !== from ? '–' + to : ''}`;
  const passage = (reading, label = rangeLabel(reading)) => `<button type="button" class="guide-passage" data-guide-read="${reading.join('.')}" aria-label="${esc(label === rangeLabel(reading) ? label : label + ' · ' + rangeLabel(reading))}">${esc(label)} <span aria-hidden="true">↗</span></button>`;
  const links = readings => `<div class="guide-links">${readings.map(reading => passage(reading)).join('')}</div>`;
  const bookLink = bookId => `<button type="button" class="guide-passage" data-guide-book="${bookId}">${esc(book(bookId)?.name)} <span aria-hidden="true">↗</span></button>`;

  function resumeButton() {
    const previous = readingHistory()[0];
    if (!previous) return passage([41,1,14,20], t('Ler Marcos 1:14–20', 'Read Mark 1:14–20'));
    const target = [previous.bookId, previous.chapter, previous.verse];
    return passage(target, t('Continuar em ', 'Continue at ') + rangeLabel(target));
  }

  function recentReading() {
    const list = readingHistory().slice(1,5);
    return list.length ? `<h2>${t('Leituras recentes','Recent readings')}</h2><div class="guide-links">${list.map(item => passage([item.bookId,item.chapter,item.verse])).join('')}</div>` : '';
  }

  function refreshResume() {
    const resume = document.querySelector('#guide-resume');
    if (!resume) return;
    const next = resumeButton();
    if (resume.innerHTML !== next) resume.innerHTML = next;
    const recent = document.querySelector('#guide-recent');
    if (recent) recent.innerHTML = recentReading();
    const heading = document.querySelector('#guide-start-title');
    if (heading && readingHistory().length) heading.textContent = t('Continue de onde parou','Pick up where you left off');
  }

  function quickSearch() {
    return `<form class="guide-quick-search" data-guide-quick-search><label for="guide-quick-query">${t('Encontre uma passagem, tema ou lugar','Find a passage, theme, or place')}</label>
      <div><input id="guide-quick-query" type="search" name="query" required maxlength="120" placeholder="${t('Ex.: Jo 4:7–26, água viva','E.g. John 4:7–26, living water')}"><button class="guide-passage">${t('Localizar','Find')}</button></div></form>`;
  }

  function start(activePlan='') {
    const returning = readingHistory().length > 0;
    return `<section class="guide-dashboard" aria-labelledby="guide-start-title">
      <div class="guide-intro"><h1 id="guide-start-title">${returning ? t('Continue de onde parou','Pick up where you left off') : t('Por onde começar na Bíblia?', 'Where should I start in the Bible?')}</h1>
        ${returning ? '' : `<p>${t('Comece com a primeira mensagem de Jesus em Marcos, ou procure uma passagem.', 'Start with Jesus’s first message in Mark, or find a passage.')}</p>`}
        <div class="guide-hero-actions"><div id="guide-resume">${resumeButton()}</div>
          <button class="guide-passage guide-open-index" data-action="bible">${t('Ver índice da Bíblia','Browse Bible books')}</button></div>
        ${quickSearch()}
      </div>
      <article class="guide-home-feature"><img src="./scenes/passage-43-4-7-26.webp" alt="" width="1280" height="720" fetchpriority="high">
        <div><small>${t('Entre na passagem · João 4','Step into the passage · John 4')}</small><h2>${t('Jesus e a mulher samaritana','Jesus and the Samaritan woman')}</h2>
        ${window.PoiemaDiscoveries.launch('joao-4',t('Explorar João 4','Explore John 4'))}</div>
        <span class="guide-feature-credit">${t('Ilustração gerada por IA','AI-generated illustration')}</span></article>
    </section>
    ${activePlan}
    <section class="guide-active-plan guide-active-journey" id="guide-practice-resume">${window.PoiemaPractice?.homeCard() || ''}</section>
    <section class="guide-active-plan guide-active-journey" id="guide-resume-journey">${window.PoiemaDiscoveries.resume()}</section>
    <section class="guide-recent" id="guide-recent" aria-label="${t('Leituras recentes','Recent readings')}">${recentReading()}</section>
    <section class="guide-pathways" aria-labelledby="guide-pathway-title">
      <h2 id="guide-pathway-title">${t('Escolha o que quer conhecer','Choose what you want to explore')}</h2>
      <article><div><h3>${t('A vida de Jesus','The life of Jesus')}</h3><p>${t('Sete leituras do Evangelho de João, do prólogo à ressurreição.','Seven readings from John, from the prologue to the resurrection.')}</p></div><button class="guide-passage" data-action="start-starter" data-key="jesus">${t('Começar plano','Start plan')} <span aria-hidden="true">→</span></button></article>
      <article><div><h3>${t('A história da Bíblia','The story of the Bible')}</h3><p>${t('Percorra as épocas e veja onde a criação, o exílio, Jesus e a igreja se encaixam.','See where creation, exile, Jesus, and the church fit across the eras.')}</p></div><button class="guide-passage" data-action="explore" data-section="history">${t('Abrir linha do tempo','Open timeline')} <span aria-hidden="true">→</span></button></article>
      <article><div><h3>${t('Estude e leve para a semana','Study and take it into your week')}</h3><p>${t('Entenda um trecho e escolha um passo para praticar e rever no Caderno.','Understand a passage and choose a step to practise and review in your Notebook.')}</p></div><button class="guide-passage" data-action="explore" data-section="study">${t('Ver estudos guiados','Browse guided studies')} <span aria-hidden="true">→</span></button></article>
      <article><div><h3>${t('Como ler cada gênero','How to read each genre')}</h3><p>${t('Experimente ler uma narrativa, um salmo ou uma carta com perguntas que orientam a leitura.','Try a narrative, psalm, or letter with questions to guide your reading.')}</p></div><button class="guide-passage" data-action="explore" data-section="genres">${t('Ver gêneros','Browse genres')} <span aria-hidden="true">→</span></button></article>
    </section>`;
  }

  function bookGroups(testament='all') {
    return guideBookGroups.filter(([,from]) => testament==='all' || (from<=39 ? 'old':'new')===testament)
      .map(([name,from,to]) => `<section class="guide-book-group"><h3>${esc(title(name))}</h3><div class="guide-links">${books.filter(item => item.id >= from && item.id <= to).map(item => bookLink(item.id)).join('')}</div></section>`).join('');
  }

  function bibleIndex() {
    return `<section class="guide-library-index" id="book-index" aria-labelledby="book-index-title"><h2 id="book-index-title">${t('Índice dos livros','Bible book index')}</h2>
      <div class="guide-section-nav" role="group" aria-label="${t('Testamentos','Testaments')}">${[['all','Todos','All'],['old','Antigo Testamento','Old Testament'],['new','Novo Testamento','New Testament']].map(([id,pt,en])=>`<button type="button" data-guide-testament="${id}" aria-pressed="${id==='all'}">${t(pt,en)}</button>`).join('')}</div>
      <div data-guide-book-groups>${bookGroups()}</div></section>`;
  }

  const topics = [
    ['discoveries','Percursos','Journeys'],['study','Estudos guiados','Guided studies'],['history','História e mapas','History and maps'],
    ['genres','Como ler','How to read'],['themes','Temas','Themes'],['structure','Os livros','The books']
  ];

  function explore(selected='discoveries') {
    const panels = {
      discoveries: () => window.PoiemaDiscoveries.featured(),
      study: () => window.PoiemaPractice.library(),
      history: () => `<section class="guide-section" id="history"><h2>${t('Da criação à nova criação','From creation to new creation')}</h2>
        <p>${t('Navegue pelas épocas da narrativa e situe os acontecimentos nos livros e nos mapas.', 'Explore the periods of the narrative and locate events in the books and maps.')}</p>
        <div class="guide-links"><button class="guide-passage guide-history-plan" data-action="start-starter" data-key="historia">${t('Fazer a jornada em 7 dias','Take the seven-day journey')} →</button>
        <button class="guide-passage" data-action="atlas">${t('Abrir atlas bíblico','Open Bible atlas')} ↗</button></div>
        ${window.PoiemaDiscoveries.historyView()}</section>`,
      genres: () => `<section class="guide-section" id="genres"><h2>${t('Como ler cada gênero','How to read each genre')}</h2><div class="guide-card-grid">${guideGenres.map(genre => `<article><h3>${esc(title(genre.title))}</h3><p>${esc(title(genre.text))}</p>${passage(genre.read)}</article>`).join('')}</div></section>`,
      themes: () => `<section class="guide-section" id="themes"><h2>${t('Temas que atravessam os livros','Themes across the books')}</h2><div class="guide-card-grid">${guideThemes.map(theme => `<article id="theme-${theme.id}"><h3>${esc(title(theme.title))}</h3><p>${esc(title(theme.text))}</p>${links(theme.read)}</article>`).join('')}</div></section>`,
      structure: () => `<section class="guide-section" id="structure"><h2>${t('Como a Bíblia é formada','How the Bible is organized')}</h2>
        <p>${t('O índice segue os 66 livros do cânon protestante, organizados em Antigo e Novo Testamento. Outras tradições cristãs têm listas e agrupamentos próprios. Capítulos e versículos ajudam a encontrar um trecho. As traduções fazem escolhas diferentes ao expressar textos escritos em hebraico, aramaico e grego.', 'The index follows the 66-book Protestant canon, arranged in the Old and New Testaments. Other Christian traditions use their own lists and groupings. Chapters and verses help locate a passage. Translations make different choices when rendering texts written in Hebrew, Aramaic, and Greek.')}</p>
        <a class="guide-passage" href="${esc(pageURL('bible').href)}" data-action="bible">${t('Ver índice dos livros','Browse the book index')} →</a></section>`
    };
    return `<main class="home-wrap guide-explore">
      <header class="guide-page-heading"><h1>${t('Entenda a Bíblia', 'Understand the Bible')}</h1></header>
      <nav class="guide-section-nav" aria-label="${t('Áreas de exploração','Explore sections')}">${topics.map(([id,pt,en])=>`<a href="${esc(pageURL('explore',id).href)}" data-action="explore" data-section="${id}" ${id===selected?'aria-current="page"':''}>${t(pt,en)}</a>`).join('')}</nav>
      ${(panels[selected] || panels.discoveries)()}
    </main>`;
  }

  function search(query='') {
    if (!searchDialog) {
      searchDialog = document.createElement('dialog');
      searchDialog.className = 'guide-dialog guide-search';
      searchDialog.setAttribute('aria-labelledby', 'guide-search-title');
      searchDialog.innerHTML = `<header class="guide-dialog-head"><h2 id="guide-search-title">${t('Buscar na Bíblia', 'Search the Bible')}</h2><form method="dialog"><button aria-label="${t('Fechar busca', 'Close search')}">×</button></form></header>
        <form class="guide-search-form"><label for="guide-query">${t('Referência, palavra, tema ou lugar', 'Reference, word, theme, or place')}</label><div><input id="guide-query" type="search" maxlength="120" required autocomplete="off" placeholder="${t('Jo 4:7–26, água viva, Samaria', 'John 4:7–26, living water, Samaria')}"><button>${t('Buscar', 'Search')}</button></div></form>
        <div class="guide-search-list" aria-live="polite"></div>`;
      document.body.append(searchDialog);
      searchDialog.querySelector('.guide-search-form').addEventListener('submit', event => {
        event.preventDefault();
        runSearch(searchDialog.querySelector('#guide-query').value.trim());
      });
      searchDialog.addEventListener('close', () => { searchRevision++; });
    }
    if (!searchDialog.open) searchDialog.showModal();
    const field = searchDialog.querySelector('#guide-query');
    field.focus();
    if (query) { field.value = query; runSearch(query); }
  }

  async function verseResults(query, revision) {
    const clean = window.PoiemaNotesCore.normalize(query).replace(/[^a-z0-9]+/g, ' ').trim();
    if (clean.length < 2) return { hits:[], missing:0 };
    const hits = [];
    let missing = 0;
    for (let start = 0; start < books.length && hits.length < 12 && revision === searchRevision; start += 5) {
      const batch = books.slice(start,start+5);
      const texts = await Promise.all(batch.map(item => portalBookText(item.id)));
      for (const [index,chapters] of texts.entries()) {
        if (!Object.keys(chapters).length) { missing++; continue; }
        for (const [chapter,text] of Object.entries(chapters)) {
          for (const [verse,line] of Object.entries(text)) {
            const normalized = window.PoiemaNotesCore.normalize(line).replace(/[^a-z0-9]+/g,' ');
            if (` ${normalized} `.includes(` ${clean} `)) {
              hits.push({ref:[batch[index].id,Number(chapter),Number(verse)],line});
              if (hits.length === 12) return {hits,missing};
            }
          }
        }
      }
    }
    return {hits,missing};
  }

  async function runSearch(query) {
    if (!query) return;
    const revision = ++searchRevision;
    const result = searchDialog.querySelector('.guide-search-list');
    const core = window.PoiemaNotesCore;
    const aliases = core.bookAliases([books]);
    const exact = core.findReferences(query, aliases, books).find(item => item.raw === query);
    if (exact) {
      searchDialog.close();
      return window.PoiemaReader.open(exact);
    }
    const bookId = aliases.get(query.toLowerCase()) ?? aliases.get(core.normalize(query).replace(/[^a-z0-9]/g, ''));
    const words = core.tokens(query);
    const normalized = core.normalize(query);
    const themes = guideThemes.filter(theme => {
      const description = core.normalize(title(theme.title) + ' ' + theme.keywords);
      return description.includes(normalized) || words.filter(word => description.includes(word)).length >= 2;
    });
    const questionGuides = window.PoiemaDiscoveries.questions(query);
    result.innerHTML = questionGuides + (bookId ? `<section><h3>${t('Livro', 'Book')}</h3>${bookLink(bookId)}</section>` : '')
      + (themes.length ? `<section><h3>${t('Temas e perguntas', 'Themes and questions')}</h3>${themes.map(theme => `<article><strong>${esc(title(theme.title))}</strong><p>${esc(title(theme.text))}</p>${links(theme.read)}</article>`).join('')}</section>` : '')
      + '<div data-guide-result="verses"></div><div data-guide-result="entities"></div><div data-guide-result="studies"></div>'
      + '<p role="status">' + t('Buscando na Bíblia…','Searching the Bible…') + '</p>';

    let hasResults = Boolean(bookId || questionGuides || themes.length), incomplete = false;
    const isCurrent = () => revision===searchRevision && searchDialog.open;
    const publish = (slot,markup) => {
      if (!isCurrent() || !markup) return;
      result.querySelector(`[data-guide-result="${slot}"]`).innerHTML = markup;
      hasResults = true;
    };
    indexRequest ??= staticFile(english ? 'en/note-index.json' : 'note-index.json').catch(() => { indexRequest = undefined; return null; });
    await Promise.allSettled([
      verseResults(query,revision).then(verses => {
        incomplete = Boolean(verses.missing);
        if (verses.hits.length) publish('verses',`<section><h3>${t('No texto bíblico', 'In the Bible text')}</h3><small>${t('Bíblia Portuguesa Mundial', 'World English Bible')}</small>${verses.hits.map(hit => `<article>${passage(hit.ref)}<p>${esc(hit.line)}</p></article>`).join('')}</section>`);
      }),
      window.PoiemaGraph?.find?.(query).then(entities => {
        if (entities.length) publish('entities',`<section><h3>${t('Pessoas, lugares e acontecimentos', 'People, places, and events')}</h3><div class="guide-links">${entities.slice(0,6).map(item => {
          const label = ({p:t('Pessoa','Person'),l:t('Lugar','Place'),e:t('Acontecimento','Event')})[item.kind];
          return `<button class="guide-passage" data-guide-entity="${esc(item.kind+':'+item.id)}"><span>${esc(item.label)} <small>${label}${item.kind==='l'&&item.note?' · '+esc(item.note):''}</small></span><span aria-hidden="true">↗</span></button>`;
        }).join('')}</div></section>`);
      }),
      indexRequest.then(index => {
        if (!isCurrent() || !index) return;
        idf ??= core.idfOf(index);
        const studies = core.rank(new Map(words.map(word => [word,1])),index,idf,new Set(),6);
        if (studies.length) publish('studies',`<section><h3>${t('Nos estudos', 'In the study guides')}</h3>${studies.map(hit => `<article>${passage([hit.bookId,hit.chapter,hit.from,hit.to])} ${esc(hit.title)}</article>`).join('')}</section>`);
      }),
    ]);
    if (!isCurrent()) return;
    result.querySelector('[role=status]').textContent = incomplete
      ? t('Parte do texto bíblico está indisponível.', 'Some Bible text is unavailable.')
      : hasResults ? '' : t('Nenhum resultado. Tente outra palavra ou referência.', 'No matches. Try another word or reference.');
  }

  async function openBook(id, trigger) {
    const dialog = document.createElement('dialog');
    dialog.className = 'guide-dialog guide-book-panel';
    dialog.setAttribute('aria-labelledby', 'guide-book-title');
    dialog.innerHTML = `<header class="guide-dialog-head"><h2 id="guide-book-title">${esc(book(id)?.name)}</h2><form method="dialog"><button aria-label="${t('Fechar livro', 'Close book')}">×</button></form></header><div class="guide-book-body" aria-live="polite"><p>${t('Carregando o panorama…', 'Loading the overview…')}</p></div>`;
    document.body.append(dialog);
    dialog.addEventListener('close', () => { dialog.remove(); if (trigger?.isConnected) trigger.focus(); }, { once:true });
    dialog.showModal();
    const body = dialog.querySelector('.guide-book-body');
    try {
      const profile = await getJson('/api/book-profile/' + id);
      if (!dialog.open) return;
      const headings = [
        [t('Panorama','Overview'),profile.profile?.summary],
        [t('Época narrada','Time of the narrative'),profile.dossier?.narratedEra],
        [t('Composição e transmissão','Composition and transmission'),profile.dossier?.compositionEra],
      ].filter(([,text]) => text);
      body.innerHTML = headings.map(([label,text]) => `<h3>${label}</h3><p>${esc(text)}</p>`).join('') +
        `<h3>${t('Capítulos', 'Chapters')}</h3><div class="guide-links">${Array.from({length:book(id).chapters},(_,i) => passage([id,i+1],String(i+1))).join('')}</div>${profile.dossierSources?.length ? `<h3>${t('Fontes do dossiê','Dossier sources')}</h3><ul>${profile.dossierSources.filter(source => /^https:\/\//.test(source.url)).map(source => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.title)}</a></li>`).join('')}</ul>` : ''}`;
    } catch {
      body.innerHTML = `<p>${t('Panorama indisponível neste momento.', 'The overview is currently unavailable.')}</p>${passage([id,1])}`;
    }
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-guide-read],[data-guide-book],[data-guide-entity]');
    if (!target) return;
    if (target.dataset.guideEntity) {
      const [kind,id] = target.dataset.guideEntity.split(':');
      searchDialog?.close();
      window.PoiemaGraph.open({kind,id}).catch(() => {});
      return;
    }
    if (target.dataset.guideBook) return openBook(Number(target.dataset.guideBook),target);
    const [bookId,chapter,from,to] = target.dataset.guideRead.split('.').map(Number);
    window.PoiemaReader.open({bookId,chapter,from,to},target);
  });

  document.addEventListener('submit',event => {
    if (!event.target.matches('[data-guide-quick-search]')) return;
    event.preventDefault();
    const input = event.target.elements.query, query = input.value.trim();
    if (!query) return;
    const core = window.PoiemaNotesCore;
    const exact = core.findReferences(query,core.bookAliases([books]),books).find(item => item.raw===query);
    if (exact) window.PoiemaReader.open(exact,input);
    else search(query);
  });

  document.addEventListener('click',event => {
    const button = event.target.closest('[data-guide-testament]');
    if (!button) return;
    const index = button.closest('.guide-library-index');
    index.querySelectorAll('[data-guide-testament]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
    index.querySelector('[data-guide-book-groups]').innerHTML=bookGroups(button.dataset.guideTestament);
  });

  function historyPlan() {
    return {
      key:'historia',
      title:t('A história da Bíblia','The story of the Bible'),
      description:t('Sete dias da criação à nova criação.','Seven days from creation to new creation.'),
      refs:guideEras.map(era => era.read[0].slice(0,2)),
      additional:{[guideEras.length-1]:[{bookId:66,chapter:21}]},
      focuses:guideEras.map(era => title(era.title)),
      prompts:guideEras.map(era => title(era.question)),
    };
  }

  window.PoiemaGuide = {start,explore,search,quickSearch,bibleIndex,topics:topics.map(([id])=>id),savePosition,refreshResume,historyPlan};
})();
