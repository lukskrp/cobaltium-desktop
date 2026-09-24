import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
let suppContent = content.substring(suppStart)
const lines = suppContent.split('\n')

// Print first 20 lines with their indices
for (let i = 0; i < Math.min(20, lines.length); i++) {
  console.log(`\n[${i}] ${lines[i]}`)
}

// Now try matching against each line individually
console.log('\n--- Testing matches ---')
const testEntries = [
  "'tour.modes.conversation.body'",
  "'tour.modes.corrective.body'", 
  "'tour.tool.glossary.body'",
  "'tour.lang.flip.body'",
]

for (const line of lines) {
  for (const key of testEntries) {
    if (line.includes(key)) {
      const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
      // Pattern handles both {de: and {other: '...', de: ...
      const regex1 = new RegExp(`${escapedKey}:\\s*\\{[^']*(?:'[^']*'[^']*)*de:\\s*'([^']*)'`)
      const m1 = line.match(regex1)
      if (m1) {
        console.log(`MATCH ${key}: '${m1[1]}'`)
      }
      
      // Simpler pattern: find de: 'value' after the key
      const regex2 = new RegExp(`${escapedKey}:.*?de:\\s*'([^']*)'`)
      const m2 = line.match(regex2)
      if (m2) {
        console.log(`MATCH2 ${key}: '${m2[1]}'`)
      }
    }
  }
}
