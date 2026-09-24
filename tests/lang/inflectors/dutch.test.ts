import { describe, expect, it } from 'vitest'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'
import { DutchInflector } from '@shared/lang/inflectors/dutch'

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

describe('DutchInflector', () => {
  // ── Verbs: weak ─────────────────────────────────────────────────────────

  it('weakVerbConjugates', async () => {
    const p = (await DutchInflector.inflect('werken', 'nl', 'verb'))!
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Tegenwoordige tijd')
    expect(cell(present, 'ik')).toBe('werk')
    expect(cell(present, 'jij/hij/zij')).toBe('werkt')

    const past = table(p, 'Verleden tijd')
    expect(cell(past, 'enkelvoud')).toBe('werkte')
    expect(cell(past, 'meervoud')).toBe('werkten')

    expect(cell(table(p, 'Voltooid deelwoord'), 'voltooid')).toBe('gewerkt')
    expect(cell(table(p, 'Imperatief'), 'jij')).toBe('werk')
  })

  it('weakVerbSpellingRules', async () => {
    const maken = (await DutchInflector.inflect('maken', 'nl', 'verb'))!
    expect(cell(table(maken, 'Tegenwoordige tijd'), 'ik')).toBe('maak')
    expect(cell(table(maken, 'Verleden tijd'), 'enkelvoud')).toBe('maakte')
    expect(cell(table(maken, 'Voltooid deelwoord'), 'voltooid')).toBe('gemaakt')

    const wonen = (await DutchInflector.inflect('wonen', 'nl', 'verb'))!
    expect(cell(table(wonen, 'Tegenwoordige tijd'), 'ik')).toBe('woon')
    expect(cell(table(wonen, 'Verleden tijd'), 'enkelvoud')).toBe('woonde')
    expect(cell(table(wonen, 'Voltooid deelwoord'), 'voltooid')).toBe('gewoond')

    const praten = (await DutchInflector.inflect('praten', 'nl', 'verb'))!
    expect(cell(table(praten, 'Tegenwoordige tijd'), 'jij/hij/zij')).toBe('praat')
    expect(cell(table(praten, 'Verleden tijd'), 'enkelvoud')).toBe('praatte')
    expect(cell(table(praten, 'Voltooid deelwoord'), 'voltooid')).toBe('gepraat')

    const zitten = (await DutchInflector.inflect('zitten', 'nl', 'verb'))!
    expect(cell(table(zitten, 'Tegenwoordige tijd'), 'ik')).toBe('zit')
    expect(cell(table(zitten, 'Verleden tijd'), 'enkelvoud')).toBe('zat')

    const reizen = (await DutchInflector.inflect('reizen', 'nl', 'verb'))!
    expect(cell(table(reizen, 'Tegenwoordige tijd'), 'ik')).toBe('reis')
    expect(cell(table(reizen, 'Verleden tijd'), 'enkelvoud')).toBe('reisde')
    expect(cell(table(reizen, 'Voltooid deelwoord'), 'voltooid')).toBe('gereisd')
  })

  // ── Verbs: strong & irregular ───────────────────────────────────────────

  it('strongAndIrregularVerbs', async () => {
    const kijken = (await DutchInflector.inflect('kijken', 'nl', 'verb'))!
    expect(cell(table(kijken, 'Verleden tijd'), 'enkelvoud')).toBe('keek')
    expect(cell(table(kijken, 'Verleden tijd'), 'meervoud')).toBe('keken')
    expect(cell(table(kijken, 'Voltooid deelwoord'), 'voltooid')).toBe('gekeken')

    const zien = (await DutchInflector.inflect('zien', 'nl', 'verb'))!
    expect(cell(table(zien, 'Verleden tijd'), 'enkelvoud')).toBe('zag')
    expect(cell(table(zien, 'Voltooid deelwoord'), 'voltooid')).toBe('gezien')

    const zijn = (await DutchInflector.inflect('zijn', 'nl', 'verb'))!
    expect(cell(table(zijn, 'Tegenwoordige tijd'), 'ik')).toBe('ben')
    expect(cell(table(zijn, 'Tegenwoordige tijd'), 'jij/hij/zij')).toBe('bent')
    expect(cell(table(zijn, 'Verleden tijd'), 'enkelvoud')).toBe('was')
    expect(cell(table(zijn, 'Voltooid deelwoord'), 'voltooid')).toBe('geweest')

    const hebben = (await DutchInflector.inflect('hebben', 'nl', 'verb'))!
    expect(cell(table(hebben, 'Tegenwoordige tijd'), 'ik')).toBe('heb')
    expect(cell(table(hebben, 'Verleden tijd'), 'enkelvoud')).toBe('had')
    expect(cell(table(hebben, 'Voltooid deelwoord'), 'voltooid')).toBe('gehad')

    const kunnen = (await DutchInflector.inflect('kunnen', 'nl', 'verb'))!
    expect(cell(table(kunnen, 'Tegenwoordige tijd'), 'ik')).toBe('kan')
    expect(cell(table(kunnen, 'Verleden tijd'), 'enkelvoud')).toBe('kon')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('nounsDecline', async () => {
    const man = (await DutchInflector.inflect('de man', 'nl', 'noun'))!
    expect(nounCells(man, 'onbepaald')).toEqual(['de man', 'mannen'])
    expect(nounCells(man, 'bepaald')).toEqual(['de man', 'de mannen'])

    const huis = (await DutchInflector.inflect('het huis', 'nl', 'noun'))!
    expect(nounCells(huis, 'onbepaald')).toEqual(['het huis', 'huizen'])

    const kind = (await DutchInflector.inflect('kind', 'nl', 'noun'))!
    expect(nounCells(kind, 'onbepaald')[1]).toBe('kinderen')

    const museum = (await DutchInflector.inflect('museum', 'nl', 'noun'))!
    expect(nounCells(museum, 'onbepaald')[1]).toBe('musea')

    const auto = (await DutchInflector.inflect('auto', 'nl', 'noun'))!
    expect(nounCells(auto, 'onbepaald')[1]).toBe("auto's")

    expect(await DutchInflector.inflect('blabber', 'nl', 'noun')).toBeNull()
  })

  // ── Adjectives & fallback ───────────────────────────────────────────────

  it('adjectivesAndFallback', async () => {
    const mooi = (await DutchInflector.inflect('mooi', 'nl', 'adjective'))!
    const verbogen = mooi.tables[0].rows.find((r) => r.label === 'verbogen (-e)')
    expect(verbogen?.cells[0]).toBe('mooie')

    expect((await DutchInflector.inflect('snel', 'nl', 'adverb'))?.kind).toBeNull()
    expect(await DutchInflector.inflect('werken', 'sv', 'verb')).toBeNull()
    expect(await DutchInflector.inflect('ik', 'nl', 'pronoun')).toBeNull()
  })
})
