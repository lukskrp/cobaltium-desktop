import { app } from 'electron'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  HanKanjiTransliterator,
  PinyinRomanizer,
  type LanguageEngineComponents
} from '@shared/lang'
import type { LangResourceStatus } from '@shared/ipc'

/**
 * Data files used by the data-driven romanizers/transliterators, relative to a
 * `langdata` root. Mirrors Android's `LanguageResourceRepository` layout
 * (`langdata/<namespace>/<name>`), but bundled rather than downloaded.
 */
const FILES = {
  pinyin: join('pinyin', 'pinyin.txt'),
  hanKanji: join('han', 'hanzi-kanji.txt'),
  kanjiHan: join('han', 'kanji-hanzi.txt')
} as const

/**
 * Candidate `langdata` roots, checked in order: a user-writable override first
 * (future download target), then the packaged/dev bundled copy.
 */
function langDataRoots(): string[] {
  const roots = [join(app.getPath('userData'), 'langdata')]
  roots.push(
    app.isPackaged
      ? join(process.resourcesPath, 'langdata')
      : join(app.getAppPath(), 'resources', 'langdata')
  )
  return roots
}

function readResource(relative: string): string | null {
  for (const root of langDataRoots()) {
    const path = join(root, relative)
    if (!existsSync(path)) continue
    try {
      return readFileSync(path, 'utf8')
    } catch {
      // try the next root
    }
  }
  return null
}

let status: LangResourceStatus = { pinyin: false, hanKanji: false, kanjiHan: false }

/** Populates the engine's data-driven tables from the bundled language data. */
export function loadLanguageResources(components: LanguageEngineComponents): LangResourceStatus {
  const next: LangResourceStatus = { pinyin: false, hanKanji: false, kanjiHan: false }

  const pinyinText = readResource(FILES.pinyin)
  const pinyin = components.romanizers.get('pinyin')
  if (pinyinText && pinyin instanceof PinyinRomanizer) {
    pinyin.loadFromText(pinyinText)
    next.pinyin = pinyin.isReady
  }

  const hanKanjiText = readResource(FILES.hanKanji)
  const hanKanji = components.transliterators.get('han-kanji')
  if (hanKanjiText && hanKanji instanceof HanKanjiTransliterator) {
    hanKanji.loadFromText(hanKanjiText)
    next.hanKanji = hanKanji.isReady
  }

  const kanjiHanText = readResource(FILES.kanjiHan)
  const kanjiHan = components.transliterators.get('kanji-han')
  if (kanjiHanText && kanjiHan instanceof HanKanjiTransliterator) {
    kanjiHan.loadFromText(kanjiHanText)
    next.kanjiHan = kanjiHan.isReady
  }

  status = next
  return next
}

export function languageResourcesStatus(): LangResourceStatus {
  return status
}
