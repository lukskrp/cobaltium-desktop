import { readFileSync, writeFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const beforeSupp = content.substring(0, suppStart)
let suppContent = content.substring(suppStart)

const replacements = {
  "'tour.modes.conversation.body'": "Freier Chat. Stellen Sie Fragen zu Wörtern, Grammatik und Verwendung in jeder Sprache.",
  "'tour.modes.corrective.body'": "Sie schreiben in der Sprache, die Sie lernen. Der Assistent überprüft Ihre Sätze, erklärt Fehler und zeigt die korrigierte Version.",
  "'tour.modes.immersive.body'": "Sie schreiben in Ihrer Muttersprache. Ihre Wörter werden in die Zielsprache übersetzt und der Assistent antwortet nur in dieser Sprache.",
  "'tour.modes.reflective.body'": "Senden Sie eine Nachricht in Ihrer Muttersprache; eine Klarte zeigt die Übersetzung, damit Sie reflektieren können, wie sie in der Zielsprache klingt.",
  "'tour.lang.helper.body'": "Das ist die Sprache, die Sie bereits kennen — die Erklärungen, Korrekturen und Glossen des Trainers erscheinen darin. Wählen Sie die, mit der Sie sich am wohlfühlen.",
  "'tour.lang.learn.body'": "Das ist die Sprache, die Sie lernen möchten. Alles, woran Sie korrigiert werden oder worüber Sie reflektieren, erscheint hier und hilft Ihnen, darin zu denken.",
  "'tour.lang.flip.body'": "Tippen Sie hier, um Ihre Hilfs- und Lernsprachen sofort zu tauschen — praktisch, wenn Sie aus der anderen Richtung wiederholen.",
  "'tour.tool.glossary.title'": "Wörterglossar",
  "'tour.tool.glossary.body'": "Schalten Sie dieses Werkzeug ein und tippen Sie auf ein beliebiges Wort, um seine Bedeutung und Grammatik zu sehen — Mehrdeutigkeit, Konjugation und mehr.",
  "'tour.tool.select.body'": "Tippen Sie hier, um mehrere Wörter gleichzeitig auszuwählen, um gemeinsam darauf zu handeln, z. B. einen Ausdruck zu speichern.",
  "'tour.tool.save.body'": "Speichert die ausgewählten Wörter oder den Ausdruck in Ihrem Lexikon für Karteikarten und Grammatiknachschlage.",
  "'tour.tool.granular.body'": "Tippen Sie hier und dann auf ein einzelnes Wort, um nur dieses Wort zu speichern – es muss nicht zuvor ausgewählt werden.",
  "'tour.tool.speak.title'": "Vorlesen",
  "'tour.tool.speak.body'": "Spielt den ausgewählten Text laut ab, damit Sie hören können, wie er klingt.",
  "'tour.tts.body'": "Wenn Audio für ein Sprachpaar nicht verfügbar ist, geht die Stimme über die Text-to-Speech Ihres Betriebssystems. Installieren Sie das Sprachpaket für diese Sprache in Ihren OS-Einstellungen – es wird nach einem Neustart geladen.",
  "'tour.llm.intro.body'": "Die Einstellungsseite enthält die Modelloptionen. Für Anfänger ist die Cloud-Option am einfachsten – kein großer Download, Sie fügen nur einen Schlüssel hinzu. Wir gehen jeden Schritt durch.",
  "'tour.llm.apikey.body'": "Fügen Sie den Schlüssel hier ein. Er wird verschlüsselt gespeichert und maskiert angezeigt, sodass Ihr Schlüssel privat bleibt.",
  "'tour.llm.baseurl.body'": "Normalerweise vom gewählten Anbieter vorausgefüllt. Lassen Sie es unverändert, es sei denn, Sie verwenden einen benutzerdefinierten Endpunkt.",
  "'tour.llm.model.body'": "Welches Modell zu verwenden. Ein empfohlener Standard ist vorausgefüllt – Sie können es beibehalten.",
  "'tour.llm.maxtokens.body'": "Wie lange der Trainer antworten darf. Der Standard ist für die meisten Lektionen in Ordnung.",
  "'tour.llm.temperature.body'": "Steuert, wie kreativ versus präzise der Trainer ist. Belassen Sie den Standard, es sei denn, Sie wissen, was Sie ändern.",
  "'tour.llm.enable.title'": "Aktivieren",
  "'tour.llm.enable.body'": "Schalten Sie schließlich 'LLM aktivieren' ein, um mit Ihrem Trainer zu chatten.",
  "'tour.llm.done.body'": "Das war die KI-Einrichtung. Sie können diese Optionen jederzeit über Einstellungen wieder aufrufen. Jetzt schauen wir uns Ihre Sitzungen an.",
  "'tour.sessions.body'": "Diese Seitenleiste listet jede Conversation auf, die Sie geführt haben. Öffnen Sie eine hier, um dorthin zurückzukehren, markieren Sie Ihre Lieblinge mit einem Stern und benennen Sie sie um oder löschen Sie sie.",
  "'tour.drawers.done.body'": "Sie haben das Chat-Fenster durchlaufen. Als Nächstes führt Sie die Tour durch Wiederholung, Reader, Szenarien und Lexikon.",
  "'tour.ext.intro.body'": "Cobaltium übersetzt mit einem eingebauten Motor und funktioniert offline. Wenn Sie stattdessen eine höherwertige Webübersetzung wünschen, können Sie hier Ihren eigenen DeepL- oder Google Translate API-Schlüssel verbinden.",
  "'tour.ext.deepl.body'": "Fügen Sie hier Ihren DeepL-API-Schlüssel ein. Wählen Sie Kostenlos oder Pro, um zu Ihrem DeepL-Konto zu passen – beide verwenden verschiedene Endpunkte. Schlüssel werden verschlüsselt auf Ihrem Gerät gespeichert.",
  "'tour.ext.picker.title'": "Wählen Sie Ihren Anbieter",
  "'tour.ext.picker.body'": "Dieses Menü wählt, welcher externe Motor aktiv ist. DeepL und Google schließen sich aus – nur einer kann gleichzeitig verwendet werden.",
  "'tour.ext.toggle.title'": "Damit übersetzen",
  "'tour.ext.toggle.body'": "Aktivieren Sie schnelle Übersetzung und Cobaltium sendet Übersetzungen an einen externen Motor anstelle des eingebauten. Es schaltet sich nur ein, sobald ein Schlüssel gespeichert ist.",
  "'tour.ext.done.body'": "Kein Schlüssel? Kein Problem. Ohne einen verwenden Übersetzungen weiterhin den eingebauten Motor – externe Motoren sind eine reine Wahl, die Sie jederzeit treffen können.",
  "'tour.themes.button.body'": "Diese Farbmalflecke-Schaltfläche öffnet Ihr Themenmenü – wo Sie Cobaltiums Aussehen wählen: Hell, Dunkel, System oder eine thematische Palette wie Kohle, Tiefschwarz, Blüte oder Natur.",
  "'tour.themes.menu.body'": "Es hat sich gerade für Sie geöffnet. Jedes Thema zeigt eine Live-Vorschau – klicken Sie eines an, um es sofort anzuwenden. Wenn Sie fertig sind, schließen Sie es, um die Tour fortzusetzen.",
  "'tour.themes.done.body'": "Sie haben jetzt alles im Chat-Fenster gesehen. Als Nächstes: Schauen wir uns die Wiederholung an!",
  "'tour.srs.intro.body'": "Das ist Ihr Verteilungs-Wiederholungs-Trainer. Die Wörter und Ausdrücke, die Sie speichern, werden zu Karteikarten, die zur Wiederholung erscheinen, kurz bevor Sie sie vergessen würden.",
  "'tour.srs.page.title'": "Ihre Kartenstapel",
  "'tour.srs.page.body'": "Jeder Stapel ist ein Satz Karteikarten. Die farbigten Zahlen zeigen Ihren Fortschritt: Blau ist neu, Gelb ist Lernen, Rot muss wiederholt werden, Grün ist gut bekannt.",
  "'tour.srs.flip.title'": "Umdrehen und bewerten",
  "'tour.srs.flip.body'": "Tippen Sie auf 'Aufdecken', um eine Karte umzudrehen und ihre Bedeutung zu sehen, sagen Sie sie laut aus, und bewerten Sie dann sich selbst: Wieder, Gut oder Einfach. Karten werden neu geplant, basierend darauf, wie gut Sie sie kennen.",
  "'tour.srs.drawer.title'": "Einen Stapel aufbauen",
  "'tour.srs.drawer.body'": "Diese Seitenleiste ist, wie Sie Stapel aufbauen. Wählen Sie die gespeicherten Wörter und Ausdrücke aus, die Sie möchten, und fügen Sie sie einem Stapel hinzu – erstellen Sie zuerst einen, wenn Sie keinen haben.",
  "'tour.srs.done.body'": "Das ist Wiederholung – Karten aus Ihren gespeicherten Wörtern, die direkt vor dem Vergessen wiederholt werden. Als Nächstes: Der Reader.",
  "'tour.reader.intro.body'": "Lesen Sie EPUB-Bücher mit einem Tippen-zum-Übersetzen-Gloss auf jedem Wort – großartig für Lesepraxis in der Sprache, die Sie lernen.",
  "'tour.reader.topbar.body'": "Verwenden Sie Öffnen, um ein EPUB zu laden, die Sprache des Buches und Ihre Zielsprache einzustellen und zwischen Lese- und Bearbeitungsmodi zu wechseln.",
  "'tour.reader.gloss.body'": "Tippen Sie auf ein Wort, um seine Übersetzung und Grammatik direkt im Kontext zu sehen. Wählen Sie Text, um ihn anzuhören oder zu Ihren Wörtern zu speichern.",
  "'tour.reader.tools.title'": "Reader-Werkzeuge",
  "'tour.reader.tools.body'": "Diese Schaltflächen sprechen, speichern oder transliterieren den von Ihnen ausgewählten Text – genau wie die Werkzeuge im Chat-Fenster.",
  "'tour.reader.lock.body'": "Verwenden Sie die Kapitelzeile, um zwischen Kapiteln zu wechseln, und glossieren Sie das gesamte Kapitel auf einmal für vollständige Übersetzungen.",
  "'tour.reader.done.body'": "Das war der Reader. Als Nächstes: Szenarien.",
  "'tour.scenarios.intro.body'": "Szenarien versetzt Sie in echte Situationen – Bestellen in einem Café, einen Arzt besuchen, einen Flug buchen und mehr. Jedes ist eine Minilektion mit Wortschatz, Ausdrücken und Dialogen.",
  "'tour.scenarios.grid.title'": "Szenariokarten",
  "'tour.scenarios.grid.body'": "Durchsuchen Sie die Karten und tippen Sie auf eine, um zu starten. Jede Karte zeigt den Szenariotitel, eine kurze Beschreibung und ihre Kategorie.",
  "'tour.scenarios.filter.title'": "Kategoriefilter",
  "'tour.scenarios.filter.body'": "Verwenden Sie die Kategorienliste, um nach Thema zu filtern – Zuhause, Geschäft, Fitness, Medizinisch, Reisen und mehr.",
  "'tour.scenarios.card.title'": "Innerhalb eines Szenarios",
  "'tour.scenarios.card.body'": "Innerhalb eines Szenarios erhalten Sie drei Abschnitte: Vokabeln (Wörter mit Übersetzungen und Beispielen), Ausdrücke (nützliche Redewendungen) und Dialoge (Beispielgespräche zwischen zwei Sprechern).",
  "'tour.scenarios.done.body'": "Das waren Szenarien. Die letzte Station ist Lexikon und LangDex.",
  "'tour.lex.intro.body'": "Jedes Wort und jeder Ausdruck, den Sie im Chat oder Reader speichern, landet hier. Tippen Sie auf eines, um seine Bedeutung, Grammatik und mehr zu sehen – oder suchen Sie jedes Wort mit LangDex nach.",
  "'tour.lex.page.body'": "Verwenden Sie den Filter, um jeweils eine Sprache anzuzeigen. Tippen Sie auf ein Wort, um seine Details zu öffnen, oder verwenden Sie Konjugieren / Deklinieren auf einem Wort, um seine vollständige Beugung in LangDex zu sehen.",
  "'tour.langdex.open.body'": "LangDex sucht die vollständige Beugung jedes Wortes nach – Konjugation, Deklination und mehr – sogar Wörter, die Sie nicht gespeichert haben.",
  "'tour.langdex.search.body'": "Geben Sie ein Wort ein und tippen Sie auf Nachschlagen, um seine vollständige Konjugation oder Deklination zu sehen. Für tonale Sprachen wie Chinesisch deckt LangDex auch Töne, Aspekte und Zählwörter ab.",
  "'tour.langdex.done.title'": "Sie sind bereit",
  "'tour.langdex.done.body'": "Sie haben jetzt jedes Fenster in Cobaltium gesehen – Chat, Wiederholung, Reader, Szenarien und Lexikon. Viel Spaß beim Lernen!",
  "'tour.safety.body'": "Cobaltium ist eine Sprachenlern-App. Der Assistent wird keine schädlichen Inhalte generieren, und Sie können alles Unangemessene mit der Berichtsschaltfläche melden.",
  "'tour.safety.bullet1'": "Cobaltium wird keine schädlichen Inhalte generieren, egal wie Sie fragen.",
  "'tour.safety.bullet2'": "Etwas Unangemessenes gefunden? Verwenden Sie die Berichtsschaltfläche im Chat, Reader oder Lexikon, um es an unser Support-Team zu senden.",
  "'tour.skipConfirmTitle'": "Den Rest der Tour überspringen?",
  "'tour.skipConfirmBody'": "Sie können es jederzeit über Einstellungen wieder öffnen.",
  "'tour.replay'": "Tour starten",
  "'tour.chat.body'": "Hier chatten Sie mit Ihrem persönlichen Sprachtrainer. Von hier aus erreichen Sie auch Ihre Sitzungen und Ihre KI-Einstellungen. Tippen Sie irgendwo auf den Bildschirm, um durch die Tour zu navigieren.",
  "'tour.done.body'": "Öffnen Sie diese Tour jederzeit über Einstellungen erneut.",
}

// Process line by line
const lines = suppContent.split('\n')
let updated = 0
let fixed = 0

for (let i = 0; i < lines.length; i++) {
  let line = lines[i]
  
  // First, fix any merged entries (lines where we have 'key1': { ... }'key2': { ...)
  // Pattern: de: 'value' immediately followed by 'key2' (no closing quote)
  // These were caused by previous bad regex replacements
  const mergedPattern = /de:\s*'([^']*?)'(\s*['"]?\w+\.)\s*['"]?[a-zA-Z]/g
  if (mergedPattern.test(line)) {
    // Need to re-apply the fix - but first restore proper structure
    // Find all de: '...' patterns and ensure they have proper closing
    const fixedLine = line.replace(/de:\s*'([^']*)'(\s*[a-zA-Z])/g, (match, val, after) => {
      if (after.trim().startsWith("'")) {
        // Missing closing quote - add it back
        fixed++
        return `de: '${val}', ${after}`
      }
      return match
    })
    if (fixedLine !== line) {
      line = fixedLine
      console.log(`Fixed merged line ${i}`)
    }
  }
  
  // Now do the actual replacements
  for (const [key, value] of Object.entries(replacements)) {
    const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
    // Match de: 'value' where value is followed by ', } or } (entry boundary)
    // Use [^'] to match content, and ensure we don't cross entry boundaries
    const regex = new RegExp(`(${escapedKey}[^{]*?de:\\s*')([^']*?)'([},])`, 'g')
    if (regex.test(line)) {
      line = line.replace(regex, `$1${value}'$3`)
      updated++
    }
  }
  
  lines[i] = line
}

suppContent = lines.join('\n')
content = beforeSupp + suppContent
writeFileSync(filePath, content, 'utf8')
console.log(`\nTotal entries updated: ${updated}`)
console.log(`Lines with merged entries fixed: ${fixed}`)
