import { readFileSync } from 'node:fs'

const f = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
const c = readFileSync(f, 'utf8')

// Keys that might not have been updated - check the current de value
const checks = [
  'tour.tool.glossary.body',
  'tour.lang.flip.body',
  'tour.ext.done.body',
  'tour.tool.select.body',
  'tour.tool.save.body',
  'tour.tool.granular.body',
  'tour.tool.speak.body',
  'tour.tts.body',
  'tour.llm.intro.body',
  'tour.llm.apikey.body',
  'tour.llm.baseurl.body',
  'tour.llm.model.body',
  'tour.llm.maxtokens.body',
  'tour.llm.temperature.body',
  'tour.llm.enable.body',
  'tour.llm.done.body',
  'tour.sessions.body',
  'tour.drawers.done.body',
  'tour.ext.intro.body',
  'tour.ext.deepl.body',
  'tour.ext.picker.title',
  'tour.ext.picker.body',
  'tour.ext.toggle.title',
  'tour.ext.toggle.body',
  'tour.ext.done.body',
  'tour.themes.button.body',
  'tour.themes.menu.body',
  'tour.themes.done.body',
  'tour.srs.intro.body',
  'tour.srs.page.body',
  'tour.srs.flip.body',
  'tour.srs.drawer.body',
  'tour.srs.done.body',
  'tour.reader.intro.body',
  'tour.reader.topbar.body',
  'tour.reader.gloss.body',
  'tour.reader.tools.body',
  'tour.reader.lock.body',
  'tour.reader.done.body',
  'tour.scenarios.intro.body',
  'tour.scenarios.grid.body',
  'tour.scenarios.card.body',
  'tour.scenarios.done.body',
  'tour.lex.intro.body',
  'tour.lex.page.body',
  'tour.langdex.open.body',
  'tour.langdex.search.body',
  'tour.langdex.done.body',
  'tour.safety.body',
  'tour.safety.bullet2',
  'tour.skipConfirmBody',
  'tour.chat.body',
  'tour.done.body',
]

for (const key of checks) {
  const regex = new RegExp(key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&') + '\\s*:\\s*\\{[^}]*de:\\s*\'(.*?)\'')
  const m = c.match(regex)
  if (m) {
    console.log(key + ':', m[1].substring(0, 80))
  } else {
    console.log(key + ': NOT FOUND in file')
  }
}
