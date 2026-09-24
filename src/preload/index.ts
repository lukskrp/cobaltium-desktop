import { contextBridge, ipcRenderer, webUtils } from 'electron'
import {
  IPC,
  type CobaltiumApi,
  type LlmStreamEvent,
  type ReaderOpenResult,
  type SttProgress,
  type TtsProgress,
  type UpdateStatus
} from '@shared/ipc'

const api: CobaltiumApi = {
  app: {
    getInfo: () => ipcRenderer.invoke(IPC.appGetInfo)
  },
  update: {
    check: () => ipcRenderer.invoke(IPC.updateCheck),
    install: () => ipcRenderer.invoke(IPC.updateInstall),
    onStatus: (listener) => {
      const handler = (_event: unknown, payload: UpdateStatus): void => listener(payload)
      ipcRenderer.on(IPC.updateStatus, handler)
      return () => ipcRenderer.removeListener(IPC.updateStatus, handler)
    }
  },
  files: {
    getPathForFile: (file) => webUtils.getPathForFile(file as File)
  },
  db: {
    health: () => ipcRenderer.invoke(IPC.dbHealth)
  },
  settings: {
    all: () => ipcRenderer.invoke(IPC.settingsAll),
    get: (key) => ipcRenderer.invoke(IPC.settingsGet, key),
    set: (key, value) => ipcRenderer.invoke(IPC.settingsSet, key, value),
    loadApp: () => ipcRenderer.invoke(IPC.settingsLoadApp),
    saveApp: (settings) => ipcRenderer.invoke(IPC.settingsSaveApp, settings),
    patchApp: (patch) => ipcRenderer.invoke(IPC.settingsPatchApp, patch)
  },
  keys: {
    available: () => ipcRenderer.invoke(IPC.keysAvailable),
    list: () => ipcRenderer.invoke(IPC.keysList),
    set: (id, value) => ipcRenderer.invoke(IPC.keysSet, id, value),
    clear: (id) => ipcRenderer.invoke(IPC.keysClear, id)
  },
  llm: {
    providerInfo: () => ipcRenderer.invoke(IPC.llmProviderInfo),
    countTokens: (text) => ipcRenderer.invoke(IPC.llmCountTokens, text),
    complete: (request) => ipcRenderer.invoke(IPC.llmComplete, request),
    start: (request, id) => ipcRenderer.invoke(IPC.llmStart, request, id),
    cancel: (id) => ipcRenderer.invoke(IPC.llmCancel, id),
    onEvent: (listener) => {
      const handler = (_event: unknown, payload: LlmStreamEvent): void => listener(payload)
      ipcRenderer.on(IPC.llmEvent, handler)
      return () => ipcRenderer.removeListener(IPC.llmEvent, handler)
    }
  },
  threads: {
    list: () => ipcRenderer.invoke(IPC.threadsList),
    get: (id) => ipcRenderer.invoke(IPC.threadsGet, id),
    upsert: (thread) => ipcRenderer.invoke(IPC.threadsUpsert, thread),
    delete: (id) => ipcRenderer.invoke(IPC.threadsDelete, id),
    deleteEmpty: () => ipcRenderer.invoke(IPC.threadsDeleteEmpty),
    setCollapsed: (id, collapsed) => ipcRenderer.invoke(IPC.threadsSetCollapsed, id, collapsed)
  },
  messages: {
    list: (threadId) => ipcRenderer.invoke(IPC.messagesList, threadId),
    save: (message) => ipcRenderer.invoke(IPC.messagesSave, message),
    delete: (id) => ipcRenderer.invoke(IPC.messagesDelete, id),
    updateImmersive: (id, data) => ipcRenderer.invoke(IPC.messagesUpdateImmersive, id, data),
    counts: () => ipcRenderer.invoke(IPC.messagesCounts)
  },
  chat: {
    exportThread: (threadId) => ipcRenderer.invoke(IPC.chatExportThread, threadId)
  },
  translation: {
    translate: (text, from, to) => ipcRenderer.invoke(IPC.translationTranslate, text, from, to)
  },
  lang: {
    analyze: (text, lang) => ipcRenderer.invoke(IPC.langAnalyze, text, lang),
    romanize: (text, lang) => ipcRenderer.invoke(IPC.langRomanize, text, lang),
    inflect: (lemma, lang, pos) => ipcRenderer.invoke(IPC.langInflect, lemma, lang, pos),
    morph: (word, lang) => ipcRenderer.invoke(IPC.langMorph, word, lang),
    lookup: (word, lang) => ipcRenderer.invoke(IPC.langLookup, word, lang),
    resources: () => ipcRenderer.invoke(IPC.langResources),
    ipa: (text, lang) => ipcRenderer.invoke(IPC.langIpa, text, lang)
  },
  safety: {
    report: (subject, body) => ipcRenderer.invoke(IPC.safetyReport, subject, body)
  },
  glossary: {
    get: (word, lang) => ipcRenderer.invoke(IPC.glossaryGet, word, lang),
    put: (word, lang, analysis) => ipcRenderer.invoke(IPC.glossaryPut, word, lang, analysis),
    clear: () => ipcRenderer.invoke(IPC.glossaryClear)
  },
  lexicon: {
    words: () => ipcRenderer.invoke(IPC.lexiconListWords),
    saveWord: (word) => ipcRenderer.invoke(IPC.lexiconSaveWord, word),
    deleteWord: (id) => ipcRenderer.invoke(IPC.lexiconDeleteWord, id),
    updateAnalysis: (id, analysis) => ipcRenderer.invoke(IPC.lexiconUpdateAnalysis, id, analysis),
    moveWord: (ids, folderId) => ipcRenderer.invoke(IPC.lexiconMoveWord, ids, folderId),
    folders: () => ipcRenderer.invoke(IPC.lexiconListFolders),
    saveFolder: (folder) => ipcRenderer.invoke(IPC.lexiconSaveFolder, folder),
    deleteFolder: (id) => ipcRenderer.invoke(IPC.lexiconDeleteFolder, id),
    phrases: () => ipcRenderer.invoke(IPC.lexiconListPhrases),
    savePhrase: (phrase) => ipcRenderer.invoke(IPC.lexiconSavePhrase, phrase),
    deletePhrase: (id) => ipcRenderer.invoke(IPC.lexiconDeletePhrase, id),
    movePhrase: (ids, folderId) => ipcRenderer.invoke(IPC.lexiconMovePhrase, ids, folderId),
    exportWords: () => ipcRenderer.invoke(IPC.lexiconExportWords)
  },
  srs: {
    state: () => ipcRenderer.invoke(IPC.srsState),
    decks: () => ipcRenderer.invoke(IPC.srsDecks),
    membership: () => ipcRenderer.invoke(IPC.srsMembership),
    grade: (deckId, cardId, grade) => ipcRenderer.invoke(IPC.srsGrade, deckId, cardId, grade),
    createDeck: (name) => ipcRenderer.invoke(IPC.srsCreateDeck, name),
    renameDeck: (id, name) => ipcRenderer.invoke(IPC.srsRenameDeck, id, name),
    deleteDeck: (id) => ipcRenderer.invoke(IPC.srsDeleteDeck, id),
    addCards: (deckId, cardIds) => ipcRenderer.invoke(IPC.srsAddCards, deckId, cardIds),
    removeCard: (cardId) => ipcRenderer.invoke(IPC.srsRemoveCard, cardId),
    removeCardFromDeck: (deckId, cardId) => ipcRenderer.invoke(IPC.srsRemoveCardFromDeck, deckId, cardId)
  },
  reader: {
    library: () => ipcRenderer.invoke(IPC.readerLibrary),
    open: () => ipcRenderer.invoke(IPC.readerOpen),
    openPath: (path) => ipcRenderer.invoke(IPC.readerOpenPath, path),
    onOpened: (listener) => {
      const handler = (_event: unknown, payload: ReaderOpenResult): void => listener(payload)
      ipcRenderer.on(IPC.readerOpened, handler)
      return () => ipcRenderer.removeListener(IPC.readerOpened, handler)
    },
    load: (id) => ipcRenderer.invoke(IPC.readerLoad, id),
    saveState: (id, state) => ipcRenderer.invoke(IPC.readerSaveState, id, state),
    delete: (id) => ipcRenderer.invoke(IPC.readerDelete, id),
    export: (id, state) => ipcRenderer.invoke(IPC.readerExport, id, state)
  },
  scenarios: {
    list: (pair) => ipcRenderer.invoke(IPC.scenariosList, pair)
  },
  tts: {
    synthesize: (text, lang) => ipcRenderer.invoke(IPC.ttsSynthesize, text, lang),
    status: () => ipcRenderer.invoke(IPC.ttsStatus),
    provision: (lang) => ipcRenderer.invoke(IPC.ttsProvision, lang),
    remove: (lang) => ipcRenderer.invoke(IPC.ttsRemove, lang),
    onProgress: (listener) => {
      const handler = (_event: unknown, payload: TtsProgress): void => listener(payload)
      ipcRenderer.on(IPC.ttsProgress, handler)
      return () => ipcRenderer.removeListener(IPC.ttsProgress, handler)
    }
  },
  stt: {
    transcribe: (wavBase64, lang) => ipcRenderer.invoke(IPC.sttTranscribe, wavBase64, lang),
    status: () => ipcRenderer.invoke(IPC.sttStatus),
    provision: (model) => ipcRenderer.invoke(IPC.sttProvision, model),
    remove: (model) => ipcRenderer.invoke(IPC.sttRemove, model),
    cancel: () => ipcRenderer.invoke(IPC.sttCancel),
    onProgress: (listener) => {
      const handler = (_event: unknown, payload: SttProgress): void => listener(payload)
      ipcRenderer.on(IPC.sttProgress, handler)
      return () => ipcRenderer.removeListener(IPC.sttProgress, handler)
    }
  },
  data: {
    exportBackup: () => ipcRenderer.invoke(IPC.dataExportBackup),
    importBackup: () => ipcRenderer.invoke(IPC.dataImportBackup),
    importChat: () => ipcRenderer.invoke(IPC.dataImportChat)
  },
  reminders: {
    onOpen: (listener) => {
      const handler = (): void => listener()
      ipcRenderer.on(IPC.remindersOpen, handler)
      return () => ipcRenderer.removeListener(IPC.remindersOpen, handler)
    }
  }
}

if (process.contextIsolated) {
  contextBridge.exposeInMainWorld('cobaltium', api)
} else {
  // Fallback for the unlikely case context isolation is disabled.
  ;(globalThis as unknown as { cobaltium: CobaltiumApi }).cobaltium = api
}
