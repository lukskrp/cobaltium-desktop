import { readFileSync, writeFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

// Find the end of SUPPLEMENTAL block
const suppEnd = content.lastIndexOf('}')
if (suppEnd === -1) {
  console.log('Could not find end of SUPPLEMENTAL block')
  process.exit(1)
}

// Entries to add (missing from SUPPLEMENTAL)
const entriesToAdd = [
  `  'tour.scenarios.done.title': { da: 'Scenarier færdig', de: 'Szenarien fertig', en: 'Scenarios done' },`,
  `  'tour.lex.page.body': { da: 'Brug filteret til at vise et sprog ad gangen. Tryk på et ord for at åbne sine detaljer, eller brug Konjugér / Deklinér på et ord for at se sin fuld bøjning i LangDex.', de: 'Verwenden Sie den Filter, um jeweils eine Sprache anzuzeigen. Tippen Sie auf ein Wort, um seine Details zu öffnen, oder verwenden Sie Konjugieren / Deklinieren auf einem Wort, um seine vollständige Beugung in LangDex zu sehen.', en: 'Use the filter to show one language at a time. Tap a word to open its details, or use Conjugate / Decline on a word to see its full inflection in LangDex.' },`,
  `  'tour.langdex.open.title': { da: 'LangDex', de: 'LangDex', en: 'LangDex' },`,
  `  'tour.langdex.open.body': { da: "LangDex leder efter den fuld bøjning af hvert ord -- konjugation, deklination og mere -- selv ord du ikke har gemt.", de: "LangDex sucht die vollständige Beugung jedes Wortes nach -- Konjugation, Deklination und mehr -- sogar Wörter, die Sie nicht gespeichert haben.", en: "LangDex looks up the full inflection of every word -- conjugation, declension, and more -- even words you haven't saved." },`,
  `  'tour.langdex.search.body': { da: 'Skriv et ord og tryk på Slå op for at se sin fuld konjugation eller deklination. For tonale sprog som kinesisk dækker LangDex også toner, aspekter og tællemåder.', de: 'Geben Sie ein Wort ein und tippen Sie auf Nachschlagen, um seine vollständige Konjugation oder Deklination zu sehen. Für tonale Sprachen wie Chinesisch deckt LangDex auch Töne, Aspekte und Zählwörter ab.', en: 'Type a word and tap Look up to see its full conjugation or declension. For tonal languages like Chinese, LangDex also covers tones, aspect and measure words.' },`,
  `  'tour.langdex.done.body': { da: 'Du har nu hvert vindue set i Cobaltium -- Chat, Gentagelse, Læser, Scenarier og Lexikon. God fornøjelse med at lære!', de: 'Sie haben jetzt jedes Fenster in Cobaltium gesehen -- Chat, Wiederholung, Reader, Szenarien und Lexikon. Viel Spaß beim Lernen!', en: "You've now seen every window in Cobaltium — Chat, Review, Reader, Scenarios and Lexicon. Happy learning!" },`,
  `  'tour.safety.title': { da: 'Din sikkerhed', de: 'Ihre Sicherheit', en: 'Your safety' },`,
  `  'tour.safety.body': { da: 'Cobaltium er en sprog-læringsapp. Assistenten vil ikke generere skadeligt indhold, og du kan rapportere alt upassende med rapport-knappen.', de: 'Cobaltium ist eine Sprachenlern-App. Der Assistent wird keine schädlichen Inhalte generieren, und Sie können alles Unangemessene mit der Berichtsschaltfläche melden.', en: 'Cobaltium is a language-learning app. The assistant will not generate harmful content, and you can report anything inappropriate with the report button.' },`,
  `  'tour.safety.bullet1': { da: 'Cobaltium vil ikke generere skadeligt indhold, uanset hvordan du spørger.', de: 'Cobaltium wird keine schädlichen Inhalte generieren, egal wie Sie fragen.', en: 'Cobaltium will not generate harmful content, no matter how you ask.' },`,
  `  'tour.safety.bullet2': { da: 'Fundt noget upassende? Brug rapport-knappen i chat, læser eller lexikon for at sende det til vores support-team.', de: 'Etwas Unangemessenes gefunden? Verwenden Sie die Berichtsschaltfläche im Chat, Reader oder Lexikon, um es an unser Support-Team zu senden.', en: 'Found something inappropriate? Use the report button in the chat, reader, or Lexicon to send it to our support team.' },`,
  `  'tour.skipConfirmTitle': { da: 'Spring resten af Tours over?', de: 'Den Rest der Tour überspringen?', en: 'Skip the rest of the tour?' },`,
  `  'tour.skipConfirmBody': { da: 'Du kan åbne det igen når som helst via Indstillinger.', de: 'Sie können es jederzeit über Einstellungen wieder öffnen.', en: 'You can reopen it any time from Settings.' },`,
  `  'tour.replay': { da: 'Start tur', de: 'Tour starten', en: 'Start tour' },`,
  `  'tour.chat.body': { da: 'Her chatter du med din personlige sprogtutor.', de: 'Hier chatten Sie mit Ihrem persönlichen Sprachtrainer.', en: 'This is where you chat with your personal language tutor.' },`,
  `  'tour.done.body': { da: 'Genåbn denne tur når som helst via Indstillinger.', de: 'Öffnen Sie diese Tour jederzeit über Einstellungen erneut.', en: 'Reopen this tour any time from Settings.' },`,
  `  'tour.ext.google.title': { da: 'Google Translate', de: 'Google Übersetzer', en: 'Google Translate' },`,
  `  'tour.ext.google.body': { da: 'Indsæt en Google Cloud Translate API-nøgle her. I modsætning til DeepL dækker Google Translate hvert sprog, Cobaltium understøtter.', de: 'Fügen Sie hier einen Google Cloud Translation API-Schlüssel ein. Im Gegensatz zu DeepL deckt Google Translate jede Sprache ab, die Cobaltium unterstützt.', en: 'Paste a Google Cloud Translation API key here. Unlike DeepL, Google Translate covers every language Cobaltium supports.' },`,
  `  'tour.srs.page.title': { da: 'Dine stabe', de: 'Ihre Stapel', en: 'Your decks' },`,
  `  'tour.srs.flip.title': { da: 'Vend og bedøm', de: 'Umdrehen und bewerten', en: 'Flip and grade' },`,
]

// Insert entries before the closing brace of SUPPLEMENTAL
const insertBefore = suppEnd
const toInsert = entriesToAdd.join('\n')

content = content.substring(0, insertBefore) + '\n' + toInsert + content.substring(insertBefore)
writeFileSync(filePath, content, 'utf8')

console.log('Added entries to SUPPLEMENTAL block.')
console.log(`Inserted ${entriesToAdd.length} entries.`)
