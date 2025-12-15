/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createSession, deleteSession, fetchSession, listSessions, openQueryStream, sendQuery } from '@/api/chat'

export const ChatContext = createContext(null)

const AVAILABLE_MODELS = [
  { id: 'gpt-5-mini', label: 'GPT 5 Mini', context: '128k', cost: 1 },
  { id: 'gpt-5.1', label: 'GPT 5.1', context: '128k', cost: 2 },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', context: '1M', cost: 1 },
]

const buildEmptyResponses = (models) =>
  models.reduce((acc, model) => {
    acc[model] = { text: '', status: 'pending' }
    return acc
  }, {})

function mapMessagesToTurns(messages) {
  const turns = []
  let current = null

  messages.forEach((msg) => {
    if (msg.role === 'user') {
      if (current) turns.push(current)
      current = {
        id: `turn-${msg.createdAt || Date.now()}`,
        query: msg.content,
        createdAt: msg.createdAt,
        responses: {},
      }
    } else if (msg.role === 'assistant') {
      if (!current) {
        current = {
          id: `turn-${msg.createdAt || Date.now()}`,
          query: 'Previous question',
          createdAt: msg.createdAt,
          responses: {},
        }
      }
      current.responses[msg.model || 'assistant'] = {
        text: msg.content,
        status: msg.status,
      }
    }
  })

  if (current) turns.push(current)
  return turns
}

export function ChatProvider({ children }) {
  const [session, setSession] = useState(null)
  const [turns, setTurns] = useState([])
  const [sessions, setSessions] = useState([])
  const [selectedModels, setSelectedModels] = useState(['gpt-5-mini', 'gpt-5.1'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [pendingQuery, setPendingQuery] = useState(null)
  const streamRef = useRef(null)

  const fetchSessions = useCallback(async () => {
    try {
      const result = await listSessions()
      setSessions(result.sessions || [])
    } catch {
      // Guests do not have session listing
    }
  }, [])

  const ensureSession = useCallback(async () => {
    if (session?.chatSessionId) return session
    const created = await createSession(selectedModels)
    setSession(created)
    setTurns([])
    fetchSessions()
    return created
  }, [selectedModels, session, fetchSessions])

  const loadSession = useCallback(
    async (chatSessionId) => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSession(chatSessionId)
        setSession({ chatSessionId, models: data.models, title: data.title })
        setSelectedModels(data.models)
        setTurns(mapMessagesToTurns(data.messages || []))
      } catch (err) {
        setError(err.message || 'Failed to load session')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const resetStream = () => {
    if (streamRef.current) {
      streamRef.current.close()
      streamRef.current = null
    }
    setIsStreaming(false)
  }

  useEffect(() => {
    return () => resetStream()
  }, [])

  const startStream = useCallback(
    (queryId) => {
      resetStream()
      const source = openQueryStream(queryId)
      streamRef.current = source
      setIsStreaming(true)

      source.addEventListener('chunk', (event) => {
        try {
          const payload = JSON.parse(event.data)
          setTurns((prev) =>
            prev.map((turn) => {
              if (turn.id !== queryId) return turn
              return {
                ...turn,
                responses: {
                  ...turn.responses,
                  [payload.model]: {
                    text: (turn.responses[payload.model]?.text || '') + (payload.token || ''),
                    status: payload.isComplete ? 'done' : 'streaming',
                  },
                },
              }
            })
          )
        } catch {
          // ignore parse errors
        }
      })

      source.addEventListener('done', () => {
        setIsStreaming(false)
        // Mark all responses as done when stream completes
        setTurns((prev) =>
          prev.map((turn) => {
            if (turn.id !== queryId) return turn
            const updatedResponses = { ...turn.responses }
            for (const model of Object.keys(updatedResponses)) {
              if (updatedResponses[model].status === 'streaming' || updatedResponses[model].status === 'pending') {
                updatedResponses[model] = { ...updatedResponses[model], status: 'done' }
              }
            }
            return { ...turn, responses: updatedResponses }
          })
        )
        source.close()
        fetchSessions()
      })

      source.onerror = () => {
        setIsStreaming(false)
        source.close()
      }
    },
    [fetchSessions]
  )

  const sendMessage = useCallback(
    async (query) => {
      setError(null)
      const activeSession = await ensureSession()
      const turnId = `q_${Date.now()}`
      const models = activeSession.models || selectedModels

      // Optimistically add user question
      setTurns((prev) => [
        ...prev,
        {
          id: turnId,
          query,
          createdAt: new Date().toISOString(),
          responses: buildEmptyResponses(models),
        },
      ])

      try {
        const result = await sendQuery(activeSession.chatSessionId, query)
        const { queryId } = result

        // Associate stream with this turn
        setTurns((prev) =>
          prev.map((turn) => (turn.id === turnId ? { ...turn, id: queryId } : turn))
        )
        startStream(queryId)
        return { ok: true }
      } catch (err) {
        if (err.status === 402) {
          setTurns((prev) => prev.filter((t) => t.id !== turnId))
          setPendingQuery({ query, sessionId: activeSession.chatSessionId })
          return { ok: false, paymentRequired: true, data: err.data }
        }
        setError(err.message || 'Failed to send')
        setTurns((prev) => prev.filter((t) => t.id !== turnId))
        return { ok: false, error: err.message }
      }
    },
    [ensureSession, selectedModels, startStream]
  )

  const retryPendingQuery = useCallback(async () => {
    if (!pendingQuery) return { ok: false }
    const { query } = pendingQuery
    setPendingQuery(null)
    return sendMessage(query)
  }, [pendingQuery, sendMessage])

  const startNewSession = useCallback(
    (modelsOverride) => {
      resetStream()
      const modelsToUse = modelsOverride && modelsOverride.length ? modelsOverride : selectedModels
      setSession(null)
      setSelectedModels(modelsToUse)
      setTurns([])
    },
    [selectedModels]
  )

  const removeSession = useCallback(
    async (chatSessionId) => {
      await deleteSession(chatSessionId).catch(() => { })
      if (session?.chatSessionId === chatSessionId) {
        setSession(null)
        setTurns([])
      }
      fetchSessions()
    },
    [fetchSessions, session]
  )

  const value = useMemo(
    () => ({
      session,
      sessions,
      turns,
      selectedModels,
      setSelectedModels,
      loading,
      error,
      isStreaming,
      pendingQuery,
      availableModels: AVAILABLE_MODELS,
      sendMessage,
      startNewSession,
      loadSession,
      fetchSessions,
      removeSession,
      resetStream,
      retryPendingQuery,
    }),
    [
      error,
      fetchSessions,
      isStreaming,
      loadSession,
      loading,
      pendingQuery,
      removeSession,
      retryPendingQuery,
      selectedModels,
      sendMessage,
      session,
      sessions,
      startNewSession,
      turns,
    ]
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}
