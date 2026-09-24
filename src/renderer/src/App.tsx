import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@renderer/app/AppShell'
import { ChatPage } from '@renderer/features/chat/ChatPage'
import { LexiconPage } from '@renderer/features/lexicon/LexiconPage'
import { SrsPage } from '@renderer/features/srs/SrsPage'
import { ReaderPage } from '@renderer/features/reader/ReaderPage'
import { ScenariosPage } from '@renderer/features/scenarios/ScenariosPage'
import { SettingsPage } from '@renderer/features/settings/SettingsPage'

export default function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/lexicon" element={<LexiconPage />} />
          <Route path="/saved-words" element={<LexiconPage key="words" initialTab="words" />} />
          <Route path="/saved-phrases" element={<LexiconPage key="phrases" initialTab="phrases" />} />
          <Route path="/srs" element={<SrsPage />} />
          <Route path="/reader" element={<ReaderPage />} />
          <Route path="/scenarios" element={<ScenariosPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
