import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Check lines around index 4-10 in detail  
for (let i = 4; i <= 10; i++) {
  console.log(`\n=== Line ${i} ===`)
  console.log(lines[i])
}
