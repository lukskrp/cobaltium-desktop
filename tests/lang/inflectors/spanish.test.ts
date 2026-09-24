import { describe, expect, it } from 'vitest'
import { SpanishInflector } from '@shared/lang/inflectors/spanish'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const t = p.tables.find((x) => x.title === title)
  if (!t) throw new Error(`missing table: ${title}`)
  return t
}

async function mustInflect(
  lemma: string,
  lang: string,
  pos: string | null
): Promise<InflectionParadigm> {
  const p = await SpanishInflector.inflect(lemma, lang, pos)
  if (!p) throw new Error('null paradigm')
  return p
}

describe('SpanishInflector', () => {
  it('regularArVerbConjugates', async () => {
    const p = await mustInflect('hablar', 'es', 'verb')
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Presente')
    expect(present.rows[0].cells[0]).toBe('hablo')
    expect(present.rows[5].cells[0]).toBe('hablan')
    expect(present.rows[0].label).toBe('yo')

    const preterite = table(p, 'Pretérito perfecto simple')
    expect(preterite.rows[0].cells[0]).toBe('hablé')
    expect(preterite.rows[5].cells[0]).toBe('hablaron')

    const imperfect = table(p, 'Pretérito imperfecto')
    expect(imperfect.rows[0].cells[0]).toBe('hablaba')

    const future = table(p, 'Futuro simple')
    expect(future.rows[0].cells[0]).toBe('hablaré')

    const perfect = table(p, 'Pretérito perfecto compuesto')
    expect(perfect.rows[0].cells[0]).toBe('he hablado')
    expect(perfect.rows[5].cells[0]).toBe('han hablado')

    const subj = table(p, 'Presente de subjuntivo')
    expect(subj.rows[0].cells[0]).toBe('hable')

    const imperative = table(p, 'Imperativo')
    expect(imperative.rows[0].cells[0]).toBe('habla')
    expect(imperative.rows[4].cells[0]).toBe('hablen')

    const nonFinite = table(p, 'Formas no personales')
    expect(nonFinite.rows[0].cells[0]).toBe('hablar')
    expect(nonFinite.rows[1].cells[0]).toBe('hablando')
    expect(nonFinite.rows[2].cells[0]).toBe('hablado')
  })

  it('erAndIrVerbsConjugate', async () => {
    const comer = await mustInflect('comer', 'es', 'verb')
    const preterite = table(comer, 'Pretérito perfecto simple')
    expect(preterite.rows[0].cells[0]).toBe('comí')
    expect(preterite.rows[5].cells[0]).toBe('comieron')

    const vivir = await mustInflect('vivir', 'es', 'verb')
    const subj = table(vivir, 'Presente de subjuntivo')
    expect(subj.rows[0].cells[0]).toBe('viva')
    expect(subj.rows[5].cells[0]).toBe('vivan')
    expect(table(vivir, 'Formas no personales').rows[1].cells[0]).toBe('viviendo')
    expect(table(vivir, 'Formas no personales').rows[0].cells[0]).toBe('vivir')
  })

  it('irregularSerConjugates', async () => {
    const p = await mustInflect('ser', 'es', 'verb')
    expect(table(p, 'Presente').rows[0].cells[0]).toBe('soy')
    expect(table(p, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('fue')
    expect(table(p, 'Formas no personales').rows[2].cells[0]).toBe('sido')
    expect(table(p, 'Formas no personales').rows[1].cells[0]).toBe('siendo')
  })

  it('irregularIrHacerAndTenerConjugate', async () => {
    const ir = await mustInflect('ir', 'es', 'verb')
    expect(table(ir, 'Presente').rows[0].cells[0]).toBe('voy')
    expect(table(ir, 'Formas no personales').rows[1].cells[0]).toBe('yendo')

    const hacer = await mustInflect('hacer', 'es', 'verb')
    expect(table(hacer, 'Presente').rows[0].cells[0]).toBe('hago')
    expect(table(hacer, 'Formas no personales').rows[2].cells[0]).toBe('hecho')

    const tener = await mustInflect('tener', 'es', 'verb')
    expect(table(tener, 'Futuro simple').rows[0].cells[0]).toBe('tendré')
    expect(table(tener, 'Presente de subjuntivo').rows[0].cells[0]).toBe('tenga')
  })

  it('nounDeclinesByNumber', async () => {
    const gato = await mustInflect('gato', 'es', 'noun')
    expect(gato.kind).toBe('declension')
    const t = gato.tables[0]
    expect(t.rows[0].cells[0]).toBe('gato')
    expect(t.rows[0].cells[1]).toBe('gatos')

    expect(
      (await mustInflect('lápiz', 'es', 'noun')).tables[0].rows[0].cells[1]
    ).toBe('lápices')
    expect(
      (await mustInflect('canción', 'es', 'noun')).tables[0].rows[0].cells[1]
    ).toBe('canciones')
    expect(
      (await mustInflect('ciudad', 'es', 'noun')).tables[0].rows[0].cells[1]
    ).toBe('ciudades')
    expect(
      (await mustInflect('café', 'es', 'noun')).tables[0].rows[0].cells[1]
    ).toBe('cafés')
    expect(
      (await mustInflect('lunes', 'es', 'noun')).tables[0].rows[0].cells[1]
    ).toBe('lunes')
  })

  it('adjectiveDeclinesByGenderAndNumber', async () => {
    const bueno = await mustInflect('bueno', 'es', 'adjective')
    const t = bueno.tables[0]
    expect(t.rows[0].cells[0]).toBe('bueno')
    expect(t.rows[0].cells[1]).toBe('buenos')
    expect(t.rows[1].cells[0]).toBe('buena')
    expect(t.rows[1].cells[1]).toBe('buenas')

    const grande = await mustInflect('grande', 'es', 'adjective')
    expect(grande.tables[0].rows[1].cells[0]).toBe('grande') // invariable feminine
  })

  it('nonInflectingPosReturnsNullKind', async () => {
    const p = await mustInflect('muy', 'es', 'adverb')
    expect(p.kind).toBeNull()
  })

  it('otherLanguagesReturnNull', async () => {
    expect(await SpanishInflector.inflect('hablar', 'fi', 'verb')).toBeNull()
  })

  // ── Orthographic (spelling) rules ───────────────────────────────────────

  it('carGarZarChangePreteriteAndSubjunctive', async () => {
    const buscar = await mustInflect('buscar', 'es', 'verb')
    expect(table(buscar, 'Presente').rows[0].cells[0]).toBe('busco')
    expect(table(buscar, 'Pretérito perfecto simple').rows[0].cells[0]).toBe('busqué')
    expect(table(buscar, 'Presente de subjuntivo').rows[0].cells[0]).toBe('busque')
    expect(table(buscar, 'Presente de subjuntivo').rows[3].cells[0]).toBe('busquemos')

    const llegar = await mustInflect('llegar', 'es', 'verb')
    expect(table(llegar, 'Pretérito perfecto simple').rows[0].cells[0]).toBe('llegué')
    expect(table(llegar, 'Presente de subjuntivo').rows[3].cells[0]).toBe('lleguemos')

    const empezar = await mustInflect('empezar', 'es', 'verb')
    expect(table(empezar, 'Presente').rows[0].cells[0]).toBe('empiezo')
    expect(table(empezar, 'Pretérito perfecto simple').rows[0].cells[0]).toBe('empecé')
    expect(table(empezar, 'Presente de subjuntivo').rows[0].cells[0]).toBe('empiece')
    expect(table(empezar, 'Presente de subjuntivo').rows[3].cells[0]).toBe('empecemos')
  })

  it('cerCirGerGirAndUirChangePresentAndSubjunctive', async () => {
    const conocer = await mustInflect('conocer', 'es', 'verb')
    expect(table(conocer, 'Presente').rows[0].cells[0]).toBe('conozco')
    expect(table(conocer, 'Presente de subjuntivo').rows[0].cells[0]).toBe('conozca')
    expect(table(conocer, 'Presente de subjuntivo').rows[3].cells[0]).toBe('conozcamos')

    const conducir = await mustInflect('conducir', 'es', 'verb')
    expect(table(conducir, 'Presente').rows[0].cells[0]).toBe('conduzco')

    const vencer = await mustInflect('vencer', 'es', 'verb')
    expect(table(vencer, 'Presente').rows[0].cells[0]).toBe('venzo')
    expect(table(vencer, 'Presente de subjuntivo').rows[0].cells[0]).toBe('venza')

    const coger = await mustInflect('coger', 'es', 'verb')
    expect(table(coger, 'Presente').rows[0].cells[0]).toBe('cojo')
    expect(table(coger, 'Presente de subjuntivo').rows[0].cells[0]).toBe('coja')

    const distinguir = await mustInflect('distinguir', 'es', 'verb')
    expect(table(distinguir, 'Presente').rows[0].cells[0]).toBe('distingo')

    const construir = await mustInflect('construir', 'es', 'verb')
    expect(table(construir, 'Presente').rows[0].cells[0]).toBe('construyo')
    expect(table(construir, 'Presente').rows[2].cells[0]).toBe('construye')
    expect(table(construir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('construyó')
    expect(table(construir, 'Presente de subjuntivo').rows[0].cells[0]).toBe('construya')
    expect(table(construir, 'Formas no personales').rows[1].cells[0]).toBe('construyendo')
  })

  // ── Stem changes ────────────────────────────────────────────────────────

  it('stemChangingPresent', async () => {
    const pensar = await mustInflect('pensar', 'es', 'verb')
    const pres = table(pensar, 'Presente')
    expect(pres.rows[0].cells[0]).toBe('pienso')
    expect(pres.rows[1].cells[0]).toBe('piensas')
    expect(pres.rows[5].cells[0]).toBe('piensan')
    expect(pres.rows[3].cells[0]).toBe('pensamos') // nosotros keeps the original stem

    const volver = await mustInflect('volver', 'es', 'verb')
    expect(table(volver, 'Presente').rows[0].cells[0]).toBe('vuelvo')

    const pedir = await mustInflect('pedir', 'es', 'verb')
    expect(table(pedir, 'Presente').rows[0].cells[0]).toBe('pido')
    expect(table(pedir, 'Presente').rows[3].cells[0]).toBe('pedimos')

    const dormir = await mustInflect('dormir', 'es', 'verb')
    expect(table(dormir, 'Presente').rows[0].cells[0]).toBe('duermo')
    expect(table(dormir, 'Presente').rows[5].cells[0]).toBe('duermen')

    const jugar = await mustInflect('jugar', 'es', 'verb')
    expect(table(jugar, 'Presente').rows[0].cells[0]).toBe('juego')
    expect(table(jugar, 'Presente').rows[3].cells[0]).toBe('jugamos')

    const seguir = await mustInflect('seguir', 'es', 'verb')
    expect(table(seguir, 'Presente').rows[0].cells[0]).toBe('sigo')
    expect(table(seguir, 'Presente').rows[5].cells[0]).toBe('siguen')

    const preferir = await mustInflect('preferir', 'es', 'verb')
    expect(table(preferir, 'Presente').rows[0].cells[0]).toBe('prefiero')
    expect(table(preferir, 'Presente').rows[3].cells[0]).toBe('preferimos')

    const corregir = await mustInflect('corregir', 'es', 'verb')
    expect(table(corregir, 'Presente').rows[0].cells[0]).toBe('corrijo')
    expect(table(corregir, 'Presente').rows[2].cells[0]).toBe('corrige')
  })

  it('stemChangingPreteriteThirdPerson', async () => {
    const pedir = await mustInflect('pedir', 'es', 'verb')
    const pret = table(pedir, 'Pretérito perfecto simple')
    expect(pret.rows[0].cells[0]).toBe('pedí')
    expect(pret.rows[2].cells[0]).toBe('pidió')
    expect(pret.rows[5].cells[0]).toBe('pidieron')

    const dormir = await mustInflect('dormir', 'es', 'verb')
    expect(table(dormir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('durmió')
    expect(table(dormir, 'Pretérito perfecto simple').rows[5].cells[0]).toBe('durmieron')

    const preferir = await mustInflect('preferir', 'es', 'verb')
    expect(table(preferir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('prefirió')

    const seguir = await mustInflect('seguir', 'es', 'verb')
    expect(table(seguir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('siguió')
  })

  it('stemChangingSubjunctive', async () => {
    const pensar = await mustInflect('pensar', 'es', 'verb')
    const pensarSubj = table(pensar, 'Presente de subjuntivo')
    expect(pensarSubj.rows[0].cells[0]).toBe('piense')
    expect(pensarSubj.rows[3].cells[0]).toBe('pensemos') // -ar reverts for nosotros

    const volver = await mustInflect('volver', 'es', 'verb')
    const volverSubj = table(volver, 'Presente de subjuntivo')
    expect(volverSubj.rows[0].cells[0]).toBe('vuelva')
    expect(volverSubj.rows[3].cells[0]).toBe('volvamos') // -er reverts for nosotros

    const pedir = await mustInflect('pedir', 'es', 'verb')
    const pedirSubj = table(pedir, 'Presente de subjuntivo')
    expect(pedirSubj.rows[0].cells[0]).toBe('pida')
    expect(pedirSubj.rows[3].cells[0]).toBe('pidamos') // -ir keeps the change

    const dormir = await mustInflect('dormir', 'es', 'verb')
    expect(table(dormir, 'Presente de subjuntivo').rows[3].cells[0]).toBe('durmamos')

    const preferir = await mustInflect('preferir', 'es', 'verb')
    expect(table(preferir, 'Presente de subjuntivo').rows[3].cells[0]).toBe('prefiramos')

    const almorzar = await mustInflect('almorzar', 'es', 'verb')
    const almorzarSubj = table(almorzar, 'Presente de subjuntivo')
    expect(almorzarSubj.rows[0].cells[0]).toBe('almuerce')
    expect(almorzarSubj.rows[3].cells[0]).toBe('almorcemos')

    const rogar = await mustInflect('rogar', 'es', 'verb')
    expect(table(rogar, 'Presente de subjuntivo').rows[3].cells[0]).toBe('roguemos')

    const corregir = await mustInflect('corregir', 'es', 'verb')
    expect(table(corregir, 'Presente de subjuntivo').rows[3].cells[0]).toBe('corrijamos')
  })

  it('stemChangingGerundsParticiplesAndImperative', async () => {
    const pedir = await mustInflect('pedir', 'es', 'verb')
    expect(table(pedir, 'Formas no personales').rows[1].cells[0]).toBe('pidiendo')
    expect(table(pedir, 'Imperativo').rows[0].cells[0]).toBe('pide')
    expect(table(pedir, 'Imperativo').rows[3].cells[0]).toBe('pedid')

    const dormir = await mustInflect('dormir', 'es', 'verb')
    expect(table(dormir, 'Formas no personales').rows[1].cells[0]).toBe('durmiendo')
    expect(table(dormir, 'Imperativo').rows[0].cells[0]).toBe('duerme')

    const preferir = await mustInflect('preferir', 'es', 'verb')
    expect(table(preferir, 'Formas no personales').rows[1].cells[0]).toBe('prefiriendo')

    const seguir = await mustInflect('seguir', 'es', 'verb')
    expect(table(seguir, 'Formas no personales').rows[1].cells[0]).toBe('siguiendo')
    expect(table(seguir, 'Imperativo').rows[3].cells[0]).toBe('seguid')

    const pensar = await mustInflect('pensar', 'es', 'verb')
    expect(table(pensar, 'Imperativo').rows[0].cells[0]).toBe('piensa')
    expect(table(pensar, 'Imperativo').rows[3].cells[0]).toBe('pensad')

    const volver = await mustInflect('volver', 'es', 'verb')
    expect(table(volver, 'Formas no personales').rows[2].cells[0]).toBe('vuelto')
    expect(table(volver, 'Imperativo').rows[0].cells[0]).toBe('vuelve')

    const morir = await mustInflect('morir', 'es', 'verb')
    expect(table(morir, 'Formas no personales').rows[2].cells[0]).toBe('muerto')

    const abrir = await mustInflect('abrir', 'es', 'verb')
    expect(table(abrir, 'Formas no personales').rows[2].cells[0]).toBe('abierto')

    const construir = await mustInflect('construir', 'es', 'verb')
    expect(table(construir, 'Imperativo').rows[3].cells[0]).toBe('construid')
  })

  it('additionalIrregularVerbs', async () => {
    const salir = await mustInflect('salir', 'es', 'verb')
    expect(table(salir, 'Presente').rows[0].cells[0]).toBe('salgo')
    expect(table(salir, 'Futuro simple').rows[0].cells[0]).toBe('saldré')

    const traer = await mustInflect('traer', 'es', 'verb')
    expect(table(traer, 'Presente').rows[0].cells[0]).toBe('traigo')
    expect(table(traer, 'Pretérito perfecto simple').rows[0].cells[0]).toBe('traje')

    const oir = await mustInflect('oír', 'es', 'verb')
    expect(table(oir, 'Presente').rows[0].cells[0]).toBe('oigo')
    expect(table(oir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('oyó')

    const caer = await mustInflect('caer', 'es', 'verb')
    expect(table(caer, 'Presente').rows[0].cells[0]).toBe('caigo')
    expect(table(caer, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('cayó')

    const andar = await mustInflect('andar', 'es', 'verb')
    expect(table(andar, 'Pretérito perfecto simple').rows[0].cells[0]).toBe('anduve')

    const caber = await mustInflect('caber', 'es', 'verb')
    expect(table(caber, 'Presente').rows[0].cells[0]).toBe('quepo')
    expect(table(caber, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('cupo')

    const valer = await mustInflect('valer', 'es', 'verb')
    expect(table(valer, 'Presente').rows[0].cells[0]).toBe('valgo')

    const reir = await mustInflect('reír', 'es', 'verb')
    expect(table(reir, 'Presente').rows[0].cells[0]).toBe('río')
    expect(table(reir, 'Pretérito perfecto simple').rows[2].cells[0]).toBe('rió')
    expect(table(reir, 'Formas no personales').rows[1].cells[0]).toBe('riendo')
  })
})
