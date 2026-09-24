import { readFileSync } from 'node:fs'

const filePath = 'D:\\Documents_D\\Cobaltium_Desktop\\scripts\\gen-locales.mjs'
let content = readFileSync(filePath, 'utf8')

// Simple regex to find specific entries and their German translations
const entries = [
  'tour.modes.conversation.title',
  'tour.modes.conversation.body',
  'tour.modes.corrective.body',
  'tour.lang.learn.body',
  'tour.llm.enable.body',
  'tour.reader.intro.body',
  'tour.safety.title',
  'tour.chat.body',
  'tour.done.body',
  'tour.lex.page.body',
  'tour.langdex.open.body',
  'tour.themes.done.body',
  'tour.srs.flip.body',
]

for (const key of entries) {
  // Find the entry for this key
  const idx = content.indexOf(`'${key}'`)
  if (idx === -1) {
    console.log(`\n${key}: NOT FOUND`)
    continue
  }
  
  // Get a chunk around this key
  const chunk = content.substring(idx, idx + 300)
  
  // Try to extract the de: value
  const deMatch = chunk.match(/de:\s*'([^']*(?:''[^']*)*)'/)
  if (deMatch) {
    console.log(`\n${key}: ${deMatch[1].substring(0, 100)}...`)
  } else {
    console.log(`\n${key}: de value not found or has unusual formatting`)
  }
}
