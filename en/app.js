const STORAGE = 'caminho-biblico-v1';
const ENGLISH = document.documentElement?.lang === 'en';
const STATIC_MODE = document.querySelector('meta[name="static-mode"]')?.content === 'true';
const starterPlans = [
  { key: 'aprofundar', tag: "10 DAYS · STUDY GUIDE", title: "Major themes of the Bible", description: "Ten chapters with analysis, context, connections and questions already prepared.", accent: 'sage', refs: [[1,1],[19,23],[41,1],[43,1],[43,3],[43,4],[43,10],[43,11],[43,14],[43,20]], focuses: ["Creation and dignity","Care in the valley","The Kingdom is approaching","The Word among us","Life from the High","Living water","The Good Shepherd","Life before death","Peace and the Spirit","Resurrection and mission"] },
  { key: 'jesus', tag: "7 DAYS · GOSPELS", title: "Getting to know Jesus", description: "Seven encounters with Jesus in the Gospel of John.", accent: 'sage', refs: [[43,1],[43,3],[43,4],[43,10],[43,11],[43,14],[43,20]], focuses: ["The Word and the Light","A new start","Living water","The Good Shepherd","Life before death","The way and peace","The Resurrection"] },
  { key: 'marcos', tag: "16 DAYS · GOSPELS", title: "Mark, chapter by chapter", description: "Read the story of Jesus in a direct sequence.", accent: 'sand', refs: Array.from({length:16}, (_,i) => [41,i+1]), focuses: [] },
  { key: 'salmos', tag: "7 DAYS · POETRY", title: "Psalms for the journey", description: "Words to pray, reflect and start again.", accent: 'lavender', refs: [[19,1],[19,23],[19,27],[19,46],[19,91],[19,121],[19,139]], focuses: ["Two Ways","Care and trust","Courage","Refuge","Protection","Relief","Be known"] },
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
let versions = {};
let aiReady = false;
let hosted = false;
let view = 'home';
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
const ref = reading => `${book(reading.bookId)?.name || "Book"} ${reading.chapter}`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function save() { localStorage.setItem(STORAGE, JSON.stringify(state)); }
function plan() { return state.plans.find(item => item.id === activePlanId); }
function totalReadings(item) { return item.days.reduce((sum, day) => sum + day.readings.length, 0); }
function completed(item) { return item.days.reduce((sum, day) => sum + day.readings.filter(reading => item.done.includes(key(reading))).length, 0); }
function percentage(item) { return Math.round((completed(item) / totalReadings(item)) * 100) || 0; }
function nextDay(item) { const index = item.days.findIndex(day => day.readings.some(reading => !item.done.includes(key(reading)))); return index < 0 ? 0 : index; }
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
    if (options?.method === 'POST') throw new Error("AI is not available in this post yet.");
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
      if (!selected || !Number.isInteger(chapter) || chapter < 1 || chapter > selected.chapters || !versions[version]) throw new Error("Invalid chapter or translation.");
      const sourceUrl = `https://api.midvash.com/v1/${version}/${selected.slug}/${chapter}`;
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error("It was not possible to carry the biblical text.");
      const result = await response.json();
      if (!Array.isArray(result.data?.verses)) throw new Error("The chapter did not come in the expected format.");
      return { bookId: selected.id, bookName: result.data.bookName || selected.name, chapter, version, versionName: versions[version], verses: result.data.verses, copyright: result.meta?.copyright || '', sourceUrl };
    }
    throw new Error("Feature unavailable in this publication.");
  }
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "It was not possible to load.");
  return data;
}
async function staticFile(name) {
  const response = await fetch(`./${name}`);
  if (!response.ok) throw new Error("It was not possible to load the study library.");
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
    return {title:`Reading ${name}`,description:`A journey through all ${book(first.bookId)?.chapters} Chapters of the ${name}, at your own pace.`,focus:item.days[day].readings.map(ref).join(' · ')};
  }
  return {...item,focus:item.days[day].focus};
}
function switchLanguage(lang, portal=null){
  try {sessionStorage.setItem('poiema-return',JSON.stringify({planId:view==='plan'?activePlanId:null,day:activeDay,reading:activeReading,portal}));}catch{}
  const url=new URL(location.href);url.searchParams.set('lang',lang);location.assign(url);
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
    ? `${results[0].reason.message}${libraryData ? " The prepared study remains available below." : ''}`
    : compareEnabled && !comparisonData ? "The comparison has not uploaded; the main text is available." : '';
  if (token === requestToken) { busy = ''; render(); }
}

function header() {
  return `<header class="site-header"><div class="header-inner">
    <button class="brand" data-action="home" aria-label="Poiema Bereanos · home"><img class="poiema-logo" src="./media/poiema-logo.jpeg" alt="" width="36" height="36"><span>Poiema Bereanos</span></button>
    <nav aria-label="Main navigation"><button class="nav-link ${view === 'home' ? 'selected' : ''}" data-action="home">Bible</button><button class="nav-link" data-action="browse-plans">Plans</button>${view==='plan'?"<span class=\"nav-link selected current-study\" aria-current=\"page\">Reading</span>":''}</nav>
    <select class="language-choice" aria-label="Language" id="language-choice"><option value="pt" ${ENGLISH?'':'selected'}>Português</option><option value="en" ${ENGLISH?'selected':''}>English</option></select>
  </div></header>`;
}

let browseReading = {bookId:1,chapter:1};
try {
  const stored=JSON.parse(localStorage.getItem('poiema-library'));
  if(stored && Number.isInteger(stored.bookId) && Number.isInteger(stored.chapter))browseReading=stored;
} catch {}
function foldBookName(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');}
function findChapter(query){
  const parts=foldBookName(query).match(/^(.+?)\s+(\d+)$/);if(!parts)return null;
  const selected=books.find(b=>foldBookName(b.name)===parts[1]);
  const chapter=Number(parts[2]);
  return selected && chapter>=1 && chapter<=selected.chapters ? {bookId:selected.id,chapter}:null;
}
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

function home() {
  const current = state.plans[0];
  const covers = {aprofundar:'passage-1-1-1-5.webp',jesus:'passage-43-1-1-5.webp',marcos:'passage-41-1-1-8.webp',salmos:'passage-19-23-1-2.webp'};
  return `<main class="home-wrap">
    <section class="hero bible-library" id="biblia"><div class="hero-copy">
      <h1>Explore the Bible</h1>
      <p>Choose a passage to explore its scenes, places and connections.</p>
      <form id="chapter-browser"><label>Book<select name="bookId">${['old','new'].map(t=>`<optgroup label="${t==='old'?"Old Testament":"New Testament"}">${books.filter(b=>b.testament===t).map(b=>`<option value="${b.id}" ${b.id===browseReading.bookId?'selected':''}>${esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select></label><label>Chapter<select name="chapter">${chapterOptions(browseReading)}</select></label><button class="button button-dark" type="submit">Explore chapter <span aria-hidden="true">↗</span></button></form>
    </div><button type="submit" form="chapter-browser" class="hero-art hero-raster portal-door"><img id="browse-cover" src="./scenes/${esc(browseCover().file)}" alt="${esc(browseCover().alt)}" width="1280" height="720" fetchpriority="high"><span class="catalog-caption"><small>Artist’s interpretation · AI</small><strong>${esc(ref(browseReading))}</strong><span class="portal-door-arrow" aria-hidden="true">↗</span></span></button></section>
    <div id="verse-notebook">${notebookView()}</div><details class="book-index"><summary>Browse all 66 books</summary><form id="reference-search"><label>Find a book or chapter<input type="search" id="book-search" autocomplete="off" placeholder="e.g. Romans 8"></label><button class="ref-jump" hidden></button></form>${['old','new'].map(t=>`<section data-testament><h2>${t==='old'?"Old Testament":"New Testament"}</h2><div>${books.filter(b=>b.testament===t).map(b=>`<button data-action="choose-book" data-id="${b.id}">${esc(b.name)}</button>`).join('')}</div></section>`).join('')}<p class="book-empty" hidden>No books found.</p></details>
    ${current ? `<section class="continue-card"><div><span class="resume-label">Your current plan</span><h2>${esc(planCopy(current).title)}</h2><p>${completed(current)} of ${totalReadings(current)} chapters read</p><div class="progress-track"><span style="width:${percentage(current)}%"></span></div></div><button class="button button-light" data-action="open-plan" data-id="${esc(current.id)}">Resume reading <span aria-hidden="true">→</span></button></section>` : ''}
    ${state.plans.length > 1 ? `<section class="section my-plans"><div class="section-heading"><div><h2>Other plans saved</h2></div></div><div class="plan-list">${state.plans.slice(1).map(item => `<button class="plan-row" data-action="open-plan" data-id="${esc(item.id)}"><span class="plan-row-icon">✦</span><span class="plan-row-main"><strong>${esc(planCopy(item).title)}</strong><small>${item.days.length} days · ${completed(item)} of ${totalReadings(item)} Chapters</small></span><span class="plan-row-progress">${percentage(item)}%</span><span aria-hidden="true">→</span></button>`).join('')}</div></section>` : ''}
    <section class="section" id="planos"><div class="section-heading"><div><h2>Reading plans</h2></div><a class="text-link" href="#criar">Build a plan →</a></div>
      <div class="reading-plans">${starterPlans.map(item => `<button class="reading-plan" data-action="start-starter" data-key="${item.key}"><img src="./scenes/${covers[item.key]}" alt="" width="112" height="84" loading="lazy"><span><small>${item.refs.length} days</small><strong>${esc(item.title)}</strong><span>${esc(item.description)}</span></span><b aria-hidden="true">↗</b></button>`).join('')}</div>
    </section>

    <section class="section creation" id="criar"><div class="section-heading"><div><h2>Build a reading plan</h2></div></div>
      <div class="creation-grid"><form id="book-plan" class="creation-card"><label for="book-select">Book of the Bible</label><select id="book-select" name="bookId">${books.map(item => `<option value="${item.id}" ${item.id===43?'selected':''}>${esc(item.name)} · ${item.chapters} ch.</option>`).join('')}</select><label for="pace-select">Pace</label><select id="pace-select" name="pace"><option value="1">1 chapter per day</option><option value="2">2 chapters per day</option><option value="3">3 chapters per day</option></select><button class="button button-dark full" type="submit">Create a plan <span aria-hidden="true">→</span></button></form>
      ${aiReady ? `<form id="ai-plan" class="creation-card"><div class="creation-icon">✳</div><h3>A theme, with the help of AI</h3><p>Ask for a short trail on the subject you want to study.</p><label for="theme-input">What do you want to understand better?</label><input id="theme-input" name="theme" placeholder="Ex.g. faith in difficult times" maxlength="160" value="${esc(draftTheme)}" required><label for="days-select">Duration</label><select id="days-select" name="days"><option value="5">5 days</option><option value="7" selected>7 days</option><option value="10">10 days</option><option value="14">14 days</option></select><button class="button button-outline full" type="submit" ${busy==='plan'||!aiReady?'disabled':''}>${busy==='plan'?"Preparing a plan...":"Create with AI"} <span aria-hidden="true">✦</span></button><small class="form-note">${aiReady?"AI chooses one chapter per day. You can review the sequence.":hosted?"New generations are deactivated. The prepared library is still available.":"New generations are deactivated. The prepared library is still available."}</small></form>` : ''}</div>
    </section>
  </main>`;
}

const mapPoints = {
  "Galilee": [52, 13], "Cana": [43, 20], "Capernaum": [66, 18],
  'Samaria': [43, 42], "Sychar": [48, 49], 'Gerizim': [39, 52],
  "Judea": [52, 72], "Jerusalem": [55, 78], "Bethany": [68, 80],
  "Ephraim": [40, 65], "Jordan": [70, 49],
};
function studyMap(study, reading) {
  return sceneHtml(passageScene(reading, { title: study.title || '', explanation: study.context || '', from: 1 }));
}

function studyRoom(reading, studySection = studyTab, movement = selectedMovement) {
  const guide = prebuiltStudies[key(reading)];
  if (!guide) return '';
  const tabs = [['panorama','Panorama'],['contexto',"History and map"],['analise',"Biblical analysis"],['vozes',"Comments"],['pratica',"Reflection"]];
  let content = '';
  if (studySection === 'panorama') content = `<div class="deep-two"><div><span class="eyebrow">CENTRAL IDEA</span><p class="thesis">${esc(guide.thesis)}</p><div class="movement-list">${guide.movements.map((part,index) => `<button class="movement ${index===movement?'active':''}" data-action="movement" data-index="${index}"><span>0${index+1}</span><strong>${esc(part.label)}</strong><small>v. ${part.from}–${part.to}</small></button>`).join('')}</div></div><div class="movement-detail"><span class="eyebrow">FOLLOW THE PASSAGE</span><h3>${esc(guide.movements[movement]?.label || guide.movements[0].label)}</h3><p>${esc(guide.movements[movement]?.detail || guide.movements[0].detail)}</p><button class="text-link" data-action="focus-verse" data-verse="${guide.movements[movement]?.from || 1}">Go to the verse ${guide.movements[movement]?.from || 1} →</button></div></div>`;
  if (studySection === 'contexto') content = `<div class="deep-two"><div><span class="eyebrow">HISTORICAL AND LITERARY CONTEXT</span><p class="deep-prose">${esc(guide.context)}</p><div class="source-note">The locations and dates not specified in the chapter are treated with caution. The image is an artistic setting; see the interactive map for exploring coordinates.</div></div><div><span class="eyebrow">VISUAL ENVIRONMENT</span>${studyMap(guide, reading)}<p class="map-caption">Thematic illustration generated by AI. The coordinates are on the interactive map of the library.</p></div></div>`;
  if (studySection === 'analise') content = `<div class="deep-two"><div><span class="eyebrow">BIBLE ANALYSIS</span><p class="deep-prose">${esc(guide.theology)}</p><h3 class="deep-subhead">Scripture connections</h3><div class="crossrefs">${guide.crossRefs.map(reference => `<span>${esc(reference)}</span>`).join('')}</div></div><div><span class="eyebrow">THREE PERSPECTIVES</span><div class="lens-list">${guide.lenses.map((lens,index) => `<div><b>0${index+1}</b><p>${esc(lens)}</p></div>`).join('')}</div></div></div>`;
  if (studySection === 'vozes') content = `<div><span class="eyebrow">CLASSICAL PROTESTANT COMMENTARIES</span><p class="deep-prose">These original summaries present emphases of two historical commentators. Read the full notes in the sources to evaluate the argument of each.</p><div class="voice-grid">${guide.voices.map(voice => `<article class="voice-card"><span>CLASSICAL COMMENTARY</span><h3>${esc(voice.author)}</h3><p>${esc(voice.summary)}</p><a href="https://bible.helloao.org/api/c/${esc(voice.slug)}/${esc(book(reading.bookId)?.commentaryId)}/${reading.chapter}.simple.json" target="_blank" rel="noopener noreferrer">Read original commentary (English)</a></article>`).join('')}</div><div class="source-note">The comments support the investigation. Compare each interpretation with the chapter and note where the text allows more than one reading.</div></div>`;
  if (studySection === 'pratica') content = `<div class="deep-two"><div><span class="eyebrow">STUDY QUESTIONS</span><ol class="deep-questions">${guide.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><div class="practice-card"><span class="eyebrow">PUT IT INTO PRACTICE</span><p>${esc(guide.practice)}</p><button class="button button-light" data-action="focus-notes">Write in my notes</button></div></div>`;
  return `<section class="deep-study" id="estudo-completo" aria-label="Study of ${esc(ref(reading))}"><div class="deep-head"><div><span class="eyebrow">STUDY PRONTO TM ${esc(ref(reading).toUpperCase())}</span><h2>${esc(guide.title)}</h2><p>An original reading with the biblical text in the center, context and ways to deepen.</p><button class="text-link" data-action="back-to-reading">← Back to the chapter</button></div><span class="deep-theme">${esc(guide.theme)}</span></div><div class="deep-tabs" role="group" aria-label="Sections of the study">${tabs.map(([id,label]) => `<button class="deep-tab ${studySection===id?'active':''}" data-action="study-tab" data-tab="${id}" aria-pressed="${studySection===id}">${label}</button>`).join('')}</div><div class="deep-body">${content}</div><div class="deep-resources"><strong>Keep studying</strong><span>Original study of this app, based on the indicated passages. External guides to extend reading:</span>${guide.resources.map(resource => `<a href="${esc(resource.url)}" target="_blank" rel="noopener noreferrer">${esc(resource.label)} ↗</a>`).join('')}</div></section>`;
}

const sceneCatalog = {
  samaria: { file: 'samaria.jpg', alt: "Artistic illustration of a well in a landscape of Samaria", title: "Next to the well" },
  galileia: { file: 'galileia.jpg', alt: "Artist's illustration of the Sea of Galilee with a boat", title: "On the edge of Galilee" },
  jerusalem: { file: 'jerusalem.jpg', alt: "Artist's illustration of a road between hills to Jerusalem", title: "the Way of Jerusalem" },
  horebe: { file: 'horebe.jpg', alt: "Artist's illustration of a desert landscape near the Horebe", title: "In the desert" },
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
  return scene ? `<figure class="place-scene"><img src="./scenes/${scene.file}" alt="${esc(scene.alt)}" loading="lazy"><figcaption><strong>${esc(scene.title)}</strong><span>Image generated by AI for setting. It does not represent a historical reconstruction or a place identified accurately.</span></figcaption></figure>` : '';
}
const visualScenes = {
  well: ['well.jpg', "Meeting at the well", "Artist's interpretation of the meeting by the well, with figures in a landscape of Samaria."],
  harvest: ['harvest.jpg', "Fields and testimony", "Illustration of Samaritan residents walking between fields towards a meeting."],
  cana: ['cana.jpg', "On the way to Cana", "Artist's artistic interpretation of a father encountering a master in a village of Galilee."],
  creation: ['creation.jpg', "Light on creation", "Artistic landscape of dawn, sea and vegetation inspired by the account of creation."],
  exodus: ['exodus.jpg', "Crossing in the desert", "Illustration of ancient travelers among desert mountains."],
  psalms: ['psalms.jpg', "Rest water", "Pastoral illustration of a shepherd, sheep, a creek and hills."],
  jerusalem: ['jerusalem-study.jpg', "Between the hills of Jerusalem", "Artistic interpretation of Jerusalem in the first century view of the hills."],
  letters: ['letters.jpg', "The World of Letters", "Artist's environment of an old room with papyri, a lamp and sea view."],
  exile: ['exile.jpg', "Memory and exile", "Illustration of an ancient family by a river in Mesopotamia."],
  wisdom: ['wisdom.jpg', "Time to listen", "Thematic environment of a conversation about a roll in an old courtyard."],
  resurrection: ['resurrection.jpg', "The garden at dawn", "Artist's interpretation of an open tomb in a garden at dawn."],
  storm: ['galilee-storm.jpg', "Water and trust", "Illustration of an ancient boat in the sea of Galilee under storm clouds."],
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
  id = part.sceneId && Object.hasOwn(visualScenes,part.sceneId) ? part.sceneId : id;
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
      if (token === narrationToken) { stopLocalNarration(); notify("Audio could not be loaded. Try again."); }
    });
  }
  playScene(index);
}
function visualJourney(reading, data) {
  const parts = data.study.outline;
  const index = Math.min(visualPart, parts.length - 1);
  const part = parts[index];
  const scene = passageScene(reading, part);
  return `<section class="visual-journey" aria-label="Exploit the parts of the chapter"><div class="journey-stage ${sceneMotion?'motion-enabled':''}"><img class="journey-image" src="./scenes/${scene.file}" alt="${esc(scene.alt)}" width="1440" height="810" decoding="async"><div class="journey-caption"><span>${esc(ref(reading))} · v. ${part.from}–${part.to}</span><h3>${esc(part.title)}</h3><div class="journey-controls">${key(reading)==='43:4' ? narrationActive ? "<button data-action=\"stop-narration\">Stop audio</button>" : "<button data-action=\"narrate-part\">Listen to the Scene</button><button data-action=\"narrate-chapter\">Listen to all the scenes</button>" : ''}<button data-action="scene-motion" aria-pressed="${sceneMotion}">${sceneMotion?"Pause Movement":"Activate movement"}</button><button data-action="focus-verse" data-verse="${part.from}">Read this passage</button></div></div></div><p class="scene-disclosure">${scene.thematic?"Thematic environment":"Interpretative scene"} generated by AI · ${esc(scene.title)} Artistic illustration, without archaeological precision.</p><div class="journey-parts" role="group" aria-label="Parts of the chapter">${parts.map((p,i)=>{const image=passageScene(reading,p);return `<button data-action="visual-part" data-index="${i}" aria-pressed="${index===i}"><img src="./scenes/${image.file}" alt="" loading="lazy" width="160" height="90"><span><small>v. ${p.from}–${p.to}</small><strong>${esc(p.title)}</strong></span></button>`;}).join('')}</div><div class="journey-explanation" aria-live="polite"><p>${esc(part.explanation)}</p></div></section>`;
}
function connectionExplorer(reading, data, verseFilter = connectionVerse) {
  const verses = [...new Set(data.crossRefs.map(link=>link.fromVerse))].sort((a,b)=>a-b);
  const links = data.crossRefs.map((link,index)=>({...link,index})).filter(link=>!verseFilter || link.fromVerse===verseFilter);
  return `<section class="connection-explorer" aria-label="Network of cross-references"><div class="connection-explorer-head"><div><h3>A text opens up other paths</h3><p>Choose a verse on the network to compare the passages.</p></div><div class="connection-filters" role="group" aria-label="Filter by the original verse"><button data-action="connection-filter" data-verse="0" aria-pressed="${!verseFilter}">All</button>${verses.map(v=>`<button data-action="connection-filter" data-verse="${v}" aria-pressed="${verseFilter===v}">v. ${v}</button>`).join('')}</div></div><div class="verse-network"><svg class="verse-edges" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">${links.map((link,i)=>{const left=i%2===0;const row=Math.floor(i/2);const y=(row+1)*440/(Math.ceil(links.length/2)+1);return `<path d="M 500 220 C ${left?330:670} 220, ${left?330:670} ${y}, ${left?155:845} ${y}" pathLength="1" style="--edge-delay:${i*50}ms"/>`;}).join('')}</svg><div class="verse-origin"><span>You are reading</span><strong>${esc(ref(reading))}${verseFilter?`:${verseFilter}`:''}</strong><small>Investigate each connection</small></div>${links.map((link,i)=>{const rows=Math.ceil(links.length/2);return `<button class="verse-node ${i%2===0?'node-left':'node-right'}" style="--node-y:${(Math.floor(i/2)+1)*100/(rows+1)}%;--node-delay:${i*45}ms" data-action="crossref" data-index="${link.index}"><small>${esc(ref(reading))}:${link.fromVerse} ↗</small><strong>${esc(book(link.bookId)?.name)} ${link.chapter}:${link.verse}</strong><span>Open Comparison</span></button>`;}).join('')}</div></section>`;
}

function historicalDossier(reading, profile = bookProfileData) {
  const dossier = profile?.dossier;
  if (!dossier) return "<p class=\"library-empty\">The historical dossier of this book is in preparation. The specific context of the chapter is in Panorama.</p>";
  const sources = profile.dossierSources || [];
  const labels = { 'explicit-source': "Affirmation of the source", interpretation: "Interpretation", debated: "Question debated" };
  return `<section class="historical-dossier"><header><h3>The world of ${esc(book(reading.bookId)?.name)}</h3><p>Context of the book to accompany this chapter. The sources consulted cover selected themes and passages; each observation indicates its support.</p></header><div class="era-pair"><article><span>Time of the narrative</span><p>${esc(dossier.narratedEra)}</p></article><article><span>Composition and transmission</span><p>${esc(dossier.compositionEra)}</p></article></div><nav class="dossier-jump" aria-label="Themes of the context"><a href="#context-politics">Rulers and empires</a><a href="#context-customs">Culture and customs</a><a href="#context-language">Language</a><a href="#context-timeline">Timeline</a></nav>${[['politics',"Rulers, peoples and empires"],['customs',"Culture, customs and everyday life"],['language',"Language and forms of expression"],['timeline',"Mark in the time"]].map(([section,label])=>`<section class="context-section" id="context-${section}"><h3>${label}</h3>${dossier[section].length?dossier[section].map((item,i)=>`<details class="context-detail" ${i===0?'open':''}><summary><strong>${esc(item.title)}</strong><span>${esc(labels[item.certainty])}</span></summary><div><p>${esc(item.detail)}</p><p class="context-impact"><strong>What to observe in reading</strong>${esc(item.readingImpact)}</p>${item.reference?`<p class="context-reference">Passage: ${esc(item.reference)}</p>`:''}<div class="context-sources">${item.sourceIds.map(id=>{const source=sources.find(s=>s.id===id);return source?`<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)} ↗</a>`:'';}).join('')}</div></div></details>`).join(''):"<p class=\"library-footnote\">The notes consulted do not offer enough detail on this topic.</p>"}</section>`).join('')}<section class="context-investigation"><h3>Questions to go deeper</h3><ol>${dossier.investigation.map(q=>`<li>${esc(q)}</li>`).join('')}</ol></section><div class="library-limits"><strong>Reach and limits of sources</strong><p>${esc(dossier.limits)}</p><p>"Afirmation of the source) identifies what a secondary comment states. Classification does not amount to independent historical proof. Synthesis with AI; adaptations of Tyndale notes under CC BY-SA 4.0.</p></div></section>`;
}
function narratedFilm(reading) {
  if (key(reading) !== '43:4') return '';
  return `<section class="narrated-film"><h3>John 4, a narrated journey</h3><p>Explore the scenes with Portuguese audio and English captions.</p><video controls playsinline preload="none" poster="./scenes/well.jpg" aria-label="Journey narrated by John chapter four"><source src="./media/43-4.mp4" type="video/mp4"><track kind="captions" src="${ENGLISH?'./en/43-4.vtt':'./media/43-4.vtt'}" srclang="${ENGLISH?'en':'pt-BR'}" label="${ENGLISH?'English':'Português'}" default>Your browser could not play this video.</video><p class="scene-disclosure">Synthetic voice generated by AI. Assembly of AI-generated illustrations with camera motion. The scenes are artistic interpretations.</p><a href="${ENGLISH?'./en/43-4-transcript.txt':'./media/43-4-transcript.txt'}" target="_blank" rel="noopener">Read the English transcript ↗</a><p class="library-footnote">The script follows the analysis and the sources identified in this chapter. Return to the text to check each observation.</p></section>`;
}

function chapterStudyPanel(reading, data, profileData, section) {
  const s = data.study;
  const guideUrl = bookGuides[reading.bookId];
  let content = '';
  if (section === 'panorama') content = `<div class="library-columns"><div><span class="eyebrow">CHAPTER OVERVIEW</span><p class="library-lead">${esc(s.overview)}</p><h3>Movement of the text</h3><div class="library-outline">${s.outline.map((part,index) => `<button data-action="focus-verse" data-verse="${part.from}"><span>${String(index+1).padStart(2,'0')}</span><div><strong>${esc(part.title)}</strong><small>Verses ${part.from}–${part.to}</small><p>${esc(part.explanation)}</p></div></button>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">CONTEXT</span><p>${esc(s.context)}</p><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">See the book guide in the BibleProject</a></aside></div>`;
  if (section === 'contexto') content = historicalDossier(reading,profileData);
  if (section === 'filme') content = narratedFilm(reading);
  if (section === 'livro') {
    const profile = profileData?.profile;
    content = profile ? `<div class="library-columns"><div><span class="eyebrow">BOOK OVERVIEW · ${esc(book(reading.bookId)?.name.toUpperCase())}</span><p class="library-lead">${esc(profile.summary)}</p><h3>Structure of the book</h3><div class="book-structure">${profile.structure.map(part => `<div><span>CH. ${part.from}${part.to>part.from?`–${part.to}`:''}</span><strong>${esc(part.label)}</strong><p>${esc(part.description)}</p></div>`).join('')}</div><h3>Themes to accompany</h3><div class="book-themes">${profile.themes.map(theme => `<span>${esc(theme)}</span>`).join('')}</div></div><aside class="library-aside"><span class="eyebrow">SETTING AND READING</span><p>${esc(profile.setting)}</p><strong>While reading</strong><ul class="book-tips">${profile.readingKeys.map(tip => `<li>${esc(tip)}</li>`).join('')}</ul><strong>Open questions</strong><p>${esc(profile.cautions)}</p><a href="${esc(profileData.source.url)}" target="_blank" rel="noopener noreferrer">See the source of the panorama</a><a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">BibleProject visual guide</a></aside></div>` : `<p class="library-empty">The panorama of this book is being prepared. <a href="${esc(guideUrl || 'https://bibleproject.com/pt-br/')}" target="_blank" rel="noopener noreferrer">See the BibleProject guide</a></p>`;
  }
  if (section === 'estudiosos') content = `<div><span class="eyebrow">COMMENTARIES</span><p class="library-intro">Portuguese-produced entities produced with AI from extracts from sources. They are paraphrases, not citations of the authors. Check out the original note and the verse.</p><div class="scholar-grid">${s.scholarViews.map(view => { const source = data.sources.find(item => item.id === view.sourceId); return `<article class="scholar-card"><span>v. ${view.verse}</span><h3>${esc(source?.author || view.sourceId)}</h3><p>${esc(view.insight)}</p><a href="${esc(source?.url || '#')}" target="_blank" rel="noopener noreferrer">Check original commentary</a></article>`; }).join('')}</div><div class="library-limits"><strong>Limits of this analysis</strong><p>${esc(s.uncertainty)}</p></div></div>`;
  if (section === 'pratica') content = `<div class="library-columns"><div><span class="eyebrow">QUESTIONS TO EXPLORE</span><ol class="library-questions">${s.questions.map(question => `<li>${esc(question)}</li>`).join('')}</ol></div><aside class="library-aside library-practice"><span class="eyebrow">APPLICATION</span><p>${esc(s.practice)}</p><button class="button button-dark" data-action="focus-notes">Write in my notes</button></aside></div>`;
  return content;
}
function connectionOverlay() {
  if (!connection) return '';
  const link = connection.link;
  const reading = plan()?.days[activeDay]?.readings[activeReading];
  const sourceName = reading ? `${ref(reading)}:${link.fromVerse}` : '';
  const targetName = `${book(link.bookId)?.name || "Book"} ${link.chapter}:${link.verse}`;
  const sourceVerse = chapterData?.verses?.[link.fromVerse-1] || "The text of origin did not carry. See the reading of the chapter to check out this verse.";
  const targetVerse = connection.chapter?.verses?.[link.verse-1] || '';
  const nextIndex = ((libraryData?.crossRefs?.indexOf(link) ?? 0) + 1) % (libraryData?.crossRefs?.length || 1);
  const context = (data, verse) => data?.verses?.slice(Math.max(0,verse-2),verse+1).map((text,index) => `<p class="context-verse ${Math.max(1,verse-1)+index===verse?'selected':''}"><sup>${Math.max(1,verse-1)+index}</sup>${esc(text)}</p>`).join('') || '';
  const contextHtml = connection.showContext ? `<div class="verse-pair passage-context"><article><strong>Context of the ${esc(sourceName)}</strong>${context(chapterData,link.fromVerse)}</article><article><strong>Context of the ${esc(targetName)}</strong>${context(connection.chapter,link.verse)}</article></div>` : '';

  return `<div class="connection-overlay" role="presentation"><section class="connection-dialog" role="dialog" aria-modal="true" aria-label="Compare Biblical passages" tabindex="-1"><button class="connection-close" data-action="close-connection" aria-label="Close comparison">×</button><span class="eyebrow">RELATED PASSAGES</span><h2>${esc(sourceName)} ↔ ${esc(targetName)}</h2><p class="library-intro">Read each verse in the context of your chapter. The reference suggests a relationship to investigate.</p><div class="verse-pair"><article><strong>${esc(sourceName)}</strong><p>${esc(sourceVerse)}</p></article><article><strong>${esc(targetName)}</strong><p>${connection.loading?"Loading text...":connection.error?esc(connection.error):esc(targetVerse)}</p></article></div>${contextHtml}<p class="connection-version">Translation: ${esc(versions[selectedVersion])}</p><div class="connection-actions"><button class="button button-outline" data-action="connection-context" aria-expanded="${Boolean(connection.showContext)}" ${connection.loading || connection.error?'disabled':''}>${connection.showContext?"Hide context":"See the context of the verses"}</button><button class="button button-outline" data-action="crossref" data-index="${nextIndex}">Next connection →</button><button class="button button-dark" data-action="open-target" ${connection.loading?'disabled':''}>Read about Reading ${esc(book(link.bookId)?.name)} ${link.chapter} →</button><button class="button button-outline" data-action="close-connection">Continue in this chapter</button></div></section></div>`;
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
function notebookView(){
  const entries=Object.values(notebookEntries()).filter(e=>book(e.bookId)).sort((a,b)=>b.updated-a.updated);
  if(!entries.length)return '';
  return `<details class="notebook-list"><summary>${studyLanguage(['Meu caderno','My notebook'])} · ${entries.length}</summary>${entries.map(e=>`<article><a href="${esc(discoveryURL(e,e.verse).href)}" data-notebook-open="${[e.bookId,e.chapter,e.verse].join('.')}">${esc(ref(e))}:${e.verse} ↗</a>${e.note?`<p>${esc(e.note)}</p>`:''}</article>`).join('')}</details>`;
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
  entries[id]={bookId,chapter,verse,note:form.querySelector('textarea').value.trim(),updated:Date.now()};
  try{
    localStorage.setItem(notebookKey,JSON.stringify(entries));
    tools.querySelector('summary').textContent=studyLanguage(['Minha anotação','My note']);
    tools.querySelector('[role=status]').textContent=studyLanguage(['Descoberta salva.','Discovery saved.']);
    const home=document.querySelector('#verse-notebook');if(home)home.innerHTML=notebookView();
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
  return `<div class="verse-insight"><small>AI-assisted study</small>
    ${note?`<h4>${esc(studyLanguage(note.question))}</h4><p>${esc(studyLanguage(note.answer))}</p>`:''}
    ${discoveryTools(data,number)}
    ${wordDiscovery(discoveryAt(data,number))}
    ${note?.original ? `<details><summary>${esc(studyLanguage(['Palavra original','Original word']))}</summary><p><bdi lang="${note.original[2]==='he'?'he':'grc'}">${esc(note.original[0])}</bdi> · ${esc(note.original[1])} · ${esc(studyLanguage(note.original[3]))}</p></details>` : ''}
    ${part ? `<h4>${esc(part.title)}</h4><small>Passage context · vv. ${part.from}–${part.to}</small><p>${esc(part.explanation)}</p>` : ''}
    ${notes.map(n => { const source = sources.find(s => s.id === n.sourceId);
      return `<div class="verse-comment"><strong>${source ? `<a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.author)} ↗</a>` : esc(n.sourceId)}</strong><p>${esc(n.insight)}</p></div>`;
    }).join('')}
    ${links.map(r => `<details data-parallel-book="${r.bookId}" data-chapter="${r.chapter}" data-number="${r.verse}" data-end="${r.end || r.verse}"><summary>${esc(ref(r))}:${r.verse}${r.end ? '–'+r.end : ''}</summary><p aria-live="polite"></p><small data-link-reason>${esc(r.reason || '')}</small></details>`).join('')}
    <details><summary>${esc(studyLanguage(['Investigar o texto','Investigate the text']))}</summary><p class="discovery-prompt">${esc(readingPrompt(data.bookId))}</p>${[number-1,number,number+1].filter(n=>verses?.[n]).map(n=>`<p class="investigation-line"><sup>${n}</sup> ${esc(verses[n])}</p>`).join('')}${data.study.questions?.[0]?`<p>${esc(data.study.questions[0])}</p>`:''}</details>
    ${place?`<button data-p="verse-place" data-place="${esc(place.name)}" data-return-verse="${number}">${esc(studyLanguage(['Localizar no mapa','Locate on map']))} · ${esc(atlasLabel(place))}</button>`:''}
    ${data.study.uncertainty?`<details><summary>${esc(studyLanguage(['O que permanece em aberto?','What remains uncertain?']))}</summary><p>${esc(data.study.uncertainty)}</p></details>`:''}
    ${data.study.context ? `<details><summary>Context of the chapter</summary><p>${esc(data.study.context)}</p></details>` : ''}
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
  if(portal){
    portal.returnVerse=Number(button.dataset.studyVerse);
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
  line.textContent = "Loading text...";
  const bookText = await portalBookText(Number(details.dataset.parallelBook));
  const chapter = bookText?.[details.dataset.chapter] || {};
  const start=Number(details.dataset.number),end=Number(details.dataset.end)||start;
  const verse=Array.from({length:end-start+1},(_,i)=>chapter[start+i]).filter(Boolean).join(' ');
  line.textContent = verse ? verse + ' · ' + (ENGLISH ? 'World English Bible' : "World English Bible") : "Text not available in this edition.";
  if(!verse)return;
  const reason=details.querySelector('[data-link-reason]');
  const original=details.closest('.verse-row')?.querySelector('.verse-text')?.textContent || '';
  const words=new Set(contentWords(original).map(w=>w.toLowerCase()));
  const shared=contentWords(verse).find(w=>words.has(w.toLowerCase()));
  if(shared)line.innerHTML=highlightedText(verse,shared)+' · '+(ENGLISH?'World English Bible':"World English Bible");
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
  return `<main class="workspace-wrap"><button class="back-link" data-action="browse-plans"><span aria-hidden="true">←</span> All plans</button>
    <section class="workspace-head"><div><span class="eyebrow">YOUR READING PLAN · ${item.days.length} DAYS</span><h1>${esc(copy.title)}</h1><p>${esc(copy.description)}</p></div><div class="head-progress"><strong>${percentage(item)}<span>%</span></strong><span>of the plan completed</span><div class="progress-track"><span style="width:${percentage(item)}%"></span></div></div></section>
    <div class="workspace-grid"><aside class="days-panel" aria-label="Plan days"><div class="panel-heading"><span>Plan days</span><strong>${completed(item)} / ${totalReadings(item)}</strong></div><label class="day-picker">Reading day<select id="day-picker">${item.days.map((entry,i)=>`<option value="${i}" ${i===activeDay?'selected':''}>Day ${i+1} · ${esc(entry.readings.map(ref).join(' + '))}</option>`).join('')}</select></label><div class="day-list">${item.days.map((entry,index) => { const done = entry.readings.every(r => item.done.includes(key(r))); return `<button class="day-item ${index===activeDay?'active':''}" data-action="open-day" data-index="${index}"><span class="day-icon">${done?'✓':String(index+1).padStart(2,'0')}</span><span><strong>Day ${index+1}</strong><small>${esc(entry.readings.map(ref).join(' + '))}</small></span><span class="day-chevron">›</span></button>`; }).join('')}</div></aside>
    <section class="reader-panel" aria-label="Biblical reading"><div class="reader-top"><div><span class="eyebrow">DAY ${String(activeDay+1).padStart(2,'0')} · READING</span><h2>${esc(ref(reading))}</h2><p>${esc(copy.focus || "Read, watch and reflect.")}</p></div><button class="bookmark-button ${isDone?'bookmarked':''}" data-action="toggle-done" title="${isDone?"Mark as unread":"Mark as read"}" aria-label="${isDone?"Mark as unread":"Mark as read"}">${isDone?'✓':'○'}</button></div>
      ${libraryData ? `<button class="reader-study-shortcut" data-action="open-library">Explore ${esc(ref(reading))} in the portal <span aria-hidden="true">↗</span></button>` : guide ? `<button class="reader-study-shortcut" data-action="open-deep-study">Open the chapter study <span>Explore s s</span></button>` : ''}
      ${day.readings.length > 1 ? `<div class="chapter-tabs" role="group" aria-label="Chapters of this day">${day.readings.map((r,index) => `<button class="chapter-tab ${index===activeReading?'active':''}" data-action="open-reading" data-index="${index}">${esc(ref(r))}</button>`).join('')}</div>` : ''}
      <div class="translation-tools"><label>Translation <select id="version-select" aria-label="Bible Translation">${Object.entries(versions).map(([id,name]) => `<option value="${id}" ${selectedVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label><label class="compare-toggle"><input id="compare-toggle" type="checkbox" ${compareEnabled?'checked':''}> Compare</label>${compareEnabled ? `<select id="compare-select" aria-label="Translation to compare">${Object.entries(versions).filter(([id]) => id!==selectedVersion).map(([id,name]) => `<option value="${id}" ${compareVersion===id?'selected':''}>${esc(name)}</option>`).join('')}</select>` : ''}</div>
      <div class="reader-rule"></div>${libraryData && chapterData ? "<p class=\"verse-hint\">Select a verse to explore its study notes.</p>" : ''}<div class="scripture ${comparisonData?'scripture-compare':''}">${busy==='chapter'?"<p class=\"muted\">Loading the chapter...</p>":chapterData ? `${comparisonData ? `<div class="compare-head"><strong>${esc(chapterData.versionName)}</strong><strong>${esc(comparisonData.versionName)}</strong></div>` : ''}${chapterData.verses.map((verse,index) => `<div class="verse-row ${comparisonData?'paired':''}" id="v${index+1}">${interactiveVerse(index+1,verse,libraryData)}${comparisonData ? `<p class="verse"><sup>${index+1}</sup>${esc(comparisonData.verses[index] || '')}</p>` : ''}</div>`).join('')}` : "<p class=\"muted\">It was not possible to load the text. <button class=\"inline-button\" data-action=\"retry-chapter\">Try again</button></p>"}</div>
      ${chapterData ? `<div class="translation-credit"><strong>${esc(chapterData.versionName)}</strong><br>${esc(chapterData.copyright)}<br><a href="${esc(chapterData.sourceUrl)}" target="_blank" rel="noopener noreferrer">See source of the chapter</a>${comparisonData ? `<br><br><strong>${esc(comparisonData.versionName)}</strong><br>${esc(comparisonData.copyright)}<br><a href="${esc(comparisonData.sourceUrl)}" target="_blank" rel="noopener noreferrer">See source of comparison</a>` : ''}</div><div class="translation-more">Want to consult <em>The Message</em>? <a href="https://www.editoravida.com.br/a-mensagem-capa-luxo-laranja-e-verde.html" target="_blank" rel="noopener noreferrer">Get to know the official edition</a> <small>Work with reserved rights; the full text is not reproduced here.</small></div>` : ''}
      <div class="reading-actions"><button class="button ${isDone?'button-outline':'button-dark'}" data-action="toggle-done">${isDone?"✓ Reading complete":"Mark as read"} <span aria-hidden="true">${isDone?'':'→'}</span></button><button class="text-link" data-action="next-day">Next day <span aria-hidden="true">→</span></button></div>
    </section>
    <aside class="study-panel" aria-label="Reading journal">
      ${study ? studyHtml(study, item.studies[currentKey+'-sources']) : !aiReady ? '' : `<div class="study-empty"><span>✦</span><h3>Additional analysis with AI</h3><p>Ask for a reading about the structure, scenery, theology and application of this chapter.</p><button class="button button-dark full" data-action="generate-study" ${busy==='study'||!chapterData||!aiReady?'disabled':''}>${busy==='study'?"Preparing a study...":"Generate analysis with AI"} <span aria-hidden="true">↗</span></button>${!aiReady?"<small>Set the AI key in the .env file to generate the analysis.</small>":''}</div>`}
      ${!aiReady ? '' : `<div class="study-question"><h3>A question to you</h3><p>What got it difficult or aroused curiosity?</p><form id="question-form"><textarea name="question" rows="3" maxlength="800" placeholder="Ex., what does this image mean in the chapter?" required>${esc(draftQuestion)}</textarea><button class="button button-outline full" type="submit" ${busy==='question'||!chapterData||!aiReady?'disabled':''}>${busy==='question'?"I think about...":"Ask about the chapter"} <span aria-hidden="true">→</span></button></form>${answer?`<div class="answer"><span class="eyebrow">AI RESPONSE</span><p>${esc(answer)}</p></div>`:''}</div>`}
      <div class="notes-block"><h3><label for="notes">My notes</label></h3><textarea id="notes" rows="3" placeholder="What do you want to remember from this chapter?">${esc(item.notes[currentKey] || '')}</textarea><small>Save automatically in this browser</small></div>
    </aside></div>${libraryData ? '<passage-portal id="biblioteca-capitulo"></passage-portal>' : guide ? studyRoom(reading) : ''}
  </main>`;
}

function studyHtml(study, sources) {
  const sections = [
    ["In a nutshell", study.overview], ["How the chapter moves", study.structure],
    ["Historical context", study.history], ["Places and geography", study.geography],
    ["Biblical Ideas", study.theology], ["Pastoral reading", study.pastoral],
  ];
  return `<div class="study-content">${sections.map(([title,body]) => `<div class="study-section"><h3>${esc(title)}</h3><p>${esc(body)}</p></div>`).join('')}
    ${study.keyVerses?.length?`<div class="study-section"><h3>Return to the verses</h3><div class="verse-links">${study.keyVerses.map(n => `<a href="#v${n}">${n}</a>`).join('')}</div></div>`:''}
    <div class="study-section"><h3>To reflect</h3><ol>${(study.questions||[]).map(q => `<li>${esc(q)}</li>`).join('')}</ol></div>
    <div class="study-section"><h3>To take with you</h3><p>${esc(study.practice)}</p></div>
    ${study.uncertainty?`<div class="study-caution">${esc(study.uncertainty)}</div>`:''}
    <div class="study-sources"><strong>Sources of this analysis</strong><a href="${esc(sources?.bible||'#')}" target="_blank" rel="noopener noreferrer">Bíblia Livre (Almeida 1819) ↗</a>${(sources?.commentaries||[]).map(source => `<a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.author)}, ${esc(source.title)} ↗</a>`).join('')}<small>AI can interpret in an inaccurate way. Check out the sources and the verses.</small></div>
    <button class="inline-button" data-action="regenerate-study">Generate another analysis</button>
  </div>`;
}

function footer() { return `<footer class="site-footer"><span><img class="poiema-footer-logo" src="./media/poiema-logo.jpeg" alt="" width="22" height="22"> Poiema Bereanos</span><span>Translations open with credits along with the text <a href="./en/sources.html">Sources and licenses</a></span></footer>`; }
function render() {
  document.body.classList.toggle('comparison-open', Boolean(connection));
  $('#app').innerHTML = header() + (message ? `<div class="notice" role="alert">${esc(message)} <button data-action="dismiss" aria-label="Close Warning">×</button></div>` : '') + (view === 'plan' ? planView() : home()) + footer() + connectionOverlay();
  if (connection) document.querySelector('.connection-close')?.focus({preventScroll:true});
}

document.addEventListener('click', async event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;

  if (action === 'home') return showHome();
  if (action === 'dismiss') { message = ''; return render(); }
  if(action==='choose-book'){
    const form=document.querySelector('#chapter-browser');
    rememberReading({bookId:Number(target.dataset.id),chapter:1});form.elements.bookId.value=browseReading.bookId;
    form.elements.chapter.innerHTML=chapterOptions(browseReading);refreshBrowseCover();
    document.querySelector('.book-index').open=false;form.elements.chapter.focus();return;
  }
  if (action === 'browse-plans') { if(view!=='home')showHome(); document.querySelector('#planos')?.scrollIntoView({block:'start'});return; }
  if (action === 'go-plan') { const item = plan() || state.plans[0]; return item ? openPlan(item.id, nextDay(item)) : showHome(); }
  if (action === 'open-plan') { const item = state.plans.find(p => p.id===target.dataset.id); return item && openPlan(item.id, nextDay(item)); }
  if (action === 'start-starter') {
    const template = starterPlans.find(item => item.key === target.dataset.key);
    if (!template) return;
    const days = template.refs.map(([bookId,chapter],index) => ({ focus: template.focuses[index] || `Chapter ${chapter}`, readings: [{bookId,chapter}] }));
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
    return newPlan(`Exploring ${book(link.bookId)?.name} ${link.chapter}`, "A passage found by the connections of the Bible.", [{ focus: `Read ${book(link.bookId)?.name} ${link.chapter}`, readings: [{ bookId: link.bookId, chapter: link.chapter }] }], 'connection');
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
  if(event.target.id==='reference-search'){
    event.preventDefault();const found=findChapter(document.querySelector('#book-search').value);
    if(found)return enterLibraryPortal(document.querySelector('#book-search'),found);
    const matches=document.querySelectorAll('.book-index [data-action="choose-book"]:not([hidden])');
    if(matches.length===1)matches[0].click();return;
  }
  if(event.target.id==='chapter-browser'){
    event.preventDefault();
    return enterLibraryPortal(event.submitter || event.target.querySelector('button'), browseReading);
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
    return newPlan(`Reading ${selected.name}`, `A journey through all ${selected.chapters} Chapters of the ${selected.name}, at your own pace.`, days, 'book');
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
  if(event.target.id==='book-search'){
    const term=foldBookName(event.target.value),found=findChapter(term);
    const index=event.target.closest('.book-index');
    const jump=index.querySelector('.ref-jump');jump.hidden=!found;
    if(found)jump.textContent=`Open ${ref(found)} →`;
    index.querySelectorAll('[data-action="choose-book"]').forEach(b=>{b.hidden=!!found || !foldBookName(b.textContent).includes(term);});
    index.querySelectorAll('[data-testament]').forEach(s=>{s.hidden=!s.querySelector('button:not([hidden])');});
    index.querySelector('.book-empty').hidden=!!found || !!index.querySelector('[data-action="choose-book"]:not([hidden])');return;
  }
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
    books = catalog.books;
    if(!book(browseReading.bookId) || browseReading.chapter<1 || browseReading.chapter>book(browseReading.bookId).chapters)browseReading={bookId:1,chapter:1};
     aiReady = status.aiReady; hosted = Boolean(status.hosted); prebuiltStudies = library.studies; versions = translations.versions; bookGuides = guides.guides; passageImages = scenes.passages || {};
    let resume;
    try {resume=JSON.parse(sessionStorage.getItem('poiema-return'));sessionStorage.removeItem('poiema-return');}catch{}
    const shared=location.hash.match(/^#study=(\d+)\.(\d+)\.(\d+)$/);
    if(shared && !resume?.portal){
      const [bookId,chapter,verse]=shared.slice(1).map(Number);
      if(book(bookId) && chapter>0 && chapter<=book(bookId).chapters && verse>0){
        render();await customElements.whenDefined('passage-portal');
        await enterLibraryPortal(document.querySelector('#chapter-browser button'),{bookId,chapter},{verse});return;
      }
    }
    if(resume?.planId && state.plans.some(item=>item.id===resume.planId)){
      openPlan(resume.planId,resume.day);if(resume.reading && plan().days[activeDay].readings[resume.reading]){activeReading=resume.reading;loadChapter();}return;
    }
    render();
    if(resume?.portal && book(resume.portal.bookId)){
      await enterLibraryPortal(document.querySelector('#chapter-browser button'),{bookId:resume.portal.bookId,chapter:resume.portal.chapter},resume.portal);
    }
  } catch(error) { $('#app').innerHTML = `<p class="loading">${esc(error.message)} Please reload the page.</p>`; }
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
