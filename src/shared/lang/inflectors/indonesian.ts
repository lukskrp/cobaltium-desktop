import type { InflectionEngine, InflectionParadigm } from '../inflection'

/**
 * Bundled Indonesian inflector. Indonesian is nearly isolating: verbs do not
 * conjugate, nouns pluralize by reduplication, adjectives do not agree.
 */
export const IndonesianInflector: InflectionEngine = {
  engine: 'id-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'id') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    const p = pos?.toLowerCase()
    if (p === 'noun') return nounParadigm(word)
    if (p === 'verb') {
      return noInflection(
        word,
        'Kata kerja Indonesia tidak berkonjugasi untuk kala, orang atau jumlah; ' +
          'aspek ditandai dengan kata bantu (sudah, sedang, akan).'
      )
    }
    if (pos == null || pos.trim() === '') return nounParadigm(word)
    return noInflection(
      word,
      'Kata ini tidak berubah bentuk dalam bahasa Indonesia (tidak ada infleksi).'
    )
  }
}

function nounParadigm(word: string): InflectionParadigm {
  const plural = `${word}-${word}`
  return {
    lemma: word,
    lang: 'id',
    kind: 'declension',
    note:
      'Plural ditandai dengan reduplikasi (pengulangan); ' +
      'bahasa Indonesia tidak memiliki kasus, gender atau konjugasi.',
    tables: [
      {
        title: 'Jumlah',
        columns: ['Singular', 'Plural'],
        rows: [{ label: 'Bentuk', cells: [word, plural] }]
      }
    ]
  }
}

function noInflection(word: string, note: string): InflectionParadigm {
  return { lemma: word, lang: 'id', kind: null, note, tables: [] }
}
