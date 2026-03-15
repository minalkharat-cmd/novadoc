import React, { useState, useCallback, useEffect } from 'react'
import UploadPanel from './components/UploadPanel'
import Timeline from './components/Timeline'
import ChatPanel from './components/ChatPanel'
import InsightsPanel from './components/InsightsPanel'
import DocumentModal from './components/DocumentModal'

function App() {
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [activeTab, setActiveTab] = useState('upload') // 'upload' | 'insights'
  const [isProcessing, setIsProcessing] = useState(false)

  // Hydrate from server on mount (handles page refresh)
  useEffect(() => {
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => {
        if (data.documents && data.documents.length > 0) {
          setDocuments(data.documents.reverse())
          setActiveTab('insights')
        }
      })
      .catch(() => {}) // silently fail if server not ready
  }, [])


  const handleDocumentProcessed = useCallback((doc) => {
    setDocuments(prev => [doc, ...prev])
    setActiveTab('insights')
  }, [])

  const latestInsights = documents.length > 0 ? documents[0].insights : null
  const allFindings = documents.flatMap(d => 
    (d.extraction?.findings || []).map(f => ({ ...f, docDate: d.extraction?.date, docType: d.extraction?.documentType }))
  )

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">🧬</div>
          <div>
            <h1>NovaDoc</h1>
            <span>AI Medical Document Intelligence</span>
          </div>
        </div>
        <div className="header-badge">
          <div className="dot"></div>
          Powered by Amazon Nova
        </div>
      </header>

      <div className="main-layout">
        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              📤 Upload
            </button>
            <button 
              className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
              onClick={() => setActiveTab('insights')}
            >
              🔍 Insights
            </button>
            <button 
              className={`tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              📋 Timeline
            </button>
          </div>

          {activeTab === 'upload' && (
            <UploadPanel 
              onDocumentProcessed={handleDocumentProcessed}
              isProcessing={isProcessing}
              setIsProcessing={setIsProcessing}
            />
          )}

          {activeTab === 'insights' && (
            <InsightsPanel insights={latestInsights} findings={allFindings} />
          )}

          {activeTab === 'timeline' && (
            <Timeline 
              documents={documents} 
              onSelectDocument={setSelectedDoc}
            />
          )}
        </div>

        {/* RIGHT COLUMN - Chat */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-icon purple">💬</div>
            <div>
              <h2>Ask NovaDoc</h2>
              <p>Chat about your medical records</p>
            </div>
          </div>
          <ChatPanel documents={documents} />
        </div>
      </div>

      {/* Document Detail Modal */}
      {selectedDoc && (
        <DocumentModal 
          document={selectedDoc} 
          onClose={() => setSelectedDoc(null)} 
        />
      )}
    </div>
  )
}

export default App
