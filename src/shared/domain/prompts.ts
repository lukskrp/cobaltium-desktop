import type { ChatMode, PromptType } from './enums'
import { Languages } from './languages'

/** Structured per-language inflection spec (ported in full in Phase 4). */
export interface InflectionSpecHint {
  lang: string
  verbTables: string[]
  personLabels: string[]
}

/** Chat-mode system prompts (port of `buildSystemPrompt` in langpad.ts). */
export const PromptBuilder = {
  buildSystemPrompt(mode: ChatMode, learnLang: string, nativeLang: string): string {
    if (mode === 'corrective') {
      const learnName = Languages.name(learnLang)
      const nativeName = Languages.name(nativeLang)
      return (
        `You are a language teacher correcting the user's writing in ${learnName}. ` +
        `The user's native language is ${nativeName}. ` +
        `The user writes sentences in ${learnName}. ` +
        'Analyze each sentence: check grammar, word choice, phrasing, spelling and typos, ' +
        `and naturalness. Point out each mistake and explain it, using ${nativeName} for the ` +
        'explanations. Then end your reply with a corrected version of the user\'s sentence ' +
        `in ${learnName}, introduced clearly (e.g. "Corrected: ..."). ` +
        'Be concise and constructive. If the sentence is already correct, say so briefly and ' +
        'still give the corrected sentence as confirmation.'
      )
    }
    if (mode === 'immersive') {
      const learnName = Languages.name(learnLang)
      const nativeName = Languages.name(nativeLang)
      return (
        `You are a language partner helping the user practice ${learnName}. ` +
        `The user's native language is ${nativeName}. ` +
        `Always reply ONLY in ${learnName}, no matter what language the user writes in. ` +
        'Keep replies natural, conversational, and concise - 1-3 sentences. ' +
        `Do not include any ${nativeName} text, translations, parenthetical glosses, or ` +
        'language-learning explanations in your replies. ' +
        `If the user makes a ${learnName} mistake, reply naturally without correcting it unless they ask.`
      )
    }
    // conversation (and reflective never reaches here)
    return (
      'You are a helpful language learning assistant. You can answer questions about word ' +
      'etymology, meanings, pronunciation, usage, and similarities between languages.'
    )
  },

  /** Saved-word question prompt (port of `preprompt` in shared/i18n.ts). */
  preprompt(word: string, srcLang: string, type: PromptType): string {
    const srcName = Languages.name(srcLang)
    const template = TEMPLATES[type]
    return template.replace('{word}', word).replace('{srcLang}', srcName)
  },

  /** Morphological-analyzer system prompt (port of `morphSystemPrompt`). */
  morphSystemPrompt(respondIn: string): string {
    return (
      'You are a morphological analyzer for language learners. Given a word and its language, ' +
      'output a JSON object with applicable morphological fields. Only output valid JSON, no explanation, ' +
      'no markdown.\n\n' +
      `CRITICAL: All field VALUES must be in ${respondIn}. Field names (keys) stay in English.\n\n` +
      'Available fields (include only relevant ones):\n' +
      '- pos: part of speech (noun, verb, adjective, adverb, pronoun, preposition, conjunction, interjection, determiner, numeral, particle, article, prefix, suffix)\n' +
      '- tense: (present, past, future, imperfect, preterite, conditional, pluperfect, etc.)\n' +
      '- gender: (masculine, feminine, neuter, common)\n' +
      '- number: (singular, plural, dual)\n' +
      '- person: (1st, 2nd, 3rd)\n' +
      '- case: (nominative, accusative, genitive, dative, ablative, locative, instrumental, vocative)\n' +
      '- mood: (indicative, subjunctive, imperative, conditional, infinitive, participle, gerund)\n' +
      '- form: (infinitive, gerund, participle, reflexive, clitic, etc.)\n' +
      '- lemma: base/dictionary form of the word\n' +
      '- notes: any additional relevant info\n\n' +
      `Return ONLY a JSON object with values in ${respondIn}.`
    )
  },

  /** Morphological-analyzer user prompt (port of `morphUserPrompt`). */
  morphUserPrompt(word: string, langName: string, respondIn: string): string {
    return (
      `Analyze the word "${word}" in ${langName}. Respond in ${respondIn}. Return only the JSON object ` +
      `with values in ${respondIn}.`
    )
  },

  /** Compressor prompt for the sliding-window context notes. */
  summarizeSystemPrompt(): string {
    return (
      'You compress conversation history into concise memory notes. ' +
      "Preserve facts, decisions, the user's goals, language-learning details, vocabulary, " +
      'names, and anything likely needed later. Output ONLY the updated notes as short ' +
      'bullet lines. No commentary, no headings.'
    )
  },

  summarizeUserPrompt(existingNotes: string, newText: string): string {
    let out = ''
    if (existingNotes.trim() !== '') out += `Existing notes:\n${existingNotes}\n\n`
    out += `New messages to fold into the notes:\n${newText}`
    return out
  },

  /** Inflection-engine system prompt: outputs a structured JSON paradigm. */
  inflectionSystemPrompt(spec: InflectionSpecHint | null = null): string {
    const base =
      'You are a LangDex-style inflection engine for language learners. Given a word, its ' +
      'language, and its part of speech, produce the full inflection paradigm as a single ' +
      'JSON object. Only output valid JSON, no explanation, no markdown.\n\n' +
      'Rules by part of speech:\n' +
      '- VERB: produce CONJUGATION. One table per tense/mood the language has (present, past, ' +
      'future, conditional, imperative, potential, ...), with rows for each person the language ' +
      "uses (1sg, 2sg, 3sg, 1pl, 2pl, 3pl, or the language's own person labels). Each row has one cell. " +
      'Include the analytic (compound) tenses such as perfect and pluperfect wherever the language ' +
      'builds them with an auxiliary, and for every tense/mood the language negates add a separate ' +
      'negative table (e.g. "Present negative"). Also add a table of non-finite forms the language ' +
      "has (infinitives, participles, gerunds, verbal nouns, converbs, etc.) under the language's " +
      'own names, when relevant.\n' +
      '- NOUN, PRONOUN, ADJECTIVE, DETERMINER: produce DECLENSION. One table with columns ' +
      "['Singular', 'Plural'] (or the language's number categories) and a row for EVERY case the " +
      'language has (e.g. all 15 cases for Finnish: nominative, genitive, partitive, inessive, ' +
      'elative, illative, adessive, ablative, allative, essive, translative, instructive, abessive, ' +
      'comitative, and accusative where applicable).\n' +
      '- ADVERB and other non-infecting parts of speech: if the language declines them, show it; ' +
      'otherwise set "kind" to null and explain in "note".\n\n' +
      'JSON shape (exactly): {"kind": "conjugation"|"declension"|null, "note": "", ' +
      '"tables": [{"title": "Present", "columns": ["Form"], ' +
      '"rows": [{"label": "1sg", "cells": ["form"]}]}]}. ' +
      'Use real inflected forms of the given word. Return ONLY the JSON object.'
    const pin = spec
      ? `\n\nFor ${Languages.name(spec.lang)} produce exactly the conjugation table titles: ` +
        `${spec.verbTables.join(', ')}. Use these person labels: ${spec.personLabels.join(', ')}.`
      : ''
    return base + pin
  },

  inflectionUserPrompt(lemma: string, langName: string, pos: string | null | undefined): string {
    const part = pos && pos.trim() !== '' ? pos : 'unknown'
    return (
      `Inflect "${lemma}" in ${langName}. Part of speech: ${part}. ` +
      'Return only the JSON paradigm object.'
    )
  },

  /** Dictionary system prompt: outputs a JSON array of entries. */
  dictionarySystemPrompt(): string {
    return (
      'You are a bilingual dictionary for language learners. Given a word and its language, ' +
      'return a JSON array of dictionary entries. Only output valid JSON, no explanation, ' +
      'no markdown.\n\n' +
      'Each element must be: {"headword": "<headword>", "pos": "<part of speech>", ' +
      '"reading": "<pronunciation/reading if useful, else empty>", ' +
      '"sense": "<English translation or concise explanation>"}. ' +
      'If the word has multiple senses, list them as separate entries. Return ONLY the JSON array.'
    )
  },

  dictionaryUserPrompt(word: string, langName: string): string {
    return `Look up "${word}" in ${langName}. Return only the JSON array of entries.`
  },

  /**
   * Translation system prompt for the immersive/reflective flip cards. Produces
   * the translated text plus a per-word gloss map (source word -> target gloss).
   */
  translationSystemPrompt(sourceName: string, targetName: string): string {
    return (
      `You are a translation engine for language learners. Translate from ${sourceName} into ${targetName}. ` +
      'Return ONLY a JSON object in the exact shape ' +
      '{"translation":"<full translation in ' +
      targetName +
      '>","glosses":[{"foreign":"<a source-language word>","native":"<its ' +
      targetName +
      ' gloss>}]}. ' +
      'The glosses array must cover the content words of the source text. ' +
      'No explanations, no markdown, no commentary.'
    )
  },

  translationUserPrompt(text: string, sourceName: string, targetName: string): string {
    return (
      `Translate this from ${sourceName} into ${targetName}. Return only the JSON object.\n\n` +
      `Text: ${text}`
    )
  },

  /**
   * Voice-assistant prompt: general-purpose, not language-teaching specific.
   * Respects the chosen reply language and keeps replies speakable.
   * Port of Android `PromptBuilder.buildVoiceSystemPrompt`.
   */
  buildVoiceSystemPrompt(responseLanguage: string | null): string {
    const language =
      !responseLanguage || responseLanguage.trim() === '' || responseLanguage.toLowerCase() === 'auto'
        ? 'Reply in the same language the user is speaking.'
        : `Always reply in ${Languages.name(responseLanguage)}.`
    return (
      'You are a helpful, concise voice assistant. The user is speaking to you naturally.\n\n' +
      "Infer the topic and the user's intent from the conversation itself. Do not assume any " +
      'particular subject or field, and do not steer the conversation toward one.\n\n' +
      language +
      '\n\n' +
      'Keep replies focused and easy to read aloud: short sentences, no code blocks, tables, ' +
      'or markup, and no content unrelated to what the user asked.'
    )
  }
}

const TEMPLATES: Record<PromptType, string> = {
  ambiguity:
    'Does "{word}" have other meanings in {srcLang}? If so, what are the other meanings?',
  etymology:
    'Explain the etymology of "{word}" in {srcLang}. Show its root, cognates in related ' +
    'languages, and how its meaning evolved over time.',
  examples:
    'Show 5 example sentences using "{word}" in different contexts in {srcLang}. ' +
    'Translate each example into my language.',
  mistakes:
    'What are the most common mistakes learners make with "{word}" in {srcLang}? ' +
    'Consider false cognates, wrong prepositions, gender errors, spelling pitfalls, and register issues.',
  conjugation:
    'Show the full conjugation or declension of "{word}" in {srcLang}. Include all tenses, ' +
    'moods, and forms. If it is a noun or adjective, show the declension pattern.',
  mnemonic:
    'Suggest a creative mnemonic or memory trick to help remember the word "{word}" in {srcLang}. ' +
    'Include its meaning, spelling, and any grammatical quirks.'
}

/** English labels for saved-word analysis fields (port of FIELD_LABELS). */
const FIELD_LABELS: Record<string, string> = {
  pos: 'Part of speech',
  tense: 'Tense',
  gender: 'Gender',
  number: 'Number',
  person: 'Person',
  case: 'Case',
  mood: 'Mood',
  form: 'Form',
  notes: 'Notes'
}

export const AnalysisLabels = {
  label(key: string): string {
    return FIELD_LABELS[key] ?? key
  }
}
