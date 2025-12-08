import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { ChatProvider } from '@/contexts/ChatContext'
import { LoginPage } from '@/pages/LoginPage'
import { MarketplacePage } from '@/pages/MarketplacePage'
import { ChatPage } from '@/pages/ChatPage'
import { TransactionHistoryPage } from '@/pages/TransactionHistoryPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import './index.css'

function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/marketplace"
            element={
              <ProtectedRoute>
                <MarketplacePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <TransactionHistoryPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App
