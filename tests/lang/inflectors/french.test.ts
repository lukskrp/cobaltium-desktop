import { describe, expect, it } from 'vitest'
import { FrenchInflector } from '@shared/lang/inflectors/french'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function cell(t: ParadigmTable, row: number): string {
  return t.rows[row].cells[0]
}

function cellByLabel(t: ParadigmTable, label: string): string {
  const found = t.rows.find((r) => r.label === label)
  if (!found) throw new Error(`missing row ${label}`)
  return found.cells[0]
}

async function inflect(lemma: string, pos: string): Promise<InflectionParadigm> {
  const p = await FrenchInflector.inflect(lemma, 'fr', pos)
  if (!p) throw new Error('null paradigm')
  return p
}

// ── Verbs: regular groups ───────────────────────────────────────────────

describe('FrenchInflector', () => {
  it('regularErVerbConjugates', async () => {
    const p = await inflect('parler', 'verb')
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Présent')
    expect(cell(present, 0)).toBe('parle')
    expect(cell(present, 1)).toBe('parles')
    expect(cell(present, 2)).toBe('parle')
    expect(cell(present, 3)).toBe('parlons')
    expect(cell(present, 4)).toBe('parlez')
    expect(cell(present, 5)).toBe('parlent')

    expect(cell(table(p, 'Imparfait'), 0)).toBe('parlais')
    expect(cell(table(p, 'Passé simple'), 0)).toBe('parlai')
    expect(cell(table(p, 'Futur simple'), 0)).toBe('parlerai')
    expect(cell(table(p, 'Conditionnel présent'), 0)).toBe('parlerais')
    expect(cell(table(p, 'Présent du subjonctif'), 0)).toBe('parle')
    expect(cell(table(p, 'Présent du subjonctif'), 3)).toBe('parlions')

    const imperative = table(p, 'Impératif')
    expect(cell(imperative, 0)).toBe('parle') // -er drops the -s
    expect(cell(imperative, 1)).toBe('parlons')
    expect(cell(imperative, 2)).toBe('parlez')

    expect(cell(table(p, 'Passé composé'), 0)).toBe('ai parlé')
    expect(cell(table(p, 'Plus-que-parfait'), 0)).toBe('avais parlé')

    const nonFinite = table(p, 'Formes non personnelles')
    expect(cellByLabel(nonFinite, 'Infinitif')).toBe('parler')
    expect(cellByLabel(nonFinite, 'Participe présent')).toBe('parlant')
    expect(cellByLabel(nonFinite, 'Participe passé')).toBe('parlé')
  })

  it('orthographicErVerbs', async () => {
    const commencer = await inflect('commencer', 'verb')
    expect(cell(table(commencer, 'Présent'), 3)).toBe('commençons')
    expect(cell(table(commencer, 'Imparfait'), 0)).toBe('commençais')
    expect(cell(table(commencer, 'Passé simple'), 0)).toBe('commençai')

    const manger = await inflect('manger', 'verb')
    expect(cell(table(manger, 'Présent'), 3)).toBe('mangeons')
    expect(cell(table(manger, 'Imparfait'), 0)).toBe('mangeais')

    const payer = await inflect('payer', 'verb')
    expect(cell(table(payer, 'Présent'), 0)).toBe('paie')
    expect(cell(table(payer, 'Présent'), 3)).toBe('payons')

    const appeler = await inflect('appeler', 'verb')
    expect(cell(table(appeler, 'Présent'), 0)).toBe('appelle')
    expect(cell(table(appeler, 'Présent'), 3)).toBe('appelons')

    const acheter = await inflect('acheter', 'verb')
    expect(cell(table(acheter, 'Présent'), 0)).toBe('achète')
    expect(cell(table(acheter, 'Présent'), 3)).toBe('achetons')

    const espérer = await inflect('espérer', 'verb')
    expect(cell(table(espérer, 'Présent'), 0)).toBe('espère')
    expect(cell(table(espérer, 'Présent'), 3)).toBe('espérons')
  })

  it('regularIrAndReVerbsConjugate', async () => {
    const finir = await inflect('finir', 'verb')
    expect(cell(table(finir, 'Présent'), 0)).toBe('finis')
    expect(cell(table(finir, 'Présent'), 3)).toBe('finissons')
    expect(cell(table(finir, 'Imparfait'), 2)).toBe('finissait')
    expect(cell(table(finir, 'Futur simple'), 0)).toBe('finirai')
    expect(cell(table(finir, 'Présent du subjonctif'), 0)).toBe('finisse')
    expect(cellByLabel(table(finir, 'Formes non personnelles'), 'Participe passé')).toBe('fini')

    const vendre = await inflect('vendre', 'verb')
    expect(cell(table(vendre, 'Présent'), 0)).toBe('vends')
    expect(cell(table(vendre, 'Présent'), 3)).toBe('vendons')
    expect(cell(table(vendre, 'Imparfait'), 2)).toBe('vendait')
    expect(cell(table(vendre, 'Futur simple'), 0)).toBe('vendrai') // -re drops the e
    expect(cell(table(vendre, 'Présent du subjonctif'), 0)).toBe('vende')
    expect(cellByLabel(table(vendre, 'Formes non personnelles'), 'Participe passé')).toBe('vendu')
  })

  it('etreAuxiliaryVerbs', async () => {
    const arriver = await inflect('arriver', 'verb')
    expect(cell(table(arriver, 'Passé composé'), 0)).toBe('suis arrivé')
    expect(cell(table(arriver, 'Passé composé'), 2)).toBe('est arrivé')
    expect(cell(table(arriver, 'Plus-que-parfait'), 0)).toBe('étais arrivé')
  })

  // ── Verbs: irregulars ───────────────────────────────────────────────────

  it('keyIrregularVerbs', async () => {
    const etre = await inflect('être', 'verb')
    expect(cell(table(etre, 'Présent'), 0)).toBe('suis')
    expect(cell(table(etre, 'Présent'), 3)).toBe('sommes')
    expect(cell(table(etre, 'Imparfait'), 0)).toBe('étais')
    expect(cell(table(etre, 'Passé simple'), 0)).toBe('fus')
    expect(cell(table(etre, 'Futur simple'), 0)).toBe('serai')
    expect(cell(table(etre, 'Présent du subjonctif'), 0)).toBe('sois')
    expect(cell(table(etre, 'Passé composé'), 0)).toBe('suis été')

    const avoir = await inflect('avoir', 'verb')
    expect(cell(table(avoir, 'Présent'), 0)).toBe('ai')
    expect(cell(table(avoir, 'Futur simple'), 0)).toBe('aurai')
    expect(cellByLabel(table(avoir, 'Formes non personnelles'), 'Participe passé')).toBe('eu')

    const aller = await inflect('aller', 'verb')
    expect(cell(table(aller, 'Présent'), 0)).toBe('vais')
    expect(cell(table(aller, 'Futur simple'), 0)).toBe('irai')
    expect(cell(table(aller, 'Impératif'), 0)).toBe('va')
    expect(cell(table(aller, 'Passé composé'), 0)).toBe('suis allé')

    const faire = await inflect('faire', 'verb')
    expect(cell(table(faire, 'Présent'), 2)).toBe('fait')
    expect(cell(table(faire, 'Futur simple'), 0)).toBe('ferai')
    expect(cellByLabel(table(faire, 'Formes non personnelles'), 'Participe présent')).toBe('faisant')

    const venir = await inflect('venir', 'verb')
    expect(cell(table(venir, 'Présent'), 0)).toBe('viens')
    expect(cell(table(venir, 'Futur simple'), 0)).toBe('viendrai')
    expect(cell(table(venir, 'Passé composé'), 0)).toBe('suis venu')

    const pouvoir = await inflect('pouvoir', 'verb')
    expect(cell(table(pouvoir, 'Présent'), 0)).toBe('peux')
    expect(cell(table(pouvoir, 'Futur simple'), 0)).toBe('pourrai')
    expect(cellByLabel(table(pouvoir, 'Formes non personnelles'), 'Participe passé')).toBe('pu')

    const devoir = await inflect('devoir', 'verb')
    expect(cell(table(devoir, 'Présent'), 0)).toBe('dois')
    expect(cell(table(devoir, 'Futur simple'), 0)).toBe('devrai')

    const savoir = await inflect('savoir', 'verb')
    expect(cell(table(savoir, 'Présent'), 0)).toBe('sais')
    expect(cell(table(savoir, 'Futur simple'), 0)).toBe('saurai')
    expect(cell(table(savoir, 'Impératif'), 0)).toBe('sache')

    const prendre = await inflect('prendre', 'verb')
    expect(cell(table(prendre, 'Présent'), 0)).toBe('prends')
    expect(cell(table(prendre, 'Présent'), 5)).toBe('prennent')
    expect(cellByLabel(table(prendre, 'Formes non personnelles'), 'Participe passé')).toBe('pris')

    const partir = await inflect('partir', 'verb')
    expect(cell(table(partir, 'Présent'), 0)).toBe('pars')
    expect(cell(table(partir, 'Passé composé'), 0)).toBe('suis parti')

    const dormir = await inflect('dormir', 'verb')
    expect(cell(table(dormir, 'Présent'), 0)).toBe('dors')
    expect(cellByLabel(table(dormir, 'Formes non personnelles'), 'Participe passé')).toBe('dormi')

    const ouvrir = await inflect('ouvrir', 'verb')
    expect(cell(table(ouvrir, 'Présent'), 0)).toBe('ouvre') // -er endings
    expect(cellByLabel(table(ouvrir, 'Formes non personnelles'), 'Participe passé')).toBe('ouvert')

    const recevoir = await inflect('recevoir', 'verb')
    expect(cell(table(recevoir, 'Présent'), 0)).toBe('reçois')
    expect(cellByLabel(table(recevoir, 'Formes non personnelles'), 'Participe passé')).toBe('reçu')
  })

  it('impersonalVerb', async () => {
    const falloir = await inflect('falloir', 'verb')
    expect(cell(table(falloir, 'Présent'), 2)).toBe('faut')
    expect(cell(table(falloir, 'Futur simple'), 2)).toBe('faudra')
    expect(cell(table(falloir, 'Imparfait'), 2)).toBe('fallait')
    expect(falloir.note.includes('impersonnel')).toBe(true)
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('nounsPluralize', async () => {
    const chat = await inflect('chat', 'noun')
    expect(chat.kind).toBe('declension')
    const row = chat.tables[0].rows[0]
    expect(row.cells).toEqual(['chat', 'chats'])

    async function pluralOf(word: string): Promise<string> {
      const p = await inflect(word, 'noun')
      return p.tables[0].rows[0].cells[1]
    }

    expect(await pluralOf('cheval')).toBe('chevaux')
    expect(await pluralOf('château')).toBe('châteaux')
    expect(await pluralOf('travail')).toBe('travaux')
    expect(await pluralOf('bijou')).toBe('bijoux')
    expect(await pluralOf('nez')).toBe('nez')
    expect(await pluralOf('festival')).toBe('festivals') // exception: -s
    expect(await pluralOf('chou')).toBe('choux')
    expect(await pluralOf('clou')).toBe('clous')
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  function adjCells(p: InflectionParadigm, gender: string): string[] {
    const found = p.tables[0].rows.find((r) => r.label === gender)
    if (!found) throw new Error(`missing row ${gender}`)
    return found.cells
  }

  it('adjectivesAgree', async () => {
    const petit = await inflect('petit', 'adjective')
    expect(adjCells(petit, 'Masculin')).toEqual(['petit', 'petits'])
    expect(adjCells(petit, 'Féminin')).toEqual(['petite', 'petites'])

    const heureux = await inflect('heureux', 'adjective')
    expect(adjCells(heureux, 'Féminin')[0]).toBe('heureuse')
    expect(adjCells(heureux, 'Masculin')[1]).toBe('heureux') // -x unchanged

    const blanc = await inflect('blanc', 'adjective')
    expect(adjCells(blanc, 'Féminin')[0]).toBe('blanche')

    const bon = await inflect('bon', 'adjective')
    expect(adjCells(bon, 'Féminin')[0]).toBe('bonne')

    const beau = await inflect('beau', 'adjective')
    expect(adjCells(beau, 'Féminin')[0]).toBe('belle')
    expect(adjCells(beau, 'Masculin')[1]).toBe('beaux')

    const nouveau = await inflect('nouveau', 'adjective')
    expect(adjCells(nouveau, 'Féminin')[0]).toBe('nouvelle')

    const vieux = await inflect('vieux', 'adjective')
    expect(adjCells(vieux, 'Féminin')[0]).toBe('vieille')

    const gros = await inflect('gros', 'adjective')
    expect(adjCells(gros, 'Féminin')[0]).toBe('grosse')

    const gris = await inflect('gris', 'adjective')
    expect(adjCells(gris, 'Féminin')[0]).toBe('grise')

    const sec = await inflect('sec', 'adjective')
    expect(adjCells(sec, 'Féminin')[0]).toBe('sèche')

    const doux = await inflect('doux', 'adjective')
    expect(adjCells(doux, 'Féminin')[0]).toBe('douce')

    const faux = await inflect('faux', 'adjective')
    expect(adjCells(faux, 'Féminin')[0]).toBe('fausse')

    const léger = await inflect('léger', 'adjective')
    expect(adjCells(léger, 'Féminin')[0]).toBe('légère')

    const menteur = await inflect('menteur', 'adjective')
    expect(adjCells(menteur, 'Féminin')[0]).toBe('menteuse')

    const meilleur = await inflect('meilleur', 'adjective')
    expect(adjCells(meilleur, 'Féminin')[0]).toBe('meilleure')

    const complet = await inflect('complet', 'adjective')
    expect(adjCells(complet, 'Féminin')[0]).toBe('complète')

    const national = await inflect('national', 'adjective')
    expect(adjCells(national, 'Masculin')[1]).toBe('nationaux') // -al -> -aux
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    const adverb = await inflect('vite', 'adverb')
    expect(adverb.kind).toBeNull()
    expect(await FrenchInflector.inflect('parler', 'de', 'verb')).toBeNull()
    expect(await FrenchInflector.inflect('je', 'fr', 'pronoun')).toBeNull() // pronouns -> LLM
  })
})
