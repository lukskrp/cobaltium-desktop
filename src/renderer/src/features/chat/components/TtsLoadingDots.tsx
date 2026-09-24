/**
 * Wave/bouncy 3-dot TTS loading indicator. Rendered while a message's speech
 * is synthesizing (notably the slow first TTS while the engine loads), so
 * the user sees activity. Decorative (aria-hidden), matching the streaming
 * dots in `MessageList`.
 */
export function TtsLoadingDots(): React.JSX.Element {
  return (
    <span className="mr-1 inline-flex items-center gap-1 text-muted-foreground" aria-hidden>
      <span className="animate-bounce text-[10px] leading-none">●</span>
      <span className="animate-bounce text-[10px] leading-none [animation-delay:150ms]">●</span>
      <span className="animate-bounce text-[10px] leading-none [animation-delay:300ms]">●</span>
    </span>
  )
}
