import { describe, expect, it } from 'vitest'
import { TurkishInflector } from '@shared/lang/inflectors/turkish'
import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  return p.tables.find((t) => t.title === title)!
}

function cell(t: ParadigmTable, row: number): string {
  return t.rows[row].cells[0]
}

function cellByLabel(t: ParadigmTable, label: string): string {
  return t.rows.find((r) => r.label === label)!.cells[0]
}

// ── Nouns ───────────────────────────────────────────────────────────────

function nounRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  return p.tables[0].rows.find((r) => r.label === caseName)!
}

describe('TurkishInflector', () => {
  it('vowelHarmonyNounDeclines', async () => {
    const ev = (await TurkishInflector.inflect('ev', 'tr', 'noun'))!
    expect(ev.kind).toBe('declension')
    expect(nounRow(ev, 'Yalın').cells).toEqual(['ev', 'evler'])
    expect(nounRow(ev, 'İlgeç (-in)').cells).toEqual(['evin', 'evlerin'])
    expect(nounRow(ev, 'Yönelme (-e)').cells).toEqual(['eve', 'evlere'])
    expect(nounRow(ev, 'Belirtme (-i)').cells).toEqual(['evi', 'evleri'])
    expect(nounRow(ev, 'Bulunma (-de)').cells).toEqual(['evde', 'evlerde'])
    expect(nounRow(ev, 'Ayrılma (-den)').cells).toEqual(['evden', 'evlerden'])

    const okul = (await TurkishInflector.inflect('okul', 'tr', 'noun'))!
    expect(nounRow(okul, 'İlgeç (-in)').cells[0]).toBe('okulun') // back u -> -un
    expect(nounRow(okul, 'Yönelme (-e)').cells[0]).toBe('okula')
    expect(nounRow(okul, 'Belirtme (-i)').cells[0]).toBe('okulu')
    expect(nounRow(okul, 'Bulunma (-de)').cells[0]).toBe('okulda')

    const göz = (await TurkishInflector.inflect('göz', 'tr', 'noun'))!
    expect(nounRow(göz, 'İlgeç (-in)').cells[0]).toBe('gözün') // front ö -> -ün
    expect(nounRow(göz, 'Yönelme (-e)').cells[0]).toBe('göze')
    expect(nounRow(göz, 'Belirtme (-i)').cells[0]).toBe('gözü')
  })

  it('consonantVoicingNouns', async () => {
    const kitap = (await TurkishInflector.inflect('kitap', 'tr', 'noun'))!
    expect(nounRow(kitap, 'İlgeç (-in)').cells[0]).toBe('kitabın') // p -> b
    expect(nounRow(kitap, 'Yönelme (-e)').cells[0]).toBe('kitaba')
    expect(nounRow(kitap, 'Belirtme (-i)').cells[0]).toBe('kitabı')
    expect(nounRow(kitap, 'Bulunma (-de)').cells[0]).toBe('kitapta') // locative keeps p
    expect(nounRow(kitap, 'Ayrılma (-den)').cells[0]).toBe('kitaptan')
    expect(nounRow(kitap, 'Yalın').cells[1]).toBe('kitaplar')
    expect(nounRow(kitap, 'İlgeç (-in)').cells[1]).toBe('kitapların')
  })

  it('yBufferAndVowelDropNouns', async () => {
    const araba = (await TurkishInflector.inflect('araba', 'tr', 'noun'))!
    expect(nounRow(araba, 'İlgeç (-in)').cells[0]).toBe('arabanın') // -y- buffer
    expect(nounRow(araba, 'Yönelme (-e)').cells[0]).toBe('arabaya')
    expect(nounRow(araba, 'Belirtme (-i)').cells[0]).toBe('arabayı')
    expect(nounRow(araba, 'Bulunma (-de)').cells[0]).toBe('arabada')

    const şehir = (await TurkishInflector.inflect('şehir', 'tr', 'noun'))!
    expect(nounRow(şehir, 'İlgeç (-in)').cells[0]).toBe('şehrin') // vowel drop
    expect(nounRow(şehir, 'Yönelme (-e)').cells[0]).toBe('şehre')
    expect(nounRow(şehir, 'Belirtme (-i)').cells[0]).toBe('şehri')
    expect(nounRow(şehir, 'Bulunma (-de)').cells[0]).toBe('şehirde')
  })

  // ── Verbs ───────────────────────────────────────────────────────────────

  it('gelmekConjugates', async () => {
    const p = (await TurkishInflector.inflect('gelmek', 'tr', 'verb'))!
    expect(p.kind).toBe('conjugation')

    const simdiki = table(p, 'Şimdiki zaman')
    expect(cell(simdiki, 0)).toBe('geliyorum')
    expect(cell(simdiki, 1)).toBe('geliyorsun')
    expect(cell(simdiki, 2)).toBe('geliyor')
    expect(cell(simdiki, 3)).toBe('geliyoruz')
    expect(cell(simdiki, 5)).toBe('geliyorlar')

    const genis = table(p, 'Geniş zaman')
    expect(cell(genis, 0)).toBe('gelirim') // aorist exception -ir
    expect(cell(genis, 1)).toBe('gelirsin')
    expect(cell(genis, 2)).toBe('gelir')
    expect(cell(genis, 3)).toBe('geliriz')

    const gecmis = table(p, 'Geçmiş zaman (-di)')
    expect(cell(gecmis, 0)).toBe('geldim')
    expect(cell(gecmis, 1)).toBe('geldin')
    expect(cell(gecmis, 2)).toBe('geldi')
    expect(cell(gecmis, 3)).toBe('geldik')
    expect(cell(gecmis, 5)).toBe('geldiler')

    const mis = table(p, 'Geçmiş zaman (-miş)')
    expect(cell(mis, 0)).toBe('gelmişim')
    expect(cell(mis, 1)).toBe('gelmişsin')
    expect(cell(mis, 2)).toBe('gelmiş')

    const gelecek = table(p, 'Gelecek zaman')
    expect(cell(gelecek, 0)).toBe('geleceğim')
    expect(cell(gelecek, 1)).toBe('geleceksin')
    expect(cell(gelecek, 2)).toBe('gelecek')
    expect(cell(gelecek, 3)).toBe('geleceğiz')

    const sart = table(p, 'Şart kipi')
    expect(cell(sart, 0)).toBe('gelsem')
    expect(cell(sart, 1)).toBe('gelsen')
    expect(cell(sart, 2)).toBe('gelse')
    expect(cell(sart, 3)).toBe('gelsek')

    const emir = table(p, 'Emir kipi')
    expect(cell(emir, 0)).toBe('gel')
    expect(cell(emir, 1)).toBe('gelsin')
    expect(cell(emir, 2)).toBe('gelelim')
    expect(cell(emir, 3)).toBe('gelin')
    expect(cell(emir, 4)).toBe('gelsinler')

    const adlasmis = table(p, 'Adlaşmış biçimler')
    expect(cellByLabel(adlasmis, 'Mastar')).toBe('gelmek')
    expect(cellByLabel(adlasmis, 'Ortaç')).toBe('gelen')
    expect(cellByLabel(adlasmis, 'Ulaç')).toBe('gelerek')
  })

  it('vowelStemAndAoristVerbs', async () => {
    const okumak = (await TurkishInflector.inflect('okumak', 'tr', 'verb'))!
    expect(cell(table(okumak, 'Şimdiki zaman'), 0)).toBe('okuyorum') // vowel stem + yor
    expect(cell(table(okumak, 'Geniş zaman'), 0)).toBe('okurum') // vowel stem aorist -r
    expect(cell(table(okumak, 'Geniş zaman'), 2)).toBe('okur')
    expect(cell(table(okumak, 'Geçmiş zaman (-di)'), 0)).toBe('okudum')
    expect(cell(table(okumak, 'Geçmiş zaman (-miş)'), 0)).toBe('okumuşum')
    expect(cell(table(okumak, 'Gelecek zaman'), 0)).toBe('okuyacağım') // y-buffer + k->ğ
    expect(cell(table(okumak, 'Şart kipi'), 0)).toBe('okusam')
    expect(cell(table(okumak, 'Emir kipi'), 0)).toBe('oku')
    expect(cell(table(okumak, 'Emir kipi'), 0)).toBe('oku')

    const yazmak = (await TurkishInflector.inflect('yazmak', 'tr', 'verb'))!
    expect(cell(table(yazmak, 'Geniş zaman'), 0)).toBe('yazarım') // monosyllabic -ar
    expect(cell(table(yazmak, 'Geniş zaman'), 2)).toBe('yazar')
    expect(cell(table(yazmak, 'Geçmiş zaman (-di)'), 0)).toBe('yazdım')
    expect(cell(table(yazmak, 'Şimdiki zaman'), 0)).toBe('yazıyorum')

    const gitmek = (await TurkishInflector.inflect('gitmek', 'tr', 'verb'))!
    expect(cell(table(gitmek, 'Şimdiki zaman'), 0)).toBe('gidiyorum') // t -> d before vowel
    expect(cell(table(gitmek, 'Geniş zaman'), 0)).toBe('giderim')
    expect(cell(table(gitmek, 'Geçmiş zaman (-di)'), 0)).toBe('gittim') // assimilation tt
    expect(cell(table(gitmek, 'Gelecek zaman'), 0)).toBe('gideceğim')
    expect(cell(table(gitmek, 'Emir kipi'), 0)).toBe('git')

    const yemek = (await TurkishInflector.inflect('yemek', 'tr', 'verb'))!
    expect(cell(table(yemek, 'Şimdiki zaman'), 0)).toBe('yiyorum') // vowel change
    expect(cell(table(yemek, 'Şimdiki zaman'), 2)).toBe('yiyor')
    expect(cell(table(yemek, 'Geniş zaman'), 0)).toBe('yerim') // aorist keeps stem
    expect(cell(table(yemek, 'Geçmiş zaman (-di)'), 2)).toBe('yedi')
    expect(cell(table(yemek, 'Gelecek zaman'), 0)).toBe('yiyeceğim')

    const etmek = (await TurkishInflector.inflect('etmek', 'tr', 'verb'))!
    expect(cell(table(etmek, 'Geniş zaman'), 0)).toBe('ederim')
    expect(cell(table(etmek, 'Geçmiş zaman (-di)'), 0)).toBe('ettim')
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    const adjective = (await TurkishInflector.inflect('güzel', 'tr', 'adjective'))!
    expect(adjective.kind).toBeNull() // Turkish adjectives do not inflect
    expect(await TurkishInflector.inflect('gelmek', 'de', 'verb')).toBeNull()
    expect(await TurkishInflector.inflect('ben', 'tr', 'pronoun')).toBeNull()
  })
})
