import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Check the inserted entries (should be around lines 3-38)
for (let i = 1; i <= 40; i++) {
  if (lines[i]) {
    console.log(`[${i}] ${lines[i].substring(0, 120)}`)
  }
}
