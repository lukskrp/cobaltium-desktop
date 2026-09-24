/** External translation providers (DeepL / Google), used ahead of the LLM tier. */

function toDeepL(code: string): string {
  const lower = code.toLowerCase()
  if (lower === 'pt-br') return 'PT-BR'
  if (lower === 'pt') return 'PT-PT'
  if (lower === 'en') return 'EN'
  return lower.toUpperCase()
}

/** DeepL translate. `from` may be "auto" to let DeepL detect the language. */
export async function deepLTranslate(
  text: string,
  from: string,
  to: string,
  apiKey: string,
  plan: 'free' | 'pro'
): Promise<string> {
  const endpoint =
    plan === 'pro'
      ? 'https://api.deepl.com/v2/translate'
      : 'https://api-free.deepl.com/v2/translate'
  const params = new URLSearchParams()
  params.set('auth_key', apiKey)
  params.set('text', text)
  params.set('target_lang', toDeepL(to))
  if (from && from !== 'auto') params.set('source_lang', toDeepL(from))

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })
  if (!response.ok) {
    throw new Error(`DeepL HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  const data = (await response.json()) as { translations?: { text?: string }[] }
  const translated = data.translations?.[0]?.text
  if (!translated) throw new Error('DeepL returned no translation')
  return translated
}

function toGoogle(code: string): string {
  const lower = code.toLowerCase()
  if (lower === 'pt-br') return 'pt'
  return lower
}

/** Google Cloud Translation (v2) translate. */
export async function googleTranslate(
  text: string,
  from: string,
  to: string,
  apiKey: string
): Promise<string> {
  const params = new URLSearchParams()
  params.set('q', text)
  params.set('target', toGoogle(to))
  if (from && from !== 'auto') params.set('source', toGoogle(from))
  params.set('key', apiKey)

  const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?${params.toString()}`,
    { method: 'POST' }
  )
  if (!response.ok) {
    throw new Error(`Google HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
  }
  const data = (await response.json()) as {
    data?: { translations?: { translatedText?: string }[] }
  }
  const translated = data.data?.translations?.[0]?.translatedText
  if (!translated) throw new Error('Google returned no translation')
  return translated
}
