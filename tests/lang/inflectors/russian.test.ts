import { describe, expect, it } from 'vitest'
import { RussianInflector } from '@shared/lang/inflectors/russian'
import type { InflectionParadigm, ParadigmRow, ParadigmTable } from '@shared/lang/inflection'

function table(p: InflectionParadigm, title: string): ParadigmTable {
  return p.tables.find((t) => t.title === title)!
}

function cell(t: ParadigmTable, row: number): string {
  return t.rows[row].cells[0]
}

function nounRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  return p.tables[0].rows.find((r) => r.label === caseName)!
}

function adjRow(p: InflectionParadigm, caseName: string): ParadigmRow {
  return p.tables[0].rows.find((r) => r.label === caseName)!
}

describe('RussianInflector', () => {
  // ── Verbs: regular conjugation ──────────────────────────────────────────

  it('firstConjugationPresentPastFuture', async () => {
    const p = (await RussianInflector.inflect('читать', 'ru', 'verb'))!
    expect(p.kind).toBe('conjugation')

    const present = table(p, 'Настоящее время')
    expect(cell(present, 0)).toBe('читаю')
    expect(cell(present, 1)).toBe('читаешь')
    expect(cell(present, 2)).toBe('читает')
    expect(cell(present, 5)).toBe('читают')

    const past = table(p, 'Прошедшее время')
    expect(cell(past, 0)).toBe('читал')
    expect(cell(past, 1)).toBe('читала')
    expect(cell(past, 2)).toBe('читало')
    expect(cell(past, 3)).toBe('читали')

    const future = table(p, 'Будущее время')
    expect(cell(future, 0)).toBe('буду читать')
    expect(cell(future, 5)).toBe('будут читать')

    const imperative = table(p, 'Повелительное наклонение')
    expect(cell(imperative, 0)).toBe('читай')
    expect(cell(imperative, 1)).toBe('читайте')

    const nonFinite = table(p, 'Неличные формы')
    expect(cell(nonFinite, 0)).toBe('читающий')
    expect(cell(nonFinite, 1)).toBe('читая')
  })

  it('ovaAndNulVerbs', async () => {
    const risovat = (await RussianInflector.inflect('рисовать', 'ru', 'verb'))!
    expect(cell(table(risovat, 'Настоящее время'), 0)).toBe('рисую')
    expect(cell(table(risovat, 'Настоящее время'), 5)).toBe('рисуют')
    expect(cell(table(risovat, 'Повелительное наклонение'), 0)).toBe('рисуй')
    expect(cell(table(risovat, 'Прошедшее время'), 0)).toBe('рисовал')

    const pahnut = (await RussianInflector.inflect('пахнуть', 'ru', 'verb'))!
    expect(cell(table(pahnut, 'Настоящее время'), 0)).toBe('пахну')
    expect(cell(table(pahnut, 'Настоящее время'), 5)).toBe('пахнут')
  })

  it('secondConjugationWithMutation', async () => {
    const govorit = (await RussianInflector.inflect('говорить', 'ru', 'verb'))!
    expect(cell(table(govorit, 'Настоящее время'), 0)).toBe('говорю')
    expect(cell(table(govorit, 'Настоящее время'), 1)).toBe('говоришь')
    expect(cell(table(govorit, 'Настоящее время'), 5)).toBe('говорят')
    expect(cell(table(govorit, 'Повелительное наклонение'), 0)).toBe('говори')
    expect(cell(table(govorit, 'Неличные формы'), 0)).toBe('говорящий')

    // 1sg consonant mutation
    expect(cell(table((await RussianInflector.inflect('ходить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('хожу')
    expect(cell(table((await RussianInflector.inflect('просить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('прошу')
    expect(cell(table((await RussianInflector.inflect('любить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('люблю')
    expect(cell(table((await RussianInflector.inflect('платить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('плачу')
    expect(cell(table((await RussianInflector.inflect('чистить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('чищу')
    expect(cell(table((await RussianInflector.inflect('ставить', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('ставлю')
    expect(cell(table((await RussianInflector.inflect('видеть', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('вижу')
    expect(cell(table((await RussianInflector.inflect('сидеть', 'ru', 'verb'))!, 'Настоящее время'), 0)).toBe('сижу')
  })

  it('secondConjugationExceptionsAndMutatedFirst', async () => {
    const derzhat = (await RussianInflector.inflect('держать', 'ru', 'verb'))!
    expect(cell(table(derzhat, 'Настоящее время'), 0)).toBe('держу')
    expect(cell(table(derzhat, 'Настоящее время'), 5)).toBe('держат')

    const slysh = (await RussianInflector.inflect('слышать', 'ru', 'verb'))!
    expect(cell(table(slysh, 'Настоящее время'), 5)).toBe('слышат')

    const stoyat = (await RussianInflector.inflect('стоять', 'ru', 'verb'))!
    expect(cell(table(stoyat, 'Настоящее время'), 0)).toBe('стою')
    expect(cell(table(stoyat, 'Настоящее время'), 5)).toBe('стоят')

    // Whole-stem mutation in 1st conjugation
    const pisat = (await RussianInflector.inflect('писать', 'ru', 'verb'))!
    expect(cell(table(pisat, 'Настоящее время'), 0)).toBe('пишу')
    expect(cell(table(pisat, 'Настоящее время'), 5)).toBe('пишут')
    expect(cell(table(pisat, 'Повелительное наклонение'), 0)).toBe('пиши')

    const iskat = (await RussianInflector.inflect('искать', 'ru', 'verb'))!
    expect(cell(table(iskat, 'Настоящее время'), 0)).toBe('ищу')
  })

  it('irregularVerbs', async () => {
    const idti = (await RussianInflector.inflect('идти', 'ru', 'verb'))!
    expect(cell(table(idti, 'Настоящее время'), 0)).toBe('иду')
    expect(cell(table(idti, 'Прошедшее время'), 0)).toBe('шёл')
    expect(cell(table(idti, 'Прошедшее время'), 1)).toBe('шла')
    expect(cell(table(idti, 'Повелительное наклонение'), 0)).toBe('иди')

    const est = (await RussianInflector.inflect('есть', 'ru', 'verb'))!
    expect(cell(table(est, 'Настоящее время'), 0)).toBe('ем')
    expect(cell(table(est, 'Настоящее время'), 5)).toBe('едят')
    expect(cell(table(est, 'Прошедшее время'), 0)).toBe('ел')

    const moch = (await RussianInflector.inflect('мочь', 'ru', 'verb'))!
    expect(cell(table(moch, 'Настоящее время'), 0)).toBe('могу')
    expect(cell(table(moch, 'Прошедшее время'), 0)).toBe('мог')
    expect(cell(table(moch, 'Прошедшее время'), 1)).toBe('могла')

    const byt = (await RussianInflector.inflect('быть', 'ru', 'verb'))!
    expect(cell(table(byt, 'Будущее время (настоящее-будущее)'), 0)).toBe('буду')
    expect(cell(table(byt, 'Прошедшее время'), 0)).toBe('был')
    expect(cell(table(byt, 'Повелительное наклонение'), 0)).toBe('будь')

    const dat = (await RussianInflector.inflect('дать', 'ru', 'verb'))!
    expect(cell(table(dat, 'Будущее время (настоящее-будущее)'), 0)).toBe('дам')
    expect(cell(table(dat, 'Прошедшее время'), 0)).toBe('дал')
    expect(cell(table(dat, 'Повелительное наклонение'), 0)).toBe('дай')

    const bezhat = (await RussianInflector.inflect('бежать', 'ru', 'verb'))!
    expect(cell(table(bezhat, 'Настоящее время'), 0)).toBe('бегу')

    const hote = (await RussianInflector.inflect('хотеть', 'ru', 'verb'))!
    expect(cell(table(hote, 'Настоящее время'), 0)).toBe('хочу')
    expect(cell(table(hote, 'Настоящее время'), 5)).toBe('хотят')

    const spat = (await RussianInflector.inflect('спать', 'ru', 'verb'))!
    expect(cell(table(spat, 'Настоящее время'), 0)).toBe('сплю')

    const zhit = (await RussianInflector.inflect('жить', 'ru', 'verb'))!
    expect(cell(table(zhit, 'Настоящее время'), 0)).toBe('живу')
    expect(cell(table(zhit, 'Прошедшее время'), 0)).toBe('жил')

    const pech = (await RussianInflector.inflect('печь', 'ru', 'verb'))!
    expect(cell(table(pech, 'Настоящее время'), 0)).toBe('пеку')
    expect(cell(table(pech, 'Прошедшее время'), 0)).toBe('пёк')
  })

  // ── Nouns ───────────────────────────────────────────────────────────────

  it('feminineHardNounDeclines', async () => {
    const kniga = (await RussianInflector.inflect('книга', 'ru', 'noun'))!
    expect(kniga.kind).toBe('declension')
    expect(nounRow(kniga, 'Именительный').cells).toEqual(['книга', 'книги'])
    expect(nounRow(kniga, 'Родительный').cells).toEqual(['книги', 'книг'])
    expect(nounRow(kniga, 'Дательный').cells).toEqual(['книге', 'книгам'])
    expect(nounRow(kniga, 'Винительный').cells).toEqual(['книгу', 'книги'])
    expect(nounRow(kniga, 'Творительный').cells).toEqual(['книгой', 'книгами'])
    expect(nounRow(kniga, 'Предложный').cells).toEqual(['книге', 'книгах'])

    const dacha = (await RussianInflector.inflect('дача', 'ru', 'noun'))!
    expect(nounRow(dacha, 'Родительный').cells[0]).toBe('дачи') // after ч -> и
    expect(nounRow(dacha, 'Творительный').cells[0]).toBe('дачей')
    expect(nounRow(dacha, 'Родительный').cells[1]).toBe('дач')

    const ulitsa = (await RussianInflector.inflect('улица', 'ru', 'noun'))!
    expect(nounRow(ulitsa, 'Родительный').cells[1]).toBe('улиц') // -ца -> -ц
  })

  it('feminineSoftAndIaNounsDecline', async () => {
    const pesnya = (await RussianInflector.inflect('песня', 'ru', 'noun'))!
    expect(nounRow(pesnya, 'Именительный').cells).toEqual(['песня', 'песни'])
    expect(nounRow(pesnya, 'Винительный').cells[0]).toBe('песню')
    expect(nounRow(pesnya, 'Творительный').cells[0]).toBe('песней')
    expect(nounRow(pesnya, 'Родительный').cells[1]).toBe('песен') // mobile vowel

    const dynia = (await RussianInflector.inflect('дыня', 'ru', 'noun'))!
    expect(nounRow(dynia, 'Родительный').cells[1]).toBe('дынь') // plain -ь gen pl

    const liniya = (await RussianInflector.inflect('линия', 'ru', 'noun'))!
    expect(nounRow(liniya, 'Родительный').cells[0]).toBe('линии')
    expect(nounRow(liniya, 'Винительный').cells[0]).toBe('линию')
    expect(nounRow(liniya, 'Творительный').cells[0]).toBe('линией')
    expect(nounRow(liniya, 'Родительный').cells[1]).toBe('линий')
  })

  it('masculineNounsDecline', async () => {
    const stol = (await RussianInflector.inflect('стол', 'ru', 'noun'))!
    expect(nounRow(stol, 'Именительный').cells).toEqual(['стол', 'столы'])
    expect(nounRow(stol, 'Родительный').cells).toEqual(['стола', 'столов'])
    expect(nounRow(stol, 'Дательный').cells).toEqual(['столу', 'столам'])
    expect(nounRow(stol, 'Творительный').cells).toEqual(['столом', 'столами'])
    expect(nounRow(stol, 'Предложный').cells).toEqual(['столе', 'столах'])

    const nozh = (await RussianInflector.inflect('нож', 'ru', 'noun'))!
    expect(nounRow(nozh, 'Именительный').cells[1]).toBe('ножи')
    expect(nounRow(nozh, 'Родительный').cells[1]).toBe('ножей')
    expect(nounRow(nozh, 'Творительный').cells[0]).toBe('ножом')

    const muzey = (await RussianInflector.inflect('музей', 'ru', 'noun'))!
    expect(nounRow(muzey, 'Родительный').cells[0]).toBe('музея')
    expect(nounRow(muzey, 'Родительный').cells[1]).toBe('музеев')

    const slovar = (await RussianInflector.inflect('словарь', 'ru', 'noun'))!
    expect(nounRow(slovar, 'Родительный').cells[0]).toBe('словаря')
    expect(nounRow(slovar, 'Родительный').cells[1]).toBe('словарей')
  })

  it('feminineSoftSignAndNeuterNounsDecline', async () => {
    const noch = (await RussianInflector.inflect('ночь', 'ru', 'noun'))!
    expect(nounRow(noch, 'Именительный').cells).toEqual(['ночь', 'ночи'])
    expect(nounRow(noch, 'Родительный').cells[0]).toBe('ночи')
    expect(nounRow(noch, 'Творительный').cells[0]).toBe('ночью')
    expect(nounRow(noch, 'Родительный').cells[1]).toBe('ночей')

    const okno = (await RussianInflector.inflect('окно', 'ru', 'noun'))!
    expect(nounRow(okno, 'Именительный').cells).toEqual(['окно', 'окна'])
    expect(nounRow(okno, 'Родительный').cells[0]).toBe('окна')
    expect(nounRow(okno, 'Творительный').cells[0]).toBe('окном')
    expect(nounRow(okno, 'Родительный').cells[1]).toBe('окон')

    const more = (await RussianInflector.inflect('море', 'ru', 'noun'))!
    expect(nounRow(more, 'Именительный').cells).toEqual(['море', 'моря'])
    expect(nounRow(more, 'Родительный').cells[1]).toBe('морей')

    const zdanie = (await RussianInflector.inflect('здание', 'ru', 'noun'))!
    expect(nounRow(zdanie, 'Предложный').cells[0]).toBe('здании')
    expect(nounRow(zdanie, 'Родительный').cells[1]).toBe('зданий')
  })

  it('irregularNouns', async () => {
    const vremya = (await RussianInflector.inflect('время', 'ru', 'noun'))!
    expect(nounRow(vremya, 'Родительный').cells[0]).toBe('времени')
    expect(nounRow(vremya, 'Творительный').cells[0]).toBe('временем')
    expect(nounRow(vremya, 'Родительный').cells[1]).toBe('времён')

    const den = (await RussianInflector.inflect('день', 'ru', 'noun'))!
    expect(nounRow(den, 'Родительный').cells[0]).toBe('дня') // mobile vowel

    const mat = (await RussianInflector.inflect('мать', 'ru', 'noun'))!
    expect(nounRow(mat, 'Родительный').cells[0]).toBe('матери')
    expect(nounRow(mat, 'Родительный').cells[1]).toBe('матерей')

    const chelovek = (await RussianInflector.inflect('человек', 'ru', 'noun'))!
    expect(nounRow(chelovek, 'Именительный').cells[1]).toBe('люди') // suppletive plural
    expect(nounRow(chelovek, 'Родительный').cells[1]).toBe('людей')

    const drug = (await RussianInflector.inflect('друг', 'ru', 'noun'))!
    expect(nounRow(drug, 'Именительный').cells[1]).toBe('друзья')
    expect(nounRow(drug, 'Родительный').cells[1]).toBe('друзей')

    const dom = (await RussianInflector.inflect('дом', 'ru', 'noun'))!
    expect(nounRow(dom, 'Именительный').cells[1]).toBe('дома') // plural -а
    expect(nounRow(dom, 'Родительный').cells[1]).toBe('домов')

    const glaz = (await RussianInflector.inflect('глаз', 'ru', 'noun'))!
    expect(nounRow(glaz, 'Именительный').cells[1]).toBe('глаза')
    expect(nounRow(glaz, 'Родительный').cells[1]).toBe('глаз')

    const otec = (await RussianInflector.inflect('отец', 'ru', 'noun'))!
    expect(nounRow(otec, 'Родительный').cells[0]).toBe('отца')
  })

  // ── Adjectives ──────────────────────────────────────────────────────────

  it('hardAdjectiveDeclines', async () => {
    const novyy = (await RussianInflector.inflect('новый', 'ru', 'adjective'))!
    expect(novyy.kind).toBe('declension')
    expect(adjRow(novyy, 'Именительный').cells).toEqual(['новый', 'новая', 'новое', 'новые'])
    expect(adjRow(novyy, 'Родительный').cells).toEqual(['нового', 'новой', 'нового', 'новых'])
    expect(adjRow(novyy, 'Дательный').cells).toEqual(['новому', 'новой', 'новому', 'новым'])
    expect(adjRow(novyy, 'Винительный').cells[1]).toBe('новую')
    expect(adjRow(novyy, 'Винительный').cells[3]).toBe('новые')
    expect(adjRow(novyy, 'Творительный').cells).toEqual(['новым', 'новой', 'новым', 'новыми'])
    expect(adjRow(novyy, 'Предложный').cells).toEqual(['новом', 'новой', 'новом', 'новых'])
  })

  it('softAndPossessiveAdjectivesDecline', async () => {
    const siniy = (await RussianInflector.inflect('синий', 'ru', 'adjective'))!
    expect(adjRow(siniy, 'Именительный').cells).toEqual(['синий', 'синяя', 'синее', 'синие'])
    expect(adjRow(siniy, 'Родительный').cells).toEqual(['синего', 'синей', 'синего', 'синих'])
    expect(adjRow(siniy, 'Винительный').cells[1]).toBe('синюю')

    const lisiy = (await RussianInflector.inflect('лисий', 'ru', 'adjective'))!
    expect(adjRow(lisiy, 'Именительный').cells).toEqual(['лисий', 'лисья', 'лисье', 'лисьи'])
    expect(adjRow(lisiy, 'Родительный').cells[0]).toBe('лисьего')

    const russkiy = (await RussianInflector.inflect('русский', 'ru', 'adjective'))!
    expect(adjRow(russkiy, 'Родительный').cells[0]).toBe('русского') // -кий stays hard
  })

  // ── Classification & fallback ───────────────────────────────────────────

  it('classificationAndFallback', async () => {
    const adverb = (await RussianInflector.inflect('быстро', 'ru', 'adverb'))!
    expect(adverb.kind).toBeNull()
    expect(await RussianInflector.inflect('читать', 'es', 'verb')).toBeNull()
    expect(await RussianInflector.inflect('я', 'ru', 'pronoun')).toBeNull() // excluded -> LLM
  })
})
