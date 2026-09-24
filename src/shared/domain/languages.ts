/** Language-code -> English name map (subset used by prompts and labels). */
const LANGUAGE_NAMES: Record<string, string> = {
  es: 'Spanish',
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  'pt-br': 'Portuguese BR',
  fi: 'Finnish',
  ru: 'Russian',
  uk: 'Ukrainian',
  cs: 'Czech',
  bg: 'Bulgarian',
  et: 'Estonian',
  sv: 'Swedish',
  nl: 'Dutch',
  da: 'Danish',
  nb: 'Norwegian Bokmål',
  nn: 'Norwegian Nynorsk',
  ro: 'Romanian',
  sk: 'Slovak',
  sl: 'Slovenian',
  el: 'Greek',
  hu: 'Hungarian',
  pl: 'Polish',
  be: 'Belarusian',
  kk: 'Kazakh',
  ky: 'Kyrgyz',
  mk: 'Macedonian',
  mn: 'Mongolian',
  sr: 'Serbian',
  tg: 'Tajik',
  tt: 'Tatar',
  bn: 'Bengali',
  gu: 'Gujarati',
  hi: 'Hindi',
  kn: 'Kannada',
  ml: 'Malayalam',
  mr: 'Marathi',
  ne: 'Nepali',
  or: 'Odia',
  pa: 'Punjabi',
  si: 'Sinhala',
  ta: 'Tamil',
  te: 'Telugu',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  ar: 'Arabic',
  fa: 'Persian',
  he: 'Hebrew',
  ps: 'Pashto',
  ur: 'Urdu',
  km: 'Khmer',
  lo: 'Lao',
  my: 'Burmese',
  th: 'Thai',
  vi: 'Vietnamese'
}

export const Languages = {
  name(code: string): string {
    return LANGUAGE_NAMES[code.toLowerCase()] ?? code
  }
}

/** Curated language codes surfaced in pickers (the Cobaltium focus set). */
export const CORE_LANGUAGE_CODES = [
  'en',
  'es',
  'pt',
  'pt-br',
  'fr',
  'it',
  'de',
  'nl',
  'sv',
  'da',
  'fi',
  'pl',
  'ru',
  'uk',
  'tr',
  'id',
  'ar',
  'fa',
  'he',
  'hi',
  'ja',
  'ko',
  'zh'
] as const

export interface LanguageOption {
  code: string
  name: string
}

export function coreLanguages(): LanguageOption[] {
  return CORE_LANGUAGE_CODES.map((code) => ({ code, name: Languages.name(code) }))
}

