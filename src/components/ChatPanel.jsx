import React, { useState, useRef, useEffect, useCallback } from 'react'

const SUGGESTIONS = [
  "What are my abnormal results?",
  "Explain my cholesterol levels",
  "Am I at risk for diabetes?",
  "What medications should I discuss?",
  "Summarize my overall health",
  "What follow-up tests do I need?",
]

// Safe text renderer – escapes HTML to prevent XSS, then applies markdown formatting
function renderSafe(text) {
  // 1. Escape all HTML characters
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  
  // 2. Apply markdown-like formatting on the escaped text
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/&bull; /g, '• ')
}

export default function ChatPanel({ documents }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  const sendMessage = useCallback(async (text) => {
    const msg = text || input.trim()
    if (!msg || isLoading) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Sorry, I encountered an error: ${data.error}` 
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Network error. Please check your connection and try again.' 
      }])
    }

    setIsLoading(false)
    inputRef.current?.focus()
  }, [input, isLoading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">🤖</div>
            <p>
              {documents.length > 0 
                ? "I've analyzed your medical documents. Ask me anything about your health records!"
                : "Upload a medical document first, then ask me questions about your health data."
              }
            </p>
            {documents.length > 0 && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s, i) => (
                  <button 
                    key={i} 
                    className="chat-suggestion-btn"
                    onClick={() => sendMessage(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              className={`chat-message ${msg.role}`}
              dangerouslySetInnerHTML={{ __html: renderSafe(msg.content) }}
            />
          ))
        )}
        {isLoading && (
          <div className="chat-message assistant">
            <div className="processing-spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder={documents.length > 0 ? "Ask about your medical records..." : "Upload a document first..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading || documents.length === 0}
        />
        <button 
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={isLoading || !input.trim() || documents.length === 0}
        >
          Send ↗
        </button>
      </div>
    </div>
  )
}
