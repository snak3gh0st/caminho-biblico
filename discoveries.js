(() => {
  const en = document.documentElement.lang === 'en';
  const t = (pt,enText) => en ? enText : pt;
  const copy = pair => pair[en ? 1 : 0];
  const edition = t('Bíblia Portuguesa Mundial','World English Bible');
  const refName = ([bookId,chapter,from,to]) => `${book(bookId)?.name} ${chapter}:${from}${to && to !== from ? '–' + to : ''}`;
  const readLink = (ref,label=refName(ref)) => `<button type="button" class="guide-passage" data-guide-read="${ref.join('.')}">${esc(label)} <span aria-hidden="true">↗</span></button>`;
  const bookLink = id => `<button type="button" class="guide-passage" data-guide-book="${id}">${esc(book(id)?.name)} <span aria-hidden="true">↗</span></button>`;
  const launch = (id,label=copy(passageJourneys[id].title)) => `<button type="button" class="guide-passage" data-journey-open="${id}">${esc(label)} <span aria-hidden="true">↗</span></button>`;
  const tabs = (items,selected,attribute,label) => `<div class="journey-selector" role="group" aria-label="${esc(label)}">${items.map((item,i) => `<button type="button" ${attribute}="${i}" aria-pressed="${selected===i}">${esc(copy(item))}</button>`).join('')}</div>`;
  const image = (file, eager=false) => `<figure class="journey-art"><img src="./scenes/${file}" alt="" width="1280" height="720" ${eager?'':'loading="lazy"'}><figcaption>${t('Ilustração gerada por IA','AI-generated illustration')}</figcaption></figure>`;
  const textBlock = ([b,c,start,end=start],mode,highlight=0) => `<div class="journey-scripture ${mode || ''}" data-journey-text="${[b,c,start,end,highlight].join('.')}" aria-busy="true"><p>${t('Carregando a passagem…','Loading the passage…')}</p></div>`;
  const current = {id:null,step:0,moment:0,comparison:1,note:'',saved:null};
  const progressKey = 'poiema-journey-progress';
  const history = {mode:'time',era:4,group:0};
  let dialog, mapInJourney, mapInHistory, mapObserver, placesRequest;

  function readProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem(progressKey));
      return saved && typeof saved==='object' && !Array.isArray(saved) ? saved : {};
    } catch { return {}; }
  }

  function rememberProgress(complete=false) {
    const saved = readProgress(), earlier = saved[current.id];
    saved[current.id] = {
      step:current.step,moment:current.moment,comparison:current.comparison,
      updated:Date.now(),complete:complete || !!earlier?.complete,
    };
    try { localStorage.setItem(progressKey,JSON.stringify(saved)); } catch {}
  }

  function resume() {
    const saved = readProgress();
    const id = Object.keys(passageJourneys).filter(id=>saved[id] && !saved[id].complete && saved[id].step>0)
      .sort((a,b)=>saved[b].updated-saved[a].updated)[0];
    return id ? `<div><small>${t('Percurso em andamento','Journey in progress')} · ${saved[id].step+1}/${stepNames(passageJourneys[id]).length}</small>
      <h2>${esc(copy(passageJourneys[id].title))}</h2></div>${launch(id,t('Retomar percurso','Resume journey'))}` : '';
  }

  function featured() {
    const cards = ['joao-4','quatro-evangelhos','alianca'];
    const saved = readProgress();
    const action=id=>saved[id]?.complete?t('Rever percurso','Review journey'):saved[id]?.step>0?t('Retomar percurso','Resume journey'):t('Abrir percurso','Open journey');
    return `<section class="guide-section journey-gallery" id="discoveries"><h2>${t('Percursos de estudo','Study journeys')}</h2>
      <div class="workshop-featured">${['fe-e-obras','escutar'].map(id=>{
        const item=passageJourneys[id];
        return `<article><h3>${esc(copy(item.title))}</h3><p>${esc(copy(item.question))}</p>${launch(id,action(id))}</article>`;
      }).join('')}</div>
      <div class="journey-gallery-grid">${cards.map(id => {
        const item = passageJourneys[id];
        return `<article>${item.image?image(item.image):''}<div><h3>${esc(copy(item.title))}</h3><p>${esc(copy(item.question))}</p>${launch(id,action(id))}</div></article>`;
      }).join('')}</div></section>`;
  }

  function questions(query) {
    const text = window.PoiemaNotesCore.normalize(query).replace(/[^a-z0-9]+/g,' ').trim();
    const matches = Object.entries(passageJourneys).filter(([,item]) => item.keywords?.[en ? 1 : 0].some(word => text.includes(word)));
    return matches.length ? `<section><h3>${t('Guias para sua pergunta','Guides for your question')}</h3>${matches.map(([id]) => launch(id)).join('')}</section>` : '';
  }

  function stepNames(item) {
    return item.steps || [...item.sections.map(section => section.title),['Guarde a descoberta','Save the discovery']];
  }

  function closeMap(slot) {
    const active = slot === 'history' ? mapInHistory : mapInJourney;
    if (!active) return;
    active.resize?.disconnect();
    active.map.remove();
    if (slot === 'history') mapInHistory = null;
    else mapInJourney = null;
  }

  async function mountMap(scope,slot) {
    const mapNode = scope.querySelector('[data-journey-map]');
    if (!mapNode) return;
    placesRequest ??= staticFile('graph/places.json').catch(() => { placesRequest = null; return []; });
    const points = new Map((await placesRequest).map(place => [place.i,place]));
    if (!mapNode.isConnected || slot === 'tour' && !dialog.open) return;
    const locations = mapNode.dataset.journeyMap.split(',').map(id => points.get(id)).filter(Boolean);
    if (!window.L || !locations.length) {
      mapNode.textContent = t('Mapa indisponível. As passagens e descrições estão abaixo.','Map unavailable. Readings and descriptions are available below.');
      return;
    }
    const map = L.map(mapNode,{scrollWheelZoom:false,zoomControl:true,maxZoom:10,attributionControl:true});
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',{maxZoom:10,attribution:'Tiles © Esri'}).addTo(map);
    const names = locations.map(place => en ? place.n : place.pt || place.n);
    const markers = locations.map((place,i) => {
      const marker = L.marker([place.la,place.lo],{alt:'',title:names[i],keyboard:false}).addTo(map);
      marker.bindTooltip(esc(names[i]),{direction:'top',offset:[-14,-30]});
      return marker;
    });
    map.fitBounds(L.latLngBounds(markers.map(marker => marker.getLatLng())),{padding:[45,40],maxZoom:8});
    const controls = scope.querySelector('[data-journey-places]');
    controls.innerHTML = locations.map((place,i) => `<button type="button" class="guide-passage" data-journey-place="${i}" aria-pressed="false">${esc(names[i])}</button>`).join('');
    controls.onclick = event => {
      const active = event.target.closest('[data-journey-place]');
      if (!active) return;
      controls.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed',String(button===active)));
      const marker = markers[Number(active.dataset.journeyPlace)];
      map.panTo(marker.getLatLng(),{animate:false});
      marker.openTooltip();
    };
    const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => map.invalidateSize({pan:false})) : null;
    resize?.observe(mapNode);
    const active = {map,resize};
    if (slot === 'history') mapInHistory = active;
    else mapInJourney = active;
  }

  const mapHTML = ids => `<div class="journey-map-box"><div class="journey-map" role="region" aria-label="${t('Mapa de lugares bíblicos','Map of biblical places')}" data-journey-map="${ids.join(',')}"></div>
    <div class="journey-map-meta"><div class="guide-links" data-journey-places role="group" aria-label="${t('Lugares no mapa','Places on the map')}"></div><small>${t('Localizações aproximadas','Approximate locations')} · <a href="${en?'./en/sources.html':'./fontes.html'}" target="_blank" rel="noopener">Theographic ${t('e','and')} OpenBible ↗</a></small></div></div>`;

  function loadVerses(scope) {
    for (const target of scope.querySelectorAll('[data-journey-text]')) {
      const [id,chapter,from,to,highlight] = target.dataset.journeyText.split('.').map(Number);
      portalBookText(id).then(chapters => {
        if (!target.isConnected) return;
        target.removeAttribute('aria-busy');
        const verses = chapters[chapter];
        if (!verses) {
          target.innerHTML = `<p>${t('A passagem está indisponível agora.','The passage is currently unavailable.')}</p>`;
          return;
        }
        const lines = Object.entries(verses).filter(([n]) => n >= from && n <= to)
          .map(([n,line]) => `<p ${Number(n)===highlight?'class="journey-evidence"':''}><sup>${n}</sup> ${esc(line)}</p>`).join('');
        target.innerHTML = `${lines}<small class="journey-edition">${edition}</small>`;
      });
    }
  }

  function dialogue() {
    const moment = dialogueMoments[current.moment];
    return `<div class="journey-spread">
      <div class="journey-dialogue"><h3>${t('Três momentos da conversa','Three moments in the conversation')}</h3>
        ${tabs(dialogueMoments.map(item => item.title),current.moment,'data-journey-moment',t('Momentos do diálogo','Moments in the dialogue'))}
        <p>${esc(copy(moment.text))}</p>${textBlock(moment.ref,'journey-dialogue-text')}
        <div class="guide-links">${readLink([43,4,7,26],t('Ler todo o diálogo','Read the full dialogue'))}</div></div>
      <div>${image(passageJourneys['joao-4'].image,true)}<details class="journey-film"><summary>${t('Ver o estudo narrado','Watch the narrated study')}</summary>
        <video controls playsinline preload="none" poster="./scenes/well.jpg" aria-label="${t('Estudo narrado de João 4','Narrated study of John 4')}">
          <source src="./media/43-4.mp4" type="video/mp4"><track src="${en?'./en/43-4.vtt':'./media/43-4.vtt'}" kind="captions" srclang="${en?'en':'pt-BR'}" label="${t('Português','English')}" default></video>
        <a href="${en?'./en/43-4-transcript.txt':'./media/43-4-transcript.txt'}" target="_blank" rel="noopener">${t('Ler a transcrição','Read the transcript')} ↗</a>${en?'<small>Portuguese audio with English captions.</small>':''}</details></div>
      </div>`;
  }

  function worshipMap() {
    return `<div class="journey-spread"><article><h3>${t('Gerizim e Jerusalém','Gerizim and Jerusalem')}</h3>
      <p>${t('Em João 4:20, a mulher contrapõe “este monte” a Jerusalém. A identificação do monte com Gerizim liga a pergunta ao lugar de adoração dos samaritanos. Jesus desloca a conversa para como os verdadeiros adoradores adoram.', 'In John 4:20, the woman sets “this mountain” alongside Jerusalem. Identifying the mountain as Gerizim connects the question with the Samaritan place of worship. Jesus redirects the conversation toward how true worshipers worship.')}</p>
      ${textBlock([43,4,20,24],'',20)}${readLink([43,4,20,24])}</article>
      ${mapHTML(['mount_gerizim_836','jerusalem_636'])}</div>`;
  }

  function waterComparison() {
    const parts = [
      [[43,4,13,14],t('À beira do poço','At the well')],
      [[43,7,37,39],t('No último dia da festa','On the last day of the festival')],
    ];
    return `<section><h3>${t('A imagem da água reaparece','The image of water appears again')}</h3>
      <p>${t('Em João 4, Jesus fala de uma fonte que jorra para a vida eterna. Em João 7, ele convida quem tem sede a vir e beber. Nessa segunda cena, o próprio evangelista liga a imagem ao Espírito.', 'In John 4, Jesus speaks of a spring welling up to eternal life. In John 7, he invites those who thirst to come and drink. In the second scene, the Gospel writer explicitly connects the image with the Spirit.')}</p>
      <div class="journey-comparison">${parts.map(([ref,title]) => `<article><h4>${title}</h4>${textBlock(ref,'')}${readLink(ref)}</article>`).join('')}</div></section>`;
  }

  function compareGospels(item) {
    const active = gospelObservations[current.comparison];
    return `<section><h3>${t('A multiplicação dos pães','Feeding the multitude')}</h3>
      ${tabs(gospelObservations.map(row => row.title),current.comparison,'data-journey-compare',t('O que você quer comparar?','What do you want to compare?'))}
      <div class="journey-comparison journey-four">${item.refs.map((passage,i) => {
        const [id,chapter] = passage, v = active.evidence[i], evidence = [id,chapter,v,v];
        return `<article><h4>${esc(book(id)?.name)}</h4><p>${esc(copy(active.notes[i]))}</p>${textBlock(evidence,'',v)}
          <details class="journey-account"><summary>${esc(refName(passage))} · ${t('Relato completo','Full account')}</summary>${textBlock(passage,'',v)}</details>
          ${readLink(evidence,t('Ver versículo no leitor','View verse in reader'))}</article>`;
      }).join('')}</div></section>`;
  }

  function editorialStep(item,step) {
    const section = item.sections[step], passage = item.refs[step];
    return `<div class="journey-spread"><article><h3>${esc(copy(section.title))}</h3><p>${esc(copy(section.text))}</p>
      ${textBlock(passage,'')}${readLink(passage)}
      ${current.id==='por-que-quatro' && step===1 ? launch('quatro-evangelhos',t('Comparar os quatro relatos','Compare the four accounts')):''}</article>
      ${item.image ? image(item.image,true) : `<aside class="journey-source"><h4>${t('Para continuar','Keep reading')}</h4><div class="guide-links">${item.refs.filter((_,i) => i!==step).map(passage => readLink(passage)).join('')}</div></aside>`}</div>`;
  }

  function faithStep() {
    if (current.step===1) return `<section><h3>${t('Veja como duas tradições leem os textos','See how two traditions read the texts')}</h3>
      <p>${t('As leituras abaixo são sínteses de dois documentos confessionais. Abra os versículos e confira como cada fonte descreve fé, graça e obras.', 'The readings below summarize two confessional documents. Open the verses and see how each source describes faith, grace, and works.')}</p>
      <div class="journey-comparison">${faithPerspectives.map(item=>`<article><h4>${esc(copy(item.title))}</h4><p>${esc(copy(item.text))}</p>
        <div class="guide-links">${item.refs.map(range=>readLink(range)).join('')}</div><p><a href="${esc(item.source)}" target="_blank" rel="noopener">${esc(copy(item.sourceName))} ↗</a></p></article>`).join('')}</div></section>`;
    return `<section><h3>${t('Leia as passagens antes de abrir as observações','Read the passages before opening the observations')}</h3>
      <div class="journey-comparison">${faithReadings.map(item=>`<article><h4>${esc(copy(item.title))}</h4>${textBlock(item.ref,'',item.evidence[0])}
      ${readLink(item.ref)}<details class="journey-account"><summary>${t('Conferir uma observação','Check an observation')}</summary><p>${esc(copy(item.text))}</p>
      <div class="guide-links">${item.evidence.map(verse=>readLink([item.ref[0],item.ref[1],verse,verse])).join('')}</div></details></article>`).join('')}</div></section>`;
  }

  function listeningPractice() {
    const entry=window.PoiemaNotes?.studyEntries().find(item=>item.practice.track==='escutar');
    if (!entry) return `<p>${t('Antes da próxima conversa, escolha um gesto de escuta e combine uma data para rever.', 'Before your next conversation, choose one way to listen and pick a date to review it.')}</p>
      <button type="button" class="guide-passage" data-practice-open="59.1.19.27" data-practice-track="escutar">${t('Escolher meu passo','Choose my step')} ↗</button>`;
    const done=entry.practice.done;
    return `<p><strong>${t('Meu passo','My step')}</strong> · ${esc(entry.practice.action)}</p>
      ${done?`<p>${t('Prática registrada no Caderno.','Practice recorded in your Notebook.')}</p>`:
        `<button type="button" class="guide-passage" data-practice-review="${esc(entry.id)}">${t('Rever como foi','Review how it went')} ↗</button>`}`;
  }

  function listeningStep(item) {
    const range=item.refs[current.step];
    if (current.step===0) return `<section><h3>${t('Encontro 1 · Antes de falar','Meeting 1 · Before speaking')}</h3>
      <p>${t('Em Tiago 1:19–22, localize a orientação para ouvir e o que Tiago pede que os ouvintes façam depois.', 'In James 1:19–22, find the instruction about listening and what James asks listeners to do next.')}</p>
      ${textBlock(range,'',19)}${readLink(range)}</section>`;
    return `<section><h3>${t('Encontro 2 · Ouça os dois lados','Meeting 2 · Hear both sides')}</h3>
      <div class="journey-spread"><div><p>${t('Provérbios 18:13 descreve o que acontece quando alguém responde antes de ouvir. O versículo 17 chama atenção para o que muda quando outra versão é ouvida.', 'Proverbs 18:13 describes answering before hearing. Verse 17 draws attention to what can change when another account is heard.')}</p>
      ${textBlock(range,'',13)}${readLink(range)}</div>
      <aside class="journey-source"><h4>${t('Na próxima conversa','In your next conversation')}</h4><ol>
        <li>${t('Faça uma pergunta aberta.','Ask an open question.')}</li>
        <li>${t('Deixe a pessoa terminar.','Let the person finish.')}</li>
        <li>${t('Confirme o que entendeu antes de responder.','Check what you understood before answering.')}</li></ol>
        <div data-listening-practice>${listeningPractice()}</div></aside></div></section>`;
  }

  function refreshListening() {
    const box=dialog?.querySelector('[data-listening-practice]');
    if (dialog?.open && box) box.innerHTML=listeningPractice();
  }

  function reflection(item) {
    const prompt=current.id==='escutar'
      ? t('O que você ouviu desta vez que teria passado despercebido?','What did you hear this time that you might have missed?')
      : current.id==='fe-e-obras'
        ? t('Como os dois textos relacionam fé e obras? Cite o versículo que mais ajudou.','How do the passages relate faith and works? Cite the verse that helped most.')
        : t('O que você descobriu?','What did you discover?');
    return `<div class="journey-spread"><form class="journey-reflection"><label for="journey-note">${prompt}</label>
      <textarea id="journey-note" required maxlength="4000" rows="5" placeholder="${t('Anote o que chamou sua atenção no texto.','Write down what caught your attention in the text.')}">${esc(current.note)}</textarea>
      <div class="guide-links"><button class="guide-passage" type="submit">${t('Guardar no caderno','Save to notebook')}</button>
        <button class="guide-passage" type="button" data-journey-notebook ${current.saved?'':'hidden'}>${t('Abrir no caderno','Open in notebook')}</button></div>
      <p role="status" data-journey-save-status>${current.saved?t('Descoberta guardada no caderno.','Discovery saved to your notebook.'):''}</p></form>
      <aside class="journey-source"><h4>${t('Passagens ligadas à descoberta','Passages linked to the discovery')}</h4>
        <div class="guide-links">${item.refs.map(passage => readLink(passage)).join('')}</div>
        ${current.id==='escutar'?`<div data-listening-practice>${listeningPractice()}</div>`:''}</aside></div>`;
  }

  function drawTour(focus=false) {
    closeMap('tour');
    const item = passageJourneys[current.id], steps = stepNames(item), last = steps.length-1;
    const isEnd = current.step === last;
    const body = isEnd ? reflection(item) : current.id==='joao-4'
      ? [dialogue,worshipMap,waterComparison][current.step]()
      : current.id==='quatro-evangelhos' ? compareGospels(item)
      : current.id==='fe-e-obras' ? faithStep()
      : current.id==='escutar' ? listeningStep(item) : editorialStep(item,current.step);
    dialog.innerHTML = `<header class="guide-dialog-head journey-head"><div><small>${t('Entre na passagem','Step into the passage')}</small><h2 id="journey-title" tabindex="-1">${esc(copy(item.title))}</h2></div>
      ${item.image ? `<img class="journey-head-thumb" src="./scenes/${item.image}" alt="" width="75" height="52">` : ''}
      <form method="dialog"><button aria-label="${t('Fechar percurso','Close journey')}">×</button></form></header>
      <div class="journey-body"><div class="journey-progress-line">
        <span>${t('Etapa','Step')} ${current.step+1} ${t('de','of')} ${steps.length}</span>
        <progress value="${current.step+1}" max="${steps.length}" aria-label="${t('Etapa do percurso','Journey step')}"></progress></div>
        <p class="journey-question">${esc(copy(item.question))}</p>
        ${tabs(steps,current.step,'data-journey-step',t('Etapas do percurso','Journey steps'))}
        <section class="journey-step-content" tabindex="-1" aria-label="${esc(copy(steps[current.step]))}">${body}</section></div>
      <footer class="journey-footer"><div class="guide-links">
        ${window.PoiemaWorkshop?.groupLink('journey:'+current.id) || ''}
        <button class="guide-passage" type="button" data-journey-copy>${t('Copiar link do percurso','Copy journey link')}</button>
        ${current.step>0 ? `<button class="guide-passage" type="button" data-journey-step="${current.step-1}">← ${t('Voltar etapa','Previous step')}</button>`:''}
        ${!isEnd ? `<button class="guide-passage journey-next" type="button" data-journey-step="${current.step+1}">${t('Próxima etapa','Next step')} →</button>`:`<button class="guide-passage journey-next" type="button" data-journey-finish>${t('Concluir percurso','Finish journey')} ✓</button>`}
      </div><div class="journey-share-status" role="status"></div></footer>`;
    if (focus) dialog.querySelector('.journey-step-content').focus({preventScroll:true});
    loadVerses(dialog);
    mountMap(dialog,'tour');
  }

  function open(id,step=null,focus=null) {
    if (!Object.hasOwn(passageJourneys,id)) return false;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'guide-dialog journey-dialog';
      dialog.setAttribute('aria-labelledby','journey-title');
      document.body.append(dialog);
      dialog.addEventListener('close',() => {
        if (!dialog.open) closeMap('tour');
        if (dialog.returnValue==='navigation') return;
        const recent = document.querySelector('#guide-resume-journey');
        if (recent) recent.innerHTML = resume();
        const url = new URL(location.href);
        if (dialog.open || !url.searchParams.has('journey')) return;
        url.searchParams.delete('journey');
        url.searchParams.delete('step');
        url.searchParams.delete('focus');
        window.history.replaceState(window.history.state,'',url);
      });
      dialog.addEventListener('input',event => {
        if (event.target.id === 'journey-note') current.note = event.target.value;
      });
      dialog.addEventListener('submit',saveReflection);
    }
    const item = passageJourneys[id];
    if (current.id !== id) Object.assign(current,{id,moment:0,comparison:1,note:'',saved:null});
    const previous = readProgress()[id];
    if (step===null && previous && !previous.complete) {
      step = previous.step;
      if (Number.isInteger(previous.moment) && dialogueMoments[previous.moment]) current.moment=previous.moment;
      if (Number.isInteger(previous.comparison) && gospelObservations[previous.comparison]) current.comparison=previous.comparison;
    }
    current.step = Number.isInteger(step) && step >= 0 && step < stepNames(item).length ? step : 0;
    if (current.step===0 && Number.isInteger(focus) && focus>=0) {
      if (id==='joao-4' && focus<dialogueMoments.length) current.moment = focus;
      if (id==='quatro-evangelhos' && focus<gospelObservations.length) current.comparison = focus;
    }
    const existing = dialog.open;
    if (!existing) {
      dialog.innerHTML = `<h2 id="journey-title">${esc(copy(item.title))}</h2>`;
      dialog.returnValue = '';
      dialog.showModal();
    }
    rememberProgress();
    drawTour();
    dialog.querySelector('#journey-title').focus({preventScroll:true});
    return true;
  }

  function openFromURL() {
    const params = new URLSearchParams(location.search);
    if (params.has('journey')) open(params.get('journey'), Number(params.get('step') || 1)-1, params.has('focus') ? Number(params.get('focus'))-1 : null);
  }

  async function copyJourney() {
    const url = new URL(location.pathname,location.origin);
    url.searchParams.set('lang',en ? 'en' : 'pt');
    url.searchParams.set('journey',current.id);
    url.searchParams.set('step',String(current.step+1));
    if (current.step===0 && current.id==='joao-4') url.searchParams.set('focus',String(current.moment+1));
    if (current.step===0 && current.id==='quatro-evangelhos') url.searchParams.set('focus',String(current.comparison+1));
    const status = dialog.querySelector('.journey-share-status');
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent = t('Link copiado.','Link copied.');
    } catch {
      status.innerHTML = `<label>${t('Copie o endereço do percurso','Copy the journey address')} <input type="url" readonly value="${esc(url.href)}"></label>`;
      status.querySelector('input').select();
    }
  }

  function saveReflection(event) {
    if (!event.target.matches('.journey-reflection')) return;
    event.preventDefault();
    const item = passageJourneys[current.id], status = dialog.querySelector('[data-journey-save-status]');
    const note = current.note.trim();
    if (!note) {
      status.textContent = t('Escreva o que você descobriu.','Write what you discovered.');
      return;
    }
    if (current.saved?.note === note) return;
    const refs = item.refs.map(refName);
    try {
      const text = `${copy(item.question)}\n\n${note}\n\n${t('Passagens','Passages')}: ${refs.join('; ')}`;
      const id = window.PoiemaNotes.saveDiscovery({title:copy(item.title),text,cites:item.refs.map(([b,c]) => `${b}:${c}`),id:current.saved?.id,recallReference:item.refs[0]});
      current.saved = {id,note};
      status.textContent = t('Descoberta guardada no caderno.','Discovery saved to your notebook.');
      dialog.querySelector('[data-journey-notebook]').hidden = false;
    } catch {
      status.textContent = t('Não foi possível guardar a descoberta neste navegador.','Could not save the discovery in this browser.');
    }
  }

  function historyPanel() {
    if (history.mode==='canon') {
      const [label,from,to] = guideBookGroups[history.group];
      return `${tabs(guideBookGroups.map(([label]) => label),history.group,'data-history-group',t('Grupos de livros','Book groups'))}
        <div class="journey-history-books"><h3>${esc(copy(label))}</h3><p>${from<=39 ? t('Antigo Testamento','Old Testament') : t('Novo Testamento','New Testament')}</p>
        <div class="guide-links">${Array.from({length:to-from+1},(_,i) => bookLink(i+from)).join('')}</div></div>`;
    }
    const era = guideEras[history.era], places = journeyPlaces[era.id];
    return `${tabs(guideEras.map(item => item.title),history.era,'data-history-phase',t('Épocas da história bíblica','Periods of the biblical story'))}
      <div class="journey-spread journey-history-view"><article><h3>${esc(copy(era.title))}</h3><p>${esc(copy(era.text))}</p>
        ${era.id==='exile' ? `<ul class="journey-exile-voices">${exileReadings.map(item => `<li><div><strong>${esc(copy(item.title))}</strong><p>${esc(copy(item.text))}</p></div>${readLink(item.ref)}</li>`).join('')}</ul>` : `<div class="guide-links">${era.read.map(ref => readLink(ref)).join('')}</div>`}
        <details><summary>${t('Livros desta etapa','Books for this period')}</summary><div class="guide-links">${era.books.map(bookLink).join('')}</div></details></article>
        ${places.length ? mapHTML(places) : era.image ? image(era.image) : ''}</div>`;
  }

  function historyView() {
    return `<div class="journey-history" data-journey-history><div class="journey-history-switch">
      <div class="journey-selector" role="group" aria-label="${t('Organizar a Bíblia por','Organize the Bible by')}">
        <button type="button" data-history-mode="time" aria-pressed="${history.mode==='time'}">${t('Época da narrativa','Time of the narrative')}</button>
        <button type="button" data-history-mode="canon" aria-pressed="${history.mode==='canon'}">${t('Ordem dos livros','Order of the books')}</button>
      </div></div><div data-journey-history-panel>${historyPanel()}</div></div>`;
  }

  function detachHistory() {
    mapObserver?.disconnect();
    mapObserver = null;
    closeMap('history');
  }

  function attachHistory() {
    const panel = document.querySelector('[data-journey-history-panel]');
    if (!panel?.querySelector('[data-journey-map]')) return;
    if (typeof IntersectionObserver !== 'function') { mountMap(panel,'history'); return; }
    mapObserver = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        mapObserver?.disconnect();
        mapObserver = null;
        mountMap(panel,'history');
      }
    },{rootMargin:'250px'});
    mapObserver.observe(panel);
  }

  document.addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    const data = button.dataset;
    if (data.journeyOpen) {
      const search = button.closest('.guide-search');
      if (search?.open) search.close();
      return open(data.journeyOpen);
    }
    if (dialog?.contains(button)) {
      if (data.journeyStep !== undefined) { current.step = Number(data.journeyStep); rememberProgress(); return drawTour(true); }
      if (Object.hasOwn(data,'journeyFinish')) {
        rememberProgress(true);
        delete button.dataset.journeyFinish;
        button.dataset.journeyDone = '';
        button.textContent = t('Fechar','Close');
        dialog.querySelector('.journey-share-status').textContent = t('Percurso concluído.','Journey complete.');
        return;
      }
      if (Object.hasOwn(data,'journeyDone')) return dialog.close();
      if (data.journeyMoment !== undefined || data.journeyCompare !== undefined) {
        const key = data.journeyMoment !== undefined ? 'journeyMoment' : 'journeyCompare';
        const attribute = key === 'journeyMoment' ? 'data-journey-moment' : 'data-journey-compare';
        current[key==='journeyMoment'?'moment':'comparison'] = Number(data[key]);
        rememberProgress();
        const scroll = dialog.querySelector('.journey-body').scrollTop;
        drawTour();
        dialog.querySelector('.journey-body').scrollTop = scroll;
        dialog.querySelector(`[${attribute}="${data[key]}"]`)?.focus({preventScroll:true});
        return;
      }
      if (Object.hasOwn(data,'journeyCopy')) return copyJourney();
      if (Object.hasOwn(data,'journeyNotebook') && current.saved) return window.PoiemaNotes?.open(current.saved.id);
    }
    const container = button.closest('[data-journey-history]');
    if (!container) return;
    const panel = container.querySelector('[data-journey-history-panel]');
    let selector;
    if (data.historyMode) {
      history.mode = data.historyMode;
      container.querySelectorAll('[data-history-mode]').forEach(item => item.setAttribute('aria-pressed',String(item===button)));
    } else if (data.historyPhase !== undefined) {
      history.era = Number(data.historyPhase);
      selector = `[data-history-phase="${history.era}"]`;
    } else if (data.historyGroup !== undefined) {
      history.group = Number(data.historyGroup);
      selector = `[data-history-group="${history.group}"]`;
    } else return;
    detachHistory();
    panel.innerHTML = historyPanel();
    attachHistory();
    if (selector) panel.querySelector(selector)?.focus({preventScroll:true});
  });

  window.PoiemaDiscoveries = {featured,questions,launch,resume,openFromURL,historyView,attachHistory,detachHistory,refreshListening};
})();
