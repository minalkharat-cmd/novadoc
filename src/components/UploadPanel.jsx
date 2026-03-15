import React, { useRef, useState, useCallback } from 'react'

const LABELS = {
  en: {
    title: 'Upload Medical Document',
    subtitle: 'Prescriptions, Lab Reports, X-rays, Discharge Summaries',
    processing: 'Processing Document',
    processingSub: 'Amazon Nova is analyzing your medical document',
    drop: 'Drop your medical document here',
    browse: 'or click to browse • PNG, JPEG, WebP, PDF up to 20MB',
    steps: [
      'Uploading document...',
      'Analyzing with Amazon Nova Vision...',
      'Extracting medical data...',
      'Generating clinical insights...',
      'Complete!'
    ],
  },
  hi: {
    title: 'मेडिकल डॉक्यूमेंट अपलोड करें',
    subtitle: 'प्रिस्क्रिप्शन, लैब रिपोर्ट, एक्स-रे, डिस्चार्ज समरी',
    processing: 'डॉक्यूमेंट प्रोसेस हो रहा है',
    processingSub: 'Amazon Nova आपके मेडिकल डॉक्यूमेंट का विश्लेषण कर रहा है',
    drop: 'अपना मेडिकल डॉक्यूमेंट यहाँ छोड़ें',
    browse: 'या ब्राउज़ करने के लिए क्लिक करें • PNG, JPEG, WebP, PDF 20MB तक',
    steps: [
      'डॉक्यूमेंट अपलोड हो रहा है...',
      'Amazon Nova Vision से विश्लेषण...',
      'मेडिकल डेटा निकाला जा रहा है...',
      'नैदानिक जानकारी बनाई जा रही है...',
      'पूर्ण!'
    ],
  },
}

export default function UploadPanel({ onDocumentProcessed, isProcessing, setIsProcessing, lang = 'en' }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [error, setError] = useState(null)

  const L = LABELS[lang]

  const processFile = useCallback(async (file) => {
    setError(null)
    setIsProcessing(true)
    setProcessingStep(0)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('lang', lang)

    try {
      const stepInterval = setInterval(() => {
        setProcessingStep(prev => {
          if (prev < L.steps.length - 2) return prev + 1
          clearInterval(stepInterval)
          return prev
        })
      }, 800)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(stepInterval)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Upload failed')
      }

      setProcessingStep(L.steps.length - 1)
      const data = await response.json()

      setTimeout(() => {
        onDocumentProcessed(data.document, data.comparison)
        setIsProcessing(false)
        setProcessingStep(0)
      }, 600)
    } catch (err) {
      setError(err.message)
      setIsProcessing(false)
      setProcessingStep(0)
    }
  }, [onDocumentProcessed, setIsProcessing, lang, L.steps.length])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [processFile])

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0]
    if (file) processFile(file)
  }, [processFile])

  if (isProcessing) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-icon cyan">📤</div>
          <div>
            <h2>{L.processing}</h2>
            <p>{L.processingSub}</p>
          </div>
        </div>
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <div className="processing-steps">
            {L.steps.map((step, i) => (
              <div
                key={i}
                className={`processing-step ${i === processingStep ? 'active' : ''} ${i < processingStep ? 'done' : ''}`}
              >
                <div className="step-dot"></div>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-header-icon cyan">📤</div>
        <div>
          <h2>{L.title}</h2>
          <p>{L.subtitle}</p>
        </div>
      </div>

      <div
        className={`upload-zone ${dragOver ? 'dragover' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="upload-zone-content">
          <div className="upload-icon">📄</div>
          <h3>{L.drop}</h3>
          <p>{L.browse}</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
        />
      </div>

      {error && (
        <div className="insight-alert high mt-16">
          <div className="insight-alert-header">
            <span className="insight-alert-severity">Error</span>
          </div>
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
