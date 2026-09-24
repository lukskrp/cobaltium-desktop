import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const suppStart = content.indexOf('const SUPPLEMENTAL')
const lines = content.substring(suppStart).split('\n')

// Spot check various entries
const checks = [3, 5, 7, 9, 15, 16, 30, 40, 50]
for (const i of checks) {
  if (lines[i]) {
    console.log(`[${i}] ${lines[i].substring(0, 150)}`)
  }
}
