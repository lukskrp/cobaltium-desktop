import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/renderer/src/lib/ipc', () => ({
  getApi: vi.fn(() => null)
}))
vi.mock('../src/renderer/src/lib/sound', () => ({
  playSaveSound: vi.fn()
}))

const { useLexiconStore } = await import('../src/renderer/src/features/lexicon/lexicon-store')
const { useChatToolbarStore } = await import('../src/renderer/src/features/chat/chat-toolbar-store')
const { getApi } = await import('../src/renderer/src/lib/ipc')
const { playSaveSound } = await import('../src/renderer/src/lib/sound')

const mockedGetApi = getApi as ReturnType<typeof vi.fn>
const mockedPlaySaveSound = playSaveSound as ReturnType<typeof vi.fn>

interface SavedCall {
  word?: string
  phrase?: string
  lang?: string
  translation?: string
}

function fakeApi(failWith?: unknown): { calls: SavedCall[] } {
  const calls: SavedCall[] = []
  mockedGetApi.mockReturnValue({
    lexicon: {
      saveWord: vi.fn(async (entry: SavedCall) => {
        if (failWith) throw failWith
        calls.push(entry)
        return true
      }),
      savePhrase: vi.fn(async (entry: SavedCall) => {
        if (failWith) throw failWith
        calls.push(entry)
        return true
      }),
      words: vi.fn(async () => []),
      folders: vi.fn(async () => []),
      phrases: vi.fn(async () => [])
    }
  })
  return { calls }
}

beforeEach(() => {
  vi.clearAllMocks()
  useLexiconStore.setState({ words: [], folders: [], phrases: [], loaded: false })
  useChatToolbarStore.setState({
    selectMode: false,
    glossaryMode: false,
    granularSave: false,
    selection: null,
    glossaryTarget: null,
    saveError: null,
    toastTick: 0
  })
})

describe('toolbar select → save', () => {
  it('saves a single selected word and clears the selection', async () => {
    const { calls } = fakeApi()
    const toolbar = useChatToolbarStore.getState()
    toolbar.toggleSelection('msg-1', 'fi', 'source text', 2, 'talo')
    expect(useChatToolbarStore.getState().selection?.words).toHaveLength(1)

    const ok = await useChatToolbarStore.getState().saveSelection()
    expect(ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ word: 'talo', lang: 'fi' })
    expect(useChatToolbarStore.getState().selection).toBeNull()
    expect(useChatToolbarStore.getState().saveError).toBeNull()
    expect(useChatToolbarStore.getState().toastTick).toBe(1)
  })

  it('saves multiple selected words as a phrase', async () => {
    const { calls } = fakeApi()
    const toolbar = useChatToolbarStore.getState()
    toolbar.toggleSelection('msg-1', 'fi', 'source text', 0, 'hyvää')
    toolbar.toggleSelection('msg-1', 'fi', 'source text', 1, 'päivää')
    const ok = await useChatToolbarStore.getState().saveSelection()
    expect(ok).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ phrase: 'hyvää päivää', lang: 'fi' })
  })

  it('surfaces save failures instead of failing silently', async () => {
    fakeApi(new Error('disk full'))
    const toolbar = useChatToolbarStore.getState()
    toolbar.toggleSelection('msg-1', 'fi', 'source text', 0, 'talo')
    const ok = await useChatToolbarStore.getState().saveSelection()
    expect(ok).toBe(false)
    expect(useChatToolbarStore.getState().saveError).toBe('disk full')
    // selection is kept so the user can retry
    expect(useChatToolbarStore.getState().selection?.words).toHaveLength(1)
  })

  it('does nothing without a selection', async () => {
    const { calls } = fakeApi()
    const ok = await useChatToolbarStore.getState().saveSelection()
    expect(ok).toBe(false)
    expect(calls).toHaveLength(0)
    expect(mockedPlaySaveSound).not.toHaveBeenCalled()
  })

  it('clears the highlight immediately while persistence is pending', async () => {
    let resolveSave!: (value: boolean) => void
    const gate = new Promise<boolean>((resolve) => {
      resolveSave = resolve
    })
    mockedGetApi.mockReturnValue({
      lexicon: {
        saveWord: vi.fn(() => gate.then(() => true)),
        savePhrase: vi.fn(() => gate.then(() => true)),
        words: vi.fn(async () => []),
        folders: vi.fn(async () => []),
        phrases: vi.fn(async () => [])
      }
    })
    useChatToolbarStore.getState().toggleSelection('msg-1', 'fi', 'source text', 2, 'talo')
    const tickBefore = useChatToolbarStore.getState().toastTick
    const pending = useChatToolbarStore.getState().saveSelection()
    // optimistic: highlight cleared + feedback fired before IPC resolves
    expect(useChatToolbarStore.getState().selection).toBeNull()
    expect(mockedPlaySaveSound).toHaveBeenCalledTimes(1)
    expect(useChatToolbarStore.getState().toastTick).toBe(tickBefore + 1)
    resolveSave(true)
    expect(await pending).toBe(true)
    expect(mockedPlaySaveSound).toHaveBeenCalledTimes(1)
  })
})

describe('addPhrasePair (flip direction for SRS)', () => {
  it('saves forward and reverse entries with a single sound', async () => {
    const { calls } = fakeApi()
    await useLexiconStore.getState().addPhrasePair({
      phrase: 'Hello world',
      lang: 'ENFI',
      translation: 'Hei maailma',
      translationLang: 'fi'
    })
    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({ phrase: 'Hello world', lang: 'ENFI', translation: 'Hei maailma' })
    expect(calls[1]).toMatchObject({ phrase: 'Hei maailma', lang: 'fi', translation: 'Hello world' })
    expect(mockedPlaySaveSound).toHaveBeenCalledTimes(1)
  })

  it('skips the reverse entry when blank, identical, or unmapped', async () => {
    const { calls } = fakeApi()
    await useLexiconStore.getState().addPhrasePair({ phrase: 'Hei', lang: 'fi', translation: '' })
    expect(calls).toHaveLength(1)
    await useLexiconStore.getState().addPhrasePair({ phrase: 'Sama', lang: 'fi', translation: 'sama', translationLang: 'fi' })
    expect(calls).toHaveLength(2)
    await useLexiconStore
      .getState()
      .addPhrasePair({ phrase: 'Hei', lang: 'fi', translation: 'Hello', translationLang: '' })
    expect(calls).toHaveLength(3)
  })

  it('stays quiet when asked', async () => {
    fakeApi()
    await useLexiconStore.getState().addPhrasePair(
      { phrase: 'Hello', lang: 'ENFI', translation: 'Hei', translationLang: 'fi' },
      { quiet: true }
    )
    expect(mockedPlaySaveSound).not.toHaveBeenCalled()
  })

  it('bumps the lexicon rev on words/phrases mutations', async () => {
    fakeApi()
    const before = useLexiconStore.getState().rev
    await useLexiconStore.getState().addWord({ word: 'kissa', lang: 'fi', otherLang: 'en', translation: 'cat' })
    expect(useLexiconStore.getState().rev).toBe(before + 1)
    await useLexiconStore.getState().addPhrase({ phrase: 'hyvää päivää', lang: 'fi', translation: '' })
    expect(useLexiconStore.getState().rev).toBe(before + 2)
  })
})

describe('addWordPair (both directions for SRS)', () => {
  it('saves forward and reverse entries with a single sound', async () => {
    const { calls } = fakeApi()
    const first = await useLexiconStore
      .getState()
      .addWordPair({ word: 'talo', lang: 'fi', otherLang: 'en', translation: 'house' })
    expect(first?.word).toBe('talo')
    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({ word: 'talo', lang: 'fi', translation: 'house' })
    expect(calls[1]).toMatchObject({ word: 'house', lang: 'en', translation: 'talo' })
    expect(mockedPlaySaveSound).toHaveBeenCalledTimes(1)
  })

  it('skips the reverse entry when the gloss is blank or identical', async () => {
    const { calls } = fakeApi()
    await useLexiconStore.getState().addWordPair({ word: 'talo', lang: 'fi', otherLang: 'en', translation: '' })
    expect(calls).toHaveLength(1)
    await useLexiconStore
      .getState()
      .addWordPair({ word: 'Talo', lang: 'fi', otherLang: 'en', translation: 'talo' })
    expect(calls).toHaveLength(2)
  })

  it('stays quiet when asked', async () => {
    fakeApi()
    await useLexiconStore
      .getState()
      .addWordPair({ word: 'talo', lang: 'fi', otherLang: 'en', translation: 'house' }, { quiet: true })
    expect(mockedPlaySaveSound).not.toHaveBeenCalled()
  })
})
