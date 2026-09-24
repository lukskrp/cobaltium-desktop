import { describe, expect, it } from 'vitest'
import { ItalianInflector } from '@shared/lang/inflectors/italian'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

function must(p: InflectionParadigm | null): InflectionParadigm {
  if (!p) throw new Error('null paradigm')
  return p
}

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

describe('ItalianInflector', () => {
  // ── Verbs: regular ──────────────────────────────────────────────────────

  it('regular -are verb conjugates', async () => {
    const p = must(await ItalianInflector.inflect('parlare', 'it', 'verb'))
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Presente')
    expect(cell(present, 0)).toBe('parlo')
    expect(cell(present, 1)).toBe('parli')
    expect(cell(present, 2)).toBe('parla')
    expect(cell(present, 3)).toBe('parliamo')
    expect(cell(present, 4)).toBe('parlate')
    expect(cell(present, 5)).toBe('parlano')

    expect(cell(table(p, 'Imperfetto'), 0)).toBe('parlavo')
    expect(cell(table(p, 'Passato remoto'), 0)).toBe('parlai')
    expect(cell(table(p, 'Futuro semplice'), 0)).toBe('parlerò')
    expect(cell(table(p, 'Condizionale presente'), 0)).toBe('parlerei')
    expect(cell(table(p, 'Congiuntivo presente'), 0)).toBe('parli')
    expect(cell(table(p, 'Congiuntivo imperfetto'), 0)).toBe('parlassi')

    const imperative = table(p, 'Imperativo')
    expect(cell(imperative, 0)).toBe('parla')
    expect(cell(imperative, 1)).toBe('parli')
    expect(cell(imperative, 2)).toBe('parliamo')
    expect(cell(imperative, 3)).toBe('parlate')
    expect(cell(imperative, 4)).toBe('parlino')

    expect(cell(table(p, 'Passato prossimo'), 0)).toBe('ho parlato')
    expect(cell(table(p, 'Trapassato prossimo'), 0)).toBe('avevo parlato')

    const nonFinite = table(p, 'Forme non finite')
    expect(cellByLabel(nonFinite, 'Infinito')).toBe('parlare')
    expect(cellByLabel(nonFinite, 'Participio presente')).toBe('parlante')
    expect(cellByLabel(nonFinite, 'Participio passato')).toBe('parlato')
    expect(cellByLabel(nonFinite, 'Gerundio')).toBe('parlando')
  })

  it('applies -are orthographic rules', async () => {
    const cercare = must(await ItalianInflector.inflect('cercare', 'it', 'verb'))
    expect(cell(table(cercare, 'Presente'), 0)).toBe('cerco')
    expect(cell(table(cercare, 'Presente'), 1)).toBe('cerchi')
    expect(cell(table(cercare, 'Presente'), 3)).toBe('cerchiamo')

    const mangiare = must(await ItalianInflector.inflect('mangiare', 'it', 'verb'))
    expect(cell(table(mangiare, 'Presente'), 0)).toBe('mangio')
    expect(cell(table(mangiare, 'Presente'), 1)).toBe('mangi')
    expect(cell(table(mangiare, 'Presente'), 3)).toBe('mangiamo')
    expect(cell(table(mangiare, 'Congiuntivo presente'), 0)).toBe('mangi')
    expect(cell(table(mangiare, 'Imperativo'), 4)).toBe('mangino')
  })

  it('regular -ere verb conjugates', async () => {
    const credere = must(await ItalianInflector.inflect('credere', 'it', 'verb'))
    expect(cell(table(credere, 'Presente'), 0)).toBe('credo')
    expect(cell(table(credere, 'Presente'), 1)).toBe('credi')
    expect(cell(table(credere, 'Presente'), 0)).toBe('credo')
    expect(cell(table(credere, 'Imperfetto'), 0)).toBe('credevo')
    expect(cell(table(credere, 'Passato remoto'), 0)).toBe('credei')
    expect(cell(table(credere, 'Futuro semplice'), 0)).toBe('crederò')
    expect(cell(table(credere, 'Congiuntivo presente'), 0)).toBe('creda')
    expect(cell(table(credere, 'Congiuntivo imperfetto'), 0)).toBe('credessi')
    expect(cellByLabel(table(credere, 'Forme non finite'), 'Participio passato')).toBe('creduto')
  })

  it('conjugates -ire verbs with and without -isc-', async () => {
    const finire = must(await ItalianInflector.inflect('finire', 'it', 'verb'))
    expect(cell(table(finire, 'Presente'), 0)).toBe('finisco')
    expect(cell(table(finire, 'Presente'), 1)).toBe('finisci')
    expect(cell(table(finire, 'Presente'), 5)).toBe('finiscono')
    expect(cell(table(finire, 'Congiuntivo presente'), 0)).toBe('finisca')
    expect(cellByLabel(table(finire, 'Forme non finite'), 'Participio passato')).toBe('finito')

    const dormire = must(await ItalianInflector.inflect('dormire', 'it', 'verb'))
    expect(cell(table(dormire, 'Presente'), 0)).toBe('dormo')
    expect(cell(table(dormire, 'Presente'), 1)).toBe('dormi')
    expect(cell(table(dormire, 'Presente'), 5)).toBe('dormono')
    expect(cell(table(dormire, 'Congiuntivo presente'), 0)).toBe('dorma')
    expect(cell(table(dormire, 'Imperfetto'), 0)).toBe('dormivo')
    expect(cellByLabel(table(dormire, 'Forme non finite'), 'Participio passato')).toBe('dormito')
  })

  it('uses the essere auxiliary for motion verbs', async () => {
    const andare = must(await ItalianInflector.inflect('andare', 'it', 'verb'))
    expect(cell(table(andare, 'Passato prossimo'), 0)).toBe('sono andato')
    expect(cell(table(andare, 'Trapassato prossimo'), 0)).toBe('ero andato')

    const arrivare = must(await ItalianInflector.inflect('arrivare', 'it', 'verb'))
    expect(cell(table(arrivare, 'Passato prossimo'), 0)).toBe('sono arrivato')
  })

  // ── Verbs: irregulars ───────────────────────────────────────────────────

  it('conjugates key irregular verbs', async () => {
    const essere = must(await ItalianInflector.inflect('essere', 'it', 'verb'))
    expect(cell(table(essere, 'Presente'), 0)).toBe('sono')
    expect(cell(table(essere, 'Presente'), 2)).toBe('è')
    expect(cell(table(essere, 'Imperfetto'), 0)).toBe('ero')
    expect(cell(table(essere, 'Passato remoto'), 0)).toBe('fui')
    expect(cell(table(essere, 'Futuro semplice'), 0)).toBe('sarò')
    expect(cell(table(essere, 'Condizionale presente'), 0)).toBe('sarei')
    expect(cell(table(essere, 'Congiuntivo presente'), 0)).toBe('sia')
    expect(cell(table(essere, 'Congiuntivo imperfetto'), 0)).toBe('fossi')
    expect(cell(table(essere, 'Passato prossimo'), 0)).toBe('sono stato')

    const avere = must(await ItalianInflector.inflect('avere', 'it', 'verb'))
    expect(cell(table(avere, 'Presente'), 0)).toBe('ho')
    expect(cell(table(avere, 'Futuro semplice'), 0)).toBe('avrò')
    expect(cell(table(avere, 'Passato remoto'), 0)).toBe('ebbi')
    expect(cellByLabel(table(avere, 'Forme non finite'), 'Participio passato')).toBe('avuto')

    const fare = must(await ItalianInflector.inflect('fare', 'it', 'verb'))
    expect(cell(table(fare, 'Presente'), 0)).toBe('faccio')
    expect(cell(table(fare, 'Futuro semplice'), 0)).toBe('farò')
    expect(cell(table(fare, 'Passato remoto'), 0)).toBe('feci')
    expect(cellByLabel(table(fare, 'Forme non finite'), 'Participio passato')).toBe('fatto')

    const dire = must(await ItalianInflector.inflect('dire', 'it', 'verb'))
    expect(cell(table(dire, 'Presente'), 0)).toBe('dico')
    expect(cell(table(dire, 'Futuro semplice'), 0)).toBe('dirò')
    expect(cell(table(dire, 'Passato remoto'), 0)).toBe('dissi')
    expect(cellByLabel(table(dire, 'Forme non finite'), 'Participio passato')).toBe('detto')

    const potere = must(await ItalianInflector.inflect('potere', 'it', 'verb'))
    expect(cell(table(potere, 'Presente'), 0)).toBe('posso')
    expect(cell(table(potere, 'Presente'), 2)).toBe('può')
    expect(cell(table(potere, 'Futuro semplice'), 0)).toBe('potrò')

    const sapere = must(await ItalianInflector.inflect('sapere', 'it', 'verb'))
    expect(cell(table(sapere, 'Presente'), 0)).toBe('so')
    expect(cell(table(sapere, 'Futuro semplice'), 0)).toBe('saprò')

    const venire = must(await ItalianInflector.inflect('venire', 'it', 'verb'))
    expect(cell(table(venire, 'Presente'), 0)).toBe('vengo')
    expect(cell(table(venire, 'Futuro semplice'), 0)).toBe('verrò')
    expect(cell(table(venire, 'Passato prossimo'), 0)).toBe('sono venuto')

    const bere = must(await ItalianInflector.inflect('bere', 'it', 'verb'))
    expect(cell(table(bere, 'Presente'), 0)).toBe('bevo')
    expect(cell(table(bere, 'Futuro semplice'), 0)).toBe('berrò')
    expect(cellByLabel(table(bere, 'Forme non finite'), 'Participio passato')).toBe('bevuto')

    const prendere = must(await ItalianInflector.inflect('prendere', 'it', 'verb'))
    expect(cell(table(prendere, 'Passato remoto'), 0)).toBe('presi')
    expect(cellByLabel(table(prendere, 'Forme non finite'), 'Participio passato')).toBe('preso')

    const leggere = must(await ItalianInflector.inflect('leggere', 'it', 'verb'))
    expect(cell(table(leggere, 'Passato remoto'), 0)).toBe('lessi')
    expect(cellByLabel(table(leggere, 'Forme non finite'), 'Participio passato')).toBe('letto')

    const mettere = must(await ItalianInflector.inflect('mettere', 'it', 'verb'))
    expect(cellByLabel(table(mettere, 'Forme non finite'), 'Participio passato')).toBe('messo')

    const vedere = must(await ItalianInflector.inflect('vedere', 'it', 'verb'))
    expect(cell(table(vedere, 'Futuro semplice'), 0)).toBe('vedrò')
    expect(cellByLabel(table(vedere, 'Forme non finite'), 'Participio passato')).toBe('visto')

    const rimanere = must(await ItalianInflector.inflect('rimanere', 'it', 'verb'))
    expect(cell(table(rimanere, 'Passato remoto'), 0)).toBe('rimasi')
    expect(cell(table(rimanere, 'Passato prossimo'), 0)).toBe('sono rimasto')

    const piacere = must(await ItalianInflector.inflect('piacere', 'it', 'verb'))
    expect(cell(table(piacere, 'Presente'), 0)).toBe('piaccio')
    expect(cell(table(piacere, 'Passato prossimo'), 0)).toBe('sono piaciuto')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('pluralizes nouns', async () => {
    const ragazzo = must(await ItalianInflector.inflect('ragazzo', 'it', 'noun'))
    expect(ragazzo.kind).toBe('declension')
    expect(ragazzo.tables[0].rows[0].cells).toEqual(['ragazzo', 'ragazzi'])

    async function pluralOf(word: string): Promise<string> {
      return must(await ItalianInflector.inflect(word, 'it', 'noun')).tables[0].rows[0].cells[1]
    }

    expect(await pluralOf('casa')).toBe('case')
    expect(await pluralOf('cane')).toBe('cani')
    expect(await pluralOf('amica')).toBe('amiche')
    expect(await pluralOf('collega')).toBe('colleghe')
    expect(await pluralOf('amico')).toBe('amici')
    expect(await pluralOf('albergo')).toBe('alberghi')
    expect(await pluralOf('medico')).toBe('medici')
    expect(await pluralOf('spiaggia')).toBe('spiagge')
    expect(await pluralOf('città')).toBe('città')
    expect(await pluralOf('film')).toBe('film')
    expect(await pluralOf('uomo')).toBe('uomini')
    expect(['mano', await pluralOf('mano')]).toEqual(['mano', 'mani'])
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  function adjCells(p: InflectionParadigm, gender: string): string[] {
    const found = p.tables[0].rows.find((r) => r.label === gender)
    if (!found) throw new Error(`missing row ${gender}`)
    return found.cells
  }

  it('agrees adjectives in gender and number', async () => {
    const bello = must(await ItalianInflector.inflect('bello', 'it', 'adjective'))
    expect(adjCells(bello, 'Maschile')).toEqual(['bello', 'belli'])
    expect(adjCells(bello, 'Femminile')).toEqual(['bella', 'belle'])

    const grande = must(await ItalianInflector.inflect('grande', 'it', 'adjective'))
    expect(adjCells(grande, 'Maschile')).toEqual(['grande', 'grandi'])
    expect(adjCells(grande, 'Femminile')).toEqual(['grande', 'grandi'])
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classifies and falls back', async () => {
    const adverb = must(await ItalianInflector.inflect('bene', 'it', 'adverb'))
    expect(adverb.kind).toBeNull()
    expect(await ItalianInflector.inflect('parlare', 'de', 'verb')).toBeNull()
    expect(await ItalianInflector.inflect('io', 'it', 'pronoun')).toBeNull()
  })
})
