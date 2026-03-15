import React, { useState, useRef, useEffect, useCallback } from 'react'

const SUGGESTIONS = {
  en: [
    "What are my abnormal results?",
    "Explain my cholesterol levels",
    "Am I at risk for diabetes?",
    "What medications should I discuss?",
    "Summarize my overall health",
    "What follow-up tests do I need?",
  ],
  hi: [
    "मेरी असामान्य रिपोर्ट क्या हैं?",
    "मेरा कोलेस्ट्रॉल समझाएं",
    "क्या मुझे मधुमेह का खतरा है?",
    "मुझे कौन सी दवाइयाँ लेनी चाहिए?",
    "मेरे स्वास्थ्य का सारांश दें",
    "कौन से फॉलो-अप टेस्ट करने हैं?",
  ],
}

function renderSafe(text) {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  return escaped
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>')
    .replace(/&bull; /g, '• ')
}

export default function ChatPanel({ documents, lang = 'en' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [messages])

  // Web Speech API setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US'

      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(r => r[0].transcript)
          .join('')
        setInput(transcript)
      }

      recognition.onend = () => setIsListening(false)
      recognition.onerror = () => setIsListening(false)

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop() } catch {}
      }
    }
  }, [lang])

  const toggleVoice = () => {
    if (!recognitionRef.current) return
    if (isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    } else {
      recognitionRef.current.lang = lang === 'hi' ? 'hi-IN' : 'en-US'
      recognitionRef.current.start()
      setIsListening(true)
    }
  }

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
        body: JSON.stringify({ message: msg, lang }),
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
  }, [input, isLoading, lang])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = SUGGESTIONS[lang] || SUGGESTIONS.en
  const hasVoice = !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon">🤖</div>
            <p>
              {documents.length > 0
                ? lang === 'hi'
                  ? "मैंने आपके मेडिकल डॉक्यूमेंट का विश्लेषण किया है। अपने स्वास्थ्य रिकॉर्ड के बारे में कुछ भी पूछें!"
                  : "I've analyzed your medical documents. Ask me anything about your health records!"
                : lang === 'hi'
                  ? "पहले एक मेडिकल डॉक्यूमेंट अपलोड करें, फिर अपने स्वास्थ्य डेटा के बारे में पूछें।"
                  : "Upload a medical document first, then ask me questions about your health data."
              }
            </p>
            {documents.length > 0 && (
              <div className="chat-suggestions">
                {suggestions.map((s, i) => (
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
        {hasVoice && (
          <button
            className={`voice-btn ${isListening ? 'listening' : ''}`}
            onClick={toggleVoice}
            title={isListening ? 'Stop listening' : 'Voice input'}
          >
            🎙️
          </button>
        )}
        <input
          ref={inputRef}
          className="chat-input"
          type="text"
          placeholder={documents.length > 0
            ? (lang === 'hi' ? "अपने मेडिकल रिकॉर्ड के बारे में पूछें..." : "Ask about your medical records...")
            : (lang === 'hi' ? "पहले डॉक्यूमेंट अपलोड करें..." : "Upload a document first...")}
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
          {lang === 'hi' ? 'भेजें ↗' : 'Send ↗'}
        </button>
      </div>
    </div>
  )
}
