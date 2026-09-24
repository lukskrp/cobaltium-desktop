/**
 * Maps Cobaltium language codes to espeak-ng voice codes (port of
 * `EspeakIpaTranscriber.espeakVoice`). Falls back to the 2-letter code when
 * no dedicated voice file exists.
 */
export function espeakVoiceFor(lang: string): string {
  const code = lang.toLowerCase()
  if (code.startsWith('zh')) return 'cmn' // Mandarin (no "zh" phoneme file)
  if (code.startsWith('pt-br')) return 'pt-BR'
  if (code.startsWith('es-419')) return 'es-419'
  if (code.startsWith('fr-be')) return 'fr-BE'
  if (code.startsWith('fr-ch')) return 'fr-CH'
  if (code === 'en-us') return 'en-US'
  return code.slice(0, 2)
}
