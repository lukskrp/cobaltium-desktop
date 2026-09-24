import type { InflectionEngine, InflectionParadigm, ParadigmKind, ParadigmRow, ParadigmTable } from '../inflection'

interface HindiVerb {
  stem: string
  presentBase: string
  past: string[]
  imperative: string[]
  futureMasc?: string[] | null
}

const PERSONS = ['मैं', 'तुम', 'वह', 'हम', 'आप', 'वे']
const PRESENT_AUX = ['हूँ', 'हो', 'है', 'हैं', 'हैं', 'हैं']
const PAST_LABELS = [
  'पुल्लिंग एकवचन',
  'पुल्लिंग बहुवचन',
  'स्त्रीलिंग एकवचन',
  'स्त्रीलिंग बहुवचन'
]
const IMPERATIVE_LABELS = ['तू', 'तुम', 'आप']

const VOWEL_FINAL = 'आईईओऊएऐऔाीेोू'

const FEMININE_CONSONANT: Set<string> = new Set([
  'किताब',
  'रात',
  'बात',
  'दुकान',
  'सड़क',
  'दीवार',
  'मेज़',
  'कमीज़',
  'ट्रेन',
  'बस'
])

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

const VERBS: Map<string, HindiVerb> = new Map([
  ['जाना', { stem: 'जा', presentBase: 'जाता', past: ['गया', 'गए', 'गई', 'गईं'], imperative: ['जा', 'जाओ', 'जाइए'] }],
  [
    'होना',
    {
      stem: 'हो',
      presentBase: 'होता',
      past: ['हुआ', 'हुए', 'हुई', 'हुईं'],
      imperative: ['हो', 'हों', 'हों'],
      futureMasc: ['हूँगा', 'होगे', 'होगा', 'होंगे', 'होंगे', 'होंगे']
    }
  ],
  ['आना', { stem: 'आ', presentBase: 'आता', past: ['आया', 'आए', 'आई', 'आईं'], imperative: ['आ', 'आओ', 'आइए'] }],
  [
    'करना',
    { stem: 'कर', presentBase: 'करता', past: ['किया', 'किए', 'की', 'कीं'], imperative: ['कर', 'करो', 'कीजिए'] }
  ],
  [
    'देना',
    {
      stem: 'दे',
      presentBase: 'देता',
      past: ['दिया', 'दिए', 'दी', 'दीं'],
      imperative: ['दे', 'दो', 'दीजिए'],
      futureMasc: ['दूँगा', 'दोगे', 'देगा', 'देंगे', 'देंगे', 'देंगे']
    }
  ],
  [
    'लेना',
    {
      stem: 'ले',
      presentBase: 'लेता',
      past: ['लिया', 'लिए', 'ली', 'लीं'],
      imperative: ['ले', 'लो', 'लीजिए'],
      futureMasc: ['लूँगा', 'लोगे', 'लेगा', 'लेंगे', 'लेंगे', 'लेंगे']
    }
  ],
  ['खाना', { stem: 'खा', presentBase: 'खाता', past: ['खाया', 'खाए', 'खाई', 'खाईं'], imperative: ['खा', 'खाओ', 'खाइए'] }],
  ['पीना', { stem: 'पी', presentBase: 'पीता', past: ['पिया', 'पिए', 'पी', 'पीं'], imperative: ['पी', 'पीओ', 'पीजिए'] }],
  [
    'बोलना',
    {
      stem: 'बोल',
      presentBase: 'बोलता',
      past: ['बोला', 'बोले', 'बोली', 'बोलीं'],
      imperative: ['बोल', 'बोलो', 'बोलिए']
    }
  ],
  [
    'पढ़ना',
    {
      stem: 'पढ़',
      presentBase: 'पढ़ता',
      past: ['पढ़ा', 'पढ़े', 'पढ़ी', 'पढ़ीं'],
      imperative: ['पढ़', 'पढ़ो', 'पढ़िए']
    }
  ]
])

export const HindiInflector: InflectionEngine = {
  engine: 'hi-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'hi') return null
    const word = lemma.trim()
    if (word === '') return null

    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word)
      case 'declension':
        return pos?.toLowerCase() === 'adjective'
          ? noInflection(
              word,
              'हिन्दी में विशेषण संज्ञा के लिंग और वचन के अनुसार बदलते हैं ' +
                '(अच्छा लड़का, अच्छी लड़की, अच्छे लड़के); यहाँ मूल रूप दिखाया गया है।'
            )
          : nounParadigm(word)
      default:
        if (pos !== null && PRONOUN_LIKE.has(pos.toLowerCase())) return null
        if (pos === null || pos.trim() === '') return nounParadigm(word)
        return null
    }
  }
}

function classify(pos: string | null): ParadigmKind | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
      return 'conjugation'
    case 'noun':
    case 'adjective':
      return 'declension'
    default:
      return null
  }
}

function conjugate(inf: string): InflectionParadigm | null {
  const verb = VERBS.get(inf)
  if (!verb) return null
  return {
    lemma: inf,
    lang: 'hi',
    kind: 'conjugation',
    note:
      'भूतकाल में क्रिया कर्म के लिंग और वचन से मेल खाती है ' +
      "(मैंने किताब पढ़ी); तुम के साथ सहायक 'हो' आता है।",
    tables: [presentTable(verb), pastTable(verb), futureTable(verb), imperativeTable(verb)]
  }
}

function presentTable(verb: HindiVerb): ParadigmTable {
  const base = verb.presentBase
  const mascPl = base.slice(0, -1) + 'े'
  const fem = base.slice(0, -1) + 'ी'
  const rows = PERSONS.map((person, i) => {
    const masc = i === 0 || i === 2 ? base : mascPl
    return { label: person, cells: [`${masc} ${PRESENT_AUX[i]}`, `${fem} ${PRESENT_AUX[i]}`] }
  })
  return { title: 'वर्तमान काल', columns: ['पुल्लिंग', 'स्त्रीलिंग'], rows }
}

function pastTable(verb: HindiVerb): ParadigmTable {
  const rows = PAST_LABELS.map((label, i) => ({ label, cells: [verb.past[i]] }))
  return { title: 'भूतकाल', columns: ['रूप'], rows }
}

function futureTable(verb: HindiVerb): ParadigmTable {
  const masc = verb.futureMasc ?? futureFromStem(verb.stem)
  const rows = PERSONS.map((person, i) => {
    const f = masc[i]
    return { label: person, cells: [f, femOf(f)] }
  })
  return { title: 'भविष्यत् काल', columns: ['पुल्लिंग', 'स्त्रीलिंग'], rows }
}

function futureFromStem(stem: string): string[] {
  if (VOWEL_FINAL.includes(stem.slice(-1))) {
    return [
      stem + 'ऊँगा',
      stem + 'ओगे',
      stem + 'एगा',
      stem + 'एँगे',
      stem + 'एँगे',
      stem + 'एँगे'
    ]
  }
  return [stem + 'ूँगा', stem + 'ोगे', stem + 'ेगा', stem + 'ेंगे', stem + 'ेंगे', stem + 'ेंगे']
}

function imperativeTable(verb: HindiVerb): ParadigmTable {
  const rows = IMPERATIVE_LABELS.map((label, i) => ({ label, cells: [verb.imperative[i]] }))
  return { title: 'आज्ञार्थ', columns: ['रूप'], rows }
}

function femOf(masc: string): string {
  if (masc.endsWith('ा')) return masc.slice(0, -1) + 'ी'
  if (masc.endsWith('े')) return masc.slice(0, -1) + 'ी'
  return masc
}

function nounParadigm(word: string): InflectionParadigm {
  const [directSg, directPl, obliqueSg, obliquePl] = nounForms(word)
  const rows: ParadigmRow[] = [
    { label: 'प्रत्यक्ष', cells: [directSg, directPl] },
    { label: 'तिर्यक', cells: [obliqueSg, obliquePl] }
  ]
  return {
    lemma: word,
    lang: 'hi',
    kind: 'declension',
    note: 'परसर्ग (में, से, को, का) तिर्यक रूप के साथ प्रयुक्त होते हैं: किताब में, किताबों में।',
    tables: [{ title: 'संज्ञा रूपांतरण', columns: ['एकवचन', 'बहुवचन'], rows }]
  }
}

function nounForms(word: string): [string, string, string, string] {
  if (word.endsWith('ा')) {
    return [word, word.slice(0, -1) + 'े', word.slice(0, -1) + 'े', word.slice(0, -1) + 'ों']
  }
  if (word.endsWith('ी')) {
    return [word, word.slice(0, -1) + 'ियाँ', word, word.slice(0, -1) + 'ियों']
  }
  if (FEMININE_CONSONANT.has(word)) {
    return [word, word + 'ें', word, word + 'ों']
  }
  return [word, word, word, word + 'ों']
}

function noInflection(word: string, note: string): InflectionParadigm {
  return { lemma: word, lang: 'hi', kind: null, note, tables: [] }
}
