import type { InflectionEngine, InflectionParadigm } from '../inflection'

/**
 * Bundled Chinese inflector. Chinese is isolating: no conjugation, number,
 * case or gender. Verbs carry one informational aspect-marker table; every
 * result is a kind=null paradigm with a Chinese note.
 */
export const ChineseInflector: InflectionEngine = {
  engine: 'zh-bundled',

  async inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'zh') return null
    const word = lemma.trim().toLowerCase()
    if (word === '') return null

    switch (pos?.toLowerCase()) {
      case 'verb':
        return verbParadigm(word)
      case 'noun':
        return nounParadigm(word)
      case 'adjective':
        return adjectiveParadigm(word)
      default:
        return noInflection(word)
    }
  }
}

function verbParadigm(word: string): InflectionParadigm {
  return {
    lemma: word,
    lang: 'zh',
    kind: null,
    note: '汉语动词没有时态、人称和数的变化；体用助词标记（了、过、在、着）。',
    tables: [
      {
        title: '体标记',
        columns: ['标记', '用法'],
        rows: [
          { label: '了', cells: ['动作完成', '吃了、看了'] },
          { label: '过', cells: ['曾经经历', '去过、看过'] },
          { label: '在', cells: ['正在进行', '在看、在吃'] },
          { label: '着', cells: ['持续状态', '看着、开着'] }
        ]
      }
    ]
  }
}

function nounParadigm(word: string): InflectionParadigm {
  return {
    lemma: word,
    lang: 'zh',
    kind: null,
    note: '汉语名词没有复数、格和性的变化；“们”可标记指人的复数（朋友们、学生们）。',
    tables: []
  }
}

function adjectiveParadigm(word: string): InflectionParadigm {
  return {
    lemma: word,
    lang: 'zh',
    kind: null,
    note: '汉语形容词没有性、数、格的一致变化，词形保持不变。',
    tables: []
  }
}

function noInflection(word: string): InflectionParadigm {
  return {
    lemma: word,
    lang: 'zh',
    kind: null,
    note: '该词在汉语中没有词形变化（汉语是孤立语，无形态变化）。',
    tables: []
  }
}
