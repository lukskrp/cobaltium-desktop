/**
 * Shared IPC contract between the Electron main process and the renderer.
 *
 * This module must stay free of any `electron`, `node:*`, or DOM imports so it
 * can be bundled into the main, preload, and renderer targets alike.
 */
import type { ChatRequest } from './domain/llm'
import type { AppSettings } from './domain/settings'
import type {
  ImmersiveData,
  Message,
  SavedFolder,
  SavedPhrase,
  SavedWord,
  SavedWordAnalysis,
  Thread
} from './domain/models'
import type {
  DictionaryEntry,
  InflectionParadigm,
  LanguageAnalysis,
  MorphologyResult
} from './lang'
import type { SrsDeck, SrsGrade, SrsItemState } from './domain/srs'
import type { ReaderBook, ReaderBookMeta, ReaderState } from './epub'
import type { Scenario } from './domain/scenarios'
import type { UpdateStatus } from './domain/update'

export type { UpdateState, UpdateStatus } from './domain/update'

export const IPC = {
  appGetInfo: 'app:get-info',
  dbHealth: 'db:health',

  updateCheck: 'update:check',
  updateInstall: 'update:install',
  updateStatus: 'update:status',

  settingsAll: 'settings:all',
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  settingsLoadApp: 'settings:load-app',
  settingsSaveApp: 'settings:save-app',
  settingsPatchApp: 'settings:patch-app',

  keysAvailable: 'keys:available',
  keysList: 'keys:list',
  keysSet: 'keys:set',
  keysClear: 'keys:clear',

  llmProviderInfo: 'llm:provider-info',
  llmCountTokens: 'llm:count-tokens',
  llmComplete: 'llm:complete',
  llmStart: 'llm:start',
  llmCancel: 'llm:cancel',
  llmEvent: 'llm:event',

  threadsList: 'threads:list',
  threadsGet: 'threads:get',
  threadsUpsert: 'threads:upsert',
  threadsDelete: 'threads:delete',
  threadsDeleteEmpty: 'threads:delete-empty',
  threadsSetCollapsed: 'threads:set-collapsed',

  messagesList: 'messages:list',
  messagesSave: 'messages:save',
  messagesDelete: 'messages:delete',
  messagesUpdateImmersive: 'messages:update-immersive',
  messagesCounts: 'messages:counts',

  chatExportThread: 'chat:export-thread',

  translationTranslate: 'translation:translate',

  langAnalyze: 'lang:analyze',
  langRomanize: 'lang:romanize',
  langInflect: 'lang:inflect',
  langMorph: 'lang:morph',
  langLookup: 'lang:lookup',
  langResources: 'lang:resources',
  langIpa: 'lang:ipa',

  safetyReport: 'safety:report',

  glossaryGet: 'glossary:get',
  glossaryPut: 'glossary:put',
  glossaryClear: 'glossary:clear',

  lexiconListWords: 'lexicon:list-words',
  lexiconSaveWord: 'lexicon:save-word',
  lexiconDeleteWord: 'lexicon:delete-word',
  lexiconUpdateAnalysis: 'lexicon:update-analysis',
  lexiconMoveWord: 'lexicon:move-word',
  lexiconListFolders: 'lexicon:list-folders',
  lexiconSaveFolder: 'lexicon:save-folder',
  lexiconDeleteFolder: 'lexicon:delete-folder',
  lexiconListPhrases: 'lexicon:list-phrases',
  lexiconSavePhrase: 'lexicon:save-phrase',
  lexiconDeletePhrase: 'lexicon:delete-phrase',
  lexiconMovePhrase: 'lexicon:move-phrase',
  lexiconExportWords: 'lexicon:export-words',

  srsState: 'srs:state',
  srsDecks: 'srs:decks',
  srsMembership: 'srs:membership',
  srsGrade: 'srs:grade',
  srsCreateDeck: 'srs:create-deck',
  srsRenameDeck: 'srs:rename-deck',
  srsDeleteDeck: 'srs:delete-deck',
  srsAddCards: 'srs:add-cards',
  srsRemoveCard: 'srs:remove-card',
  srsRemoveCardFromDeck: 'srs:remove-card-from-deck',

  readerLibrary: 'reader:library',
  readerOpen: 'reader:open',
  readerOpenPath: 'reader:open-path',
  readerOpened: 'reader:opened',
  readerLoad: 'reader:load',
  readerSaveState: 'reader:save-state',
  readerDelete: 'reader:delete',
  readerExport: 'reader:export',

  scenariosList: 'scenarios:list',

  ttsSynthesize: 'tts:synthesize',
  ttsStatus: 'tts:status',
  ttsProvision: 'tts:provision',
  ttsRemove: 'tts:remove',
  ttsProgress: 'tts:progress',

  sttTranscribe: 'stt:transcribe',
  sttStatus: 'stt:status',
  sttProvision: 'stt:provision',
  sttRemove: 'stt:remove',
  sttCancel: 'stt:cancel',
  sttProgress: 'stt:progress',

  dataExportBackup: 'data:export-backup',
  dataImportBackup: 'data:import-backup',
  dataImportChat: 'data:import-chat',

  remindersOpen: 'reminders:open'
} as const

export interface TtsAudio {
  audioBase64: string
  format: 'wav'
}

export interface TtsLanguageStatus {
  lang: string
  label: string
  voiceId: string
  license: string
  supported: boolean
  provisioned: boolean
  bytes: number
}

export interface TtsStatus {
  espeakAvailable: boolean
  nativePiperAvailable: boolean
  languages: TtsLanguageStatus[]
}

export interface TtsProgress {
  lang: string
  phase: 'voice' | 'config' | 'bundle' | 'done' | 'error'
  received: number
  total: number
}

export interface SttResult {
  text: string
  language: string
}

export interface SttStatus {
  serverAvailable: boolean
  model: string
  provisioned: boolean
  bytes: number
  transcribing: boolean
}

export interface SttProgress {
  model: string
  phase: 'model' | 'done' | 'error'
  received: number
  total: number
}

export type IpcChannel = (typeof IPC)[keyof typeof IPC]

export type SettingValue = string | number | boolean | null | object

export interface AppInfo {
  name: string
  version: string
  platform: string
  arch: string
  electron: string
  chrome: string
  node: string
}

export interface DbHealth {
  ok: boolean
  path: string
  schemaVersion: number
  migrations: number
}

/** Which data-driven language tables were loaded from the bundled resources. */
export interface LangResourceStatus {
  pinyin: boolean
  hanKanji: boolean
  kanjiHan: boolean
}

/** A parsed book plus its saved reading state. */
export interface ReaderOpenResult {
  book: ReaderBook
  state: ReaderState
}

export interface ProviderInfo {
  providerId: string
  label: string
  model: string
  baseUrl: string
  hasKey: boolean
  requiresKey: boolean
  local: boolean
}

export interface LlmStreamEvent {
  id: string
  type: 'token' | 'thinking' | 'done' | 'error'
  text?: string
  message?: string
  category?: string
}

export interface CobaltiumApi {
  app: {
    getInfo(): Promise<AppInfo>
  }
  files: {
    /** Resolve the absolute path of a dropped `File` (Electron webUtils). */
    getPathForFile(file: unknown): string
  }
  update: {
    check(): Promise<boolean>
    install(): Promise<boolean>
    onStatus(listener: (status: UpdateStatus) => void): () => void
  }
  db: {
    health(): Promise<DbHealth>
  }
  settings: {
    all(): Promise<Record<string, SettingValue>>
    get<T extends SettingValue = SettingValue>(key: string): Promise<T | null>
    set(key: string, value: SettingValue): Promise<boolean>
    loadApp(): Promise<AppSettings>
    saveApp(settings: AppSettings): Promise<AppSettings>
    patchApp(patch: Partial<AppSettings>): Promise<AppSettings>
  }
  keys: {
    available(): Promise<boolean>
    list(): Promise<Record<string, boolean>>
    set(id: string, value: string): Promise<boolean>
    clear(id: string): Promise<boolean>
  }
  llm: {
    providerInfo(): Promise<ProviderInfo>
    countTokens(text: string): Promise<number>
    complete(request: ChatRequest): Promise<string>
    start(request: ChatRequest, id: string): Promise<{ id: string }>
    cancel(id: string): Promise<boolean>
    onEvent(listener: (event: LlmStreamEvent) => void): () => void
  }
  threads: {
    list(): Promise<Thread[]>
    get(id: string): Promise<Thread | null>
    upsert(thread: Thread): Promise<boolean>
    delete(id: string): Promise<boolean>
    deleteEmpty(): Promise<boolean>
    setCollapsed(id: string, collapsed: boolean): Promise<boolean>
  }
  messages: {
    list(threadId: string): Promise<Message[]>
    save(message: Message): Promise<boolean>
    delete(id: string): Promise<boolean>
    updateImmersive(id: string, data: ImmersiveData | null): Promise<boolean>
    counts(): Promise<Record<string, number>>
  }
  chat: {
    exportThread(threadId: string): Promise<boolean>
  }
  translation: {
    translate(text: string, from: string, to: string): Promise<ImmersiveData>
  }
  lang: {
    analyze(text: string, lang: string): Promise<LanguageAnalysis>
    romanize(text: string, lang: string): Promise<string | null>
    inflect(lemma: string, lang: string, pos: string | null): Promise<InflectionParadigm | null>
    morph(word: string, lang: string): Promise<MorphologyResult | null>
    lookup(word: string, lang: string): Promise<DictionaryEntry[] | null>
    resources(): Promise<LangResourceStatus>
    ipa(text: string, lang: string): Promise<string | null>
  }
  safety: {
    report(subject: string, body: string): Promise<boolean>
  }
  glossary: {
    get(word: string, lang: string): Promise<SavedWordAnalysis | null>
    put(word: string, lang: string, analysis: SavedWordAnalysis): Promise<boolean>
    clear(): Promise<boolean>
  }
  lexicon: {
    words(): Promise<SavedWord[]>
    saveWord(word: SavedWord): Promise<boolean>
    deleteWord(id: string): Promise<boolean>
    updateAnalysis(id: string, analysis: SavedWordAnalysis | null): Promise<boolean>
    moveWord(ids: string[], folderId: string | null): Promise<boolean>
    folders(): Promise<SavedFolder[]>
    saveFolder(folder: SavedFolder): Promise<boolean>
    deleteFolder(id: string): Promise<boolean>
    phrases(): Promise<SavedPhrase[]>
    savePhrase(phrase: SavedPhrase): Promise<boolean>
    deletePhrase(id: string): Promise<boolean>
    movePhrase(ids: string[], folderId: string | null): Promise<boolean>
    exportWords(): Promise<boolean>
  }
  srs: {
    state(): Promise<Record<string, Record<string, SrsItemState>>>
    decks(): Promise<SrsDeck[]>
    membership(): Promise<Record<string, string[]>>
    grade(deckId: string, cardId: string, grade: SrsGrade): Promise<boolean>
    createDeck(name: string): Promise<SrsDeck | null>
    renameDeck(id: string, name: string): Promise<boolean>
    deleteDeck(id: string): Promise<boolean>
    addCards(deckId: string, cardIds: string[]): Promise<boolean>
    removeCard(cardId: string): Promise<boolean>
    removeCardFromDeck(deckId: string, cardId: string): Promise<boolean>
  }
  reader: {
    library(): Promise<ReaderBookMeta[]>
    open(): Promise<ReaderOpenResult | null>
    openPath(path: string): Promise<ReaderOpenResult | null>
    onOpened(listener: (result: ReaderOpenResult) => void): () => void
    load(id: string): Promise<ReaderOpenResult | null>
    saveState(id: string, state: ReaderState): Promise<boolean>
    delete(id: string): Promise<boolean>
    export(id: string, state: ReaderState): Promise<boolean>
  }
  scenarios: {
    list(pair: string | null): Promise<Scenario[]>
  }
  tts: {
    synthesize(text: string, lang: string): Promise<TtsAudio | null>
    status(): Promise<TtsStatus>
    provision(lang: string): Promise<boolean>
    remove(lang: string): Promise<boolean>
    onProgress(listener: (progress: TtsProgress) => void): () => void
  }
  stt: {
    transcribe(wavBase64: string, lang: string): Promise<SttResult | null>
    status(): Promise<SttStatus>
    provision(model: string): Promise<boolean>
    remove(model: string): Promise<boolean>
    cancel(): Promise<boolean>
    onProgress(listener: (progress: SttProgress) => void): () => void
  }
  data: {
    exportBackup(): Promise<{ ok: boolean; path?: string; error?: string }>
    importBackup(): Promise<{ ok: boolean; error?: string }>
    importChat(): Promise<{ ok: boolean; threadId?: string; error?: string }>
  }
  reminders: {
    onOpen(listener: () => void): () => void
  }
}
