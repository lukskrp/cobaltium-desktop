import type { ReaderBook, ReaderChapter } from './reader-book'

/**
 * Minimal, dependency-free EPUB text parser (port of `data/epub/EpubParser.kt`).
 * Operates on already-unzipped entries (path -> UTF-8 text) so it stays pure and
 * testable; the main process performs the unzip.
 */

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: '\u00A0', copy: '\u00A9', reg: '\u00AE', trade: '\u2122', deg: '\u00B0',
  plusmn: '\u00B1', middot: '\u00B7', times: '\u00D7', divide: '\u00F7', ndash: '\u2013',
  mdash: '\u2014', hellip: '\u2026', lsquo: '\u2018', rsquo: '\u2019', sbquo: '\u201A',
  ldquo: '\u201C', rdquo: '\u201D', bdquo: '\u201E', bull: '\u2022', laquo: '\u00AB',
  raquo: '\u00BB', sect: '\u00A7', para: '\u00B6', micro: '\u00B5', sup1: '\u00B9',
  sup2: '\u00B2', sup3: '\u00B3', frac14: '\u00BC', frac12: '\u00BD', frac34: '\u00BE',
  iexcl: '\u00A1', iquest: '\u00BF', agrave: '\u00E0', aacute: '\u00E1', acirc: '\u00E2',
  atilde: '\u00E3', auml: '\u00E4', aring: '\u00E5', aelig: '\u00E6', ccedil: '\u00E7',
  egrave: '\u00E8', eacute: '\u00E9', ecirc: '\u00EA', euml: '\u00EB', igrave: '\u00EC',
  iacute: '\u00ED', icirc: '\u00EE', iuml: '\u00EF', ntilde: '\u00F1', ograve: '\u00F2',
  oacute: '\u00F3', ocirc: '\u00F4', otilde: '\u00F5', ouml: '\u00F6', oslash: '\u00F8',
  ugrave: '\u00F9', uacute: '\u00FA', ucirc: '\u00FB', uuml: '\u00FC', yacute: '\u00FD',
  thorn: '\u00FE', szlig: '\u00DF', Agrave: '\u00C0', Aacute: '\u00C1', Acirc: '\u00C2',
  Atilde: '\u00C3', Auml: '\u00C4', Aring: '\u00C5', AElig: '\u00C6', Ccedil: '\u00C7',
  Egrave: '\u00C8', Eacute: '\u00C9', Ecirc: '\u00CA', Euml: '\u00CB', Igrave: '\u00CC',
  Iacute: '\u00CD', Icirc: '\u00CE', Iuml: '\u00CF', Ntilde: '\u00D1', Ograve: '\u00D2',
  Oacute: '\u00D3', Ocirc: '\u00D4', Otilde: '\u00D5', Ouml: '\u00D6', Oslash: '\u00D8',
  Ugrave: '\u00D9', Uacute: '\u00DA', Ucirc: '\u00DB', Uuml: '\u00DC', Yacute: '\u00DD',
  THORN: '\u00DE'
}

export function decodeEntities(text: string): string {
  let s = text.replace(/&#(\d+);|&#x([0-9a-fA-F]+);/g, (match, dec: string, hex: string) => {
    const code = dec !== undefined && dec !== '' ? Number.parseInt(dec, 10) : Number.parseInt(hex, 16)
    try {
      return String.fromCodePoint(code)
    } catch {
      return match
    }
  })
  s = s.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name: string) => NAMED_ENTITIES[name] ?? match)
  s = s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
  return s
}

function attr(attributes: string, name: string): string | null {
  const match = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, 'i').exec(attributes)
  return match ? match[1] : null
}

function resolvePath(baseDir: string, rel: string): string | null {
  const combined = baseDir === '' ? rel : `${baseDir}/${rel}`
  const parts: string[] = []
  for (const segment of combined.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') {
      if (parts.length === 0) return null
      parts.pop()
    } else {
      parts.push(segment)
    }
  }
  return parts.join('/')
}

/** Split an XHTML chapter into paragraph text blocks (lenient tag-stripper). */
export function extractBlocks(xhtml: string): string[] {
  let s = xhtml.replace(/<(script|style|head|nav|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
  s = s.replace(
    /<\/?(?:p|h[1-6]|li|blockquote|div|section|article|td|th|pre|figcaption|dt|dd)\b[^>]*>/gi,
    '\n'
  )
  s = s.replace(/<br\s*\/?>/gi, '\n')
  s = s.replace(/<[^>]+>/g, '')
  s = decodeEntities(s)
  return s
    .split('\n')
    .map((line) => line.trim().replace(/[\s\u00A0]+/g, ' '))
    .filter((line) => line !== '')
}

function firstTagText(text: string, name: string): string | null {
  const match = new RegExp(`<(?:dc:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:dc:)?${name}>`, 'i').exec(text)
  if (!match) return null
  const value = decodeEntities(match[1]).replace(/<[^>]+>/g, '').trim()
  return value !== '' ? value : null
}

function normalizeLang(raw: string): string | null {
  const code = raw.trim().toLowerCase()
  if (code === '') return null
  const short = code.slice(0, 2)
  return /^[a-z]{2}$/.test(short) ? short : null
}

function titleFromHref(href: string): string {
  const base = href.split('/').pop()?.replace(/\.[^.]+$/, '') ?? href
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/** Parse unzipped EPUB entries into a ReaderBook, or null when unreadable. */
export function parseEpubEntries(entries: Map<string, string>): ReaderBook | null {
  try {
    const container = entries.get('META-INF/container.xml')
    let opfPath: string | null = null
    if (container) {
      const rootfiles = container.match(/<rootfile\b[^>]*>/gi) ?? []
      for (const tag of rootfiles) {
        if (attr(tag, 'media-type') === 'application/oebps-package+xml') {
          const path = attr(tag, 'full-path')
          if (path) {
            opfPath = path
            break
          }
        }
      }
      if (!opfPath) {
        for (const tag of rootfiles) {
          const path = attr(tag, 'full-path')
          if (path) {
            opfPath = path
            break
          }
        }
      }
    }
    if (!opfPath) {
      opfPath = [...entries.keys()].find((key) => key.toLowerCase().endsWith('.opf')) ?? null
    }
    if (!opfPath) return null
    opfPath = opfPath.replace(/^\/+/, '')
    const opf = entries.get(opfPath)
    if (!opf) return null

    const opfDir = opfPath.includes('/') ? opfPath.slice(0, opfPath.lastIndexOf('/')) : ''

    const manifest = new Map<string, string>()
    for (const tag of opf.match(/<item\b[^>]*>/gi) ?? []) {
      const id = attr(tag, 'id')
      const href = attr(tag, 'href')
      if (id && href) manifest.set(id, href)
    }

    const spine: string[] = []
    for (const tag of opf.match(/<itemref\b[^>]*>/gi) ?? []) {
      const idref = attr(tag, 'idref')
      if (idref) spine.push(idref)
    }

    const title = firstTagText(opf, 'title') ?? ''
    const author = firstTagText(opf, 'creator') ?? ''
    const language = firstTagText(opf, 'language')
    const languageHint = language ? normalizeLang(language) : null

    const chapters: ReaderChapter[] = []
    for (const id of spine) {
      const href = manifest.get(id)
      if (!href) continue
      const path = resolvePath(opfDir, href)
      if (!path) continue
      const xhtml = entries.get(path)
      if (!xhtml) continue
      const blocks = extractBlocks(xhtml)
      if (blocks.length === 0) continue
      const docTitle = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(xhtml)
      const chapterTitle =
        docTitle && decodeEntities(docTitle[1]).trim() !== ''
          ? decodeEntities(docTitle[1]).trim()
          : titleFromHref(href)
      chapters.push({ id, href, title: chapterTitle, blocks })
    }
    if (chapters.length === 0) return null

    return {
      id: '',
      title: title || 'Untitled',
      author,
      languageHint,
      chapters
    }
  } catch {
    return null
  }
}
