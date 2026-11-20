// The Bible as a connected map of people, places and events (open data, see docs/graph.md):
// a global atlas with every place and the great journeys, a timeline, people with their families, and
// the "who, where, when" of any passage. Everything is read from public/graph/*.json on demand.
(() => {
  if (typeof document === 'undefined') return;
  const EN = document.documentElement.lang === 'en';
  const t = (pt, en) => (EN ? en : pt);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const norm = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const plainName = text => String(text ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  const json = async name => {
    const response = await fetch(`./graph/${name}`);
    if (!response.ok) throw new Error(`Atlas: ${name}`);
    return response.json();
  };

  let D = null, loading = null, panel = null, map = null, layers = null, opener = null;
  const S = { tab: 'map', kind: null, id: null, journey: null, book: 0, q: '', era: '' };
  const ERAS = [
    ['patriarcas', ['Patriarcas', 'Patriarchs'], -4100, -1550], ['exodo', ['Êxodo e deserto', 'Exodus and wilderness'], -1550, -1400], ['conquista', ['Conquista e juízes', 'Conquest and judges'], -1400, -1050],
    ['reis', ['Reis de Israel e Judá', 'Kings of Israel and Judah'], -1050, -586], ['exilio', ['Exílio e retorno', 'Exile and return'], -586, -400], ['jesus', ['Jesus', 'Jesus'], -10, 34], ['igreja', ['Igreja primitiva', 'Early church'], 34, 120],
  ];

  async function load() {
    if (D) return D;
    loading ??= (async () => {
      const [people, places, events, refs, years, journeys] = await Promise.all([json('people.json'), json('places.json'), json('events.json'), json('refs.json'), json('years.json'), json('journeys.json').catch(() => [])]);
      let books = window.poiemaBooks ?? [];
      if (EN || !books.length) { try { books = await (await fetch(EN ? './en/books.json' : './books.json')).json(); } catch { books = window.poiemaBooks ?? []; } }
      const d = { people, places, events, refs, years, journeys, books, easton: {} };
      d.person = new Map(people.map(item => [item.i, item]));
      d.place = new Map(places.map(item => [item.i, item]));
      d.event = new Map(events.map(item => [item.i, item]));
      d.bookName = new Map(books.map(book => [book.id, book.name]));
      // Reverse indexes: which events happen at a place, which events a person takes part in, who was born or died where.
      d.eventsAt = new Map(); d.eventsOf = new Map(); d.hereOf = new Map();
      for (const event of events) {
        for (const slug of event.l ?? []) (d.eventsAt.get(slug) ?? d.eventsAt.set(slug, []).get(slug)).push(event);
        for (const slug of event.p ?? []) (d.eventsOf.get(slug) ?? d.eventsOf.set(slug, []).get(slug)).push(event);
      }
      for (const person of people) for (const slug of [person.b, person.d]) if (slug) (d.hereOf.get(slug) ?? d.hereOf.set(slug, []).get(slug)).push(person);
      d.journeysAt = new Map();
      for (const journey of journeys) for (const step of journey.steps) (d.journeysAt.get(step.place) ?? d.journeysAt.set(step.place, new Set()).get(step.place)).add(journey.id);
      D = d; return d;
    })().catch(error => { loading = null; throw error; });
    return loading;
  }
  async function easton(kind) { const key = kind === 'p' ? 'people' : 'places'; if (!D.easton[key]) D.easton[key] = await json(`easton-${key}.json`); return D.easton[key]; }

  const name = item => (EN ? item.n : item.pt || item.n);
  const eventName = item => (EN ? item.t : item.pt || item.t);
  const bookOf = code => Math.floor(code / 1e6), chapterOf = code => Math.floor((code % 1e6) / 1e3), verseOf = code => code % 1e3;
  const bookLabel = id => D.bookName.get(id) ?? '';
  const year = value => (value === undefined ? '' : value < 0 ? `${-value} ${t('a.C.', 'BC')}` : `${value} ${t('d.C.', 'AD')}`);
  const span = (from, to) => (from === undefined ? '' : to === undefined || to === from ? year(from) : `${year(from)} – ${year(to)}`);
  const studyURL = (b, c, v) => { const url = new URL(location.pathname, location.origin); url.searchParams.set('lang', EN ? 'en' : 'pt'); url.hash = `study=${b}.${c}.${v || 1}`; return url.href; };
  const passageLink = (b, c, from, to) => `<a href="${esc(studyURL(b, c, from))}" data-notebook-open="${b}.${c}.${from}" data-gx-link>${esc(bookLabel(b))} ${c}:${from}${to && to !== from ? '–' + to : ''}</a>`;
  const chip = (kind, id, label, extra = '') => `<button type="button" class="gx-chip" data-gx="${kind}:${esc(id)}">${esc(label)}${extra ? `<small>${esc(extra)}</small>` : ''}</button>`;
  const personChip = slug => { const p = D.person.get(slug); return p ? chip('p', slug, name(p)) : ''; };
  const placeChip = slug => { const p = D.place.get(slug); return p ? chip('l', slug, name(p)) : ''; };
  const eventChip = id => { const e = D.event.get(id); return e ? chip('e', id, eventName(e), span(e.y)) : ''; };

  // Verse codes -> consecutive ranges [book, chapter, from, to].
  function ranges(codes) {
    const out = [];
    for (const code of codes) {
      const last = out.at(-1);
      if (last && last[0] === bookOf(code) && last[1] === chapterOf(code) && verseOf(code) <= last[3] + 1) last[3] = verseOf(code);
      else out.push([bookOf(code), chapterOf(code), verseOf(code), verseOf(code)]);
    }
    return out;
  }
  function passageList(codes, limit = 30) {
    const all = ranges(codes);
    const items = list => `<ul class="gx-passages">${list.map(([b, c, f, to]) => `<li>${passageLink(b, c, f, to)}</li>`).join('')}</ul>`;
    if (!all.length) return `<p class="gx-hint">${t('Sem passagens ligadas.', 'No linked passages.')}</p>`;
    return `${items(all.slice(0, limit))}${all.length > limit ? `<details><summary>${t(`Todas as ${all.length} passagens`, `All ${all.length} passages`)}</summary>${items(all.slice(limit))}</details>` : ''}`;
  }

  // ------- detail views -------
  async function placeDetail(slug) {
    const p = D.place.get(slug); if (!p) return '';
    const text = (await easton('l'))[slug];
    const events = (D.eventsAt.get(slug) ?? []).slice(0, 14);
    const here = (D.hereOf.get(slug) ?? []).slice(0, 12);
    const routes = [...(D.journeysAt.get(slug) ?? [])].map(id => D.journeys.find(j => j.id === id)).filter(Boolean);
    const codes = D.refs.l[slug] ?? [];
    const parent = p.po && D.place.get(p.po);
    return `<header><span class="gx-kind">${esc(p.t ?? t('Lugar', 'Place'))}</span><h3>${esc(name(p))}</h3>${EN || !p.pt ? '' : `<small>${esc(p.n)}</small>`}</header>
      ${p.ds ? `<p>${esc(p.ds)}</p>` : ''}
      <p class="gx-facts">${p.c ? `${esc(p.c)} · ` : ''}${parent ? `${t('Parte de', 'Part of')} ${placeChip(parent.i)} · ` : ''}${p.la.toFixed(2)}°, ${p.lo.toFixed(2)}° · ${p.v} ${t('versículos', 'verses')}</p>
      ${text ? `<details open><summary>${t('Dicionário bíblico de Easton (inglês)', "Easton's Bible Dictionary")}</summary><p class="gx-easton">${esc(text)}</p></details>` : ''}
      ${routes.length ? `<h4>${t('Rotas que passam aqui', 'Journeys through here')}</h4><div class="gx-chips">${routes.map(j => `<button type="button" class="gx-chip" data-gx="j:${esc(j.id)}">${esc(j.title[EN ? 1 : 0])}</button>`).join('')}</div>` : ''}
      ${events.length ? `<h4>${t('Acontecimentos aqui', 'Events here')}</h4><div class="gx-chips">${events.map(e => eventChip(e.i)).join('')}</div>` : ''}
      ${here.length ? `<h4>${t('Pessoas que nasceram ou morreram aqui', 'People born or who died here')}</h4><div class="gx-chips">${here.map(person => personChip(person.i)).join('')}</div>` : ''}
      <h4>${t('Passagens', 'Passages')}</h4>${passageList(codes)}`;
  }
  async function personDetail(slug) {
    const p = D.person.get(slug); if (!p) return '';
    const text = (await easton('p'))[slug];
    const events = (D.eventsOf.get(slug) ?? []).slice(0, 16);
    const chain = []; for (let cur = p.f, guard = 0; cur && guard < 40; guard++) { const parent = D.person.get(cur); if (!parent) break; chain.unshift(parent); cur = parent.f; }
    const kids = (p.k ?? []).map(personChip).join(''), sibs = (p.s ?? []).map(personChip).join(''), wives = (p.w ?? []).map(personChip).join('');
    return `<header><span class="gx-kind">${p.g === 'f' ? t('Mulher', 'Woman') : p.g === 'm' ? t('Homem', 'Man') : t('Pessoa', 'Person')}${p.grp?.length ? ' · ' + esc(p.grp.join(', ')) : ''}</span><h3>${esc(name(p))}</h3>${EN || !p.pt ? '' : `<small>${esc(p.n)}</small>`}${p.al?.length ? `<small>${t('também chamado', 'also called')}: ${esc(p.al.join(', '))}</small>` : ''}</header>
      ${p.ds ? `<p>${esc(p.ds)}</p>` : ''}
      <p class="gx-facts">${span(p.by, p.dy) ? `${esc(span(p.by, p.dy))} · ` : ''}${p.b ? `${t('nasceu em', 'born in')} ${placeChip(p.b)} ` : ''}${p.d ? `${t('morreu em', 'died in')} ${placeChip(p.d)} ` : ''}· ${p.v} ${t('versículos', 'verses')}</p>
      ${text ? `<details open><summary>${t('Dicionário bíblico de Easton (inglês)', "Easton's Bible Dictionary")}</summary><p class="gx-easton">${esc(text)}</p></details>` : ''}
      ${chain.length ? `<h4>${t('Linhagem', 'Lineage')}</h4><p class="gx-lineage">${chain.map(person => chip('p', person.i, name(person))).join('<span aria-hidden="true">›</span>')}<span aria-hidden="true">›</span><strong>${esc(name(p))}</strong></p>` : ''}
      ${p.f || p.m ? `<h4>${t('Pais', 'Parents')}</h4><div class="gx-chips">${personChip(p.f)}${personChip(p.m)}</div>` : ''}
      ${wives ? `<h4>${t('Cônjuges', 'Spouses')}</h4><div class="gx-chips">${wives}</div>` : ''}
      ${kids ? `<h4>${t('Filhos', 'Children')} (${p.k.length})</h4><div class="gx-chips">${kids}</div>` : ''}
      ${sibs ? `<h4>${t('Irmãos', 'Siblings')}</h4><div class="gx-chips">${sibs}</div>` : ''}
      ${events.length ? `<h4>${t('Acontecimentos', 'Events')}</h4><div class="gx-chips">${events.map(e => eventChip(e.i)).join('')}</div>` : ''}
      <h4>${t('Passagens', 'Passages')}</h4>${passageList(D.refs.p[slug] ?? [])}`;
  }
  async function eventDetail(id) {
    const e = D.event.get(Number(id)); if (!e) return '';
    const before = e.pr && D.event.get(e.pr), parent = e.po && D.event.get(e.po);
    const next = D.events.filter(item => item.pr === e.i).slice(0, 5), parts = D.events.filter(item => item.po === e.i).slice(0, 12);
    return `<header><span class="gx-kind">${t('Acontecimento', 'Event')}</span><h3>${esc(eventName(e))}</h3>${EN || !e.pt ? '' : `<small>${esc(e.t)}</small>`}</header>
      <p class="gx-facts">${esc(span(e.y))}${e.du ? ` · ${t('duração', 'duration')} ${esc(e.du)}` : ''}</p>
      ${e.p?.length ? `<h4>${t('Quem', 'Who')}</h4><div class="gx-chips">${e.p.map(personChip).join('')}</div>` : ''}
      ${e.l?.length ? `<h4>${t('Onde', 'Where')}</h4><div class="gx-chips">${e.l.map(placeChip).join('')}</div>` : ''}
      ${parent ? `<h4>${t('Faz parte de', 'Part of')}</h4><div class="gx-chips">${eventChip(parent.i)}</div>` : ''}
      ${before || next.length ? `<h4>${t('Antes e depois', 'Before and after')}</h4><div class="gx-chips">${before ? eventChip(before.i) : ''}${next.map(item => eventChip(item.i)).join('')}</div>` : ''}
      ${parts.length ? `<h4>${t('Etapas', 'Parts')}</h4><div class="gx-chips">${parts.map(item => eventChip(item.i)).join('')}</div>` : ''}
      <h4>${t('Passagens', 'Passages')}</h4>${passageList(D.refs.e[e.i] ?? [])}`;
  }
  function journeyDetail(id) {
    const j = D.journeys.find(item => item.id === id); if (!j) return '';
    return `<header><span class="gx-kind">${t('Rota', 'Journey')}</span><h3>${esc(j.title[EN ? 1 : 0])}</h3></header><p>${esc(j.summary[EN ? 1 : 0])}</p>
      <ol class="gx-steps">${j.steps.map((step, n) => { const p = D.place.get(step.place); const [b, c, v1, v2] = step.ref.split(':').map(Number); return `<li><button type="button" class="gx-step" data-gx-step="${n}"><strong>${esc(p ? name(p) : step.place)}</strong><span>${esc(step.note[EN ? 1 : 0])}</span></button>${passageLink(b, c, v1 || 1, v2)}</li>`; }).join('')}</ol>`;
  }

  // ------- search -------
  function search(query) {
    const q = norm(query).trim(); if (q.length < 2) return [];
    const hits = [];
    const score = (label, v) => { const n = norm(label); const at = n.indexOf(q); return at < 0 ? 0 : (at === 0 ? 3 : n.includes(' ' + q) ? 2 : 1) * 1000 + Math.min(v ?? 0, 900); };
    for (const p of D.places) { const s = Math.max(score(p.n, p.v), p.pt ? score(p.pt, p.v) : 0); if (s) hits.push({ s, kind: 'l', id: p.i, label: name(p), note: p.t }); }
    for (const p of D.people) { const s = Math.max(score(p.n, p.v), p.pt ? score(p.pt, p.v) : 0, ...(p.al ?? []).map(a => score(a, p.v) / 2)); if (s) hits.push({ s, kind: 'p', id: p.i, label: name(p), note: span(p.by, p.dy) || t('pessoa', 'person') }); }
    for (const e of D.events) { const s = Math.max(score(e.t, 50), e.pt ? score(e.pt, 50) : 0); if (s) hits.push({ s, kind: 'e', id: e.i, label: eventName(e), note: span(e.y) }); }
    return hits.sort((a, b) => b.s - a.s).slice(0, 14);
  }
  const KIND = { l: ['Lugar', 'Place'], p: ['Pessoa', 'Person'], e: ['Evento', 'Event'] };

  // ------- the panel -------
  function shell() {
    const tabs = [['map', t('Mapa', 'Map')], ['time', t('Linha do tempo', 'Timeline')], ['people', t('Pessoas', 'People')]];
    return `<div class="gx-shell"><header class="gx-head"><h2 id="gx-title">${t('Atlas e conexões', 'Atlas and connections')}</h2><div class="gx-tabs" role="tablist">${tabs.map(([id, label]) => `<button type="button" role="tab" aria-selected="${S.tab === id}" data-gx-tab="${id}">${label}</button>`).join('')}</div><button type="button" data-gx-close aria-label="${t('Fechar', 'Close')}">×</button></header>
      <div class="gx-searchbar"><label>${t('Buscar pessoa, lugar ou acontecimento', 'Search a person, place or event')}<input type="search" data-gx-search autocomplete="off" placeholder="${t('Ex.: Davi, Cafarnaum, o dilúvio', 'E.g. David, Capernaum, the flood')}" value="${esc(S.q)}"></label><div class="gx-results" data-gx-results></div></div>
      <div class="gx-body gx-body-${S.tab}">${S.tab === 'map' ? `<aside class="gx-side"><label>${t('Mostrar lugares de', 'Show places from')}<select data-gx-book><option value="0">${t('Toda a Bíblia', 'The whole Bible')}</option>${D.books.map(b => `<option value="${b.id}" ${S.book === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></label><h4>${t('Rotas', 'Journeys')}</h4><div class="gx-chips gx-routes">${D.journeys.map(j => `<button type="button" class="gx-chip" data-gx="j:${esc(j.id)}" aria-pressed="${S.journey === j.id}">${esc(j.title[EN ? 1 : 0])}</button>`).join('') || `<small>${t('Sem rotas ainda.', 'No journeys yet.')}</small>`}</div></aside><div class="gx-map" data-gx-map></div>` : ''}
        ${S.tab === 'time' ? `<div class="gx-timeline"><label>${t('Período', 'Period')}<select data-gx-era><option value="">${t('Todos', 'All')}</option>${ERAS.map(([id, names]) => `<option value="${id}" ${S.era === id ? 'selected' : ''}>${names[EN ? 1 : 0]}</option>`).join('')}</select></label><p class="gx-hint">${t('Datas da cronologia tradicional do conjunto Theographic. Consulte as fontes e compare quando houver incerteza.', 'Dates follow the traditional Theographic chronology. Consult sources and compare where dates remain uncertain.')}</p><ol class="gx-events" data-gx-events></ol></div>` : ''}
        ${S.tab === 'people' ? `<div class="gx-peoplelist"><p class="gx-hint">${t('As pessoas mais citadas da Bíblia. Use a busca acima para achar qualquer uma das 3.068.', 'The most mentioned people in the Bible. Use the search above to find any of the 3,068.')}</p><div class="gx-chips">${D.people.filter(p => p.v >= 25).sort((a, b) => b.v - a.v).slice(0, 80).map(p => chip('p', p.i, name(p), String(p.v))).join('')}</div></div>` : ''}
        <section class="gx-detail" data-gx-detail aria-live="polite"><p class="gx-hint">${t('Escolha um lugar no mapa, uma rota, um acontecimento ou uma pessoa.', 'Pick a place on the map, a journey, an event or a person.')}</p></section></div></div>`;
  }
  function eras() { return ERAS.find(([id]) => id === S.era); }
  function drawEvents() {
    const list = panel.querySelector('[data-gx-events]'); if (!list) return;
    const era = eras();
    const items = D.events.filter(e => e.y !== undefined && (!era || (e.y >= era[2] && e.y < era[3])));
    list.innerHTML = items.map(e => `<li><button type="button" data-gx="e:${e.i}"><time>${esc(span(e.y))}</time><strong>${esc(eventName(e))}</strong><small>${(e.p ?? []).slice(0, 3).map(slug => { const p = D.person.get(slug); return p ? esc(name(p)) : ''; }).filter(Boolean).join(', ')}</small></button></li>`).join('') || `<li class="gx-hint">${t('Nada neste período.', 'Nothing in this period.')}</li>`;
  }
  const LAYER = { dot: '#e5b86e', dim: '#5a5a5a', pick: '#ffffff' };
  function drawMap() {
    const node = panel.querySelector('[data-gx-map]');
    if (map) { map.remove(); map = null; }
    if (!node) return;
    if (typeof L === 'undefined') { node.textContent = t('Mapa interativo indisponível.', 'Interactive map unavailable.'); return; }
    map = L.map(node, { preferCanvas: true, minZoom: 3, maxZoom: 12, scrollWheelZoom: true, worldCopyJump: false });
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', { maxZoom: 13, attribution: 'Tiles © Esri' }).addTo(map);
    map.fitBounds([[24, 8], [42, 52]]);
    layers = { dots: new Map(), journey: L.layerGroup().addTo(map) };
    const inBook = new Set();
    if (S.book) for (const [slug, codes] of Object.entries(D.refs.l)) if (codes.some(code => bookOf(code) === S.book)) inBook.add(slug);
    for (const p of D.places) {
      const on = !S.book || inBook.has(p.i);
      const marker = L.circleMarker([p.la, p.lo], { radius: Math.min(4 + Math.sqrt(p.v) * 0.9, 13), color: '#111', weight: 1, fillColor: on ? LAYER.dot : LAYER.dim, fillOpacity: on ? 0.9 : 0.35 }).addTo(map);
      marker.bindTooltip(esc(name(p)), { direction: 'top' });
      marker.on('click', () => select('l', p.i));
      layers.dots.set(p.i, marker);
    }
    if (S.journey) drawJourney(S.journey, false);
    if (S.kind === 'l') pick(S.id);
    new ResizeObserver(() => map?.invalidateSize()).observe(node);
  }
  function pick(slug) {
    for (const [id, marker] of layers?.dots ?? []) marker.setStyle(id === slug ? { color: '#fff', weight: 3 } : { color: '#111', weight: 1 });
    layers?.dots.get(slug)?.bringToFront();
  }
  function drawJourney(id, fit = true) {
    layers.journey.clearLayers();
    const j = D.journeys.find(item => item.id === id); if (!j || !map) return;
    const points = j.steps.map(step => D.place.get(step.place)).filter(Boolean).map(p => [p.la, p.lo]);
    L.polyline(points, { color: '#ff9f43', weight: 3, opacity: 0.9, dashArray: '8 6' }).addTo(layers.journey);
    j.steps.forEach((step, n) => {
      const p = D.place.get(step.place); if (!p) return;
      L.marker([p.la, p.lo], { icon: L.divIcon({ className: 'gx-num', html: `<span>${n + 1}</span>`, iconSize: [24, 24] }) }).bindTooltip(`${n + 1}. ${esc(name(p))}`, { direction: 'top' }).on('click', () => stepFocus(n)).addTo(layers.journey);
    });
    if (fit && points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 8 });
  }
  function stepFocus(n) {
    const j = D.journeys.find(item => item.id === S.journey); const p = j && D.place.get(j.steps[n]?.place); if (!p) return;
    map?.flyTo([p.la, p.lo], Math.max(map.getZoom(), 7), { duration: 0.6 });
    panel.querySelectorAll('.gx-step').forEach((button, index) => button.classList.toggle('on', index === n));
    panel.querySelectorAll('.gx-step')[n]?.scrollIntoView({ block: 'nearest' });
  }

  async function select(kind, id, { fly = true } = {}) {
    S.kind = kind; S.id = id;
    const box = panel?.querySelector('[data-gx-results]'); if (box) box.innerHTML = '';
    if (kind === 'j') S.journey = id;
    if (kind === 'e' && S.tab === 'people') S.tab = 'time';
    if (!panel || panel.hidden) await open();
    const detail = panel.querySelector('[data-gx-detail]');
    if (kind === 'l') {
      const p = D.place.get(id);
      if (S.tab !== 'map') { S.tab = 'map'; draw(); }
      if (fly && p && map) map.flyTo([p.la, p.lo], Math.max(map.getZoom(), 8), { duration: 0.6 });
      pick(id);
    }
    if (kind === 'j') { if (S.tab !== 'map') { S.tab = 'map'; draw(); } drawJourney(id); panel.querySelectorAll('[data-gx^="j:"]').forEach(button => button.setAttribute('aria-pressed', button.dataset.gx === `j:${id}`)); }
    const target = panel.querySelector('[data-gx-detail]') ?? detail;
    target.innerHTML = `<p class="gx-hint">${t('Carregando…', 'Loading…')}</p>`;
    target.innerHTML = kind === 'l' ? await placeDetail(id) : kind === 'p' ? await personDetail(id) : kind === 'e' ? await eventDetail(id) : journeyDetail(id);
    target.scrollTop = 0;
  }

  function draw() {
    panel.innerHTML = shell();
    if (S.tab === 'map') drawMap();
    if (S.tab === 'time') drawEvents();
  }
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('dialog');
    panel.id = 'graph-panel'; panel.className = 'gx-panel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'gx-title');
    document.body.append(panel);
    panel.addEventListener('click', event => {
      if (event.target.closest('[data-gx-close]')) return close();
      if (event.target.closest('[data-gx-link]')) { if (!event.metaKey && !event.ctrlKey && !event.shiftKey) close(false); return; }
      const tab = event.target.closest('[data-gx-tab]'); if (tab) { S.tab = tab.dataset.gxTab; draw(); return; }
      const step = event.target.closest('[data-gx-step]'); if (step) return stepFocus(Number(step.dataset.gxStep));
      const go = event.target.closest('[data-gx]'); if (go) { const [kind, ...rest] = go.dataset.gx.split(':'); select(kind, rest.join(':')); }
    });
    panel.addEventListener('input', event => {
      if (event.target.matches('[data-gx-search]')) {
        S.q = event.target.value; const box = panel.querySelector('[data-gx-results]');
        box.innerHTML = search(S.q).map(hit => `<button type="button" data-gx="${hit.kind}:${esc(hit.id)}"><small>${esc(KIND[hit.kind][EN ? 1 : 0])}</small><strong>${esc(hit.label)}</strong><span>${esc(hit.note ?? '')}</span></button>`).join('');
      }
    });
    panel.addEventListener('change', event => {
      if (event.target.matches('[data-gx-book]')) { S.book = Number(event.target.value); drawMap(); }
      if (event.target.matches('[data-gx-era]')) { S.era = event.target.value; drawEvents(); }
    });
    panel.addEventListener('cancel', event => { event.preventDefault(); close(); });
    return panel;
  }
  async function open(target) {
    opener = document.activeElement;
    ensurePanel();
    if (!panel.open) panel.showModal();
    document.body.classList.add('gx-open');
    panel.innerHTML = `<div class="gx-shell"><h2 id="gx-title">${t('Atlas e conexões','Atlas and connections')}</h2><p class="gx-hint">${t('Carregando o atlas…', 'Loading the atlas…')}</p><button data-gx-close>${t('Fechar','Close')}</button></div>`;
    try { await load(); }
    catch {
      panel.querySelector('.gx-hint').textContent = t('O atlas está indisponível neste momento.', 'The atlas is currently unavailable.');
      return;
    }
    if (!panel.open) return;
    if (target?.book !== undefined) { S.book = target.book; S.tab = 'map'; }
    if (target?.kind) { S.tab = target.kind === 'e' ? 'time' : 'map'; if (target.kind === 'j') S.journey = target.id; }
    draw();
    if (target?.kind) await select(target.kind, target.id);
    panel.querySelector('[data-gx-search]')?.focus({ preventScroll: true });
  }
  function close(restoreFocus = true) {
    if (!panel?.open) return;
    panel.close(); document.body.classList.remove('gx-open');
    if (map) { map.remove(); map = null; }
    if (restoreFocus && opener?.isConnected) opener.focus({ preventScroll: true });
  }

  // ------- the "who, where, when" of a passage -------
  async function passageHTML(bookId, chapter, from, to) {
    await load();
    const lo = bookId * 1e6 + chapter * 1e3 + from, hi = bookId * 1e6 + chapter * 1e3 + to;
    const within = codes => codes.filter(code => code >= lo && code <= hi);
    const found = (table, build) => Object.entries(table).map(([key, codes]) => ({ key, hits: within(codes).length })).filter(item => item.hits).sort((a, b) => b.hits - a.hits).map(build);
    const people = found(D.refs.p, item => D.person.get(item.key)).filter(Boolean).sort((a, b) => (b.v > 0) - (a.v > 0) || 0);
    const placeList = found(D.refs.l, item => D.place.get(item.key)).filter(Boolean);
    const eventList = found(D.refs.e, item => D.event.get(Number(item.key))).filter(Boolean);
    const years = D.years[bookId]?.[chapter];
    const when = eventList.find(e => e.y !== undefined)?.y ?? years?.[0];
    // Other chapters that share the rarer people, places and events of this passage (the common ones, like God, tell nothing).
    const mine = new Set([`${bookId}:${chapter}`]), link = new Map();
    const tally = (entities, table, label) => entities.forEach(entity => {
      const key = entity.i, codes = table[key] ?? []; if (codes.length > 70) return;
      const weight = 1 / Math.log2(codes.length + 2);
      for (const code of new Set(codes.map(c => `${bookOf(c)}:${chapterOf(c)}`))) {
        if (mine.has(code)) continue;
        const row = link.get(code) ?? link.set(code, { score: 0, names: [] }).get(code);
        row.score += weight; row.names.push(label(entity));
      }
    });
    tally(people, D.refs.p, name); tally(placeList, D.refs.l, name); tally(eventList, D.refs.e, eventName);
    const connected = [...link].sort((a, b) => b[1].score - a[1].score).slice(0, 8);
    if (!people.length && !placeList.length && !eventList.length) return `<p class="gx-hint">${t('Esta passagem não cita pessoas, lugares ou acontecimentos registrados na base.', 'This passage does not mention people, places or events recorded in the data.')}</p>`;
    return `<section class="gx-passage">
      ${when !== undefined ? `<p class="gx-when"><strong>${t('Quando', 'When')}</strong> ${esc(span(years && years[0] !== years[1] ? years[0] : when, years && years[0] !== years[1] ? years[1] : undefined))}</p>` : ''}
      ${eventList.length ? `<h4>${t('O que acontece', 'What happens')}</h4><div class="gx-chips">${eventList.map(e => eventChip(e.i)).join('')}</div>` : ''}
      ${people.length ? `<h4>${t('Quem aparece', 'Who appears')} (${people.length})</h4><div class="gx-chips">${people.slice(0, 24).map(p => personChip(p.i)).join('')}</div>` : ''}
      ${placeList.length ? `<h4>${t('Onde', 'Where')} (${placeList.length})</h4><div class="gx-chips">${placeList.map(p => placeChip(p.i)).join('')}</div>` : ''}
      ${connected.length ? `<h4>${t('Passagens ligadas por pessoas, lugares e acontecimentos', 'Passages linked by people, places and events')}</h4><ul class="gx-linked">${connected.map(([code, row]) => { const [b, c] = code.split(':').map(Number); return `<li><a href="${esc(studyURL(b, c, 1))}" data-notebook-open="${b}.${c}.1" data-gx-link>${esc(bookLabel(b))} ${c}</a> <small>${esc([...new Set(row.names)].slice(0, 4).join(', '))}</small></li>`; }).join('')}</ul>` : ''}
      <button type="button" class="gx-open" data-gx-open-atlas>${t('Abrir no atlas', 'Open in the atlas')}</button></section>`;
  }

  // Places of a whole book, for chapters whose own text names none (psalms, wisdom, letters).
  async function bookPlacesHTML(bookId) {
    await load();
    const top = Object.entries(D.refs.l).map(([slug, codes]) => [slug, codes.filter(code => bookOf(code) === bookId).length]).filter(([, n]) => n).sort((a, b) => b[1] - a[1]).slice(0, 14).map(([slug]) => D.place.get(slug)).filter(Boolean);
    if (!top.length) return `<p class="gx-hint">${t('Este livro não cita lugares com coordenadas.', 'This book names no places with coordinates.')}</p>`;
    return `<section class="gx-passage"><h4>${t('Lugares deste livro', 'Places in this book')}</h4><div class="gx-chips">${top.map(p => placeChip(p.i)).join('')}</div><button type="button" class="gx-open" data-gx-open-atlas data-gx-book="${bookId}">${t('Ver no atlas', 'See on the atlas')}</button></section>`;
  }

  // ------- names found inside free text (used by the notes) -------
  let nameIndex = null;
  function nameTable() {
    if (nameIndex) return nameIndex;
    nameIndex = [];
    const add = (kind, item, label) => { const clean = norm(plainName(label)).replace(/[^a-z0-9 ]/g, '').trim(); if (clean.length >= 4) nameIndex.push({ kind, id: item.i, key: clean, v: item.v ?? 0, label }); };
    for (const p of D.people) if (p.v >= 3) { add('p', p, p.n); if (p.pt) add('p', p, p.pt); }
    for (const p of D.places) if (p.v >= 3) { add('l', p, p.n); if (p.pt) add('l', p, p.pt); }
    nameIndex.sort((a, b) => b.key.length - a.key.length || b.v - a.v);
    return nameIndex;
  }
  function entitiesIn(text) {
    if (!D) return { people: [], places: [] };
    const hay = ` ${norm(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ')} `;
    const seen = new Map();
    for (const entry of nameTable()) {
      if (!hay.includes(` ${entry.key} `)) continue;
      const mark = `${entry.kind}:${entry.key}`;
      if (!seen.has(mark) || seen.get(mark).v < entry.v) seen.set(mark, entry);
    }
    const hits = [...seen.values()].sort((a, b) => b.v - a.v);
    return { people: hits.filter(item => item.kind === 'p').slice(0, 12).map(item => D.person.get(item.id)), places: hits.filter(item => item.kind === 'l').slice(0, 12).map(item => D.place.get(item.id)) };
  }

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-gx-launch]');
    if (target) { event.preventDefault(); open(); return; }
    // Chips shown outside the panel (study view, notes) open the atlas on that person, place or event.
    const outside = !panel?.contains(event.target) && event.target.closest('[data-gx]');
    if (outside) { event.preventDefault(); const [kind, ...rest] = outside.dataset.gx.split(':'); open({ kind, id: rest.join(':') }); return; }
    const atlas = event.target.closest('[data-gx-open-atlas]');
    if (atlas) { event.preventDefault(); open(atlas.dataset.gxBook ? { book: Number(atlas.dataset.gxBook) } : undefined); }
  });

  window.PoiemaGraph = { open, close, load, find: async query => { await load(); return search(query); }, passageHTML, bookPlacesHTML, entitiesIn, get loaded() { return Boolean(D); }, name: item => (item ? name(item) : ''), chip, personChip, placeChip, eventChip };
})();
