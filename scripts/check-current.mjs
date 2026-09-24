import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

// Check the current state of various entries that should have been updated
const checks = [
  "'tour.modes.conversation.body'",
  "'tour.modes.corrective.body'",
  "'tour.tool.glossary.body'",
  "'tour.llm.intro.body'",
  "'tour.ext.done.body'",
  "'tour.srs.flip.body'",
  "'tour.chat.body'",
  "'tour.done.body'",
]

// Find all occurrences of each key in the file
for (const key of checks) {
  const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
  const regex = new RegExp(`${escapedKey}.*?(de:\\s*')([^']*)'`, 'g')
  let match
  let found = false
  while ((match = regex.exec(content)) !== null) {
    if (!found) {
      console.log(`\n${key}:`)
      found = true
    }
    console.log(`  de: '${match[2]}'`)
  }
  if (!found) console.log(`\n${key}: NOT FOUND`)
}
