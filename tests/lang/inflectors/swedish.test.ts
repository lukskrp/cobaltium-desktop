import { describe, expect, it } from 'vitest'
import { SwedishInflector } from '@shared/lang/inflectors/swedish'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function cell(t: ParadigmTable, label: string): string {
  const found = t.rows.find((r) => r.label === label)
  if (!found) throw new Error(`missing row ${label}`)
  return found.cells[0]
}

function rowCells(p: InflectionParadigm, label: string): string[] {
  const found = p.tables[0].rows.find((r) => r.label === label)
  if (!found) throw new Error(`missing row ${label}`)
  return found.cells
}

async function inflect(lemma: string, pos: string): Promise<InflectionParadigm> {
  const p = await SwedishInflector.inflect(lemma, 'sv', pos)
  if (!p) throw new Error('null paradigm')
  return p
}

// ── Verbs ───────────────────────────────────────────────────────────────

describe('SwedishInflector', () => {
  it('group1VerbConjugates', async () => {
    const p = await inflect('tala', 'verb')
    expect(p.kind).toBe('conjugation')
    const t = table(p, 'Böjning')
    expect(cell(t, 'Presens')).toBe('talar')
    expect(cell(t, 'Preteritum')).toBe('talade')
    expect(cell(t, 'Supinum')).toBe('talat')
    expect(cell(t, 'Imperativ')).toBe('tala')
  })

  it('group2And3VerbsConjugate', async () => {
    const stänga = await inflect('stänga', 'verb')
    expect(cell(table(stänga, 'Böjning'), 'Presens')).toBe('stänger')
    expect(cell(table(stänga, 'Böjning'), 'Preteritum')).toBe('stängde')
    expect(cell(table(stänga, 'Böjning'), 'Supinum')).toBe('stängt')

    const köpa = await inflect('köpa', 'verb')
    expect(cell(table(köpa, 'Böjning'), 'Preteritum')).toBe('köpte')
    expect(cell(table(köpa, 'Böjning'), 'Supinum')).toBe('köpt')

    const bo = await inflect('bo', 'verb')
    expect(cell(table(bo, 'Böjning'), 'Presens')).toBe('bor')
    expect(cell(table(bo, 'Böjning'), 'Preteritum')).toBe('bodde')
    expect(cell(table(bo, 'Böjning'), 'Supinum')).toBe('bott')
  })

  it('strongVerbsConjugate', async () => {
    const vara = await inflect('vara', 'verb')
    expect(cell(table(vara, 'Böjning'), 'Presens')).toBe('är')
    expect(cell(table(vara, 'Böjning'), 'Preteritum')).toBe('var')
    expect(cell(table(vara, 'Böjning'), 'Supinum')).toBe('varit')

    const komma = await inflect('komma', 'verb')
    expect(cell(table(komma, 'Böjning'), 'Preteritum')).toBe('kom')

    const se = await inflect('se', 'verb')
    expect(cell(table(se, 'Böjning'), 'Presens')).toBe('ser')
    expect(cell(table(se, 'Böjning'), 'Preteritum')).toBe('såg')
    expect(cell(table(se, 'Böjning'), 'Supinum')).toBe('sett')

    const äta = await inflect('äta', 'verb')
    expect(cell(table(äta, 'Böjning'), 'Preteritum')).toBe('åt')
    expect(cell(table(äta, 'Böjning'), 'Supinum')).toBe('ätit')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('commonGenderNouns', async () => {
    const hund = await inflect('en hund', 'noun')
    expect(rowCells(hund, 'Obestämd')).toEqual(['en hund', 'hundar'])
    expect(rowCells(hund, 'Bestämd')).toEqual(['hunden', 'hundarna'])

    const flicka = await inflect('flicka', 'noun')
    expect(rowCells(flicka, 'Obestämd')[1]).toBe('flickor')
    expect(rowCells(flicka, 'Bestämd')[0]).toBe('flickan')
  })

  it('neuterNouns', async () => {
    const hus = await inflect('ett hus', 'noun')
    expect(rowCells(hus, 'Obestämd')).toEqual(['ett hus', 'hus'])
    expect(rowCells(hus, 'Bestämd')).toEqual(['huset', 'husen'])

    const äpple = await inflect('äpple', 'noun')
    expect(rowCells(äpple, 'Obestämd')[1]).toBe('äpplen')
    expect(rowCells(äpple, 'Bestämd')[0]).toBe('äpplet')
  })

  it('irregularNouns', async () => {
    const man = await inflect('man', 'noun')
    expect(rowCells(man, 'Obestämd')[1]).toBe('män')
    const bok = await inflect('bok', 'noun')
    expect(rowCells(bok, 'Obestämd')[1]).toBe('böcker')
    expect(await SwedishInflector.inflect('bläpp', 'sv', 'noun')).toBeNull()
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  it('adjectivesAgree', async () => {
    const stor = await inflect('stor', 'adjective')
    expect(rowCells(stor, 'Utrum')).toEqual(['stor', 'stora'])
    expect(rowCells(stor, 'Neutrum')).toEqual(['stort', 'stora'])

    const ny = await inflect('ny', 'adjective')
    expect(rowCells(ny, 'Neutrum')[0]).toBe('nytt')

    const öppen = await inflect('öppen', 'adjective')
    expect(rowCells(öppen, 'Neutrum')[0]).toBe('öppet')
    expect(rowCells(öppen, 'Utrum')[1]).toBe('öppna')
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    expect((await SwedishInflector.inflect('snabbt', 'sv', 'adverb'))?.kind).toBeNull()
    expect(await SwedishInflector.inflect('tala', 'de', 'verb')).toBeNull()
    expect(await SwedishInflector.inflect('jag', 'sv', 'pronoun')).toBeNull()
  })
})
