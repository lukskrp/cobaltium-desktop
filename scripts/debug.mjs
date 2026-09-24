import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
let suppContent = content.substring(suppStart)

const lines = suppContent.split('\n')

// Test against first few lines of SUPPLEMENTAL
for (let i = 0; i < 5; i++) {
  console.log(`Line ${i}:`, lines[i].substring(0, 120))
  const key = "'tour.modes.conversation.body'"
  const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
  const regex = new RegExp(`^(${escapedKey}:\\s*\\{[^']*de:\\s*)'(.*?)'(\\s*[},])`)
  const m = lines[i].match(regex)
  console.log(`  Match:`, m ? m[0] : 'NO MATCH')
}
