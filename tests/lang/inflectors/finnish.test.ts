import { describe, expect, it } from 'vitest'
import type { InflectionEngine, InflectionParadigm, ParadigmTable } from '@shared/lang/inflection'
import { InflectionParser, TieredInflectionEngine } from '@shared/lang/inflection'
import { FinnishInflector } from '@shared/lang/inflectors/finnish'

async function forms(word: string, pos: string | null = 'verb', title = 'Present'): Promise<string[] | undefined> {
  const paradigm = await FinnishInflector.inflect(word, 'fi', pos)
  return paradigm?.tables.find((t) => t.title === title)?.rows.map((r) => r.cells[0])
}

async function paradigm(word: string): Promise<InflectionParadigm> {
  const p = await FinnishInflector.inflect(word, 'fi', 'verb')
  if (!p) throw new Error(`no paradigm for ${word}`)
  return p
}

function table(p: InflectionParadigm, title: string): ParadigmTable {
  const found = p.tables.find((t) => t.title === title)
  if (!found) throw new Error(`missing table ${title}`)
  return found
}

function firstCellByLabel(p: InflectionParadigm, title: string): Map<string, string> {
  return new Map(table(p, title).rows.map((r) => [r.label, r.cells[0]]))
}

function cellsByLabel(p: InflectionParadigm, title: string): Map<string, string[]> {
  return new Map(table(p, title).rows.map((r) => [r.label, r.cells]))
}

async function decl(word: string, pos = 'noun'): Promise<InflectionParadigm> {
  const p = await FinnishInflector.inflect(word, 'fi', pos)
  if (!p) throw new Error(`no paradigm for ${word}`)
  return p
}

async function cell(word: string, caseIndex: number): Promise<string[]> {
  return (await decl(word)).tables[0].rows[caseIndex].cells
}

describe('FinnishInflector', () => {
  // ── Rule-based verb conjugation ────────────────────────────────────────
  it('conjugates a type 1 gradating verb', async () => {
    expect(await forms('heittää')).toEqual(['heitän', 'heität', 'heittää', 'heitämme', 'heitätte', 'heittävät'])
    expect(await forms('heittää', 'verb', 'Past')).toEqual(['heitin', 'heitit', 'heitti', 'heitimme', 'heititte', 'heittivät'])
    expect(await forms('heittää', 'verb', 'Conditional')).toEqual(['heittäisin', 'heittäisit', 'heittäisi', 'heittäisimme', 'heittäisitte', 'heittäisivät'])
    expect(await forms('heittää', 'verb', 'Imperative')).toEqual(['heitä', 'heittäköön', 'heittäkäämme', 'heittäkää', 'heittäkööt'])
  })

  it('conjugates a type 1 verb with no gradation', async () => {
    expect(await forms('puhua')).toEqual(['puhun', 'puhut', 'puhuu', 'puhumme', 'puhutte', 'puhuvat'])
    expect(await forms('puhua', 'verb', 'Past')).toEqual(['puhuin', 'puhuit', 'puhui', 'puhuimme', 'puhuitte', 'puhuivat'])
  })

  it('conjugates kysyä', async () => {
    expect((await FinnishInflector.inflect('kysyä', 'fi', null))?.kind).toBe('conjugation')
    expect(await forms('kysyä')).toEqual(['kysyn', 'kysyt', 'kysyy', 'kysymme', 'kysytte', 'kysyvät'])
    expect(await forms('kysyä', 'verb', 'Past')).toEqual(['kysyin', 'kysyit', 'kysyi', 'kysyimme', 'kysyitte', 'kysyivät'])
    expect(await forms('kysyä', 'verb', 'Conditional')).toEqual(['kysyisin', 'kysyisit', 'kysyisi', 'kysyisimme', 'kysyisitte', 'kysyisivät'])
  })

  it('conjugates a type 1 nt-gradating verb', async () => {
    expect(await forms('antaa')).toEqual(['annan', 'annat', 'antaa', 'annamme', 'annatte', 'antavat'])
  })

  it('conjugates type 3 verbs', async () => {
    expect(await forms('tulla')).toEqual(['tulen', 'tulet', 'tulee', 'tulemme', 'tulette', 'tulevat'])
    expect(await forms('tulla', 'verb', 'Past')).toEqual(['tulin', 'tulit', 'tuli', 'tulimme', 'tulitte', 'tulivat'])
    expect(await forms('tulla', 'verb', 'Imperative')).toEqual(['tule', 'tulkoon', 'tulkaamme', 'tulkaa', 'tulkoot'])
    expect(await forms('mennä')).toEqual(['menen', 'menet', 'menee', 'menemme', 'menette', 'menevät'])
  })

  it('conjugates an irregular verb', async () => {
    expect(await forms('olla')).toEqual(['olen', 'olet', 'on', 'olemme', 'olette', 'ovat'])
  })

  it('conjugates a type 4 verb with no gradation', async () => {
    expect(await forms('haluta')).toEqual(['haluan', 'haluat', 'haluaa', 'haluamme', 'haluatte', 'haluavat'])
    expect(await forms('haluta', 'verb', 'Past')).toEqual(['halusin', 'halusit', 'halusi', 'halusimme', 'halusitte', 'halusivat'])
    expect(await forms('haluta', 'verb', 'Conditional')).toEqual(['haluaisin', 'haluaisit', 'haluaisi', 'haluaisimme', 'haluaisitte', 'haluaisivat'])
    expect(await forms('haluta', 'verb', 'Imperative')).toEqual(['halua', 'halutkoon', 'halutkaamme', 'halutkaa', 'halutkoot'])
  })

  it('conjugates a type 4 gradating verb', async () => {
    // hypätä: p -> pp in the strong stem.
    expect(await forms('hypätä')).toEqual(['hyppään', 'hyppäät', 'hyppää', 'hyppäämme', 'hyppäätte', 'hyppäävät'])
    expect(await forms('hypätä', 'verb', 'Past')).toEqual(['hyppäsin', 'hyppäsit', 'hyppäsi', 'hyppäsimme', 'hyppäsitte', 'hyppäsivät'])
  })

  it('conjugates a type 5 verb', async () => {
    expect(await forms('tarvita')).toEqual(['tarvitsen', 'tarvitset', 'tarvitsee', 'tarvitsemme', 'tarvitsette', 'tarvitsevat'])
    expect(await forms('tarvita', 'verb', 'Past')).toEqual(['tarvitsin', 'tarvitsit', 'tarvitsi', 'tarvitsimme', 'tarvitsitte', 'tarvitsivat'])
    expect(await forms('tarvita', 'verb', 'Imperative')).toEqual(['tarvitse', 'tarvitkoon', 'tarvitkaamme', 'tarvitkaa', 'tarvitkoot'])
  })

  it('conjugates a type 6 verb', async () => {
    expect(await forms('vanheta')).toEqual(['vanhenen', 'vanhenet', 'vanhenee', 'vanhenemme', 'vanhenette', 'vanhenevat'])
    expect(await forms('vanheta', 'verb', 'Past')).toEqual(['vanhenin', 'vanhenit', 'vanheni', 'vanhenimme', 'vanhenitte', 'vanhenivat'])
    expect(await forms('vanheta', 'verb', 'Imperative')).toEqual(['vanhene', 'vanhetkoon', 'vanhetkaamme', 'vanhetkaa', 'vanhetkoot'])
  })

  it('returns null for an unknown verb', async () => {
    expect(await FinnishInflector.inflect('xyzzy', 'fi', 'verb')).toBeNull() // not a Finnish verb -> LLM fallback
  })

  // ── Full paradigm: negatives, compound tenses, potential ───────────────
  it('jättää has the full table set', async () => {
    const titles = (await paradigm('jättää')).tables.map((t) => t.title)
    expect(titles).toEqual([
      'Present', 'Present negative', 'Past', 'Past negative',
      'Perfect', 'Perfect negative', 'Pluperfect', 'Pluperfect negative',
      'Conditional', 'Conditional negative', 'Conditional perfect', 'Conditional perfect negative',
      'Potential', 'Potential negative', 'Potential perfect', 'Potential perfect negative',
      'Imperative', 'Imperative negative', 'Infinitives', 'Participles', 'Passive'
    ])
  })

  it('jättää has negative and compound tenses', async () => {
    expect(await forms('jättää', 'verb', 'Present negative')).toEqual(['en jätä', 'et jätä', 'ei jätä', 'emme jätä', 'ette jätä', 'eivät jätä'])
    expect(await forms('jättää', 'verb', 'Past negative')).toEqual(['en jättänyt', 'et jättänyt', 'ei jättänyt', 'emme jättäneet', 'ette jättäneet', 'eivät jättäneet'])
    expect(await forms('jättää', 'verb', 'Perfect')).toEqual(['olen jättänyt', 'olet jättänyt', 'on jättänyt', 'olemme jättäneet', 'olette jättäneet', 'ovat jättäneet'])
    expect(await forms('jättää', 'verb', 'Perfect negative')).toEqual(['en ole jättänyt', 'et ole jättänyt', 'ei ole jättänyt', 'emme ole jättäneet', 'ette ole jättäneet', 'eivät ole jättäneet'])
    expect(await forms('jättää', 'verb', 'Pluperfect')).toEqual(['olin jättänyt', 'olit jättänyt', 'oli jättänyt', 'olimme jättäneet', 'olitte jättäneet', 'olivat jättäneet'])
    expect(await forms('jättää', 'verb', 'Pluperfect negative')).toEqual(['en ollut jättänyt', 'et ollut jättänyt', 'ei ollut jättänyt', 'emme olleet jättäneet', 'ette olleet jättäneet', 'eivät olleet jättäneet'])
    expect(await forms('jättää', 'verb', 'Conditional negative')).toEqual(['en jättäisi', 'et jättäisi', 'ei jättäisi', 'emme jättäisi', 'ette jättäisi', 'eivät jättäisi'])
    expect(await forms('jättää', 'verb', 'Conditional perfect')).toEqual(['olisin jättänyt', 'olisit jättänyt', 'olisi jättänyt', 'olisimme jättäneet', 'olisitte jättäneet', 'olisivat jättäneet'])
    expect(await forms('jättää', 'verb', 'Potential')).toEqual(['jättänen', 'jättänet', 'jättänee', 'jättänemme', 'jättänette', 'jättänevät'])
    expect(await forms('jättää', 'verb', 'Potential negative')).toEqual(['en jättäne', 'et jättäne', 'ei jättäne', 'emme jättäne', 'ette jättäne', 'eivät jättäne'])
    expect(await forms('jättää', 'verb', 'Potential perfect')).toEqual(['lienen jättänyt', 'lienet jättänyt', 'lienee jättänyt', 'lienemme jättäneet', 'lienette jättäneet', 'lienevät jättäneet'])
    expect(await forms('jättää', 'verb', 'Imperative negative')).toEqual(['älä jätä', 'älköön jättäkö', 'älkäämme jättäkö', 'älkää jättäkö', 'älkööt jättäkö'])
  })

  it('jättää has the expected nominal forms', async () => {
    const inf = table(await paradigm('jättää'), 'Infinitives').rows.map((r) => r.cells[0])
    expect(inf).toEqual([
      'jättää', 'jättäen', 'jättäessä',
      'jättämässä', 'jättämästä', 'jättämään', 'jättämällä', 'jättämättä', 'jättämän',
      'jättäminen'
    ])
    const parts = cellsByLabel(await paradigm('jättää'), 'Participles')
    expect(parts.get('Present active')).toEqual(['jättävä', 'jättävät'])
    expect(parts.get('Past active')).toEqual(['jättänyt', 'jättäneet'])
    expect(parts.get('Present passive')).toEqual(['jätettävä', 'jätettävät'])
    expect(parts.get('Past passive')).toEqual(['jätetty', 'jätetyt'])
    expect(parts.get('Agent')).toEqual(['jättämä', 'jättämät'])
    expect(parts.get('Negative')).toEqual(['jättämätön', 'jättämättömät'])
  })

  it('jättää has the expected passive forms', async () => {
    const passive = firstCellByLabel(await paradigm('jättää'), 'Passive')
    expect(passive.get('Present')).toBe('jätetään')
    expect(passive.get('Present negative')).toBe('ei jätetä')
    expect(passive.get('Past')).toBe('jätettiin')
    expect(passive.get('Past negative')).toBe('ei jätetty')
  })

  it('tulla has the full type 3 paradigm', async () => {
    expect(await forms('tulla', 'verb', 'Potential')).toEqual(['tullen', 'tullet', 'tullee', 'tullemme', 'tullette', 'tullevat'])
    expect(await forms('tulla', 'verb', 'Perfect')).toEqual(['olen tullut', 'olet tullut', 'on tullut', 'olemme tulleet', 'olette tulleet', 'ovat tulleet'])
    expect(await forms('tulla', 'verb', 'Present negative')).toEqual(['en tule', 'et tule', 'ei tule', 'emme tule', 'ette tule', 'eivät tule'])
    expect(await forms('tulla', 'verb', 'Imperative negative')).toEqual(['älä tule', 'älköön tulko', 'älkäämme tulko', 'älkää tulko', 'älkööt tulko'])
    const inf = table(await paradigm('tulla'), 'Infinitives').rows.map((r) => r.cells[0])
    expect(inf).toEqual(['tulla', 'tullen', 'tullessa', 'tulemassa', 'tulemasta', 'tulemaan', 'tulemalla', 'tulematta', 'tuleman', 'tuleminen'])
  })

  it('haluta has the full type 4 paradigm', async () => {
    expect(await forms('haluta', 'verb', 'Potential')).toEqual(['halunnen', 'halunnet', 'halunnee', 'halunnemme', 'halunnette', 'halunnevat'])
    expect(await forms('haluta', 'verb', 'Perfect')).toEqual(['olen halunnut', 'olet halunnut', 'on halunnut', 'olemme halunneet', 'olette halunneet', 'ovat halunneet'])
    expect(await forms('haluta', 'verb', 'Present negative')).toEqual(['en halua', 'et halua', 'ei halua', 'emme halua', 'ette halua', 'eivät halua'])
    expect(await forms('haluta')).toEqual(['haluan', 'haluat', 'haluaa', 'haluamme', 'haluatte', 'haluavat'])
  })

  it('tarvita has the full type 5 paradigm', async () => {
    expect(await forms('tarvita', 'verb', 'Potential')).toEqual(['tarvinnen', 'tarvinnet', 'tarvinnee', 'tarvinnemme', 'tarvinnette', 'tarvinnevat'])
    expect(await forms('tarvita', 'verb', 'Perfect')).toEqual(['olen tarvinnut', 'olet tarvinnut', 'on tarvinnut', 'olemme tarvinneet', 'olette tarvinneet', 'ovat tarvinneet'])
    const inf = table(await paradigm('tarvita'), 'Infinitives').rows.map((r) => r.cells[0])
    expect(inf).toEqual(['tarvita', 'tarviten', 'tarvitessa', 'tarvitsemassa', 'tarvitsemasta', 'tarvitsemaan', 'tarvitsemalla', 'tarvitsematta', 'tarvitseman', 'tarvitseminen'])
  })

  it('vanheta has the full type 6 paradigm', async () => {
    expect(await forms('vanheta', 'verb', 'Potential')).toEqual(['vanhennen', 'vanhennet', 'vanhennee', 'vanhennemme', 'vanhennette', 'vanhennevat'])
    expect(await forms('vanheta', 'verb', 'Perfect')).toEqual(['olen vanhennut', 'olet vanhennut', 'on vanhennut', 'olemme vanhenneet', 'olette vanhenneet', 'ovat vanhenneet'])
  })

  it('olla has the full paradigm', async () => {
    expect(await forms('olla', 'verb', 'Present negative')).toEqual(['en ole', 'et ole', 'ei ole', 'emme ole', 'ette ole', 'eivät ole'])
    expect(await forms('olla', 'verb', 'Potential')).toEqual(['lienen', 'lienet', 'lienee', 'lienemme', 'lienette', 'lienevät'])
    expect(await forms('olla', 'verb', 'Perfect')).toEqual(['olen ollut', 'olet ollut', 'on ollut', 'olemme olleet', 'olette olleet', 'ovat olleet'])
    expect(await forms('olla', 'verb', 'Pluperfect')).toEqual(['olin ollut', 'olit ollut', 'oli ollut', 'olimme olleet', 'olitte olleet', 'olivat olleet'])
    const parts = cellsByLabel(await paradigm('olla'), 'Participles')
    expect(parts.get('Present active')).toEqual(['oleva', 'olevat'])
    expect(parts.get('Past active')).toEqual(['ollut', 'olleet'])
    expect(parts.get('Negative')).toEqual(['olematon', 'olemattomat'])
  })

  it('all irregulars have the full table set', async () => {
    const expected = [
      'Present', 'Present negative', 'Past', 'Past negative',
      'Perfect', 'Perfect negative', 'Pluperfect', 'Pluperfect negative',
      'Conditional', 'Conditional negative', 'Conditional perfect', 'Conditional perfect negative',
      'Potential', 'Potential negative', 'Potential perfect', 'Potential perfect negative',
      'Imperative', 'Imperative negative', 'Infinitives', 'Participles', 'Passive'
    ]
    for (const verb of ['antaa', 'nähdä', 'tehdä', 'syödä', 'juoda', 'käydä', 'voida']) {
      expect((await paradigm(verb)).tables.map((t) => t.title)).toEqual(expected)
    }
  })

  it('antaa has the full paradigm', async () => {
    expect(await forms('antaa', 'verb', 'Potential')).toEqual(['antanen', 'antanet', 'antanee', 'antanemme', 'antanette', 'antanevat'])
    expect(await forms('antaa', 'verb', 'Perfect')).toEqual(['olen antanut', 'olet antanut', 'on antanut', 'olemme antaneet', 'olette antaneet', 'ovat antaneet'])
    expect(await forms('antaa', 'verb', 'Present negative')).toEqual(['en anna', 'et anna', 'ei anna', 'emme anna', 'ette anna', 'eivät anna'])
    expect(await forms('antaa', 'verb', 'Imperative negative')).toEqual(['älä anna', 'älköön antako', 'älkäämme antako', 'älkää antako', 'älkööt antako'])
  })

  it('nähdä and tehdä have the full paradigm', async () => {
    expect(await forms('nähdä', 'verb', 'Potential')).toEqual(['nähnen', 'nähnet', 'nähnee', 'nähnemme', 'nähnette', 'nähnevät'])
    expect(await forms('nähdä', 'verb', 'Perfect')).toEqual(['olen nähnyt', 'olet nähnyt', 'on nähnyt', 'olemme nähneet', 'olette nähneet', 'ovat nähneet'])
    expect(await forms('tehdä', 'verb', 'Potential')).toEqual(['tehnen', 'tehnet', 'tehnee', 'tehnemme', 'tehnette', 'tehnevät'])
    expect(await forms('tehdä', 'verb', 'Perfect')).toEqual(['olen tehnyt', 'olet tehnyt', 'on tehnyt', 'olemme tehneet', 'olette tehneet', 'ovat tehneet'])
  })

  it('syödä, juoda, käydä and voida have the full paradigm', async () => {
    expect(await forms('syödä', 'verb', 'Perfect')).toEqual(['olen syönyt', 'olet syönyt', 'on syönyt', 'olemme syöneet', 'olette syöneet', 'ovat syöneet'])
    expect(await forms('juoda', 'verb', 'Perfect')).toEqual(['olen juonut', 'olet juonut', 'on juonut', 'olemme juoneet', 'olette juoneet', 'ovat juoneet'])
    expect(await forms('käydä', 'verb', 'Perfect')).toEqual(['olen käynyt', 'olet käynyt', 'on käynyt', 'olemme käyneet', 'olette käyneet', 'ovat käyneet'])
    expect(await forms('voida', 'verb', 'Perfect')).toEqual(['olen voinut', 'olet voinut', 'on voinut', 'olemme voineet', 'olette voineet', 'ovat voineet'])
    expect(await forms('syödä', 'verb', 'Potential')).toEqual(['syönen', 'syönet', 'syönee', 'syönemme', 'syönette', 'syönevät'])
    expect(await forms('juoda', 'verb', 'Potential')).toEqual(['juonen', 'juonet', 'juonee', 'juonemme', 'juonette', 'juonevat'])
    expect(await forms('käydä', 'verb', 'Potential')).toEqual(['käynen', 'käynet', 'käynee', 'käynemme', 'käynette', 'käynevät'])
    expect(await forms('voida', 'verb', 'Potential')).toEqual(['voinen', 'voinet', 'voinee', 'voinemme', 'voinette', 'voinevat'])
  })

  it('irregulars have the expected passive and nominal forms', async () => {
    const passive = firstCellByLabel(await paradigm('nähdä'), 'Passive')
    expect(passive.get('Present')).toBe('nähdään')
    expect(passive.get('Present negative')).toBe('ei nähdä')
    expect(passive.get('Past')).toBe('nähtiin')
    expect(passive.get('Past negative')).toBe('ei nähty')
    const parts = cellsByLabel(await paradigm('tehdä'), 'Participles')
    expect(parts.get('Present active')).toEqual(['tekevä', 'tekevät'])
    expect(parts.get('Past passive')).toEqual(['tehty', 'tehdyt'])
    const inf = table(await paradigm('juoda'), 'Infinitives').rows.map((r) => r.cells[0])
    expect(inf).toEqual(['juoda', 'juoden', 'juodessa', 'juomassa', 'juomasta', 'juomaan', 'juomalla', 'juomatta', 'juoman', 'juominen'])
  })

  it('handles simple-t passive stems', async () => {
    const tullaPass = firstCellByLabel(await paradigm('tulla'), 'Passive')
    expect(tullaPass.get('Present')).toBe('tullaan')
    expect(tullaPass.get('Present negative')).toBe('ei tulta')
    expect(tullaPass.get('Past')).toBe('tultiin')
    expect(tullaPass.get('Past negative')).toBe('ei tultu')
    const syoParts = cellsByLabel(await paradigm('syödä'), 'Participles')
    expect(syoParts.get('Past passive')).toEqual(['syöty', 'syödyt'])
    expect(syoParts.get('Present passive')).toEqual(['syötävä', 'syötävät'])
  })

  // ── Noun / adjective declension (curated) ──────────────────────────────
  it('declines nouns across all cases', async () => {
    const p = await FinnishInflector.inflect('kissa', 'fi', 'noun')
    expect(p?.kind).toBe('declension')
    const t = p?.tables[0]
    expect(t?.columns).toEqual(['Singular', 'Plural'])
    expect(t?.rows.length).toBe(15)
    expect(t?.rows[0].cells).toEqual(['kissa', 'kissat'])
    expect(t?.rows[1].cells).toEqual(['kissan', 'kissojen'])
  })

  it('declines a gradating noun', async () => {
    const gen = (await FinnishInflector.inflect('katu', 'fi', 'noun'))?.tables[0].rows[1].cells
    expect(gen).toEqual(['kadun', 'katujen'])
  })

  it('declines adjectives', async () => {
    expect((await FinnishInflector.inflect('hyvä', 'fi', 'adjective'))?.kind).toBe('declension')
  })

  // ── Rule-based noun/adjective declension ───────────────────────────────
  it('declines a rule-based type 1 noun', async () => {
    // kala (no gradation)
    expect(await cell('kala', 0)).toEqual(['kala', 'kalat']) // nominative
    expect(await cell('kala', 1)).toEqual(['kalan', 'kalojen']) // genitive
    expect(await cell('kala', 2)).toEqual(['kalaa', 'kaloja']) // partitive
    expect(await cell('kala', 3)).toEqual(['kalassa', 'kaloissa']) // inessive
    expect(await cell('kala', 5)).toEqual(['kalaan', 'kaloihin']) // illative
    expect(await cell('kala', 13)).toEqual(['kaloine', 'kaloine']) // comitative
  })

  it('declines a rule-based type 1 gradating noun', async () => {
    // maito: t -> d in the weak grade.
    const rows = (await decl('maito')).tables[0].rows
    expect(rows[1].cells[0]).toBe('maidon') // gen sg (weak + n)
    expect(rows[0].cells[1]).toBe('maidot') // nom pl (weak + t)
    expect(rows[1].cells[1]).toBe('maitojen') // gen pl
  })

  it('declines a rule-based type 3 noun', async () => {
    const nainen = (await decl('nainen')).tables[0].rows
    expect([nainen[0].cells[1], nainen[1].cells[1]]).toEqual(['naiset', 'naisten'])
    expect(nainen[2].cells).toEqual(['naista', 'naisia'])
    expect(nainen[5].cells).toEqual(['naiseen', 'naisiin'])
    const ihminen = (await decl('ihminen')).tables[0].rows
    expect(ihminen[0].cells).toEqual(['ihminen', 'ihmiset'])
  })

  it('returns null for an unhandled noun', async () => {
    expect(await FinnishInflector.inflect('kirje', 'fi', 'noun')).toBeNull() // -e (type 2) -> LLM fallback
  })

  // ── Classification ─────────────────────────────────────────────────────
  it('gives adverbs a no-inflection note', async () => {
    const p = await FinnishInflector.inflect('hyvin', 'fi', 'adverb')
    expect(p?.kind).toBeNull()
    expect((p?.note ?? '').trim().length > 0).toBe(true)
  })

  it('uses the verb-first heuristic for a null POS', async () => {
    expect((await FinnishInflector.inflect('heittää', 'fi', null))?.kind).toBe('conjugation')
    expect((await FinnishInflector.inflect('kissa', 'fi', null))?.kind).toBe('declension')
  })

  it('returns null for a non-Finnish language', async () => {
    expect(await FinnishInflector.inflect('kissa', 'it', 'noun')).toBeNull()
  })
})

class CountingLlm implements InflectionEngine {
  readonly engine = 'llm'
  calls = 0

  async inflect(lemma: string, lang: string): Promise<InflectionParadigm | null> {
    this.calls++
    const parsed = InflectionParser.parse('{"kind":"declension","note":"","tables":[]}')
    return parsed ? { ...parsed, lemma, lang } : null
  }
}

describe('TieredInflectionEngine with FinnishInflector', () => {
  it('uses the bundled engine for Finnish without calling the LLM', async () => {
    const llm = new CountingLlm()
    const tiered = new TieredInflectionEngine(new Map([['fi', FinnishInflector]]), llm)
    const p = await tiered.inflect('kissa', 'fi', 'noun')
    expect(p?.kind).toBe('declension')
    expect((p?.tables[0]?.rows.length ?? 0) > 0).toBe(true)
    expect(llm.calls).toBe(0)
  })

  it('falls back to the LLM on a bundled miss', async () => {
    const llm = new CountingLlm()
    const tiered = new TieredInflectionEngine(new Map([['fi', FinnishInflector]]), llm)
    const p = await tiered.inflect('paperi', 'fi', 'noun')
    expect(p?.kind).toBe('declension')
    expect(llm.calls).toBe(1)
  })

  it('uses the LLM for non-Finnish', async () => {
    const llm = new CountingLlm()
    const tiered = new TieredInflectionEngine(new Map([['fi', FinnishInflector]]), llm)
    const p = await tiered.inflect('casa', 'it', 'noun')
    expect(p?.kind).toBe('declension')
    expect(llm.calls).toBe(1)
  })
})
