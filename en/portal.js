// The reader and the immersive view use the same study and passage artwork.
const wellScenes = [
  ["The Well of Jacob", "The trip to the well. John places the meeting near the lands that Jacob had given Joseph. When the woman calls Jacob \"our father,\" she speaks of a memory that also belongs to the Samaritans.", "John 4.5-6, 12"],
  ["The pitcher and the water", "Imagine arriving to draw water and listen to a traveler to ask to drink. The woman notes that he doesn't even have how to draw water from the well. It is this concrete difficulty that the question about living water is born.", "John $7-15"],
  ["The pitcher left", "Notice what is left behind. The woman leaves the cantaro and goes to the city. Your invitation takes other people to Jesus. The narrative goes from the word of a witness listening to the residents themselves.", "John 4.28-30, 39-42"],
  ["The distance to Capernaum", "The father asks Jesus to come down before his son dies. He returns along the way by trusting in the word he heard. Notice when the news of the cure arrives and why the father asks the time.", "John 4,46-53"]
];
const wellFieldwork = [
  {
    title:"You've reached the well", question:"Why does John present the owner of the land before presenting the woman?",
    choices:[["Follow the trip", "Jesus comes from Judea, crosses Samaria and goes to Galilee. Fatigue interrupts this trip and gives occasion to the conversation. Open the map and locate the stop between the south and the north."],["Investigate the land", "John connects the ground to Jacob and Joseph. Hear later how the woman herself calls Jacob \"our father.\" The two travelers can recognize the same ancestor even when their communities diverge on the cult."]],
    source:"John 4.3-6, 12 - Genesis 33.18-20", place:1,
    word:['בְּאֵר','be’ér',"well","The term appears at the meeting at the well of Genesis 29.2. In John, the depth of the well explains why a tired traveler depends on who can draw the water.",'beer']
  },
  {
    title:"Who can give to drink?", question:"You're on the edge of a deep well. The traveler asks for water. What is missing?",
    choices:[["Find the container","The woman realizes that Jesus does not bring the water out of it. Before speaking of the life that God gives, the conversation passes through the hands of those who have the equipment to reach the water."],["Listen to her question","She identifies who asks and who serves: a Jew asks to drink from a Samaritan woman. The dialogue itself gives social weight to this gesture. Further on, the woman opposes the mount of her ancestors to Jerusalem."]],
    source:"John $4.7-15, 19.24",place:1,
    word:['מַיִם','máyim',"water","Jeremiah 2:13 uses the Hebrew expression \"source of living waters.\" In John 4, written in Greek, the woman asks where the water will come from. The request for drinking gives meaning to the image before Jesus speaks of eternal life.",'mayim']
  },
  {
    title:"She comes back without the pitcher",question:"Follow the reed or follow the woman. What does every way let you see?",
    choices:[["Staying near the well","The pitcher stays. The disciples arrive with food. Jesus invites the group to lift his eyes to the fields and speaks of sowing and reaping. The daily life provides the vocabulary of teaching."],["Follow the invitation","The woman goes to the city and invites people to check what they heard. The residents leave, ask Jesus to stay and, two days later, distinguish the testimony from her of what they themselves heard."]],
    source:"John 4:28 - 42",place:1,
    word:['שָׂדֶה','sadê','campo',"In Leviticus 19.9, the field is a harvest land and what is on the edges matter to the poor and the foreigner. In John 4.35, looking at the fields prepares the image of the shared work between the sowing and who reaps.",'sadeh']
  },
  {
    title:"The father needs to return home",question:"At what point does the father have to decide whether to trust what he has heard?",
    choices:[["Leave Cana","The son is in Capernaum. When the father leaves, he has not yet received the news of the cure. The offset creates a gap between trusting the word and checking what happened."],["Listen to the servants","The servants come to meet the father. He asks the time of improvement and compares it to the time Jesus spoke. The sequence explains why John narrates the trip back."]],
    source:"John 4,4-654",place:2,
    word:['אֱמוּנָה','emuná',"fidelity, trust","Habakkuk 2.4 employs this Hebrew noun. He offers a bridge to think of his father's trust. In John 4.50, the evangelist uses a Greek verb to say that the man believed and departed.",'emunah']
  }
];
const wellLocations = [
  ["Jerusalem",48.9,85.9,"In Judea, Jerusalem is the place of worship mentioned by the woman. The journey begins in Judea. John leaves open the exact point of the match.","John 4.3, 20"],
  ["Sychar",53.7,56.6,"John places the well near Sicar in Samaria. The Samaritan tradition associates the sacred mountain with Gerizim. It is from this place that the woman speaks when she asks where to worship.","John 4.5-6, 20'21"],
  ["Cana",54.9,16.2,"Back in Galilee, Jesus finds his father in Cana. The narrator reminiscent of the previous episode of water and wine. The position of Cana on the map is approximate.","John 4.46"],
  ["Capernaum",78.9,12.3,"The son is in Capernaum, next to the lake of Galilee. Notice the separation between the place of conversation and the place of healing.","John 4,46-53"]
];
const modernPlaces = {
  Jerusalem: ["Jerusalem","Old City of Jerusalem","The point is located in the historical region of the city. Extend to recognize its streets and surrounding neighborhoods."],
  Sychar: ["Sychar","Surroundings of Nablus, West Bank","Tradition places the meeting at Jacob's well near Nablus. The identification of the former Sicar is discussed."],
  Cana: ["Cana","Lower Galilee, Israel","Khirbet Qana and the Kafr Kanna region are proposed identifications. The point indicates one of the hypotheses."],
  Capernaum: ["Capernaum",'Kfar Nahum, Israel',"The archaeological site is located on the northwest shore of the lake of Genesaré, also called the Sea of Galilee."],
  'Mount Gerizim':['Monte Gerizim',"Monte Gerizim, south of Nablus","The hill remains a sacred place for the Samaritan community."],
  Judea:["Judea","Historic region around Jerusalem","The marker is a regional reference. The limits of the ancient jurisdictions differ from the present."],
  Samaria:['Samaria',"Mountainous region around Nablus","The name designates a historic region. The marker does not delimit the extension of the territory."],
  Galilee:["Galilee","Galilee, North Israel","The region extends beyond the lake. The marker offers a regional reference."]
};
const wellStops = ['Jerusalem','Sychar','Cana','Capernaum'];
const portugueseAtlasNames={"Egypt":"Egito","Zion":"Sião","Jordan":"Jordan","Babylon":"Babilônia","Canaan":"Canaã","Assyria":"Assíria","Moab":"Moabe","Galilee":"Galilee","Gilead":"Gileade","Chaldea":"Caldeia","Lebanon":"Líbano","Syria":"Síria","Ammon":"Amom","Jericho":"Jericó","Bethel":"Betel","Euphrates":"Eufrates","City of David":"Cidade de Davi","Tyre":"Tiro","Bashan":"Basã","Damascus":"Damasco","Negeb":"Neguebe","Sidon":"Sidom","Sodom":"Sodoma","Ramah":"Ramá","Gath":"Gate","Bethlehem":"Belém","Nazareth":"Nazaré","Hebron":"Hebrom","Great Sea":"Mar Grande","Beersheba":"Berseba","Mount Zion":"Monte Sião","Red Sea":"Mar Vermelho","Gibeah":"Gibeá","Shiloh":"Siló","Nile":"Nilo","Philistia":"Filístia","Arabah":"Arabá","Gibeon":"Gibeom","Midian":"Midiã","Shechem":"Siquém","Hamath":"Hamate","Gomorrah":"Gomorra","Mount Sinai":"Monte Sinai","Macedonia":"Macedônia","Cush":"Cuxe","Dan":"Dã","Mount of Olives":"Monte das Oliveiras","Most Holy Place":"Santo dos Santos","Mizpah":"Mispa","Kadesh-barnea":"Cades-Barneia","Heshbon":"Hesbom","Mount Seir":"Monte Seir","Asia":"Ásia","Holy Place":"Lugar Santo","Mount Carmel":"Monte Carmelo","Persia":"Pérsia","Amalek":"Amaleque","Mount Horeb":"Monte Horebe","Salt Sea":"Mar Salgado","East":"Oriente","Ashdod":"Asdode","Anathoth":"Anatote","Ephesus":"Éfeso","Nineveh":"Nínive","Lachish":"Laquis","Mount Hermon":"Monte Hermom","Tarshish":"Társis","Ekron":"Ecrom","Kiriath-jearim":"Quiriate-Jearim","Kidron":"Cedrom","Tekoa":"Tecoa","Sheba":"Sabá","Ophir":"Ofir","Ashkelon":"Asquelom","Aram":"Arã","Libnah":"Libna","Meribah":"Meribá","Caesarea":"Cesareia","Susa":"Susã","Elam":"Elão","Megiddo":"Megido","Valley of Hinnom":"Vale de Hinom","Bethany":"Bethany","Rome":"Roma","Sea of Galilee":"Mar da Galileia","Rabbah":"Rabá","Cyprus":"Chipre","Bozrah":"Bozra","Ziklag":"Ziclague","Carmel":"Carmelo","Achaia":"Acaia","Haran":"Harã","Antioch":"Antioquia","Babylonia":"Babilônia","Wilderness of Sinai":"Deserto do Sinai","Thessalonica":"Tessalônica","Greece":"Grécia","Shinar":"Sinear","Beth-shemesh":"Bete-Semes","Jabesh-gilead":"Jabes-Gileade","Paran":"Parã","Succoth":"Sucote","Arabia":"Arábia","Mahanaim":"Maanaim","Brook of Egypt":"Ribeiro do Egito","Beyond the River":"Além do Rio","Bethsaida":"Betsaida","Cyrene":"Cirene","Goshen":"Gósen","Paddan-aram":"Padã-Arã","Kedar":"Quedar","Cilicia":"Cilícia","Sharon":"Sarom","Joppa":"Jope","Galatia":"Galácia","Adullam":"Adulão","Ethiopia":"Etiópia","Media":"Média","Hormah":"Hormá","Beth-horon":"Bete-Horom","Aphek":"Afeque","Ramoth-gilead":"Ramote-Gileade","Mesopotamia":"Mesopotâmia","Mount Tabor":"Monte Tabor","Valley of the Arnon":"Vale do Arnom","Valley of Rephaim":"Vale de Refaim","Memphis":"Mênfis","Corinth":"Corinto","Plains of Moab":"Planícies de Moabe","Teman":"Temã","Shittim":"Sitim","Azekah":"Azeca","Valley of Jezreel":"Vale de Jezreel","Mount Gilboa":"Monte Gilboa","Engedi":"En-Gedi","Michmash":"Micmás","Aijalon":"Aijalom","Tirzah":"Tirza","Ezion-geber":"Eziom-Geber","Arnon":"Arnom","Dibon":"Dibom","Pisgah":"Pisga","Mamre":"Manre","Valley of Salt":"Vale do Sal","Massah":"Massá","Zoan":"Zoã","Tahpanhes":"Tafnes","Pamphylia":"Panfília","Laodicea":"Laodiceia","Philippi":"Filipos","Shunem":"Suném","Kishon":"Quisom","Jabbok":"Jaboque","Siloam":"Siloé","Fish Gate":"Porta do Peixe","Golgotha":"Gólgota","Valley of Achor":"Vale de Acor","Heliopolis":"Heliópolis","Machpelah":"Macpela","Troas":"Trôade","Iconium":"Icônio","Phoenicia":"Fenícia","Tarsus":"Tarso","Benjamin Gate":"Porta de Benjamim","Topheth":"Tofete","Mount Hor":"Monte Hor","Crete":"Creta","Italy":"Itália","Pontus":"Ponto","Libya":"Líbia","Thebes":"Tebas","Thyatira":"Tiatira","Caesarea Philippi":"Cesareia de Filipe","Fair Havens":"Bons Portos","Smyrna":"Esmirna","Pergamum":"Pérgamo","Sardis":"Sardes","Philadelphia":"Filadélfia","Colossae":"Colossos","Beroea":"Bereia","Berea":"Bereia","Athens":"Atenas","Lystra":"Listra","Miletus":"Mileto","Emmaus":"Emaús","Bethphage":"Betfagé","Gethsemane":"Getsêmani","Nain":"Naim","Chorazin":"Corazim","Tiberias":"Tiberíades","Decapolis":"Decápolis","Idumea":"Idumeia","Perga":"Perge","Seleucia":"Selêucia","Salamis":"Salamina","Neapolis":"Neápolis","Amphipolis":"Anfípolis","Apollonia":"Apolônia","Cenchreae":"Cencreia","Lydda":"Lida","Azotus":"Azoto","Mount Moriah":"Monte Moriá","Moriah":"Moriá","Eden":"Éden","Ararat":"Ararate","Alexandria":"Alexandria","Syracuse":"Siracusa","Puteoli":"Putéoli","Rhegium":"Régio","Antipatris":"Antipátride","Attalia":"Atália","Mount Ebal":"Monte Ebal","Jezreel":"Jezreel","Sea of Chinnereth":"Mar de Quinerete","Chinnereth":"Quinerete"};
function atlasLabel(place) { return modernPlaces[place.name]?.[0] || (!ENGLISH && portugueseAtlasNames[place.name]) || place.name; }

let modernAtlas, modernAtlasRequest;
function atlasCoordinateKey(p) {
  return p.name+'|'+p.latitude.toFixed(5)+','+p.longitude.toFixed(5);
}
function atlasOptionKey(p,places) {
  if(!places.some(other=>other!==p && other.name===p.name))return p.name;
  return atlasCoordinateKey(p)+'|'+places.indexOf(p);
}
function loadModernAtlas() {
  modernAtlasRequest ??= staticFile('media/modern-atlas.json').then(data=>modernAtlas=data).catch(()=>{
    modernAtlasRequest=null;return null;
  });
  return modernAtlasRequest;
}
function countryLabel(code,lang=ENGLISH?'en':'pt'){
  return new Intl.DisplayNames([lang],{type:'region'}).of(code);
}
// Areas whose sovereignty is contested are described without assigning a country.
const atlasAreas={
  jerusalem:{name:["Jerusalem",'Jerusalem'],detail:['Status internacional disputado','Disputed international status'],note:['Israel administra toda a cidade; os palestinos reivindicam a parte oriental, onde fica a Cidade Velha.','Israel administers the whole city; Palestinians claim the eastern part, which includes the Old City.']},
  golan:{name:['Colinas de Golã','Golan Heights'],detail:['Status internacional disputado','Disputed international status'],note:['Administradas por Israel desde 1967; a ONU as considera território sírio.','Administered by Israel since 1967; the UN regards them as Syrian territory.']},
  westbank:{name:['Cisjordânia','West Bank'],detail:['Territórios Palestinos','Palestinian Territories']},
  gaza:{name:['Faixa de Gaza','Gaza Strip'],detail:['Territórios Palestinos','Palestinian Territories']}
};
const placeTypes={City:['Cidade','City'],Landmark:['Marco','Landmark'],Mountain:['Monte','Mountain'],Valley:['Vale','Valley'],Island:['Ilha','Island'],Region:['Região','Region'],Water:['Mar, rio ou fonte','Sea, river or spring'],Path:['Caminho','Route']};
// A nearby town helps only for a point-like site. Seas, regions and camp stations
// get the present-day country or territory instead of a misleading "city".
const pointLikePlace=p=>['City','Landmark','Mountain','Valley','Island'].includes(p.type);
function modernTerritory(geo){
  if(!geo)return null;
  const area=atlasAreas[geo.area];
  if(area)return {key:geo.area,name:studyLanguage(area.name),detail:studyLanguage(area.detail),note:area.note&&studyLanguage(area.note),disputed:!!area.note};
  if(geo.country)return {key:geo.country,name:countryLabel(geo.country)};
  return null;
}
function cityTerritory(geo){
  const area=atlasAreas[geo.cityArea];
  return {key:geo.cityArea || geo.cityCountry,name:area?studyLanguage(area.name):countryLabel(geo.cityCountry)};
}
// The biblical point lies inside the present-day city, so a second marker would mislead.
const insideModernJerusalem=geo=>geo?.area==='jerusalem' && geo.city==='Jerusalem';
function modernCityTag(geo){
  const area=atlasAreas[geo.cityArea];
  if(geo.cityArea==='jerusalem')return geo.city==='Jerusalem'?'Jerusalem':geo.city+' · Jerusalem';
  return geo.city+' · '+(area?area.name[1]:countryLabel(geo.cityCountry,'en'));
}
function modernComparison(p, geo){
  if(!geo)return '';
  const territory=modernTerritory(geo), kind=placeTypes[p.type];
  const distance=new Intl.NumberFormat(ENGLISH?'en':'pt-BR',{maximumFractionDigits:1}).format(geo.km);
  const span=text=>text?`<span>${esc(text)}</span>`:'';
  let now;
  if(insideModernJerusalem(geo)){
    now=`<strong>${esc(territory.name)}</strong>${span(territory.detail)}${span(studyLanguage(['Dentro da cidade atual','Within the present-day city']))}`;
  }else if(pointLikePlace(p)){
    const town=cityTerritory(geo), where=territory || town;
    const nearby=`≈\u00a0${distance}\u00a0km`;
    // Lead with the town when it is close and in the same country or territory as the point.
    if(geo.km<=25 && where.key===town.key)
      now=`<strong lang="en">${esc(geo.city)}</strong>${span([where.name,where.detail].filter(Boolean).join(' · '))}${span(studyLanguage(['Cidade de referência','Reference city'])+' · '+nearby)}`;
    else
      now=`<strong>${esc(where.name)}</strong>${span(where.detail)}${span(`${studyLanguage(['Cidade de referência:','Reference city:'])} ${geo.city} (${town.name}) · ${nearby}`)}`;
  }else if(territory){
    now=`<strong>${esc(territory.name)}</strong>${span(territory.detail)}${span(studyLanguage(p.type==='Water'?['O ponto marca um trecho da água, não uma cidade.','The point marks part of the water, not a town.']:['O marcador é uma referência; a área antiga era mais ampla.','The marker is a reference; the ancient area was wider.']))}`;
  }else{
    now=`<strong>${studyLanguage(['Mar ou costa','Sea or coast'])}</strong>${span(studyLanguage(['O ponto fica fora de uma fronteira terrestre. Use o mapa para ver os países ao redor.','The point lies outside a land border. Use the map to see the surrounding countries.']))}`;
  }
  return `<div class="atlas-comparison"><div class="atlas-then"><small>${studyLanguage(['Então','Then'])}</small><strong>${esc(atlasLabel(p))}</strong>${kind?`<span>${esc(studyLanguage(kind))} · ${studyLanguage(['lugar bíblico','biblical place'])}</span>`:''}</div>
    <span class="atlas-arrow" aria-hidden="true">→</span>
    <div class="atlas-now"><small>${studyLanguage(['Hoje','Today'])}</small>${now}</div>${territory?.disputed?`<p class="atlas-status">${esc(territory.note)}</p>`:''}</div>`;
}

let modernRenderer;
function loadModernMap() {
  const script = file => new Promise((resolve,reject) => {
    const node = document.createElement('script');
    node.src = './vendor/english-map/' + file;
    node.onload = resolve; node.onerror = reject; document.head.append(node);
  });
  modernRenderer ??= (async () => {
    const probe=document.createElement('canvas').getContext('webgl2');
    if(!probe)throw new Error('WebGL unavailable');
    probe.getExtension('WEBGL_lose_context')?.loseContext();
    if (!window.maplibregl) await script('maplibre-gl.js');
    if (!L.maplibreGL) await script('leaflet-maplibre-gl.js');
  })().catch(error => { modernRenderer = null; throw error; });
  return modernRenderer;
}

const portalTexts = new Map();
function portalBookText(id) {
  if (!portalTexts.has(id)) portalTexts.set(id, staticFile((ENGLISH?'en/bible/web/':'media/portal-text/') + id + '.json').catch(() => { portalTexts.delete(id); return {}; }));
  return portalTexts.get(id);
}
class PassagePortal extends HTMLElement {
  connectedCallback() {
    this.reading ??= plan()?.days[activeDay]?.readings[activeReading];
    this.data ??= libraryData;
    this.profile ??= bookProfileData;
    this.translation ??= this.closest('.library-dialog') ? null : chapterData;
    if (!this.data || !this.reading) return;
    this.atlasEra ??= 'antigo';
    this.index = Number(this.dataset.start || 0);
    this.topic = this.dataset.topic || 'cena';
    this.onclick = e => this.act(e);
    this.onchange = e => { if(e.target.matches('[data-continue]'))this.continueAudio=e.target.checked; };
    this.paint();
    this.querySelector('.portal-stage')?.addEventListener('animationend',event=>{
      if(event.animationName==='door-opening')this.classList.remove('portal-first-arrival');
    });
    portalBookText(this.reading.bookId).then(data => {
      this.text = data[this.reading.chapter] || {};
      if (this.isConnected && !this.querySelector('audio') && !this.querySelector('.well-answer p') && this.topic === 'cena' && !this.translation) {
        this.panel();
        if(this.pendingVerse){this.revealVerse(this.pendingVerse,true);this.pendingVerse=null;}
      }
    });
    this.onkeydown = event => {
      if (event.target.closest('select, textarea, input, video, audio, .portal-map')) return;
      if (!this.hasAttribute('expanded') || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      const control = this.querySelector(event.key === 'ArrowLeft' ? '[data-p="prev"]' : '[data-p="next"]');
      if (!control.disabled) { event.preventDefault(); control.click(); }
    };
  }
  disconnectedCallback() {
    this.stopSound(); this.disposeAtlas();
  }
  stopSound() {
    this.audio?.pause();
    this.querySelector('audio')?.pause();

  }
  get parts() { return this.data.study.outline; }
  get part() { return this.parts[this.index]; }
  get detail() { return key(this.reading) === '43:4' ? wellScenes[this.index] : null; }
  get guide() { return this.detail ? wellFieldwork[this.index] : null; }
  paint() {
    this.disposeAtlas();
    const scene = passageScene(this.reading, this.part);
    const expanded = this.hasAttribute('expanded');
    const primary = [['cena',"Explore"],['mapa',"Maps"],['estudiosos',"Scholars"],['ecos',"Cross-references"]];

    const secondary = [['tempo',"History"],...(this.guide ? [['voz',"Keyword"]] : []),['panorama','Panorama'],['livro',"About the book"],['contexto',"Historical dossier"],['pratica',"Reflection"]];
    if (prebuiltStudies[key(this.reading)]) secondary.push(['editorial',"Editorial Guide"]);
    if (this.guide) secondary.push(['filme',"Film"]);
    const buttons = items=>items.map(([id,name])=>`<button data-p="${id}" aria-pressed="${this.topic===id}">${name}</button>`).join('');
    this.innerHTML = `<div class="portal-stage">
      <img class="portal-photo" alt="${esc(scene.alt)}" src="./scenes/${esc(scene.file)}">
      <div class="portal-rail"><span>${esc(ref(this.reading))} · v. ${this.part.from}–${this.part.to}</span><button data-p="expand">${expanded?"Close portal ×":"Enter the scene ↗"}</button></div>
      <button class="portal-pin" data-p="inspect" aria-expanded="false"><i aria-hidden="true"></i>${esc(this.detail?.[0] || "To observe the excerpt")}</button>
      <div class="portal-caption"><small>${scene.book?studyLanguage(['Arte do livro','Book art']):scene.thematic?"Thematic environment":"Interpretative scene"} · AI</small><h3>${esc(this.guide?.title || this.part.title)}</h3>${scene.look?`<p class="scene-look"><span>${studyLanguage(['Observe','Notice'])}</span>${esc(scene.look)}</p>`:''}
      <div class="portal-pages"><button aria-label="Previous scene" data-p="prev" ${this.index?'':'disabled'}>←</button><span>Scene ${this.index+1} of ${this.parts.length}</span><button aria-label="Next Scene" data-p="next" ${this.index+1===this.parts.length?'disabled':''}>→</button></div><div class="portal-film" aria-label="Choose Scene">${this.parts.map((p,i)=>`<button data-p="frame" data-i="${i}" aria-label="Scene ${i+1}. ${esc(p.title)}" aria-pressed="${this.index===i}"><img alt="" loading="lazy" src="./scenes/${esc(passageScene(this.reading,p).file)}"><span>${p.from}–${p.to}</span></button>`).join('')}</div></div></div>
      <div class="portal-study"><div class="portal-lead"></div><nav aria-label="Investigate the scene">${buttons(primary)}</nav><details class="portal-more" ${secondary.some(([id])=>id===this.topic)?'open':''}><summary>History, ${this.guide?studyLanguage(['palavra-chave','keyword']):studyLanguage(['livro','book'])} and more</summary><nav aria-label="Deepen the study">${buttons(secondary)}</nav></details><div class="portal-note" tabindex="-1"></div></div>`;
    this.panel();
  }
  revealVerse(number, compare=false){
    const row=this.querySelector(`[data-study-verse="${number}"]`);
    if(!row)return;
    this.returnVerse=number;
    row.closest('details').open=true;
    if(row.getAttribute('aria-expanded')!=='true')row.click();
    if(compare){
      const other=row.closest('.verse-row').querySelector('.lexical-discovery details');
      if(other)other.open=true;
    }
    row.focus({preventScroll:true});row.scrollIntoView({block:'center'});
    row.classList.remove('verse-returned');void row.offsetWidth;row.classList.add('verse-returned');
  }
  panel() {
    const el = this.querySelector('.portal-note');
    this.disposeAtlas();
    const lead=this.querySelector('.portal-lead');
    const active=this.data.discoveries?.find(entry=>entry.start===this.part.from);
    const verse=this.returnVerse || active?.verse || this.part.from;
    lead.innerHTML=this.topic==='cena'?'':`<button data-p="return-text">← ${studyLanguage(['Voltar a','Back to'])} ${esc(ref(this.reading))}:${verse}</button>`;
    const full = ['estudiosos','panorama','livro','contexto','pratica','editorial','filme'].includes(this.topic);
    this.classList.toggle('study-wide',full || ['mapa','ecos'].includes(this.topic));
    el.classList.toggle('study-paper',full);
    if(full){
      el.innerHTML = this.topic==='editorial' ? studyRoom(this.reading,this.editorialTab || 'panorama',this.movement || 0) : chapterStudyPanel(this.reading,this.data,this.profile,this.topic);
      if(this.topic==='estudiosos') el.insertAdjacentHTML('beforeend',"<a href=\"./en/sources.html\" target=\"_blank\" rel=\"noopener\">Sources and licenses of the study</a>");
      if (!plan() || this.closest('.library-dialog')) el.querySelectorAll('[data-action="focus-notes"]').forEach(b=>b.remove());
      return;
    }
    const p = this.part, s = this.data.study;
    if (this.topic === 'voz') {
      const [letters, sound, meaning, context] = this.guide.word;
      el.innerHTML = `<small>Hebrew in dialogue with John</small><p class="portal-he" dir="rtl" lang="he">${esc(letters)}</p><h4>${esc(sound)} · ${esc(meaning)}</h4><button data-p="word">▷ Listen to ${esc(sound)}</button><small>Human recording - current Israeli pronunciation</small><p>${esc(context)}</p>`;
      return;
    }
    if (this.topic === 'mapa') {
      this.atlas(el);
      return;
    }
    if (this.topic === 'ecos') {
      const links = this.data.crossRefs.filter(r => r.fromVerse >= p.from && r.fromVerse <= p.to);
      this.links = links.length ? links : this.data.crossRefs.slice(0,3);
      el.innerHTML = `<small>${links.length?"Cross-references for this passage":"Chapter cross-references"}</small><h4>Compare passages</h4><div class="portal-links">${this.links.map((r,i)=>`<button data-p="compare" data-i="${i}">v. ${r.fromVerse} → ${esc(ref(r))}.${r.verse}</button>`).join('')}</div><div class="portal-pair" aria-live="polite"></div><details class="portal-network"><summary>Network of Chapter Connections</summary>${connectionExplorer(this.reading,this.data,this.verseFilter || 0)}<p>${esc(s.theology)}</p></details>`;if(this.links.length) this.compare(0); return;
    }
    if (this.topic === 'tempo') {
      if (this.guide) {
        el.innerHTML = `<small>Eastern Mediterranean - first half of the 1st century AD.</small><h4>Whose authority was?</h4><dl class="well-rule"><dt>Roman Empire</dt><dd>Tiberius was the emperor. The Roman government reached these regions through different authorities.</dd><dt>Judea and Samaria</dt><dd>Pontius Pilate served as mayor of Judea. Samaria was part of this administration.</dd><dt>Galilee</dt><dd>Herod Antipas ruled as tetrarch under the power of Rome. When he moved to Galilee, the traveler entered another jurisdiction.</dd></dl><p>The chapter does not inform the meeting year or identify by name the officer who seeks Jesus.</p><small>Luke 3.1 - John 4.46 <a href="https://resources.metmuseum.org/resources/metpublications/pdf/The_World_between_Empires_Art_and_Identity_in_the_Ancient_Middle_East.pdf" target="_blank" rel="noopener">Historical Atlas of Met</a></small>`;
        return;
      }
      el.innerHTML = `<small>Context of the chapter</small><h4>The world of this passage</h4><p>${esc(s.context)}</p>${this.profile?.dossier?`<details><summary>Time of the narrative</summary><p>${esc(this.profile.dossier.narratedEra)}</p></details>`:''}${[['politics',"Who exercised power?"],['customs',"How did people live?"],['language',"How did they express themselves?"]].map(([field,title])=>{
        const entry = this.profile?.dossier?.[field]?.[0]; if (!entry) return '';
        const refs = (this.profile.dossierSources || []).filter(src=>entry.sourceIds.includes(src.id));
        return `<details><summary>${title}</summary><small>Context of the book ${esc(entry.reference)}</small><p>${esc(entry.detail)}</p>${refs.map(src=>`<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title)}</a>`).join(' · ')}</details>`;
      }).join('')}<details><summary>Sources of the study</summary>${this.data.sources.map(src=>`<p><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.author)}</a></p>`).join('')}</details>`;return;
    }
    const annotation=this.data.study.scholarViews.find(v=>v.verse>=p.from && v.verse<=p.to);
    const place=this.data.places?.find(loc=>loc.verses?.some(v=>v>=p.from && v<=p.to));
    const evidence=this.guide?'':`<div class="scene-evidence">${annotation?`<details><summary>${esc(this.data.sources.find(src=>src.id===annotation.sourceId)?.author || annotation.sourceId)} · v. ${annotation.verse}</summary><p>${esc(annotation.insight)}</p></details>`:''}${place?`<button data-p="scene-location">Locate ${esc(atlasLabel(place))} ↗</button>`:''}</div>`;
    this.scenePlace=place?.name;
    const discovery=this.data.discoveries?.find(entry=>entry.start===p.from && entry.end===p.to);
    const exploreWord=discovery?`<button class="scene-word" data-p="lexical" data-i="${discovery.verse}"><span>${esc(studyLanguage(['Descobrir a palavra','Explore the word']))} · v. ${discovery.verse}</span> ${wordForm(discovery)} →</button>`:'';
    const lines = Array.from({length:p.to-p.from+1},(_,i)=>this.translation?.verses?.[p.from+i-1] || this.text?.[p.from+i]);
    if(discovery && lines[discovery.verse-p.from]){
      const text=lines[discovery.verse-p.from];
      const note=fieldNote(this.data,discovery.verse);
      const parallel=discovery.parallel;
      const nearby=parallel?.[0]===this.reading.bookId && parallel[1]===this.reading.chapter && parallel[2]>=p.from && parallel[2]<=p.to;
      const compareText=nearby && lines[parallel[2]-p.from];
      lead.innerHTML=`<article class="arrival-verse"><small>${esc(ref(this.reading))}:${discovery.verse} · ${esc(this.translation?.versionName || (ENGLISH?'World English Bible':"World English Bible"))}</small><blockquote>${highlightedText(text,discoveryAnchor(text,discovery))}</blockquote>${compareText?`<details ${text.length+compareText.length<300?'open':''}><summary>${esc(ref(this.reading))}:${parallel[2]}</summary><p>${highlightedText(compareText,discoveryAnchor(compareText,{gloss:discovery.parallelGloss,pt:discovery.parallelPt}))}</p></details>`:''}${note?`<p>${esc(studyLanguage(note.question))}</p>`:this.reading.bookId===20&&this.reading.chapter===1&&discovery.verse===4?`<p>${studyLanguage(['Como o versículo 7 aprofunda a ideia de conhecimento do versículo 4?','How does verse 7 develop the idea of knowledge in verse 4?'])}</p>`:''}${exploreWord}</article>`;
    }
    el.innerHTML = `<small>${esc(this.detail?.[2] || ref(this.reading)+' · v. '+p.from+'–'+p.to)}</small>${this.guide ? `<h4>${esc(this.guide.question)}</h4><div class="well-choices">${this.guide.choices.map(([label],i)=>`<button data-p="discover" data-i="${i}">${esc(label)} →</button>`).join('')}</div><div class="well-answer" aria-live="polite"></div><button data-p="guide-audio">▷ Play Portuguese guide</button><label class="scene-autoplay"><input type="checkbox" data-continue ${this.continueAudio?'checked':''}> Continue in the upcoming scenes</label>` : `<h4>Inside the passage</h4><p>${esc(p.explanation)}</p>`}${evidence}${lines.some(Boolean)?`<details><summary>Read the passage · ${esc(this.translation?.versionName || "World English Bible")}</summary><p class="verse-hint">Select a verse to explore its study notes.</p>${lines.map((v,i)=>`<div class="verse-row">${interactiveVerse(p.from+i,v,this.data)}</div>`).join('')}</details>`:''}`;
  }
  atlas(el) {
    const places = this.data.places || [];
    if (!places.length) { el.innerHTML="<h4>Places of the chapter</h4><p>This chapter does not have places with coordinates on the geographical basis.</p>"; return; }
    const selected = places.find(p=>atlasOptionKey(p,places)===this.atlasPlace) || places.find(p=>p.name===this.atlasPlace && p.verses?.includes(this.returnVerse)) || places.find(p=>p.name===this.atlasPlace) || places.find(p=>p.name===wellStops[this.guide?.place]) || places[0];
    this.atlasPlace = atlasOptionKey(selected,places);
    el.innerHTML = `<h4>${this.guide?"From Judea to Galilee":"Places of the "+esc(ref(this.reading))}</h4><div class="atlas-switch" role="group" aria-label="Map period"><button data-p="era" data-era="antigo">${studyLanguage(["Biblical map",'Biblical'])}</button><button data-p="era" data-era="comparar">${studyLanguage(['Antes e hoje','Then & now'])}</button><button data-p="era" data-era="hoje">${studyLanguage(["Present-day map",'Today'])}</button></div><label class="atlas-picker">Locate<select>${places.map(p=>`<option value="${esc(atlasOptionKey(p,places))}">${esc(atlasLabel(p))}${atlasOptionKey(p,places)!==p.name?' · v. '+esc(p.verses.join(', ')):''}</option>`).join('')}</select></label><div class="atlas-orientation" aria-live="polite"></div><div class="portal-map" aria-label="Interactive Atlas"></div><div class="atlas-info" aria-live="polite"></div>`;
    const select = el.querySelector('select');
    select.onchange = () => this.selectPlace(select.value,true);
    const node = el.querySelector('.portal-map');
    if(!modernAtlas)loadModernAtlas().then(data=>{
      if(data && node.isConnected && this.querySelector('.portal-map')===node)this.selectPlace(this.atlasPlace);
    });
    if (typeof L === 'undefined') { node.textContent="Interactive map is not available."; this.selectPlace(this.atlasPlace); return; }
    const map = this.atlasMap = L.map(node,{scrollWheelZoom:false,maxZoom:17});
    this.markers = new Map();
    places.forEach(place=>{
      const marker = L.circleMarker([place.latitude,place.longitude],{radius:6,color:'#161616',weight:2,fillColor:'#e5b86e',fillOpacity:1}).addTo(map);
      marker.bindTooltip(esc(atlasLabel(place)),{direction:'top'});
      const id=atlasOptionKey(place,places);marker.on('click',()=>this.selectPlace(id)); this.markers.set(id,marker);
    });
    const bounds = L.latLngBounds([...this.markers.values()].map(m=>m.getLatLng()));
    if(this.atlasView) map.setView(this.atlasView.center,this.atlasView.zoom);
    else if(places.length>1) map.fitBounds(bounds.pad(.18),{maxZoom:10});
    else map.setView(bounds.getCenter(),8);
    map.on('move zoomend resize',()=>this.clipRelief());
    this.switchEra(this.atlasEra || 'antigo');
    this.selectPlace(this.atlasPlace);
    this.mapResize = new ResizeObserver(()=>map.invalidateSize()); this.mapResize.observe(node);
  }
  switchEra(era) {
    if(!['antigo','comparar','hoje'].includes(era))era='antigo';
    this.atlasEra=era;
    const map=this.atlasMap;
    if(map){
      for(const layer of [this.base,this.route,this.overlay,this.modernVector,this.satellite])layer?.remove();
      this.base=this.route=this.overlay=this.modernVector=this.satellite=null;
      this.compareBox?.remove(); this.compareBox=null;
      const historic=era!=='hoje', present=era!=='antigo', token=this.modernToken=Symbol();
      // The relief sits above the present-day map, so the comparison only clips one layer.
      if(historic)this.base=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
        {maxNativeZoom:10,maxZoom:17,zIndex:2,attribution:'Esri, Earthstar Geographics and contributors'}).addTo(map);
      if(present){
        // The English vector map names today's countries, cities and roads. Satellite
        // imagery replaces it only when WebGL or the map library is unavailable.
        const satellite=()=>{
          if(this.modernToken!==token || this.atlasMap!==map)return;
          this.satellite=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            {maxNativeZoom:17,maxZoom:17,zIndex:1,attribution:'Esri, Earthstar Geographics and contributors'}).addTo(map);
        };
        loadModernMap().then(()=>{
          if(this.modernToken!==token || this.atlasMap!==map)return;
          this.modernVector=L.maplibreGL({style:new URL('./vendor/english-map/liberty-en.json',document.baseURI).href,attributionControl:{customAttribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}}).addTo(map);
        }).catch(satellite);
      }
      if(era==='comparar')this.addCompare(map);
      for(const [id,marker] of this.markers){
        const place=this.data.places.find(p=>atlasOptionKey(p,this.data.places)===id), name=place.name;
        const show=era==='antigo' && this.guide ? wellStops.includes(name) : this.markers.size<=6;
        marker.unbindTooltip().bindTooltip(esc(era==='hoje' ? 'Biblical · '+name : atlasLabel(place)),{permanent:show,direction:name==='Cana'?'left':'top'});
      }
      if(era==='antigo' && this.guide) this.overlay=L.imageOverlay('./scenes/john4-relief.webp',[[31.56,34.68],[33.06,35.82]],{attribution:'Terrain Tiles'}).addTo(map);
      const stops=(narrativeJourneys[key(this.reading)] || []).map(n=>this.markers.get(n)?.getLatLng()).filter(Boolean);
      if(historic && stops.length>1) this.route=L.polyline(stops,{interactive:false,color:'#8b542e',weight:2,dashArray:'5 6'}).addTo(map);
    }
    this.querySelectorAll('[data-p="era"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.era===era)));
    this.selectPlace(this.atlasPlace);
  }
  addCompare(map) {
    const box=this.compareBox=L.DomUtil.create('div','atlas-compare',map.getContainer());
    box.innerHTML=`<span class="atlas-compare-tag" data-side="then">${studyLanguage(['Bíblico','Biblical'])}</span><span class="atlas-compare-tag" data-side="now">${studyLanguage(['Hoje','Today'])}</span><i class="atlas-compare-line"></i><input type="range" min="0" max="100" step="0.5" value="${this.compareRatio ?? 50}" aria-label="${studyLanguage(['Deslize para comparar o mapa bíblico com o mapa de hoje','Slide to compare the biblical map with the present-day map'])}">`;
    const range=box.querySelector('input');
    // Dragging the handle must move the divider, not pan the map underneath.
    L.DomEvent.disableClickPropagation(range);
    for(const type of ['pointerdown','mousedown','touchstart','wheel'])range.addEventListener(type,e=>e.stopPropagation(),{passive:true});
    range.addEventListener('input',()=>{this.compareRatio=Number(range.value);this.clipRelief();});
    this.clipRelief();
  }
  clipRelief() {
    const map=this.atlasMap, box=this.compareBox, relief=this.base?.getContainer();
    if(!map || !box || !relief)return;
    const size=map.getSize(), thumb=44, x=thumb/2+(this.compareRatio ?? 50)/100*Math.max(0,size.x-thumb);
    const nw=map.containerPointToLayerPoint([0,0]), se=map.containerPointToLayerPoint(size);
    relief.style.clip=`rect(${nw.y}px, ${nw.x+x}px, ${se.y}px, ${nw.x}px)`;
    box.style.setProperty('--split',x+'px');
  }
  selectPlace(name, center=false) {
    const p=this.data.places.find(item=>atlasOptionKey(item,this.data.places)===name); if(!p)return;
    this.atlasPlace=name;
    const select=this.querySelector('.atlas-picker select');select.value=name;
    const marker=this.markers?.get(name);
    if(marker){
      this.markers.forEach((m,k)=>m.setStyle({radius:k===name?9:6,weight:k===name?3:2,color:k===name?'#fff':'#161616',fillColor:k===name?'#973e21':'#e5b86e'}));
      if(center)this.atlasMap.setView(marker.getLatLng(),Math.max(this.atlasMap.getZoom(),8));
      marker.bringToFront().openTooltip();
    }
    const modern=modernPlaces[p.name], era=this.atlasEra, today=era==='hoje';
    const geo=modernAtlas?.[atlasCoordinateKey(p)], pairCity=era!=='antigo' && geo && pointLikePlace(p) && !insideModernJerusalem(geo);
    this.querySelector('.atlas-orientation').innerHTML=modernComparison(p,geo);
    this.cityLayer?.remove();this.cityLayer=null;
    if(pairCity && this.atlasMap){
      this.cityLayer=L.layerGroup().addTo(this.atlasMap);
      const cityPoint=[geo.lat,geo.lon];
      L.polyline([[p.latitude,p.longitude],cityPoint],{color:'#194d71',weight:2,dashArray:'4 6',interactive:false}).addTo(this.cityLayer);
      L.circleMarker(cityPoint,{radius:5,weight:2,color:'#fff',fillColor:'#175474',fillOpacity:1}).addTo(this.cityLayer)
        .bindTooltip(esc(modernCityTag(geo)),{permanent:true,direction:'bottom',className:'modern-city-label'});
    }
    const well=this.guide && wellLocations[wellStops.indexOf(p.name)];
    const compareNote=studyLanguage(['Arraste o controle sobre o mapa. À esquerda, o relevo com os lugares bíblicos; à direita, os países, as cidades e as estradas de hoje.','Drag the handle across the map. On the left, the relief with biblical places; on the right, today’s countries, cities and roads.']);
    this.querySelector('.atlas-info').innerHTML=`<small>${era==='comparar'?studyLanguage(['Antes e hoje','Then and now']):today?"Current geography":"Geography of the narrative"} · v. ${esc(p.verses?.join(', '))}</small><h4>${esc(today && modern?modern[1]:atlasLabel(p))}</h4><p>${esc(era==='comparar' ? compareNote : today ? modern?.[2] || "The point brings the place mentioned. Use the names and routes of the current map to recognize the region." : well?.[3] || "Approximate location from the History Globe set.")}</p>${era==='antigo'?"<small>I remember the current verse with biblical places. The paths link narrated stops and the old borders are not represented.</small>":''}<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;hl=en&amp;query=${p.latitude},${p.longitude}">Open in OpenStreetMap ↗</a>${geo && pointLikePlace(p)?`<div class="atlas-modern-tools">${pairCity?`<button data-p="city-bounds">${studyLanguage(['Enquadrar os dois pontos','Show both points'])}</button>`:''}<a href="https://www.geonames.org/${esc(geo.id)}/" target="_blank" rel="noopener">${studyLanguage(['Cidade de referência no GeoNames','Reference city on GeoNames'])} ↗</a></div>`:''}${this.profile?.dossier?.narratedEra ? `<details><summary>Time of the narrative</summary><p>${esc(this.profile.dossier.narratedEra)}</p></details>` : ''}${p.verses?.length ? `<button data-action="focus-verse" data-verse="${p.verses.includes(this.returnVerse)?this.returnVerse:p.verses[0]}">Read verse · ${p.verses.includes(this.returnVerse)?this.returnVerse:p.verses[0]}</button>` : ''}`;
  }
  disposeAtlas() {
    if(!this.atlasMap)return;
    this.atlasView={center:this.atlasMap.getCenter(),zoom:this.atlasMap.getZoom()};
    this.mapResize?.disconnect(); this.atlasMap.remove();
    this.compareBox?.remove();
    this.atlasMap=this.markers=this.base=this.overlay=this.route=this.modernVector=this.satellite=this.cityLayer=this.compareBox=null;
  }
  async compare(i, chosen) {
    const target = this.querySelector('.portal-pair'), link = chosen || this.links[i];
    const token = this.compareToken = Symbol();
    target.textContent = "Loading the verses...";
    try {
      const [source,dest] = await Promise.all([portalBookText(this.reading.bookId), portalBookText(link.bookId)]);
      if (token !== this.compareToken) return;
      const nearby=(verses,v)=>[v-1,v,v+1].filter(n=>verses?.[n]).map(n=>`<p><sup>${n}</sup> ${esc(verses[n])}</p>`).join('');
      const quote = (name,t)=>`<blockquote><small>${esc(name)}</small><p>${esc(t || "Text not available in this edition.")}</p></blockquote>`;
      target.innerHTML = "<small>World English Bible</small>" + quote(ref(this.reading)+'.'+link.fromVerse,source[this.reading.chapter]?.[link.fromVerse])+quote(ref(link)+'.'+link.verse,dest[link.chapter]?.[link.verse]) + `<details><summary>See the context of the verses</summary><h4>${esc(ref(this.reading))}</h4>${nearby(source[this.reading.chapter],link.fromVerse)}<h4>${esc(ref(link))}</h4>${nearby(dest[link.chapter],link.verse)}</details><details><summary>Read about Reading ${esc(ref(link))} in full</summary>${Object.entries(dest[link.chapter] || {}).map(([v,text])=>`<p><sup>${esc(v)}</sup> ${esc(text)}</p>`).join('')}</details>`;
    } catch { if(token===this.compareToken) target.textContent="Text not available now. Tap the reference to try again."; }
  }
  act(e) {
    const jump=e.target.closest('.dossier-jump a');
    if(jump){e.preventDefault();this.querySelector(jump.hash)?.scrollIntoView({block:'start'});return;}
    const local=e.target.closest('[data-action]');
    if(local){
      e.stopPropagation();
      const action=local.dataset.action;
      if(action==='connection-filter'){
        this.verseFilter=Number(local.dataset.verse);this.panel();
        this.querySelector('.portal-network').open=true;
        this.querySelector('[data-action="connection-filter"][aria-pressed="true"]')?.focus({preventScroll:true});return;
      }
      if(action==='crossref'){
        const link=this.data.crossRefs[Number(local.dataset.index)];
        this.compare(0,link);this.querySelector('.portal-pair').scrollIntoView({block:'nearest'});return;
      }
      if(action==='study-tab') this.editorialTab=local.dataset.tab;
      if(action==='movement') this.movement=Number(local.dataset.index);
      if(action==='focus-verse' || action==='back-to-reading'){
        const verse=Number(local.dataset.verse)||this.part.from;
        this.index=Math.max(0,this.parts.findIndex(p=>p.from<=verse && p.to>=verse));
        this.topic='cena'; this.paint(); const button=this.querySelector(`[data-study-verse="${verse}"]`); if(button){button.closest('details').open=true;button.focus();}return;
      }
      if(action==='focus-notes'){
        const dialog=this.closest('dialog'); if(dialog)dialog.close();
        requestAnimationFrame(()=>document.querySelector('#notes')?.focus());return;
      }
      this.panel();
      const match=[...this.querySelectorAll('[data-action]')].find(b=>b.dataset.action===action && b.dataset.tab===local.dataset.tab && b.dataset.index===local.dataset.index);
      match?.focus({preventScroll:true});return;
    }
    const b = e.target.closest('[data-p]'); if (!b) return;
    const action = b.dataset.p;
    this.stopSound();
    if (action === 'expand') {
      if (this.hasAttribute('expanded')) { this.closest('dialog').close(); return; }
      const origin=document.activeElement;
      stopLocalNarration();
      const dialog = document.createElement('dialog');
      dialog.className = 'portal-dialog'; dialog.setAttribute('aria-label',"Inside the passage");
      dialog.innerHTML = `<passage-portal expanded data-start="${this.index}" data-topic="${this.topic}"></passage-portal>`;
      const inner=dialog.firstElementChild;
      const copyView=(from,to)=>{for(const k of ['atlasEra','atlasPlace','atlasView','editorialTab','movement'])to[k]=from[k];};
      if(this.atlasMap)this.atlasView={center:this.atlasMap.getCenter(),zoom:this.atlasMap.getZoom()};
      copyView(this,inner);
      document.body.append(dialog); document.body.classList.add('portal-open');
      dialog.addEventListener('close',()=>{ this.index=dialog.firstElementChild.index; this.topic=inner.topic; dialog.remove(); copyView(inner,this); this.disposeAtlas(); this.atlasView=inner.atlasView; document.body.classList.remove('portal-open'); this.paint(); (origin?.isConnected ? origin : this.querySelector('[data-p="expand"]')).focus({preventScroll:true}); },{once:true});
      dialog.showModal(); dialog.querySelector('[data-p="expand"]').focus(); return;
    }
    if (action === 'frame') { this.index=Number(b.dataset.i); this.returnVerse=null; this.paint(); this.querySelector('[data-p="frame"][aria-pressed="true"]').focus({preventScroll:true});return; }
    if (action === 'prev' || action === 'next') {
      this.index += action === 'prev' ? -1 : 1; this.returnVerse=null; this.paint();
      (this.querySelector(`[data-p="${action}"]:enabled`) || this.querySelector('[data-p="inspect"]')).focus({preventScroll:true});return;
    }
    if (action === 'inspect' || action === 'hide-note') {
      const stage = this.querySelector('.portal-stage');
      const pin = stage.querySelector('.portal-pin');
      const note = stage.querySelector('.portal-insight');
      pin.setAttribute('aria-expanded', String(!note));
      if (note) { note.remove(); pin.focus({preventScroll:true}); return; }
      const aside = document.createElement('aside');
      aside.className = 'portal-insight';
      aside.innerHTML = `<button data-p="hide-note" aria-label="Close observation">×</button><small>${esc(this.detail?.[2] || ref(this.reading))}</small><h4>${esc(this.detail?.[0] || this.part.title)}</h4><p>${esc(this.detail?.[1] || this.part.explanation)}</p>`;
      stage.append(aside); aside.querySelector('button').focus({preventScroll:true}); return;
    }
    if (action === 'compare') return this.compare(Number(b.dataset.i));
    if (action === 'guide-audio') {
      const player = document.createElement('audio');
      player.controls = true; player.src = './media/john4/'+this.index+'.mp3';
      player.setAttribute('aria-label',"Portuguese audio guide"); b.replaceWith(player);
      player.onended=()=>{
        if(!this.continueAudio || !player.isConnected || this.index+1>=this.parts.length)return;
        this.index++;this.paint();this.querySelector('[data-p="guide-audio"]')?.click();
      };
      player.play().catch(()=>player.focus());return;
    }
    if (action === 'discover') {
      this.querySelectorAll('[data-p="discover"]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));
      this.querySelector('.well-answer').innerHTML = `<p>${esc(this.guide.choices[Number(b.dataset.i)][1])}</p><small>${esc(this.guide.source)}</small>`;
      return;
    }
    if(action==='return-text'){
      const verse=this.returnVerse || this.data.discoveries?.find(e=>e.start===this.part.from)?.verse || this.part.from;
      this.topic='cena';this.paint();this.revealVerse(verse);return;
    }
    if(action==='lexical'){
      this.revealVerse(Number(b.dataset.i),true);
      return;
    }
    if(action==='verse-place'){this.atlasPlace=b.dataset.place;this.returnVerse=Number(b.dataset.returnVerse);this.querySelector('[data-p="mapa"]').click();return;}
    if(action==='scene-location'){this.atlasPlace=this.scenePlace;this.querySelector('[data-p="mapa"]').click();return;}
    if(action==='city-bounds'){
      const p=this.data.places.find(place=>atlasOptionKey(place,this.data.places)===this.atlasPlace);
      const geo=p && modernAtlas?.[atlasCoordinateKey(p)];
      if(geo && this.atlasMap)this.atlasMap.fitBounds([[p.latitude,p.longitude],[geo.lat,geo.lon]],{padding:[40,45],maxZoom:13});
      return;
    }
    if (action === 'era') { this.switchEra(b.dataset.era);return; }
    if (action === 'word') {
      this.audio = new Audio('./media/hebrew/'+this.guide.word[4]+'.mp3');
      this.audio.play().catch(()=>{ b.textContent="Try to hear again"; });return;
    }
    this.topic = action;
    this.querySelectorAll('nav button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.p===this.topic)));
    this.panel();

  }
}
customElements.define('passage-portal', PassagePortal);

async function enterLibraryPortal(trigger, initialReading, restore=null) {
  const dialog=document.createElement('dialog');
  dialog.className='portal-dialog library-dialog';
  const toolbar=document.createElement('form');
  toolbar.className='chapter-bar';
  toolbar.innerHTML=`<label>Book<select name="bookId">${books.map(b=>`<option value="${b.id}">${esc(b.name)}</option>`).join('')}</select></label><label>Chapter<select name="chapter"></select></label><button type="button" data-step="-1" aria-label="Previous chapter">←</button><button type="button" data-step="1" aria-label="Next chapter">→</button><select class="portal-language" name="language" aria-label="Language"><option value="pt" ${ENGLISH?'':'selected'}>PT</option><option value="en" ${ENGLISH?'selected':''}>EN</option></select><button type="button" data-close>Close ×</button>`;
  const body=document.createElement('div');body.className='library-portal-body';
  dialog.append(toolbar,body);
  let revision=0;
  let firstArrival=true;
  async function load(reading){
    const request=++revision;
    rememberReading(reading);
    const picker=document.querySelector('#chapter-browser');
    if(picker){picker.elements.bookId.value=reading.bookId;picker.elements.chapter.innerHTML=chapterOptions(reading);refreshBrowseCover();}
    toolbar.elements.bookId.value=reading.bookId;toolbar.elements.chapter.innerHTML=chapterOptions(reading);
    toolbar.querySelector('[data-step="-1"]').disabled=reading.bookId===1 && reading.chapter===1;
    toolbar.querySelector('[data-step="1"]').disabled=reading.bookId===66 && reading.chapter===book(66).chapters;
    dialog.setAttribute('aria-label',ref(reading));
    if(!restore && location.hash.startsWith('#study=')){
      const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);
    }
    body.innerHTML=`<div class="portal-loading" role="status"><img alt="" src="./scenes/${esc(browseCover().file)}"><span>${esc(ref(reading))}</span></div>`;
    try{
      const [data,profile]=await Promise.all([getJson('/api/library/'+key(reading).replace(':','/')),getJson('/api/book-profile/'+reading.bookId).catch(()=>null)]);
      if(!dialog.open || request!==revision)return;
      const scene=document.createElement('passage-portal');scene.reading=reading;scene.data=data;scene.profile=profile;
      if(restore){const verse=Number(restore.verse);const i=data.study.outline.findIndex(p=>verse>=p.from && verse<=p.to);
        scene.dataset.start=String(i>=0?i:restore.index || 0);scene.pendingVerse=i>=0?verse:null;scene.returnVerse=scene.pendingVerse;scene.dataset.topic=restore.topic || 'cena';scene.atlasEra=restore.era;scene.atlasPlace=restore.place;restore=null;}
      if(firstArrival){scene.classList.add('portal-first-arrival');firstArrival=false;}
      scene.setAttribute('expanded','');body.replaceChildren(scene);
    }catch{
      if(!dialog.open || request!==revision)return;
      body.innerHTML="<p class=\"loading\" role=\"alert\">It was not possible to load this chapter. <button>Try again</button></p>";
      body.querySelector('button').onclick=()=>load(reading);
    }
  }
  toolbar.querySelectorAll('[data-step]').forEach(button=>button.onclick=()=>{
    let id=Number(toolbar.elements.bookId.value), chapter=Number(toolbar.elements.chapter.value)+Number(button.dataset.step);
    if(chapter<1 && id>1){id--;chapter=book(id).chapters;}
    if(chapter>book(id).chapters && id<66){id++;chapter=1;}
    load({bookId:id,chapter});
  });
  toolbar.onchange=e=>{
    const bookId=Number(toolbar.elements.bookId.value),chapter=Number(toolbar.elements.chapter.value);
    if(e.target.name==='language'){
      const scene=body.querySelector('passage-portal');
      switchLanguage(e.target.value,{bookId,chapter,index:scene?.index,topic:scene?.topic,era:scene?.atlasEra,place:scene?.atlasPlace,verse:scene?.returnVerse});return;
    }
    load({bookId,chapter:e.target.name==='bookId'?1:chapter});
  };
  toolbar.onsubmit=e=>e.preventDefault();
  function clearSharedReference(){
    if(location.hash.startsWith('#study=')){const url=new URL(location.href);url.hash='';history.replaceState(history.state,'',url);}
  }
  toolbar.querySelector('[data-close]').onclick=()=>{clearSharedReference();dialog.close();};
  dialog.addEventListener('cancel',clearSharedReference);
  dialog.addEventListener('close',()=>{revision++;dialog.remove();document.body.classList.remove('portal-open');
    clearSharedReference();
    trigger.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);document.body.classList.add('portal-open');dialog.showModal();
  await load(initialReading);
}
