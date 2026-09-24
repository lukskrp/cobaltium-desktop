import { describe, expect, it } from 'vitest'
import {
  ArabicHebrewTransliterator,
  GreekCyrillicTransliterator,
  SyriacArabicTransliterator
} from '@shared/lang/transliterators'

describe('transliterators', () => {
  it('Arabic <-> Hebrew', () => {
    const toHebrew = new ArabicHebrewTransliterator('ar-he', 'arabic', 'hebrew')
    expect(toHebrew.transliterate('سلام')).toBe('סלאמ')
    expect(toHebrew.transliterate('كتاب')).toBe('כתאב')

    const toArabic = new ArabicHebrewTransliterator('he-ar', 'hebrew', 'arabic')
    expect(toArabic.transliterate('שלום')).toBe('شلوم')
    expect(toArabic.transliterate('תורה')).toBe('توره')
  })

  it('Greek <-> Cyrillic', () => {
    const toCyrillic = new GreekCyrillicTransliterator('el-cyr', 'greek', 'cyrillic')
    expect(toCyrillic.transliterate('Καλημέρα')).toBe('Калимера')
    expect(toCyrillic.transliterate('ουρανός')).toBe('уранос')
    expect(toCyrillic.transliterate('ψυχο')).toBe('психо')

    const toGreek = new GreekCyrillicTransliterator('cyr-el', 'cyrillic', 'greek')
    expect(toGreek.transliterate('мир')).toBe('μιρ')
    expect(toGreek.transliterate('лес')).toBe('λε\u03C2')
    expect(toGreek.transliterate('свет')).toBe('σβετ')
  })

  it('Syriac <-> Arabic', () => {
    const toArabic = new SyriacArabicTransliterator('syr-ar', 'syriac', 'arabic')
    expect(toArabic.transliterate('\u072B\u0720\u0721\u0710')).toBe('شلما')

    const toSyriac = new SyriacArabicTransliterator('ar-syr', 'arabic', 'syriac')
    expect(toSyriac.transliterate('سلام')).toBe('\u0723\u0720\u0710\u0721')
  })
})
