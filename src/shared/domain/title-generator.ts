const STOPWORDS = new Set([
  'what',
  'when',
  'where',
  'why',
  'how',
  'which',
  'who',
  'whom',
  'whose',
  'a',
  'an',
  'the',
  'this',
  'that',
  'these',
  'those',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'can',
  'shall',
  'need',
  'dare',
  'ought',
  'i',
  'you',
  'he',
  'she',
  'it',
  'we',
  'they',
  'me',
  'him',
  'her',
  'us',
  'them',
  'my',
  'your',
  'his',
  'its',
  'our',
  'their',
  'not',
  'no',
  'nor',
  'never',
  'in',
  'on',
  'at',
  'to',
  'for',
  'with',
  'by',
  'from',
  'of',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'and',
  'or',
  'but',
  'so',
  'if',
  'then',
  'else',
  'than',
  'please',
  'explain',
  'tell',
  'show',
  'give',
  'describe'
])

/**
 * Auto-generates a session title from the user's first message (port of the
 * stopword-filtered heuristic in langpad.ts / Android `TitleGenerator`).
 */
export const TitleGenerator = {
  generate(firstUserMsg: string): string {
    const sentence = firstUserMsg
      .split(/[.!?]/)[0]
      .replace(/[^\p{L}\p{N}\s']/gu, ' ')
      .trim()
    const words = sentence
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOPWORDS.has(word.toLowerCase()))
    let title = words.slice(0, 4).join(' ')
    if (title.length < 3) {
      title = firstUserMsg
        .replace(/[^\p{L}\p{N}\s']/gu, ' ')
        .trim()
        .split(/\s+/)
        .slice(0, 4)
        .join(' ')
    }
    if (title.length > 60) {
      title = title.slice(0, 60).replace(/\s+\S*$/, '')
    }
    return title
  }
}
