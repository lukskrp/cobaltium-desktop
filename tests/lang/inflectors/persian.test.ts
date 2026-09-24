import { describe, expect, it } from 'vitest'
import { PersianInflector } from '@shared/lang/inflectors/persian'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

async function inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm> {
  const paradigm = await PersianInflector.inflect(lemma, lang, pos)
  if (!paradigm) throw new Error('null paradigm')
  return paradigm
}

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function cellByLabel(t: ParadigmTable, label: string): string {
  const row = t.rows.find((r) => r.label === label)
  if (!row) throw new Error(`missing row ${label}`)
  return row.cells[0]
}

function pluralCells(p: InflectionParadigm): string[] {
  return p.tables[0].rows[0].cells
}

// ── Verbs ───────────────────────────────────────────────────────────────

describe('PersianInflector', () => {
  it('raftanConjugates', async () => {
    const p = await inflect('رفتن', 'fa', 'verb')
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'حال')
    expect(cellByLabel(present, 'من')).toBe('میروم')
    expect(cellByLabel(present, 'تو')).toBe('میروی')
    expect(cellByLabel(present, 'او')).toBe('میرود')
    expect(cellByLabel(present, 'ما')).toBe('میرویم')
    expect(cellByLabel(present, 'آنها')).toBe('میروند')

    const past = table(p, 'گذشته')
    expect(cellByLabel(past, 'من')).toBe('رفتم')
    expect(cellByLabel(past, 'او')).toBe('رفت')
    expect(cellByLabel(past, 'ما')).toBe('رفتیم')

    const imperative = table(p, 'امر')
    expect(cellByLabel(imperative, 'تو')).toBe('برو')
    expect(cellByLabel(imperative, 'شما')).toBe('بروید')
  })

  it('budanPresentIsIrregular', async () => {
    const p = await inflect('بودن', 'fa', 'verb')

    const present = table(p, 'حال')
    expect(cellByLabel(present, 'من')).toBe('هستم')
    expect(cellByLabel(present, 'او')).toBe('است')
    expect(cellByLabel(present, 'آنها')).toBe('هستند')

    const past = table(p, 'گذشته')
    expect(cellByLabel(past, 'من')).toBe('بودم')
    expect(cellByLabel(past, 'او')).toBe('بود')

    const imperative = table(p, 'امر')
    expect(cellByLabel(imperative, 'تو')).toBe('باش')
    expect(cellByLabel(imperative, 'شما')).toBe('باشید')
  })

  it('kardanConjugates', async () => {
    const p = await inflect('کردن', 'fa', 'verb')
    expect(cellByLabel(table(p, 'حال'), 'من')).toBe('میکنم')
    expect(cellByLabel(table(p, 'حال'), 'تو')).toBe('میکنی')
    expect(cellByLabel(table(p, 'گذشته'), 'من')).toBe('کردم')
    expect(cellByLabel(table(p, 'گذشته'), 'او')).toBe('کرد')
    expect(cellByLabel(table(p, 'امر'), 'تو')).toBe('بکن')
  })

  it('gereftanConjugates', async () => {
    const p = await inflect('گرفتن', 'fa', 'verb')
    expect(cellByLabel(table(p, 'حال'), 'من')).toBe('میگیرم')
    expect(cellByLabel(table(p, 'گذشته'), 'من')).toBe('گرفتم')
    expect(cellByLabel(table(p, 'امر'), 'تو')).toBe('بگیر')
    expect(cellByLabel(table(p, 'امر'), 'شما')).toBe('بگیرید')
  })

  it('derivedYidanFamilyConjugates', async () => {
    const p = await inflect('خندیدن', 'fa', 'verb')
    expect(cellByLabel(table(p, 'حال'), 'من')).toBe('میخندم')
    expect(cellByLabel(table(p, 'گذشته'), 'من')).toBe('خندیدم')
    expect(cellByLabel(table(p, 'امر'), 'تو')).toBe('بخند')
  })

  it('unpredictableVerbFallsBackToNull', async () => {
    // پختن's present stem (پز) is lexical and matches no derivable pattern.
    expect(await PersianInflector.inflect('پختن', 'fa', 'verb')).toBeNull()
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('nounsPluralize', async () => {
    const kitab = await inflect('کتاب', 'fa', 'noun')
    expect(kitab.kind).toBe('declension')
    expect(pluralCells(kitab)).toEqual(['کتاب', 'کتابها'])
    expect(pluralCells(await inflect('خانه', 'fa', 'noun'))).toEqual(['خانه', 'خانهها'])
    expect(pluralCells(await inflect('مرد', 'fa', 'noun'))).toEqual(['مرد', 'مردان'])
    expect(pluralCells(await inflect('زن', 'fa', 'noun'))).toEqual(['زن', 'زنان'])
    expect(pluralCells(await inflect('دانشجو', 'fa', 'noun'))).toEqual(['دانشجو', 'دانشجویان'])
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    expect(await PersianInflector.inflect('کتاب', 'en', 'noun')).toBeNull() // wrong language
    expect(await PersianInflector.inflect('من', 'fa', 'pronoun')).toBeNull() // closed class → LLM tier

    const adjective = await inflect('خوب', 'fa', 'adjective')
    expect(adjective.kind).toBeNull() // Persian adjectives do not agree
    expect(adjective.note.includes('صرف')).toBe(true)

    const nounByDefault = await inflect('کتاب', 'fa', null)
    expect(nounByDefault.kind).toBe('declension')
    expect(pluralCells(nounByDefault)).toEqual(['کتاب', 'کتابها'])
  })
})
