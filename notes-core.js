// Reads a free-form note and finds what it is about, with no network and no AI:
// Bible references, themes, related passages from the study library, open questions
// and things to put into practice. The same file runs in the browser (notes.js) and in
// Node (the build of the passage index and the tests), so both sides stem words alike.
(() => {
  const STOP = new Set(('a o as os um uma uns umas de do da dos das em no na nos nas por para com sem sob sobre entre ate desde ao aos pelo pela pelos pelas e ou mas que se como quando onde quem qual quais ' +
    'foi era ser sao estar esta estao tem ter tinha mais menos muito muita muitos muitas ja nao sim so tambem ainda esse essa esses essas este esta estes estas isso isto aquele aquela eu tu ele ela nos eles elas meu minha seu sua ' +
    'the a an of to in on at by for with from and or but that this these those is are was were be been being it its as not no so if then than also have has had do does did will would can could should may might i you he she we they me my your his her our their ' +
    'who whom which what when where why how all any each every both more most other some such only own same very just about into over after before between through during against').split(/\s+/));
  const strip = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const normalize = text => strip(text).toLowerCase();
  // Crude on purpose: both the note and the index go through it, so they meet in the middle.
  const SUFFIXES = ['issimos', 'issimo', 'mente', 'coes', 'cao', 'ations', 'ation', 'ings', 'ing', 'ness', 'ments', 'ment', 'ities', 'ity', 'idades', 'idade', 'ando', 'endo', 'indo', 'aram', 'eram', 'iram', 'ados', 'adas', 'idos', 'idas', 'ado', 'ada', 'ido', 'ida', 'amos', 'emos', 'avam', 'iam', 'ava', 'ous', 'ers', 'er', 'ed', 'ly', 'es', 'as', 'os', 'ar', 'ir', 's', 'a', 'o'];
  function stem(word) {
    let w = normalize(word).replace(/[^a-z0-9]/g, '');
    if (w.length <= 4) return w;
    for (const suffix of SUFFIXES) if (w.length - suffix.length >= 4 && w.endsWith(suffix)) { w = w.slice(0, -suffix.length); break; }
    return w;
  }
  function tokens(text) {
    return normalize(text).split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP.has(word) && !/^\d+$/.test(word)).map(stem).filter(word => word.length > 2);
  }

  // Stem -> the word as the writer typed it, so the screen shows "perdoar", not "perdo".
  function spelled(text) {
    const map = new Map();
    for (const match of String(text ?? '').matchAll(/[\p{L}\d]+/gu)) {
      const plain = normalize(match[0]);
      if (plain.length <= 2 || STOP.has(plain) || /^\d+$/.test(plain)) continue;
      const root = stem(match[0]);
      if (root.length > 2 && !map.has(root)) map.set(root, match[0].toLowerCase());
    }
    return map;
  }

  // Themes the library speaks about. Words are written in Portuguese and English and stemmed on load.
  const THEME_DEFS = [
    ['faith', ['Fé', 'Faith'], 'fé crer crença confiar confiança faith believe belief trust'],
    ['grace', ['Graça', 'Grace'], 'graça favor grace favour'],
    ['forgiveness', ['Perdão', 'Forgiveness'], 'perdão perdoar perdoado forgive forgiveness pardon'],
    ['prayer', ['Oração', 'Prayer'], 'oração orar interceder súplica prayer pray intercede'],
    ['hope', ['Esperança', 'Hope'], 'esperança esperar hope'],
    ['suffering', ['Sofrimento', 'Suffering'], 'sofrimento sofrer dor aflição tribulação provação suffering affliction trial pain'],
    ['fear', ['Medo e ansiedade', 'Fear and anxiety'], 'medo temor ansiedade angústia afobação preocupação fear afraid anxiety anxious worry'],
    ['love', ['Amor', 'Love'], 'amor amar amado amizade love loved friendship'],
    ['justice', ['Justiça', 'Justice'], 'justiça justo juízo injustiça justice righteous judgment injustice'],
    ['repentance', ['Arrependimento', 'Repentance'], 'arrepender arrependimento converter conversão repent repentance conversion'],
    ['wisdom', ['Sabedoria', 'Wisdom'], 'sabedoria sábio prudência insensato wisdom wise folly fool'],
    ['covenant', ['Aliança', 'Covenant'], 'aliança pacto covenant'],
    ['kingdom', ['Reino', 'Kingdom'], 'reino rei reinar kingdom king reign'],
    ['spirit', ['Espírito Santo', 'Holy Spirit'], 'espírito consolador paráclito spirit comforter advocate'],
    ['church', ['Igreja e comunhão', 'Church and fellowship'], 'igreja comunhão congregação irmãos church fellowship congregation'],
    ['family', ['Família', 'Family'], 'família casamento filhos pais marido esposa casal family marriage children husband wife parents'],
    ['work', ['Trabalho e vocação', 'Work and calling'], 'trabalho trabalhar vocação chamado ofício work labor calling vocation'],
    ['money', ['Dinheiro e pobreza', 'Money and poverty'], 'dinheiro riqueza dízimo pobre pobreza esmola riches money wealth poor poverty tithe'],
    ['worship', ['Adoração', 'Worship'], 'adoração adorar louvor culto louvar worship praise'],
    ['truth', ['Verdade e mentira', 'Truth and lies'], 'verdade mentira falso engano truth lie false deceit'],
    ['peace', ['Paz e descanso', 'Peace and rest'], 'paz descanso sábado peace rest sabbath'],
    ['joy', ['Alegria', 'Joy'], 'alegria gozo regozijar alegrar joy rejoice'],
    ['anger', ['Ira', 'Anger'], 'ira raiva furor anger wrath'],
    ['humility', ['Humildade e orgulho', 'Humility and pride'], 'humildade humilde orgulho soberba arrogância humble humility pride arrogance'],
    ['mercy', ['Misericórdia', 'Mercy'], 'misericórdia compaixão mercy compassion'],
    ['resurrection', ['Ressurreição', 'Resurrection'], 'ressurreição ressuscitar ressuscitou resurrection raised'],
    ['cross', ['Cruz e sacrifício', 'Cross and sacrifice'], 'cruz sacrifício oferta expiação cordeiro cross sacrifice offering atonement lamb'],
    ['promise', ['Promessa', 'Promise'], 'promessa prometer promise'],
    ['exile', ['Exílio', 'Exile'], 'exílio cativeiro deportação exile captivity'],
    ['shepherd', ['Pastor e rebanho', 'Shepherd and flock'], 'pastor ovelha ovelhas rebanho shepherd sheep flock'],
    ['light', ['Luz e trevas', 'Light and darkness'], 'luz trevas escuridão light darkness'],
    ['life', ['Vida eterna', 'Eternal life'], 'eterno eterna salvação salvar salvo eternal salvation save saved'],
    ['obedience', ['Obediência e lei', 'Obedience and law'], 'obediência obedecer mandamento lei mandamentos obey obedience commandment law'],
    ['sin', ['Pecado e tentação', 'Sin and temptation'], 'pecado pecar tentação culpa sin sinner temptation guilt'],
    ['death', ['Morte e luto', 'Death and grief'], 'morte morrer luto funeral sepultura death die grief mourning grave'],
    ['mission', ['Missão e testemunho', 'Mission and witness'], 'missão evangelho anunciar testemunho discípulo gospel mission witness disciple'],
    ['creation', ['Criação', 'Creation'], 'criação criar criador creation create creator'],
    ['gratitude', ['Gratidão', 'Gratitude'], 'gratidão agradecer thanks thanksgiving grateful'],
  ].map(([id, names, words]) => ({ id, names, stems: [...new Set(words.split(/\s+/).map(stem).filter(Boolean))] }));

  // Book abbreviations in Portuguese and English (accents removed, lower case). Names come from the book list.
  const ABBREVIATIONS = {
    1: 'gn gen', 2: 'ex exo exod', 3: 'lv lev', 4: 'nm num', 5: 'dt deut', 6: 'js jos josh', 7: 'jz jui judg', 8: 'rt rut', 9: '1sm 1sa 1sam', 10: '2sm 2sa 2sam',
    11: '1rs 1ki 1kgs', 12: '2rs 2ki 2kgs', 13: '1cr 1ch 1chr', 14: '2cr 2ch 2chr', 15: 'ed esd', 16: 'ne neh', 17: 'et est esth', 18: 'jo job', 19: 'sl sal ps psa psalm salmo salmos psalms',
    20: 'pv pr prov', 21: 'ec ecl eccl', 22: 'ct cant song sos', 23: 'is isa', 24: 'jr jer', 25: 'lm lam', 26: 'ez eze ezek', 27: 'dn dan', 28: 'os hos', 29: 'jl joe', 30: 'am',
    31: 'ob abd obad', 32: 'jn jon', 33: 'mq mic', 34: 'na nah', 35: 'hc hab', 36: 'sf sof zep zeph', 37: 'ag hag', 38: 'zc zac zec zech', 39: 'ml mal',
    40: 'mt mat matt', 41: 'mc mar mk', 42: 'lc luc lk', 43: 'jo joa jn joao john', 44: 'at act', 45: 'rm rom', 46: '1co 1cor', 47: '2co 2cor', 48: 'gl gal', 49: 'ef eph', 50: 'fp fil phil',
    51: 'cl col', 52: '1ts 1th 1thess', 53: '2ts 2th 2thess', 54: '1tm 1ti 1tim', 55: '2tm 2ti 2tim', 56: 'tt tit', 57: 'fm flm phlm', 58: 'hb heb', 59: 'tg tia jas', 60: '1pe 1pet', 61: '2pe 2pet',
    62: '1jo 1jn 1joao 1john', 63: '2jo 2jn 2joao 2john', 64: '3jo 3jn 3joao 3john', 65: 'jd jud jude', 66: 'ap apo rev',
  };
  const compact = text => normalize(text).replace(/[^a-z0-9]/g, '');

  // aliases: compact name -> book id. "jó" (with the accent) is Job, a bare "jo" is John.
  function bookAliases(lists) {
    const map = new Map();
    for (const list of lists) for (const item of list) {
      map.set(compact(item.name), item.id);
      map.set(compact(item.slug), item.id);
    }
    for (const [id, words] of Object.entries(ABBREVIATIONS)) for (const word of words.split(' ')) if (!map.has(word)) map.set(word, Number(id));
    map.set('jo', 43); map.set('jó', 18); map.set('job', 18); map.set('jonas', 32); map.set('jonah', 32);
    for (const [name, id] of [['salmo', 19], ['salmos', 19], ['cantares', 22], ['cantico', 22], ['canticos', 22], ['apocalipse', 66], ['revelacao', 66], ['atos', 44]]) map.set(name, id);
    return map;
  }
  const REFERENCE = /(?<![\p{L}\d])((?:[1-3]\s?|i{1,3}\s)?[\p{L}]{2,}\.?(?:\s(?:de|of)\s[\p{L}]{3,})?)\s?(\d{1,3})(?:\s?[:.,v]\s?(\d{1,3})(?:\s?[-–—]\s?(\d{1,3}))?)?(?![\d])/giu;
  function findReferences(text, aliases, books) {
    const found = [], seen = new Set();
    for (const match of String(text ?? '').matchAll(REFERENCE)) {
      const label = match[1].trim().replace(/\.$/, '');
      const raw = label.toLowerCase().replace(/\s+/g, '').replace(/^i{1,3}/, value => String(value.length)).replace(/\./g, '');
      let id = aliases.get(raw) ?? aliases.get(compact(raw));
      // "Estudo de João 3:16": the label may start with words that are not part of the book name.
      const words = label.split(/\s+/);
      for (let from = 1; !id && from < words.length; from++) id = aliases.get(compact(words.slice(from).join('')));
      if (!id && words.length > 1) id = aliases.get(compact(words[0])) ?? aliases.get(compact(words.slice(0, 2).join('')));
      const book = books.find(item => item.id === id);
      const chapter = Number(match[2]);
      if (!book || chapter < 1 || chapter > book.chapters) continue;
      const from = match[3] ? Number(match[3]) : undefined, to = match[4] ? Number(match[4]) : from;
      if (from && (from > 176 || (to && to < from))) continue;
      const mark = `${id}:${chapter}:${from ?? 0}-${to ?? 0}`;
      if (seen.has(mark)) continue;
      seen.add(mark);
      found.push({ bookId: id, chapter, from, to, raw: match[0].trim() });
    }
    return found;
  }

  const idfOf = index => {
    const counts = new Map();
    for (const part of index.parts) for (const word of new Set(part[5])) counts.set(word, (counts.get(word) ?? 0) + 1);
    const total = index.parts.length;
    return word => Math.log(1 + total / (1 + (counts.get(word) ?? 0)));
  };
  function rank(wordWeights, index, idf, exclude = new Set(), limit = 8) {
    const scored = [];
    for (const part of index.parts) {
      const [bookId, chapter, from, to, title, words] = part;
      let score = 0;
      const shared = [];
      for (const word of words) { const weight = wordWeights.get(word); if (weight) { score += weight * idf(word); shared.push(word); } }
      if (!shared.length) continue;
      for (const word of tokens(title)) if (wordWeights.has(word)) score += wordWeights.get(word) * idf(word) * 0.5;
      scored.push({ bookId, chapter, from, to, title, score: score / Math.sqrt(words.length + 4), shared });
    }
    scored.sort((a, b) => b.score - a.score);
    const out = [], chapters = new Set(exclude);
    for (const item of scored) {
      const mark = `${item.bookId}:${item.chapter}`;
      if (chapters.has(mark)) continue;
      chapters.add(mark); out.push(item);
      if (out.length >= limit) break;
    }
    return out;
  }

  const sentencesOf = text => String(text ?? '').split(/(?<=[.!?])\s+|\n+/).map(line => line.trim()).filter(Boolean);
  function analyze(text, { books = [], extraBooks = [], index = null, language = 'pt' } = {}) {
    const clean = String(text ?? '').trim();
    const result = { words: clean ? clean.split(/\s+/).length : 0, refs: [], themes: [], related: [], questions: [], todos: [], summary: [] };
    if (!clean) return result;
    const aliases = bookAliases([books, extraBooks]);
    result.refs = findReferences(clean, aliases, books);
    // Reference text would otherwise count as vocabulary ("João", "3").
    const body = result.refs.reduce((value, item) => value.replace(item.raw, ' '), clean);
    const counts = new Map();
    for (const word of tokens(body)) counts.set(word, (counts.get(word) ?? 0) + 1);
    const shown = spelled(body);
    const cited = new Set(result.refs.map(item => `${item.bookId}:${item.chapter}`));
    const idf = index ? idfOf(index) : () => 1;
    const bestWeights = new Map([...counts].map(([word, count]) => [word, 1 + Math.log(count)]));
    for (const theme of THEME_DEFS) {
      const hits = theme.stems.filter(word => counts.has(word));
      if (!hits.length) continue;
      const score = hits.reduce((sum, word) => sum + 1 + Math.log(counts.get(word)), 0);
      const weights = new Map(theme.stems.map(word => [word, 1]));
      result.themes.push({ id: theme.id, name: theme.names[language === 'en' ? 1 : 0], score, words: hits.map(word => shown.get(word) ?? word), passages: index ? rank(weights, index, idf, cited, 3) : [] });
    }
    result.themes.sort((a, b) => b.score - a.score);
    result.themes = result.themes.slice(0, 6);
    if (index) {
      const used = new Set([...cited, ...result.themes.flatMap(theme => theme.passages.map(item => `${item.bookId}:${item.chapter}`))]);
      result.related = rank(bestWeights, index, idf, used, 6).filter(item => item.shared.length >= 2).map(item => ({ ...item, shared: item.shared.map(word => shown.get(word) ?? word) }));
    }
    const lines = sentencesOf(clean);
    result.questions = lines.filter(line => /\?\s*$/.test(line)).slice(0, 6);
    // A line starting like a checklist item, or any sentence that states something to do.
    const TODO = /^(?:[-*•]\s*)?\[\s?\]|^(?:todo|tarefa)\b|\b(?:preciso|precisamos|devo|lembrar de|orar por|fazer|ligar para|pedir perdão|pray for|remember to|i need to|i must|need to|call)\b/i;
    result.todos = lines.filter(line => TODO.test(line) && !/\?\s*$/.test(line)).map(line => line.replace(/^(?:[-*•]\s*)?(?:\[\s?\]\s*)?/, '')).slice(0, 6);
    if (lines.length >= 4) {
      const scored = lines.map((line, position) => ({ line, position, score: tokens(line).reduce((sum, word) => sum + (counts.get(word) ?? 0), 0) / Math.sqrt(tokens(line).length + 3) }));
      result.summary = scored.sort((a, b) => b.score - a.score).slice(0, 3).sort((a, b) => a.position - b.position).map(item => item.line);
    }
    return result;
  }

  const api = { normalize, stem, tokens, THEME_DEFS, bookAliases, findReferences, analyze, rank, idfOf };
  (typeof globalThis !== 'undefined' ? globalThis : window).PoiemaNotesCore = api;
})();
