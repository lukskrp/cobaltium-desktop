import { useSettingsStore } from '@renderer/features/settings/settings-store'
import en from '@renderer/locales/en.json'
import ar from '@renderer/locales/ar.json'
import da from '@renderer/locales/da.json'
import de from '@renderer/locales/de.json'
import es from '@renderer/locales/es.json'
import fa from '@renderer/locales/fa.json'
import fi from '@renderer/locales/fi.json'
import fr from '@renderer/locales/fr.json'
import he from '@renderer/locales/he.json'
import hi from '@renderer/locales/hi.json'
import id from '@renderer/locales/id.json'
import it from '@renderer/locales/it.json'
import ja from '@renderer/locales/ja.json'
import ko from '@renderer/locales/ko.json'
import nl from '@renderer/locales/nl.json'
import pl from '@renderer/locales/pl.json'
import pt from '@renderer/locales/pt.json'
import ru from '@renderer/locales/ru.json'
import sv from '@renderer/locales/sv.json'
import tr from '@renderer/locales/tr.json'
import zh from '@renderer/locales/zh.json'

type Dict = Record<string, string>

const EN = en as Dict
const DICTS: Record<string, Dict> = {
  en: EN,
  ar: ar as Dict,
  da: da as Dict,
  de: de as Dict,
  es: es as Dict,
  fa: fa as Dict,
  fi: fi as Dict,
  fr: fr as Dict,
  he: he as Dict,
  hi: hi as Dict,
  id: id as Dict,
  it: it as Dict,
  ja: ja as Dict,
  ko: ko as Dict,
  nl: nl as Dict,
  pl: pl as Dict,
  pt: pt as Dict,
  ru: ru as Dict,
  sv: sv as Dict,
  tr: tr as Dict,
  zh: zh as Dict
}

/** The 21 UI languages, in the Android catalog's definition order. */
export const UI_LANGUAGE_CODES = [
  'en',
  'fi',
  'he',
  'ja',
  'ko',
  'de',
  'fr',
  'pt',
  'es',
  'ru',
  'it',
  'sv',
  'da',
  'nl',
  'id',
  'pl',
  'tr',
  'ar',
  'hi',
  'fa',
  'zh'
] as const

const RTL = new Set(['ar', 'fa', 'he'])

export function isRtl(lang: string): boolean {
  return RTL.has(lang.toLowerCase())
}

export function resolveUiLanguage(setting: string): string {
  if (setting && setting !== 'auto') {
    const code = setting.toLowerCase()
    return DICTS[code] ? code : 'en'
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const base = navigator.language.slice(0, 2).toLowerCase()
    if (DICTS[base]) return base
  }
  return 'en'
}

export function translate(lang: string, key: string, ...args: (string | number)[]): string {
  const dict = DICTS[lang.toLowerCase()] ?? EN
  let value = dict[key] ?? EN[key] ?? key
  for (let i = 0; i < args.length; i++) {
    value = value.split(`{${i + 1}}`).join(String(args[i]))
  }
  return value
}

export function useUiLanguage(): string {
  const uiLanguage = useSettingsStore((s) => s.settings.uiLanguage)
  return resolveUiLanguage(uiLanguage)
}

export function useT(): (key: string, ...args: (string | number)[]) => string {
  const lang = useUiLanguage()
  return (key: string, ...args: (string | number)[]) => translate(lang, key, ...args)
}
