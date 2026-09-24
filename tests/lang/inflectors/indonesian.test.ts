import { describe, expect, it } from 'vitest'
import { IndonesianInflector } from '@shared/lang/inflectors/indonesian'

describe('IndonesianInflector', () => {
  it('pluralizes nouns by reduplication', async () => {
    const paradigm = await IndonesianInflector.inflect('buku', 'id', 'noun')
    expect(paradigm).not.toBeNull()
    expect(paradigm?.kind).toBe('declension')
    expect(paradigm?.tables[0].rows[0].cells).toEqual(['buku', 'buku-buku'])
  })

  it('reports that verbs do not conjugate', async () => {
    const paradigm = await IndonesianInflector.inflect('makan', 'id', 'verb')
    expect(paradigm?.kind).toBeNull()
    expect(paradigm?.note).toContain('berkonjugasi')
  })

  it('does not inflect other parts of speech, and rejects other languages', async () => {
    const paradigm = await IndonesianInflector.inflect('bagus', 'id', 'adjective')
    expect(paradigm?.kind).toBeNull()
    expect(await IndonesianInflector.inflect('makan', 'sv', 'verb')).toBeNull()
  })
})
