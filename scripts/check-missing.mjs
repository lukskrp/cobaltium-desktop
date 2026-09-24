import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const checks = [
  "'tour.ext.intro.body'",
  "'tour.ext.deepl.body'",
  "'tour.themes.button.body'",
  "'tour.srs.intro.body'",
  "'tour.reader.intro.body'",
  "'tour.lex.intro.body'",
  "'tour.langdex.open.body'",
  "'tour.safety.body'",
  "'tour.chat.body'",
  "'tour.done.body'",
]

for (const key of checks) {
  const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
  const regex = new RegExp(`${escapedKey}.*?(de:\\s*')`, 'g')
  const match = content.match(regex)
  console.log(`${key}: ${match ? 'FOUND' : 'NOT FOUND'}`)
}
