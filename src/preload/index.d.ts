import type { CobaltiumApi } from '@shared/ipc'

declare global {
  interface Window {
    cobaltium: CobaltiumApi
  }
}

export {}
