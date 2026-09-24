import { describe, expect, it } from 'vitest'
import { unzipSync } from 'fflate'
import { buildEpub, escXml } from '@shared/epub/builder'
import { decodeEntities, extractBlocks, parseEpubEntries } from '@shared/epub/parser'

describe('EpubBuilder', () => {
  it('escapes XML special characters', () => {
    expect(escXml('a & b < c > d " e \' f')).toBe('a &amp; b &lt; c &gt; d &quot; e &apos; f')
  })

  it('builds a valid stored EPUB2 archive', () => {
    const bytes = buildEpub('My Book', 'Author', [{ title: 'One', content: '<p>Hello</p>' }])
    const files = unzipSync(bytes)
    expect(new TextDecoder().decode(files['mimetype'])).toBe('application/epub+zip')
    expect(files['META-INF/container.xml']).toBeDefined()
    const opf = new TextDecoder().decode(files['OEBPS/content.opf'])
    expect(opf).toContain('<dc:title>My Book</dc:title>')
    expect(opf).toContain('<dc:creator>Author</dc:creator>')
    expect(opf).toContain('OEBPS/chapter1.xhtml'.replace('OEBPS/', '') + '"')
    expect(new TextDecoder().decode(files['OEBPS/toc.ncx'])).toContain('My Book')
  })
})

describe('EpubParser', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('caf&eacute; &#8212; &#x2764;')).toBe('café — ❤')
  })

  it('extracts paragraph blocks from XHTML', () => {
    const blocks = extractBlocks(
      '<html><head><style>p{}</style></head><body><h1>Title</h1><p>First</p><p>Second</p><div>Third</div></body></html>'
    )
    expect(blocks).toEqual(['Title', 'First', 'Second', 'Third'])
  })

  it('round-trips a built EPUB back into a ReaderBook', () => {
    const bytes = buildEpub('Round Trip', 'Tester', [
      { title: 'Chapter One', content: '<p>Hello world</p><p>Second paragraph</p>' }
    ])
    const zipped = unzipSync(bytes)
    const entries = new Map<string, string>()
    const decoder = new TextDecoder()
    for (const [name, data] of Object.entries(zipped)) {
      if (name.endsWith('/')) continue
      entries.set(name, decoder.decode(data))
    }
    const book = parseEpubEntries(entries)
    expect(book).not.toBeNull()
    expect(book?.title).toBe('Round Trip')
    expect(book?.author).toBe('Tester')
    expect(book?.chapters).toHaveLength(1)
    expect(book?.chapters[0].blocks).toContain('Hello world')
    expect(book?.chapters[0].blocks).toContain('Second paragraph')
  })

  it('returns null when there is no OPF', () => {
    expect(parseEpubEntries(new Map([['readme.txt', 'nope']]))).toBeNull()
  })
})
