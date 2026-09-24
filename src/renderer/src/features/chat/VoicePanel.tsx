import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Mic, X } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { getApi } from '@renderer/lib/ipc'
import { useT } from '@renderer/lib/i18n'
import { MicError, startMicCapture, type MicCapture } from '@renderer/lib/mic'
import { resolveVoiceInputLang, useChatStore } from './chat-store'
import { useSettingsStore } from '@renderer/features/settings/settings-store'
import { useSttStore } from '@renderer/features/settings/stt-store'
import { LanguageSelect } from './components/LanguageSelect'

type Phase = 'idle' | 'recording' | 'transcribing'

function micMessage(kind: string, t: (key: string) => string): string {
  if (kind === 'denied') return t('voice.micDenied')
  if (kind === 'no-device') return t('voice.noMic')
  return t('voice.sttError')
}

/**
 * Voice-mode input (port of Android's `VoiceInputPanel` + `VoiceLanguageBar`):
 * a language bar ("I speak" / "Assistant replies") above a big push-to-talk
 * record button. Releasing the button transcribes via whisper.cpp and sends
 * the transcript as a chat message.
 */
export function VoicePanel(): React.JSX.Element {
  const t = useT()
  const settings = useSettingsStore((s) => s.settings)
  const patch = useSettingsStore((s) => s.patch)
  const send = useChatStore((s) => s.send)
  const isGenerating = useChatStore((s) => s.isGenerating)
  const sttStatus = useSttStore((s) => s.status)
  const loadStt = useSttStore((s) => s.load)

  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  // The live capture lives in a ref (rendering only depends on phase/error).
  // ChatPage keys this panel per thread, so a thread switch remounts it.
  const captureRef = useRef<MicCapture | null>(null)

  useEffect(() => {
    void loadStt()
  }, [loadStt])

  // Cancel any in-flight capture on unmount.
  useEffect(() => {
    return () => {
      captureRef.current?.cancel()
      captureRef.current = null
    }
  }, [])

  const micOn = settings.micEnabled
  const modelReady = !!sttStatus?.provisioned
  const inputLang = resolveVoiceInputLang(settings)
  const busy = phase !== 'idle' || isGenerating

  async function toggle(): Promise<void> {
    setError(null)
    if (phase === 'recording' && captureRef.current) {
      const active = captureRef.current
      captureRef.current = null
      setPhase('transcribing')
      try {
        const { wavBase64 } = await active.stop()
        const result = await getApi()?.stt.transcribe(wavBase64, inputLang)
        const text = result?.text?.trim() ?? ''
        if (text !== '') {
          await send(text)
        } else {
          setError(t('voice.sttError'))
        }
      } catch (err) {
        if (err instanceof MicError && err.kind === 'too-long') {
          setError(t('voice.tooLong'))
        } else if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(t('voice.sttError'))
        }
      } finally {
        setPhase('idle')
      }
      return
    }
    if (phase !== 'idle') return
    try {
      captureRef.current = await startMicCapture()
      setPhase('recording')
    } catch (err) {
      setError(err instanceof MicError ? micMessage(err.kind, t) : t('voice.sttError'))
    }
  }

  function cancel(): void {
    captureRef.current?.cancel()
    captureRef.current = null
    setPhase('idle')
    void getApi()?.stt.cancel()
  }

  return (
    <div className="shrink-0 border-t border-border bg-card px-4 pb-4 pt-2">
      <div className="flex items-center gap-4 pb-1">
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs">
          <Mic className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="shrink-0 font-medium text-muted-foreground">{t('voice.speakLang')}</span>
          <LanguageSelect
            className="h-7 min-w-0 flex-1 text-xs"
            value={settings.voiceInputLang}
            includeAuto
            ariaLabel={t('voice.speakLang')}
            onChange={(value) => void patch({ voiceInputLang: value })}
          />
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs">
          <span className="shrink-0 font-medium text-muted-foreground">{t('voice.replyLang')}</span>
          <LanguageSelect
            className="h-7 min-w-0 flex-1 text-xs"
            value={settings.voiceResponseLang}
            includeAuto
            ariaLabel={t('voice.replyLang')}
            onChange={(value) => void patch({ voiceResponseLang: value })}
          />
        </label>
      </div>

      {!micOn ? (
        <p className="py-2 text-center text-xs text-muted-foreground">{t('voice.enableMic')}</p>
      ) : !modelReady ? (
        <p className="py-2 text-center text-xs text-muted-foreground">{t('voice.noModel')}</p>
      ) : (
        <div className="relative">
          {error && <p className="pb-1 text-center text-xs text-destructive">{error}</p>}
          {phase === 'idle' && !isGenerating ? null : (
            <p className="pb-1 text-center text-xs text-muted-foreground">
              {phase === 'recording'
                ? t('voice.listening')
                : phase === 'transcribing'
                  ? t('voice.transcribing')
                  : t('voice.thinking')}
            </p>
          )}
          <button
            type="button"
            onClick={() => void toggle()}
            disabled={!micOn || !modelReady || (busy && phase !== 'recording')}
            title={t('voice.tapToTalk')}
            className={cn(
              'flex h-[72px] w-full items-center justify-center gap-3 rounded-2xl text-white transition-colors',
              phase === 'recording'
                ? 'animate-pulse bg-destructive'
                : 'bg-primary hover:bg-primary/90',
              (!micOn || !modelReady) && 'cursor-not-allowed opacity-40'
            )}
          >
            {phase === 'recording' ? (
              <>
                <Mic className="size-10" />
                <ArrowRight className="size-8" aria-label={t('voice.send')} />
              </>
            ) : (
              <Mic className="size-10" aria-label={t('voice.tapToTalk')} />
            )}
          </button>
          {phase === 'recording' && (
            <button
              type="button"
              onClick={cancel}
              title={t('voice.cancel')}
              className="absolute right-2 top-8 flex h-7 w-[52px] items-center justify-center rounded-lg bg-card text-destructive shadow"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
