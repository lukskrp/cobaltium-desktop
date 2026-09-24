import { describe, expect, it } from 'vitest'
import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '@shared/lang/inflection'
import { GermanInflector } from '@shared/lang/inflectors/german'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (found === undefined) throw new Error(`missing table ${title}`)
  return found
}

function cell(t: ParadigmTable, row: number): string {
  return t.rows[row].cells[0]
}

function cellByLabel(t: ParadigmTable, label: string): string {
  const found = t.rows.find((r) => r.label === label)
  if (found === undefined) throw new Error(`missing row ${label}`)
  return found.cells[0]
}

function nounRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  const found = p.tables[0].rows.find((r) => r.label === caseName)
  if (found === undefined) throw new Error(`missing row ${caseName}`)
  return found
}

function adjRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  const found = p.tables[0].rows.find((r) => r.label === caseName)
  if (found === undefined) throw new Error(`missing row ${caseName}`)
  return found
}

describe('GermanInflector', () => {
  // ── Verbs: regular ──────────────────────────────────────────────────────

  it('regularVerbConjugates', async () => {
    const p = (await GermanInflector.inflect('machen', 'de', 'verb'))!
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Präsens')
    expect(cell(present, 0)).toBe('mache')
    expect(cell(present, 1)).toBe('machst')
    expect(cell(present, 2)).toBe('macht')
    expect(cell(present, 3)).toBe('machen')
    expect(cell(present, 4)).toBe('macht')

    const preterite = table(p, 'Präteritum')
    expect(cell(preterite, 0)).toBe('machte')
    expect(cell(preterite, 3)).toBe('machten')

    const perfect = table(p, 'Perfekt')
    expect(cell(perfect, 0)).toBe('habe gemacht')
    expect(cell(perfect, 2)).toBe('hat gemacht')

    const future = table(p, 'Futur I')
    expect(cell(future, 0)).toBe('werde machen')
    expect(cell(future, 2)).toBe('wird machen')

    const imperative = table(p, 'Imperativ')
    expect(cell(imperative, 0)).toBe('mach')
    expect(cell(imperative, 1)).toBe('macht')
    expect(cell(imperative, 2)).toBe('machen')

    const partizipien = table(p, 'Partizipien')
    expect(cellByLabel(partizipien, 'Partizip I')).toBe('machend')
    expect(cellByLabel(partizipien, 'Partizip II')).toBe('gemacht')
  })

  it('tStemAndSibilantStems', async () => {
    const arbeiten = (await GermanInflector.inflect('arbeiten', 'de', 'verb'))!
    expect(cell(table(arbeiten, 'Präsens'), 1)).toBe('arbeitest')
    expect(cell(table(arbeiten, 'Präsens'), 2)).toBe('arbeitet')
    expect(cell(table(arbeiten, 'Präteritum'), 0)).toBe('arbeitete')
    expect(cellByLabel(table(arbeiten, 'Partizipien'), 'Partizip II')).toBe('gearbeitet')
    expect(cell(table(arbeiten, 'Imperativ'), 0)).toBe('arbeite')

    const tanzen = (await GermanInflector.inflect('tanzen', 'de', 'verb'))!
    expect(cell(table(tanzen, 'Präsens'), 1)).toBe('tanzt')
    expect(cell(table(tanzen, 'Präteritum'), 0)).toBe('tanzte')
  })

  it('elnIerenAndPrefixes', async () => {
    const lächeln = (await GermanInflector.inflect('lächeln', 'de', 'verb'))!
    expect(cell(table(lächeln, 'Präsens'), 0)).toBe('lächle')
    expect(cell(table(lächeln, 'Präsens'), 1)).toBe('lächelst')
    expect(cellByLabel(table(lächeln, 'Partizipien'), 'Partizip II')).toBe('gelächelt')

    const studieren = (await GermanInflector.inflect('studieren', 'de', 'verb'))!
    expect(cellByLabel(table(studieren, 'Partizipien'), 'Partizip II')).toBe('studiert')

    const bezahlen = (await GermanInflector.inflect('bezahlen', 'de', 'verb'))!
    expect(cellByLabel(table(bezahlen, 'Partizipien'), 'Partizip II')).toBe('bezahlt')

    const aufmachen = (await GermanInflector.inflect('aufmachen', 'de', 'verb'))!
    expect(cellByLabel(table(aufmachen, 'Partizipien'), 'Partizip II')).toBe('aufgemacht')
  })

  // ── Verbs: strong ───────────────────────────────────────────────────────

  it('strongVerbs', async () => {
    const sein = (await GermanInflector.inflect('sein', 'de', 'verb'))!
    expect(cell(table(sein, 'Präsens'), 0)).toBe('bin')
    expect(cell(table(sein, 'Präsens'), 2)).toBe('ist')
    expect(cell(table(sein, 'Präteritum'), 0)).toBe('war')
    expect(cell(table(sein, 'Perfekt'), 0)).toBe('bin gewesen')
    expect(cell(table(sein, 'Imperativ'), 0)).toBe('sei')

    const gehen = (await GermanInflector.inflect('gehen', 'de', 'verb'))!
    expect(cell(table(gehen, 'Präteritum'), 0)).toBe('ging')
    expect(cell(table(gehen, 'Perfekt'), 2)).toBe('ist gegangen')

    const lesen = (await GermanInflector.inflect('lesen', 'de', 'verb'))!
    expect(cell(table(lesen, 'Präsens'), 1)).toBe('liest')
    expect(cell(table(lesen, 'Präteritum'), 0)).toBe('las')
    expect(cellByLabel(table(lesen, 'Partizipien'), 'Partizip II')).toBe('gelesen')
    expect(cell(table(lesen, 'Imperativ'), 0)).toBe('lies')

    const essen = (await GermanInflector.inflect('essen', 'de', 'verb'))!
    expect(cell(table(essen, 'Präsens'), 2)).toBe('isst')
    expect(cell(table(essen, 'Präteritum'), 0)).toBe('aß')
    expect(cell(table(essen, 'Imperativ'), 0)).toBe('iss')

    const sprechen = (await GermanInflector.inflect('sprechen', 'de', 'verb'))!
    expect(cell(table(sprechen, 'Präsens'), 1)).toBe('sprichst')
    expect(cell(table(sprechen, 'Imperativ'), 0)).toBe('sprich')

    const nehmen = (await GermanInflector.inflect('nehmen', 'de', 'verb'))!
    expect(cell(table(nehmen, 'Präsens'), 1)).toBe('nimmst')
    expect(cell(table(nehmen, 'Imperativ'), 0)).toBe('nimm')

    const fahren = (await GermanInflector.inflect('fahren', 'de', 'verb'))!
    expect(cell(table(fahren, 'Präsens'), 2)).toBe('fährt')
    expect(cell(table(fahren, 'Präteritum'), 0)).toBe('fuhr')
    expect(cell(table(fahren, 'Perfekt'), 2)).toBe('ist gefahren')

    const halten = (await GermanInflector.inflect('halten', 'de', 'verb'))!
    expect(cell(table(halten, 'Präsens'), 2)).toBe('hält')

    const wissen = (await GermanInflector.inflect('wissen', 'de', 'verb'))!
    expect(cell(table(wissen, 'Präsens'), 0)).toBe('weiß')
    expect(cell(table(wissen, 'Präteritum'), 0)).toBe('wusste')

    const können = (await GermanInflector.inflect('können', 'de', 'verb'))!
    expect(cell(table(können, 'Präsens'), 0)).toBe('kann')
    expect(cell(table(können, 'Präteritum'), 0)).toBe('konnte')

    const tun = (await GermanInflector.inflect('tun', 'de', 'verb'))!
    expect(cell(table(tun, 'Präteritum'), 0)).toBe('tat')
    expect(cellByLabel(table(tun, 'Partizipien'), 'Partizip II')).toBe('getan')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('masculineNounDeclinesWithArticle', async () => {
    const p = (await GermanInflector.inflect('der Tisch', 'de', 'noun'))!
    expect(p.kind).toBe('declension')
    expect(nounRow(p, 'Nominativ').cells).toEqual(['der Tisch', 'die Tische'])
    expect(nounRow(p, 'Genitiv').cells).toEqual(['des Tisches', 'der Tische'])
    expect(nounRow(p, 'Dativ').cells).toEqual(['dem Tisch', 'den Tischen'])
    expect(nounRow(p, 'Akkusativ').cells).toEqual(['den Tisch', 'die Tische'])
  })

  it('feminineAndNeuterNounsDecline', async () => {
    const frau = (await GermanInflector.inflect('die Frau', 'de', 'noun'))!
    expect(nounRow(frau, 'Nominativ').cells).toEqual(['die Frau', 'die Frauen'])
    expect(nounRow(frau, 'Genitiv').cells).toEqual(['der Frau', 'der Frauen'])
    expect(nounRow(frau, 'Dativ').cells).toEqual(['der Frau', 'den Frauen'])
    expect(nounRow(frau, 'Akkusativ').cells).toEqual(['die Frau', 'die Frauen'])

    const kind = (await GermanInflector.inflect('das Kind', 'de', 'noun'))!
    expect(nounRow(kind, 'Nominativ').cells).toEqual(['das Kind', 'die Kinder'])
    expect(nounRow(kind, 'Genitiv').cells).toEqual(['des Kindes', 'der Kinder'])
    expect(nounRow(kind, 'Dativ').cells).toEqual(['dem Kind', 'den Kindern'])
  })

  it('ambiguousEinResolvesViaDictionary', async () => {
    const kind = (await GermanInflector.inflect('ein Kind', 'de', 'noun'))!
    expect(nounRow(kind, 'Nominativ').cells[0]).toBe('das Kind')
    expect(nounRow(kind, 'Genitiv').cells[0]).toBe('des Kindes')

    const mann = (await GermanInflector.inflect('ein Mann', 'de', 'noun'))!
    expect(nounRow(mann, 'Nominativ').cells[0]).toBe('der Mann')
  })

  it('bareNounsUseDictionary', async () => {
    const auto = (await GermanInflector.inflect('Auto', 'de', 'noun'))!
    expect(nounRow(auto, 'Nominativ').cells[0]).toBe('das Auto')
    expect(nounRow(auto, 'Genitiv').cells[0]).toBe('des Autos')
    expect(nounRow(auto, 'Nominativ').cells[1]).toBe('die Autos')

    const stadt = (await GermanInflector.inflect('Stadt', 'de', 'noun'))!
    expect(nounRow(stadt, 'Nominativ').cells[0]).toBe('die Stadt')
    expect(nounRow(stadt, 'Nominativ').cells[1]).toBe('die Städte')

    expect(await GermanInflector.inflect('Quatsch', 'de', 'noun')).toBeNull()
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  it('adjectiveStrongDeclension', async () => {
    const gut = (await GermanInflector.inflect('gut', 'de', 'adjective'))!
    expect(gut.kind).toBe('declension')
    expect(adjRow(gut, 'Nominativ').cells).toEqual(['guter', 'gute', 'gutes', 'gute'])
    expect(adjRow(gut, 'Genitiv').cells).toEqual(['guten', 'guter', 'guten', 'guter'])
    expect(adjRow(gut, 'Dativ').cells).toEqual(['guten', 'guter', 'guten', 'guten'])
    expect(adjRow(gut, 'Akkusativ').cells).toEqual(['guten', 'gute', 'gutes', 'gute'])

    const teuer = (await GermanInflector.inflect('teuer', 'de', 'adjective'))!
    expect(adjRow(teuer, 'Nominativ').cells[0]).toBe('teurer')
    expect(adjRow(teuer, 'Nominativ').cells[1]).toBe('teure')

    const dunkel = (await GermanInflector.inflect('dunkel', 'de', 'adjective'))!
    expect(adjRow(dunkel, 'Nominativ').cells[0]).toBe('dunkler')
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    const adverb = (await GermanInflector.inflect('schnell', 'de', 'adverb'))!
    expect(adverb.kind).toBeNull()
    expect(await GermanInflector.inflect('machen', 'ru', 'verb')).toBeNull()
    expect(await GermanInflector.inflect('ich', 'de', 'pronoun')).toBeNull()
  })
})
