import { sqliteTable, text, integer, real, index, uniqueIndex, primaryKey } from 'drizzle-orm/sqlite-core'

/** Generic key/value settings + misc app metadata. */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull()
})

/** Encrypted API keys (ciphertext only). See `security/secure-keys.ts`. */
export const secureKeys = sqliteTable('secure_keys', {
  id: text('id').primaryKey(),
  ciphertext: text('ciphertext').notNull(),
  updatedAt: integer('updated_at').notNull()
})

export const threads = sqliteTable('threads', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  collapsed: integer('collapsed', { mode: 'boolean' }).notNull(),
  mode: text('mode').notNull().default('conversation'),
  starred: integer('starred', { mode: 'boolean' }).notNull().default(false),
  draft: text('draft').notNull().default(''),
  contextNotes: text('context_notes').notNull().default(''),
  notesThroughMessageId: text('notes_through_message_id').notNull().default('')
})

export const messages = sqliteTable(
  'messages',
  {
    id: text('id').primaryKey(),
    threadId: text('thread_id')
      .notNull()
      .references(() => threads.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    content: text('content').notNull(),
    createdAt: integer('created_at').notNull(),
    immersiveJson: text('immersive_json')
  },
  (table) => [index('messages_thread_id_idx').on(table.threadId)]
)

export const savedWords = sqliteTable(
  'saved_words',
  {
    id: text('id').primaryKey(),
    word: text('word').notNull(),
    lang: text('lang').notNull(),
    otherLang: text('other_lang').notNull(),
    translation: text('translation').notNull(),
    hoverType: text('hover_type').notNull(),
    pos: text('pos'),
    definitionsJson: text('definitions_json'),
    analysisJson: text('analysis_json'),
    savedAt: integer('saved_at').notNull(),
    folderId: text('folder_id')
  },
  (table) => [
    uniqueIndex('saved_words_word_lang_idx').on(table.word, table.lang),
    index('saved_words_folder_id_idx').on(table.folderId)
  ]
)

export const glossaryCache = sqliteTable(
  'glossary_cache',
  {
    id: text('id').primaryKey(),
    word: text('word').notNull(),
    lang: text('lang').notNull(),
    analysisJson: text('analysis_json'),
    createdAt: integer('created_at').notNull()
  },
  (table) => [index('glossary_cache_word_lang_idx').on(table.word, table.lang)]
)

export const savedFolders = sqliteTable(
  'saved_folders',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    parentId: text('parent_id'),
    lang: text('lang'),
    createdAt: integer('created_at').notNull()
  },
  (table) => [
    index('saved_folders_parent_id_idx').on(table.parentId),
    uniqueIndex('saved_folders_parent_name_idx').on(table.parentId, table.name)
  ]
)

export const savedPhrases = sqliteTable('saved_phrases', {
  id: text('id').primaryKey(),
  phrase: text('phrase').notNull(),
  lang: text('lang').notNull(),
  translation: text('translation').notNull().default(''),
  createdAt: integer('created_at').notNull(),
  folderId: text('folder_id')
})

export const srsCards = sqliteTable(
  'srs_cards',
  {
    deckId: text('deck_id').notNull(),
    cardId: text('card_id').notNull(),
    ease: real('ease').notNull(),
    intervalDays: integer('interval_days').notNull(),
    dueEpochMs: integer('due_epoch_ms').notNull(),
    lapses: integer('lapses').notNull()
  },
  (table) => [
    primaryKey({ columns: [table.deckId, table.cardId] }),
    index('srs_cards_card_id_idx').on(table.cardId)
  ]
)

export const srsDecks = sqliteTable(
  'srs_decks',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    createdAt: integer('created_at').notNull()
  },
  (table) => [uniqueIndex('srs_decks_name_idx').on(table.name)]
)

export const srsDeckCards = sqliteTable(
  'srs_deck_cards',
  {
    deckId: text('deck_id')
      .notNull()
      .references(() => srsDecks.id, { onDelete: 'cascade' }),
    cardId: text('card_id').notNull()
  },
  (table) => [
    primaryKey({ columns: [table.deckId, table.cardId] }),
    index('srs_deck_cards_card_id_idx').on(table.cardId)
  ]
)

export type SettingRow = typeof settings.$inferSelect
export type NewSettingRow = typeof settings.$inferInsert
export type ThreadRow = typeof threads.$inferSelect
export type NewThreadRow = typeof threads.$inferInsert
export type MessageRow = typeof messages.$inferSelect
export type NewMessageRow = typeof messages.$inferInsert
export type SecureKeyRow = typeof secureKeys.$inferSelect
