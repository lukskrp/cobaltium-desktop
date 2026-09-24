import { Notification, type BrowserWindow } from 'electron'
import { IPC } from '@shared/ipc'
import { reminderDay, shouldNotifyReminder, type ReminderMark } from '@shared/domain/reminders'
import { loadAppSettings, readSetting, writeSetting } from './db/repositories/settings'
import { countDueCards } from './db/repositories/srs'

const CHECK_MS = 30 * 60 * 1000
const STARTUP_DELAY_MS = 15_000
const REMINDER_KEY = 'srs_reminder'

let timer: NodeJS.Timeout | null = null
let windowRef: BrowserWindow | null = null
let onDue: ((due: number) => void) | null = null

/** Total due cards across all decks (0 when the DB is unavailable). */
export function currentDueCount(): number {
  try {
    return countDueCards(Date.now())
  } catch {
    return 0
  }
}

function focusWindow(): void {
  const window = windowRef
  if (!window || window.isDestroyed()) return
  if (window.isMinimized()) window.restore()
  window.focus()
}

/** Check due cards and notify at most once a day. Returns the due count. */
export async function checkReminders(): Promise<number> {
  const due = currentDueCount()
  try {
    onDue?.(due)
  } catch {
    // tray update must never break the check
  }
  try {
    if (!loadAppSettings().remindersEnabled) return due
    const today = reminderDay()
    const raw = readSetting(REMINDER_KEY) as ReminderMark | null
    const last = raw && typeof raw.day === 'string' ? raw : null
    if (!shouldNotifyReminder(last, today, due)) return due
    writeSetting(REMINDER_KEY, { day: today, count: due })
    // NOTE: main-process strings stay English (no i18n bundle in main);
    // the reminder settings UI itself is fully localized.
    const notification = new Notification({
      title: 'Cards due for review',
      body: `${due} card(s) waiting in Cobaltium.`
    })
    notification.on('click', () => {
      focusWindow()
      const window = windowRef
      if (window && !window.webContents.isDestroyed()) {
        window.webContents.send(IPC.remindersOpen)
      }
    })
    notification.show()
  } catch {
    // reminders are best-effort; never break the app
  }
  return due
}

/** Start the periodic due-card check for the given window. */
export function initReminders(window: BrowserWindow, onDueCount: (due: number) => void): void {
  windowRef = window
  onDue = onDueCount
  if (timer) clearInterval(timer)
  setTimeout(() => void checkReminders(), STARTUP_DELAY_MS)
  timer = setInterval(() => void checkReminders(), CHECK_MS)
  window.on('focus', () => void checkReminders())
}

export function disposeReminders(): void {
  if (timer) clearInterval(timer)
  timer = null
  windowRef = null
  onDue = null
}
