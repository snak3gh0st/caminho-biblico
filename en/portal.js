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
function atlasLabel(place) { return modernPlaces[place.name]?.[0] || place.name; }

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
    portalBookText(this.reading.bookId).then(data => {
      this.text = data[this.reading.chapter] || {};
      if (this.isConnected && !this.querySelector('audio') && !this.querySelector('.well-answer p') && this.topic === 'cena' && !this.translation) this.panel();
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
      <div class="portal-caption"><small>${scene.thematic?"Thematic environment":"Interpretative scene"} · AI</small><h3>${esc(this.guide?.title || this.part.title)}</h3>
      <div class="portal-pages"><button aria-label="Previous scene" data-p="prev" ${this.index?'':'disabled'}>←</button><span>Scene ${this.index+1} of ${this.parts.length}</span><button aria-label="Next Scene" data-p="next" ${this.index+1===this.parts.length?'disabled':''}>→</button></div><div class="portal-film" aria-label="Choose Scene">${this.parts.map((p,i)=>`<button data-p="frame" data-i="${i}" aria-label="Scene ${i+1}. ${esc(p.title)}" aria-pressed="${this.index===i}"><img alt="" loading="lazy" src="./scenes/${esc(passageScene(this.reading,p).file)}"><span>${p.from}–${p.to}</span></button>`).join('')}</div></div></div>
      <div class="portal-study"><nav aria-label="Investigate the scene">${buttons(primary)}</nav><details class="portal-more" ${secondary.some(([id])=>id===this.topic)?'open':''}><summary>History, ${this.guide?'palavra-chave':'livro'} and more</summary><nav aria-label="Deepen the study">${buttons(secondary)}</nav></details><div class="portal-note" tabindex="-1"></div></div>`;
    this.panel();
  }
  panel() {
    const el = this.querySelector('.portal-note');
    this.disposeAtlas();
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
    el.innerHTML = `<small>${esc(this.detail?.[2] || ref(this.reading)+' · v. '+p.from+'–'+p.to)}</small>${this.guide ? `<h4>${esc(this.guide.question)}</h4><div class="well-choices">${this.guide.choices.map(([label],i)=>`<button data-p="discover" data-i="${i}">${esc(label)} →</button>`).join('')}</div><div class="well-answer" aria-live="polite"></div><button data-p="guide-audio">▷ Play Portuguese guide</button><label class="scene-autoplay"><input type="checkbox" data-continue ${this.continueAudio?'checked':''}> Continue in the upcoming scenes</label>` : `<h4>Inside the passage</h4><p>${esc(p.explanation)}</p>`}${evidence}${lines.some(Boolean)?exploreWord:''}${lines.some(Boolean)?`<details><summary>Read the passage · ${esc(this.translation?.versionName || "World English Bible")}</summary><p class="verse-hint">Select a verse to explore its study notes.</p>${lines.map((v,i)=>`<div class="verse-row">${interactiveVerse(p.from+i,v,this.data)}</div>`).join('')}</details>`:''}`;
  }
  atlas(el) {
    const places = this.data.places || [];
    if (!places.length) { el.innerHTML="<h4>Places of the chapter</h4><p>This chapter does not have places with coordinates on the geographical basis.</p>"; return; }
    const selected = places.find(p=>p.name===this.atlasPlace) || places.find(p=>p.name===wellStops[this.guide?.place]) || places[0];
    this.atlasPlace = selected.name;
    el.innerHTML = `<h4>${this.guide?"From Judea to Galilee":"Places of the "+esc(ref(this.reading))}</h4><div class="atlas-switch" role="group" aria-label="Map period"><button data-p="era" data-era="antigo">Biblical map</button><button data-p="era" data-era="hoje">Present-day map</button></div><label class="atlas-picker">Locate<select>${places.map(p=>`<option value="${esc(p.name)}">${esc(atlasLabel(p))}</option>`).join('')}</select></label><div class="portal-map" aria-label="Interactive Atlas"></div><div class="atlas-info" aria-live="polite"></div>`;
    const select = el.querySelector('select');
    select.onchange = () => this.selectPlace(select.value,true);
    const node = el.querySelector('.portal-map');
    if (typeof L === 'undefined') { node.textContent="Interactive map is not available."; this.selectPlace(selected.name); return; }
    const map = this.atlasMap = L.map(node,{scrollWheelZoom:false,maxZoom:17});
    this.markers = new Map();
    places.forEach(place=>{
      const marker = L.circleMarker([place.latitude,place.longitude],{radius:6,color:'#161616',weight:2,fillColor:'#e5b86e',fillOpacity:1}).addTo(map);
      marker.bindTooltip(esc(atlasLabel(place)),{direction:'top'});
      marker.on('click',()=>this.selectPlace(place.name)); this.markers.set(place.name,marker);
    });
    const bounds = L.latLngBounds([...this.markers.values()].map(m=>m.getLatLng()));
    if(this.atlasView) map.setView(this.atlasView.center,this.atlasView.zoom);
    else if(places.length>1) map.fitBounds(bounds.pad(.18),{maxZoom:10});
    else map.setView(bounds.getCenter(),8);
    this.switchEra(this.atlasEra || 'antigo');
    this.selectPlace(selected.name);
    this.mapResize = new ResizeObserver(()=>map.invalidateSize()); this.mapResize.observe(node);
  }
  switchEra(era) {
    this.atlasEra=era;
    const map=this.atlasMap;
    if(map){
      this.base?.remove(); this.route?.remove(); this.overlay?.remove();
      const historic=era==='antigo';
      this.modernVector?.remove(); this.modernVector=null;
      this.base=L.tileLayer(historic?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}':'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {maxNativeZoom:historic?10:17,maxZoom:17,attribution:'Esri, Earthstar Geographics and contributors'}).addTo(map);
      const currentBase=this.base;
      if(!historic) loadModernMap().then(()=>{
        if(this.atlasMap!==map || this.base!==currentBase)return;
        this.modernVector=L.maplibreGL({style:new URL('./vendor/english-map/liberty-en.json',document.baseURI).href,attributionControl:{customAttribution:'<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://openmaptiles.org/">OpenMapTiles</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}}).addTo(map);
      }).catch(()=>{}); // Satellite imagery and English place markers remain usable without WebGL.
      for(const [name,marker] of this.markers){
        const show=historic && this.guide ? wellStops.includes(name) : this.markers.size<=6;
        marker.unbindTooltip().bindTooltip(esc(historic ? modernPlaces[name]?.[0] || name : name),{permanent:show,direction:name==='Cana'?'left':'top'});
      }
      if(historic && this.guide) this.overlay=L.imageOverlay('./scenes/john4-relief.webp',[[31.56,34.68],[33.06,35.82]],{attribution:'Terrain Tiles'}).addTo(map);
      const stops=(narrativeJourneys[key(this.reading)] || []).map(n=>this.markers.get(n)?.getLatLng()).filter(Boolean);
      if(historic && stops.length>1) this.route=L.polyline(stops,{interactive:false,color:'#8b542e',weight:2,dashArray:'5 6'}).addTo(map);
    }
    this.querySelectorAll('[data-p="era"]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.era===era)));
    this.selectPlace(this.atlasPlace);
  }
  selectPlace(name, center=false) {
    const p=this.data.places.find(item=>item.name===name); if(!p)return;
    this.atlasPlace=name;
    const select=this.querySelector('.atlas-picker select');select.value=name;
    const marker=this.markers?.get(name);
    if(marker){
      this.markers.forEach((m,k)=>m.setStyle({radius:k===name?9:6,weight:k===name?3:2,color:k===name?'#fff':'#161616',fillColor:k===name?'#973e21':'#e5b86e'}));
      if(center)this.atlasMap.setView(marker.getLatLng(),Math.max(this.atlasMap.getZoom(),8));
      marker.bringToFront().openTooltip();
    }
    const modern=modernPlaces[name], today=this.atlasEra==='hoje';
    const well=this.guide && wellLocations[wellStops.indexOf(name)];
    this.querySelector('.atlas-info').innerHTML=`<small>${today?"Current geography":"Geography of the narrative"} · v. ${esc(p.verses?.join(', '))}</small><h4>${esc(today && modern?modern[1]:atlasLabel(p))}</h4><p>${esc(today ? modern?.[2] || "The point brings the place mentioned. Use the names and routes of the current map to recognize the region." : well?.[3] || "Approximate location from the History Globe set.")}</p>${!today?"<small>I remember the current verse with biblical places. The paths link narrated stops and the old borders are not represented.</small>":''}<a target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&amp;hl=en&amp;query=${p.latitude},${p.longitude}">Open in OpenStreetMap ↗</a>${this.profile?.dossier?.narratedEra ? `<details><summary>Time of the narrative</summary><p>${esc(this.profile.dossier.narratedEra)}</p></details>` : ''}${p.verses?.length ? `<button data-action="focus-verse" data-verse="${p.verses.includes(this.returnVerse)?this.returnVerse:p.verses[0]}">Read verse · ${p.verses.includes(this.returnVerse)?this.returnVerse:p.verses[0]}</button>` : ''}`;
  }
  disposeAtlas() {
    if(!this.atlasMap)return;
    this.atlasView={center:this.atlasMap.getCenter(),zoom:this.atlasMap.getZoom()};
    this.mapResize?.disconnect(); this.atlasMap.remove();
    this.atlasMap=this.markers=this.base=this.overlay=this.route=this.modernVector=null;
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
    if (action === 'frame') { this.index=Number(b.dataset.i); this.paint(); this.querySelector('[data-p="frame"][aria-pressed="true"]').focus({preventScroll:true});return; }
    if (action === 'prev' || action === 'next') {
      this.index += action === 'prev' ? -1 : 1; this.paint();
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
    if(action==='lexical'){
      const row=this.querySelector(`[data-study-verse="${Number(b.dataset.i)}"]`);
      if(row){row.closest('details').open=true;if(row.getAttribute('aria-expanded')!=='true')row.click();row.focus();}
      return;
    }
    if(action==='verse-place'){this.atlasPlace=b.dataset.place;this.returnVerse=Number(b.dataset.returnVerse);this.querySelector('[data-p="mapa"]').click();return;}
    if(action==='scene-location'){this.atlasPlace=this.scenePlace;this.querySelector('[data-p="mapa"]').click();return;}
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
  async function load(reading){
    const request=++revision;
    rememberReading(reading);
    const picker=document.querySelector('#chapter-browser');
    if(picker){picker.elements.bookId.value=reading.bookId;picker.elements.chapter.innerHTML=chapterOptions(reading);refreshBrowseCover();}
    toolbar.elements.bookId.value=reading.bookId;toolbar.elements.chapter.innerHTML=chapterOptions(reading);
    toolbar.querySelector('[data-step="-1"]').disabled=reading.bookId===1 && reading.chapter===1;
    toolbar.querySelector('[data-step="1"]').disabled=reading.bookId===66 && reading.chapter===book(66).chapters;
    dialog.setAttribute('aria-label',ref(reading));
    body.innerHTML="<p class=\"loading\" role=\"status\">Loading the chapter...</p>";
    try{
      const [data,profile]=await Promise.all([getJson('/api/library/'+key(reading).replace(':','/')),getJson('/api/book-profile/'+reading.bookId).catch(()=>null)]);
      if(!dialog.open || request!==revision)return;
      const scene=document.createElement('passage-portal');scene.reading=reading;scene.data=data;scene.profile=profile;
      if(restore){scene.dataset.start=String(restore.index || 0);scene.dataset.topic=restore.topic || 'cena';scene.atlasEra=restore.era;scene.atlasPlace=restore.place;restore=null;}
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
      switchLanguage(e.target.value,{bookId,chapter,index:scene?.index,topic:scene?.topic,era:scene?.atlasEra,place:scene?.atlasPlace});return;
    }
    load({bookId,chapter:e.target.name==='bookId'?1:chapter});
  };
  toolbar.onsubmit=e=>e.preventDefault();
  toolbar.querySelector('[data-close]').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{revision++;dialog.remove();document.body.classList.remove('portal-open');trigger.focus({preventScroll:true});},{once:true});
  document.body.append(dialog);document.body.classList.add('portal-open');dialog.showModal();
  await load(initialReading);
}
