// The reader and the immersive view use the same study and passage artwork.
const wellScenes = [
  ['O poço de Jacó', 'A viagem para no poço. João situa o encontro perto das terras que Jacó dera a José. Quando a mulher chama Jacó de “nosso pai”, ela fala de uma memória que também pertence aos samaritanos.', 'João 4.5–6, 12'],
  ['O cântaro e a água', 'Imagine chegar para tirar água e ouvir um viajante pedir de beber. A mulher observa que ele nem sequer tem como tirar água do poço. É dessa dificuldade concreta que nasce a pergunta sobre a água viva.', 'João 4.7–15'],
  ['O cântaro deixado', 'Repare no que fica para trás. A mulher deixa o cântaro e vai à cidade. Seu convite leva outras pessoas até Jesus. A narrativa passa da palavra de uma testemunha à escuta dos próprios moradores.', 'João 4.28–30, 39–42'],
  ['A distância até Cafarnaum', 'O pai pede que Jesus desça antes que seu filho morra. Ele volta pelo caminho confiando na palavra que ouviu. Observe quando a notícia da cura chega e por que o pai pergunta a hora.', 'João 4.46–53']
];
const hebrewBooks = new Map();
function portalHebrewBook(id) {
  if (!hebrewBooks.has(id)) hebrewBooks.set(id, staticFile('media/hebrew/' + id + '.json').catch(() => { hebrewBooks.delete(id); return {}; }));
  return hebrewBooks.get(id);
}
const portalTexts = new Map();
function portalBookText(id) {
  if (!portalTexts.has(id)) portalTexts.set(id, staticFile('media/portal-text/' + id + '.json').catch(() => { portalTexts.delete(id); return {}; }));
  return portalTexts.get(id);
}
function hebrewReader() {
  return window.speechSynthesis?.getVoices().find(v => v.localService && /^(he|iw)([-_]|$)/i.test(v.lang));
}
class PassagePortal extends HTMLElement {
  connectedCallback() {
    this.reading ??= plan()?.days[activeDay]?.readings[activeReading];
    this.data ??= libraryData;
    this.profile ??= bookProfileData;
    this.translation ??= chapterData;
    if (!this.data || !this.reading) return;
    this.index = Number(this.dataset.start || 0);
    this.topic = this.dataset.topic || 'cena';
    this.onclick = e => this.act(e);
    this.paint();
    portalBookText(this.reading.bookId).then(data => {
      this.text = data[this.reading.chapter] || {};
      if (this.isConnected && this.topic === 'cena' && !this.translation) this.panel();
    });
    this.voiceChange = () => this.updateVoice();
    window.speechSynthesis?.addEventListener('voiceschanged', this.voiceChange);
    portalHebrewBook(this.reading.bookId).then(data => {
      this.hebrew = data[this.reading.chapter] || {};
      if (this.isConnected && this.topic === 'voz') this.panel();
    });
  }
  disconnectedCallback() {
    this.stopSound();
    window.speechSynthesis?.removeEventListener('voiceschanged', this.voiceChange);
  }
  stopSound() {
    this.audio?.pause();
    if (this.speech) { this.speech = null; window.speechSynthesis?.cancel(); }
  }
  get parts() { return this.data.study.outline; }
  get part() { return this.parts[this.index]; }
  get detail() { return key(this.reading) === '43:4' ? wellScenes[this.index] : null; }
  paint() {
    const scene = passageScene(this.reading, this.part);
    const expanded = this.hasAttribute('expanded');
    this.innerHTML = `<div class="portal-stage">
      <img class="portal-photo" alt="${esc(scene.alt)}" src="./scenes/${esc(scene.file)}">
      <div class="portal-rail"><span>${esc(ref(this.reading))} · v. ${this.part.from}–${this.part.to}</span><button data-p="expand">${expanded?'Voltar à leitura ×':'Atravessar o portal ↗'}</button></div>
      <button class="portal-pin" data-p="inspect" aria-expanded="false"><i aria-hidden="true"></i>${esc(this.detail?.[0] || 'Observar o trecho')}</button>
      <div class="portal-caption"><small>${scene.thematic?'Ambientação temática':'Cena interpretativa'} · IA</small><h3>${esc(this.part.title)}</h3>
      <div class="portal-pages"><button aria-label="Cena anterior" data-p="prev" ${this.index?'':'disabled'}>←</button><span>Cena ${this.index+1} de ${this.parts.length}</span><button aria-label="Próxima cena" data-p="next" ${this.index+1===this.parts.length?'disabled':''}>→</button></div></div></div>
      <div class="portal-study"><div class="portal-film" aria-label="Escolher cena">${this.parts.map((p,i)=>`<button data-p="frame" data-i="${i}" aria-label="Cena ${i+1}. ${esc(p.title)}" aria-pressed="${this.index===i}"><img alt="" loading="lazy" src="./scenes/${esc(passageScene(this.reading,p).file)}"><span>${p.from}–${p.to}</span></button>`).join('')}</div><nav aria-label="Investigar a cena">${[['cena','Na cena'],['tempo','Época'],['ecos','Conexões'],['voz','Hebraico']].map(([id,name])=>`<button data-p="${id}" aria-pressed="${this.topic===id}">${name}</button>`).join('')}</nav><div class="portal-note" tabindex="-1"></div></div>`;
    this.panel();
  }
  panel() {
    const el = this.querySelector('.portal-note');
    const p = this.part, s = this.data.study;
    if (this.topic === 'voz') {
      const line = this.hebrew?.[p.from];
      el.innerHTML = `<small>Leitura da edição hebraica · v. ${p.from}</small><h4>${this.reading.bookId < 40?'Texto massorético':'Tradução hebraica de Salkinson'}</h4>${line?`<p class="portal-he" lang="he" dir="rtl">${esc(line)}</p><button data-p="speak">Ouvir versículo</button><p class="portal-status" role="status"></p>`:`<p>${this.hebrew?'Versículo indisponível nesta numeração.':'Carregando o versículo…'}</p>`}<button data-p="word">Ouvir “emuná” · fé</button><small>Pronúncia israelense contemporânea · voz humana</small>`;
      this.updateVoice(); return;
    }
    if (this.topic === 'ecos') {
      const links = this.data.crossRefs.filter(r => r.fromVerse >= p.from && r.fromVerse <= p.to);
      this.links = links.length ? links : this.data.crossRefs.slice(0,3);
      el.innerHTML = `<small>${links.length?'Conexões deste trecho':'Conexões do capítulo'}</small><h4>Leia em paralelo</h4><div class="portal-links">${this.links.map((r,i)=>`<button data-p="compare" data-i="${i}">v. ${r.fromVerse} → ${esc(ref(r))}.${r.verse}</button>`).join('')}</div><div class="portal-pair" aria-live="polite"></div>`;if(this.links.length) this.compare(0); return;
    }
    if (this.topic === 'tempo') {
      el.innerHTML = `<small>Contexto do capítulo</small><h4>O mundo desta passagem</h4><p>${esc(s.context)}</p>${this.profile?.dossier?`<details><summary>Tempo da narrativa</summary><p>${esc(this.profile.dossier.narratedEra)}</p></details>`:''}<details><summary>Fontes do estudo</summary>${this.data.sources.map(src=>`<p><a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.author)}</a></p>`).join('')}</details>`;return;
    }
    const lines = Array.from({length:p.to-p.from+1},(_,i)=>this.translation?.verses?.[p.from+i-1] || this.text?.[p.from+i]);
    el.innerHTML = `<small>${esc(this.detail?.[2] || ref(this.reading)+' · v. '+p.from+'–'+p.to)}</small><h4>Dentro do trecho</h4><p>${esc(p.explanation)}</p>${lines.some(Boolean)?`<details><summary>Ler o texto · ${esc(this.translation?.versionName || 'Bíblia Portuguesa Mundial')}</summary>${lines.map((v,i)=>`<p><sup>${p.from+i}</sup> ${esc(v)}</p>`).join('')}</details>`:''}`;
  }
  updateVoice() {
    const btn = this.querySelector('[data-p="speak"]');
    if (!btn) return;
    btn.disabled = !hebrewReader();
    this.querySelector('.portal-status').textContent = btn.disabled ? 'Para ouvir o versículo, instale uma voz hebraica no dispositivo.' : 'Voz hebraica do dispositivo.';
  }
  async compare(i) {
    const target = this.querySelector('.portal-pair'), link = this.links[i];
    const token = this.compareToken = Symbol();
    target.textContent = 'Carregando os versículos…';
    try {
      const [source,dest] = await Promise.all([portalBookText(this.reading.bookId), portalBookText(link.bookId)]);
      if (token !== this.compareToken) return;
      const quote = (name,t)=>`<blockquote><small>${esc(name)}</small><p>${esc(t || 'Texto indisponível nesta edição.')}</p></blockquote>`;
      target.innerHTML = '<small>Bíblia Portuguesa Mundial</small>' + quote(ref(this.reading)+'.'+link.fromVerse,source[this.reading.chapter]?.[link.fromVerse])+quote(ref(link)+'.'+link.verse,dest[link.chapter]?.[link.verse]);
    } catch { if(token===this.compareToken) target.textContent='Texto indisponível agora. Toque na referência para tentar de novo.'; }
  }
  act(e) {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const action = b.dataset.p;
    this.stopSound();
    if (action === 'expand') {
      if (this.hasAttribute('expanded')) { this.closest('dialog').close(); return; }
      stopLocalNarration();
      const dialog = document.createElement('dialog');
      dialog.className = 'portal-dialog'; dialog.setAttribute('aria-label','Dentro da passagem');
      dialog.innerHTML = `<passage-portal expanded data-start="${this.index}" data-topic="${this.topic}"></passage-portal>`;
      document.body.append(dialog); document.body.classList.add('portal-open');
      dialog.addEventListener('close',()=>{ this.index=dialog.firstElementChild.index; this.topic=dialog.firstElementChild.topic; dialog.remove(); document.body.classList.remove('portal-open'); this.paint(); this.querySelector('[data-p="expand"]').focus({preventScroll:true}); },{once:true});
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
    if (action === 'speak') {
      const voice = hebrewReader(); if (!voice) return;
      stopLocalNarration(); const speech = new SpeechSynthesisUtterance(this.hebrew[this.part.from]);
      speech.voice=voice; speech.lang=voice.lang; speech.rate=.9; this.speech=speech;
      speech.onend=()=>{if(this.speech===speech)this.speech=null;};
      window.speechSynthesis.speak(speech); return;
    }
    if (action === 'word') {
      this.audio = new Audio('./media/hebrew/emunah.mp3');
      this.audio.play().catch(()=>{ b.textContent='Tentar ouvir “emuná” novamente'; });return;
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
