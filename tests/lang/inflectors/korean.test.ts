import { describe, expect, it } from 'vitest'
import { KoreanInflector } from '@shared/lang/inflectors/korean'
import { paradigmIsEmpty } from '@shared/lang/inflection'
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

describe('KoreanInflector', () => {
  // ── Curated verbs ─────────────────────────────────────────────────────

  it('hadaConjugates', async () => {
    const p = await KoreanInflector.inflect('하다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(p.kind).toBe('conjugation')
    expect(table(p, '현재').columns).toEqual(['형태'])
    expect(table(p, '현재').rows[0].label).toBe('해요체')
    expect(cell(table(p, '현재'), 0)).toBe('해요')
    expect(cell(table(p, '과거'), 0)).toBe('했어요')
    expect(cell(table(p, '미래'), 0)).toBe('할 거예요')
    const high = table(p, '높임말')
    expect(cellByLabel(high, '해요체')).toBe('해요')
    expect(cellByLabel(high, '해체')).toBe('해')
    expect(cellByLabel(high, '합쇼체')).toBe('합니다')
  })

  it('gadaConjugates', async () => {
    const p = await KoreanInflector.inflect('가다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(cell(table(p, '현재'), 0)).toBe('가요')
    expect(cell(table(p, '과거'), 0)).toBe('갔어요')
    expect(cell(table(p, '미래'), 0)).toBe('갈 거예요')
    expect(cellByLabel(table(p, '높임말'), '합쇼체')).toBe('갑니다')
  })

  it('odaConjugates', async () => {
    const p = await KoreanInflector.inflect('오다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(cell(table(p, '현재'), 0)).toBe('와요')
    expect(cell(table(p, '과거'), 0)).toBe('왔어요')
    expect(cell(table(p, '미래'), 0)).toBe('올 거예요')
    expect(cellByLabel(table(p, '높임말'), '합쇼체')).toBe('옵니다')
  })

  it('bodaConjugates', async () => {
    const p = await KoreanInflector.inflect('보다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(cell(table(p, '현재'), 0)).toBe('봐요')
    expect(cell(table(p, '과거'), 0)).toBe('봤어요')
    expect(cell(table(p, '미래'), 0)).toBe('볼 거예요')
  })

  it('meokdaConjugates', async () => {
    const p = await KoreanInflector.inflect('먹다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(cell(table(p, '현재'), 0)).toBe('먹어요')
    expect(cell(table(p, '과거'), 0)).toBe('먹었어요')
    expect(cell(table(p, '미래'), 0)).toBe('먹을 거예요')
    expect(cellByLabel(table(p, '높임말'), '합쇼체')).toBe('먹습니다')
  })

  it('masidaContracts', async () => {
    const p = await KoreanInflector.inflect('마시다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(cell(table(p, '현재'), 0)).toBe('마셔요') // 시 + 어요 -> 셔요
    expect(cell(table(p, '과거'), 0)).toBe('마셨어요')
    expect(cell(table(p, '미래'), 0)).toBe('마실 거예요')
  })

  // ── Generic derivation ────────────────────────────────────────────────

  it('genericVerbDerivesFromStem', async () => {
    // 만나다 is not in the curated map: 만나 + 아요 -> 만나요, 만나 + 았어요 -> 만났어요.
    const p = await KoreanInflector.inflect('만나다', 'ko', 'verb')
    if (!p) throw new Error('null paradigm')
    expect(p.kind).toBe('conjugation')
    expect(cell(table(p, '현재'), 0)).toBe('만나요')
    expect(cell(table(p, '과거'), 0)).toBe('만났어요')
    expect(cell(table(p, '미래'), 0)).toBe('만날 거예요')
  })

  it('adjectiveConjugatesLikeVerb', async () => {
    const p = await KoreanInflector.inflect('좋다', 'ko', 'adjective')
    if (!p) throw new Error('null paradigm')
    expect(p.kind).toBe('conjugation')
    expect(cell(table(p, '현재'), 0)).toBe('좋아요')
    expect(cell(table(p, '과거'), 0)).toBe('좋았어요')
    expect(cell(table(p, '미래'), 0)).toBe('좋을 거예요')
  })

  // ── Classification & fallback ─────────────────────────────────────────

  it('blankPosUsesHeuristic', async () => {
    const verb = await KoreanInflector.inflect('가다', 'ko', null)
    if (!verb) throw new Error('null paradigm')
    expect(verb.kind).toBe('conjugation')
    expect(cell(table(verb, '현재'), 0)).toBe('가요')

    const noun = await KoreanInflector.inflect('물', 'ko', null)
    if (!noun) throw new Error('null paradigm')
    expect(noun.kind).toBeNull()
  })

  it('nounReturnsKindNullNote', async () => {
    const p = await KoreanInflector.inflect('사람', 'ko', 'noun')
    if (!p) throw new Error('null paradigm')
    expect(p.kind).toBeNull()
    expect(paradigmIsEmpty(p)).toBe(true)
    expect(p.note).toBe(
      '조사(은/는, 이/가, 을/를, 에)는 굴절이 아니라 후치사입니다. 명사는 형태가 변하지 않습니다.'
    )
  })

  it('returnsNullForUnhandledInput', async () => {
    expect(await KoreanInflector.inflect('가다', 'en', 'verb')).toBeNull() // lang mismatch
    expect(await KoreanInflector.inflect('', 'ko', 'verb')).toBeNull() // blank lemma
    expect(await KoreanInflector.inflect('  ', 'ko', 'noun')).toBeNull() // blank lemma
    expect(await KoreanInflector.inflect('아주', 'ko', 'adverb')).toBeNull() // unhandled POS
  })
})
