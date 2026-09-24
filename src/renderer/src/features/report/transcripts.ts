import { useChatStore } from '@renderer/features/chat/chat-store'
import { useLexiconStore } from '@renderer/features/lexicon/lexicon-store'
import { useReaderStore } from '@renderer/features/reader/reader-store'
import type { ReportDraft } from './report-store'

type T = (key: string, ...args: (string | number)[]) => string

function stamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString()
  } catch {
    return ''
  }
}

/** Active chat thread transcript (port of `ChatViewModel.buildThreadReport`). */
export function buildChatReport(t: T): ReportDraft | null {
  const { messages, threads, activeThreadId } = useChatStore.getState()
  if (messages.length === 0) return null
  const thread = threads.find((entry) => entry.id === activeThreadId)
  const lines = messages.map((message) => {
    const role =
      message.role === 'user'
        ? t('report.you')
        : message.role === 'assistant'
          ? t('report.assistant')
          : t('report.system')
    return `${role} [${stamp(message.createdAt)}]:\n${message.content}`
  })
  return { subject: thread?.title || t('chat.newChat'), lines }
}

/** Saved-glossary transcript (port of `LexiconViewModel.buildGlossaryReport`). */
export function buildLexiconReport(t: T): ReportDraft | null {
  const { words } = useLexiconStore.getState()
  if (words.length === 0) return null
  const lines = [...words]
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((word) => {
      const details: string[] = []
      if (word.pos) details.push(`POS: ${word.pos}`)
      if (word.translation.trim() !== '') details.push(`→ ${word.translation}`)
      const analysis = word.analysis
      if (analysis) {
        const forms = [analysis.tense, analysis.gender, analysis.number, analysis.person, analysis.case, analysis.mood, analysis.form].filter(
          (value): value is string => value != null && value !== ''
        )
        if (forms.length > 0) details.push(forms.join(', '))
        if (analysis.notes?.trim()) details.push(`notes: ${analysis.notes}`)
      }
      return `${word.word} [${word.lang}] — ${details.join('; ')}`
    })
  return { subject: t('nav.lexicon'), lines }
}

/** Current reader chapter transcript (port of `ReaderViewModel.buildReport`). */
export function buildReaderReport(_t: T): ReportDraft | null {
  const { book, state } = useReaderStore.getState()
  if (!book) return null
  const chapterIndex = Math.min(state.currentChapterIndex, book.chapters.length - 1)
  const chapter = book.chapters[chapterIndex]
  if (!chapter) return null
  const edited = state.editedBlocks[chapter.id]
  const visible =
    chapter.blocks.map((block, index) => edited?.[index] ?? block).join('\n\n').trim() || null
  if (!visible) return null
  const lines = [
    `Book: ${book.title}${book.author.trim() !== '' ? ` — ${book.author}` : ''}`,
    ...(book.languageHint ? [`Language: ${book.languageHint}`] : []),
    '',
    visible
  ]
  return { subject: book.title, lines }
}
