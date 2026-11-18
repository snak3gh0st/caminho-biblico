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
    this.index = Number(this.dataset.start || 0);
    this.topic = this.dataset.topic || 'cena';
    this.onclick = e => this.act(e);
    this.paint();
    portalBookText(this.reading.bookId).then(data => {
      this.text = data[this.reading.chapter] || {};
      if (this.isConnected && !this.querySelector('.well-answer p') && this.topic === 'cena' && !this.translation) this.panel();
    });
    this.onkeydown = event => {
      if (!this.hasAttribute('expanded') || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft','ArrowRight'].includes(event.key)) return;
      const control = this.querySelector(event.key === 'ArrowLeft' ? '[data-p="prev"]' : '[data-p="next"]');
      if (!control.disabled) { event.preventDefault(); control.click(); }
    };
  }
  disconnectedCallback() {
    this.stopSound();

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
    this.place = this.guide?.place ?? 0;
    const scene = passageScene(this.reading, this.part);
    const expanded = this.hasAttribute('expanded');
    this.innerHTML = `<div class="portal-stage">
      <img class="portal-photo" alt="${esc(scene.alt)}" src="./scenes/${esc(scene.file)}">
      <div class="portal-rail"><span>${esc(ref(this.reading))} · v. ${this.part.from}–${this.part.to}</span><button data-p="expand">${expanded?'Voltar à leitura ×':'Atravessar o portal ↗'}</button></div>
      <button class="portal-pin" data-p="inspect" aria-expanded="false"><i aria-hidden="true"></i>${esc(this.detail?.[0] || 'Observar o trecho')}</button>
      <div class="portal-caption"><small>${scene.thematic?'Ambientação temática':'Cena interpretativa'} · IA</small><h3>${esc(this.guide?.title || this.part.title)}</h3>
      <div class="portal-pages"><button aria-label="Cena anterior" data-p="prev" ${this.index?'':'disabled'}>←</button><span>Cena ${this.index+1} de ${this.parts.length}</span><button aria-label="Próxima cena" data-p="next" ${this.index+1===this.parts.length?'disabled':''}>→</button></div></div></div>
      <div class="portal-study"><div class="portal-film" aria-label="Escolher cena">${this.parts.map((p,i)=>`<button data-p="frame" data-i="${i}" aria-label="Cena ${i+1}. ${esc(p.title)}" aria-pressed="${this.index===i}"><img alt="" loading="lazy" src="./scenes/${esc(passageScene(this.reading,p).file)}"><span>${p.from}–${p.to}</span></button>`).join('')}</div><nav aria-label="Investigar a cena">${[['cena','Investigar'],...(this.guide ? [['mapa','Mapa']] : []),['tempo','Época'],['ecos','Conexões'],...(this.guide ? [['voz','Palavra-chave']] : [])].map(([id,name])=>`<button data-p="${id}" aria-pressed="${this.topic===id}">${name}</button>`).join('')}</nav><div class="portal-note" tabindex="-1"></div></div>`;
    this.panel();
  }
  panel() {
    const el = this.querySelector('.portal-note');
    const p = this.part, s = this.data.study;
    if (this.topic === 'voz') {
      const [letters, sound, meaning, context] = this.guide.word;
      el.innerHTML = `<small>Hebraico em diálogo com João</small><p class="portal-he" dir="rtl" lang="he">${esc(letters)}</p><h4>${esc(sound)} · ${esc(meaning)}</h4><button data-p="word">▷ Ouvir ${esc(sound)}</button><small>Gravação humana · pronúncia israelense atual</small><p>${esc(context)}</p>`;
      return;
    }
    if (this.topic === 'mapa') {
      const [name,,,detail,refText] = wellLocations[this.place];
      el.innerHTML = `<h4>Da Judeia à Galileia</h4><div class="well-atlas" role="group" aria-label="Lugares de João 4, norte para cima"><span class="atlas-north">↑ Norte</span>${wellLocations.map(([label,x,y],i)=>`<button data-p="place" data-i="${i}" style="left:${x}%;top:${y}%" aria-label="${label}" aria-pressed="${i===this.place}"><i></i><span>${label}</span></button>`).join('')}</div><small>Relevo · localizações aproximadas</small><div aria-live="polite"><h4>${name}</h4><p>${detail}</p><small>${refText}</small></div>`;
      return;
    }
    if (this.topic === 'ecos') {
      const links = this.data.crossRefs.filter(r => r.fromVerse >= p.from && r.fromVerse <= p.to);
      this.links = links.length ? links : this.data.crossRefs.slice(0,3);
      el.innerHTML = `<small>${links.length?'Conexões deste trecho':'Conexões do capítulo'}</small><h4>Leia em paralelo</h4><div class="portal-links">${this.links.map((r,i)=>`<button data-p="compare" data-i="${i}">v. ${r.fromVerse} → ${esc(ref(r))}.${r.verse}</button>`).join('')}</div><div class="portal-pair" aria-live="polite"></div>`;if(this.links.length) this.compare(0); return;
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
    el.innerHTML = `<small>${esc(this.detail?.[2] || ref(this.reading)+' · v. '+p.from+'–'+p.to)}</small>${this.guide ? `<h4>${esc(this.guide.question)}</h4><div class="well-choices">${this.guide.choices.map(([label],i)=>`<button data-p="discover" data-i="${i}">${esc(label)} →</button>`).join('')}</div><div class="well-answer" aria-live="polite"></div><button data-p="guide-audio">▷ Ouvir guia em português</button>` : `<h4>Dentro do trecho</h4><p>${esc(p.explanation)}</p>`}${lines.some(Boolean)?`<details><summary>Ler o texto · ${esc(this.translation?.versionName || 'Bíblia Portuguesa Mundial')}</summary>${lines.map((v,i)=>`<p><sup>${p.from+i}</sup> ${esc(v)}</p>`).join('')}</details>`:''}`;
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
    if (action === 'guide-audio') {
      const player = document.createElement('audio');
      player.controls = true; player.src = './media/john4/'+this.index+'.mp3';
      player.setAttribute('aria-label','Guia em português'); b.replaceWith(player);
      player.play().catch(()=>player.focus());return;
    }
    if (action === 'discover') {
      this.querySelectorAll('[data-p="discover"]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn===b)));
      this.querySelector('.well-answer').innerHTML = `<p>${esc(this.guide.choices[Number(b.dataset.i)][1])}</p><small>${esc(this.guide.source)}</small>`;
      return;
    }
    if (action === 'place') {
      this.place = Number(b.dataset.i); this.panel();
      this.querySelector('[data-p="place"][aria-pressed="true"]').focus({preventScroll:true}); return;
    }
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
