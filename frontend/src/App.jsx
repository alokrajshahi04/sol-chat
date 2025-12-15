import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { LoginPage } from '@/pages/LoginPage'
import { ChatPage } from '@/pages/ChatPage'
import { TransactionHistoryPage } from '@/pages/TransactionHistoryPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { OAuthCallback } from '@/pages/OAuthCallback'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:chatSessionId" element={<ChatPage />} />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <TransactionHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/success" element={<OAuthCallback success />} />
            <Route path="/auth/error" element={<OAuthCallback />} />
            <Route path="/" element={<Navigate to="/chat" replace />} />
          </Routes>
        </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App
