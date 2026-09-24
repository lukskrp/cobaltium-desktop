import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Print all keys present in SUPPLEMENTAL
const keys = []
for (let i = 0; i < lines.length; i++) {
  const keyMatch = lines[i].match(/^(\s*')(\w[\w.]*)(\w[\w.]*')/)
  if (keyMatch && !lines[i].trim().startsWith('//')) {
    // Extract the full key
    const fullKeyMatch = lines[i].match(/'([^']+)'\s*:/)
    if (fullKeyMatch) {
      keys.push(fullKeyMatch[1])
    }
  }
}

console.log('Keys found:', keys.length)
console.log('---')
for (const k of keys) {
  console.log(k)
}
