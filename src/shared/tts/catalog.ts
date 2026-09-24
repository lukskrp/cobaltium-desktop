/**
 * Offline TTS voice catalog: language -> Piper voice (rhasspy/piper-voices on
 * HuggingFace). Phonemization is done by espeak-ng (or the OpenJTalk-based
 * Japanese bridge for `phoneme_type: "japanese"`); each voice ships its own
 * license (see MODEL_CARD on HuggingFace).
 */

export const PIPER_VOICES_BASE =
  'https://huggingface.co/rhasspy/piper-voices/resolve/main/'

export interface TtsVoiceEntry {
  lang: string
  /** Human label for the settings UI. */
  label: string
  voiceId: string
  /** Path under `PIPER_VOICES_BASE`, without extension. */
  voicePath: string
  /** espeak-ng voice name (mirrors the voice config's `espeak.voice`). */
  espeakVoice: string
  /** Piper `phoneme_type`; "espeak" (default) or "japanese". */
  phonemeType?: string
  voiceLicense: string
}

export const TTS_VOICES: readonly TtsVoiceEntry[] = [
  { lang: 'en', label: 'English (US, lessac)', voiceId: 'en_US-lessac-medium', voicePath: 'en/en_US/lessac/medium/en_US-lessac-medium', espeakVoice: 'en-us', voiceLicense: 'See MODEL_CARD' },
  { lang: 'es', label: 'Spanish (davefx)', voiceId: 'es_ES-davefx-medium', voicePath: 'es/es_ES/davefx/medium/es_ES-davefx-medium', espeakVoice: 'es', voiceLicense: 'CC0' },
  { lang: 'fr', label: 'French (siwis)', voiceId: 'fr_FR-siwis-medium', voicePath: 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium', espeakVoice: 'fr-fr', voiceLicense: 'See MODEL_CARD' },
  { lang: 'de', label: 'German (thorsten)', voiceId: 'de_DE-thorsten-medium', voicePath: 'de/de_DE/thorsten/medium/de_DE-thorsten-medium', espeakVoice: 'de', voiceLicense: 'See MODEL_CARD' },
  { lang: 'it', label: 'Italian (paola)', voiceId: 'it_IT-paola-medium', voicePath: 'it/it_IT/paola/medium/it_IT-paola-medium', espeakVoice: 'it', voiceLicense: 'See MODEL_CARD' },
  { lang: 'pt', label: 'Portuguese (Brazil, faber)', voiceId: 'pt_BR-faber-medium', voicePath: 'pt/pt_BR/faber/medium/pt_BR-faber-medium', espeakVoice: 'pt-br', voiceLicense: 'See MODEL_CARD' },
  { lang: 'ru', label: 'Russian (ruslan)', voiceId: 'ru_RU-ruslan-medium', voicePath: 'ru/ru_RU/ruslan/medium/ru_RU-ruslan-medium', espeakVoice: 'ru', voiceLicense: 'See MODEL_CARD' },
  { lang: 'sv', label: 'Swedish (nst)', voiceId: 'sv_SE-nst-medium', voicePath: 'sv/sv_SE/nst/medium/sv_SE-nst-medium', espeakVoice: 'sv', voiceLicense: 'See MODEL_CARD' },
  { lang: 'da', label: 'Danish (talesyntese)', voiceId: 'da_DK-talesyntese-medium', voicePath: 'da/da_DK/talesyntese/medium/da_DK-talesyntese-medium', espeakVoice: 'da', voiceLicense: 'See MODEL_CARD' },
  { lang: 'nl', label: 'Dutch (mls)', voiceId: 'nl_NL-mls-medium', voicePath: 'nl/nl_NL/mls/medium/nl_NL-mls-medium', espeakVoice: 'nl', voiceLicense: 'See MODEL_CARD' },
  { lang: 'id', label: 'Indonesian (news_tts)', voiceId: 'id_ID-news_tts-medium', voicePath: 'id/id_ID/news_tts/medium/id_ID-news_tts-medium', espeakVoice: 'id', voiceLicense: 'See MODEL_CARD' },
  { lang: 'tr', label: 'Turkish (fahrettin)', voiceId: 'tr_TR-fahrettin-medium', voicePath: 'tr/tr_TR/fahrettin/medium/tr_TR-fahrettin-medium', espeakVoice: 'tr', voiceLicense: 'See MODEL_CARD' },
  { lang: 'ar', label: 'Arabic (kareem)', voiceId: 'ar_JO-kareem-medium', voicePath: 'ar/ar_JO/kareem/medium/ar_JO-kareem-medium', espeakVoice: 'ar', voiceLicense: 'See MODEL_CARD' },
  { lang: 'hi', label: 'Hindi (pratham)', voiceId: 'hi_IN-pratham-medium', voicePath: 'hi/hi_IN/pratham/medium/hi_IN-pratham-medium', espeakVoice: 'hi', voiceLicense: 'See MODEL_CARD' },
  { lang: 'fa', label: 'Persian (amir)', voiceId: 'fa_IR-amir-medium', voicePath: 'fa/fa_IR/amir/medium/fa_IR-amir-medium', espeakVoice: 'fa', voiceLicense: 'See MODEL_CARD' },
  { lang: 'fi', label: 'Finnish (harri)', voiceId: 'fi_FI-harri-medium', voicePath: 'fi/fi_FI/harri/medium/fi_FI-harri-medium', espeakVoice: 'fi', voiceLicense: 'See MODEL_CARD' },
  { lang: 'ko', label: 'Korean (kss)', voiceId: 'ko_KR-kss-medium', voicePath: 'ko/ko_KR/kss/medium/ko_KR-kss-medium', espeakVoice: 'ko', voiceLicense: 'See MODEL_CARD' },
  { lang: 'zh', label: 'Chinese (huayan)', voiceId: 'zh_CN-huayan-medium', voicePath: 'zh/zh_CN/huayan/medium/zh_CN-huayan-medium', espeakVoice: 'cmn', voiceLicense: 'See MODEL_CARD' },
  { lang: 'ja', label: 'Japanese (hi_fi_captain)', voiceId: 'ja_JA-hi_fi_captain-medium', voicePath: 'ja/ja_JA/hi_fi_captain/medium/ja_JA-hi_fi_captain-medium', espeakVoice: 'ja', phonemeType: 'japanese', voiceLicense: 'See MODEL_CARD' }
]

export function ttsVoiceFor(lang: string): TtsVoiceEntry | undefined {
  const code = lang.trim().toLowerCase()
  return (
    TTS_VOICES.find((entry) => entry.lang === code) ??
    TTS_VOICES.find((entry) => entry.lang === code.split('-')[0])
  )
}

export function voiceModelUrl(entry: TtsVoiceEntry): string {
  return `${PIPER_VOICES_BASE}${entry.voicePath}.onnx`
}

export function voiceConfigUrl(entry: TtsVoiceEntry): string {
  return `${PIPER_VOICES_BASE}${entry.voicePath}.onnx.json`
}

export function phonemeTypeOf(entry: TtsVoiceEntry): string {
  return entry.phonemeType ?? 'espeak'
}

const SAMPLE_WORDS: Record<string, string> = {
  en: 'hello',
  es: 'hola',
  fr: 'bonjour',
  de: 'hallo',
  it: 'ciao',
  pt: 'olá',
  ru: 'привет',
  sv: 'hej',
  da: 'hej',
  nl: 'hallo',
  id: 'halo',
  tr: 'merhaba',
  ar: 'مرحبا',
  hi: 'नमस्ते',
  fa: 'سلام',
  fi: 'hei',
  ko: '안녕하세요',
  zh: '你好',
  ja: 'こんにちは'
}

/** A short sample word for the settings "Test" button, in the voice's language. */
export function ttsSampleWord(lang: string): string {
  const code = (ttsVoiceFor(lang)?.lang ?? lang).trim().toLowerCase()
  return SAMPLE_WORDS[code] ?? 'hello'
}
