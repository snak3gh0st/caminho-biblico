(() => {
  const en = document.documentElement.lang === 'en';
  const t = (pt,english) => en ? english : pt;
  const copy = pair => pair?.[en ? 1 : 0] || '';
  const stages = [['Observe','Observe'],['Entenda','Understand'],['Aplique','Apply']];
  const reviewStates = ['done','adjust'];
  const drafts = new Map();
  let dialog, active, review, revision = 0;

  function dateStamp(days=0) {
    const date = new Date();
    date.setDate(date.getDate()+days);
    return [date.getFullYear(),date.getMonth()+1,date.getDate()].map((item,i)=>String(item).padStart(i===0?4:2,'0')).join('-');
  }

  function validDate(value) {
    if (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(value+'T12:00:00Z');
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0,10)===value;
  }

  function validReference(reference) {
    if (!Array.isArray(reference) || reference.length!==4 || !reference.every(Number.isInteger)) return false;
    const [id,chapter,from,to]=reference;
    return !!book(id) && chapter>=1 && chapter<=book(id).chapters && from>=1 && to>=from && to<=176;
  }

  function normalizeRecord(input) {
    if (!validReference(input?.reference)) return null;
    if (typeof input.action!=='string' || !input.action.trim() || input.action.length>600 || !validDate(input.reviewOn)) return null;
    const reviews = Array.isArray(input.reviews) ? input.reviews.slice(-12).filter(item =>
      item && reviewStates.includes(item.outcome) && validDate(item.date) && typeof item.note==='string' && item.note.length<=1500)
      .map(({outcome,date,note})=>({outcome,date,note})) : [];
    return {reference:input.reference.slice(),action:input.action.trim(),reviewOn:input.reviewOn,done:input.done===true,reviews};
  }

  const label = ([id,chapter,from,to]) => `${ref({bookId:id,chapter})}:${from}${to!==from?'–'+to:''}`;
  const chapterLabel = ([id,chapter]) => ref({bookId:id,chapter});
  const readLink = (range,text=label(range)) => `<button type="button" class="guide-passage" data-guide-read="${range.join('.')}">${esc(text)} <span aria-hidden="true">↗</span></button>`;
  const start = (range,text=t('Estudar e aplicar','Study and apply')) => `<button type="button" class="guide-passage" data-practice-open="${range.join('.')}">${esc(text)} <span aria-hidden="true">↗</span></button>`;
  const closeLabel = () => t('Fechar estudo guiado','Close guided study');
  const prettyDate = date => validDate(date) ? new Intl.DateTimeFormat(en?'en-US':'pt-BR',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(date+'T12:00:00Z')) : '';

  function library() {
    return `<section class="guide-section practice-catalog" id="study"><h2>${t('Estudos para levar à prática','Study and put it into practice')}</h2>
      <p>${t('Observe o que o texto diz, entenda a passagem no contexto e escolha um passo para a sua semana.','Observe what the text says, understand the passage in context, and choose one step for the week.')}</p>
      <ul class="practice-catalog-list">${practiceGuides.map(guide=>`<li>${guide.image?`<img src="./scenes/${guide.image}" alt="" loading="lazy" width="120" height="72">`:''}<div><small>${esc(label(guide.range))}</small><h3>${esc(copy(guide.title))}</h3></div>${start(guide.range)}</li>`).join('')}</ul><p class="practice-catalog-tip">${t('Para estudar outro trecho, abra a passagem pelo leitor e escolha Estudar trecho.','To study another passage, open it in the reader and choose Study passage.')}</p></section>`;
  }

  function pending(entries) {
    return entries.filter(entry=>!entry.practice.done).sort((a,b)=>a.practice.reviewOn.localeCompare(b.practice.reviewOn));
  }

  function homeCard() {
    const entry = pending(window.PoiemaNotes?.studyEntries() || [])[0];
    if (!entry) return '';
    return `<div><small>${t('Próximo passo do estudo','Next step from your study')} · ${esc(label(entry.practice.reference))}</small>
      <h2>${t('Retome sua aplicação','Revisit your application')}</h2><p>${esc(entry.practice.action)}</p>
      <small>${t('Rever em','Review on')} ${esc(prettyDate(entry.practice.reviewOn))}</small></div>
      <button type="button" class="guide-passage" data-practice-review="${esc(entry.id)}">${t('Rever aplicação','Review application')} →</button>`;
  }

  function refreshHome() {
    const card = document.querySelector('#guide-practice-resume');
    if (card) card.innerHTML = homeCard();
  }

  function notebookQueue(entries) {
    const ongoing = pending(entries);
    if (!ongoing.length) return '';
    return `<details class="practice-queue" open><summary>${t('Próximos passos','Next steps')} · ${ongoing.length}</summary><ul>${ongoing.map(entry=>`<li><div><strong>${esc(label(entry.practice.reference))}</strong><span>${esc(entry.practice.action)}</span><small>${t('Rever em','Review on')} ${esc(prettyDate(entry.practice.reviewOn))}</small></div>
      <button type="button" data-practice-review="${esc(entry.id)}">${t('Rever','Review')} →</button></li>`).join('')}</ul></details>`;
  }

  function notebookDetail(entry) {
    const item = entry?.practice;
    if (!item) return '';
    return `<section class="practice-note"><h3>${t('Aplicação deste estudo','Application from this study')}</h3>
      <p>${esc(item.action)}</p><div class="guide-links">${readLink(item.reference)}
      ${item.done ? `<span>${t('Prática registrada','Practice recorded')}</span>` : `<button type="button" data-practice-review="${esc(entry.id)}">${t('Rever aplicação','Review application')}</button>`}</div>
      ${item.reviews.length ? `<details><summary>${t('Histórico da prática','Practice history')}</summary><ul>${item.reviews.slice().reverse().map(item=>`<li><strong>${esc(prettyDate(item.date))} · ${reviewLabel(item.outcome)}</strong>${item.note?`<p>${esc(item.note)}</p>`:''}</li>`).join('')}</ul></details>`:''}</section>`;
  }

  const reviewLabel = outcome => outcome==='done' ? t('Consegui praticar','I put it into practice') : t('Quero ajustar','I want to adjust it');

  function makeGuide(requested,data) {
    const [id,chapter,from,to] = requested;
    const curated = practiceGuides.find(guide=>guide.range[0]===id && guide.range[1]===chapter && from>=guide.range[2] && from<=guide.range[3]);
    if (curated) return curated;
    const part = data?.study?.outline?.find(item=>from>=item.from && from<=item.to);
    const range = [id,chapter,part?.from ?? from,part?.to ?? to];
    const parallel = data?.crossRefs?.find(item=>item.fromVerse>=range[2] && item.fromVerse<=range[3]);
    const isPoetry = [18,19,20,21,22,25].includes(id);
    const isLetter = id>=45 && id<=65;
    return {
      range, evidence:[from], title:[part?.title || chapterLabel(range),part?.title || chapterLabel(range)],
      observation: isPoetry ? ['Que imagem ou contraste organiza o trecho? Que mudança você percebe da primeira para a última linha?','What image or contrast shapes the passage? What changes between the first and last line?']
        : isLetter ? ['Qual é a ideia principal do trecho? Que conectivos mostram como as ideias se ligam?','What is the main idea of the passage? Which connecting words show how the ideas fit together?']
        : ['Quem fala ou age? Que palavra, ação ou mudança ajuda a entender o que acontece?','Who speaks or acts? What word, action, or change helps you see what is happening?'],
      clue:['Releia o trecho em voz baixa. Marque uma palavra ou ação que apareça mais de uma vez, ou uma mudança que divida o trecho em duas partes.','Read the passage quietly. Underline a repeated word or action, or a change that divides the passage into two parts.'],
      context:[part?.explanation || '',part?.explanation || ''],
      question:['Como os versículos ao redor ajudam a interpretar a frase em que você se deteve?','How do the surrounding verses help you interpret the sentence you stopped at?'],
      related:parallel && [parallel.bookId,parallel.chapter,parallel.verse,parallel.verse],
      connection:['Leia a referência em seu próprio contexto. O que realmente aproxima as duas passagens?','Read the reference in its own context. What actually connects the two passages?'],
      bridge:['Escolha algo que você encontrou no texto e escreva como isso pode orientar uma escolha observável nesta semana.','Choose something you found in the text and write how it could guide one observable decision this week.'],
      actions:[]
    };
  }

  function modal() {
    if (dialog) return dialog;
    dialog=document.createElement('dialog');
    dialog.className='guide-dialog practice-dialog';
    dialog.setAttribute('aria-labelledby','practice-title');
    document.body.append(dialog);
    dialog.addEventListener('close',()=>{
      if (dialog.open) return;
      revision++;
      refreshHome();
    });
    dialog.addEventListener('input',event=>{
      if (active && event.target.matches('[data-practice-draft]')) active.draft[event.target.name]=event.target.value;
    });
    dialog.addEventListener('change',event=>{
      if (review && event.target.name==='outcome') updateReviewFields(event.target.form);
    });
    dialog.addEventListener('submit',event=>{
      if (event.target.matches('[data-practice-apply]')) { event.preventDefault(); saveApplication(event.target); }
      if (event.target.matches('[data-practice-review-form]')) { event.preventDefault(); saveReview(event.target); }
    });
    return dialog;
  }

  function header(title,subtitle='') {
    return `<header class="guide-dialog-head practice-head"><div>${subtitle?`<small>${esc(subtitle)}</small>`:''}<h2 id="practice-title" tabindex="-1">${esc(title)}</h2></div>
      <form method="dialog"><button aria-label="${closeLabel()}">×</button></form></header>`;
  }

  async function open(requested) {
    const [id,chapter,from=1,to=from] = requested;
    const range=[id,chapter,from,to];
    if (!validReference(range)) return;
    modal();
    review=null; active=null;
    const request=++revision;
    dialog.innerHTML=header(t('Estudo guiado','Guided study'),label(range))+`<p class="practice-loading" role="status">${t('Carregando o trecho…','Loading the passage…')}</p>`;
    if (!dialog.open) dialog.showModal();
    const data=await getResource(`/api/library/${id}/${chapter}`).catch(()=>null);
    if (!dialog.open || request!==revision) return;
    const guide=makeGuide(range,data), key=guide.range.join('.');
    if (!drafts.has(key)) drafts.set(key,{observation:'',meaning:'',action:'',date:dateStamp(3)});
    active={guide,data,draft:drafts.get(key),step:0,saved:null};
    drawStudy();
    dialog.querySelector('#practice-title').focus({preventScroll:true});
  }

  function readEvidence(scope,guide) {
    const node=scope.querySelector('[data-practice-verses]');
    const [id,chapter,from,to]=guide.range;
    portalBookText(id).then(books=>{
      if (!node?.isConnected) return;
      const lines=books[chapter];
      node.innerHTML=lines ? Object.entries(lines).filter(([verse])=>verse>=from && verse<=to).map(([verse,text])=>
        `<p ${guide.evidence.includes(Number(verse))?'class="practice-key-verse"':''}><sup>${esc(verse)}</sup> ${esc(text)}</p>`).join('')
        : `<p>${t('Trecho indisponível neste momento.','The passage is currently unavailable.')}</p>`;
      node.removeAttribute('aria-busy');
    });
  }

  function studyDetail() {
    const {guide,draft,step,data,saved}=active;
    if (saved) return `<section class="practice-success" tabindex="-1"><h3>${t('Aplicação guardada','Application saved')}</h3><p>${esc(draft.action.trim())}</p><p>${t('Revisão no Caderno em','Review in your Notebook on')} ${esc(prettyDate(draft.date))}.</p>
      <button type="button" class="guide-passage" data-practice-notebook="${esc(saved)}">${t('Abrir no Caderno','Open in Notebook')} ↗</button></section>`;
    if (step===0) return `<h3>${t('O que o texto diz?','What does the text say?')}</h3><p>${esc(copy(guide.observation))}</p>
      <details><summary>${t('Ver uma pista no texto','See a clue in the text')}</summary><p>${esc(copy(guide.clue))}</p></details>
      <label>${t('O que você observou?','What did you notice?')} <textarea name="observation" rows="3" maxlength="1600" data-practice-draft>${esc(draft.observation)}</textarea></label>`;
    if (step===1) return `<h3>${t('O que isso significa no contexto?','What does this mean in context?')}</h3>
      <p>${esc(copy(guide.context) || t('O resumo do trecho está indisponível. Leia os versículos ao redor no capítulo.','The passage summary is unavailable. Read the surrounding verses in the chapter.'))}</p><p><strong>${esc(copy(guide.question))}</strong></p>
      ${guide.related?`<div class="practice-related"><p>${esc(copy(guide.connection))}</p>${readLink(guide.related)}</div>`:''}
      ${data?.study?.context ? `<details><summary>${t('Contexto e fontes do capítulo','Chapter context and sources')}</summary><p>${esc(data.study.context)}</p>
        ${data.study.uncertainty?`<p>${esc(data.study.uncertainty)}</p>`:''}
        <ul>${(data.sources||[]).filter(source=>/^https:\/\//.test(source.url)).map(source=>`<li><a href="${esc(source.url)}" target="_blank" rel="noopener">${esc(source.author || source.title)} ↗</a></li>`).join('')}</ul></details>`:''}
      <label>${t('Como você entende o trecho?','How do you understand the passage?')} <textarea name="meaning" rows="3" maxlength="1600" data-practice-draft>${esc(draft.meaning)}</textarea></label>
      <p class="practice-reflection-status" data-practice-reflection-status role="status"></p>
      <button type="button" class="guide-passage" data-practice-reflection>${t('Guardar reflexão','Save reflection')}</button>`;
    return `<h3>${t('Qual passo você pode dar?','What step can you take?')}</h3><p>${esc(copy(guide.bridge))}</p>
      ${guide.actions.length?`<details><summary>${t('Ver sugestões de aplicação','See application ideas')}</summary><ul class="practice-ideas">${guide.actions.map((action,i)=>`<li><p>${esc(copy(action))}</p><button type="button" class="guide-passage" data-practice-idea="${i}">${t('Usar esta ideia','Use this idea')}</button></li>`).join('')}</ul></details>`:''}
      ${!guide.actions.length && data?.study?.practice ? `<details><summary>${t('Sugestão de aplicação para o capítulo','Application idea for this chapter')}</summary><p>${esc(data.study.practice)}</p></details>`:''}
      <form class="practice-form" id="practice-apply" data-practice-apply>
        <label>${t('Meu próximo passo','My next step')}<textarea name="action" rows="4" maxlength="600" required data-practice-draft placeholder="${t('O que vou fazer e em que situação?','What will I do, and in what situation?')}">${esc(draft.action)}</textarea></label>
        <label class="practice-date">${t('Quando quero rever','When I want to review')}<input type="date" name="date" min="${dateStamp()}" required value="${esc(draft.date)}" data-practice-draft></label>
        <p role="status" data-practice-status></p>
      </form>`;
  }

  function drawStudy(focus=false) {
    const {guide,step,saved}=active;
    dialog.innerHTML=header(copy(guide.title),label(guide.range))+
      `<div class="practice-body">
        ${saved?'':`<nav class="practice-steps" aria-label="${t('Etapas do estudo','Study steps')}">${stages.map(([pt,english],index)=>`<button type="button" data-practice-step="${index}" ${index===step?'aria-current="step"':''}>${index+1} <span>${t(pt,english)}</span></button>`).join('')}</nav>`}
        <div class="practice-spread">
          <section class="practice-main" tabindex="-1">${studyDetail()}</section>
          <details class="practice-bible" ${step===0?'open':''}><summary>${t('Ler o trecho','Read the passage')} · ${esc(label(guide.range))}</summary>
            <div data-practice-verses aria-busy="true"><p>${t('Carregando a passagem…','Loading the passage…')}</p></div>
            <small>${t('Bíblia Portuguesa Mundial','World English Bible')}</small>
            <div>${readLink(guide.range,t('Abrir no leitor','Open in reader'))}</div></details>
        </div></div>
      <footer class="practice-footer">
        ${step>0&&!saved?`<button type="button" class="guide-passage" data-practice-step="${step-1}">← ${t('Voltar etapa','Previous step')}</button>`:''}
        ${saved?`<button type="button" class="guide-passage practice-next" data-practice-close>${t('Fechar','Close')}</button>`:
          step===2?`<button type="submit" class="guide-passage practice-next" form="practice-apply">${t('Guardar aplicação','Save application')}</button>`:
          `<button type="button" class="guide-passage practice-next" data-practice-step="${step+1}">${t(step===0?'Ir para o contexto':'Ir para a aplicação',step===0?'Go to context':'Go to application')} →</button>`}
      </footer>`;
    readEvidence(dialog,guide);
    if (focus) dialog.querySelector('.practice-main').focus({preventScroll:true});
  }

  function studyText(guide,draft,action='') {
    return [
      label(guide.range),
      draft.observation.trim() && `${t('O que observei','What I noticed')}\n${draft.observation.trim()}`,
      draft.meaning.trim() && `${t('Como entendi','How I understood it')}\n${draft.meaning.trim()}`,
      action && `${t('Meu próximo passo','My next step')}\n${action}`,
    ].filter(Boolean).join('\n\n');
  }

  function saveReflection() {
    const {guide,draft}=active, status=dialog.querySelector('[data-practice-reflection-status]');
    if (!draft.observation.trim() && !draft.meaning.trim()) {
      status.textContent=t('Escreva uma observação ou interpretação primeiro.','Write an observation or interpretation first.');
      return;
    }
    try {
      draft.noteId=window.PoiemaNotes.saveDiscovery({id:draft.noteId,title:copy(guide.title),
        text:studyText(guide,draft),cites:[guide.range.slice(0,2).join(':')]});
      status.textContent=t('Reflexão guardada no Caderno.','Reflection saved to your Notebook.');
    } catch { status.textContent=t('O Caderno não conseguiu guardar a reflexão.','The Notebook could not save the reflection.'); }
  }

  function saveApplication(form) {
    const {guide,draft,saved}=active, status=form.querySelector('[data-practice-status]');
    const practice=normalizeRecord({reference:guide.range,action:draft.action,reviewOn:draft.date,done:false,reviews:[]});
    if (!practice || draft.date<dateStamp()) {
      status.textContent=t('Escreva uma ação e escolha uma data de hoje em diante.','Write an action and choose a date from today onward.');
      return;
    }
    const text=studyText(guide,draft,practice.action);
    try {
      active.saved=window.PoiemaNotes.saveStudy({id:saved || draft.noteId,title:copy(guide.title),text,practice});
      delete draft.noteId;
      refreshHome();
      drawStudy(true);
    } catch { status.textContent=t('O Caderno não conseguiu guardar a aplicação.','The Notebook could not save the application.'); }
  }

  function openReview(id) {
    const entry=window.PoiemaNotes?.studyEntries().find(item=>item.id===id);
    if (!entry || entry.practice.done) return;
    revision++;
    active=null;
    review=entry;
    modal();
    const item=entry.practice;
    dialog.innerHTML=header(t('Rever aplicação','Review application'),label(item.reference))+`<div class="practice-body practice-review">
      <h3>${t('O que aconteceu quando você tentou?','What happened when you tried?')}</h3>
      <blockquote>${esc(item.action)}</blockquote>${readLink(item.reference)}
      <form id="practice-review-form" class="practice-form" data-practice-review-form>
        <fieldset><legend>${t('Como foi?','How did it go?')}</legend>
          <label><input type="radio" name="outcome" value="done" required> ${reviewLabel('done')}</label>
          <label><input type="radio" name="outcome" value="adjust" required> ${reviewLabel('adjust')}</label></fieldset>
        <label>${t('O que você quer lembrar?','What do you want to remember?')}<textarea name="note" maxlength="1500" rows="3"></textarea></label>
        <div data-practice-adjust hidden><label>${t('Meu próximo passo ajustado','My adjusted next step')}<textarea name="action" maxlength="600" rows="3" disabled>${esc(item.action)}</textarea></label>
          <label class="practice-date">${t('Nova data de revisão','New review date')}<input type="date" name="reviewOn" value="${dateStamp(3)}" min="${dateStamp()}" disabled></label></div>
        <p role="status" data-practice-status></p>
      </form></div><footer class="practice-footer"><button type="submit" class="guide-passage practice-next" form="practice-review-form">${t('Guardar revisão','Save review')}</button></footer>`;
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('#practice-title').focus({preventScroll:true});
  }

  function updateReviewFields(form) {
    const adjust=form.elements.outcome.value==='adjust';
    form.querySelector('[data-practice-adjust]').hidden=!adjust;
    for (const control of [form.elements.action,form.elements.reviewOn]) {
      control.disabled=!adjust;
      control.required=adjust;
    }
  }

  function saveReview(form) {
    const data=new FormData(form), outcome=data.get('outcome'), entry=review;
    const status=form.querySelector('[data-practice-status]');
    if (!reviewStates.includes(outcome)) return;
    const practice={...entry.practice,done:outcome==='done',reviews:[...entry.practice.reviews,{
      outcome,date:dateStamp(),note:String(data.get('note')||'').trim(),
    }].slice(-12)};
    if (outcome==='adjust') {
      practice.action=String(data.get('action')||'').trim();
      practice.reviewOn=String(data.get('reviewOn')||'');
    }
    if (!normalizeRecord(practice) || (outcome==='adjust' && practice.reviewOn<dateStamp())) {
      status.textContent=t('Confira o próximo passo e a data de revisão.','Check the next step and review date.');
      return;
    }
    try {
      window.PoiemaNotes.saveStudy({id:entry.id,practice,previous:entry.practice});
      refreshHome();
      dialog.innerHTML=header(t('Revisão guardada','Review saved'),label(practice.reference))+
        `<div class="practice-body"><p>${outcome==='done'?t('Sua prática ficou registrada no Caderno.','Your practice is recorded in the Notebook.'):t('Seu próximo passo e a nova data ficaram registrados.','Your next step and new date are recorded.')}</p></div>
        <footer class="practice-footer"><button type="button" class="guide-passage practice-next" data-practice-close>${t('Fechar','Close')}</button></footer>`;
      dialog.querySelector('#practice-title').focus({preventScroll:true});
    } catch { status.textContent=t('O Caderno não conseguiu guardar a revisão.','The Notebook could not save the review.'); }
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if (!button) return;
    const data=button.dataset;
    if (data.practiceOpen) return open(data.practiceOpen.split('.').map(Number));
    if (data.practiceReview) return openReview(data.practiceReview);
    if (!dialog?.contains(button)) return;
    if (Object.hasOwn(data,'practiceClose')) return dialog.close();
    if (data.practiceNotebook) {
      dialog.close();
      return window.PoiemaNotes?.open(data.practiceNotebook);
    }
    if (Object.hasOwn(data,'practiceReflection') && active) return saveReflection();
    if (data.practiceStep!==undefined && active) {
      active.step=Number(data.practiceStep);
      drawStudy(true);
    }
    if (data.practiceIdea!==undefined && active) {
      const field=dialog.querySelector('[name="action"]');
      const idea=copy(active.guide.actions[Number(data.practiceIdea)]);
      if (!field || !idea) return;
      if (field.value.trim()) {
        dialog.querySelector('[data-practice-status]').textContent=t('Edite seu próximo passo no campo abaixo.','Edit your next step in the field below.');
        field.focus();
        return;
      }
      active.draft.action=field.value=idea;
      field.focus();
    }
  });

  window.PoiemaPractice={library,start,homeCard,refreshHome,notebookQueue,notebookDetail,normalizeRecord};
})();
