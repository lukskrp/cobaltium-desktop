import { create } from 'zustand'

export interface ReportDraft {
  subject: string
  lines: string[]
}

interface ReportState {
  draft: ReportDraft | null
  open(draft: ReportDraft): void
  close(): void
}

/** Global content-report draft (port of Android's MainPager `showReport`
 *  dialog state). Any surface opens it with a pre-built transcript; the
 *  AppShell-level `ReportDialog` confirms and sends it. */
export const useReportStore = create<ReportState>((set) => ({
  draft: null,
  open: (draft) => set({ draft }),
  close: () => set({ draft: null })
}))
