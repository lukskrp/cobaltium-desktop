import type { ChatMessage } from './llm'
import type { Message } from './models'

/** The trimmed prompt (notes + recent window) computed from a session's history. */
export interface ContextPlan {
  /** Rolling summary of messages older than the window (persisted per session). */
  notes: string
  /** Id of the newest message already folded into `notes`; empty when nothing folded yet. */
  boundaryId: string
  /** The raw recent messages to send to the model (already fits the fresh budget). */
  messages: ChatMessage[]
}

export const SAFETY_MARGIN = 128

/** Split the usable window 50/50 into (notesBudget, freshBudget). */
export function budgets(nCtx: number, maxGenTokens: number, systemTokens: number): [number, number] {
  const usable = Math.max(256, nCtx - maxGenTokens - SAFETY_MARGIN - systemTokens)
  const notes = Math.floor(usable / 2)
  return [notes, usable - notes]
}

export interface PlanInput {
  /** Rolling summary persisted for the session. */
  notes: string
  /** Id of the newest message already folded into `notes`. */
  boundaryId: string
  /** Messages in ASC order (oldest first); the newest is always kept. */
  messages: Message[]
  freshBudget: number
  notesBudget: number
  /** Exact token count of a string (model tokenizer / heuristic). */
  countTokens: (text: string) => number | Promise<number>
  /** Fold `existingNotes + foldText` into updated notes. */
  summarize: (existingNotes: string, foldText: string) => string | Promise<string>
}

/**
 * Sliding-window context management for the LLM (port of `ContextWindowPlanner`).
 *
 * The model window is split 50/50 after reserving headroom for the generated
 * reply, system prompt and a safety margin:
 *  - "context notes": a rolling LLM summary of older messages.
 *  - "fresh prompt": the newest raw messages (always includes the newest user message).
 */
export async function planContext(input: PlanInput): Promise<ContextPlan> {
  const { freshBudget, notesBudget, countTokens, summarize } = input

  // The boundary message is the newest one already folded into `notes`. If it no
  // longer exists (history edited or pruned), the persisted notes can't be
  // reconciled with the remaining messages, so they are dropped to avoid folding
  // the same history twice and doubling the summary.
  const boundaryFound =
    input.boundaryId === '' || input.messages.some((message) => message.id === input.boundaryId)
  const raw =
    input.boundaryId === '' || !boundaryFound
      ? input.messages
      : dropThrough(input.messages, input.boundaryId)

  const counts = await Promise.all(raw.map((message) => countTokens(message.content)))

  let newNotes = boundaryFound ? input.notes : ''
  let newBoundary = boundaryFound ? input.boundaryId : ''
  let window = raw

  const totalRaw = counts.reduce((sum, count) => sum + count, 0)
  if (totalRaw > freshBudget) {
    const keepStart = pickSuffix(raw.length, counts, freshBudget)
    const keep = raw.slice(keepStart)
    const toFold = raw.slice(0, keepStart)
    const foldText = await buildFoldText(toFold, freshBudget, countTokens)
    if (foldText.trim() !== '') {
      let folded = newNotes
      try {
        folded = await summarize(newNotes, foldText)
      } catch {
        // keep the previous notes on summariser failure
      }
      if (folded.trim() !== '') newNotes = folded
    }
    newBoundary = toFold.length > 0 ? toFold[toFold.length - 1].id : input.boundaryId
    window = keep
  }

  window = await ensureFits(window, freshBudget, countTokens)
  newNotes = await trimNotes(newNotes, notesBudget, countTokens)

  return {
    notes: newNotes,
    boundaryId: newBoundary,
    messages: window.map((message) => ({ role: message.role, content: message.content }))
  }
}

/** Messages after the boundary message (drop the boundary itself). */
function dropThrough(messages: Message[], boundaryId: string): Message[] {
  const index = messages.findIndex((message) => message.id === boundaryId)
  return index === -1 ? messages : messages.slice(index + 1)
}

/** Index (in ASC) of the newest suffix whose total token count fits `budget`. */
function pickSuffix(size: number, counts: number[], budget: number): number {
  let acc = 0
  let start = size
  for (let i = size - 1; i >= 0; i--) {
    if (start !== size && acc + counts[i] > budget) break
    acc += counts[i]
    start = i
  }
  return start
}

/** Flatten `toFold` (ASC) into "role: content" lines, newest-first capped to `budget`. */
async function buildFoldText(
  toFold: Message[],
  budget: number,
  countTokens: (text: string) => number | Promise<number>
): Promise<string> {
  const lines: string[] = []
  let acc = 0
  for (let i = toFold.length - 1; i >= 0; i--) {
    const message = toFold[i]
    const line = `${message.role}: ${message.content}\n`
    const tokens = await countTokens(line)
    if (lines.length > 0 && acc + tokens > budget) break
    acc += tokens
    lines.push(line)
  }
  return lines.reverse().join('')
}

/** Keep the newest messages within `budget`; truncate the newest if it alone overflows. */
async function ensureFits(
  window: Message[],
  budget: number,
  countTokens: (text: string) => number | Promise<number>
): Promise<Message[]> {
  if (window.length === 0) return window
  let total = 0
  for (const message of window) total += await countTokens(message.content)
  if (total <= budget) return window
  const newest = window[window.length - 1]
  const truncated = await truncateText(newest.content, budget, countTokens)
  return [{ ...newest, content: truncated }]
}

/** Drop the oldest notes entries until `budget` fits (selective forgetting). */
async function trimNotes(
  notes: string,
  budget: number,
  countTokens: (text: string) => number | Promise<number>
): Promise<string> {
  if (notes.trim() === '') return ''
  const entries = notes
    .split('\n')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '')
  const kept: string[] = []
  let acc = 0
  for (let i = entries.length - 1; i >= 0; i--) {
    const entry = entries[i]
    const tokens = await countTokens(entry)
    if (kept.length > 0 && acc + tokens > budget) break
    acc += tokens
    kept.push(entry)
  }
  const ordered = kept.reverse()
  if (ordered.length === 0) return ''
  let total = 0
  for (const entry of ordered) total += await countTokens(entry)
  if (total <= budget) return ordered.join('\n')
  const last = ordered[ordered.length - 1]
  const truncated = await truncateText(
    last,
    Math.max(8, budget - (total - (await countTokens(last)))),
    countTokens
  )
  return [...ordered.slice(0, -1), truncated].join('\n')
}

async function truncateText(
  text: string,
  budget: number,
  countTokens: (value: string) => number | Promise<number>
): Promise<string> {
  if ((await countTokens(text)) <= budget) return text
  let trimmed = text
  const current = await countTokens(trimmed)
  if (current > 0) {
    trimmed = trimmed.slice(0, Math.floor((trimmed.length * budget) / current))
  }
  while ((await countTokens(trimmed)) > budget && trimmed.length > 16) {
    trimmed = trimmed.slice(0, -64)
  }
  return (await countTokens(trimmed)) > budget ? text.slice(0, 16) : `${trimmed}\n[truncated]`
}
