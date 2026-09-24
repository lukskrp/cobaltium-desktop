import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
let suppContent = content.substring(suppStart)

// Test against first few lines of SUPPLEMENTAL
const lines = suppContent.split('\n')

for (let i = 1; i < 6; i++) {
  console.log(`\nLine ${i}:`, lines[i].substring(0, 100))
  
  const testKey = ["'tour.modes.conversation.body'", "'tour.modes.corrective.body'", "'tour.modes.immersive.body'", "'tour.modes.reflective.body'", "'tour.lang.helper.body'"]
  if (i - 1 < testKey.length) {
    const key = testKey[i - 1]
    const escapedKey = key.replace(/[.*+?^=(){}|[\]$]/g, '\\$&')
    const regex = new RegExp(`(${escapedKey}:\\s*\\{(?:\\s*\\w+:\\s*'(?:[^'\\\\]|\\\\.)*'\\s*,?)*\\s*de:\\s*)'(.*?)'(\\s*[},])`, 'g')
    const m = lines[i].match(regex)
    console.log(`  Key: ${key}`)
    console.log(`  Match:`, m ? `FOUND - ${m[0].substring(0, 80)}` : 'NO MATCH')
  }
}
