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
let bookGuides = {};
let passageImages = {};
let libraryData = null;
let bookProfileData = null;
let libraryTab = 'panorama';
let connection = null;
let connectionTrigger = null;
let chapterMap = null;
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
    if (url === '/api/book-guides') return { guides: await staticFile('book-guides.json') };
    const libraryMatch = url.match(/^\/api\/library\/(\d+)\/(\d+)$/);
    if (libraryMatch) return staticFile(`library/${libraryMatch[1]}/${libraryMatch[2]}.json`);
    const profileMatch = url.match(/^\/api\/book-profile\/(\d+)$/);
    if (profileMatch) return staticFile(`library/${profileMatch[1]}/book.json`);
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
  libraryTab = 'panorama'; connection = null;
  message = '';
  view = 'plan';
  loadChapter();
  window.scrollTo(0, 0);
}
function showHome() { stopLocalNarration(); requestToken++; view = 'home'; activePlanId = null; chapterData = null; comparisonData = null; libraryData = null; bookProfileData = null; connection = null; busy = ''; message = ''; render(); window.scrollTo(0, 0); }
function scrollToReader() {
  requestAnimationFrame(() => {
    const top = $('.reader-panel')?.getBoundingClientRect().top + window.scrollY - 88;
    if (Number.isFinite(top)) window.scrollTo({ top, behavior: 'smooth' });
  });
}
async function loadChapter() {
  stopLocalNarration();
  const item = plan();
  if (!item) return;
  const reading = item.days[activeDay].readings[activeReading];
  const token = ++requestToken;
  chapterData = null;
  comparisonData = null;
  libraryData = null;
  bookProfileData = null;
  connection = null;
  visualPart = 0;
  connectionVerse = null;
  busy = 'chapter';
  render();
  const base = `/api/chapter/${reading.bookId}/${reading.chapter}`;
  const results = await Promise.allSettled([
    getJson(`${base}?version=${encodeURIComponent(selectedVersion)}`),
    compareEnabled ? getJson(`${base}?version=${encodeURIComponent(compareVersion)}`) : Promise.resolve(null),
    getJson(`/api/library/${reading.bookId}/${reading.chapter}`),
    getJson(`/api/book-profile/${reading.bookId}`),
  ]);
  if (token !== requestToken) return;
  [chapterData, comparisonData, libraryData, bookProfileData] = results.map(result => result.status === 'fulfilled' ? result.value : null);
  message = results[0].status === 'rejected'
    ? `${results[0].reason.message}${libraryData ? ' O estudo preparado continua disponível abaixo.' : ''}`
    : compareEnabled && !comparisonData ? 'A comparação não carregou; o texto principal está disponível.' : '';
  if (token === requestToken) { busy = ''; render(); }
}

function header() {
  return `<header class="site-header"><div class="header-inner">
    <button class="brand" data-action="home" aria-label="Ir para início"><span class="brand-mark">✦</span><span>Caminho<span class="brand-dot">.</span></span></button>
    <nav aria-label="Navegação principal"><button class="nav-link ${view === 'home' ? 'selected' : ''}" data-action="home">Início</button><button class="nav-link ${view === 'plan' ? 'selected' : ''}" data-action="go-plan">Meu estudo</button></nav>
    <span class="status-pill"><span class="status-light ${aiReady || STATIC_MODE ? 'ready' : ''}"></span>${STATIC_MODE ? 'Estudos com IA prontos' : `IA ${aiReady ? 'disponível' : 'a configurar'}`}</span>
  </div></header>`;
}

function home() {
  const current = state.plans[0];
  return `<main class="home-wrap">
    <section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star">✳</span> SEU ESPAÇO DE ESTUDO</span>
      <h1>Leia com calma.<br><em>Entenda com profundidade.</em></h1>
      <p>Planos de leitura, estudos prontos, mapas, comentários clássicos e diferentes traduções para investigar cada capítulo com profundidade.</p>
      <div class="hero-actions"><a href="#planos" class="button button-dark">Escolher um plano <span aria-hidden="true">↗</span></a><a href="#criar" class="text-link">Criar o meu próprio <span aria-hidden="true">→</span></a></div>
    </div><div class="hero-art hero-raster"><img src="./scenes/creation.jpg" alt="Paisagem artística gerada por IA, com luz sobre o mar e a vegetação" width="1440" height="810"><div class="hero-art-copy"><span class="art-quote">“Tua palavra é lâmpada<br>para meus pés e luz<br>para meu caminho.”</span><span class="art-cite">SALMO 119:105 · BÍBLIA LIVRE</span><small>Ilustração gerada por IA</small></div></div></section>
    ${current ? `<section class="continue-card"><div><span class="eyebrow">CONTINUE DE ONDE PAROU</span><h2>${esc(current.title)}</h2><p>${completed(current)} de ${totalReadings(current)} capítulos lidos</p><div class="progress-track"><span style="width:${percentage(current)}%"></span></div></div><button class="button button-light" data-action="open-plan" data-id="${esc(current.id)}">Continuar leitura <span aria-hidden="true">→</span></button></section>` : ''}
    <section class="section" id="planos"><div class="section-heading"><div><span class="eyebrow">UM BOM COMEÇO</span><h2>Planos para começar hoje</h2></div><p>Escolha uma jornada pronta. Cada capítulo terá seu próprio espaço de leitura e estudo.</p></div>
      <div class="starter-grid">${starterPlans.map((item,index) => `<article class="starter-card ${item.accent}"><div class="card-top"><span>${esc(item.tag)}</span><span class="card-number">0${index+1}</span></div><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div><button class="card-action" data-action="start-starter" data-key="${item.key}" aria-label="Começar plano ${esc(item.title)}">Começar plano <span aria-hidden="true">↗</span></button></article>`).join('')}</div>
    </section>
    ${state.plans.length ? `<section class="section my-plans"><div class="section-heading"><div><span class="eyebrow">SUAS JORNADAS</span><h2>Meus planos</h2></div></div><div class="plan-list">${state.plans.map(item => `<button class="plan-row" data-action="open-plan" data-id="${esc(item.id)}"><span class="plan-row-icon">✦</span><span class="plan-row-main"><strong>${esc(item.title)}</strong><small>${item.days.length} dias · ${completed(item)} de ${totalReadings(item)} capítulos</small></span><span class="plan-row-progress">${percentage(item)}%</span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : ''}
    <section class="section creation" id="criar"><div class="section-heading"><div><span class="eyebrow">DO SEU JEITO</span><h2>Monte uma nova jornada</h2></div><p>Leia um livro completo no seu ritmo ou peça uma seleção de capítulos sobre um tema.</p></div>
      <div class="creation-grid"><form id="book-plan" class="creation-card"><div class="creation-icon">▤</div><h3>Um livro, no seu ritmo</h3><p>Escolha um livro e quantos capítulos quer ler por dia.</p><label for="book-select">Livro da Bíblia</label><select id="book-select" name="bookId">${books.map(item => `<option value="${item.id}" ${item.id===43?'selected':''}>${esc(item.name)} · ${item.chapters} cap.</option>`).join('')}</select><label for="pace-select">Ritmo</label><select id="pace-select" name="pace"><option value="1">1 capítulo por dia</option><option value="2">2 capítulos por dia</option><option value="3">3 capítulos por dia</option></select><button class="button button-dark full" type="submit">Criar plano <span aria-hidden="true">→</span></button></form>
      <form id="ai-plan" class="creation-card"><div class="creation-icon">✳</div><h3>Um tema, com ajuda da IA</h3><p>Peça uma trilha curta sobre o assunto que quer estudar.</p><label for="theme-input">O que quer entender melhor?</label><input id="theme-input" name="theme" placeholder="Ex.: fé em tempos difíceis" maxlength="160" value="${esc(draftTheme)}" required><label for="days-select">Duração</label><select id="days-select" name="days"><option value="5">5 dias</option><option value="7" selected>7 dias</option><option value="10">10 dias</option><option value="14">14 dias</option></select><button class="button button-outline full" type="submit" ${busy==='plan'||!aiReady?'disabled':''}>${busy==='plan'?'Preparando plano…':'Criar com IA'} <span aria-hidden="true">✦</span></button><small class="form-note">${aiReady?'A IA escolhe um capítulo por dia. Você pode revisar a sequência.':hosted?'Novas gerações estão desativadas. A biblioteca preparada continua disponível.':'Novas gerações estão desativadas. A biblioteca preparada continua disponível.'}</small></form></div>
    </section>
  </main>`;
}

const mapPoints = {
  'Galileia': [52, 13], 'Caná': [43, 20], 'Cafarnaum': [66, 18],
  'Samaria': [43, 42], 'Sicar': [48, 49], 'Gerizim': [39, 52],
  'Judeia': [52, 72], 'Jerusalém': [55, 78], 'Betânia': [68, 80],
  'Efraim': [40, 65], 'Jordão': [70, 49],
};
function studyMap(study, reading) {
  return sceneHtml(passageScene(reading, { title: study.title || '', explanation: study.context || '', from: 1 }));
}

function studyRoom(reading) {
  const guide = prebuiltStudies[key(reading)];
  if (!guide) return '';
  const tabs = [['panorama','Panorama'],['contexto','História e mapa'],['analise','Análise bíblica'],['vozes','Comentários'],['pratica','Reflexão']];
  let content = '';
  if (studyTab === 'panorama') content = `<div class="deep-two"><div><span class="eyebrow">IDEIA CENTRAL</span><p class="thesis">${esc(guide.thesis)}</p><div class="movement-list">${guide.movements.map((part,index) => `<button class="movement ${index===selectedMovement?'active':''}" data-action="movement" data-index="${index}"><span>0${index+1}</span><strong>${esc(part.label)}</strong><small>v. ${part.from}–${part.to}</small></button>`).join('')}</div></div><div class="movement-detail"><span class="eyebrow">ACOMPANHE O TEXTO</span><h3>${esc(guide.movements[selectedMovement]?.label || guide.movements[0].label)}</h3><p>${esc(guide.movements[selectedMovement]?.detail || guide.movements[0].detail)}</p><button class="text-link" data-action="focus-verse" data-verse="${guide.movements[selectedMovement]?.from || 1}">Ir ao versículo ${guide.movements[selectedMovement]?.from || 1} →</button></div></div>`;
  if (studyTab === 'contexto') content = `<div class="deep-two"><div><span class="eyebrow">CONTEXTO HISTÓRICO E LITERÁRIO</span><p class="deep-prose">${esc(guide.context)}</p><div class="source-note">Os locais e datas não especificados no capítulo são tratados com cautela. A imagem é uma ambientação artística; consulte o mapa interativo para explorar coordenadas.</div></div><div><span class="eyebrow">AMBIENTAÇÃO VISUAL</span>${studyMap(guide, reading)}<p class="map-caption">Ilustração temática gerada por IA. Os lugares com coordenadas estão no mapa interativo da biblioteca.</p></div></div>`;
  if (studyTab === 'analise') content = `<div class="deep-two"><div><span class="eyebrow">ANÁLISE BÍBLICA</span><p class="deep-prose">${esc(guide.theology)}</p><h3 class="deep-subhead">Conexões nas Escrituras</h3><div class="crossrefs">${guide.crossRefs.map(reference => `<span>${esc(reference)}</span>`).join('')}</div></div><div><span class="eyebrow">TRÊS ÂNGULOS DE LEITURA</span><div class="lens-list">${guide.lenses.map((lens,index) => `<div><b>0${index+1}</b><p>${esc(lens)}</p></div>`).join('')}</div></div></div>`;
  if (studyTab === 'vozes') content = `<div><span class="eyebrow">LEITURAS PROTESTANTES CLÁSSICAS</span><p class="deep-prose">Estas sínteses originais apresentam ênfases de dois comentaristas históricos. Leia as notas completas nas fontes para avaliar o argumento de cada um.</p><div class="voice-grid">${guide.voices.map(voice => `<article class="voice-card"><span>COMENTÁRIO CLÁSSICO</span><h3>${esc(voice.author)}</h3><p>${esc(voice.summary)}</p><a href="https://bible.helloao.org/api/c/${esc(voice.slug)}/${esc(book(reading.bookId)?.commentaryId)}/${reading.chapter}.simple.json" target="_blank" rel="noopener noreferrer">Ler comentário original (inglês) ↗</a></article>`).join('')}</div><div class="source-note">Os comentários apoiam a investigação. Compare cada interpretação com o capítulo e observe onde o texto permite mais de uma leitura.</div></div>`;
  if (studyTab === 'pratica') content = `<div class="deep-two"><div><span class="eyebrow">PERGUNTAS PARA ESTUDAR</span><ol class="deep-questions">${guide.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><div class="practice-card"><span class="eyebrow">COLOQUE EM PRÁTICA</span><p>${esc(guide.practice)}</p><button class="button button-light" data-action="focus-notes">Escrever nas minhas anotações →</button></div></div>`;
  return `<section class="deep-study" id="estudo-completo" aria-label="Estudo pronto de ${esc(ref(reading))}"><div class="deep-head"><div><span class="eyebrow">ESTUDO PRONTO · ${esc(ref(reading).toUpperCase())}</span><h2>${esc(guide.title)}</h2><p>Uma leitura original com o texto bíblico no centro, contexto e caminhos para aprofundar.</p><button class="text-link" data-action="back-to-reading">← Voltar ao capítulo</button></div><span class="deep-theme">${esc(guide.theme)}</span></div><div class="deep-tabs" role="group" aria-label="Seções do estudo">${tabs.map(([id,label]) => `<button class="deep-tab ${studyTab===id?'active':''}" data-action="study-tab" data-tab="${id}" aria-pressed="${studyTab===id}">${label}</button>`).join('')}</div><div class="deep-body">${content}</div><div class="deep-resources"><strong>Continue estudando</strong><span>Estudo original deste app, baseado nas passagens indicadas. Guias externos para ampliar a leitura:</span>${guide.resources.map(resource => `<a href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ↗</a>`).join('')}</div></section>`;
}

const sceneCatalog = {
  samaria: { file: 'samaria.jpg', alt: 'Ilustração artística de um poço em uma paisagem de Samaria', title: 'Junto ao poço' },
  galileia: { file: 'galileia.jpg', alt: 'Ilustração artística do mar da Galileia com um barco', title: 'À beira da Galileia' },
  jerusalem: { file: 'jerusalem.jpg', alt: 'Ilustração artística de uma estrada entre colinas rumo a Jerusalém', title: 'Caminho de Jerusalém' },
  horebe: { file: 'horebe.jpg', alt: 'Ilustração artística de uma paisagem desértica próxima ao Horebe', title: 'No deserto' },
};
const narrativeJourneys = {
  '2:3': ['Midian', 'Mount Horeb'],
  '40:2': ['Jerusalem', 'Bethlehem', 'Egypt', 'Nazareth'],
  '41:1': ['Nazareth', 'Jordan River', 'Galilee', 'Capernaum'],
  '42:2': ['Nazareth', 'Bethlehem', 'Jerusalem'],
  '43:4': ['Judea', 'Samaria', 'Galilee', 'Cana'],
  '44:16': ['Troas', 'Samothrace', 'Neapolis', 'Philippi'],
};
function normalName(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, ''); }
function sceneFor(reading, data) {
  const id = key(reading);
  if (id === '2:3') return sceneCatalog.horebe;
  if (id === '43:4') return sceneCatalog.samaria;
  const names = (data?.places || []).map(place => normalName(place.name));
  if (names.some(name => /samaria|sychar|sicar/.test(name))) return sceneCatalog.samaria;
  if (names.some(name => /horeb|midian|sinai/.test(name))) return sceneCatalog.horebe;
  if (names.some(name => /galilee|galileia|capernaum|tiberias/.test(name))) return sceneCatalog.galileia;
  if (names.some(name => /jerusalem|jerusalem|bethany|bethlehem/.test(name))) return sceneCatalog.jerusalem;
  return null;
}
function sceneHtml(scene) {
  return scene ? `<figure class="place-scene"><img src="./scenes/${scene.file}" alt="${esc(scene.alt)}" loading="lazy"><figcaption><strong>${esc(scene.title)}</strong><span>Imagem gerada por IA para ambientação. Não representa uma reconstrução histórica ou um lugar identificado com precisão.</span></figcaption></figure>` : '';
}
const visualScenes = {
  well: ['well.jpg', 'O encontro junto ao poço', 'Interpretação artística do encontro junto ao poço, com figuras em uma paisagem de Samaria.'],
  harvest: ['harvest.jpg', 'Campos e testemunho', 'Ilustração de moradores samaritanos caminhando entre campos em direção a um encontro.'],
  cana: ['cana.jpg', 'A caminho de Caná', 'Interpretação artística de um pai encontrando um mestre em uma aldeia da Galileia.'],
  creation: ['creation.jpg', 'Luz sobre a criação', 'Paisagem artística de amanhecer, mar e vegetação inspirada no relato da criação.'],
  exodus: ['exodus.jpg', 'Travessia no deserto', 'Ilustração de viajantes antigos entre montanhas desérticas.'],
  psalms: ['psalms.jpg', 'Águas de descanso', 'Ilustração pastoral de um pastor, ovelhas, um riacho e colinas.'],
  jerusalem: ['jerusalem-study.jpg', 'Entre as colinas de Jerusalém', 'Interpretação artística de Jerusalém no primeiro século vista das colinas.'],
  letters: ['letters.jpg', 'O mundo das cartas', 'Ambientação artística de uma sala antiga com papiros, uma lamparina e vista para o mar.'],
  exile: ['exile.jpg', 'Memória e exílio', 'Ilustração de uma família antiga junto a um rio na Mesopotâmia.'],
  wisdom: ['wisdom.jpg', 'Tempo de escutar', 'Ambientação temática de uma conversa sobre um rolo em um pátio antigo.'],
  resurrection: ['resurrection.jpg', 'O jardim ao amanhecer', 'Interpretação artística de um túmulo aberto em um jardim ao amanhecer.'],
  storm: ['galilee-storm.jpg', 'Águas e confiança', 'Ilustração de um barco antigo no mar da Galileia sob nuvens de tempestade.'],
};
let visualPart = 0;
let sceneMotion = true;
let connectionVerse = null;
function passageScene(reading, part) {
  const dedicated = passageImages[`${key(reading)}:${part.from}-${part.to}`];
  if (dedicated) return { id: `${key(reading)}:${part.from}-${part.to}`, ...dedicated, thematic: false };
  const text = normalName(`${part.title} ${part.explanation}`);
  let id;
  if (key(reading) === '43:4') id = part.from >= 43 ? 'cana' : part.from >= 27 ? 'harvest' : 'well';
  else if (reading.bookId === 1 && reading.chapter <= 2) id = 'creation';
  else if (/ressurre|tumulo|sepulcro/.test(text)) id = 'resurrection';
  else if (/tempestade|barco|naufrag/.test(text)) id = 'storm';
  else if (/exilio|babiloni|cativeiro/.test(text)) id = 'exile';
  else if (/deserto|sinai|horebe|exodo|mana/.test(text)) id = 'exodus';
  else if (/pastor|ovelha|rebanho/.test(text)) id = 'psalms';
  else if (reading.bookId === 19) id = 'psalms';
  else if (reading.bookId >= 20 && reading.bookId <= 22) id = 'wisdom';
  else if (reading.bookId >= 45) id = 'letters';
  else if (reading.bookId >= 40 && reading.bookId <= 43 && reading.chapter < 18) id = 'cana';
  else if (reading.bookId >= 2 && reading.bookId <= 5) id = 'exodus';
  else id = 'jerusalem';
  const [file,title,alt] = visualScenes[id];
  return { id, file, title, alt, thematic: key(reading) !== '43:4' };
}
let narrationActive = false;
let narrationToken = 0;
function localPortugueseVoice() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices().filter(voice => voice.localService && /^pt(?:-|_)/i.test(voice.lang));
  return voices.find(voice => /^pt[-_]BR$/i.test(voice.lang)) || voices[0] || null;
}
function stopLocalNarration() {
  narrationToken++;
  narrationActive = false;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}
function narratePassage(index, entireChapter = false) {
  const voice = localPortugueseVoice();
  if (!voice || !libraryData || typeof window.SpeechSynthesisUtterance !== 'function') return;
  stopLocalNarration();
  const token = narrationToken;
  const reading = plan()?.days[activeDay]?.readings[activeReading];
  const chapterKey = key(reading);
  function speakPart(partIndex) {
    if (token !== narrationToken || view !== 'plan' || key(plan()?.days[activeDay]?.readings[activeReading] || {}) !== chapterKey) return;
    const part = libraryData?.study?.outline[partIndex];
    if (!part) return;
    visualPart = partIndex; narrationActive = true; libraryTab = 'panorama'; render();
    const speech = new window.SpeechSynthesisUtterance(`${ref(reading)}, versículos ${part.from} a ${part.to}. ${part.title}. ${part.explanation}`);
    speech.voice = voice; speech.lang = voice.lang; speech.rate = .94;
    speech.onend = () => {
      if (token !== narrationToken) return;
      if (entireChapter && partIndex + 1 < libraryData.study.outline.length) speakPart(partIndex + 1);
      else { narrationActive = false; render(); }
    };
    speech.onerror = () => { if (token === narrationToken) { narrationActive = false; render(); } };
    window.speechSynthesis.speak(speech);
  }
  speakPart(index);
}

function visualJourney(reading, data) {
  const parts = data.study.outline;
  const index = Math.min(visualPart, parts.length - 1);
  const part = parts[index];
  const scene = passageScene(reading, part);
  return `<section class="visual-journey" aria-label="Explorar as partes do capítulo"><div class="journey-stage ${sceneMotion?'motion-enabled':''}"><img class="journey-image" src="./scenes/${scene.file}" alt="${esc(scene.alt)}" width="1440" height="810" decoding="async"><div class="journey-caption"><span>${esc(ref(reading))} · v. ${part.from}–${part.to}</span><h3>${esc(part.title)}</h3><div class="journey-controls">${narrationActive?'<button data-action="stop-narration">Parar narração</button>':`<button data-action="narrate-part" ${localPortugueseVoice()?'':'disabled'}>Ouvir trecho</button><button data-action="narrate-chapter" ${localPortugueseVoice()?'':'disabled'}>Ouvir capítulo com as cenas</button>`}<button data-action="scene-motion" aria-pressed="${sceneMotion}">${sceneMotion?'Pausar movimento':'Ativar movimento'}</button><button data-action="focus-verse" data-verse="${part.from}">Ler esta passagem ↓</button></div></div></div><p class="scene-disclosure">${scene.thematic?'Ambientação temática':'Cena interpretativa'} gerada por IA · ${esc(scene.title)} · Ilustração artística, sem precisão arqueológica.</p><p class="local-voice-note">${localPortugueseVoice()?'Narração com a voz local do dispositivo, sem chamadas de API.':'A narração local requer uma voz em português instalada neste dispositivo.'}</p><div class="journey-parts" role="group" aria-label="Partes do capítulo">${parts.map((p,i)=>{const image=passageScene(reading,p);return `<button data-action="visual-part" data-index="${i}" aria-pressed="${index===i}"><img src="./scenes/${image.file}" alt="" loading="lazy" width="160" height="90"><span><small>v. ${p.from}–${p.to}</small><strong>${esc(p.title)}</strong></span></button>`;}).join('')}</div><div class="journey-explanation" aria-live="polite"><p>${esc(part.explanation)}</p></div></section>`;
}
function connectionExplorer(reading, data) {
  const verses = [...new Set(data.crossRefs.map(link=>link.fromVerse))].sort((a,b)=>a-b);
  const links = data.crossRefs.map((link,index)=>({...link,index})).filter(link=>!connectionVerse || link.fromVerse===connectionVerse);
  return `<section class="connection-explorer" aria-label="Rede de referências cruzadas"><div class="connection-explorer-head"><div><h3>Um texto abre outros caminhos</h3><p>Escolha um versículo na rede para comparar as passagens.</p></div><div class="connection-filters" role="group" aria-label="Filtrar pelo versículo de origem"><button data-action="connection-filter" data-verse="0" aria-pressed="${!connectionVerse}">Todos</button>${verses.map(v=>`<button data-action="connection-filter" data-verse="${v}" aria-pressed="${connectionVerse===v}">v. ${v}</button>`).join('')}</div></div><div class="verse-network"><svg class="verse-edges" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">${links.map((link,i)=>{const left=i%2===0;const row=Math.floor(i/2);const y=(row+1)*440/(Math.ceil(links.length/2)+1);return `<path d="M 500 220 C ${left?330:670} 220, ${left?330:670} ${y}, ${left?155:845} ${y}" pathLength="1" style="--edge-delay:${i*50}ms"/>`;}).join('')}</svg><div class="verse-origin"><span>Você está lendo</span><strong>${esc(ref(reading))}${connectionVerse?`:${connectionVerse}`:''}</strong><small>Investigue cada ligação</small></div>${links.map((link,i)=>{const rows=Math.ceil(links.length/2);return `<button class="verse-node ${i%2===0?'node-left':'node-right'}" style="--node-y:${(Math.floor(i/2)+1)*100/(rows+1)}%;--node-delay:${i*45}ms" data-action="crossref" data-index="${link.index}"><small>${esc(ref(reading))}:${link.fromVerse} ↗</small><strong>${esc(book(link.bookId)?.name)} ${link.chapter}:${link.verse}</strong><span>Abrir comparação</span></button>`;}).join('')}</div></section>`;
}

function historicalDossier(reading) {
  const dossier = bookProfileData?.dossier;
  if (!dossier) return '<p class="library-empty">O dossiê histórico deste livro está em preparação. O contexto específico do capítulo está em Panorama.</p>';
  const sources = bookProfileData.dossierSources || [];
  const labels = { 'explicit-source': 'Afirmação da fonte', interpretation: 'Interpretação', debated: 'Questão debatida' };
  return `<section class="historical-dossier"><header><h3>O mundo de ${esc(book(reading.bookId)?.name)}</h3><p>Contexto do livro para acompanhar este capítulo. As fontes consultadas cobrem temas e passagens selecionados; cada observação indica seu apoio.</p></header><div class="era-pair"><article><span>Tempo da narrativa</span><p>${esc(dossier.narratedEra)}</p></article><article><span>Composição e transmissão</span><p>${esc(dossier.compositionEra)}</p></article></div><nav class="dossier-jump" aria-label="Temas do contexto"><a href="#context-politics">Reinados e potências</a><a href="#context-customs">Cultura e costumes</a><a href="#context-language">Linguagem</a><a href="#context-timeline">Linha do tempo</a></nav>${[['politics','Reinados, povos e potências'],['customs','Cultura, costumes e vida cotidiana'],['language','Linguagem e formas de expressão'],['timeline','Marcos no tempo']].map(([section,label])=>`<section class="context-section" id="context-${section}"><h3>${label}</h3>${dossier[section].length?dossier[section].map((item,i)=>`<details class="context-detail" ${i===0?'open':''}><summary><strong>${esc(item.title)}</strong><span>${esc(labels[item.certainty])}</span></summary><div><p>${esc(item.detail)}</p><p class="context-impact"><strong>O que observar na leitura</strong>${esc(item.readingImpact)}</p>${item.reference?`<p class="context-reference">Passagem: ${esc(item.reference)}</p>`:''}<div class="context-sources">${item.sourceIds.map(id=>{const source=sources.find(s=>s.id===id);return source?`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`:'';}).join('')}</div></div></details>`).join(''):'<p class="library-footnote">As notas consultadas não oferecem detalhe suficiente sobre este tema.</p>'}</section>`).join('')}<section class="context-investigation"><h3>Perguntas para aprofundar</h3><ol>${dossier.investigation.map(q=>`<li>${esc(q)}</li>`).join('')}</ol></section><div class="library-limits"><strong>Alcance e limites das fontes</strong><p>${esc(dossier.limits)}</p><p>“Afirmação da fonte” identifica o que um comentário secundário afirma. A classificação não equivale a comprovação histórica independente. Síntese com IA; adaptações das notas Tyndale sob CC BY-SA 4.0.</p></div></section>`;
}
function narratedFilm(reading) {
  if (key(reading) !== '43:4') return '';
  return `<section class="narrated-film"><h3>João 4, uma jornada narrada</h3><p>Ouça o movimento da passagem enquanto explora as cenas.</p><video controls playsinline preload="none" poster="./scenes/well.jpg" aria-label="Jornada narrada de João capítulo quatro"><source src="./media/43-4.mp4" type="video/mp4"><track kind="captions" src="./media/43-4.vtt" srclang="pt-BR" label="Português" default>Seu navegador não conseguiu reproduzir este vídeo.</video><p class="scene-disclosure">Voz sintética gerada por IA. Montagem de ilustrações geradas por IA com movimento de câmera. As cenas são interpretações artísticas.</p><a href="./media/43-4-transcript.txt" target="_blank" rel="noopener">Ler a transcrição completa ↗</a><p class="library-footnote">O roteiro acompanha a análise e as fontes identificadas neste capítulo. Volte ao texto para conferir cada observação.</p></section>`;
}

function libraryRoom(reading) {
  const data = libraryData;
  if (!data || data.bookId !== reading.bookId || data.chapter !== reading.chapter) return '';
  const s = data.study;
  const tabs = [['panorama','Panorama'],['livro','Sobre o livro'],['contexto','Mundo do texto'],['lugares','Lugares e caminhos'],['conexoes','Conexões'],['estudiosos','Estudiosos'],['pratica','Reflexão']];
  if (key(reading) === '43:4') tabs.push(['filme','Assistir e ouvir']);
  const scene = sceneFor(reading, data);
  const guideUrl = bookGuides[reading.bookId];
  let content = '';
  if (libraryTab === 'panorama') content = `${visualJourney(reading, data)}<div class="library-columns"><div><span class="eyebrow">LEITURA DO CAPÍTULO</span><p class="library-lead">${esc(s.overview)}</p><h3>Movimento do texto</h3><div class="library-outline">${s.outline.map((part,index) => `<button data-action="focus-verse" data-verse="${part.from}"><span>${String(index+1).padStart(2,'0')}</span><div><strong>${esc(part.title)}</strong><small>Versículos ${part.from}–${part.to}</small><p>${esc(part.explanation)}</p></div></button>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">CONTEXTO</span><p>${esc(s.context)}</p><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Ver guia do livro no BibleProject ↗</a></aside></div>`;
  if (libraryTab === 'contexto') content = historicalDossier(reading);
  if (libraryTab === 'filme') content = narratedFilm(reading);
  if (libraryTab === 'livro') {
    const profile = bookProfileData?.profile;
    content = profile ? `<div class="library-columns"><div><span class="eyebrow">VISÃO DE ${esc(book(reading.bookId)?.name.toUpperCase())}</span><p class="library-lead">${esc(profile.summary)}</p><h3>Estrutura do livro</h3><div class="book-structure">${profile.structure.map(part => `<div><span>CAP. ${part.from}${part.to>part.from?`–${part.to}`:''}</span><strong>${esc(part.label)}</strong><p>${esc(part.description)}</p></div>`).join('')}</div><h3>Temas para acompanhar</h3><div class="book-themes">${profile.themes.map(theme => `<span>${esc(theme)}</span>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">CENÁRIO E LEITURA</span><p>${esc(profile.setting)}</p><strong>Enquanto lê</strong><ul class="book-tips">${profile.readingKeys.map(tip => `<li>${esc(tip)}</li>`).join('')}</ul><strong>Questões em aberto</strong><p>${esc(profile.cautions)}</p><a href="${esc(bookProfileData.source.url)}" target="_blank" rel="noopener noreferrer">Consultar fonte do panorama ↗</a><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Guia visual do BibleProject ↗</a></aside></div>` : `<p class="library-empty">O panorama deste livro está sendo preparado. <a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Ver guia do BibleProject ↗</a></p>`;
  }
  if (libraryTab === 'lugares') content = `<div class="library-columns"><div>${sceneHtml(scene)}<span class="eyebrow">LUGARES CITADOS</span>${data.places?.length ? `<div id="chapter-map" class="chapter-map" role="img" aria-label="Mapa dos lugares associados a ${esc(ref(reading))}"></div><div class="place-list">${data.places.map(place => `<button data-action="map-place" data-place="${esc(place.name)}"><strong>${esc(place.name)}</strong><small>${place.verses?.length ? `v. ${esc(place.verses.join(', '))}` : 'local mencionado'}</small></button>`).join('')}</div><p class="library-footnote">Pontos aproximados do conjunto History Globe. A posição de cidades antigas pode ser debatida. A linha, quando exibida, liga apenas paradas narradas no capítulo; não reproduz a estrada percorrida.</p>` : '<p class="library-empty">Este capítulo não traz um lugar com coordenadas verificáveis nesta base. Observe sua paisagem literária no texto.</p>'}</div><aside class="library-aside"><span class="eyebrow">HISTÓRIA E CENÁRIO</span><p>${esc(s.context)}</p><strong>Fonte e pesquisa geográfica</strong><a href="https://github.com/openbibleinfo/Bible-Geocoding-Data" target="_blank" rel="noopener noreferrer">Pesquisa complementar: OpenBible ↗</a><a href="https://bible.helloao.org/docs/reference/datasets/" target="_blank" rel="noopener noreferrer">History Globe via HelloAO ↗</a></aside></div>`;
  if (libraryTab === 'conexoes') content = `${data.crossRefs?.length ? connectionExplorer(reading, data) : ''}<div class="library-columns"><div><span class="eyebrow">TEOLOGIA DO CAPÍTULO</span><p class="library-lead">${esc(s.theology)}</p><h3>Compare com outras passagens</h3>${data.crossRefs?.length ? `<div class="connection-list">${data.crossRefs.map((link,index) => `<button data-action="crossref" data-index="${index}"><span>${esc(ref(reading))}:${link.fromVerse}</span><b aria-hidden="true">↔</b><strong>${esc(book(link.bookId)?.name)} ${link.chapter}:${link.verse}</strong><small>Abra os textos lado a lado →</small></button>`).join('')}</div>` : '<p class="library-empty">Nenhuma ligação foi selecionada para este capítulo.</p>'}</div><aside class="library-aside"><span class="eyebrow">COMO LER AS LIGAÇÕES</span><p>As referências cruzadas indicam textos relacionados por tema, expressão ou citação. A pontuação da base ajuda a ordenar sugestões; ela não prova que uma passagem explica ou confirma a outra. Leia ambas no contexto.</p><a href="https://github.com/trekhleb/bible-cross-references" target="_blank" rel="noopener noreferrer">Explorar o projeto de referências ↗</a></aside></div>`;
  if (libraryTab === 'estudiosos') content = `<div><span class="eyebrow">VOZES PARA CONFERIR</span><p class="library-intro">Sínteses em português produzidas com IA a partir de excertos das fontes. São paráfrases, não citações dos autores. Confira a nota original e o versículo.</p><div class="scholar-grid">${s.scholarViews.map(view => { const source = data.sources.find(item => item.id === view.sourceId); return `<article class="scholar-card"><span>v. ${view.verse}</span><h3>${esc(source?.author || view.sourceId)}</h3><p>${esc(view.insight)}</p><a href="${esc(source?.url || '#')}" target="_blank" rel="noopener noreferrer">Conferir comentário original ↗</a></article>`; }).join('')}</div><div class="library-limits"><strong>Limites desta análise</strong><p>${esc(s.uncertainty)}</p></div></div>`;
  if (libraryTab === 'pratica') content = `<div class="library-columns"><div><span class="eyebrow">PERGUNTAS PARA INVESTIGAR</span><ol class="library-questions">${s.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><aside class="library-aside library-practice"><span class="eyebrow">PRÁTICA</span><p>${esc(s.practice)}</p><button class="button button-dark" data-action="focus-notes">Escrever nas minhas anotações →</button></aside></div>`;
  return `<section class="chapter-library" id="biblioteca-capitulo" aria-label="Biblioteca de ${esc(ref(reading))}"><div class="library-head">${scene && libraryTab !== 'lugares' ? `<img src="./scenes/${scene.file}" alt="" aria-hidden="true">` : ''}<div><span class="eyebrow">BIBLIOTECA DO CAPÍTULO · ${esc(ref(reading).toUpperCase())}</span><h2>${esc(s.title)}</h2><p>Estudo preparado com IA a partir do texto bíblico e de fontes identificadas. Leia e confira cada afirmação no capítulo.</p></div></div><div class="library-tabs" role="group" aria-label="Seções da biblioteca">${tabs.map(([id,label]) => `<button class="${libraryTab===id?'active':''}" data-action="library-tab" data-tab="${id}" aria-pressed="${libraryTab===id}">${label}</button>`).join('')}</div><div class="library-body" data-section="${libraryTab}">${content}</div><div class="library-credits"><span>Texto bíblico: <a href="${esc(data.bibleSource)}" target="_blank" rel="noopener noreferrer">Bíblia Livre via Midvash</a></span><span>Notas Tyndale: <a href="https://tyndaleopenresources.com/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></span><span>Referências e lugares: <a href="https://bible.helloao.org/" target="_blank" rel="noopener noreferrer">HelloAO</a> (CC BY 4.0)</span></div></section>`;
}
function connectionOverlay() {
  if (!connection) return '';
  const link = connection.link;
  const reading = plan()?.days[activeDay]?.readings[activeReading];
  const sourceName = reading ? `${ref(reading)}:${link.fromVerse}` : '';
  const targetName = `${book(link.bookId)?.name || 'Livro'} ${link.chapter}:${link.verse}`;
  const sourceVerse = chapterData?.verses?.[link.fromVerse-1] || 'O texto de origem não carregou. Consulte a leitura do capítulo para conferir este versículo.';
  const targetVerse = connection.chapter?.verses?.[link.verse-1] || '';
  const nextIndex = ((libraryData?.crossRefs?.indexOf(link) ?? 0) + 1) % (libraryData?.crossRefs?.length || 1);
  const context = (data, verse) => data?.verses?.slice(Math.max(0,verse-2),verse+1).map((text,index) => `<p class="context-verse ${Math.max(1,verse-1)+index===verse?'selected':''}"><sup>${Math.max(1,verse-1)+index}</sup>${esc(text)}</p>`).join('') || '';
  const contextHtml = connection.showContext ? `<div class="verse-pair passage-context"><article><strong>Contexto de ${esc(sourceName)}</strong>${context(chapterData,link.fromVerse)}</article><article><strong>Contexto de ${esc(targetName)}</strong>${context(connection.chapter,link.verse)}</article></div>` : '';

  return `<div class="connection-overlay" role="presentation"><section class="connection-dialog" role="dialog" aria-modal="true" aria-label="Comparar passagens bíblicas" tabindex="-1"><button class="connection-close" data-action="close-connection" aria-label="Fechar comparação">×</button><span class="eyebrow">CONEXÃO ENTRE TEXTOS</span><h2>${esc(sourceName)} ↔ ${esc(targetName)}</h2><p class="library-intro">Leia cada versículo no contexto do seu capítulo. A referência sugere uma relação para investigar.</p><div class="verse-pair"><article><strong>${esc(sourceName)}</strong><p>${esc(sourceVerse)}</p></article><article><strong>${esc(targetName)}</strong><p>${connection.loading?'Carregando texto…':connection.error?esc(connection.error):esc(targetVerse)}</p></article></div>${contextHtml}<p class="connection-version">Tradução: ${esc(versions[selectedVersion])}</p><div class="connection-actions"><button class="button button-outline" data-action="connection-context" aria-expanded="${Boolean(connection.showContext)}" ${connection.loading || connection.error?'disabled':''}>${connection.showContext?'Recolher contexto':'Ver contexto dos versículos'}</button><button class="button button-outline" data-action="crossref" data-index="${nextIndex}">Próxima conexão →</button><button class="button button-dark" data-action="open-target" ${connection.loading?'disabled':''}>Ler ${esc(book(link.bookId)?.name)} ${link.chapter} →</button><button class="button button-outline" data-action="close-connection">Continuar neste capítulo</button></div></section></div>`;
}
function renderChapterMap() {
  const element = $('#chapter-map');
  if (!element || !libraryData?.places?.length || typeof L === 'undefined') return;
  chapterMap = L.map(element, { scrollWheelZoom: false });
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(chapterMap);
  const markers = new Map();
  for (const place of libraryData.places) {
    const marker = L.circleMarker([place.latitude, place.longitude], { radius: 7, color: '#253e37', weight: 2, fillColor: '#d2a761', fillOpacity: .95 }).addTo(chapterMap);
    marker.bindPopup(`<strong>${esc(place.name)}</strong>${place.verses?.length ? `<br>Versículos ${esc(place.verses.join(', '))}` : ''}<br><small>Localização aproximada</small>`);
    markers.set(normalName(place.name), marker);
  }
  const current = plan()?.days[activeDay]?.readings[activeReading];
  const route = (narrativeJourneys[key(current)] || []).map(name => markers.get(normalName(name))).filter(Boolean);
  if (route.length > 1) L.polyline(route.map(marker => marker.getLatLng()), { color: '#b56c3e', weight: 3, opacity: .85, dashArray: '7 7' }).addTo(chapterMap);
  const all = [...markers.values()].map(marker => marker.getLatLng());
  if (all.length > 1) chapterMap.fitBounds(L.latLngBounds(all).pad(.24), { maxZoom: 10 });
  else chapterMap.setView(all[0], 8);
  chapterMap._placeMarkers = markers;
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
      ${libraryData ? `<button class="reader-study-shortcut" data-action="open-library">✳ Biblioteca deste capítulo: estudo, mapa e conexões <span>Explorar →</span></button>` : guide ? `<button class="reader-study-shortcut" data-action="open-deep-study">✳ Estudo completo já preparado <span>Explorar →</span></button>` : ''}
      ${day.readings.length > 1 ? `<div class="chapter-tabs" role="group" aria-label="Capítulos deste dia">${day.readings.map((r,index) => `<button class="chapter-tab ${index===activeReading?'active':''}" data-action="open-reading" data-index="${index}">${esc(ref(r))}</button>`).join('')}</div>` : ''}
      <div class="translation-tools"><label>Tradução <select id="version-select" aria-label="Tradução bíblica">${Object.entries(versions).map(([id,name]) => `<option value="${id}" ${selectedVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label><label class="compare-toggle"><input id="compare-toggle" type="checkbox" ${compareEnabled?'checked':''}> Comparar</label>${compareEnabled ? `<select id="compare-select" aria-label="Tradução para comparar">${Object.entries(versions).filter(([id]) => id!==selectedVersion).map(([id,name]) => `<option value="${id}" ${compareVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select>` : ''}</div>
      <div class="reader-rule"></div><div class="scripture ${comparisonData?'scripture-compare':''}">${busy==='chapter'?'<p class="muted">Carregando o capítulo…</p>':chapterData ? `${comparisonData ? `<div class="compare-head"><strong>${esc(chapterData.versionName)}</strong><strong>${esc(comparisonData.versionName)}</strong></div>` : ''}${chapterData.verses.map((verse,index) => `<div class="verse-row ${comparisonData?'paired':''}" id="v${index+1}"><p class="verse"><sup>${index+1}</sup>${esc(verse)}</p>${comparisonData ? `<p class="verse"><sup>${index+1}</sup>${esc(comparisonData.verses[index] || '')}</p>` : ''}</div>`).join('')}` : '<p class="muted">Não foi possível carregar o texto. <button class="inline-button" data-action="retry-chapter">Tentar novamente</button></p>'}</div>
      ${chapterData ? `<div class="translation-credit"><strong>${esc(chapterData.versionName)}</strong><br>${esc(chapterData.copyright)}<br><a href="${esc(chapterData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte do capítulo ↗</a>${comparisonData ? `<br><br><strong>${esc(comparisonData.versionName)}</strong><br>${esc(comparisonData.copyright)}<br><a href="${esc(comparisonData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte da comparação ↗</a>` : ''}</div><div class="translation-more">Quer consultar <em>A Mensagem</em>? <a href="https://www.editoravida.com.br/a-mensagem-capa-luxo-laranja-e-verde.html" target="_blank" rel="noopener noreferrer">Conheça a edição oficial ↗</a> <small>Obra com direitos reservados; o texto integral não é reproduzido aqui.</small></div>` : ''}
      <div class="reading-actions"><button class="button ${isDone?'button-outline':'button-dark'}" data-action="toggle-done">${isDone?'✓ Leitura concluída':'Marcar como lido'} <span aria-hidden="true">${isDone?'':'→'}</span></button><button class="text-link" data-action="next-day">Próximo dia <span aria-hidden="true">→</span></button></div>
    </section>
    <aside class="study-panel" aria-label="Estudo do capítulo"><div class="study-header"><div class="study-symbol">✳</div><div><span class="eyebrow">COMPANHEIRO DE ESTUDO</span><h2>Vá mais fundo</h2></div></div>
      <p class="study-intro">Estudo evangélico protestante, com o texto bíblico no centro e fontes identificadas. Compare as interpretações com a passagem.</p>
      ${libraryData ? `<div class="guide-teaser"><span class="eyebrow">BIBLIOTECA JÁ PREPARADA</span><h3>${esc(libraryData.study.title)}</h3><p>Panorama, estrutura, mapa, conexões e comentários para investigar.</p><button class="button button-dark full" data-action="open-library">Abrir biblioteca do capítulo ↗</button></div>` : guide ? `<div class="guide-teaser"><span class="eyebrow">JÁ PREPARADO PARA VOCÊ</span><h3>${esc(guide.title)}</h3><p>${esc(guide.thesis)}</p><button class="button button-dark full" data-action="open-deep-study">Abrir estudo completo ↗</button></div>` : ''}
      ${study ? studyHtml(study, item.studies[currentKey+'-sources']) : STATIC_MODE ? '' : `<div class="study-empty"><span>✦</span><h3>Análise adicional com IA</h3><p>Peça uma leitura sobre estrutura, cenário, teologia e aplicação deste capítulo.</p><button class="button button-dark full" data-action="generate-study" ${busy==='study'||!chapterData||!aiReady?'disabled':''}>${busy==='study'?'Preparando estudo…':'Gerar análise com IA'} <span aria-hidden="true">↗</span></button>${!aiReady?'<small>Configure a chave da IA no arquivo .env para gerar a análise.</small>':''}</div>`}
      ${STATIC_MODE ? '' : `<div class="study-question"><h3>Uma pergunta sua</h3><p>O que ficou difícil ou despertou curiosidade?</p><form id="question-form"><textarea name="question" rows="3" maxlength="800" placeholder="Ex.: O que significa esta imagem no capítulo?" required>${esc(draftQuestion)}</textarea><button class="button button-outline full" type="submit" ${busy==='question'||!chapterData||!aiReady?'disabled':''}>${busy==='question'?'Pensando…':'Perguntar sobre o capítulo'} <span aria-hidden="true">→</span></button></form>${answer?`<div class="answer"><span class="eyebrow">RESPOSTA DA IA</span><p>${esc(answer)}</p></div>`:''}</div>`}
      <div class="notes-block"><h3>Minhas anotações</h3><p>O que você quer lembrar desta leitura?</p><textarea id="notes" rows="5" placeholder="Escreva livremente…">${esc(item.notes[currentKey] || '')}</textarea><small>Salvo automaticamente neste navegador</small></div>
    </aside></div>${libraryRoom(reading)}${guide ? studyRoom(reading) : ''}
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

function footer() { return `<footer class="site-footer"><span>✦ Caminho · leitura com intenção</span><span>Traduções abertas com créditos junto ao texto · <a href="./fontes.html">Fontes e licenças</a></span></footer>`; }
function render() {
  if (chapterMap) { chapterMap.remove(); chapterMap = null; }
  document.body.classList.toggle('comparison-open', Boolean(connection));
  $('#app').innerHTML = header() + (message ? `<div class="notice" role="alert">${esc(message)} <button data-action="dismiss" aria-label="Fechar aviso">×</button></div>` : '') + (view === 'plan' ? planView() : home()) + footer() + connectionOverlay();
  if (view === 'plan' && libraryTab === 'lugares') requestAnimationFrame(renderChapterMap);
  if (connection) document.querySelector('.connection-close')?.focus({preventScroll:true});
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
  if (action === 'open-day') { activeDay = Number(target.dataset.index); activeReading = 0; answer = ''; draftQuestion = ''; studyTab = 'panorama'; libraryTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-reading') { activeReading = Number(target.dataset.index); answer = ''; draftQuestion = ''; studyTab = 'panorama'; libraryTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-deep-study') return $('#estudo-completo')?.scrollIntoView({ behavior:'auto', block:'start' });
  if (action === 'narrate-part') return narratePassage(visualPart);
  if (action === 'narrate-chapter') return narratePassage(0, true);
  if (action === 'stop-narration') { stopLocalNarration(); return render(); }
  if (action === 'visual-part') { stopLocalNarration(); visualPart = Number(target.dataset.index); render(); const selected = document.querySelector(`[data-action="visual-part"][data-index="${visualPart}"]`); selected?.focus({preventScroll:true}); return; }
  if (action === 'scene-motion') { sceneMotion = !sceneMotion; render(); document.querySelector('[data-action="scene-motion"]')?.focus({preventScroll:true}); return; }
  if (action === 'connection-filter') { connectionVerse = Number(target.dataset.verse) || null; render(); document.querySelector(`[data-action="connection-filter"][data-verse="${connectionVerse || 0}"]`)?.focus({preventScroll:true}); return; }
  if (action === 'open-library') return $('#biblioteca-capitulo')?.scrollIntoView({ behavior:'smooth', block:'start' });
  if (action === 'library-tab') { stopLocalNarration(); libraryTab = target.dataset.tab; render(); return $('#biblioteca-capitulo')?.scrollIntoView({ behavior:'auto', block:'start' }); }
  if (action === 'map-place') { const marker = chapterMap?._placeMarkers?.get(normalName(target.dataset.place)); if (marker) { chapterMap.setView(marker.getLatLng(), Math.max(chapterMap.getZoom(), 9)); marker.openPopup(); $('#chapter-map')?.scrollIntoView({ behavior:'smooth', block:'center' }); } return; }
  if (action === 'crossref') {
    stopLocalNarration();
    const link = libraryData?.crossRefs?.[Number(target.dataset.index)];
    if (!link) return;
    connectionTrigger = target.dataset.index;
    connection = { link, loading: true }; render();
    try { const chapter = await getJson(`/api/chapter/${link.bookId}/${link.chapter}?version=${encodeURIComponent(selectedVersion)}`); if (connection?.link === link) connection = { link, chapter, loading: false }; }
    catch (error) { if (connection?.link === link) connection = { link, error: error.message, loading: false }; }
    return render();
  }
  if (action === 'connection-context') { if(connection) connection.showContext = !connection.showContext; render(); document.querySelector('[data-action="connection-context"]')?.focus({preventScroll:true}); return; }
  if (action === 'close-connection') { connection = null; render(); document.querySelector(`[data-action="crossref"][data-index="${connectionTrigger}"]`)?.focus({preventScroll:true}); return; }
  if (action === 'open-target') {
    const link = connection?.link;
    if (!link) return;
    connection = null;
    return newPlan(`Explorando ${book(link.bookId)?.name} ${link.chapter}`, 'Uma passagem encontrada pelas conexões da Bíblia.', [{ focus: `Leia ${book(link.bookId)?.name} ${link.chapter}`, readings: [{ bookId: link.bookId, chapter: link.chapter }] }], 'connection');
  }
  if (action === 'study-tab') { studyTab = target.dataset.tab; render(); return $('#estudo-completo')?.scrollIntoView({ behavior:'auto', block:'start' }); }
  if (action === 'back-to-reading') return $('.reader-panel')?.scrollIntoView({ behavior:'auto', block:'start' });
  if (action === 'movement') { selectedMovement = Number(target.dataset.index); return render(); }
  if (action === 'focus-verse') return $(`#v${Number(target.dataset.verse)}`)?.scrollIntoView({ behavior:'smooth', block:'center' });
  if (action === 'focus-notes') { $('#notes')?.scrollIntoView({ behavior:'smooth', block:'center' }); return $('#notes')?.focus(); }
  if (action === 'retry-chapter') return loadChapter();
  if (action === 'next-day') { const item = plan(); if (activeDay < item.days.length - 1) { activeDay++; activeReading = 0; answer = ''; draftQuestion = ''; studyTab = 'panorama'; libraryTab = 'panorama'; selectedMovement = 0; loadChapter(); scrollToReader(); } return; }
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
    const [catalog,status,library,translations,guides,scenes] = await Promise.all([getJson('/api/books'),getJson('/api/status'),getJson('/api/studies'),getJson('/api/versions'),getJson('/api/book-guides'),staticFile('scenes/manifest.json').catch(()=>({passages:{}}))]);
    books = catalog.books; aiReady = status.aiReady; hosted = Boolean(status.hosted); prebuiltStudies = library.studies; versions = translations.versions; bookGuides = guides.guides; passageImages = scenes.passages || {};
    render();
  } catch(error) { $('#app').innerHTML = `<p class="loading">${esc(error.message)} Recarregue a página.</p>`; }
}


document.addEventListener('keydown', event => {
  if (!connection) return;
  if (event.key === 'Escape') { event.preventDefault(); connection = null; render(); document.querySelector(`[data-action="crossref"][data-index="${connectionTrigger}"]`)?.focus({preventScroll:true}); return; }
  if (event.key !== 'Tab') return;
  const controls = [...document.querySelectorAll('.connection-dialog button:not(:disabled), .connection-dialog a[href]')];
  const first = controls[0], last = controls.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
});

if (typeof window !== 'undefined') window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
  const ready = Boolean(localPortugueseVoice());
  document.querySelectorAll('[data-action="narrate-part"], [data-action="narrate-chapter"]').forEach(button => { button.disabled = !ready; });
  const note = document.querySelector('.local-voice-note');
  if (note) note.textContent = ready ? 'Narração com a voz local do dispositivo, sem chamadas de API.' : 'A narração local requer uma voz em português instalada neste dispositivo.';
});
init();
