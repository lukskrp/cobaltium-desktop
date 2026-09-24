import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Check lines 4-10 (previously corrupted)
for (let i = 4; i <= 10; i++) {
  console.log(`\n[${i}] ${lines[i]}`)
}

// Test if the translation regex matches
const key = "'tour.scenarios.grid.title'"
const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
const regex = new RegExp(`(${escapedKey}[^{]*de:\\s*')([^']*?)'([},])`, 'g')

console.log(`\nTesting key: ${key}`)
console.log(`Regex: ${regex}`)

for (let i = 4; i <= 10; i++) {
  const match = lines[i].match(regex)
  if (match) {
    console.log(`Line ${i} MATCHES: '${match[2]}'`)
  }
}
