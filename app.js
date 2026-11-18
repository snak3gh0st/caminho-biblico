const STORAGE = 'caminho-biblico-v1';
const STATIC_MODE = document.querySelector('meta[name="static-mode"]')?.content === 'true';
const starterPlans = [
  { key: 'aprofundar', tag: '10 DIAS · ESTUDOS PRONTOS', title: 'Grandes temas da Bíblia', description: 'Dez capítulos com análise, contexto, conexões e perguntas já preparados.', accent: 'sage', refs: [[1,1],[19,23],[41,1],[43,1],[43,3],[43,4],[43,10],[43,11],[43,14],[43,20]], focuses: ['Criação e dignidade','Cuidado no vale','O reino se aproxima','A Palavra entre nós','Vida do alto','Água viva','O bom pastor','Vida diante da morte','Paz e Espírito','Ressurreição e missão'] },
  { key: 'jesus', tag: '7 DIAS · EVANGELHO', title: 'Conheça Jesus', description: 'Sete encontros com Jesus no Evangelho de João.', accent: 'sage', refs: [[43,1],[43,3],[43,4],[43,10],[43,11],[43,14],[43,20]], focuses: ['A Palavra e a luz','Um novo começo','Água viva','O bom pastor','Vida diante da morte','O caminho e a paz','A ressurreição'] },
  { key: 'marcos', tag: '16 DIAS · EVANGELHO', title: 'Marcos, capítulo a capítulo', description: 'Leia a história de Jesus em uma sequência direta.', accent: 'sand', refs: Array.from({length:16}, (_,i) => [41,i+1]), focuses: [] },
  { key: 'salmos', tag: '7 DIAS · POESIA', title: 'Salmos para a jornada', description: 'Palavras para orar, refletir e recomeçar.', accent: 'lavender', refs: [[19,1],[19,23],[19,27],[19,46],[19,91],[19,121],[19,139]], focuses: ['Dois caminhos','Cuidado e confiança','Coragem','Refúgio','Proteção','Socorro','Ser conhecido'] },
];

let books = [];
let prebuiltStudies = {};
let versions = {};
let aiReady = false;
let hosted = false;
let view = 'home';
let activePlanId = null;
let activeDay = 0;
let activeReading = 0;
let chapterData = null;
let comparisonData = null;
let selectedVersion = 'almeida-livre';
let compareVersion = 'nva';
let compareEnabled = false;
let studyTab = 'panorama';
let selectedMovement = 0;
let requestToken = 0;
let busy = '';
let message = '';
let answer = '';
let draftTheme = '';
let draftQuestion = '';
let state;
try { state = JSON.parse(localStorage.getItem(STORAGE)) || { plans: [] }; } catch { state = { plans: [] }; }
if (!Array.isArray(state.plans)) state.plans = [];

const $ = selector => document.querySelector(selector);
const book = id => books.find(item => item.id === Number(id));
const key = reading => `${reading.bookId}:${reading.chapter}`;
const ref = reading => `${book(reading.bookId)?.name || 'Livro'} ${reading.chapter}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function save() { localStorage.setItem(STORAGE, JSON.stringify(state)); }
function plan() { return state.plans.find(item => item.id === activePlanId); }
function totalReadings(item) { return item.days.reduce((sum, day) => sum + day.readings.length, 0); }
function completed(item) { return item.days.reduce((sum, day) => sum + day.readings.filter(reading => item.done.includes(key(reading))).length, 0); }
function percentage(item) { return Math.round((completed(item) / totalReadings(item)) * 100) || 0; }
function nextDay(item) { const index = item.days.findIndex(day => day.readings.some(reading => !item.done.includes(key(reading)))); return index < 0 ? 0 : index; }
function notify(text) { message = text; render(); }

async function getJson(url, options) {
  if (STATIC_MODE) {
    if (options?.method === 'POST') throw new Error('A IA ainda não está disponível nesta publicação.');
    if (url === '/api/status') return { aiReady: false, hosted: true };
    if (url === '/api/books') return { books: await staticFile('books.json') };
    if (url === '/api/studies') return { studies: await staticFile('studies.json') };
    if (url === '/api/versions') return { versions: await staticFile('versions.json') };
    const match = url.match(/^\/api\/chapter\/(\d+)\/(\d+)(?:\?version=([^&]+))?$/);
    if (match) {
      const selected = book(match[1]);
      const chapter = Number(match[2]);
      const version = decodeURIComponent(match[3] || 'almeida-livre');
      if (!selected || !Number.isInteger(chapter) || chapter < 1 || chapter > selected.chapters || !versions[version]) throw new Error('Capítulo ou tradução inválidos.');
      const sourceUrl = `https://api.midvash.com/v1/${version}/${selected.slug}/${chapter}`;
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error('Não foi possível carregar o texto bíblico.');
      const result = await response.json();
      if (!Array.isArray(result.data?.verses)) throw new Error('O capítulo não veio no formato esperado.');
      return { bookId: selected.id, bookName: result.data.bookName || selected.name, chapter, version, versionName: versions[version], verses: result.data.verses, copyright: result.meta?.copyright || '', sourceUrl };
    }
    throw new Error('Recurso indisponível nesta publicação.');
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Não foi possível carregar.');
  return data;
}
async function staticFile(name) {
  const response = await fetch(`./${name}`);
  if (!response.ok) throw new Error('Não foi possível carregar a biblioteca de estudos.');
  return response.json();
}
async function post(url, data) { return getJson(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) }); }

function newPlan(title, description, days, origin) {
  const item = { id: crypto.randomUUID(), title, description, origin, days, done: [], notes: {}, studies: {}, createdAt: new Date().toISOString() };
  state.plans.unshift(item);
  save();
  openPlan(item.id, 0);
}
function openPlan(id, dayIndex) {
  activePlanId = id;
  const item = plan();
  if (!item) return showHome();
  activeDay = Math.min(Math.max(0, dayIndex), item.days.length - 1);
  activeReading = 0;
  answer = '';
  studyTab = 'panorama'; selectedMovement = 0;
  message = '';
  view = 'plan';
  loadChapter();
  window.scrollTo(0, 0);
}
function showHome() { view = 'home'; activePlanId = null; chapterData = null; message = ''; render(); window.scrollTo(0, 0); }
function scrollToReader() {
  requestAnimationFrame(() => {
    const top = $('.reader-panel')?.getBoundingClientRect().top + window.scrollY - 88;
    if (Number.isFinite(top)) window.scrollTo({ top, behavior: 'smooth' });
  });
}
async function loadChapter() {
  const item = plan();
  if (!item) return;
  const reading = item.days[activeDay].readings[activeReading];
  const token = ++requestToken;
  chapterData = null;
  comparisonData = null;
  busy = 'chapter';
  render();
  try {
    const base = `/api/chapter/${reading.bookId}/${reading.chapter}`;
    const data = await getJson(`${base}?version=${encodeURIComponent(selectedVersion)}`);
    const comparison = compareEnabled ? await getJson(`${base}?version=${encodeURIComponent(compareVersion)}`).catch(() => null) : null;
    if (token !== requestToken) return;
    chapterData = data;
    comparisonData = comparison;
    message = compareEnabled && !comparison ? 'A comparação não carregou; o texto principal está disponível.' : '';
  } catch (error) { if (token === requestToken) message = error.message; }
  if (token === requestToken) { busy = ''; render(); }
}

function header() {
  return `<header class="site-header"><div class="header-inner">
    <button class="brand" data-action="home" aria-label="Ir para início"><span class="brand-mark">✦</span><span>Caminho<span class="brand-dot">.</span></span></button>
    <nav aria-label="Navegação principal"><button class="nav-link ${view === 'home' ? 'selected' : ''}" data-action="home">Início</button><button class="nav-link ${view === 'plan' ? 'selected' : ''}" data-action="go-plan">Meu estudo</button></nav>
    <span class="status-pill"><span class="status-light ${aiReady ? 'ready' : ''}"></span>IA ${aiReady ? 'disponível' : 'a configurar'}</span>
  </div></header>`;
}

function home() {
  const current = state.plans[0];
  return `<main class="home-wrap">
    <section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star">✳</span> SEU ESPAÇO DE ESTUDO</span>
      <h1>Leia com calma.<br><em>Entenda com profundidade.</em></h1>
      <p>Planos de leitura, estudos prontos, mapas, comentários clássicos e diferentes traduções para investigar cada capítulo com profundidade.</p>
      <div class="hero-actions"><a href="#planos" class="button button-dark">Escolher um plano <span aria-hidden="true">↗</span></a><a href="#criar" class="text-link">Criar o meu próprio <span aria-hidden="true">→</span></a></div>
    </div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="art-cross">✦</span><span class="art-quote">“Tua palavra é lâmpada<br>para meus pés e luz<br>para meu caminho.”</span><span class="art-cite">SALMO 119:105 · BÍBLIA LIVRE</span></div></section>
    ${current ? `<section class="continue-card"><div><span class="eyebrow">CONTINUE DE ONDE PAROU</span><h2>${esc(current.title)}</h2><p>${completed(current)} de ${totalReadings(current)} capítulos lidos</p><div class="progress-track"><span style="width:${percentage(current)}%"></span></div></div><button class="button button-light" data-action="open-plan" data-id="${esc(current.id)}">Continuar leitura <span aria-hidden="true">→</span></button></section>` : ''}
    <section class="section" id="planos"><div class="section-heading"><div><span class="eyebrow">UM BOM COMEÇO</span><h2>Planos para começar hoje</h2></div><p>Escolha uma jornada pronta. Cada capítulo terá seu próprio espaço de leitura e estudo.</p></div>
      <div class="starter-grid">${starterPlans.map((item,index) => `<article class="starter-card ${item.accent}"><div class="card-top"><span>${esc(item.tag)}</span><span class="card-number">0${index+1}</span></div><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div><button class="card-action" data-action="start-starter" data-key="${item.key}" aria-label="Começar plano ${esc(item.title)}">Começar plano <span aria-hidden="true">↗</span></button></article>`).join('')}</div>
    </section>
    ${state.plans.length ? `<section class="section my-plans"><div class="section-heading"><div><span class="eyebrow">SUAS JORNADAS</span><h2>Meus planos</h2></div></div><div class="plan-list">${state.plans.map(item => `<button class="plan-row" data-action="open-plan" data-id="${esc(item.id)}"><span class="plan-row-icon">✦</span><span class="plan-row-main"><strong>${esc(item.title)}</strong><small>${item.days.length} dias · ${completed(item)} de ${totalReadings(item)} capítulos</small></span><span class="plan-row-progress">${percentage(item)}%</span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : ''}
    <section class="section creation" id="criar"><div class="section-heading"><div><span class="eyebrow">DO SEU JEITO</span><h2>Monte uma nova jornada</h2></div><p>Leia um livro completo no seu ritmo ou peça uma seleção de capítulos sobre um tema.</p></div>
      <div class="creation-grid"><form id="book-plan" class="creation-card"><div class="creation-icon">▤</div><h3>Um livro, no seu ritmo</h3><p>Escolha um livro e quantos capítulos quer ler por dia.</p><label for="book-select">Livro da Bíblia</label><select id="book-select" name="bookId">${books.map(item => `<option value="${item.id}" ${item.id===43?'selected':''}>${esc(item.name)} · ${item.chapters} cap.</option>`).join('')}</select><label for="pace-select">Ritmo</label><select id="pace-select" name="pace"><option value="1">1 capítulo por dia</option><option value="2">2 capítulos por dia</option><option value="3">3 capítulos por dia</option></select><button class="button button-dark full" type="submit">Criar plano <span aria-hidden="true">→</span></button></form>
      <form id="ai-plan" class="creation-card"><div class="creation-icon">✳</div><h3>Um tema, com ajuda da IA</h3><p>Peça uma trilha curta sobre o assunto que quer estudar.</p><label for="theme-input">O que quer entender melhor?</label><input id="theme-input" name="theme" placeholder="Ex.: fé em tempos difíceis" maxlength="160" value="${esc(draftTheme)}" required><label for="days-select">Duração</label><select id="days-select" name="days"><option value="5">5 dias</option><option value="7" selected>7 dias</option><option value="10">10 dias</option><option value="14">14 dias</option></select><button class="button button-outline full" type="submit" ${busy==='plan'||!aiReady?'disabled':''}>${busy==='plan'?'Preparando plano…':'Criar com IA'} <span aria-hidden="true">✦</span></button><small class="form-note">${aiReady?'A IA escolhe um capítulo por dia. Você pode revisar a sequência.':hosted?'A IA ainda não foi ativada neste site.':'Para usar a IA, configure OPENAI_API_KEY no arquivo .env.'}</small></form></div>
    </section>
  </main>`;
}

const mapPoints = {
  'Galileia': [52, 13], 'Caná': [43, 20], 'Cafarnaum': [66, 18],
  'Samaria': [43, 42], 'Sicar': [48, 49], 'Gerizim': [39, 52],
  'Judeia': [52, 72], 'Jerusalém': [55, 78], 'Betânia': [68, 80],
  'Efraim': [40, 65], 'Jordão': [70, 49],
};
function studyMap(study) {
  if (!study.places.length) return `<div class="map-empty">Este capítulo não descreve uma rota geográfica. Explore a estrutura literária na aba “Panorama”.</div>`;
  return `<div class="map-board" role="img" aria-label="Mapa esquemático com ${esc(study.places.join(', '))}"><div class="map-water">MAR DA GALILEIA</div><div class="map-river"></div><div class="map-region region-north">GALILEIA</div><div class="map-region region-middle">SAMARIA</div><div class="map-region region-south">JUDEIA</div>${study.places.map(place => { const point = mapPoints[place]; return point ? `<span class="map-pin" style="left:${point[0]}%;top:${point[1]}%"><i></i>${esc(place)}</span>` : ''; }).join('')}</div>`;
}
function studyRoom(reading) {
  const guide = prebuiltStudies[key(reading)];
  if (!guide) return '';
  const tabs = [['panorama','Panorama'],['contexto','História e mapa'],['analise','Análise bíblica'],['vozes','Comentários'],['pratica','Reflexão']];
  let content = '';
  if (studyTab === 'panorama') content = `<div class="deep-two"><div><span class="eyebrow">IDEIA CENTRAL</span><p class="thesis">${esc(guide.thesis)}</p><div class="movement-list">${guide.movements.map((part,index) => `<button class="movement ${index===selectedMovement?'active':''}" data-action="movement" data-index="${index}"><span>0${index+1}</span><strong>${esc(part.label)}</strong><small>v. ${part.from}–${part.to}</small></button>`).join('')}</div></div><div class="movement-detail"><span class="eyebrow">ACOMPANHE O TEXTO</span><h3>${esc(guide.movements[selectedMovement]?.label || guide.movements[0].label)}</h3><p>${esc(guide.movements[selectedMovement]?.detail || guide.movements[0].detail)}</p><button class="text-link" data-action="focus-verse" data-verse="${guide.movements[selectedMovement]?.from || 1}">Ir ao versículo ${guide.movements[selectedMovement]?.from || 1} →</button></div></div>`;
  if (studyTab === 'contexto') content = `<div class="deep-two"><div><span class="eyebrow">CONTEXTO HISTÓRICO E LITERÁRIO</span><p class="deep-prose">${esc(guide.context)}</p><div class="source-note">Os locais e datas não especificados no capítulo são tratados com cautela. Este mapa é esquemático e não está em escala.</div></div><div><span class="eyebrow">GEOGRAFIA DO CAPÍTULO</span>${studyMap(guide)}<p class="map-caption">${esc(guide.mapNote)}</p></div></div>`;
  if (studyTab === 'analise') content = `<div class="deep-two"><div><span class="eyebrow">ANÁLISE BÍBLICA</span><p class="deep-prose">${esc(guide.theology)}</p><h3 class="deep-subhead">Conexões nas Escrituras</h3><div class="crossrefs">${guide.crossRefs.map(reference => `<span>${esc(reference)}</span>`).join('')}</div></div><div><span class="eyebrow">TRÊS ÂNGULOS DE LEITURA</span><div class="lens-list">${guide.lenses.map((lens,index) => `<div><b>0${index+1}</b><p>${esc(lens)}</p></div>`).join('')}</div></div></div>`;
  if (studyTab === 'vozes') content = `<div><span class="eyebrow">LEITURAS PROTESTANTES CLÁSSICAS</span><p class="deep-prose">Estas sínteses originais apresentam ênfases de dois comentaristas históricos. Leia as notas completas nas fontes para avaliar o argumento de cada um.</p><div class="voice-grid">${guide.voices.map(voice => `<article class="voice-card"><span>COMENTÁRIO CLÁSSICO</span><h3>${esc(voice.author)}</h3><p>${esc(voice.summary)}</p><a href="https://bible.helloao.org/api/c/${esc(voice.slug)}/${esc(book(reading.bookId)?.commentaryId)}/${reading.chapter}.simple.json" target="_blank" rel="noopener noreferrer">Ler comentário original (inglês) ↗</a></article>`).join('')}</div><div class="source-note">Os comentários apoiam a investigação. Compare cada interpretação com o capítulo e observe onde o texto permite mais de uma leitura.</div></div>`;
  if (studyTab === 'pratica') content = `<div class="deep-two"><div><span class="eyebrow">PERGUNTAS PARA ESTUDAR</span><ol class="deep-questions">${guide.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><div class="practice-card"><span class="eyebrow">COLOQUE EM PRÁTICA</span><p>${esc(guide.practice)}</p><button class="button button-light" data-action="focus-notes">Escrever nas minhas anotações →</button></div></div>`;
  return `<section class="deep-study" id="estudo-completo" aria-label="Estudo pronto de ${esc(ref(reading))}"><div class="deep-head"><div><span class="eyebrow">ESTUDO PRONTO · ${esc(ref(reading).toUpperCase())}</span><h2>${esc(guide.title)}</h2><p>Uma leitura original com o texto bíblico no centro, contexto e caminhos para aprofundar.</p><button class="text-link" data-action="back-to-reading">← Voltar ao capítulo</button></div><span class="deep-theme">${esc(guide.theme)}</span></div><div class="deep-tabs" role="group" aria-label="Seções do estudo">${tabs.map(([id,label]) => `<button class="deep-tab ${studyTab===id?'active':''}" data-action="study-tab" data-tab="${id}" aria-pressed="${studyTab===id}">${label}</button>`).join('')}</div><div class="deep-body">${content}</div><div class="deep-resources"><strong>Continue estudando</strong><span>Estudo original deste app, baseado nas passagens indicadas. Guias externos para ampliar a leitura:</span>${guide.resources.map(resource => `<a href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ↗</a>`).join('')}</div></section>`;
}

function planView() {
  const item = plan();
  if (!item) return home();
  const day = item.days[activeDay];
  const reading = day.readings[activeReading];
  const currentKey = key(reading);
  const study = item.studies[currentKey];
  const guide = prebuiltStudies[currentKey];
  const isDone = item.done.includes(currentKey);
  return `<main class="workspace-wrap"><button class="back-link" data-action="home"><span aria-hidden="true">←</span> Todos os planos</button>
    <section class="workspace-head"><div><span class="eyebrow">SEU PLANO DE LEITURA · ${item.days.length} DIAS</span><h1>${esc(item.title)}</h1><p>${esc(item.description)}</p></div><div class="head-progress"><strong>${percentage(item)}<span>%</span></strong><span>do plano concluído</span><div class="progress-track"><span style="width:${percentage(item)}%"></span></div></div></section>
    <div class="workspace-grid"><aside class="days-panel" aria-label="Dias do plano"><div class="panel-heading"><span>SEU CAMINHO</span><strong>${completed(item)} / ${totalReadings(item)}</strong></div><div class="day-list">${item.days.map((entry,index) => { const done = entry.readings.every(r => item.done.includes(key(r))); return `<button class="day-item ${index===activeDay?'active':''}" data-action="open-day" data-index="${index}"><span class="day-icon">${done?'✓':String(index+1).padStart(2,'0')}</span><span><strong>Dia ${index+1}</strong><small>${esc(entry.readings.map(ref).join(' + '))}</small></span><span class="day-chevron">›</span></button>`; }).join('')}</div><div class="days-tip">✳ <span>Um capítulo de cada vez. Seu progresso fica salvo neste navegador.</span></div></aside>
    <section class="reader-panel" aria-label="Leitura bíblica"><div class="reader-top"><div><span class="eyebrow">DIA ${String(activeDay+1).padStart(2,'0')} · LEITURA</span><h2>${esc(ref(reading))}</h2><p>${esc(day.focus || 'Leia, observe e reflita.')}</p></div><button class="bookmark-button ${isDone?'bookmarked':''}" data-action="toggle-done" title="${isDone?'Marcar como não lido':'Marcar como lido'}" aria-label="${isDone?'Marcar como não lido':'Marcar como lido'}">${isDone?'✓':'○'}</button></div>
      ${guide ? `<button class="reader-study-shortcut" data-action="open-deep-study">✳ Estudo completo já preparado <span>Explorar →</span></button>` : ''}
      ${day.readings.length > 1 ? `<div class="chapter-tabs" role="group" aria-label="Capítulos deste dia">${day.readings.map((r,index) => `<button class="chapter-tab ${index===activeReading?'active':''}" data-action="open-reading" data-index="${index}">${esc(ref(r))}</button>`).join('')}</div>` : ''}
      <div class="translation-tools"><label>Tradução <select id="version-select" aria-label="Tradução bíblica">${Object.entries(versions).map(([id,name]) => `<option value="${id}" ${selectedVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label><label class="compare-toggle"><input id="compare-toggle" type="checkbox" ${compareEnabled?'checked':''}> Comparar</label>${compareEnabled ? `<select id="compare-select" aria-label="Tradução para comparar">${Object.entries(versions).filter(([id]) => id!==selectedVersion).map(([id,name]) => `<option value="${id}" ${compareVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select>` : ''}</div>
      <div class="reader-rule"></div><div class="scripture ${comparisonData?'scripture-compare':''}">${busy==='chapter'?'<p class="muted">Carregando o capítulo…</p>':chapterData ? `${comparisonData ? `<div class="compare-head"><strong>${esc(chapterData.versionName)}</strong><strong>${esc(comparisonData.versionName)}</strong></div>` : ''}${chapterData.verses.map((verse,index) => `<div class="verse-row ${comparisonData?'paired':''}" id="v${index+1}"><p class="verse"><sup>${index+1}</sup>${esc(verse)}</p>${comparisonData ? `<p class="verse"><sup>${index+1}</sup>${esc(comparisonData.verses[index] || '')}</p>` : ''}</div>`).join('')}` : '<p class="muted">Não foi possível carregar o texto. <button class="inline-button" data-action="retry-chapter">Tentar novamente</button></p>'}</div>
      ${chapterData ? `<div class="translation-credit"><strong>${esc(chapterData.versionName)}</strong><br>${esc(chapterData.copyright)}<br><a href="${esc(chapterData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte do capítulo ↗</a>${comparisonData ? `<br><br><strong>${esc(comparisonData.versionName)}</strong><br>${esc(comparisonData.copyright)}<br><a href="${esc(comparisonData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte da comparação ↗</a>` : ''}</div><div class="translation-more">Quer consultar <em>A Mensagem</em>? <a href="https://www.editoravida.com.br/a-mensagem-capa-luxo-laranja-e-verde.html" target="_blank" rel="noopener noreferrer">Conheça a edição oficial ↗</a> <small>Obra com direitos reservados; o texto integral não é reproduzido aqui.</small></div>` : ''}
      <div class="reading-actions"><button class="button ${isDone?'button-outline':'button-dark'}" data-action="toggle-done">${isDone?'✓ Leitura concluída':'Marcar como lido'} <span aria-hidden="true">${isDone?'':'→'}</span></button><button class="text-link" data-action="next-day">Próximo dia <span aria-hidden="true">→</span></button></div>
    </section>
    <aside class="study-panel" aria-label="Estudo do capítulo"><div class="study-header"><div class="study-symbol">✳</div><div><span class="eyebrow">COMPANHEIRO DE ESTUDO</span><h2>Vá mais fundo</h2></div></div>
      <p class="study-intro">Estudo evangélico protestante, com o texto bíblico no centro e fontes identificadas. Os guias prontos funcionam mesmo sem IA.</p>
      ${guide ? `<div class="guide-teaser"><span class="eyebrow">JÁ PREPARADO PARA VOCÊ</span><h3>${esc(guide.title)}</h3><p>${esc(guide.thesis)}</p><button class="button button-dark full" data-action="open-deep-study">Abrir estudo completo ↗</button></div>` : ''}
      ${study ? studyHtml(study, item.studies[currentKey+'-sources']) : `<div class="study-empty"><span>✦</span><h3>Análise adicional com IA</h3><p>Peça uma leitura sobre estrutura, cenário, teologia e aplicação deste capítulo.</p><button class="button button-dark full" data-action="generate-study" ${busy==='study'||!chapterData||!aiReady?'disabled':''}>${busy==='study'?'Preparando estudo…':'Gerar análise com IA'} <span aria-hidden="true">↗</span></button>${!aiReady?`<small>${hosted?'A IA ainda não foi ativada neste site.':'Configure a chave da IA no arquivo .env para gerar a análise.'}</small>`:''}</div>`}
      <div class="study-question"><h3>Uma pergunta sua</h3><p>O que ficou difícil ou despertou curiosidade?</p><form id="question-form"><textarea name="question" rows="3" maxlength="800" placeholder="Ex.: O que significa esta imagem no capítulo?" required>${esc(draftQuestion)}</textarea><button class="button button-outline full" type="submit" ${busy==='question'||!chapterData||!aiReady?'disabled':''}>${busy==='question'?'Pensando…':'Perguntar sobre o capítulo'} <span aria-hidden="true">→</span></button></form>${answer?`<div class="answer"><span class="eyebrow">RESPOSTA DA IA</span><p>${esc(answer)}</p></div>`:''}</div>
      <div class="notes-block"><h3>Minhas anotações</h3><p>O que você quer lembrar desta leitura?</p><textarea id="notes" rows="5" placeholder="Escreva livremente…">${esc(item.notes[currentKey] || '')}</textarea><small>Salvo automaticamente neste navegador</small></div>
    </aside></div>${studyRoom(reading)}
  </main>`;
}

function studyHtml(study, sources) {
  const sections = [
    ['Em poucas palavras', study.overview], ['Como o capítulo se move', study.structure],
    ['Contexto histórico', study.history], ['Lugares e geografia', study.geography],
    ['Ideias bíblicas', study.theology], ['Leitura pastoral', study.pastoral],
  ];
  return `<div class="study-content">${sections.map(([title,body]) => `<div class="study-section"><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`).join('')}
    ${study.keyVerses?.length?`<div class="study-section"><h3>Volte aos versículos</h3><div class="verse-links">${study.keyVerses.map(n => `<a href="#v${n}">${n}</a>`).join('')}</div></div>`:''}
    <div class="study-section"><h3>Para refletir</h3><ol>${(study.questions||[]).map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>
    <div class="study-section"><h3>Para levar com você</h3><p>${esc(study.practice)}</p></div>
    ${study.uncertainty?`<div class="study-caution">${esc(study.uncertainty)}</div>`:''}
    <div class="study-sources"><strong>Fontes desta análise</strong><a href="${esc(sources?.bible||'#')}" target="_blank" rel="noopener noreferrer">Bíblia Livre (Almeida 1819) ↗</a>${(sources?.commentaries||[]).map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.author)}, ${esc(source.title)} ↗</a>`).join('')}<small>A IA pode interpretar de forma imprecisa. Confira as fontes e os versículos.</small></div>
    <button class="inline-button" data-action="regenerate-study">Gerar outra análise ↻</button>
  </div>`;
}

function footer() { return `<footer class="site-footer"><span>✦ Caminho · leitura com intenção</span><span>Traduções abertas com créditos junto ao texto · <a href="https://api.midvash.com" target="_blank" rel="noopener noreferrer">Midvash API</a></span></footer>`; }
function render() {
  $('#app').innerHTML = header() + (message ? `<div class="notice" role="alert">${esc(message)} <button data-action="dismiss" aria-label="Fechar aviso">×</button></div>` : '') + (view === 'plan' ? planView() : home()) + footer();
}

document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  if (action === 'home') return showHome();
  if (action === 'dismiss') { message = ''; return render(); }
  if (action === 'go-plan') { const item = plan() || state.plans[0]; return item ? openPlan(item.id, nextDay(item)) : showHome(); }
  if (action === 'open-plan') { const item = state.plans.find(p => p.id===target.dataset.id); return item && openPlan(item.id, nextDay(item)); }
  if (action === 'start-starter') {
    const template = starterPlans.find(item => item.key === target.dataset.key);
    if (!template) return;
    const days = template.refs.map(([bookId,chapter],index) => ({ focus: template.focuses[index] || `Capítulo ${chapter}`, readings: [{bookId,chapter}] }));
    return newPlan(template.title, template.description, days, 'curated');
  }
  if (action === 'open-day') { activeDay = Number(target.dataset.index); activeReading = 0; answer = ''; draftQuestion = ''; studyTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-reading') { activeReading = Number(target.dataset.index); answer = ''; draftQuestion = ''; studyTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-deep-study') return $('#estudo-completo')?.scrollIntoView({ behavior:'instant', block:'start' });
  if (action === 'study-tab') { studyTab = target.dataset.tab; render(); return $('#estudo-completo')?.scrollIntoView({ behavior:'instant', block:'start' }); }
  if (action === 'back-to-reading') return $('.reader-panel')?.scrollIntoView({ behavior:'instant', block:'start' });
  if (action === 'movement') { selectedMovement = Number(target.dataset.index); return render(); }
  if (action === 'focus-verse') return $(`#v${Number(target.dataset.verse)}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  if (action === 'focus-notes') { $('#notes')?.scrollIntoView({ behavior:'smooth', block:'center' }); return $('#notes')?.focus(); }
  if (action === 'retry-chapter') return loadChapter();
  if (action === 'next-day') { const item = plan(); if (activeDay < item.days.length - 1) { activeDay++; activeReading = 0; answer = ''; draftQuestion = ''; studyTab = 'panorama'; selectedMovement = 0; loadChapter(); scrollToReader(); } return; }
  if (action === 'toggle-done') {
    const item = plan(); const reading = item.days[activeDay].readings[activeReading]; const value = key(reading);
    item.done = item.done.includes(value) ? item.done.filter(x => x !== value) : [...item.done, value];
    save(); return render();
  }
  if (action === 'generate-study' || action === 'regenerate-study') {
    const item = plan(); const reading = item.days[activeDay].readings[activeReading]; const value = key(reading);
    busy = 'study'; message = ''; render();
    try { const result = await post('/api/study', reading); item.studies[value] = result.study; item.studies[value+'-sources'] = result.sources; save(); }
    catch(error) { message = error.message; }
    busy = ''; return render();
  }
});

document.addEventListener('submit', async event => {
  const form = event.target;
  if (!['book-plan','ai-plan','question-form'].includes(form.id)) return;
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (form.id === 'book-plan') {
    const selected = book(data.bookId); const pace = Number(data.pace);
    if (!selected || ![1,2,3].includes(pace)) return;
    const days = [];
    for (let chapter=1;chapter<=selected.chapters;chapter+=pace) {
      days.push({focus:`${selected.name} ${chapter}${pace>1&&chapter<selected.chapters?`–${Math.min(chapter+pace-1,selected.chapters)}`:''}`,readings:Array.from({length:Math.min(pace,selected.chapters-chapter+1)},(_,i)=>({bookId:selected.id,chapter:chapter+i}))});
    }
    return newPlan(`Lendo ${selected.name}`, `Uma jornada por todos os ${selected.chapters} capítulos de ${selected.name}, no seu ritmo.`, days, 'book');
  }
  if (form.id === 'ai-plan') {
    draftTheme = data.theme;
    busy = 'plan'; message = ''; render();
    try {
      const result = await post('/api/plan', {theme:data.theme,days:Number(data.days)});
      const days = result.plan.days.map(entry => ({ focus:entry.focus, readings:[{bookId:entry.bookId,chapter:entry.chapter}] }));
      busy = ''; draftTheme = '';
      return newPlan(result.plan.title, result.plan.description, days, 'ai');
    } catch(error) { busy = ''; return notify(error.message); }
  }
  if (form.id === 'question-form') {
    const reading = plan().days[activeDay].readings[activeReading];
    draftQuestion = data.question;
    busy = 'question'; message = ''; render();
    try { const result = await post('/api/question', {...reading,question:data.question}); answer = result.answer; draftQuestion = ''; }
    catch(error) { message = error.message; }
    busy = ''; return render();
  }
});

document.addEventListener('input', event => {
  if (event.target.id === 'theme-input') { draftTheme = event.target.value; return; }
  if (event.target.name === 'question') { draftQuestion = event.target.value; return; }
  if (event.target.id !== 'notes') return;
  const item = plan(); const reading = item.days[activeDay].readings[activeReading];
  item.notes[key(reading)] = event.target.value;
  save();
});

document.addEventListener('change', event => {
  if (event.target.id === 'version-select') { selectedVersion = event.target.value; if (selectedVersion === compareVersion) compareVersion = Object.keys(versions).find(id => id !== selectedVersion); return loadChapter(); }
  if (event.target.id === 'compare-toggle') { compareEnabled = event.target.checked; if (selectedVersion === compareVersion) compareVersion = Object.keys(versions).find(id => id !== selectedVersion); return loadChapter(); }
  if (event.target.id === 'compare-select') { compareVersion = event.target.value; return loadChapter(); }
});

async function init() {
  try {
    const [catalog,status,library,translations] = await Promise.all([getJson('/api/books'),getJson('/api/status'),getJson('/api/studies'),getJson('/api/versions')]);
    books = catalog.books; aiReady = status.aiReady; hosted = Boolean(status.hosted); prebuiltStudies = library.studies; versions = translations.versions;
    render();
  } catch(error) { $('#app').innerHTML = `<p class="loading">${esc(error.message)} Recarregue a página.</p>`; }
}
init();
