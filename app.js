const STORAGE = 'caminho-biblico-v1';
const ENGLISH = document.documentElement?.lang === 'en';
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
let bookImages = {};
let libraryData = null;
let bookProfileData = null;
let libraryTab = 'panorama';
let connection = null;
let connectionTrigger = null;
let versions = {};
let aiReady = false;
let hosted = false;
let view = 'home';
let exploreSection = 'discoveries';
let activePlanId = null;
let activeDay = 0;
let activeReading = 0;
let chapterData = null;
let comparisonData = null;
let selectedVersion = ENGLISH ? 'web' : 'almeida-livre';
let compareVersion = ENGLISH ? 'kjv' : 'nva';
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
function nextDay(item) {
  const index = item.days.findIndex(day => day.readings.some(reading => !item.done.includes(key(reading))));
  return index < 0 ? item.days.length-1 : index;
}
function nextReading(item,day) {
  const readings = item.days[day].readings;
  const index = readings.findIndex(reading => !item.done.includes(key(reading)));
  return index < 0 ? readings.length-1 : index;
}
function currentPlan() {
  const inProgress = state.plans.filter(item => completed(item)<totalReadings(item));
  return inProgress.find(item => item.id===state.recentPlanId) || inProgress[0];
}
function notify(text) { message = text; render(); }

const discoveryBooks=new Map();
async function getJson(url, options) {
  const match=url.match(/^\/api\/library\/(\d+)\/(\d+)$/);
  if(!match)return getResource(url,options);
  const [,id,chapter]=match;
  const data=await getResource(url,options);
  if(!discoveryBooks.has(id))discoveryBooks.set(id,staticFile('media/discoveries/'+id+'.json').catch(()=>{
    discoveryBooks.delete(id);return {};
  }));
  const index=await discoveryBooks.get(id);
  return {...data,discoveries:index[chapter] || []};
}
async function getResource(url, options) {
  if(ENGLISH) {
    if(url==='/api/books')return {books:await staticFile('en/books.json')};
    if(url==='/api/studies')return {studies:await staticFile('en/studies.json')};
    if(url==='/api/versions')return {versions:{web:'World English Bible',kjv:'King James Version'}};
    const study=url.match(/^\/api\/library\/(\d+)\/(\d+)$/);
    if(study)return staticFile(`en/library/${study[1]}/${study[2]}.json`);
    const profile=url.match(/^\/api\/book-profile\/(\d+)$/);
    if(profile)return staticFile(`en/library/${profile[1]}/book.json`);
    const chapter=url.match(/^\/api\/chapter\/(\d+)\/(\d+)(?:\?version=(web|kjv))?$/);
    if(chapter){
      const [,id,n,edition='web']=chapter;
      const text=(await staticFile(`en/bible/${edition}/${id}.json`))[n];
      return {bookId:Number(id),bookName:book(id).name,chapter:Number(n),verses:Array.from({length:Math.max(...Object.keys(text).map(Number))},(_,i)=>text[i+1] || ''),version:edition,versionName:versions[edition],copyright:'Public domain',sourceUrl:`https://bible.helloao.org/api/eng_${edition}/${book(id).commentaryId}/${n}.json`};
    }
  }
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
function planCopy(item, day=0) {
  const first=item.days[0]?.readings[0];
  if(!first)return item;
  if(item.origin==='curated'){
    const template=starterPlans.find(t=>t.refs.length===item.days.length && t.refs.every(([id,n],i)=>item.days[i].readings[0]?.bookId===id && item.days[i].readings[0]?.chapter===n));
    if(template)return {...template,focus:template.focuses[day] || ref(item.days[day].readings[0])};
  }
  if(item.origin==='book'){
    const name=book(first.bookId)?.name;
    return {title:`Lendo ${name}`,description:`Uma jornada por todos os ${book(first.bookId)?.chapters} capítulos de ${name}, no seu ritmo.`,focus:item.days[day].readings.map(ref).join(' · ')};
  }
  return {...item,focus:item.days[day].focus};
}
function switchLanguage(lang, portal=null){
  try {sessionStorage.setItem('poiema-return',JSON.stringify({planId:view==='plan'?activePlanId:null,day:activeDay,reading:activeReading,portal}));}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',lang);location.assign(url);
}
function openPlan(id, dayIndex, updateURL=true) {
  activePlanId = id;
  const item = plan();
  if (!item) return showHome();
  activeDay = Math.min(Math.max(0,dayIndex),item.days.length-1);
  activeReading = nextReading(item,activeDay);
  if (updateURL) {
    const url = pageURL('plans');
    url.searchParams.set('plan',item.id);
    pushPage(url);
    state.recentPlanId = item.id;
    try { save(); } catch {}
  }
  answer = '';
  studyTab = 'panorama'; selectedMovement = 0;
  libraryTab = 'panorama'; connection = null;
  message = '';
  view = 'plan';
  loadChapter();
  window.scrollTo(0, 0);
}
function showHome(next = 'home') { stopLocalNarration(); requestToken++; view = next; activePlanId = null; chapterData = null; comparisonData = null; libraryData = null; bookProfileData = null; connection = null; busy = ''; message = ''; render(); window.scrollTo(0, 0); }
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

const pageActions = {home:'home',bible:'bible','browse-plans':'plans',explore:'explore'};

function pageURL(page,section) {
  const url = new URL(location.pathname,location.origin);
  url.searchParams.set('lang',ENGLISH?'en':'pt');
  if (page!=='home') url.searchParams.set('area',page);
  if (page==='explore' && section && section!=='discoveries') url.searchParams.set('section',section);
  return url;
}

function locationPage() {
  const query = new URLSearchParams(location.search);
  const sections = window.PoiemaGuide.topics;
  const hash = location.hash.slice(1);
  const area = query.get('area') || (sections.includes(hash) ? 'explore' : 'home');
  const section = query.get('section') || hash;
  return {
    page:['home','bible','explore','plans'].includes(area) ? area : 'home',
    section:sections.includes(section) ? section : 'discoveries',
    planId:area==='plans' ? query.get('plan') : null,
  };
}

function pushPage(url) {
  if (url.href!==location.href) window.history.pushState(null,'',url);
}

function header() {
  const destinations = [['home','Início','Home'],['bible','Bíblia','Bible'],['explore','Explorar','Explore'],['browse-plans','Planos','Plans']];
  return `<header class="site-header"><div class="header-inner">
    <button class="brand" data-action="home" aria-label="${studyLanguage(['Poiema Bereanos · início','Poiema Bereanos · home'])}"><img class="poiema-logo" src="./media/poiema-logo.jpeg" alt="" width="36" height="36"><span>Poiema Bereanos</span></button>
    <nav aria-label="${studyLanguage(['Navegação principal','Main navigation'])}">${destinations.map(([action,pt,en])=>{
      const page = pageActions[action];
      const current = view===page || page==='plans' && view==='plan';
      return `<a class="nav-link ${current?'selected':''}" href="${esc(pageURL(page).href)}" data-action="${action}" ${current?'aria-current="page"':''}>${studyLanguage([pt,en])}</a>`;
    }).join('')}<button class="nav-link" data-action="notes">${studyLanguage(['Caderno','Notebook'])}</button></nav>
    <button class="guide-search-launch" data-action="search">${studyLanguage(['Buscar','Search'])}</button>
    <select class="language-choice" aria-label="Idioma" id="language-choice"><option value="pt" ${ENGLISH?'':'selected'}>Português</option><option value="en" ${ENGLISH?'selected':''}>English</option></select>
  </div></header>`;
}

let browseReading = {bookId:1,chapter:1};
try {
  const stored=JSON.parse(localStorage.getItem('poiema-library'));
  if(stored && Number.isInteger(stored.bookId) && Number.isInteger(stored.chapter))browseReading=stored;
} catch {}
function chapterOptions(reading) {
  return Array.from({length:book(reading.bookId)?.chapters || 1},(_,i)=>`<option value="${i+1}" ${i+1===reading.chapter?'selected':''}>${i+1}</option>`).join('');
}
function browseCover(){
  const first=Object.entries(passageImages).find(([id])=>id.startsWith(key(browseReading)+':1-'));
  return first?.[1] || passageScene(browseReading,{from:1,to:1,title:'',explanation:''});
}
function rememberReading(reading){
  browseReading={bookId:reading.bookId,chapter:reading.chapter};
  try {localStorage.setItem('poiema-library',JSON.stringify(browseReading));}catch{}
}
function refreshBrowseCover() {
  const img=document.querySelector('#browse-cover');
  if(!img)return;
  const scene=browseCover();img.src='./scenes/'+scene.file;img.alt=scene.alt;
  document.querySelector('.catalog-caption strong').textContent=ref(browseReading);
}

function resumePlanCard(item) {
  if (!item) return '';
  const day = nextDay(item), reading = item.days[day].readings[nextReading(item,day)];
  return `<section class="guide-active-plan">
    <div><small>${studyLanguage(['Plano em andamento','Plan in progress'])} · ${day+1}/${item.days.length}</small><h2>${esc(planCopy(item).title)}</h2>
    <p>${studyLanguage(['Próxima leitura','Next reading'])} · ${esc(ref(reading))}</p></div>
    <div class="guide-active-progress"><progress max="${totalReadings(item)}" value="${completed(item)}" aria-label="${studyLanguage(['Progresso do plano','Plan progress'])}"></progress>
    <button class="guide-passage" data-action="open-plan" data-id="${esc(item.id)}">${studyLanguage(['Retomar plano','Resume plan'])} →</button></div></section>`;
}

function home() {
  const current = currentPlan();
  const covers = {aprofundar:'passage-1-1-1-5.webp',jesus:'passage-43-1-1-5.webp',marcos:'passage-41-1-1-8.webp',salmos:'passage-19-23-1-2.webp',historia:'creation.jpg'};
  return `<main class="home-wrap guide-home">
    ${view === 'home' ? window.PoiemaGuide.start(resumePlanCard(current)) : ''}
    ${view === 'bible' ? `<section class="guide-library-header" id="biblia"><div><h1>${studyLanguage(['Bíblia','Bible'])}</h1>${window.PoiemaGuide.quickSearch()}
      <form id="chapter-browser"><label>Livro<select name="bookId">${['old','new'].map(t=>`<optgroup label="${t==='old'?'Antigo Testamento':'Novo Testamento'}">${books.filter(b=>b.testament===t).map(b=>`<option value="${b.id}" ${b.id===browseReading.bookId?'selected':''}>${esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Capítulo<select name="chapter">${chapterOptions(browseReading)}</select></label><button class="guide-passage" type="submit">${studyLanguage(['Ler o capítulo','Read the chapter'])} ↗</button></form></div>
      <button type="submit" form="chapter-browser" class="guide-library-cover"><img id="browse-cover" src="./scenes/${esc(browseCover().file)}" alt="${esc(browseCover().alt)}" width="1280" height="720"><span class="catalog-caption"><small>${studyLanguage(['Ilustração gerada por IA','AI-generated illustration'])}</small><strong>${esc(ref(browseReading))}</strong></span></button></section>
      ${window.PoiemaGuide.bibleIndex()}` : ''}
    ${view === 'plans' ? `<section class="guide-plans guide-plan-home" id="planos">
      <div class="section-heading"><h1>${studyLanguage(['Planos de leitura','Reading plans'])}</h1><a class="guide-passage" href="#criar">Montar meu plano →</a></div>
      ${resumePlanCard(current)}
      ${state.plans.some(item=>item!==current) ? `<section class="guide-saved-plans"><h2>${studyLanguage(['Seus planos','Your plans'])}</h2><div class="plan-list">${state.plans.filter(item=>item!==current).map(item => `<button class="plan-row" data-action="open-plan" data-id="${esc(item.id)}"><span class="plan-row-main"><strong>${esc(planCopy(item).title)}</strong><small>${completed(item)} / ${totalReadings(item)} ${studyLanguage(['capítulos','chapters'])}</small></span><span class="plan-row-progress">${percentage(item)}%</span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : ''}
      <h2>${studyLanguage(['Escolha um plano','Choose a plan'])}</h2>
      <div class="reading-plans">${starterPlans.map(item => `<button class="reading-plan" data-action="start-starter" data-key="${item.key}"><img src="./scenes/${covers[item.key]}" alt="" width="112" height="84" loading="lazy"><span><small>${item.refs.length} ${studyLanguage(['dias','days'])}</small><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></span><b aria-hidden="true">↗</b></button>`).join('')}</div>
    </section>

    <section class="section creation" id="criar"><div class="section-heading"><div><h2>Montar meu plano</h2></div></div>
      <div class="creation-grid"><form id="book-plan" class="creation-card"><label for="book-select">Livro da Bíblia</label><select id="book-select" name="bookId">${books.map(item => `<option value="${item.id}" ${item.id===43?'selected':''}>${esc(item.name)} · ${item.chapters} cap.</option>`).join('')}</select><label for="pace-select">Ritmo</label><select id="pace-select" name="pace"><option value="1">1 capítulo por dia</option><option value="2">2 capítulos por dia</option><option value="3">3 capítulos por dia</option></select><button class="button button-dark full" type="submit">Criar plano <span aria-hidden="true">→</span></button></form>
      ${aiReady ? `<form id="ai-plan" class="creation-card"><div class="creation-icon">✳</div><h3>Um tema, com ajuda da IA</h3><p>Peça uma trilha curta sobre o assunto que quer estudar.</p><label for="theme-input">O que quer entender melhor?</label><input id="theme-input" name="theme" placeholder="Ex.: fé em tempos difíceis" maxlength="160" value="${esc(draftTheme)}" required><label for="days-select">Duração</label><select id="days-select" name="days"><option value="5">5 dias</option><option value="7" selected>7 dias</option><option value="10">10 dias</option><option value="14">14 dias</option></select><button class="button button-outline full" type="submit" ${busy==='plan'||!aiReady?'disabled':''}>${busy==='plan'?'Preparando plano…':'Criar com IA'} <span aria-hidden="true">✦</span></button><small class="form-note">${aiReady?'A IA escolhe um capítulo por dia. Você pode revisar a sequência.':hosted?'Novas gerações estão desativadas. A biblioteca preparada continua disponível.':'Novas gerações estão desativadas. A biblioteca preparada continua disponível.'}</small></form>` : ''}</div>
    </section>` : ''}
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

function studyRoom(reading, studySection = studyTab, movement = selectedMovement) {
  const guide = prebuiltStudies[key(reading)];
  if (!guide) return '';
  const tabs = [['panorama','Panorama'],['contexto','História e mapa'],['analise','Análise bíblica'],['vozes','Comentários'],['pratica','Reflexão']];
  let content = '';
  if (studySection === 'panorama') content = `<div class="deep-two"><div><span class="eyebrow">IDEIA CENTRAL</span><p class="thesis">${esc(guide.thesis)}</p><div class="movement-list">${guide.movements.map((part,index) => `<button class="movement ${index===movement?'active':''}" data-action="movement" data-index="${index}"><span>0${index+1}</span><strong>${esc(part.label)}</strong><small>v. ${part.from}–${part.to}</small></button>`).join('')}</div></div><div class="movement-detail"><span class="eyebrow">ACOMPANHE O TEXTO</span><h3>${esc(guide.movements[movement]?.label || guide.movements[0].label)}</h3><p>${esc(guide.movements[movement]?.detail || guide.movements[0].detail)}</p><button class="text-link" data-action="focus-verse" data-verse="${guide.movements[movement]?.from || 1}">Ir ao versículo ${guide.movements[movement]?.from || 1} →</button></div></div>`;
  if (studySection === 'contexto') content = `<div class="deep-two"><div><span class="eyebrow">CONTEXTO HISTÓRICO E LITERÁRIO</span><p class="deep-prose">${esc(guide.context)}</p><div class="source-note">Os locais e datas não especificados no capítulo são tratados com cautela. A imagem é uma ambientação artística; consulte o mapa interativo para explorar coordenadas.</div></div><div><span class="eyebrow">AMBIENTAÇÃO VISUAL</span>${studyMap(guide, reading)}<p class="map-caption">Ilustração temática gerada por IA. Os lugares com coordenadas estão no mapa interativo da biblioteca.</p></div></div>`;
  if (studySection === 'analise') content = `<div class="deep-two"><div><span class="eyebrow">ANÁLISE BÍBLICA</span><p class="deep-prose">${esc(guide.theology)}</p><h3 class="deep-subhead">Conexões nas Escrituras</h3><div class="crossrefs">${guide.crossRefs.map(reference => `<span>${esc(reference)}</span>`).join('')}</div></div><div><span class="eyebrow">TRÊS ÂNGULOS DE LEITURA</span><div class="lens-list">${guide.lenses.map((lens,index) => `<div><b>0${index+1}</b><p>${esc(lens)}</p></div>`).join('')}</div></div></div>`;
  if (studySection === 'vozes') content = `<div><span class="eyebrow">LEITURAS PROTESTANTES CLÁSSICAS</span><p class="deep-prose">Estas sínteses originais apresentam ênfases de dois comentaristas históricos. Leia as notas completas nas fontes para avaliar o argumento de cada um.</p><div class="voice-grid">${guide.voices.map(voice => `<article class="voice-card"><span>COMENTÁRIO CLÁSSICO</span><h3>${esc(voice.author)}</h3><p>${esc(voice.summary)}</p><a href="https://bible.helloao.org/api/c/${esc(voice.slug)}/${esc(book(reading.bookId)?.commentaryId)}/${reading.chapter}.simple.json" target="_blank" rel="noopener noreferrer">Ler comentário original (inglês) ↗</a></article>`).join('')}</div><div class="source-note">Os comentários apoiam a investigação. Compare cada interpretação com o capítulo e observe onde o texto permite mais de uma leitura.</div></div>`;
  if (studySection === 'pratica') content = `<div class="deep-two"><div><span class="eyebrow">PERGUNTAS PARA ESTUDAR</span><ol class="deep-questions">${guide.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><div class="practice-card"><span class="eyebrow">COLOQUE EM PRÁTICA</span><p>${esc(guide.practice)}</p><button class="button button-light" data-action="focus-notes">Escrever nas minhas anotações →</button></div></div>`;
  return `<section class="deep-study" id="estudo-completo" aria-label="Estudo pronto de ${esc(ref(reading))}"><div class="deep-head"><div><span class="eyebrow">ESTUDO PRONTO · ${esc(ref(reading).toUpperCase())}</span><h2>${esc(guide.title)}</h2><p>Uma leitura original com o texto bíblico no centro, contexto e caminhos para aprofundar.</p><button class="text-link" data-action="back-to-reading">← Voltar ao capítulo</button></div><span class="deep-theme">${esc(guide.theme)}</span></div><div class="deep-tabs" role="group" aria-label="Seções do estudo">${tabs.map(([id,label]) => `<button class="deep-tab ${studySection===id?'active':''}" data-action="study-tab" data-tab="${id}" aria-pressed="${studySection===id}">${label}</button>`).join('')}</div><div class="deep-body">${content}</div><div class="deep-resources"><strong>Continue estudando</strong><span>Estudo original deste app, baseado nas passagens indicadas. Guias externos para ampliar a leitura:</span>${guide.resources.map(resource => `<a href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ↗</a>`).join('')}</div></section>`;
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
  const book = bookImages[reading.bookId];
  let id;
  // The English library stores the shared theme each part used before books had covers;
  // only the narrative-specific ones still win over the book's own cover.
  if (key(reading) === '43:4') id = part.from >= 43 ? 'cana' : part.from >= 27 ? 'harvest' : 'well';
  else if (['creation','resurrection','storm'].includes(part.sceneId)) id = part.sceneId;
  else if (reading.bookId === 1 && reading.chapter <= 2) id = 'creation';
  else if (reading.bookId >= 40 && reading.bookId <= 44 && /ressurre|tumulo|sepulcro/.test(text)) id = 'resurrection';
  else if (reading.bookId >= 40 && reading.bookId <= 44 && /tempestade|barco|naufrag/.test(text)) id = 'storm';
  // Each book has its own cover; the shared themes remain only as a fallback.
  else if (book) return { id: `book-${reading.bookId}`, ...book, thematic: false, book: true };
  else if (part.sceneId && Object.hasOwn(visualScenes,part.sceneId)) id = part.sceneId;
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
let sceneAudio = null;
function stopLocalNarration() {
  narrationToken++;
  narrationActive = false;
  sceneAudio?.pause();
  sceneAudio = null;
}
function narratePassage(index, entireChapter = false) {
  const reading = plan()?.days[activeDay]?.readings[activeReading];
  if (!reading || key(reading) !== '43:4' || !libraryData?.study?.outline[index]) return;
  stopLocalNarration();
  const token = narrationToken;
  function playScene(partIndex) {
    visualPart = partIndex; narrationActive = true; libraryTab = 'panorama'; render();
    sceneAudio = new Audio('./media/john4/' + partIndex + '.mp3');
    sceneAudio.onended = () => {
      if (token !== narrationToken) return;
      if (entireChapter && partIndex + 1 < libraryData.study.outline.length) playScene(partIndex + 1);
      else { stopLocalNarration(); render(); }
    };
    sceneAudio.play().catch(() => {
      if (token === narrationToken) { stopLocalNarration(); notify('O áudio não carregou. Tente ouvir novamente.'); }
    });
  }
  playScene(index);
}
function visualJourney(reading, data) {
  const parts = data.study.outline;
  const index = Math.min(visualPart, parts.length - 1);
  const part = parts[index];
  const scene = passageScene(reading, part);
  return `<section class="visual-journey" aria-label="Explorar as partes do capítulo"><div class="journey-stage ${sceneMotion?'motion-enabled':''}"><img class="journey-image" src="./scenes/${scene.file}" alt="${esc(scene.alt)}" width="1440" height="810" decoding="async"><div class="journey-caption"><span>${esc(ref(reading))} · v. ${part.from}–${part.to}</span><h3>${esc(part.title)}</h3>${scene.look?`<p class="scene-look"><span>${studyLanguage(['Observe','Notice'])}</span>${esc(scene.look)}</p>`:''}<div class="journey-controls">${key(reading)==='43:4' ? narrationActive ? '<button data-action="stop-narration">Parar áudio</button>' : '<button data-action="narrate-part">Ouvir cena</button><button data-action="narrate-chapter">Ouvir todas as cenas</button>' : ''}<button data-action="scene-motion" aria-pressed="${sceneMotion}">${sceneMotion?'Pausar movimento':'Ativar movimento'}</button><button data-action="focus-verse" data-verse="${part.from}">Ler esta passagem ↓</button></div></div></div><p class="scene-disclosure">${scene.book?studyLanguage(['Arte do livro','Book art']):scene.thematic?'Ambientação temática':'Cena interpretativa'} gerada por IA · ${esc(scene.title)} · Ilustração artística, sem precisão arqueológica.</p><div class="journey-parts" role="group" aria-label="Partes do capítulo">${parts.map((p,i)=>{const image=passageScene(reading,p);return `<button data-action="visual-part" data-index="${i}" aria-pressed="${index===i}"><img src="./scenes/${image.file}" alt="" loading="lazy" width="160" height="90"><span><small>v. ${p.from}–${p.to}</small><strong>${esc(p.title)}</strong></span></button>`;}).join('')}</div><div class="journey-explanation" aria-live="polite"><p>${esc(part.explanation)}</p></div></section>`;
}
function connectionExplorer(reading, data, verseFilter = connectionVerse) {
  const verses = [...new Set(data.crossRefs.map(link=>link.fromVerse))].sort((a,b)=>a-b);
  const links = data.crossRefs.map((link,index)=>({...link,index})).filter(link=>!verseFilter || link.fromVerse===verseFilter);
  return `<section class="connection-explorer" aria-label="Rede de referências cruzadas"><div class="connection-explorer-head"><div><h3>Um texto abre outros caminhos</h3><p>Escolha um versículo na rede para comparar as passagens.</p></div><div class="connection-filters" role="group" aria-label="Filtrar pelo versículo de origem"><button data-action="connection-filter" data-verse="0" aria-pressed="${!verseFilter}">Todos</button>${verses.map(v=>`<button data-action="connection-filter" data-verse="${v}" aria-pressed="${verseFilter===v}">v. ${v}</button>`).join('')}</div></div><div class="verse-network"><svg class="verse-edges" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">${links.map((link,i)=>{const left=i%2===0;const row=Math.floor(i/2);const y=(row+1)*440/(Math.ceil(links.length/2)+1);return `<path d="M 500 220 C ${left?330:670} 220, ${left?330:670} ${y}, ${left?155:845} ${y}" pathLength="1" style="--edge-delay:${i*50}ms"/>`;}).join('')}</svg><div class="verse-origin"><span>Você está lendo</span><strong>${esc(ref(reading))}${verseFilter?`:${verseFilter}`:''}</strong><small>Investigue cada ligação</small></div>${links.map((link,i)=>{const rows=Math.ceil(links.length/2);return `<button class="verse-node ${i%2===0?'node-left':'node-right'}" style="--node-y:${(Math.floor(i/2)+1)*100/(rows+1)}%;--node-delay:${i*45}ms" data-action="crossref" data-index="${link.index}"><small>${esc(ref(reading))}:${link.fromVerse} ↗</small><strong>${esc(book(link.bookId)?.name)} ${link.chapter}:${link.verse}</strong><span>Abrir comparação</span></button>`;}).join('')}</div></section>`;
}

function historicalDossier(reading, profile = bookProfileData) {
  const dossier = profile?.dossier;
  if (!dossier) return '<p class="library-empty">O dossiê histórico deste livro está em preparação. O contexto específico do capítulo está em Panorama.</p>';
  const sources = profile.dossierSources || [];
  const labels = { 'explicit-source': 'Afirmação da fonte', interpretation: 'Interpretação', debated: 'Questão debatida' };
  return `<section class="historical-dossier"><header><h3>O mundo de ${esc(book(reading.bookId)?.name)}</h3><p>Contexto do livro para acompanhar este capítulo. As fontes consultadas cobrem temas e passagens selecionados; cada observação indica seu apoio.</p></header><div class="era-pair"><article><span>Tempo da narrativa</span><p>${esc(dossier.narratedEra)}</p></article><article><span>Composição e transmissão</span><p>${esc(dossier.compositionEra)}</p></article></div><nav class="dossier-jump" aria-label="Temas do contexto"><a href="#context-politics">Reinados e potências</a><a href="#context-customs">Cultura e costumes</a><a href="#context-language">Linguagem</a><a href="#context-timeline">Linha do tempo</a></nav>${[['politics','Reinados, povos e potências'],['customs','Cultura, costumes e vida cotidiana'],['language','Linguagem e formas de expressão'],['timeline','Marcos no tempo']].map(([section,label])=>`<section class="context-section" id="context-${section}"><h3>${label}</h3>${dossier[section].length?dossier[section].map((item,i)=>`<details class="context-detail" ${i===0?'open':''}><summary><strong>${esc(item.title)}</strong><span>${esc(labels[item.certainty])}</span></summary><div><p>${esc(item.detail)}</p><p class="context-impact"><strong>O que observar na leitura</strong>${esc(item.readingImpact)}</p>${item.reference?`<p class="context-reference">Passagem: ${esc(item.reference)}</p>`:''}<div class="context-sources">${item.sourceIds.map(id=>{const source=sources.find(s=>s.id===id);return source?`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`:'';}).join('')}</div></div></details>`).join(''):'<p class="library-footnote">As notas consultadas não oferecem detalhe suficiente sobre este tema.</p>'}</section>`).join('')}<section class="context-investigation"><h3>Perguntas para aprofundar</h3><ol>${dossier.investigation.map(q=>`<li>${esc(q)}</li>`).join('')}</ol></section><div class="library-limits"><strong>Alcance e limites das fontes</strong><p>${esc(dossier.limits)}</p><p>“Afirmação da fonte” identifica o que um comentário secundário afirma. A classificação não equivale a comprovação histórica independente. Síntese com IA; adaptações das notas Tyndale sob CC BY-SA 4.0.</p></div></section>`;
}
function narratedFilm(reading) {
  if (key(reading) !== '43:4') return '';
  return `<section class="narrated-film"><h3>João 4, uma jornada narrada</h3><p>Ouça o movimento da passagem enquanto explora as cenas.</p><video controls playsinline preload="none" poster="./scenes/well.jpg" aria-label="Jornada narrada de João capítulo quatro"><source src="./media/43-4.mp4" type="video/mp4"><track kind="captions" src="${ENGLISH?'./en/43-4.vtt':'./media/43-4.vtt'}" srclang="${ENGLISH?'en':'pt-BR'}" label="${ENGLISH?'English':'Português'}" default>Seu navegador não conseguiu reproduzir este vídeo.</video><p class="scene-disclosure">Voz sintética gerada por IA. Montagem de ilustrações geradas por IA com movimento de câmera. As cenas são interpretações artísticas.</p><a href="${ENGLISH?'./en/43-4-transcript.txt':'./media/43-4-transcript.txt'}" target="_blank" rel="noopener">Ler a transcrição completa ↗</a><p class="library-footnote">O roteiro acompanha a análise e as fontes identificadas neste capítulo. Volte ao texto para conferir cada observação.</p></section>`;
}

function chapterStudyPanel(reading, data, profileData, section) {
  const s = data.study;
  const guideUrl = bookGuides[reading.bookId];
  let content = '';
  if (section === 'panorama') content = `<div class="library-columns"><div><span class="eyebrow">LEITURA DO CAPÍTULO</span><p class="library-lead">${esc(s.overview)}</p><h3>Movimento do texto</h3><div class="library-outline">${s.outline.map((part,index) => `<button data-action="focus-verse" data-verse="${part.from}"><span>${String(index+1).padStart(2,'0')}</span><div><strong>${esc(part.title)}</strong><small>Versículos ${part.from}–${part.to}</small><p>${esc(part.explanation)}</p></div></button>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">CONTEXTO</span><p>${esc(s.context)}</p><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Ver guia do livro no BibleProject ↗</a></aside></div>`;
  if (section === 'contexto') content = historicalDossier(reading,profileData);
  if (section === 'filme') content = narratedFilm(reading);
  if (section === 'livro') {
    const profile = profileData?.profile;
    content = profile ? `<div class="library-columns"><div><span class="eyebrow">VISÃO DE ${esc(book(reading.bookId)?.name.toUpperCase())}</span><p class="library-lead">${esc(profile.summary)}</p><h3>Estrutura do livro</h3><div class="book-structure">${profile.structure.map(part => `<div><span>CAP. ${part.from}${part.to>part.from?`–${part.to}`:''}</span><strong>${esc(part.label)}</strong><p>${esc(part.description)}</p></div>`).join('')}</div><h3>Temas para acompanhar</h3><div class="book-themes">${profile.themes.map(theme => `<span>${esc(theme)}</span>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">CENÁRIO E LEITURA</span><p>${esc(profile.setting)}</p><strong>Enquanto lê</strong><ul class="book-tips">${profile.readingKeys.map(tip => `<li>${esc(tip)}</li>`).join('')}</ul><strong>Questões em aberto</strong><p>${esc(profile.cautions)}</p><a href="${esc(profileData.source.url)}" target="_blank" rel="noopener noreferrer">Consultar fonte do panorama ↗</a><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Guia visual do BibleProject ↗</a></aside></div>` : `<p class="library-empty">O panorama deste livro está sendo preparado. <a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">Ver guia do BibleProject ↗</a></p>`;
  }
  if (section === 'estudiosos') content = `<div><span class="eyebrow">VOZES PARA CONFERIR</span><p class="library-intro">Sínteses em português produzidas com IA a partir de excertos das fontes. São paráfrases, não citações dos autores. Confira a nota original e o versículo.</p><div class="scholar-grid">${s.scholarViews.map(view => { const source = data.sources.find(item => item.id === view.sourceId); return `<article class="scholar-card"><span>v. ${view.verse}</span><h3>${esc(source?.author || view.sourceId)}</h3><p>${esc(view.insight)}</p><a href="${esc(source?.url || '#')}" target="_blank" rel="noopener noreferrer">Conferir comentário original ↗</a></article>`; }).join('')}</div><div class="library-limits"><strong>Limites desta análise</strong><p>${esc(s.uncertainty)}</p></div></div>`;
  if (section === 'pratica') content = `<div class="library-columns"><div><span class="eyebrow">PERGUNTAS PARA INVESTIGAR</span><ol class="library-questions">${s.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><aside class="library-aside library-practice"><span class="eyebrow">PRÁTICA</span><p>${esc(s.practice)}</p><button class="button button-dark" data-action="focus-notes">Escrever nas minhas anotações →</button></aside></div>${window.PoiemaNotes?.chapterBlock?.(reading)||''}`;
  return content;
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
const fieldNotes = {
  '8:2': [{verses:[2,7,15,16], terms:/respig\p{L}*|espigas?|glean\p{L}*/iu,
    original:['לָקַט','lāqaṭ','he',['colher o que ficou no campo','to glean what remains in a field']],
    question:['Por que Rute podia recolher espigas?','Why could Ruth glean here?'],
    answer:['Levítico orienta o agricultor a deixar parte da colheita ao pobre e ao estrangeiro. Releia as ordens de Boaz em Rute 2:15–16. O que ele oferece além de permitir que Rute trabalhe ali?','Leviticus tells landowners to leave some of the harvest for the poor and the foreigner. Reread Boaz’s instructions in Ruth 2:15–16. What does he offer beyond permission to glean?'],
    link:[3,19,9],end:10, reason:['O costume da colheita em Levítico 19:9–10 esclarece o pedido de Rute.','The harvest instructions in Leviticus 19:9–10 explain Ruth’s request.']}],
  '41:1': [{verses:[2],terms:/mensageiro|messenger/iu,
    original:['ἄγγελος','ángelos','gr',['mensageiro','messenger']],
    question:['Por que Marcos começa com um mensageiro?','Why does Mark open with a messenger?'],
    answer:['Leia a promessa em Malaquias e depois observe como Marcos apresenta João nos versículos 4–5. Quem prepara o caminho na narrativa?','Read the promise in Malachi, then look at how Mark introduces John in verses 4–5. Who prepares the way in the narrative?'],
    link:[39,3,1],reason:['Compare o mensageiro enviado e o caminho preparado nas duas passagens.','Compare the messenger being sent and the way being prepared in both passages.']}],
  '19:1': [{verses:[2],terms:/medita\p{L}*/iu,question:['Por que o poeta aproxima dia e noite?','Why does the poet pair day with night?'],answer:['Leia as duas linhas em voz baixa. A primeira fala do prazer na instrução. A segunda mostra como esse prazer ocupa o tempo do salmista.','Read both lines aloud. The first describes delight in instruction. The second shows how that delight fills the psalmist’s time.']}],
  '45:8': [{verses:[1],terms:/portanto|therefore/iu,question:['Que argumento leva Paulo a essa conclusão?','What argument leads Paul to this conclusion?'],answer:['Volte ao fim do capítulo 7. Observe a pergunta do versículo 24 e a resposta que começa no 25, antes de reler a abertura do capítulo 8.','Return to the end of chapter 7. Notice the question in verse 24 and the answer beginning in verse 25 before rereading chapter 8.'],link:[45,7,25],reason:['Leia a conclusão do argumento anterior.','Read the conclusion of the preceding argument.']}]
};
const studyLanguage = pair => pair[ENGLISH ? 1 : 0];
function fieldNote(data, n) {return fieldNotes[key(data)]?.find(entry=>entry.verses.includes(n));}
function contentWords(text) {
  const common = /^(?:about|after|again|among|before|being|chapter|could|first|people|shall|their|there|these|those|through|verse|which|would|ainda|antes|assim|aquele|aquela|capítulo|coisas|como|contra|depois|disse|entre|então|mesmo|muito|porque|sobre|todos|todas|versículo)$/iu;
  return (text.match(/[\p{L}]{5,}/gu)||[]).filter(w=>!common.test(w));
}
function highlightedText(text,word) {
  if(!word)return esc(text);
  const start=text.toLocaleLowerCase().indexOf(word.toLocaleLowerCase());
  return start<0?esc(text):esc(text.slice(0,start))+'<mark>'+esc(text.slice(start,start+word.length))+'</mark>'+esc(text.slice(start+word.length));
}
function readingPrompt(id) {
  if ([18,19,20,21,22,25].includes(id)) return studyLanguage(['Leia duas linhas seguidas. Qual imagem ou contraste a segunda acrescenta à primeira?','Read two lines together. What image or contrast does the second add to the first?']);
  if (id>=45 && id<=65) return studyLanguage(['Localize a afirmação principal. Como a frase anterior prepara o argumento?','Find the main claim. How does the preceding sentence prepare the argument?']);
  if ((id>=23 && id<=39)||id===66) return studyLanguage(['Quem fala e a quem? Procure no trecho uma imagem que dê força à sua mensagem.','Who is speaking, and to whom? Find an image in the passage that gives the message force.']);
  return studyLanguage(['Quem age ou fala neste trecho? Releia o versículo seguinte e observe o que muda.','Who acts or speaks here? Read the following verse and notice what changes.']);
}
function discoveryAt(data, number) {
  return data?.discoveries?.find(entry => entry.verse === number);
}
function wordForm(entry) {
  return `<bdi lang="${entry.language}" dir="${entry.language==='grc'?'ltr':'rtl'}">${esc(entry.form)}</bdi>`;
}
function wordDiscovery(entry) {
  if (!entry) return '';
  const languages={he:['Hebraico','Hebrew'],arc:['Aramaico','Aramaic'],grc:['Grego','Greek']};
  const language=studyLanguage(languages[entry.language]);
  const glossary=ENGLISH ? entry.gloss : entry.pt || entry.gloss;
  const source='https://biblehub.com/'+(entry.language==='grc'?'greek/':'hebrew/')+entry.strong.slice(1)+'.htm';
  let parallel='';
  if(entry.parallel) {
    const [bookId,chapter,verse]=entry.parallel;
    const other=ENGLISH ? entry.parallelGloss : entry.parallelPt || entry.parallelGloss;
    parallel=`<details data-parallel-book="${bookId}" data-chapter="${chapter}" data-number="${verse}"><summary>${esc(studyLanguage(['A mesma palavra em','The same word in']))} ${esc(ref({bookId,chapter}))}:${verse}</summary><p aria-live="polite"></p><small data-link-reason>${esc(studyLanguage(['A concordância registra o mesmo termo. Neste segundo versículo, o interlinear o traduz por','The concordance indexes the same term. In this second verse, the interlinear renders it as']))} “${esc(other)}”.${!ENGLISH ? ` <span lang="en">(BSB: ${esc(entry.parallelGloss)})</span>` : ''}</small></details>`;
  }
  return `<section class="lexical-discovery"><small>${esc(language)} · v. ${entry.verse}</small><h4>${wordForm(entry)} <span>${esc(entry.translit)}</span></h4><p>${esc(studyLanguage(['Sentido nesta passagem','Rendering in this passage']))} · <strong>${esc(glossary)}</strong>${!ENGLISH ? ` <small lang="en">BSB · ${esc(entry.gloss)}</small>` : ''}</p>${parallel}<div class="discovery-sources"><a href="${source}" target="_blank" rel="noopener">Strong ${esc(entry.strong)} ↗</a><a href="https://berean.bible/downloads.htm" target="_blank" rel="noopener">${esc(studyLanguage(['Interlinear Bereano','Berean interlinear']))} ↗</a></div></section>`;
}
function discoveryAnchor(text, entry) {
  if(!entry)return '';
  const gloss=ENGLISH?entry.gloss:entry.pt;
  const candidates=new Set((gloss || '').toLocaleLowerCase().match(/[\p{L}]{3,}/gu) || []);
  const stop=new Set(['the','and','for','his','her','was','are','from','with','uma','seu','sua','dos','das','por','que','com','para','ele','ela','eles','elas']);
  return (text.match(/[\p{L}]+/gu)||[]).filter(w=>candidates.has(w.toLocaleLowerCase())&&!stop.has(w.toLocaleLowerCase())).sort((a,b)=>b.length-a.length)[0] || '';
}
function interactiveVerse(number, text, data) {
  text=String(text || '');
  const note=data && fieldNote(data,number);
  const part=data?.study?.outline?.find(p=>number===p.from);
  const words=new Set(contentWords(part?.title || '').map(w=>w.toLowerCase()));
  const discovery=discoveryAt(data,number);
  const anchor=note && text.match(note.terms)?.[0] || discoveryAnchor(text,discovery) || contentWords(text).find(w=>words.has(w.toLowerCase()));
  const content = `<sup>${number}</sup> <span class="verse-text">${highlightedText(text,anchor)}</span>`;
  if (!data?.study) return `<p class="verse">${content}</p>`;
  return `<button type="button" class="verse verse-trigger" data-study-verse="${number}" aria-expanded="false">${content}${discovery ? ` <small class="discovery-tag">${esc(studyLanguage(['Palavra original','Original word']))}</small>` : ''}<span aria-hidden="true" class="verse-plus">＋</span></button>`;
}

const notebookKey='poiema-verse-notebook';
function notebookEntries(){
  try{return JSON.parse(localStorage.getItem(notebookKey)) || {};}catch{return {};}
}
function discoveryURL(reading,verse){
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set('lang',ENGLISH?'en':'pt');
  url.hash='study='+[reading.bookId,reading.chapter,verse].join('.');
  return url;
}
function discoveryTools(reading,verse){
  const id=[reading.bookId,reading.chapter,verse].join('.');
  const entry=notebookEntries()[id];
  return `<div class="discovery-tools" data-verse-key="${id}"><button type="button" data-share-verse>${studyLanguage(['Compartilhar estudo','Share study'])}</button><details><summary>${entry?studyLanguage(['Minha anotação','My note']):studyLanguage(['Guardar descoberta','Save discovery'])}</summary><form class="discovery-editor">${reading.study?.questions?.[0]?`<p>${esc(reading.study.questions[0])}</p>`:''}<label>${studyLanguage(['Minha observação','My observation'])}<textarea maxlength="4000" rows="3">${esc(entry?.note || '')}</textarea></label><small>${studyLanguage(['Caderno salvo neste navegador.','Notebook saved in this browser.'])}</small><button>${studyLanguage(['Salvar no caderno','Save to notebook'])}</button></form></details><span role="status"></span></div>`;
}
document.addEventListener('submit',event=>{
  const form=event.target.closest('.discovery-editor');
  if(!form)return;
  event.preventDefault();
  const tools=form.closest('[data-verse-key]'), id=tools.dataset.verseKey;
  const [bookId,chapter,verse]=id.split('.').map(Number);
  const entries=notebookEntries();
  entries[id]={...entries[id],bookId,chapter,verse,note:form.querySelector('textarea').value.trim(),updated:Date.now()};
  try{
    localStorage.setItem(notebookKey,JSON.stringify(entries));
    window.PoiemaGuide?.savePosition(bookId,chapter,verse);
    tools.querySelector('summary').textContent=studyLanguage(['Minha anotação','My note']);
    tools.querySelector('[role=status]').textContent=studyLanguage(['Descoberta salva.','Discovery saved.']);
  }catch{tools.querySelector('[role=status]').textContent=studyLanguage(['O navegador não conseguiu salvar.','Your browser could not save this note.']);}
});
document.addEventListener('click',async event=>{
  const saved=event.target.closest('[data-notebook-open]');
  if(saved && !event.metaKey && !event.ctrlKey && !event.shiftKey){
    event.preventDefault();
    const [bookId,chapter,verse]=saved.dataset.notebookOpen.split('.').map(Number);
    await enterLibraryPortal(saved,{bookId,chapter},{verse});return;
  }
  const share=event.target.closest('[data-share-verse]');
  if(!share)return;
  const tools=share.closest('[data-verse-key]'),[bookId,chapter,verse]=tools.dataset.verseKey.split('.').map(Number);
  const url=discoveryURL({bookId,chapter},verse).href;
  const status=tools.querySelector('[role=status]');
  if(navigator.share){
    try{await navigator.share({title:ref({bookId,chapter})+':'+verse+' · Poiema Bereanos',url});return;}
    catch(error){if(error.name==='AbortError')return;}
  }
  try{await navigator.clipboard.writeText(url);status.textContent=studyLanguage(['Link copiado.','Link copied.']);}
  catch{status.innerHTML=`<label>${studyLanguage(['Copiar link','Copy link'])}<input readonly value="${esc(url)}"></label>`;status.querySelector('input').select();}
});

function verseInsight(data, number, verses, inPortal) {
  const place=inPortal && data.places?.find(p=>p.verses?.includes(number));
  const part = data.study.outline.find(p => p.from <= number && p.to >= number);
  const notes = data.study.scholarViews.filter(n => n.verse === number);
  const links = data.crossRefs.filter(r => r.fromVerse === number);
  const note=fieldNote(data,number);
  if(note?.link) {
    const [bookId,chapter,verse]=note.link;
    const i=links.findIndex(r=>r.bookId===bookId && r.chapter===chapter && r.verse===verse);
    if(i>=0)links.splice(i,1);
    links.unshift({bookId,chapter,verse,end:note.end,reason:studyLanguage(note.reason)});
  }
  const sources = data.sources || [];
  return `<div class="verse-insight"><small>Estudo com IA</small>
    ${note?`<h4>${esc(studyLanguage(note.question))}</h4><p>${esc(studyLanguage(note.answer))}</p>`:''}
    ${discoveryTools(data,number)}
    ${wordDiscovery(discoveryAt(data,number))}
    ${note?.original ? `<details><summary>${esc(studyLanguage(['Palavra original','Original word']))}</summary><p><bdi lang="${note.original[2]==='he'?'he':'grc'}">${esc(note.original[0])}</bdi> · ${esc(note.original[1])} · ${esc(studyLanguage(note.original[3]))}</p></details>` : ''}
    ${part ? `<h4>${esc(part.title)}</h4><small>Contexto do trecho · v. ${part.from}–${part.to}</small><p>${esc(part.explanation)}</p>` : ''}
    ${notes.map(n => { const source = sources.find(s => s.id === n.sourceId);
      return `<div class="verse-comment"><strong>${source ? `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.author)} ↗</a>` : esc(n.sourceId)}</strong><p>${esc(n.insight)}</p></div>`;
    }).join('')}
    ${links.map(r => `<details data-parallel-book="${r.bookId}" data-chapter="${r.chapter}" data-number="${r.verse}" data-end="${r.end || r.verse}"><summary>${esc(ref(r))}:${r.verse}${r.end ? '–'+r.end : ''}</summary><p aria-live="polite"></p><small data-link-reason>${esc(r.reason || '')}</small></details>`).join('')}
    <details><summary>${esc(studyLanguage(['Investigar o texto','Investigate the text']))}</summary><p class="discovery-prompt">${esc(readingPrompt(data.bookId))}</p>${[number-1,number,number+1].filter(n=>verses?.[n]).map(n=>`<p class="investigation-line"><sup>${n}</sup> ${esc(verses[n])}</p>`).join('')}${data.study.questions?.[0]?`<p>${esc(data.study.questions[0])}</p>`:''}</details>
    ${place?`<button data-p="verse-place" data-place="${esc(place.name)}" data-return-verse="${number}">${esc(studyLanguage(['Localizar no mapa','Locate on map']))} · ${esc(atlasLabel(place))}</button>`:''}
    ${data.study.uncertainty?`<details><summary>${esc(studyLanguage(['O que permanece em aberto?','What remains uncertain?']))}</summary><p>${esc(data.study.uncertainty)}</p></details>`:''}
    ${data.study.context ? `<details><summary>Contexto do capítulo</summary><p>${esc(data.study.context)}</p></details>` : ''}
  </div>`;
}

document.addEventListener('click', event => {
  const button = event.target.closest('[data-study-verse]');
  if (!button) return;
  const row = button.closest('.verse-row');
  const previous = row.querySelector('.verse-insight');
  if (previous) { previous.remove(); button.setAttribute('aria-expanded','false'); return; }
  const data = button.closest('passage-portal')?.data || libraryData;
  if (!data) return;
  const portal=button.closest('passage-portal');
  const verse = Number(button.dataset.studyVerse);
  window.PoiemaGuide?.savePosition(data.bookId,data.chapter,verse);
  if(portal){
    portal.returnVerse=verse;
    if(portal.closest('.library-dialog'))history.replaceState(history.state,'',discoveryURL(data,portal.returnVerse));
  }
  const lines=portal ? portal.translation?.verses : chapterData?.verses;
  const verses=lines ? Object.fromEntries(lines.map((text,i)=>[i+1,text])) : portal?.text;
  row.insertAdjacentHTML('beforeend',verseInsight(data,Number(button.dataset.studyVerse),verses,!!portal));
  button.setAttribute('aria-expanded','true');
});

document.addEventListener('toggle', async event => {
  const details = event.target;
  if (!details.open || !details.matches?.('[data-parallel-book]')) return;
  const line = details.querySelector('p');
  line.textContent = 'Carregando texto…';
  const bookText = await portalBookText(Number(details.dataset.parallelBook));
  const chapter = bookText?.[details.dataset.chapter] || {};
  const start=Number(details.dataset.number),end=Number(details.dataset.end)||start;
  const verse=Array.from({length:end-start+1},(_,i)=>chapter[start+i]).filter(Boolean).join(' ');
  line.textContent = verse ? verse + ' · ' + (ENGLISH ? 'World English Bible' : 'Bíblia Portuguesa Mundial') : 'Texto indisponível nesta edição.';
  if(!verse)return;
  const reason=details.querySelector('[data-link-reason]');
  const original=details.closest('.verse-row')?.querySelector('.verse-text')?.textContent || '';
  const words=new Set(contentWords(original).map(w=>w.toLowerCase()));
  const shared=contentWords(verse).find(w=>words.has(w.toLowerCase()));
  if(shared)line.innerHTML=highlightedText(verse,shared)+' · '+(ENGLISH?'World English Bible':'Bíblia Portuguesa Mundial');
  if(!reason.textContent)reason.textContent=shared
    ? studyLanguage(['Observe como os dois versículos usam a palavra','Notice how both verses use the word'])+' “'+shared+'”.'
    : studyLanguage(['Compare quem fala, a quem e em que circunstâncias nos dois textos.','Compare who speaks, to whom, and under what circumstances in the two texts.']);

},true);

function planView() {
  const item = plan();
  if (!item) return home();
  const day = item.days[activeDay];
  const reading = day.readings[activeReading];
  const copy=planCopy(item,activeDay);
  const currentKey = key(reading);
  const study = item.studies[currentKey];
  const guide = prebuiltStudies[currentKey];
  const isDone = item.done.includes(currentKey);
  const isComplete = completed(item)===totalReadings(item);
  return `<main class="workspace-wrap"><button class="back-link" data-action="browse-plans"><span aria-hidden="true">←</span> Todos os planos</button>
    <section class="workspace-head"><div><span class="eyebrow">${studyLanguage(['Dia','Day'])} ${activeDay+1} / ${item.days.length}</span><h1>${esc(copy.title)}</h1><p>${esc(copy.description)}</p></div><div class="head-progress"><strong>${percentage(item)}<span>%</span></strong><span>do plano concluído</span><div class="progress-track"><span style="width:${percentage(item)}%"></span></div></div></section>
    <div class="workspace-grid"><aside class="days-panel" aria-label="Dias do plano"><div class="panel-heading"><span>Dias do plano</span><strong>${completed(item)} / ${totalReadings(item)}</strong></div><label class="day-picker">Dia do plano<select id="day-picker">${item.days.map((entry,i)=>`<option value="${i}" ${i===activeDay?'selected':''}>Dia ${i+1} · ${esc(entry.readings.map(ref).join(' + '))}</option>`).join('')}</select></label><div class="day-list">${item.days.map((entry,index) => { const done = entry.readings.every(r => item.done.includes(key(r))); return `<button class="day-item ${index===activeDay?'active':''}" data-action="open-day" data-index="${index}"><span class="day-icon">${done?'✓':String(index+1).padStart(2,'0')}</span><span><strong>Dia ${index+1}</strong><small>${esc(entry.readings.map(ref).join(' + '))}</small></span><span class="day-chevron">›</span></button>`; }).join('')}</div></aside>
    <section class="reader-panel" aria-label="Leitura bíblica"><div class="reader-top"><div><span class="eyebrow">DIA ${String(activeDay+1).padStart(2,'0')} · LEITURA</span><h2>${esc(ref(reading))}</h2><p>${esc(copy.focus || 'Leia, observe e reflita.')}</p><p class="guide-plan-prompt">${esc(copy.prompts?.[activeDay] || readingPrompt(reading.bookId))}</p></div><button class="bookmark-button ${isDone?'bookmarked':''}" data-action="toggle-done" title="${isDone?'Marcar como não lido':'Marcar como lido'}" aria-label="${isDone?'Marcar como não lido':'Marcar como lido'}">${isDone?'✓':'○'}</button></div>
      <button class="guide-passage" data-guide-read="${reading.bookId}.${reading.chapter}">${studyLanguage(['Abrir leitura contínua','Open continuous reading'])} ↗</button>
      ${window.PoiemaPractice?.start([reading.bookId,reading.chapter,1],studyLanguage(['Estudar e aplicar','Study and apply'])) || ''}
      ${libraryData ? `<button class="reader-study-shortcut" data-action="open-library">Explorar ${esc(ref(reading))} no portal <span aria-hidden="true">↗</span></button>` : guide ? `<button class="reader-study-shortcut" data-action="open-deep-study">✳ Estudo completo já preparado <span>Explorar →</span></button>` : ''}
      ${day.readings.length > 1 ? `<div class="chapter-tabs" role="group" aria-label="Capítulos deste dia">${day.readings.map((r,index) => `<button class="chapter-tab ${index===activeReading?'active':''}" data-action="open-reading" data-index="${index}">${esc(ref(r))}</button>`).join('')}</div>` : ''}
      <div class="translation-tools"><label>Tradução <select id="version-select" aria-label="Tradução bíblica">${Object.entries(versions).map(([id,name]) => `<option value="${id}" ${selectedVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label><label class="compare-toggle"><input id="compare-toggle" type="checkbox" ${compareEnabled?'checked':''}> Comparar</label>${compareEnabled ? `<select id="compare-select" aria-label="Tradução para comparar">${Object.entries(versions).filter(([id]) => id!==selectedVersion).map(([id,name]) => `<option value="${id}" ${compareVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select>` : ''}</div>
      <div class="reader-rule"></div>${libraryData && chapterData ? '<p class="verse-hint">Toque em um versículo para consultar o estudo.</p>' : ''}<div class="scripture ${comparisonData?'scripture-compare':''}">${busy==='chapter'?'<p class="muted">Carregando o capítulo…</p>':chapterData ? `${comparisonData ? `<div class="compare-head"><strong>${esc(chapterData.versionName)}</strong><strong>${esc(comparisonData.versionName)}</strong></div>` : ''}${chapterData.verses.map((verse,index) => `<div class="verse-row ${comparisonData?'paired':''}" id="v${index+1}">${interactiveVerse(index+1,verse,libraryData)}${comparisonData ? `<p class="verse"><sup>${index+1}</sup>${esc(comparisonData.verses[index] || '')}</p>` : ''}</div>`).join('')}` : '<p class="muted">Não foi possível carregar o texto. <button class="inline-button" data-action="retry-chapter">Tentar novamente</button></p>'}</div>
      ${chapterData ? `<div class="translation-credit"><strong>${esc(chapterData.versionName)}</strong><br>${esc(chapterData.copyright)}<br><a href="${esc(chapterData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte do capítulo ↗</a>${comparisonData ? `<br><br><strong>${esc(comparisonData.versionName)}</strong><br>${esc(comparisonData.copyright)}<br><a href="${esc(comparisonData.sourceUrl)}" target="_blank" rel="noopener noreferrer">Ver fonte da comparação ↗</a>` : ''}</div><div class="translation-more">Quer consultar <em>A Mensagem</em>? <a href="https://www.editoravida.com.br/a-mensagem-capa-luxo-laranja-e-verde.html" target="_blank" rel="noopener noreferrer">Conheça a edição oficial ↗</a> <small>Obra com direitos reservados; o texto integral não é reproduzido aqui.</small></div>` : ''}
      <div class="reading-actions">
        ${isComplete ? `<strong>${studyLanguage(['Plano concluído','Plan complete'])}</strong><button class="guide-passage" data-action="browse-plans">${studyLanguage(['Ver outros planos','Browse other plans'])} →</button>` :
          `<button class="guide-passage" data-action="finish-reading">${isDone ? studyLanguage(['Próxima leitura','Next reading']) : studyLanguage(['Concluir e continuar','Finish and continue'])} →</button>`}
        <button class="text-link" data-action="toggle-done">${isDone?studyLanguage(['Desmarcar leitura','Unmark reading']):studyLanguage(['Marcar como lido','Mark as read'])}</button>
      </div>
    </section>
    <aside class="study-panel" aria-label="Caderno de leitura">
      ${study ? studyHtml(study, item.studies[currentKey+'-sources']) : !aiReady ? '' : `<div class="study-empty"><span>✦</span><h3>Análise adicional com IA</h3><p>Peça uma leitura sobre estrutura, cenário, teologia e aplicação deste capítulo.</p><button class="button button-dark full" data-action="generate-study" ${busy==='study'||!chapterData||!aiReady?'disabled':''}>${busy==='study'?'Preparando estudo…':'Gerar análise com IA'} <span aria-hidden="true">↗</span></button>${!aiReady?'<small>Configure a chave da IA no arquivo .env para gerar a análise.</small>':''}</div>`}
      ${!aiReady ? '' : `<div class="study-question"><h3>Uma pergunta sua</h3><p>O que ficou difícil ou despertou curiosidade?</p><form id="question-form"><textarea name="question" rows="3" maxlength="800" placeholder="Ex.: O que significa esta imagem no capítulo?" required>${esc(draftQuestion)}</textarea><button class="button button-outline full" type="submit" ${busy==='question'||!chapterData||!aiReady?'disabled':''}>${busy==='question'?'Pensando…':'Perguntar sobre o capítulo'} <span aria-hidden="true">→</span></button></form>${answer?`<div class="answer"><span class="eyebrow">RESPOSTA DA IA</span><p>${esc(answer)}</p></div>`:''}</div>`}
      <div class="notes-block"><h3><label for="notes">Minhas anotações</label></h3><textarea id="notes" rows="3" placeholder="O que você quer lembrar deste capítulo?">${esc(item.notes[currentKey] || '')}</textarea><small>Salvo automaticamente neste navegador</small></div>
    </aside></div>${libraryData ? '<passage-portal id="biblioteca-capitulo"></passage-portal>' : guide ? studyRoom(reading) : ''}
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

function footer() { return `<footer class="site-footer"><span><img class="poiema-footer-logo" src="./media/poiema-logo.jpeg" alt="" width="22" height="22"> Poiema Bereanos · leitura com intenção</span><span>Traduções abertas com créditos junto ao texto · <a href="./fontes.html">Fontes e licenças</a></span></footer>`; }
function render() {
  window.PoiemaDiscoveries?.detachHistory();
  document.body.classList.toggle('comparison-open', Boolean(connection));
  $('#app').innerHTML = header() + (message ? `<div class="notice" role="alert">${esc(message)} <button data-action="dismiss" aria-label="Fechar aviso">×</button></div>` : '') + (view === 'plan' ? planView() : view === 'explore' ? window.PoiemaGuide.explore(exploreSection) : home()) + footer() + connectionOverlay();
  if (view === 'explore') {
    window.PoiemaDiscoveries?.attachHistory();
    const links = document.querySelector('.guide-section-nav');
    const active = links?.querySelector('[aria-current="page"]');
    if (active && active.offsetLeft+active.offsetWidth>links.clientWidth) links.scrollLeft=active.offsetLeft;
  }
  if (connection) document.querySelector('.connection-close')?.focus({preventScroll:true});
}

document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (Object.hasOwn(pageActions,action)) {
    if (target.matches('a[href]') && (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) return;
    event.preventDefault();
    const page = pageActions[action];
    exploreSection = target.dataset.section || 'discoveries';
    pushPage(pageURL(page,exploreSection));
    showHome(page);
    const heading = page==='explore' && target.dataset.section
      ? document.querySelector('.guide-explore .guide-section h2') : document.querySelector('main h1');
    if (heading) { heading.tabIndex=-1; heading.focus({preventScroll:true}); }
    return;
  }
  if (action === 'search') return window.PoiemaGuide.search();
  if (action === 'notes') return window.PoiemaNotes?.open();
  if (action === 'atlas') return window.PoiemaGraph?.open();
  if (action === 'dismiss') { message = ''; return render(); }
  if (action === 'go-plan') { const item = plan() || state.plans[0]; return item ? openPlan(item.id, nextDay(item)) : showHome(); }
  if (action === 'open-plan') { const item = state.plans.find(p => p.id===target.dataset.id); return item && openPlan(item.id, nextDay(item)); }
  if (action === 'start-starter') {
    const template = starterPlans.find(item => item.key === target.dataset.key);
    if (!template) return;
    const saved = state.plans.find(item => item.origin === 'curated' && item.days.length === template.refs.length && template.refs.every(([id,n],i) => item.days[i].readings[0]?.bookId === id && item.days[i].readings[0]?.chapter === n));
    if (saved) return openPlan(saved.id, nextDay(saved));
    const days = template.refs.map(([bookId,chapter],index) => ({ focus: template.focuses[index] || `Capítulo ${chapter}`, readings: [{bookId,chapter}, ...(template.additional?.[index] || [])] }));
    return newPlan(template.title, template.description, days, 'curated');
  }
  if (action === 'open-day') { activeDay = Number(target.dataset.index); activeReading = nextReading(plan(),activeDay); answer = ''; draftQuestion = ''; studyTab = 'panorama'; libraryTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-reading') { activeReading = Number(target.dataset.index); answer = ''; draftQuestion = ''; studyTab = 'panorama'; libraryTab = 'panorama'; selectedMovement = 0; loadChapter(); return scrollToReader(); }
  if (action === 'open-deep-study') return $('#estudo-completo')?.scrollIntoView({ behavior:'auto', block:'start' });
  if (action === 'narrate-part') return narratePassage(visualPart);
  if (action === 'narrate-chapter') return narratePassage(0, true);
  if (action === 'stop-narration') { stopLocalNarration(); return render(); }
  if (action === 'visual-part') { stopLocalNarration(); visualPart = Number(target.dataset.index); render(); const selected = document.querySelector(`[data-action="visual-part"][data-index="${visualPart}"]`); selected?.focus({preventScroll:true}); return; }
  if (action === 'scene-motion') { sceneMotion = !sceneMotion; render(); document.querySelector('[data-action="scene-motion"]')?.focus({preventScroll:true}); return; }
  if (action === 'connection-filter') { connectionVerse = Number(target.dataset.verse) || null; render(); document.querySelector(`[data-action="connection-filter"][data-verse="${connectionVerse || 0}"]`)?.focus({preventScroll:true}); return; }
  if (action === 'open-library') return $('#biblioteca-capitulo [data-p="expand"]')?.click();
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
  if (action === 'finish-reading') {
    const item = plan();
    const reading = item.days[activeDay].readings[activeReading];
    if (!item.done.includes(key(reading))) {
      item.done.push(key(reading));
      save();
    }
    if (completed(item)===totalReadings(item)) return render();
    const day = item.days[activeDay].readings.some(entry=>!item.done.includes(key(entry))) ? activeDay : nextDay(item);
    activeDay=day;
    activeReading=nextReading(item,day);
    answer=''; draftQuestion=''; studyTab='panorama'; libraryTab='panorama'; selectedMovement=0;
    loadChapter();
    return scrollToReader();
  }
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
  if(event.target.id==='chapter-browser'){
    event.preventDefault();
    return window.PoiemaReader.open(browseReading,event.submitter || event.target.querySelector('button'));
  }
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
  if(event.target.id==='language-choice')return switchLanguage(event.target.value);
  if(event.target.form?.id==='chapter-browser'){
    const fields=event.target.form.elements;
    rememberReading({bookId:Number(fields.bookId.value),chapter:event.target.name==='bookId'?1:Number(fields.chapter.value)});
    if(event.target.name==='bookId')fields.chapter.innerHTML=chapterOptions(browseReading);
    refreshBrowseCover();return;
  }
  if(event.target.id==='day-picker') { document.querySelector(`[data-action="open-day"][data-index="${Number(event.target.value)}"]`)?.click();return; }
  if (event.target.id === 'version-select') { selectedVersion = event.target.value; if (selectedVersion === compareVersion) compareVersion = Object.keys(versions).find(id => id !== selectedVersion); return loadChapter(); }
  if (event.target.id === 'compare-toggle') { compareEnabled = event.target.checked; if (selectedVersion === compareVersion) compareVersion = Object.keys(versions).find(id => id !== selectedVersion); return loadChapter(); }
  if (event.target.id === 'compare-select') { compareVersion = event.target.value; return loadChapter(); }
});

async function init() {
  try {
    const [catalog,status,library,translations,guides,scenes] = await Promise.all([getJson('/api/books'),getJson('/api/status'),getJson('/api/studies'),getJson('/api/versions'),getJson('/api/book-guides'),staticFile(ENGLISH?'en/scenes.json':'scenes/manifest.json').catch(()=>({passages:{}}))]);
    books = catalog.books; window.poiemaBooks = books;
    starterPlans.push(window.PoiemaGuide.historyPlan());
    if(!book(browseReading.bookId) || browseReading.chapter<1 || browseReading.chapter>book(browseReading.bookId).chapters)browseReading={bookId:1,chapter:1};
     aiReady = status.aiReady; window.poiemaAiReady = Boolean(aiReady); hosted = Boolean(status.hosted); prebuiltStudies = library.studies; versions = translations.versions; bookGuides = guides.guides; passageImages = scenes.passages || {}; bookImages = scenes.books || {};
    window.addEventListener('popstate',handlePageLocation);
    const locationRoute = locationPage();
    view = locationRoute.page;
    exploreSection = locationRoute.section;
    let resume;
    try {resume=JSON.parse(sessionStorage.getItem('poiema-return'));sessionStorage.removeItem('poiema-return');}catch{}
    const shared=location.hash.match(/^#study=(\d+)\.(\d+)\.(\d+)$/);
    if(shared && !resume?.portal){
      const [bookId,chapter,verse]=shared.slice(1).map(Number);
      if(book(bookId) && chapter>0 && chapter<=book(bookId).chapters && verse>0){
        render();await customElements.whenDefined('passage-portal');
        await enterLibraryPortal(document.querySelector('.brand'),{bookId,chapter},{verse});return;
      }
    }
    if(resume?.planId && state.plans.some(item=>item.id===resume.planId)){
      openPlan(resume.planId,resume.day,false);if(resume.reading && plan().days[activeDay].readings[resume.reading]){activeReading=resume.reading;loadChapter();}return;
    }
    const routePlan = state.plans.find(item=>item.id===locationRoute.planId);
    if (routePlan) return openPlan(routePlan.id,nextDay(routePlan),false);
    render();
    window.PoiemaDiscoveries?.openFromURL();
    window.PoiemaReader?.openFromURL();
    window.PoiemaWorkshop?.openFromURL();
    if(resume?.portal && book(resume.portal.bookId)){
      await enterLibraryPortal(document.querySelector('.brand'),{bookId:resume.portal.bookId,chapter:resume.portal.chapter},resume.portal);
    }
  } catch(error) { $('#app').innerHTML = `<p class="loading">${esc(error.message)} Recarregue a página.</p>`; }
}


function handlePageLocation() {
  if (!books.length) return;
  const route = locationPage();
  if (!route.planId && view===route.page && (view!=='explore' || route.section===exploreSection)) return;
  window.PoiemaNotes?.close(false);
  window.PoiemaGraph?.close(false);
  for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close('navigation');
  exploreSection=route.section;
  const item=state.plans.find(item=>item.id===route.planId);
  if (item) openPlan(item.id,nextDay(item),false);
  else showHome(route.page);
  window.PoiemaDiscoveries?.openFromURL();
  window.PoiemaReader?.openFromURL();
  window.PoiemaWorkshop?.openFromURL();
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

init();
