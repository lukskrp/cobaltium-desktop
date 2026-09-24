import { LanguagePairTag } from './language-pair-tag'

export interface OrientedPhrasePair {
  sourceText: string
  targetText: string
  /** Pair tag (helper-first, learning last), mirroring Android's encoding. */
  tag: string
  /** Language of the target (learning) side, for the flip-direction entry. */
  translationLang: string
}

/**
 * Orient a flip-card's two faces source→target (port of Android
 * `ChatViewModel.saveMessageAsPhrase`). The non-learn face is the source;
 * the pair is always encoded helper-first with the learning language last,
 * so detection can never swap the two sides. No on-device language
 * detection is needed — the card already knows both face languages.
 */
export function orientPhrasePair(args: {
  front: string
  back: string
  frontFaceLang: string
  learn: string
  helper: string
  originalLang: string
}): OrientedPhrasePair {
  const front = args.front.trim()
  const back = args.back.trim()
  const learn = args.learn.trim().toLowerCase()
  const frontIsLearn = learn !== '' && args.frontFaceLang.trim().toLowerCase() === learn
  const sourceText = (frontIsLearn ? back : front).trim()
  const targetText = (frontIsLearn ? front : back).trim()
  const sourceLang = frontIsLearn ? args.originalLang : args.frontFaceLang
  const helperLang =
    learn !== '' && sourceLang.trim().toLowerCase() === learn ? args.helper : sourceLang
  return {
    sourceText,
    targetText,
    tag: LanguagePairTag.encode(helperLang, args.learn),
    translationLang: learn
  }
}
