/**
 * Full guided-tour step catalog (port of Android's `GuidedTour.kt`).
 *
 * Desktop uses react-router routes instead of Android's pager + drawers, so
 * `enterAction` is a reduced set: mode switches are applied via a direct
 * settings patch (never via `chat-store.setMode`, which would jump threads),
 * and drawer open/close actions from Android are noops documented below.
 * i18n keys (`tour.*`) live in `src/renderer/src/locales/*.json` (sourced
 * from `scripts/gen-locales.mjs`); missing keys fall back to English via
 * the `useT` fallback.
 */

export type TourCardPlacement = 'above' | 'below' | 'auto'

export type TourEnterAction =
  | 'SET_REFLECTIVE_MODE'
  | 'SET_CLOUD_PROVIDER'
  | 'GOTO_CHAT'
  | 'GOTO_REVIEW'
  | 'GOTO_READER'
  | 'GOTO_SCENARIOS'
  | 'GOTO_LEXICON'
  | 'GOTO_SETTINGS'
  | 'SCROLL_TO_ANCHOR'

export interface TourStep {
  id: string
  /** react-router route to navigate to on entering this step. */
  route: string
  /** `data-tour` anchor to spotlight, or null for a centered card. */
  anchor: string | null
  title: string
  body: string
  bullets?: string[]
  placement?: TourCardPlacement
  enterAction?: TourEnterAction
}

function step(
  id: string,
  route: string,
  anchor: string | null,
  title: string,
  body: string,
  extra?: Partial<Pick<TourStep, 'bullets' | 'placement' | 'enterAction'>>
): TourStep {
  return { id, route, anchor, title, body, ...extra }
}

/**
 * Chat-window segment: modes, languages, input, tool rail, TTS, LLM setup,
 * sessions, external engines, themes. Mirrors Android `chatTourSteps()`.
 *
 * NOTE: the tool rail is hidden in `conversation` mode (`ChatPage`), so the
 * first tool step carries `SET_REFLECTIVE_MODE` — the tour sidesteps by
 * switching to reflective first (settings patch only, no thread switch).
 * The rail is then mounted and all `tool.*` anchors are stable.
 */
export function chatTourSteps(): TourStep[] {
  return [
    step('chat.welcome', '/chat', null, 'tour.chat.title', 'tour.chat.body'),

    step('mode.conversation', '/chat', 'mode.conversation', 'tour.modes.conversation.title', 'tour.modes.conversation.body'),
    step('mode.corrective', '/chat', 'mode.corrective', 'tour.modes.corrective.title', 'tour.modes.corrective.body'),
    step('mode.immersive', '/chat', 'mode.immersive', 'tour.modes.immersive.title', 'tour.modes.immersive.body'),
    step('mode.reflective', '/chat', 'mode.reflective', 'tour.modes.reflective.title', 'tour.modes.reflective.body'),

    step('lang.helper', '/chat', 'lang.helper', 'tour.lang.helper.title', 'tour.lang.helper.body', {
      enterAction: 'SET_REFLECTIVE_MODE'
    }),
    step('lang.learn', '/chat', 'lang.learn', 'tour.lang.learn.title', 'tour.lang.learn.body'),
    step('lang.flip', '/chat', 'lang.flip', 'tour.lang.flip.title', 'tour.lang.flip.body'),

    step('chat.input', '/chat', 'chat.input', 'tour.input.title', 'tour.input.body'),

    step('tool.glossary', '/chat', 'tool.glossary', 'tour.tool.glossary.title', 'tour.tool.glossary.body'),
    step('tool.select', '/chat', 'tool.select', 'tour.tool.select.title', 'tour.tool.select.body'),
    step('tool.save', '/chat', 'tool.save', 'tour.tool.save.title', 'tour.tool.save.body'),
    step('tool.granular', '/chat', 'tool.granular', 'tour.tool.granular.title', 'tour.tool.granular.body'),
    step('tool.speak', '/chat', 'tool.speak', 'tour.tool.speak.title', 'tour.tool.speak.body'),
    step('tool.translit', '/chat', 'tool.translit', 'tour.tool.translit.title', 'tour.tool.translit.body'),

    step('tts', '/chat', null, 'tour.tts.title', 'tour.tts.body'),

    step('llm.intro', '/settings', null, 'tour.llm.intro.title', 'tour.llm.intro.body', {
      enterAction: 'GOTO_SETTINGS'
    }),
    step('llm.provider', '/settings', 'settings.provider', 'tour.llm.provider.title', 'tour.llm.provider.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.apikey', '/settings', 'settings.apiKey', 'tour.llm.apikey.title', 'tour.llm.apikey.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.baseurl', '/settings', 'settings.baseUrl', 'tour.llm.baseurl.title', 'tour.llm.baseurl.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.model', '/settings', 'settings.model', 'tour.llm.model.title', 'tour.llm.model.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.maxtokens', '/settings', 'settings.maxTokens', 'tour.llm.maxtokens.title', 'tour.llm.maxtokens.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.temperature', '/settings', 'settings.temperature', 'tour.llm.temperature.title', 'tour.llm.temperature.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.enable', '/settings', 'settings.enableLlm', 'tour.llm.enable.title', 'tour.llm.enable.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('llm.done', '/settings', null, 'tour.llm.done.title', 'tour.llm.done.body'),

    step('sessions', '/chat', 'sess.list', 'tour.sessions.title', 'tour.sessions.body', {
      enterAction: 'GOTO_CHAT'
    }),
    step('new.session', '/chat', 'sess.new', 'tour.new.session.title', 'tour.new.session.body'),

    step('drawers.done', '/chat', null, 'tour.drawers.done.title', 'tour.drawers.done.body'),

    step('ext.intro', '/settings', null, 'tour.ext.intro.title', 'tour.ext.intro.body', {
      enterAction: 'GOTO_SETTINGS'
    }),
    step('ext.deepl', '/settings', 'settings.translation.deepl', 'tour.ext.deepl.title', 'tour.ext.deepl.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('ext.google', '/settings', 'settings.translation.google', 'tour.ext.google.title', 'tour.ext.google.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('ext.picker', '/settings', 'settings.translation.provider', 'tour.ext.picker.title', 'tour.ext.picker.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('ext.toggle', '/settings', 'settings.fastTranslate', 'tour.ext.toggle.title', 'tour.ext.toggle.body', {
      enterAction: 'SCROLL_TO_ANCHOR'
    }),
    step('ext.done', '/settings', null, 'tour.ext.done.title', 'tour.ext.done.body'),

    step('themes.button', '/chat', 'themes.button', 'tour.themes.button.title', 'tour.themes.button.body', {
      enterAction: 'GOTO_CHAT'
    }),
    step('themes.menu', '/chat', null, 'tour.themes.menu.title', 'tour.themes.menu.body'),
    step('themes.done', '/chat', null, 'tour.themes.done.title', 'tour.themes.done.body')
  ]
}

/** Review (SRS) segment. Mirrors Android `reviewTourSteps()`. */
export function reviewTourSteps(): TourStep[] {
  return [
    step('srs.intro', '/srs', null, 'tour.srs.intro.title', 'tour.srs.intro.body', {
      enterAction: 'GOTO_REVIEW'
    }),
    step('srs.page', '/srs', 'srs.page', 'tour.srs.page.title', 'tour.srs.page.body'),
    step('srs.flip', '/srs', null, 'tour.srs.flip.title', 'tour.srs.flip.body'),
    step('srs.drawer', '/srs', 'srs.drawer', 'tour.srs.drawer.title', 'tour.srs.drawer.body'),
    step('srs.done', '/srs', null, 'tour.srs.done.title', 'tour.srs.done.body')
  ]
}

/** Reader (EPUB) segment. Mirrors Android `readerTourSteps()`. */
export function readerTourSteps(): TourStep[] {
  return [
    step('reader.intro', '/reader', null, 'tour.reader.intro.title', 'tour.reader.intro.body', {
      enterAction: 'GOTO_READER'
    }),
    step('reader.topbar', '/reader', null, 'tour.reader.topbar.title', 'tour.reader.topbar.body'),
    step('reader.gloss', '/reader', 'reader.page', 'tour.reader.gloss.title', 'tour.reader.gloss.body'),
    step('reader.tools', '/reader', 'reader.toolbar', 'tour.reader.tools.title', 'tour.reader.tools.body'),
    step('reader.lock', '/reader', null, 'tour.reader.lock.title', 'tour.reader.lock.body'),
    step('reader.done', '/reader', null, 'tour.reader.done.title', 'tour.reader.done.body')
  ]
}

/** Scenarios segment. Mirrors Android `scenariosTourSteps()`. */
export function scenariosTourSteps(): TourStep[] {
  return [
    step('scenarios.intro', '/scenarios', null, 'tour.scenarios.intro.title', 'tour.scenarios.intro.body', {
      enterAction: 'GOTO_SCENARIOS'
    }),
    step('scenarios.grid', '/scenarios', 'scenarios.grid', 'tour.scenarios.grid.title', 'tour.scenarios.grid.body'),
    step('scenarios.filter', '/scenarios', 'scenarios.filter', 'tour.scenarios.filter.title', 'tour.scenarios.filter.body'),
    step('scenarios.card', '/scenarios', 'scenarios.card', 'tour.scenarios.card.title', 'tour.scenarios.card.body'),
    step('scenarios.done', '/scenarios', null, 'tour.scenarios.done.title', 'tour.scenarios.done.body')
  ]
}

/** Lexicon + LangDex segment. Mirrors Android `lexiconTourSteps()`. */
export function lexiconTourSteps(): TourStep[] {
  return [
    step('lex.intro', '/lexicon', null, 'tour.lex.intro.title', 'tour.lex.intro.body', {
      enterAction: 'GOTO_LEXICON'
    }),
    step('lex.page', '/lexicon', 'lex.page', 'tour.lex.page.title', 'tour.lex.page.body'),
    step('langdex.open', '/lexicon', null, 'tour.langdex.open.title', 'tour.langdex.open.body'),
    step('langdex.search', '/lexicon', 'langdex.search', 'tour.langdex.search.title', 'tour.langdex.search.body'),
    step('langdex.done', '/lexicon', null, 'tour.langdex.done.title', 'tour.langdex.done.body')
  ]
}

/** Closing safety notice, always last. Mirrors Android `safetyStep()`. */
export function safetyStep(): TourStep {
  return step('safety', '/chat', null, 'tour.safety.title', 'tour.safety.body', {
    bullets: ['tour.safety.bullet1', 'tour.safety.bullet2'],
    enterAction: 'GOTO_CHAT'
  })
}

/**
 * Complete tour: Chat -> Review -> Reader -> Scenarios -> Lexicon -> safety.
 * Mirrors Android `mainTourSteps()`.
 */
export function mainTourSteps(): TourStep[] {
  return [
    ...chatTourSteps(),
    ...reviewTourSteps(),
    ...readerTourSteps(),
    ...scenariosTourSteps(),
    ...lexiconTourSteps(),
    safetyStep()
  ]
}
