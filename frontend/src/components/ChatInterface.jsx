import { useEffect, useRef, useState } from 'react'
import { PaperAirplaneIcon, SparklesIcon } from '@heroicons/react/24/outline'

const STORAGE_KEY = 'auteur_chat_history'

const STARTER_QUESTIONS = [
  'What patterns define my taste?',
  'Am I in a genre rut?',
  'Why do I keep rating certain directors so highly?',
]

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
          <SparklesIcon className="w-3.5 h-3.5 text-gold" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-gold text-bg font-medium rounded-br-sm'
            : 'bg-surface border border-border text-text rounded-bl-sm'
        }`}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    } catch {
      return []
    }
  })
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text) {
    if (!text.trim() || streaming) return

    const userMsg = { role: 'user', content: text.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setStreaming(true)

    // Placeholder for streaming response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }])

    try {
      const controller = new AbortController()
      abortRef.current = controller

      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-10),
        }),
        signal: controller.signal,
      })

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.text) {
              accumulated += parsed.text
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = { role: 'assistant', content: accumulated }
                return updated
              })
            }
          } catch {
            // skip malformed
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: 'Something went wrong. Make sure the backend is running.',
          }
          return updated
        })
      }
    } finally {
      setStreaming(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  function clearHistory() {
    setMessages([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-display text-xl font-bold text-text">Film Brain</h1>
          <p className="text-muted text-xs font-mono mt-0.5">Ask anything about your taste</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearHistory}
            className="text-xs font-mono px-3 py-1.5 rounded-lg border border-border text-muted hover:text-text hover:border-gold/40 transition-all"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center animate-fade-in">
            <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
              <SparklesIcon className="w-7 h-7 text-gold" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-text">Your Cinema Intelligence</h2>
              <p className="text-muted text-sm mt-2 max-w-md">
                Ask me anything about your watch history, taste patterns, or what to watch next.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-md">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left px-4 py-3 bg-surface border border-border rounded-xl text-text-dim text-sm hover:border-gold/40 hover:text-text transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <Message key={i} msg={msg} />
            ))}
            {streaming && messages[messages.length - 1]?.content === '' && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                  <SparklesIcon className="w-3.5 h-3.5 text-gold" />
                </div>
                <div className="bg-surface border border-border rounded-2xl rounded-bl-sm">
                  <TypingDots />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-border">
        <div className="flex items-center gap-3 bg-surface border border-border rounded-xl px-4 py-2.5 focus-within:border-gold/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your taste..."
            rows={1}
            className="flex-1 bg-transparent text-text placeholder-muted text-sm resize-none focus:outline-none max-h-32 leading-normal"
            style={{ height: '22px' }}
            onInput={(e) => {
              e.target.style.height = '22px'
              e.target.style.height = `${e.target.scrollHeight}px`
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || streaming}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-gold text-bg flex items-center justify-center hover:bg-gold-dim transition-colors disabled:opacity-30"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
        <p className="text-muted text-xs font-mono mt-2 text-center">
          Enter to send · Shift+Enter for newline
        </p>
      </div>
    </div>
  )
}
