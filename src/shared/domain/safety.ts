/**
 * Prompt-side content guardrail (port of Android `ContentSafetyFilter`).
 *
 * Cobaltium is a language-learning app whose LLM harness generates text only.
 * The filter flags *generation intent* — a user asking the model to *produce*
 * clearly harmful content — and never ordinary vocabulary. A drill on the word
 * "kill" or a sentence about war must keep working; only prompts with an
 * explicit intent to generate such material are refused.
 */

export interface SafetyVerdict {
  allowed: boolean
  category?: string
}

type Category = [label: string, pattern: RegExp]

function rx(...fragments: string[]): RegExp {
  return new RegExp(fragments.join('|'), 'i')
}

function category(label: string, ...fragments: string[]): Category {
  return [label, rx(...fragments)]
}

const ENGLISH_CATEGORIES: Category[] = [
  category(
    'CSAM',
    'child porn',
    'cp\\b',
    'sexual.*child',
    'child.*sexual',
    'sexual.*minor',
    'minor.*sexual',
    'baby.*sex',
    'sex.*baby',
    'molest.*child',
    'child.*molest',
    'how to molest',
    'lolita',
    'under.?18',
    'sexualize.*child',
    'child.*sexualize'
  ),
  category(
    'WEAPONS',
    'how do i make a bomb',
    'make.*explosive',
    'build.*explosive',
    'manufacture.*explosive',
    'create.*explosive',
    'how to make.*bomb',
    'bomb.*instructions',
    'make.*pipe bomb',
    'build.*pipe bomb',
    'instructions for.*pipe bomb',
    'synthesize.*explosive',
    'explosive.*synthesis',
    'make a gun',
    'build a gun',
    '3d print.*gun',
    'how to make a weapon',
    'make.*chemical weapon',
    'instructions for.*explosive',
    'instructions.*make.*weapon'
  ),
  category(
    'DRUGS',
    'synthesize.*meth',
    'make.*meth',
    'cook.*meth',
    'how to make.*(heroin|cocaine|mdma|ecstasy|fentanyl)',
    'synthesize.*(heroin|cocaine|mdma|fentanyl)',
    'extract.*fentanyl',
    'make.*fentanyl',
    'synthesis.*(mdma|ecstasy)',
    'manufacture.*(heroin|cocaine|fentanyl)'
  ),
  category(
    'SELF_HARM',
    'how to kill myself',
    'best way to kill myself',
    'methods to kill myself',
    'how to commit suicide',
    'ways to commit suicide',
    'how do i commit suicide',
    'instructions for suicide',
    'how to self.?harm',
    'methods of self.?harm'
  ),
  category(
    'FRAUD',
    'how to.*identity theft',
    'steal.*(credit card|identity)',
    'how to.*fraud',
    'make.*fake.*(id|passport|money)',
    'counterfeit.*(money|bills|currency)',
    'how to.*counterfeit',
    'scam.*how to',
    'how to.*scam',
    'hack.*(bank|credit card)',
    'phishing.*instructions'
  )
]

const BY_LANGUAGE: Record<string, Category[]> = {
  de: [
    category(
      'WEAPONS',
      'wie baue ich eine bombe',
      'wie mache ich eine bombe',
      'bombe bauen',
      'bombe herstellen',
      'waffe bauen',
      'waffe herstellen',
      'sprängstoff herstellen',
      'wie stellt man eine bombe her',
      'bombenbau',
      'wie baue ich eine waffe'
    ),
    category(
      'DRUGS',
      'meth herstellen',
      'wie stelle ich meth her',
      'meth kochen',
      'heroin herstellen',
      'kokain herstellen',
      'fentanyl herstellen',
      'drogen herstellen',
      'metamphetamin herstellen',
      'wie kocht man meth'
    ),
    category(
      'SELF_HARM',
      'wie bringe ich mich um',
      'wie kann ich mich umbringen',
      'selbstmord begehen',
      'wie begehe ich selbstmord',
      'selbstverletzung',
      'wie verletze ich mich',
      'sich umbringen'
    ),
    category(
      'CSAM',
      'kinderpornografie',
      'kinderporno',
      'kind.*sexuell',
      'sexuell.*kind',
      'minderjährig.*sexuell',
      'sexuell.*minderjährig',
      'kindesmissbrauch',
      'pädophilie',
      'lolita'
    ),
    category(
      'FRAUD',
      'identitätsdiebstahl',
      'geld fälschen',
      'falschgeld',
      'wie fälscht man geld',
      'wie betrüge ich',
      'betrug',
      'kreditkartenbetrug',
      'phishing'
    )
  ],
  fr: [
    category(
      'WEAPONS',
      'comment fabriquer une bombe',
      'comment faire une bombe',
      'fabriquer une bombe',
      'fabriquer une arme',
      'faire une arme',
      'fabriquer un explosif',
      'comment faire une arme',
      'fabriquer une arme à feu'
    ),
    category(
      'DRUGS',
      'fabriquer de la méthamphétamine',
      'fabriquer de la meth',
      'cuisiner de la meth',
      "fabriquer de l'héroïne",
      'fabriquer de la cocaïne',
      'fabriquer du fentanyl',
      'comment fabriquer de la meth'
    ),
    category(
      'SELF_HARM',
      'comment me tuer',
      'comment me suicider',
      'comment commettre un suicide',
      'me suicider',
      'automutilation',
      'comment me mutiler'
    ),
    category(
      'CSAM',
      'pornographie infantile',
      'porno enfant',
      'pédopornographie',
      'enfant.*sexuel',
      'sexuel.*enfant',
      'mineur.*sexuel',
      'sexuel.*mineur',
      'pédophilie',
      'lolita'
    ),
    category(
      'FRAUD',
      "vol d'identité",
      'fausse monnaie',
      "falsifier de l'argent",
      'comment falsifier',
      'escroquerie',
      'comment escroquer',
      'fraude',
      'hameçonnage'
    )
  ],
  es: [
    category(
      'WEAPONS',
      'cómo hacer una bomba',
      'cómo fabricar una bomba',
      'hacer una bomba',
      'fabricar una bomba',
      'fabricar un arma',
      'hacer un arma',
      'fabricar un explosivo',
      'cómo fabricar armas'
    ),
    category(
      'DRUGS',
      'cómo hacer metanfetamina',
      'fabricar metanfetamina',
      'cocinar metanfetamina',
      'fabricar heroína',
      'fabricar cocaína',
      'fabricar fentanilo',
      'cómo fabricar metanfetamina'
    ),
    category(
      'SELF_HARM',
      'cómo matarme',
      'cómo suicidarme',
      'cómo cometer suicidio',
      'suicidarme',
      'autolesión',
      'cómo hacerme daño'
    ),
    category(
      'CSAM',
      'pornografía infantil',
      'porno infantil',
      'pornografía de menores',
      'niño.*sexual',
      'sexual.*niño',
      'menor.*sexual',
      'sexual.*menor',
      'pedofilia',
      'lolita'
    ),
    category(
      'FRAUD',
      'robo de identidad',
      'falsificar dinero',
      'falsificación de dinero',
      'billetes falsos',
      'cómo estafar',
      'estafa',
      'fraude',
      'suplantación de identidad'
    )
  ],
  pt: [
    category(
      'WEAPONS',
      'como fazer uma bomba',
      'como fabricar uma bomba',
      'fazer uma bomba',
      'fabricar uma bomba',
      'fabricar uma arma',
      'fazer uma arma',
      'fabricar explosivo'
    ),
    category(
      'DRUGS',
      'como fazer metanfetamina',
      'fabricar metanfetamina',
      'cozinhar metanfetamina',
      'fabricar heroína',
      'fabricar cocaína',
      'fabricar fentanil'
    ),
    category(
      'SELF_HARM',
      'como me matar',
      'como me suicidar',
      'como cometer suicídio',
      'suicidar',
      'automutilação',
      'como me machucar'
    ),
    category(
      'CSAM',
      'pornografia infantil',
      'porno infantil',
      'menor.*sexual',
      'sexual.*menor',
      'criança.*sexual',
      'sexual.*criança',
      'pedofilia',
      'lolita'
    ),
    category(
      'FRAUD',
      'roubo de identidade',
      'falsificar dinheiro',
      'falsificação de dinheiro',
      'notas falsas',
      'como fraudar',
      'fraude',
      'golpe',
      'aplicar golpe'
    )
  ],
  it: [
    category(
      'WEAPONS',
      'come fare una bomba',
      'come fabbricare una bomba',
      'fare una bomba',
      'fabbricare una bomba',
      "fabbricare un'arma",
      "fare un'arma",
      'fabbricare un esplosivo'
    ),
    category(
      'DRUGS',
      'come fare metanfetamina',
      'fabbricare metanfetamina',
      'cucinare metanfetamina',
      'fabbricare eroina',
      'fabbricare cocaina',
      'fabbricare fentanyl'
    ),
    category(
      'SELF_HARM',
      'come uccidermi',
      'come suicidarmi',
      'come commettere suicidio',
      'suicidarmi',
      'autolesionismo',
      'come farmi del male'
    ),
    category(
      'CSAM',
      'pornografia infantile',
      'porno infantile',
      'minore.*sessuale',
      'sessuale.*minore',
      'bambino.*sessuale',
      'sessuale.*bambino',
      'pedofilia',
      'lolita'
    ),
    category(
      'FRAUD',
      "furto d'identità",
      'falsificare denaro',
      'falsificazione di denaro',
      'banconote false',
      'come truffare',
      'truffa',
      'frode',
      'phishing'
    )
  ],
  sv: [
    category(
      'WEAPONS',
      'hur gör man en bomb',
      'hur bygger man en bomb',
      'tillverka en bomb',
      'tillverka ett vapen',
      'göra ett vapen',
      'tillverka sprängmedel'
    ),
    category(
      'DRUGS',
      'hur gör man metamfetamin',
      'tillverka metamfetamin',
      'koka metamfetamin',
      'tillverka heroin',
      'tillverka kokain',
      'tillverka fentanyl'
    ),
    category(
      'SELF_HARM',
      'hur tar jag mitt liv',
      'hur begår jag självmord',
      'begå självmord',
      'självskada',
      'hur skadar jag mig själv'
    ),
    category(
      'CSAM',
      'barnpornografi',
      'barn.*sexuell',
      'sexuell.*barn',
      'minderårig.*sexuell',
      'sexuell.*minderårig',
      'pedofili',
      'lolita'
    ),
    category(
      'FRAUD',
      'identitetsstöld',
      'förfalska pengar',
      'falska pengar',
      'hur begår man bedrägeri',
      'bedrägeri',
      'kortbedrägeri'
    )
  ],
  da: [
    category(
      'WEAPONS',
      'hvordan laver man en bombe',
      'lave en bombe',
      'fremstille en bombe',
      'fremstille et våben',
      'lave et våben',
      'fremstille sprængstof'
    ),
    category(
      'DRUGS',
      'hvordan laver man metamfetamin',
      'fremstille metamfetamin',
      'koge metamfetamin',
      'fremstille heroin',
      'fremstille kokain',
      'fremstille fentanyl'
    ),
    category(
      'SELF_HARM',
      'hvordan tager jeg mit liv',
      'hvordan begår jeg selvmord',
      'begå selvmord',
      'selvskade',
      'hvordan skader jeg mig selv'
    ),
    category(
      'CSAM',
      'børnepornografi',
      'børneporno',
      'barn.*seksuel',
      'seksuel.*barn',
      'mindreårig.*seksuel',
      'seksuel.*mindreårig',
      'pædofili',
      'lolita'
    ),
    category(
      'FRAUD',
      'identitetstyveri',
      'forfalske penge',
      'falske penge',
      'hvordan begår man bedrageri',
      'bedrageri',
      'kortbedrageri'
    )
  ],
  nl: [
    category(
      'WEAPONS',
      'hoe maak je een bom',
      'hoe bouw je een bom',
      'een bom maken',
      'een bom bouwen',
      'een wapen maken',
      'een wapen bouwen',
      'explosief maken'
    ),
    category(
      'DRUGS',
      'hoe maak je meth',
      'meth maken',
      'meth koken',
      'heroïne maken',
      'cocaïne maken',
      'fentanyl maken',
      'metamfetamine maken'
    ),
    category(
      'SELF_HARM',
      'hoe maak ik een einde aan mijn leven',
      'hoe pleeg ik zelfmoord',
      'zelfmoord plegen',
      'zelfbeschadiging',
      'hoe verwond ik mezelf'
    ),
    category(
      'CSAM',
      'kinderporno',
      'kinderpornografie',
      'kind.*seksueel',
      'seksueel.*kind',
      'minderjarige.*seksueel',
      'seksueel.*minderjarige',
      'pedofilie',
      'lolita'
    ),
    category(
      'FRAUD',
      'identiteitsdiefstal',
      'geld vervalsen',
      'vals geld',
      'hoe pleeg je oplichting',
      'oplichting',
      'fraude',
      'phishing'
    )
  ],
  id: [
    category(
      'WEAPONS',
      'cara membuat bom',
      'cara merakit bom',
      'membuat bom',
      'membuat senjata',
      'cara membuat senjata',
      'membuat bahan peledak'
    ),
    category(
      'DRUGS',
      'cara membuat metamfetamin',
      'membuat metamfetamin',
      'memasak metamfetamin',
      'membuat heroin',
      'membuat kokain',
      'membuat fentanil'
    ),
    category(
      'SELF_HARM',
      'cara bunuh diri',
      'cara mengakhiri hidupku',
      'membunuh diriku',
      'menyakiti diri sendiri',
      'cara menyakiti diri'
    ),
    category(
      'CSAM',
      'pornografi anak',
      'porno anak',
      'anak.*seksual',
      'seksual.*anak',
      'pedofilia',
      'lolita'
    ),
    category('FRAUD', 'pencurian identitas', 'memalsukan uang', 'uang palsu', 'cara menipu', 'penipuan', 'phishing')
  ],
  pl: [
    category(
      'WEAPONS',
      'jak zrobić bombę',
      'jak zbudować bombę',
      'zrobić bombę',
      'wyprodukować bombę',
      'zrobić broń',
      'wyprodukować broń',
      'zrobić materiał wybuchowy'
    ),
    category(
      'DRUGS',
      'jak zrobić metamfetaminę',
      'zrobić metamfetaminę',
      'ugotować metamfetaminę',
      'zrobić heroinę',
      'zrobić kokainę',
      'zrobić fentanyl'
    ),
    category(
      'SELF_HARM',
      'jak się zabić',
      'jak popełnić samobójstwo',
      'popełnić samobójstwo',
      'samookaleczenie',
      'jak siebie skrzywdzić'
    ),
    category(
      'CSAM',
      'pornografia dziecięca',
      'porno dziecięce',
      'dziecko.*seksualny',
      'seksualny.*dziecko',
      'nieletni.*seksualny',
      'seksualny.*nieletni',
      'pedofilia',
      'lolita'
    ),
    category('FRAUD', 'kradzież tożsamości', 'fałszować pieniądze', 'fałszywe pieniądze', 'jak oszukiwać', 'oszustwo')
  ],
  tr: [
    category(
      'WEAPONS',
      'bomba nasıl yapılır',
      'bomba yapmak',
      'silah nasıl yapılır',
      'silah yapmak',
      'patlayıcı yapmak',
      'bomba yapımı'
    ),
    category(
      'DRUGS',
      'metamfetamin nasıl yapılır',
      'metamfetamin yapmak',
      'eroin yapmak',
      'kokain yapmak',
      'fentanil yapmak',
      'uyuşturucu yapmak'
    ),
    category(
      'SELF_HARM',
      'kendimi nasıl öldürürüm',
      'nasıl intihar ederim',
      'intihar etmek',
      'kendine zarar vermek',
      'kendimi nasıl yaralarım'
    ),
    category(
      'CSAM',
      'çocuk pornografisi',
      'çocuk porno',
      'çocuk.*cinsel',
      'cinsel.*çocuk',
      'reşit olmayan.*cinsel',
      'cinsel.*reşit olmayan',
      'pedofili',
      'lolita'
    ),
    category(
      'FRAUD',
      'kimlik hırsızlığı',
      'para sahteciliği',
      'sahte para',
      'nasıl dolandırırım',
      'dolandırıcılık',
      'dolandırma',
      'kimlik sahteciliği'
    )
  ],
  ru: [
    category(
      'WEAPONS',
      'как сделать бомбу',
      'как изготовить бомбу',
      'сделать бомбу',
      'изготовить бомбу',
      'сделать оружие',
      'изготовить оружие',
      'изготовить взрывчатку',
      'взрывчатое вещество'
    ),
    category(
      'DRUGS',
      'как сделать метамфетамин',
      'сделать метамфетамин',
      'сварить метамфетамин',
      'сделать героин',
      'сделать кокаин',
      'сделать фентанил',
      'изготовить наркотики'
    ),
    category(
      'SELF_HARM',
      'как покончить с собой',
      'как убить себя',
      'покончить с собой',
      'самоповреждение',
      'как причинить себе вред'
    ),
    category(
      'CSAM',
      'детская порнография',
      'детское порно',
      'ребёнок.*сексуальный',
      'сексуальный.*ребёнок',
      'несовершеннолетний.*сексуальный',
      'сексуальный.*несовершеннолетний',
      'педофилия',
      'лолита'
    ),
    category(
      'FRAUD',
      'кража личности',
      'подделка денег',
      'фальшивые деньги',
      'как обмануть',
      'мошенничество',
      'фишинг',
      'поддельный паспорт'
    )
  ],
  zh: [
    category(
      'WEAPONS',
      '怎么做炸弹',
      '如何制作炸弹',
      '制作炸弹',
      '制造炸弹',
      '怎么制作炸弹',
      '如何制造炸弹',
      '制作枪',
      '制造枪',
      '制造武器',
      '制作炸药',
      '炸弹教程'
    ),
    category(
      'DRUGS',
      '怎么做冰毒',
      '如何制作冰毒',
      '制作冰毒',
      '制造冰毒',
      '制作海洛因',
      '制作可卡因',
      '制作芬太尼',
      '合成毒品',
      '制毒'
    ),
    category(
      'SELF_HARM',
      '怎么自杀',
      '如何自杀',
      '自杀方法',
      '自杀方式',
      '如何自残',
      '怎么自残',
      '伤害自己'
    ),
    category(
      'CSAM',
      '儿童色情',
      '儿童色情片',
      '儿童.*色情',
      '色情.*儿童',
      '未成年.*色情',
      '色情.*未成年',
      '恋童',
      '幼女'
    ),
    category(
      'FRAUD',
      '身份盗窃',
      '伪造货币',
      '造假币',
      '假币',
      '怎么诈骗',
      '如何诈骗',
      '诈骗方法',
      '伪造身份证',
      '伪造护照',
      '钓鱼诈骗'
    )
  ],
  ja: [
    category(
      'WEAPONS',
      '爆弾の作り方',
      '爆弾を作る',
      '爆弾を作りたい',
      '爆弾を製造',
      '銃の作り方',
      '武器の作り方',
      '武器を製造',
      '爆発物の作り方'
    ),
    category(
      'DRUGS',
      'メタンフェタミンの作り方',
      'メタンフェタミンを作る',
      '覚醒剤の作り方',
      '覚醒剤を作る',
      'ヘロインを作る',
      'コカインを作る',
      'フェンタニルを作る',
      '合成麻薬'
    ),
    category(
      'SELF_HARM',
      '自殺の方法',
      '自殺の仕方',
      '自殺する方法',
      '自分を殺す方法',
      '自傷行為',
      'リストカット'
    ),
    category(
      'CSAM',
      '児童ポルノ',
      '子供.*性',
      '性.*子供',
      '未成年.*性的',
      '性的.*未成年',
      '小児性愛',
      'ロリコン',
      '児童.*性的'
    ),
    category(
      'FRAUD',
      '個人情報の盗難',
      '偽造紙幣',
      '偽札',
      '金の偽造',
      '詐欺の方法',
      '詐欺',
      '偽造身分証明書',
      'フィッシング'
    )
  ],
  ko: [
    category(
      'WEAPONS',
      '폭탄 만드는 법',
      '폭탄 만들기',
      '폭탄을 만들다',
      '총 만드는 법',
      '무기 만드는 법',
      '무기 제조',
      '폭발물 만드는 법'
    ),
    category(
      'DRUGS',
      '메스암페타민 만드는 법',
      '필로폰 만드는 법',
      '필로폰 만들기',
      '헤로인 만드는 법',
      '코카인 만드는 법',
      '펜타닐 만드는 법',
      '합성 마약'
    ),
    category(
      'SELF_HARM',
      '자살하는 방법',
      '자살 방법',
      '자살하는 법',
      '스스로 목숨을 끊는 방법',
      '자해',
      '자해하는 법'
    ),
    category(
      'CSAM',
      '아동 포르노',
      '아동.*성적',
      '성적.*아동',
      '미성년자.*성적',
      '성적.*미성년자',
      '소아성애',
      '로리콘'
    ),
    category('FRAUD', '신분 도용', '위조 지폐', '돈 위조', '사기치는 법', '사기 방법', '신분증 위조', '피싱')
  ],
  ar: [
    category(
      'WEAPONS',
      'كيف تصنع قنبلة',
      'كيف اصنع قنبلة',
      'صنع قنبلة',
      'تصنيع قنبلة',
      'كيف تصنع سلاح',
      'صنع سلاح',
      'تصنيع سلاح',
      'كيف تصنع مادة متفجرة'
    ),
    category(
      'DRUGS',
      'كيف تصنع الميثامفيتامين',
      'كيف اصنع الميثامفيتامين',
      'صنع الميثامفيتامين',
      'صنع الهيروين',
      'صنع الكوكايين',
      'صنع الفنتانيل',
      'تصنيع المخدرات'
    ),
    category(
      'SELF_HARM',
      'كيف أقتل نفسي',
      'كيف انتحر',
      'طريقة الانتحار',
      'طرق الانتحار',
      'الانتحار',
      'كيف أؤذي نفسي',
      'إيذاء النفس'
    ),
    category(
      'CSAM',
      'إباحية الأطفال',
      'بورنوغرافيا الأطفال',
      'طفل.*جنسي',
      'جنسي.*طفل',
      'قاصر.*جنسي',
      'جنسي.*قاصر',
      'بيدوفيليا',
      'لوليتا'
    ),
    category(
      'FRAUD',
      'سرقة الهوية',
      'تزوير النقود',
      'نقود مزورة',
      'تزوير العملة',
      'كيف احتال',
      'الاحتيال',
      'تزوير جواز السفر',
      'التصيد'
    )
  ],
  he: [
    category(
      'WEAPONS',
      'איך מכינים פצצה',
      'איך להכין פצצה',
      'להכין פצצה',
      'לייצר פצצה',
      'איך להכין נשק',
      'להכין נשק',
      'לייצר נשק',
      'איך מכינים נשק'
    ),
    category(
      'DRUGS',
      'איך מכינים מתאמפטמין',
      'להכין מתאמפטמין',
      'לייצר מתאמפטמין',
      'להכין הרואין',
      'להכין קוקאין',
      'להכין פנטניל'
    ),
    category(
      'SELF_HARM',
      'איך להתאבד',
      'איך להרוג את עצמי',
      'להתאבד',
      'דרכים להתאבד',
      'פגיעה עצמית',
      'איך לפגוע בעצמי'
    ),
    category(
      'CSAM',
      'פורנוגרפיית ילדים',
      'פורנוגרפיה של ילדים',
      'ילד.*מיני',
      'מיני.*ילד',
      'קטין.*מיני',
      'מיני.*קטין',
      'פדופיליה',
      'לוליטה'
    ),
    category('FRAUD', 'גניבת זהות', 'זיוף כסף', 'כסף מזויף', 'איך לרמות', 'הונאה', 'זיוף תעודה', 'פישינג')
  ],
  hi: [
    category(
      'WEAPONS',
      'बम कैसे बनाएं',
      'बम कैसे बनाये',
      'बम बनाना',
      'हथियार कैसे बनाएं',
      'हथियार बनाना',
      'विस्फोटक बनाना'
    ),
    category(
      'DRUGS',
      'मेथ कैसे बनाएं',
      'मेथामफेटामाइन कैसे बनाएं',
      'हीरोइन कैसे बनाएं',
      'कोकीन कैसे बनाएं',
      'फेंटेनिल कैसे बनाएं',
      'नशीली दवाएं बनाना'
    ),
    category(
      'SELF_HARM',
      'खुद को कैसे मारूं',
      'आत्महत्या कैसे करें',
      'आत्महत्या के तरीके',
      'खुद को नुकसान कैसे पहुंचाएं',
      'आत्म-नुकसान'
    ),
    category(
      'CSAM',
      'बाल पोर्नोग्राफी',
      'बच्चे.*यौन',
      'यौन.*बच्चे',
      'नाबालिग.*यौन',
      'यौन.*नाबालिग',
      'पेडोफिलिया',
      'लोलिता'
    ),
    category('FRAUD', 'पहचान की चोरी', 'नकली पैसे', 'पैसे की नकल', 'धोखाधड़ी कैसे करें', 'धोखाधड़ी', 'जालसाजी')
  ],
  fa: [
    category(
      'WEAPONS',
      'چطور بمب بسازم',
      'چگونه بمب بسازیم',
      'ساخت بمب',
      'چطور اسلحه بسازم',
      'ساخت اسلحه',
      'چگونه اسلحه بسازیم',
      'ساخت مواد منفجره'
    ),
    category(
      'DRUGS',
      'چطور متامفتامین بسازم',
      'ساخت متامفتامین',
      'چگونه متامفتامین بسازیم',
      'ساخت هروئین',
      'ساخت کوکائین',
      'ساخت فنتانیل',
      'ساخت مواد مخدر'
    ),
    category(
      'SELF_HARM',
      'چطور خودکشی کنم',
      'چگونه خودکشی کنم',
      'روش خودکشی',
      'خودکشی',
      'چطور به خودم آسیب بزنم',
      'آسیب به خود'
    ),
    category(
      'CSAM',
      'پورنوگرافی کودکان',
      'پورن کودکان',
      'کودک.*جنسی',
      'جنسی.*کودک',
      'صغیر.*جنسی',
      'جنسی.*صغیر',
      'پدوفیلیا',
      'لولیتا'
    ),
    category(
      'FRAUD',
      'سرقت هویت',
      'جعل اسکناس',
      'اسکناس جعلی',
      'چطور کلاهبرداری کنم',
      'کلاهبرداری',
      'جعل گذرنامه',
      'فیشینگ'
    )
  ],
  fi: [
    category(
      'WEAPONS',
      'miten teen pommin',
      'miten tehdä pommi',
      'tee pommi',
      'valmista pommi',
      'pommin valmistus',
      'miten tehdä ase',
      'tehdä ase',
      'valmista ase',
      'miten tehdään pommi'
    ),
    category(
      'DRUGS',
      'miten teen metamfetamiinia',
      'valmista metamfetamiinia',
      'keittää metamfetamiinia',
      'miten valmistaa heroiinia',
      'valmistaa heroiinia',
      'valmistaa kokaiinia',
      'valmistaa fentanyyliä',
      'huumeiden valmistus',
      'valmistaa huumeita'
    ),
    category(
      'SELF_HARM',
      'miten tapan itseni',
      'miten tehdä itsemurha',
      'itsemurha',
      'tapa itseni',
      'miten vahingoitan itseäni',
      'vahingoittaa itseään'
    ),
    category(
      'CSAM',
      'lapsiporno',
      'lapsi.*seksuaalinen',
      'seksuaalinen.*lapsi',
      'alaikäinen.*seksuaalinen',
      'seksuaalinen.*alaikäinen',
      'lasten hyväksikäyttö',
      'lolita'
    ),
    category(
      'FRAUD',
      'identiteettivarkaus',
      'miten väärennän',
      'väärentää rahaa',
      'väärennetty henkilötodistus',
      'miten huijaan',
      'huijaus',
      'korttipetos',
      'maksukortin varkaus'
    )
  ]
}

const LATIN_LANGUAGES = ['de', 'fr', 'es', 'pt', 'it', 'sv', 'da', 'nl', 'id', 'pl', 'tr', 'fi']

/** Offline script-based language hint (approximates ML Kit's on-device detection). */
export function detectLikelyLanguage(text: string): string | null {
  if (/[\u3040-\u30ff]/.test(text)) return 'ja'
  if (/[\uac00-\ud7af\u1100-\u11ff]/.test(text)) return 'ko'
  if (/[\u4e00-\u9fff]/.test(text)) return 'zh'
  if (/[\u0590-\u05ff]/.test(text)) return 'he'
  if (/[\u0900-\u097f]/.test(text)) return 'hi'
  if (/[\u0600-\u06ff]/.test(text)) return /[\u067e\u0686\u0698\u06af]/.test(text) ? 'fa' : 'ar'
  if (/[\u0400-\u04ff]/.test(text)) return 'ru'
  return null
}

export const ContentSafetyFilter = {
  /**
   * True when the model is allowed to answer `prompt`. `lang` is an optional
   * 2-char detected language code; when absent the script is sniffed and, for
   * Latin text, every Latin-script pattern set is checked (the patterns require
   * explicit generation intent, so this does not over-block ordinary language
   * learning).
   */
  check(prompt: string, lang?: string | null): SafetyVerdict {
    const trimmed = prompt.trim()
    if (trimmed === '') return { allowed: true }
    const lower = trimmed.toLowerCase()

    let sets: Category[][]
    const explicit = lang ? BY_LANGUAGE[lang] : undefined
    if (explicit) {
      sets = [explicit]
    } else {
      const guessed = detectLikelyLanguage(trimmed)
      const guessedSet = guessed ? BY_LANGUAGE[guessed] : undefined
      sets = guessedSet
        ? [guessedSet]
        : [ENGLISH_CATEGORIES, ...LATIN_LANGUAGES.map((code) => BY_LANGUAGE[code])]
    }

    for (const set of sets) {
      for (const [label, pattern] of set) {
        if (pattern.test(lower)) return { allowed: false, category: label }
      }
    }
    return { allowed: true }
  }
}

export class SafetyBlockedError extends Error {
  readonly category: string
  constructor(category: string) {
    super(`Prompt blocked by content safety filter (${category})`)
    this.name = 'SafetyBlockedError'
    this.category = category
  }
}
