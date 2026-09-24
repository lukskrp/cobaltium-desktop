import { app, ipcMain, shell, type IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import { IPC, type AppInfo, type DbHealth, type LlmStreamEvent, type ProviderInfo } from '@shared/ipc'
import type { ChatRequest } from '@shared/domain/llm'
import type { AppSettings } from '@shared/domain/settings'
import type { Message, Thread } from '@shared/domain/models'
import { MessageRole } from '@shared/domain/enums'
import { getDbPath, inspectDatabase } from './db'
import {
  loadAppSettings,
  patchAppSettings,
  readAllSettings,
  readSetting,
  saveAppSettings,
  writeSetting
} from './db/repositories/settings'
import {
  deleteEmptyThreads,
  deleteMessage,
  deleteThread,
  getThread,
  listMessagesForThread,
  listThreads,
  messageCounts,
  saveMessage,
  setThreadCollapsed,
  updateMessageImmersive,
  upsertThread
} from './db/repositories/threads'
import { clearKey, isEncryptionAvailable, listKeyPresence, setKey } from './security/secure-keys'
import {
  cancelAllStreams,
  cancelStream,
  complete,
  countTokens,
  providerInfo,
  runStream
} from './llm/manager'
import { translateText } from './translation/translator'
import { exportThreadEpub } from './chat'
import { getLanguageEngine, getLanguageResourceStatus } from './lang'
import { transcribeIpa } from './lang/ipa'
import { mailtoUrl } from '@shared/domain/report'
import { clearGlossary, getGlossary, putGlossary } from './db/repositories/glossary'
import {
  deleteFolder,
  deletePhrase,
  deleteWord,
  listFolders,
  listPhrases,
  listWords,
  movePhrases,
  moveWords,
  saveFolder,
  savePhrase,
  saveWord,
  updateWordAnalysis
} from './db/repositories/lexicon'
import { exportSavedWordsEpub } from './lexicon'
import type { ImmersiveData, SavedFolder, SavedPhrase, SavedWord, SavedWordAnalysis } from '@shared/domain/models'
import type { SrsGrade } from '@shared/domain/srs'
import {
  addCardsToDeck,
  createSrsDeck,
  deleteSrsDeck,
  getMembership,
  getStateMap,
  gradeCard,
  listSrsDecks,
  removeCardEverywhere,
  removeCardFromDeck,
  renameSrsDeck
} from './db/repositories/srs'
import {
  deleteBook,
  exportBook,
  listBooks,
  loadBook,
  openPath,
  openViaDialog,
  saveState as saveReaderState
} from './reader'
import type { ReaderState } from '@shared/epub'
import { scenariosForPair } from './scenarios'
import { disposeTts, provision, removeVoice, synthesize, ttsStatus } from './tts'
import {
  cancelTranscribe,
  disposeStt,
  provision as provisionStt,
  removeSttModel,
  sttStatus,
  transcribe
} from './stt'
import { exportBackup, importBackup, importChat } from './data/backup'
import { checkForUpdates, quitAndInstall } from './updater'

const SCHEMA_VERSION = 2

function assertKey(key: unknown): asserts key is string {
  if (typeof key !== 'string' || key.length === 0 || key.length > 256) {
    throw new Error('Invalid settings key')
  }
}

function assertKeyId(id: unknown): asserts id is string {
  if (typeof id !== 'string' || !/^[a-z0-9._-]{1,64}$/i.test(id)) {
    throw new Error('Invalid key id')
  }
}

function sanitizeRequest(request: unknown): ChatRequest {
  if (!request || typeof request !== 'object') throw new Error('Invalid chat request')
  const candidate = request as ChatRequest
  if (!Array.isArray(candidate.messages)) throw new Error('Invalid chat messages')
  const messages = candidate.messages
    .filter(
      (message) =>
        message &&
        typeof message === 'object' &&
        typeof message.role === 'string' &&
        typeof message.content === 'string'
    )
    .map((message) => ({ role: message.role, content: message.content }))
  return {
    messages,
    maxTokens: typeof candidate.maxTokens === 'number' ? candidate.maxTokens : undefined,
    temperature: typeof candidate.temperature === 'number' ? candidate.temperature : undefined
  }
}

/** Hard caps so a buggy renderer cannot write unbounded blobs straight to SQLite. */
const MAX_ID_LENGTH = 128
const MAX_TITLE_LENGTH = 500
const MAX_MESSAGE_LENGTH = 1_000_000
const MAX_DRAFT_LENGTH = 100_000
const MAX_IMMERSIVE_JSON_LENGTH = 2_000_000
const MAX_WORD_LENGTH = 500
const MAX_LANG_LENGTH = 32
const MAX_TRANSLATION_LENGTH = 10_000

function assertThread(thread: unknown): asserts thread is Thread {
  if (!thread || typeof thread !== 'object') throw new Error('Invalid thread')
  const candidate = thread as Thread
  if (
    typeof candidate.id !== 'string' ||
    candidate.id === '' ||
    candidate.id.length > MAX_ID_LENGTH ||
    typeof candidate.title !== 'string' ||
    candidate.title.length > MAX_TITLE_LENGTH ||
    typeof candidate.mode !== 'string' ||
    typeof candidate.draft !== 'string' ||
    candidate.draft.length > MAX_DRAFT_LENGTH ||
    typeof candidate.contextNotes !== 'string' ||
    candidate.contextNotes.length > MAX_DRAFT_LENGTH ||
    typeof candidate.createdAt !== 'number' ||
    typeof candidate.updatedAt !== 'number' ||
    typeof candidate.collapsed !== 'boolean' ||
    typeof candidate.starred !== 'boolean'
  ) {
    throw new Error('Invalid thread')
  }
}

function assertMessage(message: unknown): asserts message is Message {
  if (!message || typeof message !== 'object') throw new Error('Invalid message')
  const candidate = message as Message
  if (
    typeof candidate.id !== 'string' ||
    candidate.id === '' ||
    candidate.id.length > MAX_ID_LENGTH ||
    typeof candidate.threadId !== 'string' ||
    candidate.threadId === '' ||
    candidate.threadId.length > MAX_ID_LENGTH ||
    !MessageRole.isMessageRole(candidate.role) ||
    typeof candidate.content !== 'string' ||
    candidate.content.length > MAX_MESSAGE_LENGTH ||
    typeof candidate.createdAt !== 'number'
  ) {
    throw new Error('Invalid message')
  }
}

/** Registers all main-process IPC handlers. Call once after the DB is ready. */
export function registerIpcHandlers(): void {
  for (const channel of Object.values(IPC)) {
    if (channel !== IPC.llmEvent) ipcMain.removeHandler(channel)
  }

  ipcMain.handle(IPC.appGetInfo, (): AppInfo => {
    return {
      name: app.getName(),
      version: app.getVersion(),
      platform: process.platform,
      arch: process.arch,
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node
    }
  })

  ipcMain.handle(IPC.dbHealth, (): DbHealth => {
    const { migrations } = inspectDatabase()
    return { ok: true, path: getDbPath(), schemaVersion: SCHEMA_VERSION, migrations }
  })

  // ── Auto update ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC.updateCheck, (): Promise<boolean> => checkForUpdates())
  ipcMain.handle(IPC.updateInstall, (): boolean => {
    quitAndInstall()
    return true
  })

  // ── Settings ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.settingsAll, () => readAllSettings())

  ipcMain.handle(IPC.settingsGet, (_event, key: unknown) => {
    assertKey(key)
    return readSetting(key)
  })

  ipcMain.handle(IPC.settingsSet, (_event, key: unknown, value: unknown): boolean => {
    assertKey(key)
    if (value === undefined) throw new Error('Invalid settings value')
    JSON.stringify(value)
    writeSetting(key, value as never)
    return true
  })

  ipcMain.handle(IPC.settingsLoadApp, (): AppSettings => loadAppSettings())
  ipcMain.handle(IPC.settingsSaveApp, (_event, settings: unknown): AppSettings => {
    if (!settings || typeof settings !== 'object') throw new Error('Invalid settings')
    return saveAppSettings(settings as AppSettings)
  })
  ipcMain.handle(IPC.settingsPatchApp, (_event, patch: unknown): AppSettings => {
    if (!patch || typeof patch !== 'object') throw new Error('Invalid settings patch')
    return patchAppSettings(patch as Partial<AppSettings>)
  })

  // ── Secure keys ─────────────────────────────────────────────────────────
  ipcMain.handle(IPC.keysAvailable, (): boolean => isEncryptionAvailable())
  ipcMain.handle(IPC.keysList, () => listKeyPresence())
  ipcMain.handle(IPC.keysSet, (_event, id: unknown, value: unknown): boolean => {
    assertKeyId(id)
    if (typeof value !== 'string') throw new Error('Invalid key value')
    setKey(id, value)
    return true
  })
  ipcMain.handle(IPC.keysClear, (_event, id: unknown): boolean => {
    assertKeyId(id)
    clearKey(id)
    return true
  })

  // ── LLM ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.llmProviderInfo, (): ProviderInfo => providerInfo())
  ipcMain.handle(IPC.llmCountTokens, (_event, text: unknown): number => {
    if (typeof text !== 'string') throw new Error('Invalid text')
    return countTokens(text)
  })
  ipcMain.handle(IPC.llmComplete, async (_event, request: unknown): Promise<string> => {
    return complete(sanitizeRequest(request))
  })
  ipcMain.handle(IPC.llmStart, (event: IpcMainInvokeEvent, request: unknown, id: unknown) => {
    const streamId = typeof id === 'string' && id !== '' ? id : randomUUID()
    const sender = event.sender
    void runStream(streamId, sanitizeRequest(request), (streamEvent: LlmStreamEvent) => {
      if (!sender.isDestroyed()) sender.send(IPC.llmEvent, streamEvent)
    })
    return { id: streamId }
  })
  ipcMain.handle(IPC.llmCancel, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    return cancelStream(id)
  })

  // ── Threads ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.threadsList, (): Thread[] => listThreads())
  ipcMain.handle(IPC.threadsGet, (_event, id: unknown): Thread | null => {
    if (typeof id !== 'string') return null
    return getThread(id)
  })
  ipcMain.handle(IPC.threadsUpsert, (_event, thread: unknown): boolean => {
    assertThread(thread)
    upsertThread(thread)
    return true
  })
  ipcMain.handle(IPC.threadsDelete, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteThread(id)
    return true
  })
  ipcMain.handle(IPC.threadsDeleteEmpty, (): boolean => {
    deleteEmptyThreads()
    return true
  })
  ipcMain.handle(IPC.threadsSetCollapsed, (_event, id: unknown, collapsed: unknown): boolean => {
    if (typeof id !== 'string' || typeof collapsed !== 'boolean') return false
    setThreadCollapsed(id, collapsed)
    return true
  })

  // ── Messages ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.messagesList, (_event, threadId: unknown): Message[] => {
    if (typeof threadId !== 'string') return []
    return listMessagesForThread(threadId)
  })
  ipcMain.handle(IPC.messagesSave, (_event, message: unknown): boolean => {
    assertMessage(message)
    saveMessage(message)
    return true
  })
  ipcMain.handle(IPC.messagesDelete, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteMessage(id)
    return true
  })
  ipcMain.handle(IPC.messagesUpdateImmersive, (_event, id: unknown, data: unknown): boolean => {
    if (typeof id !== 'string' || id === '' || id.length > MAX_ID_LENGTH) return false
    if (data != null && (typeof data !== 'object' || Array.isArray(data))) return false
    const json = data == null ? null : JSON.stringify(data)
    if (json !== null && json.length > MAX_IMMERSIVE_JSON_LENGTH) return false
    updateMessageImmersive(id, json)
    return true
  })
  ipcMain.handle(IPC.messagesCounts, () => messageCounts())
  ipcMain.handle(IPC.chatExportThread, (_event, threadId: unknown): Promise<boolean> => {
    if (typeof threadId !== 'string') return Promise.resolve(false)
    return exportThreadEpub(threadId)
  })

  // ── Translation ─────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.translationTranslate,
    async (_event, text: unknown, from: unknown, to: unknown): Promise<ImmersiveData> => {
      if (typeof text !== 'string' || typeof from !== 'string' || typeof to !== 'string') {
        throw new Error('Invalid translation request')
      }
      return translateText(text, from, to)
    }
  )

  // ── Language engine ─────────────────────────────────────────────────────
  ipcMain.handle(IPC.langAnalyze, (_event, text: unknown, lang: unknown) => {
    if (typeof text !== 'string' || typeof lang !== 'string') throw new Error('Invalid language request')
    return getLanguageEngine().analyze(text, lang)
  })
  ipcMain.handle(IPC.langRomanize, (_event, text: unknown, lang: unknown): string | null => {
    if (typeof text !== 'string' || typeof lang !== 'string') return null
    return getLanguageEngine().romanizeWord(text, lang)
  })
  ipcMain.handle(
    IPC.langInflect,
    async (_event, lemma: unknown, lang: unknown, pos: unknown) => {
      if (typeof lemma !== 'string' || typeof lang !== 'string') return null
      return getLanguageEngine().inflect(lemma, lang, typeof pos === 'string' ? pos : null)
    }
  )
  ipcMain.handle(IPC.langMorph, async (_event, word: unknown, lang: unknown) => {
    if (typeof word !== 'string' || typeof lang !== 'string') return null
    return getLanguageEngine().analyzeWord(word, lang)
  })
  ipcMain.handle(IPC.langLookup, async (_event, word: unknown, lang: unknown) => {
    if (typeof word !== 'string' || typeof lang !== 'string') return null
    return getLanguageEngine().lookup(word, lang)
  })
  ipcMain.handle(IPC.langResources, () => getLanguageResourceStatus())
  ipcMain.handle(IPC.langIpa, (_event, text: unknown, lang: unknown): string | null => {
    if (typeof text !== 'string' || typeof lang !== 'string') return null
    try {
      return transcribeIpa(text, lang)
    } catch {
      return null
    }
  })

  // ── Content report ────────────────────────────────────────────────────
  ipcMain.handle(IPC.safetyReport, async (_event, subject: unknown, body: unknown): Promise<boolean> => {
    if (typeof subject !== 'string' || typeof body !== 'string') return false
    if (subject.trim() === '' || body.trim() === '') return false
    try {
      await shell.openExternal(mailtoUrl(subject, body))
      return true
    } catch {
      return false
    }
  })

  // ── Glossary cache ──────────────────────────────────────────────────────
  ipcMain.handle(IPC.glossaryGet, (_event, word: unknown, lang: unknown) => {
    if (typeof word !== 'string' || typeof lang !== 'string') return null
    return getGlossary(word, lang)
  })
  ipcMain.handle(IPC.glossaryPut, (_event, word: unknown, lang: unknown, analysis: unknown): boolean => {
    if (typeof word !== 'string' || typeof lang !== 'string' || !analysis || typeof analysis !== 'object') {
      return false
    }
    putGlossary(word, lang, analysis as SavedWordAnalysis)
    return true
  })
  ipcMain.handle(IPC.glossaryClear, (): boolean => {
    clearGlossary()
    return true
  })

  // ── Lexicon ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.lexiconListWords, (): SavedWord[] => listWords())
  ipcMain.handle(IPC.lexiconSaveWord, (_event, word: unknown): boolean => {
    if (!word || typeof word !== 'object') throw new Error('Invalid word')
    const candidate = word as SavedWord
    if (
      typeof candidate.id !== 'string' ||
      candidate.id === '' ||
      candidate.id.length > MAX_ID_LENGTH ||
      typeof candidate.word !== 'string' ||
      candidate.word === '' ||
      candidate.word.length > MAX_WORD_LENGTH ||
      typeof candidate.lang !== 'string' ||
      candidate.lang.length > MAX_LANG_LENGTH ||
      typeof candidate.translation !== 'string' ||
      candidate.translation.length > MAX_TRANSLATION_LENGTH
    ) {
      throw new Error('Invalid word')
    }
    saveWord(candidate)
    return true
  })
  ipcMain.handle(IPC.lexiconDeleteWord, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteWord(id)
    return true
  })
  ipcMain.handle(IPC.lexiconUpdateAnalysis, (_event, id: unknown, analysis: unknown): boolean => {
    if (typeof id !== 'string') return false
    updateWordAnalysis(id, (analysis as SavedWordAnalysis | null) ?? null)
    return true
  })
  ipcMain.handle(IPC.lexiconMoveWord, (_event, ids: unknown, folderId: unknown): boolean => {
    if (!Array.isArray(ids)) return false
    moveWords(
      ids.filter((id): id is string => typeof id === 'string'),
      typeof folderId === 'string' ? folderId : null
    )
    return true
  })
  ipcMain.handle(IPC.lexiconListFolders, (): SavedFolder[] => listFolders())
  ipcMain.handle(IPC.lexiconSaveFolder, (_event, folder: unknown): boolean => {
    if (!folder || typeof folder !== 'object') throw new Error('Invalid folder')
    const candidate = folder as SavedFolder
    if (
      typeof candidate.id !== 'string' ||
      candidate.id === '' ||
      candidate.id.length > MAX_ID_LENGTH ||
      typeof candidate.name !== 'string' ||
      candidate.name === '' ||
      candidate.name.length > MAX_TITLE_LENGTH
    ) {
      throw new Error('Invalid folder')
    }
    saveFolder(candidate)
    return true
  })
  ipcMain.handle(IPC.lexiconDeleteFolder, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteFolder(id)
    return true
  })
  ipcMain.handle(IPC.lexiconListPhrases, (): SavedPhrase[] => listPhrases())
  ipcMain.handle(IPC.lexiconSavePhrase, (_event, phrase: unknown): boolean => {
    if (!phrase || typeof phrase !== 'object') throw new Error('Invalid phrase')
    const candidate = phrase as SavedPhrase
    if (
      typeof candidate.id !== 'string' ||
      candidate.id === '' ||
      candidate.id.length > MAX_ID_LENGTH ||
      typeof candidate.phrase !== 'string' ||
      candidate.phrase === '' ||
      candidate.phrase.length > MAX_TRANSLATION_LENGTH ||
      typeof candidate.translation !== 'string' ||
      candidate.translation.length > MAX_TRANSLATION_LENGTH
    ) {
      throw new Error('Invalid phrase')
    }
    savePhrase(candidate)
    return true
  })
  ipcMain.handle(IPC.lexiconDeletePhrase, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deletePhrase(id)
    return true
  })
  ipcMain.handle(IPC.lexiconMovePhrase, (_event, ids: unknown, folderId: unknown): boolean => {
    if (!Array.isArray(ids)) return false
    movePhrases(
      ids.filter((id): id is string => typeof id === 'string'),
      typeof folderId === 'string' ? folderId : null
    )
    return true
  })
  ipcMain.handle(IPC.lexiconExportWords, (): Promise<boolean> => exportSavedWordsEpub())

  // ── SRS ─────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.srsState, () => getStateMap())
  ipcMain.handle(IPC.srsDecks, () => listSrsDecks())
  ipcMain.handle(IPC.srsMembership, () => getMembership())
  ipcMain.handle(IPC.srsGrade, (_event, deckId: unknown, cardId: unknown, grade: unknown): boolean => {
    if (typeof deckId !== 'string' || typeof cardId !== 'string' || typeof grade !== 'string') {
      return false
    }
    if (grade !== 'again' && grade !== 'good' && grade !== 'easy') return false
    gradeCard(deckId, cardId, grade as SrsGrade)
    return true
  })
  ipcMain.handle(IPC.srsCreateDeck, (_event, name: unknown) =>
    typeof name === 'string' ? createSrsDeck(name) : null
  )
  ipcMain.handle(IPC.srsRenameDeck, (_event, id: unknown, name: unknown): boolean =>
    typeof id === 'string' && typeof name === 'string' ? renameSrsDeck(id, name) : false
  )
  ipcMain.handle(IPC.srsDeleteDeck, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteSrsDeck(id)
    return true
  })
  ipcMain.handle(IPC.srsAddCards, (_event, deckId: unknown, cardIds: unknown): boolean => {
    if (typeof deckId !== 'string' || !Array.isArray(cardIds)) return false
    addCardsToDeck(
      deckId,
      cardIds.filter((id): id is string => typeof id === 'string')
    )
    return true
  })
  ipcMain.handle(IPC.srsRemoveCard, (_event, cardId: unknown): boolean => {
    if (typeof cardId !== 'string') return false
    removeCardEverywhere(cardId)
    return true
  })
  ipcMain.handle(IPC.srsRemoveCardFromDeck, (_event, deckId: unknown, cardId: unknown): boolean => {
    if (typeof deckId !== 'string' || typeof cardId !== 'string') return false
    removeCardFromDeck(deckId, cardId)
    return true
  })

  // ── Reader ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.readerLibrary, () => listBooks())
  ipcMain.handle(IPC.readerOpen, () => openViaDialog())
  ipcMain.handle(IPC.readerOpenPath, (_event, path: unknown) =>
    typeof path === 'string' ? openPath(path) : null
  )
  ipcMain.handle(IPC.readerLoad, (_event, id: unknown) =>
    typeof id === 'string' ? loadBook(id) : null
  )
  ipcMain.handle(IPC.readerSaveState, (_event, id: unknown, state: unknown): boolean => {
    if (typeof id !== 'string' || !state || typeof state !== 'object') return false
    saveReaderState(id, state as ReaderState)
    return true
  })
  ipcMain.handle(IPC.readerDelete, (_event, id: unknown): boolean => {
    if (typeof id !== 'string') return false
    deleteBook(id)
    return true
  })
  ipcMain.handle(IPC.readerExport, (_event, id: unknown, state: unknown): Promise<boolean> => {
    if (typeof id !== 'string' || !state || typeof state !== 'object') return Promise.resolve(false)
    return exportBook(id, state as ReaderState)
  })

  // ── Scenarios ───────────────────────────────────────────────────────────
  ipcMain.handle(IPC.scenariosList, (_event, pair: unknown) =>
    scenariosForPair(typeof pair === 'string' ? pair : null)
  )

  // ── Text to speech ──────────────────────────────────────────────────────
  ipcMain.handle(IPC.ttsSynthesize, async (_event, text: unknown, lang: unknown) => {
    if (typeof text !== 'string' || typeof lang !== 'string' || text.trim() === '') return null
    return synthesize(text, lang)
  })
  ipcMain.handle(IPC.ttsStatus, () => ttsStatus())
  ipcMain.handle(IPC.ttsProvision, (event: IpcMainInvokeEvent, lang: unknown) => {
    if (typeof lang !== 'string') return false
    const sender = event.sender
    return provision(lang, (phase, received, total) => {
      if (!sender.isDestroyed()) sender.send(IPC.ttsProgress, { lang, phase, received, total })
    })
  })
  ipcMain.handle(IPC.ttsRemove, (_event, lang: unknown): boolean =>
    typeof lang === 'string' ? removeVoice(lang) : false
  )

  // ── Speech to text (whisper.cpp) ──────────────────────────────────────
  ipcMain.handle(IPC.sttTranscribe, async (_event, wavBase64: unknown, lang: unknown) => {
    if (typeof wavBase64 !== 'string' || typeof lang !== 'string' || wavBase64 === '') return null
    return transcribe(wavBase64, lang)
  })
  ipcMain.handle(IPC.sttStatus, () => sttStatus())
  ipcMain.handle(IPC.sttProvision, (event: IpcMainInvokeEvent, model: unknown) => {
    if (typeof model !== 'string') return false
    const sender = event.sender
    return provisionStt(model, (phase, received, total) => {
      if (!sender.isDestroyed()) sender.send(IPC.sttProgress, { model, phase, received, total })
    })
  })
  ipcMain.handle(IPC.sttRemove, (_event, model: unknown): boolean =>
    typeof model === 'string' ? removeSttModel(model) : false
  )
  ipcMain.handle(IPC.sttCancel, (): boolean => cancelTranscribe())

  // ── Backup / import ───────────────────────────────────────────────────
  ipcMain.handle(IPC.dataExportBackup, () => exportBackup())
  ipcMain.handle(IPC.dataImportBackup, () => importBackup())
  ipcMain.handle(IPC.dataImportChat, () => importChat())

  app.on('will-quit', () => {
    cancelAllStreams()
    void disposeTts()
    disposeStt()
  })
}
