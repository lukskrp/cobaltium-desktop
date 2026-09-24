import { describe, expect, it } from 'vitest'
import { ArabicInflector } from '@shared/lang/inflectors/arabic'
import type { InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'

async function inflect(
  lemma: string,
  lang: string,
  pos: string | null
): Promise<InflectionParadigm> {
  const paradigm = await ArabicInflector.inflect(lemma, lang, pos)
  if (!paradigm) throw new Error('null paradigm')
  return paradigm
}

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function form(t: ParadigmTable, label: string): string {
  const row = t.rows.find((r) => r.label === label)
  if (!row) throw new Error(`missing row ${label}`)
  return row.cells[0]
}

function nounCell(p: InflectionParadigm, caseName: string, column: number): string {
  const row = table(p, 'إعراب الاسم').rows.find((r) => r.label === caseName)
  if (!row) throw new Error(`missing row ${caseName}`)
  return row.cells[column]
}

describe('ArabicInflector', () => {
  // ── Sound verb conjugation ─────────────────────────────────────────────

  it('soundVerbKatabaConjugates', async () => {
    const p = await inflect('كَتَبَ', 'ar', 'verb')
    expect(p.kind).toBe('conjugation')
    expect(p.lemma).toBe('كَتَبَ')
    expect(p.tables).toHaveLength(3)

    const present = table(p, 'المضارع')
    expect(form(present, 'هو')).toBe('يَكْتُبُ')
    expect(form(present, 'هي')).toBe('تَكْتُبُ')
    expect(form(present, 'أنتَ')).toBe('تَكْتُبُ')
    expect(form(present, 'أنتِ')).toBe('تَكْتُبِينَ')
    expect(form(present, 'أنا')).toBe('أَكْتُبُ')
    expect(form(present, 'هم')).toBe('يَكْتُبُونَ')
    expect(form(present, 'هنَّ')).toBe('يَكْتُبْنَ')
    expect(form(present, 'أنتم')).toBe('تَكْتُبُونَ')
    expect(form(present, 'أنتنَّ')).toBe('تَكْتُبْنَ')
    expect(form(present, 'نحن')).toBe('نَكْتُبُ')

    const past = table(p, 'الماضي')
    expect(form(past, 'هو')).toBe('كَتَبَ')
    expect(form(past, 'هي')).toBe('كَتَبَتْ')
    expect(form(past, 'أنتَ')).toBe('كَتَبْتَ')
    expect(form(past, 'أنتِ')).toBe('كَتَبْتِ')
    expect(form(past, 'أنا')).toBe('كَتَبْتُ')
    expect(form(past, 'هم')).toBe('كَتَبُوا')
    expect(form(past, 'هنَّ')).toBe('كَتَبْنَ')
    expect(form(past, 'أنتم')).toBe('كَتَبْتُمْ')
    expect(form(past, 'أنتنَّ')).toBe('كَتَبْتُنَّ')
    expect(form(past, 'نحن')).toBe('كَتَبْنَا')

    const imperative = table(p, 'الأمر')
    expect(form(imperative, 'أنتَ')).toBe('اكْتُبْ')
    expect(form(imperative, 'أنتِ')).toBe('اكْتُبِي')
    expect(form(imperative, 'أنتم')).toBe('اكْتُبُوا')
    expect(form(imperative, 'أنتنَّ')).toBe('اكْتُبْنَ')
  })

  // ── Irregular verbs (curated) ──────────────────────────────────────────

  it('irregularVerbsUseCuratedForms', async () => {
    const qala = await inflect('قَالَ', 'ar', 'verb')
    expect(form(table(qala, 'المضارع'), 'هو')).toBe('يَقُولُ')
    expect(form(table(qala, 'الماضي'), 'هو')).toBe('قَالَ')
    expect(form(table(qala, 'الأمر'), 'أنتَ')).toBe('قُلْ')
    expect(form(table(qala, 'المضارع'), 'هنَّ')).toBe('يَقُلْنَ') // hollow verb drops the waw
    expect(form(table(qala, 'الأمر'), 'أنتِ')).toBe('قُولِي')

    const kana = await inflect('كَانَ', 'ar', 'verb')
    expect(form(table(kana, 'المضارع'), 'هو')).toBe('يَكُونُ')
    expect(form(table(kana, 'الماضي'), 'هو')).toBe('كَانَ')
    expect(form(table(kana, 'الأمر'), 'أنتَ')).toBe('كُنْ')

    const raa = await inflect('رَأَى', 'ar', 'verb')
    expect(form(table(raa, 'المضارع'), 'هو')).toBe('يَرَى')
    expect(form(table(raa, 'المضارع'), 'أنا')).toBe('أَرَى')
    expect(form(table(raa, 'المضارع'), 'هم')).toBe('يَرَوْنَ')
    expect(form(table(raa, 'الماضي'), 'أنا')).toBe('رَأَيْتُ')
  })

  // ── Nouns ──────────────────────────────────────────────────────────────

  it('nounDeclinesAcrossCasesAndDefiniteness', async () => {
    const kitab = await inflect('كِتَاب', 'ar', 'noun')
    expect(kitab.kind).toBe('declension')
    expect(kitab.lemma).toBe('كِتَاب')
    expect(table(kitab, 'إعراب الاسم').columns).toEqual(['نكرة', 'معرفة'])
    expect(nounCell(kitab, 'مرفوع', 0)).toBe('كِتَابٌ')
    expect(nounCell(kitab, 'مرفوع', 1)).toBe('الْكِتَابُ')
    expect(nounCell(kitab, 'منصوب', 0)).toBe('كِتَابًا')
    expect(nounCell(kitab, 'مجرور', 0)).toBe('كِتَابٍ')

    const madina = await inflect('مَدِينَة', 'ar', 'noun')
    expect(nounCell(madina, 'منصوب', 0)).toBe('مَدِينَةً') // taa-marbuta accusative
    expect(nounCell(madina, 'مرفوع', 1)).toBe('الْمَدِينَةُ')

    const plural = table(kitab, 'جمع التكسير')
    expect(plural.rows.find((r) => r.label === 'مرفوع')?.cells[0]).toBe('كُتُبٌ')
    expect(plural.rows.find((r) => r.label === 'مرفوع')?.cells[1]).toBe('الْكُتُبُ')
  })

  // ── Classification & fallback ──────────────────────────────────────────

  it('classificationAndFallback', async () => {
    expect(await ArabicInflector.inflect('كَتَبَ', 'de', 'verb')).toBeNull() // wrong language
    expect(await ArabicInflector.inflect('   ', 'ar', 'noun')).toBeNull() // blank lemma
    expect(await ArabicInflector.inflect('هو', 'ar', 'pronoun')).toBeNull() // LLM tier
    expect(await ArabicInflector.inflect('لَعِبَ', 'ar', 'verb')).toBeNull() // not in curated dictionary
    expect(await ArabicInflector.inflect('قَمَر', 'ar', 'noun')).toBeNull() // not in curated dictionary

    // Blank pos falls back to the noun path.
    const blankPos = await inflect('كتاب', 'ar', null)
    expect(nounCell(blankPos, 'مرفوع', 0)).toBe('كِتَابٌ')

    // Adjectives agree in gender/number but stay learner-minimal (note only).
    const adjective = await inflect('كَبِير', 'ar', 'adjective')
    expect(adjective.kind).toBeNull()
    expect(adjective.lang).toBe('ar')
  })
})
