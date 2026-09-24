import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Print line numbers and first 60 chars of each line
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim()
  if (trimmed && !trimmed.startsWith('//') && trimmed !== '}') {
    // Check if it contains a key definition
    if (trimmed.includes(': {')) {
      const keyMatch = trimmed.match(/'([^']+)'/)
      const key = keyMatch ? keyMatch[1] : ''
      console.log(`[${i}] ${key}`)
    } else {
      console.log(`[${i}] ${trimmed.substring(0, 60)}`)
    }
  }
}
