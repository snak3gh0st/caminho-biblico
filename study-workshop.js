(() => {
  const en = document.documentElement.lang === 'en';
  const t = (pt,english) => en ? english : pt;
  const copy = pair => pair?.[en?1:0] || '';
  const intervals = [1,3,7];
  const calendar = () => window.PoiemaPractice.calendar;
  let dialog, mode, active;

  function normalizeRecall(value) {
    if (!window.PoiemaPractice.validReference(value?.reference) ||
        !Number.isInteger(value.stage) || value.stage<0 || value.stage>intervals.length ||
        !calendar().validDate(value.due)) return null;
    return {reference:value.reference.slice(),stage:value.stage,due:value.due};
  }

  function schedule(reference) {
    return normalizeRecall({reference,stage:0,due:calendar().dateStamp(intervals[0])});
  }

  const label = ([id,chapter,from,to]) => `${ref({bookId:id,chapter})}:${from}${to===from?'':'–'+to}`;
  const readLink = range => `<button type="button" class="guide-passage" data-guide-read="${range.join('.')}">${esc(label(range))} ↗</button>`;
  const groupLink = id => `<button type="button" class="guide-passage" data-group-open="${esc(id)}">${t('Roteiro em grupo','Group guide')} ↗</button>`;
  const recallButton = (entry,text) => `<button type="button" class="guide-passage" data-recall-open="${esc(entry.id)}">${text} →</button>`;

  function upcoming(entries) {
    return entries.filter(entry=>entry.recall.stage<intervals.length).sort((a,b)=>a.recall.due.localeCompare(b.recall.due));
  }

  function homeCard() {
    const entry=upcoming(window.PoiemaNotes?.recallEntries() || []).find(item=>item.recall.due<=calendar().dateStamp());
    if (!entry) return '';
    return `<div><small>${esc(label(entry.recall.reference))}</small><h2>${t('Relembre um estudo','Recall a study')}</h2><p>${esc(entry.title)}</p></div>${recallButton(entry,t('Rever no texto','Review in the text'))}`;
  }

  function notebookQueue(entries) {
    const list=upcoming(entries);
    if (!list.length) return '';
    return `<details class="practice-queue workshop-queue" ${list[0].recall.due<=calendar().dateStamp()?'open':''}>
      <summary>${t('Revisões de memória','Memory reviews')} · ${list.length}</summary>
      <ul>${list.map(entry=>`<li><div><strong>${esc(label(entry.recall.reference))}</strong><span>${esc(entry.title)}</span>
        <small>${t('Rever em','Review on')} ${esc(calendar().prettyDate(entry.recall.due))}</small></div>${recallButton(entry,t('Rever','Review'))}</li>`).join('')}</ul></details>`;
  }

  function refreshHome() {
    const card=document.querySelector('#guide-recall-resume');
    if (card) card.innerHTML=homeCard();
  }

  function shell(title,subtitle,body,footer='') {
    dialog.innerHTML=`<header class="guide-dialog-head workshop-head">
      <div><small>${esc(subtitle)}</small><h2 id="workshop-title" tabindex="-1">${esc(title)}</h2></div>
      <form method="dialog"><button aria-label="${t('Fechar','Close')}">×</button></form></header>
      <div class="workshop-body">${body}</div>${footer?`<footer class="journey-footer">${footer}</footer>`:''}`;
    dialog.querySelector('#workshop-title').focus({preventScroll:true});
  }

  function show() {
    if (!dialog) {
      dialog=document.createElement('dialog');
      dialog.className='guide-dialog workshop-dialog';
      dialog.setAttribute('aria-labelledby','workshop-title');
      document.body.append(dialog);
      dialog.addEventListener('close',()=>{
        if (dialog.open || dialog.returnValue==='navigation') return;
        refreshHome();
        if (mode!=='group') return;
        const url=new URL(location.href);
        if (url.searchParams.has('group')) {
          url.searchParams.delete('group');
          window.history.replaceState(window.history.state,'',url);
        }
      });
    }
    if (!dialog.open) {
      dialog.returnValue='';
      dialog.innerHTML='<h2 id="workshop-title"></h2>';
      dialog.showModal();
    }
    dialog.classList.toggle('group-dialog',mode==='group');
  }

  function groupData(id) {
    const [type,key]=String(id||'').split(':');
    if (type==='journey' && Object.hasOwn(passageJourneys,key)) {
      const item=passageJourneys[key];
      return {title:copy(item.title),question:copy(item.question),refs:item.refs,
        application:key==='escutar'?t('Escolham uma conversa da semana. Façam uma pergunta, ouçam até o fim e confirmem o que entenderam antes de responder.','Choose a conversation this week. Ask a question, listen to the end, and confirm what you heard before answering.'):'',
      };
    }
    if (type==='study') {
      const guide=practiceGuides.find(item=>item.id===key);
      if (guide) return {title:copy(guide.title),question:copy(guide.observation),context:copy(guide.question),application:copy(guide.actions[0]),refs:[guide.range,guide.related]};
    }
    if (type==='ref' && /^\d+\.\d+\.\d+\.\d+$/.test(key||'')) {
      const range=key.split('.').map(Number);
      if (window.PoiemaPractice.validReference(range)) return {title:label(range),refs:[range]};
    }
    return null;
  }

  function openGroup(id) {
    const item=groupData(id);
    if (!item) return;
    mode='group';active={id,item};show();
    const parts=[
      [5,t('Leitura em voz alta','Read aloud'),t('Leiam as passagens e façam uma pausa para cada pessoa localizar um detalhe no texto.','Read the passages and pause so each person can locate one detail in the text.')],
      [8,t('Observação','Observation'),item.question || t('O que se repete, muda ou chama a atenção? Peçam que cada contribuição indique o versículo.','What repeats, changes, or stands out? Ask each person to point to a verse.')],
      [7,t('Contexto e sentido','Context and meaning'),item.context || t('Que detalhe do contexto ajuda a esclarecer a passagem? Separem o que o texto diz da interpretação que vocês propõem.','What detail in the context helps clarify the passage? Separate what the text says from the interpretation you propose.')],
      [5,t('Próximo encontro','Next meeting'),item.application || t('Cada pessoa escolhe uma ação pequena para a semana. No próximo encontro, voltem ao texto e conversem sobre o que aconteceu.','Each person chooses one small action for the week. Next time, return to the text and talk about what happened.')],
    ];
    shell(item.title,t('Roteiro para pequenos grupos · 25 min','Small-group guide · 25 min'),
      `<div class="workshop-refs guide-links">${item.refs.map(range=>`<span>${esc(label(range))}</span>${readLink(range)}`).join('')}</div>
      <ol class="group-agenda">${parts.map(([minutes,title,text])=>`<li><span>${minutes} min</span><div><h3>${title}</h3><p>${esc(text)}</p></div></li>`).join('')}</ol>`,
      `<div class="guide-links"><button type="button" class="guide-passage" data-group-copy>${t('Copiar link do roteiro','Copy group guide link')}</button><button type="button" class="guide-passage" data-group-print>${t('Imprimir roteiro','Print guide')}</button></div><p role="status" data-workshop-status></p>`);
  }

  function openFromURL() {
    const id=new URLSearchParams(location.search).get('group');
    if (id) openGroup(id);
  }

  async function copyGroup() {
    const url=pageURL('explore','study');
    url.searchParams.set('group',active.id);
    const status=dialog.querySelector('[data-workshop-status]');
    try {
      await navigator.clipboard.writeText(url.href);
      status.textContent=t('Link copiado.','Link copied.');
    } catch {
      status.innerHTML=`<label>${t('Copie o link do roteiro','Copy the group guide link')} <input readonly type="url" value="${esc(url.href)}"></label>`;
      status.querySelector('input').select();
    }
  }

  function openRecall(id) {
    const entry=window.PoiemaNotes?.recallEntries().find(item=>item.id===id);
    if (!entry || entry.recall.stage>=intervals.length) return;
    mode='recall';active={entry,response:''};show();
    shell(entry.title,t('Revisão de memória','Memory review'),`<section class="recall-prompt">
      <p>${esc(label(entry.recall.reference))} · ${t('Revisão','Review')} ${entry.recall.stage+1}/${intervals.length}</p>
      <h3>${t('Que detalhe do texto sustentava sua conclusão?','What detail in the passage supported your conclusion?')}</h3>
      <label>${t('Tente lembrar antes de abrir o texto','Try to remember before opening the passage')}
        <textarea rows="4" maxlength="1600" data-recall-answer></textarea></label></section>`,
      `<button type="button" class="guide-passage" data-recall-reveal>${t('Conferir no texto','Check the passage')} →</button>`);
  }

  function revealRecall() {
    const {entry,response}=active, range=entry.recall.reference;
    shell(entry.title,t('Compare sua resposta','Check your answer'),`
      <section class="recall-check">
        ${response?`<h3>${t('O que você lembrou','What you remembered')}</h3><p>${esc(response)}</p>`:''}
        <h3>${esc(label(range))}</h3><div class="recall-verses" data-recall-verses aria-busy="true">${t('Carregando o texto…','Loading the passage…')}</div>
        <small>${t('Bíblia Portuguesa Mundial','World English Bible')}</small>
        <div class="guide-links">${readLink(range)}<button class="guide-passage" type="button" data-recall-edit>${t('Editar no Caderno','Edit in Notebook')}</button></div>
        <details><summary>${t('Ler minha anotação original','Read my original note')}</summary><p>${esc(entry.text)}</p></details>
        <p role="status" data-workshop-status></p></section>`,
      `<div class="guide-links"><button class="guide-passage" type="button" data-recall-result="later">${t('Rever amanhã','Review tomorrow')}</button><button class="guide-passage journey-next" type="button" data-recall-result="remembered">${t('Lembrei','I remembered')}</button></div>`);
    const node=dialog.querySelector('[data-recall-verses]');
    const [id,chapter,from,to]=range;
    portalBookText(id).then(books=>{
      if (!node.isConnected) return;
      const lines=books[chapter];
      node.innerHTML=lines?Object.entries(lines).filter(([verse])=>verse>=from && verse<=to)
        .map(([verse,line])=>`<p><sup>${esc(verse)}</sup> ${esc(line)}</p>`).join(''):`<p>${t('Texto indisponível neste momento.','Text unavailable right now.')}</p>`;
      node.removeAttribute('aria-busy');
    });
  }

  function saveRecall(result) {
    const {entry}=active;
    const stage=entry.recall.stage+(result==='remembered'?1:0);
    const due=calendar().dateStamp(result==='later'?1:intervals[stage] || 0);
    try {
      window.PoiemaNotes.saveRecall(entry.id,{reference:entry.recall.reference,stage,due},entry.recall);
      refreshHome();
      const message=stage===intervals.length?t('Você concluiu as três revisões deste estudo.','You completed all three reviews for this study.'):
        `${t('Próxima revisão em','Next review on')} ${calendar().prettyDate(due)}.`;
      shell(t('Revisão registrada','Review recorded'),label(entry.recall.reference),`<p>${esc(message)}</p>`,
        `<button class="guide-passage" type="button" data-workshop-close>${t('Fechar revisão','Close review')}</button>`);
    } catch {
      dialog.querySelector('[data-workshop-status]').textContent=t('Não foi possível guardar o progresso desta revisão.','Could not save progress for this review.');
    }
  }

  document.addEventListener('input',event=>{
    if (mode==='recall' && event.target.matches('[data-recall-answer]')) active.response=event.target.value.trim();
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button) return;
    const data=button.dataset;
    if (data.groupOpen) return openGroup(data.groupOpen);
    if (data.recallOpen) return openRecall(data.recallOpen);
    if (!dialog?.contains(button)) return;
    if (Object.hasOwn(data,'groupCopy')) return copyGroup();
    if (Object.hasOwn(data,'groupPrint')) return window.print();
    if (Object.hasOwn(data,'recallReveal')) return revealRecall();
    if (Object.hasOwn(data,'recallEdit')) {
      dialog.close();
      return window.PoiemaNotes.open(active.entry.id);
    }
    if (data.recallResult) return saveRecall(data.recallResult);
    if (Object.hasOwn(data,'workshopClose')) dialog.close();
  });

  window.PoiemaWorkshop={groupLink,openFromURL,normalizeRecall,schedule,homeCard,notebookQueue,refreshHome};
})();
