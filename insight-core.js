// Pure helpers behind the reading journey and the in-text connections (public/insight.js):
// reading progress and streaks, finding the names of people and places inside a verse, and ranking
// verse search hits. No DOM and no storage here, so Node runs the same code in the tests.
(() => {
  // Same length as the input, lower case, accents removed: indexes map back to the original text.
  const flat = text => Array.from(String(text ?? '').normalize('NFC'), char => (char.normalize('NFD')[0] || char).toLowerCase()).join('');
  const isWord = char => /[\p{L}\p{N}]/u.test(char || '');
  const plain = name => String(name ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  // Words that start a longer name but are not a name on their own ("Son of God", "Rei Davi", "Holy Spirit").
  const GENERIC = new Set(['king', 'queen', 'rei', 'rainha', 'the', 'monte', 'mount', 'mar', 'sea', 'rio', 'river', 'vale', 'valley', 'casa', 'house', 'filho', 'son', 'pharaoh', 'farao', 'god', 'deus', 'lord', 'senhor', 'holy', 'father', 'pai', 'saint', 'santo']);

  // What can be searched for in a verse to find this entity: its names without the parenthetical
  // distinguisher, its aliases, and for people the first word of a longer name ("João Batista" → "João").
  function nameForms(entity, kind) {
    const forms = new Set();
    const own = [entity.pt, entity.n];
    for (const raw of [...own, ...(entity.al ?? [])]) {
      const name = plain(raw);
      if (name.length < 3 || GENERIC.has(flat(name))) continue;
      forms.add(name);
      const words = name.split(' ');
      if (kind === 'p' && own.includes(raw) && words.length > 1 && words[0].length >= 4 && !GENERIC.has(flat(words[0]))) forms.add(words[0]);
    }
    return [...forms].sort((a, b) => b.length - a.length);
  }

  // entities: [{kind, id, forms: [...]}]. Returns the text cut into segments; a segment with an id is a name.
  // A name only counts where the text writes it as a proper noun (capital first letter) and as whole words.
  function markNames(text, entities) {
    const source = String(text ?? '').normalize('NFC'), hay = flat(source), found = [];
    const taken = new Array(source.length).fill(false);
    const candidates = entities.flatMap(entity => entity.forms.map(form => ({ entity, needle: flat(form) }))).sort((a, b) => b.needle.length - a.needle.length);
    for (const { entity, needle } of candidates) {
      if (!needle) continue;
      for (let at = hay.indexOf(needle); at >= 0; at = hay.indexOf(needle, at + 1)) {
        const end = at + needle.length;
        if (isWord(hay[at - 1]) || isWord(hay[end])) continue;
        if (source[at] === source[at].toLowerCase() && source[at] !== source[at].toUpperCase()) continue;
        if (taken.slice(at, end).some(Boolean)) continue;
        taken.fill(true, at, end);
        found.push({ at, end, kind: entity.kind, id: entity.id });
      }
    }
    found.sort((a, b) => a.at - b.at);
    const segments = [];
    let cursor = 0;
    for (const hit of found) {
      if (hit.at > cursor) segments.push({ text: source.slice(cursor, hit.at) });
      segments.push({ text: source.slice(hit.at, hit.end), kind: hit.kind, id: hit.id });
      cursor = hit.end;
    }
    if (cursor < source.length) segments.push({ text: source.slice(cursor) });
    return segments;
  }

  const dayStamp = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  // Consecutive reading days ending today, or yesterday (today may still be read).
  function streak(days, today = new Date()) {
    const set = new Set(days);
    const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!set.has(dayStamp(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (set.has(dayStamp(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
    return count;
  }

  // chapters: {"43:3": timestamp}. books: [{id, chapters}].
  function progressStats(chapters, books) {
    const perBook = new Map();
    for (const key of Object.keys(chapters ?? {})) {
      const [bookId, chapter] = key.split(':').map(Number);
      const book = books.find(item => item.id === bookId);
      if (!book || !Number.isInteger(chapter) || chapter < 1 || chapter > book.chapters) continue;
      perBook.set(bookId, (perBook.get(bookId) ?? 0) + 1);
    }
    const total = books.reduce((sum, book) => sum + book.chapters, 0);
    const read = [...perBook.values()].reduce((sum, count) => sum + count, 0);
    return {
      read, total, percent: total ? Math.round((read / total) * 1000) / 10 : 0,
      started: perBook.size, finished: books.filter(book => perBook.get(book.id) === book.chapters).length,
      perBook,
    };
  }
  // The first chapter not yet read after the given one, inside the same book, else the next book's first.
  function nextUnread(chapters, books, bookId, chapter) {
    const book = books.find(item => item.id === bookId);
    if (!book) return null;
    for (let c = chapter + 1; c <= book.chapters; c++) if (!chapters?.[`${bookId}:${c}`]) return { bookId, chapter: c };
    for (let c = 1; c < chapter; c++) if (!chapters?.[`${bookId}:${c}`]) return { bookId, chapter: c };
    const next = books.find(item => item.id === bookId + 1);
    return next ? { bookId: next.id, chapter: 1 } : null;
  }

  // Verse hits [{ref, line}] for a query: the phrase near the start of a short verse reads as "about" the query.
  function rankVerses(hits, query) {
    const needle = flat(query).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return hits.map((hit, order) => {
      const hay = flat(hit.line).replace(/[^\p{L}\p{N}]+/gu, ' ');
      const at = hay.indexOf(needle);
      const times = needle ? hay.split(needle).length - 1 : 0;
      const score = times * 2 + 60 / (hay.length + 40) + (at >= 0 ? 1 - at / (hay.length + 1) : 0);
      return { ...hit, score, order };
    }).sort((a, b) => b.score - a.score || a.order - b.order);
  }

  const api = { flat, plain, nameForms, markNames, dayStamp, streak, progressStats, nextUnread, rankVerses };
  (typeof globalThis !== 'undefined' ? globalThis : window).PoiemaInsightCore = api;
})();
