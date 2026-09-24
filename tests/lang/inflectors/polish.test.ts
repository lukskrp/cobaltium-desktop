import { describe, expect, it } from 'vitest'
import { PolishInflector } from '@shared/lang/inflectors/polish'
import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table: ${title}`)
  return found
}

function cell(t: ParadigmTable, row: number): string {
  return t.rows[row].cells[0]
}

function nounRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  const found = p.tables[0].rows.find((r) => r.label === caseName)
  if (!found) throw new Error(`missing row: ${caseName}`)
  return found
}

describe('PolishInflector', () => {
  // ── Verbs: regular conjugation ──────────────────────────────────────────

  it('regularAcVerbConjugates', async () => {
    const p = (await PolishInflector.inflect('czytać', 'pl', 'verb'))!
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Czas teraźniejszy')
    expect(cell(present, 0)).toBe('czytam')
    expect(cell(present, 1)).toBe('czytasz')
    expect(cell(present, 2)).toBe('czyta')
    expect(cell(present, 3)).toBe('czytamy')
    expect(cell(present, 4)).toBe('czytacie')
    expect(cell(present, 5)).toBe('czytają')

    const past = table(p, 'Czas przeszły')
    expect(cell(past, 0)).toBe('czytał')
    expect(cell(past, 1)).toBe('czytała')
    expect(cell(past, 2)).toBe('czytało')
    expect(cell(past, 3)).toBe('czytali')
    expect(cell(past, 4)).toBe('czytały')

    const future = table(p, 'Czas przyszły')
    expect(cell(future, 0)).toBe('będę czytać')
    expect(cell(future, 1)).toBe('będziesz czytać')
    expect(cell(future, 5)).toBe('będą czytać')

    const imperative = table(p, 'Tryb rozkazujący')
    expect(cell(imperative, 0)).toBe('czytaj')
    expect(cell(imperative, 1)).toBe('czytajcie')

    const nonFinite = table(p, 'Formy nieosobowe')
    expect(cell(nonFinite, 0)).toBe('czytać')
    expect(cell(nonFinite, 1)).toBe('czytający')
    expect(cell(nonFinite, 2)).toBe('czytając')
    expect(cell(nonFinite, 3)).toBe('czytany')
  })

  it('owacVerbConjugates', async () => {
    const pracowac = (await PolishInflector.inflect('pracować', 'pl', 'verb'))!
    expect(cell(table(pracowac, 'Czas teraźniejszy'), 0)).toBe('pracuję')
    expect(cell(table(pracowac, 'Czas teraźniejszy'), 1)).toBe('pracujesz')
    expect(cell(table(pracowac, 'Czas teraźniejszy'), 5)).toBe('pracują')
    expect(cell(table(pracowac, 'Czas przeszły'), 0)).toBe('pracował')
    expect(cell(table(pracowac, 'Czas przeszły'), 3)).toBe('pracowali')
    expect(cell(table(pracowac, 'Tryb rozkazujący'), 0)).toBe('pracuj')
    expect(cell(table(pracowac, 'Formy nieosobowe'), 3)).toBe('pracowany')

    const kupowac = (await PolishInflector.inflect('kupować', 'pl', 'verb'))!
    expect(cell(table(kupowac, 'Czas teraźniejszy'), 0)).toBe('kupuję')
    expect(cell(table(kupowac, 'Czas teraźniejszy'), 5)).toBe('kupują')
  })

  it('icVerbConjugatesWithMutation', async () => {
    const robic = (await PolishInflector.inflect('robić', 'pl', 'verb'))!
    expect(cell(table(robic, 'Czas teraźniejszy'), 0)).toBe('robię')
    expect(cell(table(robic, 'Czas teraźniejszy'), 1)).toBe('robisz')
    expect(cell(table(robic, 'Czas teraźniejszy'), 2)).toBe('robi')
    expect(cell(table(robic, 'Czas teraźniejszy'), 5)).toBe('robią')
    expect(cell(table(robic, 'Czas przeszły'), 0)).toBe('robił')
    expect(cell(table(robic, 'Tryb rozkazujący'), 0)).toBe('rób')
    expect(cell(table(robic, 'Formy nieosobowe'), 3)).toBe('robiony')

    // 1sg/3pl s → sz mutation
    const prosic = (await PolishInflector.inflect('prosić', 'pl', 'verb'))!
    expect(cell(table(prosic, 'Czas teraźniejszy'), 0)).toBe('proszę')
    expect(cell(table(prosic, 'Czas teraźniejszy'), 1)).toBe('prosisz')
    expect(cell(table(prosic, 'Czas teraźniejszy'), 5)).toBe('proszą')
    expect(cell(table(prosic, 'Tryb rozkazujący'), 0)).toBe('proś')
    expect(cell(table(prosic, 'Formy nieosobowe'), 3)).toBe('proszony')

    // śc → szcz mutation
    const czyscic = (await PolishInflector.inflect('czyścić', 'pl', 'verb'))!
    expect(cell(table(czyscic, 'Czas teraźniejszy'), 0)).toBe('czyszczę')
    expect(cell(table(czyscic, 'Czas teraźniejszy'), 1)).toBe('czyścisz')
    expect(cell(table(czyscic, 'Czas teraźniejszy'), 5)).toBe('czyszczą')
    expect(cell(table(czyscic, 'Tryb rozkazujący'), 0)).toBe('czyść')
  })

  it('ecAndNacVerbsConjugate', async () => {
    const myslec = (await PolishInflector.inflect('myśleć', 'pl', 'verb'))!
    expect(cell(table(myslec, 'Czas teraźniejszy'), 0)).toBe('myślę')
    expect(cell(table(myslec, 'Czas teraźniejszy'), 1)).toBe('myślisz')
    expect(cell(table(myslec, 'Czas teraźniejszy'), 5)).toBe('myślą')

    const ciagnac = (await PolishInflector.inflect('ciągnąć', 'pl', 'verb'))!
    expect(cell(table(ciagnac, 'Czas teraźniejszy'), 0)).toBe('ciągnę')
    expect(cell(table(ciagnac, 'Czas teraźniejszy'), 1)).toBe('ciągniesz')
    expect(cell(table(ciagnac, 'Czas teraźniejszy'), 5)).toBe('ciągną')
    expect(cell(table(ciagnac, 'Czas przeszły'), 0)).toBe('ciągnął')
    expect(cell(table(ciagnac, 'Czas przeszły'), 1)).toBe('ciągnęła')
    expect(cell(table(ciagnac, 'Tryb rozkazujący'), 0)).toBe('ciągnij')
  })

  it('irregularVerbs', async () => {
    const byc = (await PolishInflector.inflect('być', 'pl', 'verb'))!
    expect(cell(table(byc, 'Czas teraźniejszy'), 0)).toBe('jestem')
    expect(cell(table(byc, 'Czas teraźniejszy'), 1)).toBe('jesteś')
    expect(cell(table(byc, 'Czas teraźniejszy'), 5)).toBe('są')
    expect(cell(table(byc, 'Czas przeszły'), 0)).toBe('był')
    expect(cell(table(byc, 'Czas przeszły'), 1)).toBe('była')
    expect(cell(table(byc, 'Czas przeszły'), 3)).toBe('byli')
    expect(cell(table(byc, 'Czas przyszły'), 0)).toBe('będę')
    expect(cell(table(byc, 'Czas przyszły'), 5)).toBe('będą')
    expect(cell(table(byc, 'Tryb rozkazujący'), 0)).toBe('bądź')
    expect(cell(table(byc, 'Formy nieosobowe'), 1)).toBe('będący')
    expect(cell(table(byc, 'Formy nieosobowe'), 2)).toBe('będąc')

    const isc = (await PolishInflector.inflect('iść', 'pl', 'verb'))!
    expect(cell(table(isc, 'Czas teraźniejszy'), 0)).toBe('idę')
    expect(cell(table(isc, 'Czas przeszły'), 0)).toBe('szedł')
    expect(cell(table(isc, 'Czas przeszły'), 1)).toBe('szła')
    expect(cell(table(isc, 'Czas przeszły'), 3)).toBe('szli')
    expect(cell(table(isc, 'Czas przyszły'), 0)).toBe('pójdę')
    expect(cell(table(isc, 'Tryb rozkazujący'), 0)).toBe('idź')

    const jesc = (await PolishInflector.inflect('jeść', 'pl', 'verb'))!
    expect(cell(table(jesc, 'Czas teraźniejszy'), 0)).toBe('jem')
    expect(cell(table(jesc, 'Czas teraźniejszy'), 5)).toBe('jedzą')
    expect(cell(table(jesc, 'Czas przeszły'), 0)).toBe('jadł')
    expect(cell(table(jesc, 'Czas przeszły'), 3)).toBe('jedli')
    expect(cell(table(jesc, 'Formy nieosobowe'), 3)).toBe('jedzony')

    const moc = (await PolishInflector.inflect('móc', 'pl', 'verb'))!
    expect(cell(table(moc, 'Czas teraźniejszy'), 0)).toBe('mogę')
    expect(cell(table(moc, 'Czas przeszły'), 0)).toBe('mógł')
    expect(cell(table(moc, 'Czas przeszły'), 1)).toBe('mogła')
  })

  it('perfectiveVerbsUsePresentFormsAsFuture', async () => {
    const dac = (await PolishInflector.inflect('dać', 'pl', 'verb'))!
    expect(dac.tables[0].title).toBe('Czas przyszły (teraźniejszo-przyszły)')
    expect(dac.tables.some((t) => t.title === 'Czas przyszły')).toBe(false)
    expect(cell(table(dac, 'Czas przyszły (teraźniejszo-przyszły)'), 0)).toBe('dam')
    expect(cell(table(dac, 'Czas przyszły (teraźniejszo-przyszły)'), 5)).toBe('dadzą')
    expect(cell(table(dac, 'Czas przeszły'), 0)).toBe('dał')
    expect(cell(table(dac, 'Tryb rozkazujący'), 0)).toBe('daj')
    expect(cell(table(dac, 'Formy nieosobowe'), 3)).toBe('dany')

    const wzisc = (await PolishInflector.inflect('wziąć', 'pl', 'verb'))!
    expect(cell(table(wzisc, 'Czas przyszły (teraźniejszo-przyszły)'), 0)).toBe('wezmę')
    expect(cell(table(wzisc, 'Czas przeszły'), 0)).toBe('wziął')
    expect(cell(table(wzisc, 'Formy nieosobowe'), 1)).toBe('wzięty')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('feminineHardNounDeclines', async () => {
    const kobieta = (await PolishInflector.inflect('kobieta', 'pl', 'noun'))!
    expect(kobieta.kind).toBe('declension')
    expect(nounRow(kobieta, 'Mianownik').cells).toEqual(['kobieta', 'kobiety'])
    expect(nounRow(kobieta, 'Dopełniacz').cells).toEqual(['kobiety', 'kobiet'])
    expect(nounRow(kobieta, 'Celownik').cells).toEqual(['kobiecie', 'kobietom'])
    expect(nounRow(kobieta, 'Biernik').cells).toEqual(['kobietę', 'kobiety'])
    expect(nounRow(kobieta, 'Narzędnik').cells).toEqual(['kobietą', 'kobietami'])
    expect(nounRow(kobieta, 'Miejscownik').cells).toEqual(['kobiecie', 'kobietach'])
    expect(nounRow(kobieta, 'Wołacz').cells).toEqual(['kobieto', 'kobiety'])
  })

  it('feminineKGIaAndMobileVowelNounsDecline', async () => {
    const ksiazka = (await PolishInflector.inflect('książka', 'pl', 'noun'))!
    expect(nounRow(ksiazka, 'Dopełniacz').cells[0]).toBe('książki')
    expect(nounRow(ksiazka, 'Miejscownik').cells[0]).toBe('książce')
    expect(nounRow(ksiazka, 'Mianownik').cells[1]).toBe('książki')
    expect(nounRow(ksiazka, 'Dopełniacz').cells[1]).toBe('książek')

    const droga = (await PolishInflector.inflect('droga', 'pl', 'noun'))!
    expect(nounRow(droga, 'Dopełniacz').cells[0]).toBe('drogi')
    expect(nounRow(droga, 'Miejscownik').cells[0]).toBe('drodze')
    expect(nounRow(droga, 'Dopełniacz').cells[1]).toBe('dróg')

    const ulica = (await PolishInflector.inflect('ulica', 'pl', 'noun'))!
    expect(nounRow(ulica, 'Dopełniacz').cells[0]).toBe('ulicy')
    expect(nounRow(ulica, 'Mianownik').cells[1]).toBe('ulice')
    expect(nounRow(ulica, 'Dopełniacz').cells[1]).toBe('ulic')

    const siostra = (await PolishInflector.inflect('siostra', 'pl', 'noun'))!
    expect(nounRow(siostra, 'Dopełniacz').cells[1]).toBe('sióstr')
  })

  it('feminineIaAndJaNounsDecline', async () => {
    const ziemia = (await PolishInflector.inflect('ziemia', 'pl', 'noun'))!
    expect(nounRow(ziemia, 'Dopełniacz').cells[0]).toBe('ziemi')
    expect(nounRow(ziemia, 'Celownik').cells[0]).toBe('ziemi')
    expect(nounRow(ziemia, 'Biernik').cells[0]).toBe('ziemię')
    expect(nounRow(ziemia, 'Dopełniacz').cells[1]).toBe('ziem')

    const stacja = (await PolishInflector.inflect('stacja', 'pl', 'noun'))!
    expect(nounRow(stacja, 'Dopełniacz').cells[0]).toBe('stacji')
    expect(nounRow(stacja, 'Biernik').cells[0]).toBe('stację')
    expect(nounRow(stacja, 'Mianownik').cells[1]).toBe('stacje')
  })

  it('feminineConsonantNounsDecline', async () => {
    const noc = (await PolishInflector.inflect('noc', 'pl', 'noun'))!
    expect(nounRow(noc, 'Dopełniacz').cells[0]).toBe('nocy')
    expect(nounRow(noc, 'Biernik').cells[0]).toBe('noc')
    expect(nounRow(noc, 'Narzędnik').cells[0]).toBe('nocą')

    const twarz = (await PolishInflector.inflect('twarz', 'pl', 'noun'))!
    expect(nounRow(twarz, 'Dopełniacz').cells[0]).toBe('twarzy')
    expect(nounRow(twarz, 'Mianownik').cells[1]).toBe('twarze')

    const mysl = (await PolishInflector.inflect('myśl', 'pl', 'noun'))!
    expect(nounRow(mysl, 'Dopełniacz').cells[0]).toBe('myśli')
    expect(nounRow(mysl, 'Mianownik').cells[1]).toBe('myśli')
  })

  it('masculineNounsDecline', async () => {
    const kot = (await PolishInflector.inflect('kot', 'pl', 'noun'))!
    expect(nounRow(kot, 'Mianownik').cells).toEqual(['kot', 'koty'])
    expect(nounRow(kot, 'Dopełniacz').cells[0]).toBe('kota')
    expect(nounRow(kot, 'Celownik').cells[0]).toBe('kotu')
    expect(nounRow(kot, 'Miejscownik').cells[0]).toBe('kocie')
    expect(nounRow(kot, 'Dopełniacz').cells[1]).toBe('kotów')

    const dom = (await PolishInflector.inflect('dom', 'pl', 'noun'))!
    expect(nounRow(dom, 'Dopełniacz').cells[0]).toBe('domu')
    expect(nounRow(dom, 'Miejscownik').cells[0]).toBe('domu')

    const kraj = (await PolishInflector.inflect('kraj', 'pl', 'noun'))!
    expect(nounRow(kraj, 'Dopełniacz').cells[0]).toBe('kraju')
    expect(nounRow(kraj, 'Miejscownik').cells[0]).toBe('kraju')
    expect(nounRow(kraj, 'Mianownik').cells[1]).toBe('kraje')

    const pan = (await PolishInflector.inflect('pan', 'pl', 'noun'))!
    expect(nounRow(pan, 'Celownik').cells[0]).toBe('panu')
    expect(nounRow(pan, 'Wołacz').cells[0]).toBe('panie')
    expect(nounRow(pan, 'Mianownik').cells[1]).toBe('panowie')
  })

  it('virilePlurals', async () => {
    const student = (await PolishInflector.inflect('student', 'pl', 'noun'))!
    expect(nounRow(student, 'Mianownik').cells[1]).toBe('studenci')

    const lekarz = (await PolishInflector.inflect('lekarz', 'pl', 'noun'))!
    expect(nounRow(lekarz, 'Mianownik').cells[1]).toBe('lekarze')

    const chlopiec = (await PolishInflector.inflect('chłopiec', 'pl', 'noun'))!
    expect(nounRow(chlopiec, 'Celownik').cells[0]).toBe('chłopcu')
    expect(nounRow(chlopiec, 'Wołacz').cells[0]).toBe('chłopcze')
    expect(nounRow(chlopiec, 'Mianownik').cells[1]).toBe('chłopcy')
  })

  it('masculineANounsDecline', async () => {
    const mezczyzna = (await PolishInflector.inflect('mężczyzna', 'pl', 'noun'))!
    expect(nounRow(mezczyzna, 'Dopełniacz').cells[0]).toBe('mężczyzny')
    expect(nounRow(mezczyzna, 'Biernik').cells[0]).toBe('mężczyznę')
    expect(nounRow(mezczyzna, 'Dopełniacz').cells[1]).toBe('mężczyzn')
    expect(nounRow(mezczyzna, 'Mianownik').cells[1]).toBe('mężczyźni')

    const poeta = (await PolishInflector.inflect('poeta', 'pl', 'noun'))!
    expect(nounRow(poeta, 'Mianownik').cells[1]).toBe('poeci')
  })

  it('neuterNounsDecline', async () => {
    const okno = (await PolishInflector.inflect('okno', 'pl', 'noun'))!
    expect(nounRow(okno, 'Dopełniacz').cells[0]).toBe('okna')
    expect(nounRow(okno, 'Miejscownik').cells[0]).toBe('oknie')
    expect(nounRow(okno, 'Mianownik').cells[1]).toBe('okna')
    expect(nounRow(okno, 'Dopełniacz').cells[1]).toBe('okien')

    const drzewo = (await PolishInflector.inflect('drzewo', 'pl', 'noun'))!
    expect(nounRow(drzewo, 'Mianownik').cells[1]).toBe('drzewa')
    expect(nounRow(drzewo, 'Dopełniacz').cells[1]).toBe('drzew')

    const miasto = (await PolishInflector.inflect('miasto', 'pl', 'noun'))!
    expect(nounRow(miasto, 'Miejscownik').cells[0]).toBe('mieście')
    expect(nounRow(miasto, 'Dopełniacz').cells[1]).toBe('miast')

    const morze = (await PolishInflector.inflect('morze', 'pl', 'noun'))!
    expect(nounRow(morze, 'Dopełniacz').cells[0]).toBe('morza')
    expect(nounRow(morze, 'Miejscownik').cells[0]).toBe('morzu')
    expect(nounRow(morze, 'Dopełniacz').cells[1]).toBe('mórz')

    const muzeum = (await PolishInflector.inflect('muzeum', 'pl', 'noun'))!
    expect(nounRow(muzeum, 'Dopełniacz').cells[0]).toBe('muzeum')
    expect(nounRow(muzeum, 'Mianownik').cells[1]).toBe('muzea')
    expect(nounRow(muzeum, 'Dopełniacz').cells[1]).toBe('muzeów')

    const zwierze = (await PolishInflector.inflect('zwierzę', 'pl', 'noun'))!
    expect(nounRow(zwierze, 'Dopełniacz').cells[0]).toBe('zwierzęcia')
    expect(nounRow(zwierze, 'Mianownik').cells[1]).toBe('zwierzęta')
    expect(nounRow(zwierze, 'Dopełniacz').cells[1]).toBe('zwierząt')
  })

  it('irregularNouns', async () => {
    const czlowiek = (await PolishInflector.inflect('człowiek', 'pl', 'noun'))!
    expect(nounRow(czlowiek, 'Dopełniacz').cells[0]).toBe('człowieka')
    expect(nounRow(czlowiek, 'Mianownik').cells[1]).toBe('ludzie')
    expect(nounRow(czlowiek, 'Dopełniacz').cells[1]).toBe('ludzi')
    expect(nounRow(czlowiek, 'Narzędnik').cells[1]).toBe('ludźmi')

    const rok = (await PolishInflector.inflect('rok', 'pl', 'noun'))!
    expect(nounRow(rok, 'Mianownik').cells[1]).toBe('lata')
    expect(nounRow(rok, 'Dopełniacz').cells[1]).toBe('lat')

    const kon = (await PolishInflector.inflect('koń', 'pl', 'noun'))!
    expect(nounRow(kon, 'Dopełniacz').cells[0]).toBe('konia')
    expect(nounRow(kon, 'Dopełniacz').cells[1]).toBe('koni')
    expect(nounRow(kon, 'Narzędnik').cells[1]).toBe('końmi')

    const dzien = (await PolishInflector.inflect('dzień', 'pl', 'noun'))!
    expect(nounRow(dzien, 'Dopełniacz').cells[0]).toBe('dnia')

    const dziecko = (await PolishInflector.inflect('dziecko', 'pl', 'noun'))!
    expect(nounRow(dziecko, 'Mianownik').cells[1]).toBe('dzieci')
    expect(nounRow(dziecko, 'Narzędnik').cells[1]).toBe('dziećmi')
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  it('hardAdjectiveDeclines', async () => {
    const nowy = (await PolishInflector.inflect('nowy', 'pl', 'adjective'))!
    expect(nowy.kind).toBe('declension')
    expect(nounRow(nowy, 'Mianownik').cells).toEqual(['nowy', 'nowa', 'nowe', 'nowi', 'nowe'])
    expect(nounRow(nowy, 'Dopełniacz').cells).toEqual([
      'nowego',
      'nowej',
      'nowego',
      'nowych',
      'nowych'
    ])
    expect(nounRow(nowy, 'Celownik').cells).toEqual(['nowemu', 'nowej', 'nowemu', 'nowym', 'nowym'])
    expect(nounRow(nowy, 'Narzędnik').cells).toEqual(['nowym', 'nową', 'nowym', 'nowymi', 'nowymi'])
    expect(nounRow(nowy, 'Biernik').cells[1]).toBe('nową')
  })

  it('virilePluralMutations', async () => {
    expect(
      nounRow((await PolishInflector.inflect('drogi', 'pl', 'adjective'))!, 'Mianownik').cells[3]
    ).toBe('drodzy')
    expect(
      nounRow((await PolishInflector.inflect('wysoki', 'pl', 'adjective'))!, 'Mianownik').cells[3]
    ).toBe('wysocy')
    expect(
      nounRow((await PolishInflector.inflect('dobry', 'pl', 'adjective'))!, 'Mianownik').cells[3]
    ).toBe('dobrzy')
    expect(
      nounRow((await PolishInflector.inflect('młody', 'pl', 'adjective'))!, 'Mianownik').cells[3]
    ).toBe('młodzi')
  })

  it('softAdjectiveDeclines', async () => {
    const tani = (await PolishInflector.inflect('tani', 'pl', 'adjective'))!
    expect(nounRow(tani, 'Mianownik').cells).toEqual(['tani', 'tania', 'tanie', 'tani', 'tanie'])
    expect(nounRow(tani, 'Dopełniacz').cells).toEqual([
      'taniego',
      'taniej',
      'taniego',
      'tanich',
      'tanich'
    ])
    expect(nounRow(tani, 'Biernik').cells[1]).toBe('tanią')
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    const adverb = (await PolishInflector.inflect('szybko', 'pl', 'adverb'))!
    expect(adverb.kind).toBeNull()
    expect(await PolishInflector.inflect('czytać', 'es', 'verb')).toBeNull()
    expect(await PolishInflector.inflect('ja', 'pl', 'pronoun')).toBeNull() // excluded -> LLM
    expect(await PolishInflector.inflect('ten', 'pl', 'noun')).toBeNull() // excluded -> LLM

    // POS auto-detection for -ć infinitives
    const auto = (await PolishInflector.inflect('czytać', 'pl', null))!
    expect(auto.kind).toBe('conjugation')
  })
})
