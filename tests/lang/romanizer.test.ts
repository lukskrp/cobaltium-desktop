import { describe, expect, it } from 'vitest'
import {
  ArabicRomanizer,
  Elot743Romanizer,
  HebrewRomanizer,
  HepburnRomanizer,
  IastRomanizer,
  Iso9Romanizer,
  RevisedRomanization,
  UniPersRomanizer,
  UrduRomanizer,
  type Romanizer
} from '@shared/lang/romanization'

function latin(romanizer: Romanizer, text: string): string {
  return romanizer.romanize(text).latin
}

describe('romanizers', () => {
  it('ISO 9 (Cyrillic)', () => {
    expect(latin(new Iso9Romanizer(), 'Привет мир')).toBe('Privet mir')
    expect(latin(new Iso9Romanizer(), 'русский')).toBe('russkij')
    expect(latin(new Iso9Romanizer(), 'Москва')).toBe('Moskva')
    expect(latin(new Iso9Romanizer(), 'жжчшщ')).toBe('\u017E\u017E\u010D\u0161\u015D')
  })

  it('ELOT 743 (Greek)', () => {
    expect(latin(new Elot743Romanizer(), 'Καλημέρα κόσμε')).toBe('Kalimera kosme')
    expect(latin(new Elot743Romanizer(), 'ουρανός')).toBe('ouranos')
    expect(latin(new Elot743Romanizer(), 'Ευρώπα')).toBe('Evropa')
    expect(latin(new Elot743Romanizer(), 'ψωμί')).toBe('psomi')
  })

  it('Modified Hepburn (kana)', () => {
    expect(latin(new HepburnRomanizer(), 'こんにちは')).toBe('konnichiwa')
    expect(latin(new HepburnRomanizer(), 'ありがとう')).toBe('arigatou')
  })

  it('Hepburn particles and ん assimilation', () => {
    expect(latin(new HepburnRomanizer(), 'こんばんは')).toBe('kombanwa')
    expect(latin(new HepburnRomanizer(), 'わたしは')).toBe('watashiwa')
    expect(latin(new HepburnRomanizer(), 'とうきょうへ')).toBe('toukyoue')
    expect(latin(new HepburnRomanizer(), 'はな')).toBe('hana')
    expect(latin(new HepburnRomanizer(), 'へや')).toBe('heya')
    expect(latin(new HepburnRomanizer(), 'ほんをよむ')).toBe('honoyomu')
  })

  it('Hepburn yōon, sokuon, long vowels and katakana', () => {
    expect(latin(new HepburnRomanizer(), 'きゃく')).toBe('kyaku')
    expect(latin(new HepburnRomanizer(), 'しゃしん')).toBe('shashin')
    expect(latin(new HepburnRomanizer(), 'おなじ')).toBe('onaji')
    expect(latin(new HepburnRomanizer(), 'がっこう')).toBe('gakkou')
    expect(latin(new HepburnRomanizer(), 'まったん')).toBe('mattan')
    expect(latin(new HepburnRomanizer(), 'スーパー')).toBe('s\u016Bp\u0101')
    expect(latin(new HepburnRomanizer(), 'しんぷ')).toBe('shimpu')
    expect(latin(new HepburnRomanizer(), 'アメリカ')).toBe('amerika')
    expect(latin(new HepburnRomanizer(), 'ABC')).toBe('ABC')
  })

  it('Revised Romanization (Korean)', () => {
    expect(latin(new RevisedRomanization(), '안녕하세요')).toBe('annyeonghaseyo')
    expect(latin(new RevisedRomanization(), '서울')).toBe('seoul')
    expect(latin(new RevisedRomanization(), '한국')).toBe('hanguk')
    expect(latin(new RevisedRomanization(), '사랑')).toBe('sarang')
    expect(latin(new RevisedRomanization(), '학교')).toBe('hakgyo')
    expect(latin(new RevisedRomanization(), '김치')).toBe('gimchi')
    expect(latin(new RevisedRomanization(), '좋다')).toBe('jota')
    expect(latin(new RevisedRomanization(), '좋고')).toBe('joko')
  })

  it('IAST (Devanagari)', () => {
    expect(latin(new IastRomanizer(), 'राम')).toBe('r\u0101ma')
    expect(latin(new IastRomanizer(), 'नमस्ते')).toBe('namaste')
    expect(latin(new IastRomanizer(), 'कृष्ण')).toBe('k\u1E5B\u1E63\u1E47a')
    expect(latin(new IastRomanizer(), 'मं')).toBe('ma\u1E43')
    expect(latin(new IastRomanizer(), 'दुः')).toBe('du\u1E25')
  })

  it('DIN 31635 (Arabic)', () => {
    expect(latin(new ArabicRomanizer(), 'كتاب')).toBe('kt\u0101b')
    expect(latin(new ArabicRomanizer(), 'شمس')).toBe('\u0161ms')
    expect(latin(new ArabicRomanizer(), 'مُدَرِّس')).toBe('mudarris')
    expect(latin(new ArabicRomanizer(), 'شَدّ')).toBe('\u0161add')
    expect(latin(new ArabicRomanizer(), 'قرآن')).toBe('qr\u02BE\u0101n')
  })

  it('UniPers (Persian)', () => {
    expect(latin(new UniPersRomanizer(), 'فارسی')).toBe('f\u0101rs\u012B')
    expect(latin(new UniPersRomanizer(), 'خانه')).toBe('kh\u0101ne')
    expect(latin(new UniPersRomanizer(), 'تا')).toBe('t\u0101')
  })

  it('Urdu', () => {
    expect(latin(new UrduRomanizer(), 'پاکستان')).toBe('p\u0101kst\u0101n')
    expect(latin(new UrduRomanizer(), 'اردو')).toBe('\u0101rd\u016B')
  })

  it('ALA-LC (Hebrew)', () => {
    expect(latin(new HebrewRomanizer(), '\u05E9\u05B8\u05DC\u05D5\u05B9\u05DD')).toBe(
      '\u0161\u0101l\u014Dm'
    )
    expect(
      latin(new HebrewRomanizer(), '\u05D9\u05B4\u05E9\u05B0\u05C2\u05E8\u05B8\u05D0\u05B5\u05DC')
    ).toBe('yi\u015Br\u0101\u02BC\u0113l')
    expect(latin(new HebrewRomanizer(), '\u05D1\u05B7\u05D9\u05B4\u05EA')).toBe('bayit')
    expect(latin(new HebrewRomanizer(), '\u05DB\u05B8\u05DD')).toBe('kh\u0101m')
  })
})
