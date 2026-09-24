import { describe, expect, it } from 'vitest'
import { HindiInflector } from '@shared/lang/inflectors/hindi'
import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '@shared/lang/inflection'

function require(paradigm: InflectionParadigm | null): InflectionParadigm {
  if (paradigm === null) throw new Error('null paradigm')
  return paradigm
}

function table(paradigm: InflectionParadigm, title: string): ParadigmTable {
  const found = paradigm.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function row(paradigmTable: ParadigmTable, label: string): ParadigmRow {
  const found = paradigmTable.rows.find((r) => r.label === label)
  if (!found) throw new Error(`missing row ${label}`)
  return found
}

describe('HindiInflector', () => {
  it('janaConjugatesAllTenses', async () => {
    const p = require(await HindiInflector.inflect('जाना', 'hi', 'verb'))
    expect(p.kind).toBe('conjugation')
    expect(p.lang).toBe('hi')

    const present = table(p, 'वर्तमान काल')
    expect(present.columns).toEqual(['पुल्लिंग', 'स्त्रीलिंग'])
    expect(row(present, 'मैं').cells).toEqual(['जाता हूँ', 'जाती हूँ'])
    expect(row(present, 'तुम').cells).toEqual(['जाते हो', 'जाती हो'])
    expect(row(present, 'वह').cells).toEqual(['जाता है', 'जाती है'])
    expect(row(present, 'हम').cells).toEqual(['जाते हैं', 'जाती हैं'])
    expect(row(present, 'वे').cells).toEqual(['जाते हैं', 'जाती हैं'])

    const past = table(p, 'भूतकाल')
    expect(past.rows.map((r) => r.cells[0])).toEqual(['गया', 'गए', 'गई', 'गईं'])

    const future = table(p, 'भविष्यत् काल')
    expect(row(future, 'मैं').cells).toEqual(['जाऊँगा', 'जाऊँगी'])
    expect(row(future, 'तुम').cells).toEqual(['जाओगे', 'जाओगी'])
    expect(row(future, 'वह').cells).toEqual(['जाएगा', 'जाएगी'])
    expect(row(future, 'हम').cells).toEqual(['जाएँगे', 'जाएँगी'])

    const imperative = table(p, 'आज्ञार्थ')
    expect(row(imperative, 'तू').cells[0]).toBe('जा')
    expect(row(imperative, 'तुम').cells[0]).toBe('जाओ')
    expect(row(imperative, 'आप').cells[0]).toBe('जाइए')
  })

  it('honaHasIrregularAuxiliaryAndContractedFuture', async () => {
    const p = require(await HindiInflector.inflect('होना', 'hi', 'verb'))

    const present = table(p, 'वर्तमान काल')
    expect(row(present, 'मैं').cells).toEqual(['होता हूँ', 'होती हूँ'])
    expect(row(present, 'वह').cells).toEqual(['होता है', 'होती है'])
    expect(row(present, 'हम').cells).toEqual(['होते हैं', 'होती हैं'])

    const past = table(p, 'भूतकाल')
    expect(past.rows.map((r) => r.cells[0])).toEqual(['हुआ', 'हुए', 'हुई', 'हुईं'])

    const future = table(p, 'भविष्यत् काल')
    expect(row(future, 'मैं').cells).toEqual(['हूँगा', 'हूँगी'])
  })

  it('karnaPastParticipleAgrees', async () => {
    const p = require(await HindiInflector.inflect('करना', 'hi', 'verb'))
    const past = table(p, 'भूतकाल')
    expect(row(past, 'पुल्लिंग एकवचन').cells[0]).toBe('किया')
    expect(row(past, 'पुल्लिंग बहुवचन').cells[0]).toBe('किए')
    expect(row(past, 'स्त्रीलिंग एकवचन').cells[0]).toBe('की')
    expect(row(past, 'स्त्रीलिंग बहुवचन').cells[0]).toBe('कीं')
  })

  it('unknownVerbFallsThroughToLlm', async () => {
    expect(await HindiInflector.inflect('सोचना', 'hi', 'verb')).toBeNull()
  })

  it('nounDeclensionClasses', async () => {
    const kitab = require(await HindiInflector.inflect('किताब', 'hi', 'noun'))
    expect(kitab.kind).toBe('declension')
    expect(row(table(kitab, 'संज्ञा रूपांतरण'), 'प्रत्यक्ष').cells).toEqual(['किताब', 'किताबें'])
    expect(row(table(kitab, 'संज्ञा रूपांतरण'), 'तिर्यक').cells).toEqual(['किताब', 'किताबों'])

    const ladka = require(await HindiInflector.inflect('लड़का', 'hi', 'noun'))
    expect(row(table(ladka, 'संज्ञा रूपांतरण'), 'प्रत्यक्ष').cells).toEqual(['लड़का', 'लड़के'])
    expect(row(table(ladka, 'संज्ञा रूपांतरण'), 'तिर्यक').cells).toEqual(['लड़के', 'लड़कों'])

    const ladki = require(await HindiInflector.inflect('लड़की', 'hi', 'noun'))
    expect(row(table(ladki, 'संज्ञा रूपांतरण'), 'प्रत्यक्ष').cells).toEqual(['लड़की', 'लड़कियाँ'])
    expect(row(table(ladki, 'संज्ञा रूपांतरण'), 'तिर्यक').cells).toEqual(['लड़की', 'लड़कियों'])
  })

  it('classificationAndFallback', async () => {
    const adjective = require(await HindiInflector.inflect('अच्छा', 'hi', 'adjective'))
    expect(adjective.kind).toBeNull()

    expect(await HindiInflector.inflect('जाना', 'en', 'verb')).toBeNull()
    expect(await HindiInflector.inflect('मैं', 'hi', 'pronoun')).toBeNull()
    expect(await HindiInflector.inflect('यहाँ', 'hi', 'adverb')).toBeNull()

    expect(HindiInflector.engine).toBe('hi-bundled')
    const blankPos = require(await HindiInflector.inflect('किताब', 'hi', null))
    expect(blankPos.kind).toBe('declension')
  })
})
