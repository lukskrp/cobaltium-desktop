import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

// Extract all keys from SUPPLEMENTAL block
const suppMatch = content.match(/const SUPPLEMENTAL = \{([\s\S]*?)\n\}/)
if (!suppMatch) {
  console.log('No SUPPLEMENTAL block found')
  process.exit(1)
}

const suppContent = suppMatch[1]

// Find all keys
const keyRegex = /'([^']+)'(?:\s*:\s*\{|,)/g
let match
const existingKeys = new Set()

while ((match = keyRegex.exec(suppContent)) !== null) {
  existingKeys.add(match[1])
}

console.log('Keys in SUPPLEMENTAL:')
for (const key of existingKeys) {
  console.log('  ' + key)
}

console.log(`\nTotal: ${existingKeys.size} keys`)
