import type {
  InflectionEngine,
  InflectionParadigm,
  ParadigmRow,
  ParadigmTable
} from '../inflection'

type Gender = 'MASCULINE' | 'FEMININE' | 'NEUTER'

interface IrregularVerb {
  present: string[]
  preterite: string[]
  participle: string
  auxiliary?: string
  imperative?: string[]
}

interface NounInfo {
  gender: Gender
  plural: string
}

const PRONOUN_LIKE = new Set(['pronoun', 'determiner', 'numeral'])

const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie']
const IMPERATIVE_LABELS = ['du', 'ihr', 'Sie']
const ADJECTIVE_COLUMNS = ['Maskulin', 'Feminin', 'Neutrum', 'Plural']

const VOWELS = 'aeiouäöü'

const KEEP_ER_E = new Set(['leer'])

const HABEN_PRESENT = ['habe', 'hast', 'hat', 'haben', 'habt', 'haben']
const SEIN_PRESENT = ['bin', 'bist', 'ist', 'sind', 'seid', 'sind']
const WERDEN_PRESENT = ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden']

const UNSEPARABLE_PREFIXES = ['be', 'ge', 'er', 'ver', 'zer', 'ent', 'emp', 'miss']
const SEPARABLE_PREFIXES = [
  'auf',
  'an',
  'aus',
  'ein',
  'mit',
  'nach',
  'vor',
  'zu',
  'weg',
  'ab',
  'um',
  'los',
  'weiter'
]

const ARTICLE_SINGULAR: Record<Gender, string[]> = {
  MASCULINE: ['der', 'des', 'dem', 'den'],
  FEMININE: ['die', 'der', 'der', 'die'],
  NEUTER: ['das', 'des', 'dem', 'das']
}

const ARTICLE_GENDER: Record<string, Gender> = {
  der: 'MASCULINE',
  den: 'MASCULINE',
  dem: 'MASCULINE',
  des: 'MASCULINE',
  die: 'FEMININE',
  das: 'NEUTER'
}

const AMBIGUOUS_ARTICLES = new Set(['ein', 'einen', 'einem', 'eines', 'eine', 'einer'])

const IRREGULAR_VERBS: Map<string, IrregularVerb> = new Map([
  [
    'sein',
    {
      present: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'],
      preterite: ['war', 'warst', 'war', 'waren', 'wart', 'waren'],
      participle: 'gewesen',
      auxiliary: 'sein',
      imperative: ['sei', 'seid']
    }
  ],
  [
    'haben',
    {
      present: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'],
      preterite: ['hatte', 'hattest', 'hatte', 'hatten', 'hattet', 'hatten'],
      participle: 'gehabt',
      imperative: ['hab', 'habt']
    }
  ],
  [
    'werden',
    {
      present: ['werde', 'wirst', 'wird', 'werden', 'werdet', 'werden'],
      preterite: ['wurde', 'wurdest', 'wurde', 'wurden', 'wurdet', 'wurden'],
      participle: 'geworden',
      auxiliary: 'sein',
      imperative: ['werde', 'werdet']
    }
  ],
  [
    'gehen',
    {
      present: ['gehe', 'gehst', 'geht', 'gehen', 'geht', 'gehen'],
      preterite: ['ging', 'gingst', 'ging', 'gingen', 'gingt', 'gingen'],
      participle: 'gegangen',
      auxiliary: 'sein',
      imperative: ['geh', 'geht']
    }
  ],
  [
    'kommen',
    {
      present: ['komme', 'kommst', 'kommt', 'kommen', 'kommt', 'kommen'],
      preterite: ['kam', 'kamst', 'kam', 'kamen', 'kamt', 'kamen'],
      participle: 'gekommen',
      auxiliary: 'sein',
      imperative: ['komm', 'kommt']
    }
  ],
  [
    'sehen',
    {
      present: ['sehe', 'siehst', 'sieht', 'sehen', 'seht', 'sehen'],
      preterite: ['sah', 'sahst', 'sah', 'sahen', 'saht', 'sahen'],
      participle: 'gesehen',
      imperative: ['sieh', 'seht']
    }
  ],
  [
    'lesen',
    {
      present: ['lese', 'liest', 'liest', 'lesen', 'lest', 'lesen'],
      preterite: ['las', 'lasest', 'las', 'lasen', 'last', 'lasen'],
      participle: 'gelesen',
      imperative: ['lies', 'lest']
    }
  ],
  [
    'sprechen',
    {
      present: ['spreche', 'sprichst', 'spricht', 'sprechen', 'sprecht', 'sprechen'],
      preterite: ['sprach', 'sprachst', 'sprach', 'sprachen', 'spracht', 'sprachen'],
      participle: 'gesprochen',
      imperative: ['sprich', 'sprecht']
    }
  ],
  [
    'essen',
    {
      present: ['esse', 'isst', 'isst', 'essen', 'esst', 'essen'],
      preterite: ['aß', 'aßest', 'aß', 'aßen', 'aßt', 'aßen'],
      participle: 'gegessen',
      imperative: ['iss', 'esst']
    }
  ],
  [
    'nehmen',
    {
      present: ['nehme', 'nimmst', 'nimmt', 'nehmen', 'nehmt', 'nehmen'],
      preterite: ['nahm', 'nahmst', 'nahm', 'nahmen', 'nahmt', 'nahmen'],
      participle: 'genommen',
      imperative: ['nimm', 'nehmt']
    }
  ],
  [
    'geben',
    {
      present: ['gebe', 'gibst', 'gibt', 'geben', 'gebt', 'geben'],
      preterite: ['gab', 'gabst', 'gab', 'gaben', 'gabt', 'gaben'],
      participle: 'gegeben',
      imperative: ['gib', 'gebt']
    }
  ],
  [
    'fahren',
    {
      present: ['fahre', 'fährst', 'fährt', 'fahren', 'fahrt', 'fahren'],
      preterite: ['fuhr', 'fuhrst', 'fuhr', 'fuhren', 'fuhrt', 'fuhren'],
      participle: 'gefahren',
      auxiliary: 'sein',
      imperative: ['fahr', 'fahrt']
    }
  ],
  [
    'schlafen',
    {
      present: ['schlafe', 'schläfst', 'schläft', 'schlafen', 'schlaft', 'schlafen'],
      preterite: ['schlief', 'schliefst', 'schlief', 'schliefen', 'schlieft', 'schliefen'],
      participle: 'geschlafen',
      imperative: ['schlaf', 'schlaft']
    }
  ],
  [
    'laufen',
    {
      present: ['laufe', 'läufst', 'läuft', 'laufen', 'lauft', 'laufen'],
      preterite: ['lief', 'liefst', 'lief', 'liefen', 'lieft', 'liefen'],
      participle: 'gelaufen',
      auxiliary: 'sein',
      imperative: ['lauf', 'lauft']
    }
  ],
  [
    'helfen',
    {
      present: ['helfe', 'hilfst', 'hilft', 'helfen', 'helft', 'helfen'],
      preterite: ['half', 'halfst', 'half', 'halfen', 'halft', 'halfen'],
      participle: 'geholfen',
      imperative: ['hilf', 'helft']
    }
  ],
  [
    'treffen',
    {
      present: ['treffe', 'triffst', 'trifft', 'treffen', 'trefft', 'treffen'],
      preterite: ['traf', 'trafst', 'traf', 'trafen', 'traft', 'trafen'],
      participle: 'getroffen',
      imperative: ['triff', 'trefft']
    }
  ],
  [
    'werfen',
    {
      present: ['werfe', 'wirfst', 'wirft', 'werfen', 'werft', 'werfen'],
      preterite: ['warf', 'warfst', 'warf', 'warfen', 'warft', 'warfen'],
      participle: 'geworfen',
      imperative: ['wirf', 'werft']
    }
  ],
  [
    'stehlen',
    {
      present: ['stehle', 'stiehlst', 'stiehlt', 'stehlen', 'stehlt', 'stehlen'],
      preterite: ['stahl', 'stahlst', 'stahl', 'stahlen', 'stahlt', 'stahlen'],
      participle: 'gestohlen',
      imperative: ['stiehl', 'stehlt']
    }
  ],
  [
    'vergessen',
    {
      present: ['vergesse', 'vergisst', 'vergisst', 'vergessen', 'vergesst', 'vergessen'],
      preterite: ['vergaß', 'vergaßest', 'vergaß', 'vergaßen', 'vergaßt', 'vergaßen'],
      participle: 'vergessen',
      imperative: ['vergiss', 'vergeßt']
    }
  ],
  [
    'fangen',
    {
      present: ['fange', 'fängst', 'fängt', 'fangen', 'fangt', 'fangen'],
      preterite: ['fing', 'fingst', 'fing', 'fingen', 'fingt', 'fingen'],
      participle: 'gefangen',
      imperative: ['fang', 'fangt']
    }
  ],
  [
    'halten',
    {
      present: ['halte', 'hältst', 'hält', 'halten', 'haltet', 'halten'],
      preterite: ['hielt', 'hieltest', 'hielt', 'hielten', 'hieltet', 'hielten'],
      participle: 'gehalten',
      imperative: ['halt', 'haltet']
    }
  ],
  [
    'tragen',
    {
      present: ['trage', 'trägst', 'trägt', 'tragen', 'tragt', 'tragen'],
      preterite: ['trug', 'trugst', 'trug', 'trugen', 'trugt', 'trugen'],
      participle: 'getragen',
      imperative: ['trag', 'tragt']
    }
  ],
  [
    'waschen',
    {
      present: ['wasche', 'wäschst', 'wäscht', 'waschen', 'wascht', 'waschen'],
      preterite: ['wusch', 'wuschst', 'wusch', 'wuschen', 'wuscht', 'wuschen'],
      participle: 'gewaschen',
      imperative: ['wasch', 'wascht']
    }
  ],
  [
    'lassen',
    {
      present: ['lasse', 'lässt', 'lässt', 'lassen', 'lasst', 'lassen'],
      preterite: ['ließ', 'ließest', 'ließ', 'ließen', 'ließt', 'ließen'],
      participle: 'gelassen',
      imperative: ['lass', 'lasst']
    }
  ],
  [
    'sitzen',
    {
      present: ['sitze', 'sitzt', 'sitzt', 'sitzen', 'sitzt', 'sitzen'],
      preterite: ['saß', 'saßest', 'saß', 'saßen', 'saßt', 'saßen'],
      participle: 'gesessen',
      imperative: ['sitz', 'sitzt']
    }
  ],
  [
    'liegen',
    {
      present: ['liege', 'liegst', 'liegt', 'liegen', 'liegt', 'liegen'],
      preterite: ['lag', 'lagst', 'lag', 'lagen', 'lagt', 'lagen'],
      participle: 'gelegen',
      imperative: ['lieg', 'liegt']
    }
  ],
  [
    'stehen',
    {
      present: ['stehe', 'stehst', 'steht', 'stehen', 'steht', 'stehen'],
      preterite: ['stand', 'standst', 'stand', 'standen', 'standet', 'standen'],
      participle: 'gestanden',
      imperative: ['steh', 'steht']
    }
  ],
  [
    'tun',
    {
      present: ['tue', 'tust', 'tut', 'tun', 'tut', 'tun'],
      preterite: ['tat', 'tatst', 'tat', 'taten', 'tatet', 'taten'],
      participle: 'getan',
      imperative: ['tu', 'tut']
    }
  ],
  [
    'wissen',
    {
      present: ['weiß', 'weißt', 'weiß', 'wissen', 'wisst', 'wissen'],
      preterite: ['wusste', 'wusstest', 'wusste', 'wussten', 'wusstet', 'wussten'],
      participle: 'gewusst'
    }
  ],
  [
    'denken',
    {
      present: ['denke', 'denkst', 'denkt', 'denken', 'denkt', 'denken'],
      preterite: ['dachte', 'dachtest', 'dachte', 'dachten', 'dachtet', 'dachten'],
      participle: 'gedacht',
      imperative: ['denk', 'denkt']
    }
  ],
  [
    'bringen',
    {
      present: ['bringe', 'bringst', 'bringt', 'bringen', 'bringt', 'bringen'],
      preterite: ['brachte', 'brachtest', 'brachte', 'brachten', 'brachtet', 'brachten'],
      participle: 'gebracht',
      imperative: ['bring', 'bringt']
    }
  ],
  [
    'kennen',
    {
      present: ['kenne', 'kennst', 'kennt', 'kennen', 'kennt', 'kennen'],
      preterite: ['kannte', 'kanntest', 'kannte', 'kannten', 'kanntet', 'kannten'],
      participle: 'gekannt',
      imperative: ['kenn', 'kennt']
    }
  ],
  [
    'nennen',
    {
      present: ['nenne', 'nennst', 'nennt', 'nennen', 'nennt', 'nennen'],
      preterite: ['nannte', 'nanntest', 'nannte', 'nannten', 'nanntet', 'nannten'],
      participle: 'genannt',
      imperative: ['nenn', 'nennt']
    }
  ],
  [
    'mögen',
    {
      present: ['mag', 'magst', 'mag', 'mögen', 'mögt', 'mögen'],
      preterite: ['mochte', 'mochtest', 'mochte', 'mochten', 'mochtet', 'mochten'],
      participle: 'gemocht'
    }
  ],
  [
    'müssen',
    {
      present: ['muss', 'musst', 'muss', 'müssen', 'müsst', 'müssen'],
      preterite: ['musste', 'musstest', 'musste', 'mussten', 'musstet', 'mussten'],
      participle: 'gemusst'
    }
  ],
  [
    'können',
    {
      present: ['kann', 'kannst', 'kann', 'können', 'könnt', 'können'],
      preterite: ['konnte', 'konntest', 'konnte', 'konnten', 'konntet', 'konnten'],
      participle: 'gekonnt'
    }
  ],
  [
    'wollen',
    {
      present: ['will', 'willst', 'will', 'wollen', 'wollt', 'wollen'],
      preterite: ['wollte', 'wolltest', 'wollte', 'wollten', 'wolltet', 'wollten'],
      participle: 'gewollt'
    }
  ],
  [
    'dürfen',
    {
      present: ['darf', 'darfst', 'darf', 'dürfen', 'dürft', 'dürfen'],
      preterite: ['durfte', 'durftest', 'durfte', 'durften', 'durftet', 'durften'],
      participle: 'gedurft'
    }
  ],
  [
    'sollen',
    {
      present: ['soll', 'sollst', 'soll', 'sollen', 'sollt', 'sollen'],
      preterite: ['sollte', 'solltest', 'sollte', 'sollten', 'solltet', 'sollten'],
      participle: 'gesollt'
    }
  ],
  [
    'bleiben',
    {
      present: ['bleibe', 'bleibst', 'bleibt', 'bleiben', 'bleibt', 'bleiben'],
      preterite: ['blieb', 'bliebst', 'blieb', 'blieben', 'bliebt', 'blieben'],
      participle: 'geblieben',
      auxiliary: 'sein',
      imperative: ['bleib', 'bleibt']
    }
  ],
  [
    'fliegen',
    {
      present: ['fliege', 'fliegst', 'fliegt', 'fliegen', 'fliegt', 'fliegen'],
      preterite: ['flog', 'flogst', 'flog', 'flogen', 'flogt', 'flogen'],
      participle: 'geflogen',
      auxiliary: 'sein',
      imperative: ['flieg', 'fliegt']
    }
  ],
  [
    'ziehen',
    {
      present: ['ziehe', 'ziehst', 'zieht', 'ziehen', 'zieht', 'ziehen'],
      preterite: ['zog', 'zogst', 'zog', 'zogen', 'zogt', 'zogen'],
      participle: 'gezogen',
      imperative: ['zieh', 'zieht']
    }
  ],
  [
    'schreiben',
    {
      present: ['schreibe', 'schreibst', 'schreibt', 'schreiben', 'schreibt', 'schreiben'],
      preterite: ['schrieb', 'schriebst', 'schrieb', 'schrieben', 'schriebt', 'schrieben'],
      participle: 'geschrieben',
      imperative: ['schreib', 'schreibt']
    }
  ],
  [
    'singen',
    {
      present: ['singe', 'singst', 'singt', 'singen', 'singt', 'singen'],
      preterite: ['sang', 'sangst', 'sang', 'sangen', 'sangt', 'sangen'],
      participle: 'gesungen',
      imperative: ['sing', 'singt']
    }
  ],
  [
    'trinken',
    {
      present: ['trinke', 'trinkst', 'trinkt', 'trinken', 'trinkt', 'trinken'],
      preterite: ['trank', 'trankst', 'trank', 'tranken', 'trankt', 'tranken'],
      participle: 'getrunken',
      imperative: ['trink', 'trinkt']
    }
  ],
  [
    'beginnen',
    {
      present: ['beginne', 'beginnst', 'beginnt', 'beginnen', 'beginnt', 'beginnen'],
      preterite: ['begann', 'begannst', 'begann', 'begannen', 'begannt', 'begannen'],
      participle: 'begonnen',
      imperative: ['beginn', 'beginnt']
    }
  ],
  [
    'gewinnen',
    {
      present: ['gewinne', 'gewinnst', 'gewinnt', 'gewinnen', 'gewinnt', 'gewinnen'],
      preterite: ['gewann', 'gewannst', 'gewann', 'gewannen', 'gewannt', 'gewannen'],
      participle: 'gewonnen',
      imperative: ['gewinn', 'gewinnt']
    }
  ],
  [
    'finden',
    {
      present: ['finde', 'findest', 'findet', 'finden', 'findet', 'finden'],
      preterite: ['fand', 'fandst', 'fand', 'fanden', 'fandet', 'fanden'],
      participle: 'gefunden',
      imperative: ['find', 'findet']
    }
  ],
  [
    'sterben',
    {
      present: ['sterbe', 'stirbst', 'stirbt', 'sterben', 'sterbt', 'sterben'],
      preterite: ['starb', 'starbst', 'starb', 'starben', 'starbt', 'starben'],
      participle: 'gestorben',
      auxiliary: 'sein',
      imperative: ['stirb', 'sterbt']
    }
  ],
  [
    'verlieren',
    {
      present: ['verliere', 'verlierst', 'verliert', 'verlieren', 'verliert', 'verlieren'],
      preterite: ['verlor', 'verlorst', 'verlor', 'verloren', 'verlorst', 'verloren'],
      participle: 'verloren',
      imperative: ['verlier', 'verliert']
    }
  ],
  [
    'heißen',
    {
      present: ['heiße', 'heißt', 'heißt', 'heißen', 'heißt', 'heißen'],
      preterite: ['hieß', 'hießest', 'hieß', 'hießen', 'hießt', 'hießen'],
      participle: 'geheißen',
      imperative: ['heiß', 'heißt']
    }
  ],
  [
    'rennen',
    {
      present: ['renne', 'rennst', 'rennt', 'rennen', 'rennt', 'rennen'],
      preterite: ['rannte', 'ranntest', 'rannte', 'rannten', 'ranntet', 'rannten'],
      participle: 'gerannt',
      auxiliary: 'sein',
      imperative: ['renn', 'rennt']
    }
  ],
  [
    'brennen',
    {
      present: ['brenne', 'brennst', 'brennt', 'brennen', 'brennt', 'brennen'],
      preterite: ['brannte', 'branntest', 'brannte', 'brannten', 'branntet', 'brannten'],
      participle: 'gebrannt',
      imperative: ['brenn', 'brennt']
    }
  ]
])

const NOUNS: Map<string, NounInfo> = new Map([
  ['tisch', { gender: 'MASCULINE', plural: 'Tische' }],
  ['hund', { gender: 'MASCULINE', plural: 'Hunde' }],
  ['tag', { gender: 'MASCULINE', plural: 'Tage' }],
  ['mann', { gender: 'MASCULINE', plural: 'Männer' }],
  ['stuhl', { gender: 'MASCULINE', plural: 'Stühle' }],
  ['lehrer', { gender: 'MASCULINE', plural: 'Lehrer' }],
  ['computer', { gender: 'MASCULINE', plural: 'Computer' }],
  ['baum', { gender: 'MASCULINE', plural: 'Bäume' }],
  ['arzt', { gender: 'MASCULINE', plural: 'Ärzte' }],
  ['freund', { gender: 'MASCULINE', plural: 'Freunde' }],
  ['name', { gender: 'MASCULINE', plural: 'Namen' }],
  ['junge', { gender: 'MASCULINE', plural: 'Jungen' }],
  ['monat', { gender: 'MASCULINE', plural: 'Monate' }],
  ['abend', { gender: 'MASCULINE', plural: 'Abende' }],
  ['morgen', { gender: 'MASCULINE', plural: 'Morgen' }],
  ['weg', { gender: 'MASCULINE', plural: 'Wege' }],
  ['platz', { gender: 'MASCULINE', plural: 'Plätze' }],
  ['bus', { gender: 'MASCULINE', plural: 'Busse' }],
  ['zug', { gender: 'MASCULINE', plural: 'Züge' }],
  ['wein', { gender: 'MASCULINE', plural: 'Weine' }],
  ['fisch', { gender: 'MASCULINE', plural: 'Fische' }],
  ['vogel', { gender: 'MASCULINE', plural: 'Vögel' }],
  ['berg', { gender: 'MASCULINE', plural: 'Berge' }],
  ['fluss', { gender: 'MASCULINE', plural: 'Flüsse' }],
  ['brief', { gender: 'MASCULINE', plural: 'Briefe' }],
  ['film', { gender: 'MASCULINE', plural: 'Filme' }],
  ['schlüssel', { gender: 'MASCULINE', plural: 'Schlüssel' }],
  ['apfel', { gender: 'MASCULINE', plural: 'Äpfel' }],
  ['vater', { gender: 'MASCULINE', plural: 'Väter' }],
  ['bruder', { gender: 'MASCULINE', plural: 'Brüder' }],
  ['onkel', { gender: 'MASCULINE', plural: 'Onkel' }],
  ['fuß', { gender: 'MASCULINE', plural: 'Füße' }],
  ['arm', { gender: 'MASCULINE', plural: 'Arme' }],
  ['kopf', { gender: 'MASCULINE', plural: 'Köpfe' }],
  ['mund', { gender: 'MASCULINE', plural: 'Münder' }],
  ['park', { gender: 'MASCULINE', plural: 'Parks' }],
  ['frau', { gender: 'FEMININE', plural: 'Frauen' }],
  ['blume', { gender: 'FEMININE', plural: 'Blumen' }],
  ['straße', { gender: 'FEMININE', plural: 'Straßen' }],
  ['stadt', { gender: 'FEMININE', plural: 'Städte' }],
  ['nacht', { gender: 'FEMININE', plural: 'Nächte' }],
  ['hand', { gender: 'FEMININE', plural: 'Hände' }],
  ['schule', { gender: 'FEMININE', plural: 'Schulen' }],
  ['zeit', { gender: 'FEMININE', plural: 'Zeiten' }],
  ['frage', { gender: 'FEMININE', plural: 'Fragen' }],
  ['antwort', { gender: 'FEMININE', plural: 'Antworten' }],
  ['sprache', { gender: 'FEMININE', plural: 'Sprachen' }],
  ['mutter', { gender: 'FEMININE', plural: 'Mütter' }],
  ['tochter', { gender: 'FEMININE', plural: 'Töchter' }],
  ['schwester', { gender: 'FEMININE', plural: 'Schwestern' }],
  ['tasche', { gender: 'FEMININE', plural: 'Taschen' }],
  ['lampe', { gender: 'FEMININE', plural: 'Lampen' }],
  ['tür', { gender: 'FEMININE', plural: 'Türen' }],
  ['wand', { gender: 'FEMININE', plural: 'Wände' }],
  ['reise', { gender: 'FEMININE', plural: 'Reisen' }],
  ['minute', { gender: 'FEMININE', plural: 'Minuten' }],
  ['stunde', { gender: 'FEMININE', plural: 'Stunden' }],
  ['woche', { gender: 'FEMININE', plural: 'Wochen' }],
  ['arbeit', { gender: 'FEMININE', plural: 'Arbeiten' }],
  ['idee', { gender: 'FEMININE', plural: 'Ideen' }],
  ['firma', { gender: 'FEMININE', plural: 'Firmen' }],
  ['klasse', { gender: 'FEMININE', plural: 'Klassen' }],
  ['wohnung', { gender: 'FEMININE', plural: 'Wohnungen' }],
  ['familie', { gender: 'FEMININE', plural: 'Familien' }],
  ['uhr', { gender: 'FEMININE', plural: 'Uhren' }],
  ['aufgabe', { gender: 'FEMININE', plural: 'Aufgaben' }],
  ['geschichte', { gender: 'FEMININE', plural: 'Geschichten' }],
  ['seite', { gender: 'FEMININE', plural: 'Seiten' }],
  ['sache', { gender: 'FEMININE', plural: 'Sachen' }],
  ['tasse', { gender: 'FEMININE', plural: 'Tassen' }],
  ['kind', { gender: 'NEUTER', plural: 'Kinder' }],
  ['buch', { gender: 'NEUTER', plural: 'Bücher' }],
  ['haus', { gender: 'NEUTER', plural: 'Häuser' }],
  ['auto', { gender: 'NEUTER', plural: 'Autos' }],
  ['jahr', { gender: 'NEUTER', plural: 'Jahre' }],
  ['bild', { gender: 'NEUTER', plural: 'Bilder' }],
  ['wort', { gender: 'NEUTER', plural: 'Wörter' }],
  ['mädchen', { gender: 'NEUTER', plural: 'Mädchen' }],
  ['zimmer', { gender: 'NEUTER', plural: 'Zimmer' }],
  ['wasser', { gender: 'NEUTER', plural: 'Wasser' }],
  ['brot', { gender: 'NEUTER', plural: 'Brote' }],
  ['glas', { gender: 'NEUTER', plural: 'Gläser' }],
  ['hemd', { gender: 'NEUTER', plural: 'Hemden' }],
  ['bett', { gender: 'NEUTER', plural: 'Betten' }],
  ['ei', { gender: 'NEUTER', plural: 'Eier' }],
  ['land', { gender: 'NEUTER', plural: 'Länder' }],
  ['lied', { gender: 'NEUTER', plural: 'Lieder' }],
  ['spiel', { gender: 'NEUTER', plural: 'Spiele' }],
  ['essen', { gender: 'NEUTER', plural: 'Essen' }],
  ['getränk', { gender: 'NEUTER', plural: 'Getränke' }],
  ['handy', { gender: 'NEUTER', plural: 'Handys' }],
  ['problem', { gender: 'NEUTER', plural: 'Probleme' }],
  ['thema', { gender: 'NEUTER', plural: 'Themen' }],
  ['ende', { gender: 'NEUTER', plural: 'Enden' }],
  ['herz', { gender: 'NEUTER', plural: 'Herzen' }],
  ['telefon', { gender: 'NEUTER', plural: 'Telefone' }],
  ['radio', { gender: 'NEUTER', plural: 'Radios' }],
  ['kleid', { gender: 'NEUTER', plural: 'Kleider' }],
  ['papier', { gender: 'NEUTER', plural: 'Papiere' }],
  ['geschenk', { gender: 'NEUTER', plural: 'Geschenke' }]
])

function classify(pos: string | null): 'conjugation' | 'declension' | null {
  switch (pos?.toLowerCase()) {
    case 'verb':
      return 'conjugation'
    case 'noun':
    case 'adjective':
      return 'declension'
    case 'adverb':
    case 'preposition':
    case 'conjunction':
    case 'interjection':
    case 'particle':
      return null
    case 'pronoun':
    case 'determiner':
    case 'numeral':
      return null
    default:
      return null
  }
}

function looksLikeVerb(word: string): boolean {
  return word.endsWith('en') || word.endsWith('eln') || word.endsWith('ern')
}

function conjugate(word: string): InflectionParadigm | null {
  const irregular = IRREGULAR_VERBS.get(word)
  if (irregular !== undefined) return irregularVerbParadigm(word, irregular)
  if (word.endsWith('eln')) return elnVerb(word)
  if (word.endsWith('en') || word.endsWith('ern')) return regularVerb(word, word.slice(0, -2))
  return null
}

function regularVerb(inf: string, stem: string): InflectionParadigm {
  const tStem = stem.endsWith('t') || stem.endsWith('d')
  const last = stem[stem.length - 1] ?? ''
  const sStem = 'sßxz'.includes(last)
  const cluster =
    stem.endsWith('tn') ||
    stem.endsWith('dn') ||
    stem.endsWith('gn') ||
    stem.endsWith('chn') ||
    stem.endsWith('fm') ||
    stem.endsWith('tm') ||
    stem.endsWith('dm')

  const present = tStem
    ? [stem + 'e', stem + 'est', stem + 'et', inf, stem + 'et', inf]
    : sStem
      ? [stem + 'e', stem + 't', stem + 't', inf, stem + 't', inf]
      : [stem + 'e', stem + 'st', stem + 't', inf, stem + 't', inf]
  const prateritum =
    tStem || cluster
      ? [stem + 'ete', stem + 'etest', stem + 'ete', stem + 'eten', stem + 'etet', stem + 'eten']
      : [stem + 'te', stem + 'test', stem + 'te', stem + 'ten', stem + 'tet', stem + 'ten']
  const participle = partizipII(inf, stem, tStem || cluster)
  const imperative = [tStem ? stem + 'e' : stem, stem + 't', inf]
  return verbParadigm(inf, present, prateritum, participle, imperative, stem + 'end', 'haben')
}

function elnVerb(inf: string): InflectionParadigm {
  const stem = inf.slice(0, -1)
  const present = [
    (stem.endsWith('el') ? stem.slice(0, -2) : stem) + 'le',
    stem + 'st',
    stem + 't',
    inf,
    stem + 't',
    inf
  ]
  return verbParadigm(
    inf,
    present,
    [stem + 'te', stem + 'test', stem + 'te', stem + 'ten', stem + 'tet', stem + 'ten'],
    'ge' + stem + 't',
    [stem, stem + 't', inf],
    stem + 'end',
    'haben'
  )
}

function partizipII(inf: string, stem: string, cluster: boolean): string {
  const suffix = cluster ? 'et' : 't'
  if (inf.endsWith('ieren')) return stem + 't'
  if (UNSEPARABLE_PREFIXES.some((p) => inf.startsWith(p))) return stem + suffix
  if (SEPARABLE_PREFIXES.some((p) => inf.startsWith(p))) {
    const p = SEPARABLE_PREFIXES.find((prefix) => inf.startsWith(prefix))!
    return `${p}ge${inf.slice(p.length, -2)}${suffix}`
  }
  return `ge${stem}${suffix}`
}

function irregularVerbParadigm(inf: string, v: IrregularVerb): InflectionParadigm {
  const imperative =
    (v.imperative ?? []).length === 0
      ? []
      : [v.imperative![0], v.imperative![1], inf]
  return verbParadigm(
    inf,
    v.present,
    v.preterite,
    v.participle,
    imperative,
    null,
    v.auxiliary ?? 'haben'
  )
}

function verbParadigm(
  inf: string,
  present: string[],
  preterite: string[],
  participle: string,
  imperative: string[],
  partizipI: string | null,
  auxiliary: string
): InflectionParadigm {
  const auxPresent = auxiliary === 'sein' ? SEIN_PRESENT : HABEN_PRESENT
  const tables: ParadigmTable[] = []
  tables.push({
    title: 'Präsens',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [present[i]] }))
  })
  tables.push({
    title: 'Präteritum',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [preterite[i]] }))
  })
  tables.push({
    title: 'Perfekt',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [`${auxPresent[i]} ${participle}`] }))
  })
  tables.push({
    title: 'Futur I',
    columns: ['Form'],
    rows: PERSONS.map((p, i) => ({ label: p, cells: [`${WERDEN_PRESENT[i]} ${inf}`] }))
  })
  if (imperative.length > 0) {
    tables.push({
      title: 'Imperativ',
      columns: ['Form'],
      rows: IMPERATIVE_LABELS.map((l, i) => ({ label: l, cells: [imperative[i]] }))
    })
  }
  const pRows: ParadigmRow[] = []
  if (partizipI !== null) pRows.push({ label: 'Partizip I', cells: [partizipI] })
  pRows.push({ label: 'Partizip II', cells: [participle] })
  tables.push({ title: 'Partizipien', columns: ['Form'], rows: pRows })
  return {
    lemma: inf,
    lang: 'de',
    kind: 'conjugation',
    note: `Perfekt wird mit ${auxiliary === 'sein' ? 'sein' : 'haben'} gebildet.`,
    tables
  }
}

function splitArticle(query: string): [string | null, string] {
  const parts = query.trim().split(/\s+/, 2)
  const first = parts[0]?.toLowerCase()
  if (first !== undefined && (ARTICLE_GENDER[first] !== undefined || AMBIGUOUS_ARTICLES.has(first))) {
    return [first, parts[1] ?? query.trim()]
  }
  return [null, query.trim()]
}

function nounParadigm(article: string | null, word: string): InflectionParadigm | null {
  if (word === '') return null
  const lower = word.toLowerCase()
  const info = NOUNS.get(lower)
  let gender: Gender
  if (article !== null && AMBIGUOUS_ARTICLES.has(article)) {
    gender = info?.gender ?? 'MASCULINE'
  } else if (article !== null) {
    gender = ARTICLE_GENDER[article]!
  } else if (info !== undefined) {
    gender = info.gender
  } else {
    return null
  }
  const plural = info?.plural ?? guessPlural(gender, word)
  const genSg = gender === 'FEMININE' ? word : genitiveSg(word)
  const artSg = ARTICLE_SINGULAR[gender]
  const datPl = plural.endsWith('s') || plural.endsWith('n') ? plural : plural + 'n'
  const rows: ParadigmRow[] = [
    { label: 'Nominativ', cells: [`${artSg[0]} ${word}`, `die ${plural}`] },
    { label: 'Genitiv', cells: [`${artSg[1]} ${genSg}`, `der ${plural}`] },
    { label: 'Dativ', cells: [`${artSg[2]} ${word}`, `den ${datPl}`] },
    { label: 'Akkusativ', cells: [`${artSg[3]} ${word}`, `die ${plural}`] }
  ]
  return {
    lemma: word,
    lang: 'de',
    kind: 'declension',
    note:
      'Geschlecht und Pluralform richten sich nach dem Nomen ' +
      '(bei unbekannten Wörtern wird das Muster des Artikels verwendet).',
    tables: [{ title: `Deklination von ${word}`, columns: ['Singular', 'Plural'], rows }]
  }
}

function genitiveSg(word: string): string {
  const last = word[word.length - 1] ?? ''
  if ('sßxz'.includes(last)) return word + 'es'
  if (vowelGroups(word) <= 1) return word + 'es'
  return word + 's'
}

function guessPlural(gender: Gender, word: string): string {
  if (gender === 'FEMININE') return word.endsWith('e') ? word + 'n' : word + 'en'
  return word + 'e'
}

function vowelGroups(s: string): number {
  let count = 0
  let inVowel = false
  for (const ch of s.toLowerCase()) {
    const isVowel = 'aeiouäöüy'.includes(ch)
    if (isVowel && !inVowel) count++
    inVowel = isVowel
  }
  return count
}

function adjectiveParadigm(word: string): InflectionParadigm {
  let stem: string
  if (word.endsWith('el')) {
    stem = word.slice(0, -2) + 'l'
  } else if (KEEP_ER_E.has(word)) {
    stem = word
  } else if (word.endsWith('er') && VOWELS.includes(word[word.length - 3] ?? '')) {
    stem = word.slice(0, -2) + 'r'
  } else {
    stem = word
  }
  const rows: ParadigmRow[] = [
    { label: 'Nominativ', cells: [stem + 'er', stem + 'e', stem + 'es', stem + 'e'] },
    { label: 'Genitiv', cells: [stem + 'en', stem + 'er', stem + 'en', stem + 'er'] },
    { label: 'Dativ', cells: [stem + 'en', stem + 'er', stem + 'en', stem + 'en'] },
    { label: 'Akkusativ', cells: [stem + 'en', stem + 'e', stem + 'es', stem + 'e'] }
  ]
  return {
    lemma: word,
    lang: 'de',
    kind: 'declension',
    note: 'Starke Deklination (ohne Artikel).',
    tables: [{ title: `Deklination von ${word}`, columns: ADJECTIVE_COLUMNS, rows }]
  }
}

export const GermanInflector: InflectionEngine = {
  engine: 'de-bundled',

  async inflect(
    lemma: string,
    lang: string,
    pos: string | null
  ): Promise<InflectionParadigm | null> {
    if (lang.toLowerCase() !== 'de') return null
    const query = lemma.trim()
    if (query === '') return null

    const [article, word] = splitArticle(query)
    switch (classify(pos)) {
      case 'conjugation':
        return conjugate(word.toLowerCase())
      case 'declension':
        return pos?.toLowerCase() === 'adjective'
          ? adjectiveParadigm(word.toLowerCase())
          : nounParadigm(article, word)
      default: {
        if (pos !== null && PRONOUN_LIKE.has(pos.toLowerCase())) return null
        if ((pos === null || pos.trim() === '') && article !== null) {
          return nounParadigm(article, word)
        }
        if ((pos === null || pos.trim() === '') && looksLikeVerb(word.toLowerCase())) {
          return conjugate(word.toLowerCase()) ?? nounParadigm(article, word)
        }
        return {
          lemma,
          lang: 'de',
          kind: null,
          note: 'Adverbs, prepositions and particles do not inflect in German.',
          tables: []
        }
      }
    }
  }
}
