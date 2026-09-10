// Rule-based question answering for the on-site chat widget — no LLM call,
// just keyword overlap scoring against a neighborhood's own public vendor
// list and Community Info entries. Deliberately simple: a fixed, small set
// of resident questions (garbage day, security contact, "who does X") don't
// need anything fancier, and this has zero per-message cost.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'did', 'my', 'when', 'where',
  'who', 'what', 'how', 'i', 'need', 'have', 'has', 'for', 'of', 'to', 'on',
  'in', 'that', 'this', 'with', 'can', 'you', 'me', 'please', 'there', 'any',
  'get', 'know', 'about', 'anyone', 'someone', 'here', 'be', 'it', 'we', 'our',
  // Spanish — this app is fully bilingual, and residents ask in either
  // language, so common Spanish question words get the same stopword
  // treatment as their English counterparts.
  'hay', 'un', 'una', 'unos', 'unas', 'el', 'la', 'los', 'las', 'de', 'del',
  'quien', 'quién', 'donde', 'dónde', 'cuando', 'cuándo', 'que', 'qué', 'para',
  'puedo', 'necesito', 'hacer', 'hola', 'por', 'como', 'cómo', 'contacto',
])

// Colloquial terms residents actually type (English and Spanish), mapped to
// the words that show up in the app's own category names and Community Info
// content — which are stored in English regardless of which language a
// resident asks in.
const SYNONYMS = {
  trash: 'garbage', basura: 'garbage',
  recycle: 'recycling', recyclable: 'recycling', recyclables: 'recycling',
  reciclaje: 'recycling', reciclar: 'recycling', reciclable: 'recycling',
  yard: 'landscaping', lawn: 'landscaping', landscaper: 'landscaping', gardener: 'landscaping', mowing: 'landscaping',
  jardinero: 'landscaping', jardineria: 'landscaping', jardin: 'landscaping', cesped: 'landscaping',
  guard: 'security', gate: 'security', seguridad: 'security', guardia: 'security', porton: 'security',
  hoa: 'association', management: 'association', administracion: 'association', gerencia: 'association',
  plumber: 'plumbing', leak: 'plumbing', leaking: 'plumbing', leaks: 'plumbing', dripping: 'plumbing', clogged: 'plumbing',
  plomero: 'plumbing', plomeria: 'plumbing', fuga: 'plumbing', goteando: 'plumbing',
  // "roof" maps separately (not folded into "leak") so "roof leak" produces
  // both a plumbing and a roofing token and the two trades tie rather than
  // Plumbing winning outright on "leak" alone — a defensible ambiguity
  // between two adjacent trades, not a guaranteed-wrong answer.
  roof: 'roofing', techo: 'roofing',
  electrician: 'electrical', electricista: 'electrical',
  bug: 'pest', bugs: 'pest', pests: 'pest', plagas: 'pest', insectos: 'pest',
  mosquitoes: 'mosquito', mosquitos: 'mosquito',
  cleaner: 'cleaning', clean: 'cleaning', limpieza: 'cleaning', limpiador: 'cleaning',
  bulky: 'bulk', voluminoso: 'bulk', voluminosos: 'bulk',
  car: 'auto', vehicle: 'auto', carro: 'auto', coche: 'auto', auto: 'auto',
  uber: 'rideshare', lyft: 'rideshare', taxi: 'rideshare',
  tutor: 'tutoring', tutors: 'tutoring',
  notario: 'notary', notaria: 'notary',
  abogado: 'legal', lawyer: 'legal',
  // NOT "unas: 'nails'" — after diacritics are stripped, "uñas" (nails)
  // and "unas" (some, a very common word) become the identical token, so
  // mapping it would wrongly inject "nails" into unrelated queries.
  nail: 'nails', manicure: 'nails', manicura: 'nails',
}

// Diacritics are stripped before matching (á → a) so "jardinería"/"jardineria"
// and "cuándo"/"cuando" hit the same token — residents won't reliably type
// accents on a phone keyboard, and the app's own data is inconsistent too.
function stripDiacritics(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function tokenize(text) {
  return stripDiacritics(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SYNONYMS[w] || w)
    .filter((w) => !STOPWORDS.has(w))
}

function overlapScore(queryTokens, docTokens, weight = 1) {
  const docSet = new Set(docTokens)
  return queryTokens.reduce((sum, t) => sum + (docSet.has(t) ? weight : 0), 0)
}

// A vendor category name or an item's title/subsection is a strong, specific
// topical signal ("Landscaping", "Garbage Collection") — a stray word buried
// in a long notes/body field is a much weaker one. Without this weighting, a
// generic word like "day" inside an unrelated FAQ's body could outscore the
// actually-relevant entry just because that entry's real content lives in
// its title rather than a wordy body.
const TITLE_WEIGHT = 3
const SUBSECTION_WEIGHT = 2
const BODY_WEIGHT = 0.5
// Same weight as an info item's title — a bare keyword match can't tell
// "security" (a vendor trade) from "security" (the community's own gate/
// dispatch contact) apart on its own, so on an unresolved tie we fall back
// to preferring the info item (see VENDOR_INTENT_RE below for the case where
// the phrasing itself resolves it).
const CATEGORY_WEIGHT = TITLE_WEIGHT

// "Is there a landscaper" / "do you know a plumber" is unambiguously asking
// to find a vendor — worth detecting explicitly, because otherwise a vendor
// category match ties against an unrelated info item sharing the same one
// word (a governance FAQ that also mentions "landscaping" reads the same as
// the actual Landscaping category on keyword overlap alone).
const VENDOR_INTENT_RE = /\b(is there|are there|do you have|know (?:a|an|any)|looking for|need (?:a|an)|recommend|who does|hay (?:un|una|algun|alguna)|conoces?|conocen|sabes? de|necesito (?:un|una)|busco|buscando)\b/

// A message that sounds like an active emergency must never get a cheerful
// vendor recommendation (this genuinely happened during testing: "HELP MY
// HOUSE IS ON FIRE" matched the House Cleaning category on the word
// "house"). Checked before anything else, and short-circuits normal
// scoring entirely rather than just being another candidate to score.
const EMERGENCY_RE = /\b(fire|911|emergency|urgent|ambulance|help me|emergencia|incendio|ayuda)\b/

// Returns { type: 'emergency', items } | { type: 'info', item } | { type: 'vendors', category, vendors } | null
export function answerQuestion(query, { vendors, infoItems }) {
  if (EMERGENCY_RE.test(stripDiacritics((query || '').toLowerCase()))) {
    return { type: 'emergency', items: (infoItems || []).filter((i) => i.section === 'emergency') }
  }

  const qTokens = tokenize(query)
  if (qTokens.length === 0) return null

  let bestInfo = null
  for (const item of infoItems || []) {
    const score =
      overlapScore(qTokens, tokenize(item.title), TITLE_WEIGHT) +
      overlapScore(qTokens, tokenize(item.subsection), SUBSECTION_WEIGHT) +
      overlapScore(qTokens, tokenize(item.body), BODY_WEIGHT)
    if (score > 0 && (!bestInfo || score > bestInfo.score)) bestInfo = { score, type: 'info', item }
  }

  const categoryVendors = {}
  for (const v of vendors || []) {
    for (const c of v.categories || []) {
      if (!categoryVendors[c]) categoryVendors[c] = []
      categoryVendors[c].push(v)
    }
  }
  let bestCategory = null
  for (const [category, vs] of Object.entries(categoryVendors)) {
    const score = overlapScore(qTokens, tokenize(category), CATEGORY_WEIGHT)
    if (score > 0 && (!bestCategory || score > bestCategory.score)) {
      bestCategory = { score, type: 'vendors', category, vendors: vs }
    }
  }

  let best
  if (bestCategory && VENDOR_INTENT_RE.test(stripDiacritics(query.toLowerCase()))) {
    best = bestCategory
  } else if (bestInfo && bestCategory) {
    best = bestInfo.score >= bestCategory.score ? bestInfo : bestCategory
  } else {
    best = bestInfo || bestCategory
  }

  if (!best || best.score < TITLE_WEIGHT) return null
  return best
}
