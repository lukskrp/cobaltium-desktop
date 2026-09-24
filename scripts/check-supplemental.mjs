import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

// Find SUPPLEMENTAL block and extract only the keys (not values)
const suppMatch = content.match(/const SUPPLEMENTAL = \{([\s\S]*?)\n\}/)
if (!suppMatch) {
  console.log('No SUPPLEMENTAL block found')
  process.exit(1)
}

const suppContent = suppMatch[1]

// Match only lines that start with a key definition
const keyRegex = /^(\s*)'([^']+)'(?:\s*:\s*\{|,)/gm
let match
const existingKeys = new Set()

while ((match = keyRegex.exec(suppContent)) !== null) {
  existingKeys.add(match[2])
}

console.log('Keys in SUPPLEMENTAL:')
for (const key of existingKeys) {
  console.log('  ' + key)
}

console.log(`\nTotal: ${existingKeys.size} keys`)

// Check for entries that should have German but don't
const expectedKeys = [
  'tour.modes.conversation.title',
  'tour.modes.conversation.body',
  'tour.modes.corrective.title',
  'tour.modes.corrective.body',
  'tour.modes.immersive.title',
  'tour.modes.immersive.body',
  'tour.modes.reflective.title',
  'tour.modes.reflective.body',
  'tour.lang.helper.title',
  'tour.lang.helper.body',
  'tour.lang.learn.title',
  'tour.lang.learn.body',
  'tour.lang.flip.title',
  'tour.lang.flip.body',
  'tour.tool.glossary.title',
  'tour.tool.glossary.body',
  'tour.tool.select.title',
  'tour.tool.select.body',
  'tour.tool.save.title',
  'tour.tool.save.body',
  'tour.tool.granular.title',
  'tour.tool.granular.body',
  'tour.tool.speak.title',
  'tour.tool.speak.body',
  'tour.tts.body',
  'tour.llm.intro.body',
  'tour.llm.apikey.body',
  'tour.llm.baseurl.body',
  'tour.llm.model.body',
  'tour.llm.maxtokens.body',
  'tour.llm.temperature.body',
  'tour.llm.enable.title',
  'tour.llm.enable.body',
  'tour.llm.done.body',
  'tour.sessions.body',
  'tour.drawers.done.body',
  'tour.reader.intro.title',
  'tour.reader.intro.body',
  'tour.reader.topbar.body',
  'tour.reader.gloss.body',
  'tour.reader.tools.body',
  'tour.reader.lock.body',
  'tour.reader.done.title',
  'tour.reader.done.body',
  'tour.scenarios.intro.title',
  'tour.scenarios.intro.body',
  'tour.scenarios.grid.title',
  'tour.scenarios.grid.body',
  'tour.scenarios.filter.title',
  'tour.scenarios.filter.body',
  'tour.scenarios.card.title',
  'tour.scenarios.card.body',
  'tour.scenarios.done.title',
  'tour.scenarios.done.body',
  'tour.lex.intro.title',
  'tour.lex.intro.body',
  'tour.lex.page.title',
  'tour.lex.page.body',
  'tour.langdex.open.title',
  'tour.langdex.open.body',
  'tour.langdex.search.body',
  'tour.langdex.done.body',
  'tour.safety.title',
  'tour.safety.body',
  'tour.safety.bullet1',
  'tour.safety.bullet2',
  'tour.skipConfirmTitle',
  'tour.skipConfirmBody',
  'tour.replay',
  'tour.chat.body',
  'tour.done.body',
  'tour.next',
  'tour.done',
  'tour.skip',
  'tour.chat.title',
  'tour.scenarios.body',
  'tour.ext.intro.title',
  'tour.ext.intro.body',
  'tour.ext.deepl.title',
  'tour.ext.deepl.body',
  'tour.ext.google.title',
  'tour.ext.google.body',
  'tour.ext.picker.title',
  'tour.ext.picker.body',
  'tour.ext.toggle.title',
  'tour.ext.toggle.body',
  'tour.ext.done.title',
  'tour.ext.done.body',
  'tour.themes.button.title',
  'tour.themes.button.body',
  'tour.themes.menu.title',
  'tour.themes.menu.body',
  'tour.themes.done.title',
  'tour.themes.done.body',
  'tour.srs.intro.title',
  'tour.srs.intro.body',
  'tour.srs.page.title',
  'tour.srs.page.body',
  'tour.srs.flip.title',
  'tour.srs.flip.body',
  'tour.srs.drawer.title',
  'tour.srs.drawer.body',
  'tour.srs.done.title',
  'tour.srs.done.body',
]

const missing = []
for (const key of expectedKeys) {
  if (!existingKeys.has(key)) {
    missing.push(key)
  }
}

if (missing.length > 0) {
  console.log('\nMissing from SUPPLEMENTAL:')
  for (const key of missing) {
    console.log('  - ' + key)
  }
} else {
  console.log('\nAll expected keys are present in SUPPLEMENTAL.')
}
