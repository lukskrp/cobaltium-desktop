/**
 * Split streamed/plain LLM text into model thinking vs visible answer.
 * Handles `<think>` / `<reasoning>` / `<thought>` blocks (case-insensitive).
 * An unclosed trailing block counts as thinking, so tags split across
 * stream chunks still resolve correctly once the buffer accumulates.
 */

const BLOCK_RE = /<(think|reasoning|thought)\b[^>]*>([\s\S]*?)(?:<\/(?:think|reasoning|thought)>|$)/gi
const STRAY_TAG_RE = /<\/?(?:think|reasoning|thought)\b[^>]*>/gi

export interface SplitThinking {
  thinking: string
  visible: string
}

/** Combine SSE-channel thinking with tag-embedded thinking (either may be empty). */
export function mergeThinking(a: string, b: string): string {
  const left = a.trim()
  const right = b.trim()
  if (left !== '' && right !== '') return `${left}\n\n${right}`
  return left !== '' ? left : right
}

export function splitThinking(text: string): SplitThinking {
  let matched = false
  const thinkingParts: string[] = []
  const visible = text.replace(BLOCK_RE, (_match, _tag, inner: string) => {
    matched = true
    const trimmed = inner.trim()
    if (trimmed !== '') thinkingParts.push(trimmed)
    return ' '
  })
  if (!matched) return { thinking: '', visible: text }
  const cleanedVisible = visible.replace(STRAY_TAG_RE, ' ').replace(/[ \t]{2,}/g, ' ')
  const thinking = thinkingParts.join('\n\n').trim()
  return { thinking, visible: cleanedVisible }
}
