const VOWELS = 'aeiouyäö'
const BACK = 'aou'

/** True when the word contains a back vowel (a/o/u) => back harmony endings. */
export function isBack(word: string): boolean {
  return [...word].some((char) => BACK.includes(char))
}

export function partitive(back: boolean): string {
  return back ? 'a' : 'ä'
}

export function inessive(back: boolean): string {
  return back ? 'ssa' : 'ssä'
}

export function elative(back: boolean): string {
  return back ? 'sta' : 'stä'
}

export function adessive(back: boolean): string {
  return back ? 'lla' : 'llä'
}

export function ablative(back: boolean): string {
  return back ? 'lta' : 'ltä'
}

export function essive(back: boolean): string {
  return back ? 'na' : 'nä'
}

export function abessive(back: boolean): string {
  return back ? 'tta' : 'ttä'
}

export function vat(back: boolean): string {
  return back ? 'vat' : 'vät'
}

export function koon(back: boolean): string {
  return back ? 'koon' : 'köön'
}

export function kaa(back: boolean): string {
  return back ? 'kaa' : 'kää'
}

export function kaamme(back: boolean): string {
  return back ? 'kaamme' : 'käämme'
}

export function koot(back: boolean): string {
  return back ? 'koot' : 'kööt'
}

/** Run of consonants immediately before the final vowel (onset of last syllable). */
export function finalCluster(stem: string): string {
  let lastVowel = -1
  for (let i = stem.length - 1; i >= 0; i--) {
    if (VOWELS.includes(stem[i])) {
      lastVowel = i
      break
    }
  }
  if (lastVowel <= 0) return ''
  let start = lastVowel - 1
  while (start >= 0 && !VOWELS.includes(stem[start])) start--
  return stem.substring(start + 1, lastVowel)
}

const WEAK_CLUSTERS: ReadonlyMap<string, string> = new Map([
  ['kk', 'k'],
  ['pp', 'p'],
  ['tt', 't'],
  ['nk', 'ng'],
  ['nt', 'nn'],
  ['rt', 'rr'],
  ['lt', 'll'],
  ['mp', 'mm'],
  ['rk', 'r'],
  ['lk', 'l'],
  ['rp', 'rv'],
  ['k', ''],
  ['p', 'v'],
  ['t', 'd']
])

/** Weak-grade replacement for a cluster, or null when it does not gradate. */
export function weakCluster(cluster: string): string | null {
  return WEAK_CLUSTERS.get(cluster) ?? null
}

/** Weak stem: the final cluster is replaced in place by its weak grade (if any). */
export function weakStem(stem: string): string {
  const cluster = finalCluster(stem)
  const weak = weakCluster(cluster)
  if (weak === null) return stem
  return replaceCluster(stem, cluster, weak)
}

const STRONG_CLUSTERS: ReadonlyMap<string, string> = new Map([
  ['k', 'kk'],
  ['p', 'pp'],
  ['t', 'tt'],
  ['ng', 'nk'],
  ['nn', 'nt'],
  ['rr', 'rt'],
  ['ll', 'lt'],
  ['mm', 'mp'],
  ['v', 'p'],
  ['d', 't'],
  ['', 'k']
])

/** Strong-grade cluster reverse mapping (for stems that appear weak in the infinitive). */
export function strongCluster(cluster: string): string | null {
  return STRONG_CLUSTERS.get(cluster) ?? null
}

/** Strong stem by reverse-gradation of the given (weak) stem. */
export function strongStem(stem: string): string {
  const cluster = finalCluster(stem)
  const strong = strongCluster(cluster)
  if (strong === null) return stem
  return replaceCluster(stem, cluster, strong)
}

function replaceCluster(stem: string, cluster: string, replacement: string): string {
  const start = stem.lastIndexOf(cluster)
  return stem.substring(0, start) + replacement + stem.substring(start + cluster.length)
}
