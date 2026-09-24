import { describe, expect, it } from 'vitest'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'
import { DanishInflector } from '@shared/lang/inflectors/danish'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (found === undefined) throw new Error(`missing table ${title}`)
  return found
}

function cell(t: ParadigmTable, label: string): string {
  const found = t.rows.find((r) => r.label === label)
  if (found === undefined) throw new Error(`missing row ${label}`)
  return found.cells[0]
}

function nounCells(p: InflectionParadigm, row: string): string[] {
  const found = p.tables[0].rows.find((r) => r.label === row)
  if (found === undefined) throw new Error(`missing row ${row}`)
  return found.cells
}

describe('DanishInflector', () => {
  it('group1VerbConjugates', async () => {
    const p = (await DanishInflector.inflect('elske', 'da', 'verb'))!
    expect(p.kind).toBe('conjugation')
    const t = table(p, 'Bøjning')
    expect(cell(t, 'Nutid')).toBe('elsker')
    expect(cell(t, 'Datid')).toBe('elskede')
    expect(cell(t, 'Førnutid')).toBe('elsket')
    expect(cell(t, 'Bydeform')).toBe('elsk')
  })

  it('group2VerbConjugates', async () => {
    const tale = (await DanishInflector.inflect('tale', 'da', 'verb'))!
    expect(cell(table(tale, 'Bøjning'), 'Nutid')).toBe('taler')
    expect(cell(table(tale, 'Bøjning'), 'Datid')).toBe('talte')
    expect(cell(table(tale, 'Bøjning'), 'Førnutid')).toBe('talt')

    const købe = (await DanishInflector.inflect('købe', 'da', 'verb'))!
    expect(cell(table(købe, 'Bøjning'), 'Datid')).toBe('købte')

    const bo = (await DanishInflector.inflect('bo', 'da', 'verb'))!
    expect(cell(table(bo, 'Bøjning'), 'Nutid')).toBe('bor')
    expect(cell(table(bo, 'Bøjning'), 'Datid')).toBe('boede')
    expect(cell(table(bo, 'Bøjning'), 'Førnutid')).toBe('boet')
  })

  it('strongVerbsConjugate', async () => {
    const være = (await DanishInflector.inflect('være', 'da', 'verb'))!
    expect(cell(table(være, 'Bøjning'), 'Nutid')).toBe('er')
    expect(cell(table(være, 'Bøjning'), 'Datid')).toBe('var')
    expect(cell(table(være, 'Bøjning'), 'Førnutid')).toBe('været')

    const se = (await DanishInflector.inflect('se', 'da', 'verb'))!
    expect(cell(table(se, 'Bøjning'), 'Datid')).toBe('så')
    expect(cell(table(se, 'Bøjning'), 'Førnutid')).toBe('set')

    const komme = (await DanishInflector.inflect('komme', 'da', 'verb'))!
    expect(cell(table(komme, 'Bøjning'), 'Datid')).toBe('kom')

    const have = (await DanishInflector.inflect('have', 'da', 'verb'))!
    expect(cell(table(have, 'Bøjning'), 'Nutid')).toBe('har')
    expect(cell(table(have, 'Bøjning'), 'Datid')).toBe('havde')
  })

  it('commonGenderNouns', async () => {
    const hund = (await DanishInflector.inflect('en hund', 'da', 'noun'))!
    expect(nounCells(hund, 'Ubestemt')).toEqual(['en hund', 'hunde'])
    expect(nounCells(hund, 'Bestemt')).toEqual(['hunden', 'hundene'])

    const kvinde = (await DanishInflector.inflect('kvinde', 'da', 'noun'))!
    expect(nounCells(kvinde, 'Ubestemt')[1]).toBe('kvinder')
    expect(nounCells(kvinde, 'Bestemt')[0]).toBe('kvinden')
  })

  it('neuterNouns', async () => {
    const hus = (await DanishInflector.inflect('et hus', 'da', 'noun'))!
    expect(nounCells(hus, 'Ubestemt')).toEqual(['et hus', 'huse'])
    expect(nounCells(hus, 'Bestemt')).toEqual(['huset', 'husene'])

    const barn = (await DanishInflector.inflect('barn', 'da', 'noun'))!
    expect(nounCells(barn, 'Ubestemt')[1]).toBe('børn')

    const sko = (await DanishInflector.inflect('sko', 'da', 'noun'))!
    expect(nounCells(sko, 'Bestemt')[1]).toBe('skoene')

    expect(await DanishInflector.inflect('blæp', 'da', 'noun')).toBeNull()
  })

  it('adjectivesAgree', async () => {
    const stor = (await DanishInflector.inflect('stor', 'da', 'adjective'))!
    const t = stor.tables[0]
    expect(t.rows.find((r) => r.label === 'Fælleskøn')!.cells).toEqual(['stor', 'store'])
    expect(t.rows.find((r) => r.label === 'Intetkøn')!.cells).toEqual(['stort', 'store'])

    const åben = (await DanishInflector.inflect('åben', 'da', 'adjective'))!
    expect(åben.tables[0].rows.find((r) => r.label === 'Intetkøn')!.cells[0]).toBe('åbent')
  })

  it('classificationAndFallback', async () => {
    expect((await DanishInflector.inflect('hurtigt', 'da', 'adverb'))?.kind).toBeNull()
    expect(await DanishInflector.inflect('elske', 'sv', 'verb')).toBeNull()
    expect(await DanishInflector.inflect('jeg', 'da', 'pronoun')).toBeNull()
  })
})
