/** One EPUB chapter (a chat message, saved word, or reader chapter). */
export interface EpubChapter {
  title: string
  content: string
}

/**
 * Minimal EPUB2 builder (port of `data/export/EpubBuilder.kt`): a stored (uncompressed)
 * ZIP with the container/OPF/NCX + XHTML chapters. Deterministic and testable.
 */
export function buildEpub(title: string, author: string, chapters: EpubChapter[]): Uint8Array {
  const dateStr = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')

  const htmlChapters = chapters.map((chapter, index) => {
    const id = `chapter${index + 1}`
    const href = `${id}.xhtml`
    const body =
      '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">\n' +
      `<head><title>${escXml(chapter.title)}</title></head>\n` +
      `<body>\n<h1>${escXml(chapter.title)}</h1>\n${chapter.content}\n</body>\n</html>`
    return { id, href, title: chapter.title, body, playOrder: index + 1 }
  })

  const navPoints = htmlChapters
    .map(
      (chapter) =>
        `    <navPoint id="${chapter.id}" playOrder="${chapter.playOrder}">\n` +
        `      <navLabel><text>${escXml(chapter.title)}</text></navLabel>\n` +
        `      <content src="${chapter.href}"/>\n` +
        '    </navPoint>'
    )
    .join('\n')

  const manifestItems = htmlChapters
    .map(
      (chapter) =>
        `    <item id="${chapter.id}" href="${chapter.href}" media-type="application/xhtml+xml"/>`
    )
    .join('\n')

  const spineRefs = htmlChapters.map((chapter) => `    <itemref idref="${chapter.id}"/>`).join('\n')

  const containerXml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n' +
    '  <rootfiles>\n' +
    '    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>\n' +
    '  </rootfiles>\n' +
    '</container>'

  const uid = `urn:uuid:${randomUuid()}`
  const contentOpf =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">\n' +
    '  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">\n' +
    `    <dc:identifier id="BookId">${uid}</dc:identifier>\n` +
    `    <dc:title>${escXml(title)}</dc:title>\n` +
    `    <dc:creator>${escXml(author)}</dc:creator>\n` +
    '    <dc:language>en</dc:language>\n' +
    `    <dc:date>${dateStr}</dc:date>\n` +
    '  </metadata>\n' +
    '  <manifest>\n' +
    '    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>\n' +
    `${manifestItems}\n` +
    '  </manifest>\n' +
    '  <spine toc="ncx">\n' +
    `${spineRefs}\n` +
    '  </spine>\n' +
    '</package>'

  const tocNcx =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN" "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">\n' +
    '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">\n' +
    '  <head>\n' +
    `    <meta name="dtb:uid" content="${uid}"/>\n` +
    '    <meta name="dtb:depth" content="1"/>\n' +
    '    <meta name="dtb:totalPageCount" content="0"/>\n' +
    '    <meta name="dtb:maxPageNumber" content="0"/>\n' +
    '  </head>\n' +
    `  <docTitle><text>${escXml(title)}</text></docTitle>\n` +
    '  <navMap>\n' +
    `${navPoints}\n` +
    '  </navMap>\n' +
    '</ncx>'

  const encoder = new TextEncoder()
  const entries: Array<[string, Uint8Array]> = [
    ['mimetype', encoder.encode('application/epub+zip')],
    ['META-INF/', new Uint8Array(0)],
    ['META-INF/container.xml', encoder.encode(containerXml)],
    ['OEBPS/', new Uint8Array(0)],
    ['OEBPS/content.opf', encoder.encode(contentOpf)],
    ['OEBPS/toc.ncx', encoder.encode(tocNcx)]
  ]
  for (const chapter of htmlChapters) {
    entries.push([`OEBPS/${chapter.href}`, encoder.encode(chapter.body)])
  }

  return buildStoredZip(entries)
}

export function escXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

// ── Stored (uncompressed) ZIP writer ─────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

class ByteWriter {
  private readonly bytes: number[] = []

  u8(value: number): void {
    this.bytes.push(value & 0xff)
  }

  u16(value: number): void {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff)
  }

  u32(value: number): void {
    this.bytes.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff)
  }

  raw(data: Uint8Array): void {
    for (let i = 0; i < data.length; i++) this.bytes.push(data[i])
  }

  get length(): number {
    return this.bytes.length
  }

  toUint8Array(): Uint8Array {
    return new Uint8Array(this.bytes)
  }
}

function buildStoredZip(entries: Array<[string, Uint8Array]>): Uint8Array {
  const encoder = new TextEncoder()
  const out = new ByteWriter()
  const central = new ByteWriter()
  let offset = 0

  for (const [name, data] of entries) {
    const nameBytes = encoder.encode(name)
    const crc = crc32(data)
    const size = data.length

    out.u32(0x04034b50)
    out.u16(20)
    out.u16(0)
    out.u16(0)
    out.u16(0)
    out.u16(0)
    out.u32(crc)
    out.u32(size)
    out.u32(size)
    out.u16(nameBytes.length)
    out.u16(0)
    out.raw(nameBytes)
    out.raw(data)

    central.u32(0x02014b50)
    central.u16(20)
    central.u16(20)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u32(crc)
    central.u32(size)
    central.u32(size)
    central.u16(nameBytes.length)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u16(0)
    central.u32(0)
    central.u32(offset)
    central.raw(nameBytes)

    offset += 30 + nameBytes.length + size
  }

  out.raw(central.toUint8Array())
  out.u32(0x06054b50)
  out.u16(0)
  out.u16(0)
  out.u16(entries.length)
  out.u16(entries.length)
  out.u32(central.length)
  out.u32(offset)
  out.u16(0)

  return out.toUint8Array()
}

function randomUuid(): string {
  const cryptoObj = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
