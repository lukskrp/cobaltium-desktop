import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

const keysToFind = [
  'tour.lex_intro.body',
  'tour.langdex_open.title',
  'tour.safety_title',
  'tour.skipConfirmTitle',
  'tour.replay',
]

for (const key of keysToFind) {
  // Try with and without underscore variations
  const variations = [
    key,
    key.replace('_intro', '.intro'),
    key.replace('_open', '.open'),
    key.replace('safety_', 'safety.'),
    key,
  ]
  
  let found = false
  for (const pattern of variations) {
    if (content.includes(pattern)) {
      const idx = content.indexOf(pattern)
      console.log(`Found "${pattern}" at index ${idx}`)
      console.log('  Context:', content.substring(idx, idx + 100))
      found = true
      break
    }
  }
  if (!found) {
    console.log(`"${key}" NOT FOUND in file`)
  }
}
