import { describe, expect, it } from 'vitest'
import { isRtl, resolveUiLanguage, translate, UI_LANGUAGE_CODES } from '@renderer/lib/i18n'
import en from '@renderer/locales/en.json'
import ar from '@renderer/locales/ar.json'
import de from '@renderer/locales/de.json'
import fi from '@renderer/locales/fi.json'
import he from '@renderer/locales/he.json'
import hi from '@renderer/locales/hi.json'
import ja from '@renderer/locales/ja.json'
import ko from '@renderer/locales/ko.json'
import pl from '@renderer/locales/pl.json'
import ru from '@renderer/locales/ru.json'
import tr from '@renderer/locales/tr.json'
import zh from '@renderer/locales/zh.json'

const EN = en as Record<string, string>
const SAMPLES: Record<string, Record<string, string>> = {
  ar: ar as Record<string, string>,
  de: de as Record<string, string>,
  fi: fi as Record<string, string>,
  he: he as Record<string, string>,
  hi: hi as Record<string, string>,
  ja: ja as Record<string, string>,
  ko: ko as Record<string, string>,
  pl: pl as Record<string, string>,
  ru: ru as Record<string, string>,
  tr: tr as Record<string, string>,
  zh: zh as Record<string, string>
}

describe('i18n', () => {
  it('exposes the 21 UI languages', () => {
    expect(UI_LANGUAGE_CODES).toHaveLength(21)
    expect([...UI_LANGUAGE_CODES].sort()).toEqual([
      'ar', 'da', 'de', 'en', 'es', 'fa', 'fi', 'fr', 'he', 'hi', 'id', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'sv', 'tr', 'zh'
    ])
  })

  it('every locale carries the full key set', () => {
    const enKeys = Object.keys(EN).sort()
    for (const [lang, dict] of Object.entries(SAMPLES)) {
      expect(Object.keys(dict).sort(), `locale ${lang}`).toEqual(enKeys)
    }
  })

  it('translates action strings into the target language', () => {
    expect(translate('ru', 'nav.lexicon')).not.toBe('nav.lexicon')
    expect(translate('de', 'chat.send')).not.toBe('chat.send')
    expect(translate('ar', 'srs.good')).not.toBe('srs.good')
    expect(translate('zh', 'chat.mode.immersive')).not.toBe('chat.mode.immersive')
    expect(translate('ja', 'theme.dark')).not.toBe('theme.dark')
  })

  it('interpolates positional arguments', () => {
    expect(translate('en', 'srs.dueCount', 3)).toContain('3')
    expect(translate('en', 'settings.active', 'V', 'M', 'U')).toContain('V')
  })

  it('resolves the UI language and RTL scripts', () => {
    expect(resolveUiLanguage('de')).toBe('de')
    expect(resolveUiLanguage('unsupported')).toBe('en')
    expect(isRtl('ar')).toBe(true)
    expect(isRtl('fa')).toBe(true)
    expect(isRtl('he')).toBe(true)
    expect(isRtl('en')).toBe(false)
    expect(isRtl('ru')).toBe(false)
  })
})
