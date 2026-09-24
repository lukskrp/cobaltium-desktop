/** Content-report helpers (port of Android `safety/ReportBody.kt`). Pure. */

export const SUPPORT_EMAIL = 'support@skarptech.org'

const MAX_SUBJECT_CHARS = 200
const MAX_BODY_CHARS = 8000

/** Header line identifying the app + timestamp, then the transcript lines. */
export function buildReport(subject: string, lines: string[]): string {
  const out: string[] = [
    'Cobaltium content report',
    `Subject: ${subject}`,
    `Time: ${new Date().toLocaleString()}`,
    '-------------------',
    ...lines
  ]
  return out.join('\n')
}

/** `mailto:` URL with subject/body pre-filled (length-capped for URL limits). */
export function mailtoUrl(subject: string, body: string): string {
  const safeSubject = subject.slice(0, MAX_SUBJECT_CHARS)
  const safeBody = body.slice(0, MAX_BODY_CHARS)
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(safeSubject)}&body=${encodeURIComponent(safeBody)}`
}
