// The reader and the immersive view use the same study and passage artwork.
const wellScenes = [
  ['O poço de Jacó', 'A viagem para no poço. João situa o encontro perto das terras que Jacó dera a José. Quando a mulher chama Jacó de “nosso pai”, ela fala de uma memória que também pertence aos samaritanos.', 'João 4.5–6, 12'],
  ['O cântaro e a água', 'Imagine chegar para tirar água e ouvir um viajante pedir de beber. A mulher observa que ele nem sequer tem como tirar água do poço. É dessa dificuldade concreta que nasce a pergunta sobre a água viva.', 'João 4.7–15'],
  ['O cântaro deixado', 'Repare no que fica para trás. A mulher deixa o cântaro e vai à cidade. Seu convite leva outras pessoas até Jesus. A narrativa passa da palavra de uma testemunha à escuta dos próprios moradores.', 'João 4.28–30, 39–42'],
  ['A distância até Cafarnaum', 'O pai pede que Jesus desça antes que seu filho morra. Ele volta pelo caminho confiando na palavra que ouviu. Observe quando a notícia da cura chega e por que o pai pergunta a hora.', 'João 4.46–53']
];
const wellFieldwork = [
  {
    title:'Você chegou ao poço', question:'Por que João apresenta o dono da terra antes de apresentar a mulher?',
    choices:[['Seguir a viagem', 'Jesus vem da Judeia, atravessa Samaria e segue para a Galileia. O cansaço interrompe essa viagem e dá ocasião à conversa. Abra o mapa e localize a parada entre o sul e o norte.'],['Investigar a terra', 'João liga o terreno a Jacó e José. Ouça depois como a própria mulher chama Jacó de “nosso pai”. Os dois viajantes podem reconhecer o mesmo ancestral mesmo quando suas comunidades divergem sobre o culto.']],
    source:'João 4.3–6, 12 · Gênesis 33.18–20', place:1,
    word:['בְּאֵר','be’ér','poço','O termo aparece no encontro junto ao poço de Gênesis 29.2. Em João, a profundidade do poço explica por que um viajante cansado depende de quem pode tirar a água.','beer']
  },
  {
    title:'Quem pode dar de beber?', question:'Você está à beira de um poço profundo. O viajante pede água. O que está faltando?',
    choices:[['Procurar o recipiente','A mulher percebe que Jesus não traz com que tirar a água. Antes de falar da vida que Deus dá, a conversa passa pelas mãos de quem tem o equipamento para alcançar a água.'],['Escutar a pergunta dela','Ela identifica quem pede e quem serve: um judeu pede de beber a uma samaritana. O próprio diálogo dá peso social a esse gesto. Mais adiante, a mulher contrapõe o monte de seus antepassados a Jerusalém.']],
    source:'João 4.7–15, 19–24',place:1,
    word:['מַיִם','máyim','água','Jeremias 2.13 usa a expressão hebraica “fonte de águas vivas”. Em João 4, escrito em grego, a mulher pergunta de onde virá a água. O pedido de beber dá sentido à imagem antes que Jesus fale da vida eterna.','mayim']
  },
  {
    title:'Ela volta sem o cântaro',question:'Siga o cântaro ou siga a mulher. O que cada caminho deixa ver?',
    choices:[['Ficar junto ao poço','O cântaro fica. Os discípulos chegam com comida. Jesus convida o grupo a levantar os olhos para os campos e fala de semear e colher. O cotidiano fornece o vocabulário do ensino.'],['Acompanhar o convite','A mulher vai à cidade e convida as pessoas a verificar o que ouviram. Os moradores saem, pedem que Jesus fique e, dois dias depois, distinguem o testemunho dela do que eles mesmos ouviram.']],
    source:'João 4.28–42',place:1,
    word:['שָׂדֶה','sadê','campo','Em Levítico 19.9, o campo é terra de colheita e o que fica nas bordas importa para o pobre e o estrangeiro. Em João 4.35, olhar para os campos prepara a imagem do trabalho partilhado entre quem semeia e quem colhe.','sadeh']
  },
  {
    title:'O pai precisa voltar para casa',question:'Em que momento o pai tem de decidir se confia no que ouviu?',
    choices:[['Partir de Caná','O filho está em Cafarnaum. Quando o pai parte, ainda não recebeu a notícia da cura. O deslocamento cria um intervalo entre confiar na palavra e conferir o que aconteceu.'],['Escutar os servos','Os servos vêm ao encontro do pai. Ele pergunta a hora da melhora e a compara com a hora em que Jesus falou. A sequência explica por que João narra a viagem de volta.']],
    source:'João 4.46–54',place:2,
    word:['אֱמוּנָה','emuná','fidelidade, confiança','Habacuque 2.4 emprega esse substantivo hebraico. Ele oferece uma ponte para pensar na confiança do pai. Em João 4.50, o evangelista usa um verbo grego para dizer que o homem creu e partiu.','emunah']
  }
];
const wellLocations = [
  ['Jerusalém',48.9,85.9,'Na Judeia, Jerusalém é o lugar de culto mencionado pela mulher. A viagem começa na Judeia. João deixa em aberto o ponto exato da partida.','João 4.3, 20'],
  ['Sicar',53.7,56.6,'João situa o poço perto de Sicar, em Samaria. A tradição samaritana associa o monte sagrado ao Gerizim. É desse lugar que a mulher fala quando pergunta onde adorar.','João 4.5–6, 20–21'],
  ['Caná',54.9,16.2,'De volta à Galileia, Jesus encontra o pai em Caná. O narrador lembra ali o episódio anterior da água e do vinho. A posição de Caná no mapa é aproximada.','João 4.46'],
  ['Cafarnaum',78.9,12.3,'O filho está em Cafarnaum, junto ao lago da Galileia. Observe a separação entre o lugar da conversa e o da cura.','João 4.46–53']
];
const modernPlaces = {
  Jerusalem: ['Jerusalém','Cidade Velha de Jerusalém','O ponto situa a região histórica da cidade. Amplie para reconhecer suas ruas e os bairros ao redor.'],
  Sychar: ['Sicar','Arredores de Nablus, Cisjordânia','A tradição situa o encontro junto ao poço de Jacó, perto de Nablus. A identificação da antiga Sicar é discutida.'],
  Cana: ['Caná','Baixa Galileia, Israel','Khirbet Qana e a região de Kafr Kanna são identificações propostas. O ponto indica uma das hipóteses.'],
  Capernaum: ['Cafarnaum','Kfar Nahum, Israel','O sítio arqueológico fica na margem noroeste do lago de Genesaré, também chamado mar da Galileia.'],
  'Mount Gerizim':['Monte Gerizim','Monte Gerizim, ao sul de Nablus','O monte continua sendo um lugar sagrado para a comunidade samaritana.'],
  Judea:['Judeia','Região histórica ao redor de Jerusalém','O marcador é uma referência regional. Os limites das jurisdições antigas diferem dos atuais.'],
  Samaria:['Samaria','Região montanhosa ao redor de Nablus','O nome designa uma região histórica. O marcador não delimita a extensão do território.'],
  Galilee:['Galileia','Galileia, norte de Israel','A região estende-se além do lago. O marcador oferece uma referência regional.']
};
const wellStops = ['Jerusalem','Sychar','Cana','Capernaum'];
function atlasLabel(place) { return modernPlaces[place.name]?.[0] || place.name; }

const portalTexts = new Map();
function portalBookText(id) {
  if (!portalTexts.has(id)) portalTexts.set(id, staticFile('media/portal-text/' + id + '.json').catch(() => { portalTexts.delete(id); return {}; }));
  return portalTexts.get(id);
}
class PassagePortal extends HTMLElement {
  connectedCallback() {
    this.reading ??= plan()?.days[activeDay]?.readings[activeReading];
    this.data ??= libraryData;
    this.profile ??= bookProfileData;
    this.translation ??= chapterData;
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
    const primary = [['cena','Investigar'],['mapa','Mapas'],['estudiosos','Estudiosos'],['tempo','Época'],['ecos','Conexões']];
    if (this.guide) primary.push(['voz','Palavra-chave']);
    const secondary = [['panorama','Panorama'],['livro','Sobre o livro'],['contexto','Dossiê histórico'],['pratica','Reflexão']];
    if (prebuiltStudies[key(this.reading)]) secondary.push(['editorial','Guia editorial']);
    if (this.guide) secondary.push(['filme','Filme']);
    const buttons = items=>items.map(([id,name])=>`<button data-p="${id}" aria-pressed="${this.topic===id}">${name}</button>`).join('');
    this.innerHTML = `<div class="portal-stage">
      <img class="portal-photo" alt="${esc(scene.alt)}" src="./scenes/${esc(scene.file)}">
      <div class="portal-rail"><span>${esc(ref(this.reading))} · v. ${this.part.from}–${this.part.to}</span><button data-p="expand">${expanded?'Voltar à leitura ×':'Atravessar o portal ↗'}</button></div>
      <button class="portal-pin" data-p="inspect" aria-expanded="false"><i aria-hidden="true"></i>${esc(this.detail?.[0] || 'Observar o trecho')}</button>
      <div class="portal-caption"><small>${scene.thematic?'Ambientação temática':'Cena interpretativa'} · IA</small><h3>${esc(this.guide?.title || this.part.title)}</h3>
      <div class="portal-pages"><button aria-label="Cena anterior" data-p="prev" ${this.index?'':'disabled'}>←</button><span>Cena ${this.index+1} de ${this.parts.length}</span><button aria-label="Próxima cena" data-p="next" ${this.index+1===this.parts.length?'disabled':''}>→</button></div></div></div>
      <div class="portal-study"><div class="portal-film" aria-label="Escolher cena">${this.parts.map((p,i)=>`<button data-p="frame" data-i="${i}" aria-label="Cena ${i+1}. ${esc(p.title)}" aria-pressed="${this.index===i}"><img alt="" loading="lazy" src="./scenes/${esc(passageScene(this.reading,p).file)}"><span>${p.from}–${p.to}</span></button>`).join('')}</div><nav aria-label="Investigar a cena">${buttons(primary)}</nav><details class="portal-more" ${secondary.some(([id])=>id===this.topic)?'open':''}><summary>Mais do estudo de ${esc(ref(this.reading))}</summary><nav aria-label="Aprofundar o estudo">${buttons(secondary)}</nav></details><div class="portal-note" tabindex="-1"></div></div>`;
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
      if(this.topic==='estudiosos') el.insertAdjacentHTML('beforeend','<a href="./fontes.html" target="_blank" rel="noopener">Fontes e licenças do estudo ↗</a>');
      if (!plan()) el.querySelectorAll('[data-action="focus-notes"]').forEach(b=>b.remove());
      return;
    }
    const p = this.part, s = this.data.study;
    if (this.topic === 'voz') {
      const [letters, sound, meaning, context] = this.guide.word;
      el.innerHTML = `<small>Hebraico em diálogo com João</small><p class="portal-he" dir="rtl" lang="he">${esc(letters)}</p><h4>${esc(sound)} · ${esc(meaning)}</h4><button data-p="word">▷ Ouvir ${esc(sound)}</button><small>Gravação humana · pronúncia israelense atual</small><p>${esc(context)}</p>`;
      return;
    }
    if (this.topic === 'mapa') {
      this.atlas(el);
      return;
    }
    if (this.topic === 'ecos') {
      const links = this.data.crossRefs.filter(r => r.fromVerse >= p.from && r.fromVerse <= p.to);
      this.links = links.length ? links : this.data.crossRefs.slice(0,3);
      el.innerHTML = `<small>${links.length?'Conexões deste trecho':'Conexões do capítulo'}</small><h4>Leia em paralelo</h4><div class="portal-links">${this.links.map((r,i)=>`<button data-p="compare" data-i="${i}">v. ${r.fromVerse} → ${esc(ref(r))}.${r.verse}</button>`).join('')}</div><div class="portal-pair" aria-live="polite"></div><details class="portal-network"><summary>Rede de conexões do capítulo</summary>${connectionExplorer(this.reading,this.data,this.verseFilter || 0)}<p>${esc(s.theology)}</p></details>`;if(this.links.length) this.compare(0); return;
    }
    if (this.topic === 'tempo') {
      if (this.guide) {
        el.innerHTML = `<small>Mediterrâneo oriental · primeira metade do século I d.C.</small><h4>De quem era a autoridade?</h4><dl class="well-rule"><dt>Império Romano</dt><dd>Tibério era o imperador. O governo romano alcançava essas regiões por meio de autoridades diferentes.</dd><dt>Judeia e Samaria</dt><dd>Pôncio Pilatos exercia o cargo de prefeito da Judeia. Samaria fazia parte dessa administração.</dd><dt>Galileia</dt><dd>Herodes Antipas governava como tetrarca sob o poder de Roma. Ao seguir para a Galileia, o viajante entrava em outra jurisdição.</dd></dl><p>O capítulo não informa o ano do encontro nem identifica pelo nome o oficial que procura Jesus.</p><small>Lucas 3.1 · João 4.46 · <a href="https://resources.metmuseum.org/resources/metpublications/pdf/The_World_between_Empires_Art_and_Identity_in_the_Ancient_Middle_East.pdf" target="_blank" rel="noopener">Atlas histórico do Met</a></small>`;
        return;
      }
      el.innerHTML = `<small>Contexto do capítulo</small><h4>O mundo desta passagem</h4><p>${esc(s.context)}</p>${this.profile?.dossier?`<details><summary>Tempo da narrativa</summary><p>${esc(this.profile.dossier.narratedEra)}</p></details>`:''}${[['politics','Quem exercia o poder?'],['customs','Como as pessoas viviam?'],['language','Como se expressavam?']].map(([field,title])=>{
        const entry = this.profile?.dossier?.[field]?.[0]; if (!entry) return '';
        const refs = (this.profile.dossierSources || []).filter(src=>entry.sourceIds.includes(src.id));
        return `<details><summary>${title}</summary><small>Contexto do livro · ${esc(entry.reference)}</small><p>${esc(entry.detail)}</p>${refs.map(src=>`<a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.title)}</a>`).join(' · ')}</details>`;
      }).join('')}<details><summary>Fontes do estudo</summary>${this.data.sources.map(src=>`<p><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.author)}</a></p>`).join('')}</details>`;return;
    }
    const lines = Array.from({length:p.to-p.from+1},(_,i)=>this.translation?.verses?.[p.from+i-1] || this.text?.[p.from+i]);
    el.innerHTML = `<small>${esc(this.detail?.[2] || ref(this.reading)+' · v. '+p.from+'–'+p.to)}</small>${this.guide ? `<h4>${esc(this.guide.question)}</h4><div class="well-choices">${this.guide.choices.map(([label],i)=>`<button data-p="discover" data-i="${i}">${esc(label)} →</button>`).join('')}</div><div class="well-answer" aria-live="polite"></div><button data-p="guide-audio">▷ Ouvir guia em português</button><label class="scene-autoplay"><input type="checkbox" data-continue ${this.continueAudio?'checked':''}> Continuar nas próximas cenas</label>` : `<h4>Dentro do trecho</h4><p>${esc(p.explanation)}</p>`}${lines.some(Boolean)?`<details><summary>Ler o texto · ${esc(this.translation?.versionName || 'Bíblia Portuguesa Mundial')}</summary>${lines.map((v,i)=>`<p><sup>${p.from+i}</sup> ${esc(v)}</p>`).join('')}</details>`:''}`;
  }
  atlas(el) {
    const places = this.data.places || [];
    if (!places.length) { el.innerHTML='<h4>Lugares do capítulo</h4><p>Este capítulo não tem lugares com coordenadas na base geográfica.</p>'; return; }
    const selected = places.find(p=>p.name===this.atlasPlace) || places.find(p=>p.name===wellStops[this.guide?.place]) || places[0];
    this.atlasPlace = selected.name;
    el.innerHTML = `<h4>${this.guide?'Da Judeia à Galileia':'Lugares de '+esc(ref(this.reading))}</h4><div class="atlas-switch" role="group" aria-label="Época do mapa"><button data-p="era" data-era="antigo">Mapa bíblico</button><button data-p="era" data-era="hoje">Mapa de hoje</button></div><label class="atlas-picker">Localizar<select>${places.map(p=>`<option value="${esc(p.name)}">${esc(atlasLabel(p))}</option>`).join('')}</select></label><div class="portal-map" aria-label="Atlas interativo"></div><div class="atlas-info" aria-live="polite"></div>`;
    const select = el.querySelector('select');
    select.onchange = () => this.selectPlace(select.value,true);
    const node = el.querySelector('.portal-map');
    if (typeof L === 'undefined') { node.textContent='Mapa interativo indisponível.'; this.selectPlace(selected.name); return; }
    const map = this.atlasMap = L.map(node,{scrollWheelZoom:false,maxZoom:17});
    this.markers = new Map();
    places.forEach(place=>{
      const marker = L.circleMarker([place.latitude,place.longitude],{radius:6,color:'#161616',weight:2,fillColor:'#fff',fillOpacity:1}).addTo(map);
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
      this.base=L.tileLayer(historic?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}':'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        historic?{maxNativeZoom:10,maxZoom:17,attribution:'Relevo: Esri e colaboradores'}:{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
      for(const [name,marker] of this.markers){
        const show=historic && (this.guide ? wellStops.includes(name) : this.markers.size<=6);
        marker.unbindTooltip().bindTooltip(esc(modernPlaces[name]?.[0] || name),{permanent:show,direction:name==='Cana'?'left':'top'});
      }
      if(historic && this.guide) this.overlay=L.imageOverlay('./scenes/john4-relief.webp',[[31.56,34.68],[33.06,35.82]],{attribution:'Terrain Tiles'}).addTo(map);
      const stops=(narrativeJourneys[key(this.reading)] || []).map(n=>this.markers.get(n)?.getLatLng()).filter(Boolean);
      if(historic && stops.length>1) this.route=L.polyline(stops,{interactive:false,color:'#444',weight:2,dashArray:'5 6'}).addTo(map);
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
      this.markers.forEach((m,k)=>m.setStyle({radius:k===name?9:6,weight:k===name?3:2,color:k===name?'#fff':'#161616',fillColor:k===name?'#222':'#fff'}));
      if(center)this.atlasMap.setView(marker.getLatLng(),Math.max(this.atlasMap.getZoom(),8));
      marker.bringToFront().openTooltip();
    }
    const modern=modernPlaces[name], today=this.atlasEra==='hoje';
    const well=this.guide && wellLocations[wellStops.indexOf(name)];
    this.querySelector('.atlas-info').innerHTML=`<small>${today?'Geografia atual':'Geografia da narrativa'} · v. ${esc(p.verses?.join(', '))}</small><h4>${esc(today && modern?modern[1]:atlasLabel(p))}</h4><p>${esc(today ? modern?.[2] || 'O ponto aproxima o lugar citado. Use os nomes e as vias do mapa atual para reconhecer a região.' : well?.[3] || 'Localização aproximada a partir do conjunto History Globe.')}</p>${!today?'<small>Relevo atual com lugares bíblicos. Os trajetos ligam paradas narradas e as fronteiras antigas não estão representadas.</small>':''}<a target="_blank" rel="noopener" href="https://www.openstreetmap.org/?mlat=${p.latitude}&amp;mlon=${p.longitude}#map=13/${p.latitude}/${p.longitude}">Ver nos mapas atuais ↗</a>`;
  }
  disposeAtlas() {
    if(!this.atlasMap)return;
    this.atlasView={center:this.atlasMap.getCenter(),zoom:this.atlasMap.getZoom()};
    this.mapResize?.disconnect(); this.atlasMap.remove();
    this.atlasMap=this.markers=this.base=this.overlay=this.route=null;
  }
  async compare(i, chosen) {
    const target = this.querySelector('.portal-pair'), link = chosen || this.links[i];
    const token = this.compareToken = Symbol();
    target.textContent = 'Carregando os versículos…';
    try {
      const [source,dest] = await Promise.all([portalBookText(this.reading.bookId), portalBookText(link.bookId)]);
      if (token !== this.compareToken) return;
      const nearby=(verses,v)=>[v-1,v,v+1].filter(n=>verses?.[n]).map(n=>`<p><sup>${n}</sup> ${esc(verses[n])}</p>`).join('');
      const quote = (name,t)=>`<blockquote><small>${esc(name)}</small><p>${esc(t || 'Texto indisponível nesta edição.')}</p></blockquote>`;
      target.innerHTML = '<small>Bíblia Portuguesa Mundial</small>' + quote(ref(this.reading)+'.'+link.fromVerse,source[this.reading.chapter]?.[link.fromVerse])+quote(ref(link)+'.'+link.verse,dest[link.chapter]?.[link.verse]) + `<details><summary>Ver contexto dos versículos</summary><h4>${esc(ref(this.reading))}</h4>${nearby(source[this.reading.chapter],link.fromVerse)}<h4>${esc(ref(link))}</h4>${nearby(dest[link.chapter],link.verse)}</details><details><summary>Ler ${esc(ref(link))} por inteiro</summary>${Object.entries(dest[link.chapter] || {}).map(([v,text])=>`<p><sup>${esc(v)}</sup> ${esc(text)}</p>`).join('')}</details>`;
    } catch { if(token===this.compareToken) target.textContent='Texto indisponível agora. Toque na referência para tentar de novo.'; }
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
        this.topic='cena'; this.paint(); const details=this.querySelector('.portal-note details'); if(details)details.open=true;return;
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
      dialog.className = 'portal-dialog'; dialog.setAttribute('aria-label','Dentro da passagem');
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
      aside.innerHTML = `<button data-p="hide-note" aria-label="Fechar observação">×</button><small>${esc(this.detail?.[2] || ref(this.reading))}</small><h4>${esc(this.detail?.[0] || this.part.title)}</h4><p>${esc(this.detail?.[1] || this.part.explanation)}</p>`;
      stage.append(aside); aside.querySelector('button').focus({preventScroll:true}); return;
    }
    if (action === 'compare') return this.compare(Number(b.dataset.i));
    if (action === 'guide-audio') {
      const player = document.createElement('audio');
      player.controls = true; player.src = './media/john4/'+this.index+'.mp3';
      player.setAttribute('aria-label','Guia em português'); b.replaceWith(player);
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
    if (action === 'era') { this.switchEra(b.dataset.era);return; }
    if (action === 'word') {
      this.audio = new Audio('./media/hebrew/'+this.guide.word[4]+'.mp3');
      this.audio.play().catch(()=>{ b.textContent='Tentar ouvir novamente'; });return;
    }
    this.topic = action;
    this.querySelectorAll('nav button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.p===this.topic)));
    this.panel();

  }
}
customElements.define('passage-portal', PassagePortal);

async function enterWellPortal(trigger) {
  const dialog = document.createElement('dialog');
  dialog.className = 'portal-dialog portal-arrival';
  dialog.setAttribute('aria-label','João 4 · O poço de Jacó');
  dialog.innerHTML = '<div class="portal-arriving"><p role="status">Entrando em Samaria…</p><button>Voltar à leitura</button></div>';
  dialog.querySelector('button').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    dialog.remove(); document.body.classList.remove('portal-open');
    trigger.focus({preventScroll:true});
  }, {once:true});
  document.body.append(dialog); document.body.classList.add('portal-open');
  dialog.showModal();
  try {
    const [study, profile] = await Promise.all([getJson('/api/library/43/4'),getJson('/api/book-profile/43').catch(()=>null)]);
    if (!dialog.open) return;
    const scene = document.createElement('passage-portal');
    scene.reading = {bookId:43,chapter:4}; scene.data=study; scene.profile=profile;
    scene.setAttribute('expanded',''); dialog.replaceChildren(scene);
    scene.querySelector('[data-p="expand"]').focus({preventScroll:true});
  } catch {
    const notice = dialog.querySelector('[role="status"]');
    if (notice) notice.textContent = 'A cena não carregou. Volte à leitura e tente novamente.';
  }
}
