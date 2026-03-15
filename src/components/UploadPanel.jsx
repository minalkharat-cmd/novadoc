import React, { useRef, useState, useCallback } from 'react'

const PROCESSING_STEPS = [
  'Uploading document...',
  'Analyzing with Amazon Nova Vision...',
  'Extracting medical data...',
  'Generating clinical insights...',
  'Complete!'
]

export default function UploadPanel({ onDocumentProcessed, isProcessing, setIsProcessing }) {
  const fileInputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)
  const [processingStep, setProcessingStep] = useState(0)
  const [error, setError] = useState(null)

  const processFile = useCallback(async (file) => {
    setError(null)
    setIsProcessing(true)
    setProcessingStep(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      // Simulate step progression
      const stepInterval = setInterval(() => {
        setProcessingStep(prev => {
          if (prev < PROCESSING_STEPS.length - 2) return prev + 1
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

      setProcessingStep(PROCESSING_STEPS.length - 1)
      const data = await response.json()

      setTimeout(() => {
        onDocumentProcessed(data.document)
        setIsProcessing(false)
        setProcessingStep(0)
      }, 600)
    } catch (err) {
      setError(err.message)
      setIsProcessing(false)
      setProcessingStep(0)
    }
  }, [onDocumentProcessed, setIsProcessing])

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
            <h2>Processing Document</h2>
            <p>Amazon Nova is analyzing your medical document</p>
          </div>
        </div>
        <div className="processing-overlay">
          <div className="processing-spinner"></div>
          <div className="processing-steps">
            {PROCESSING_STEPS.map((step, i) => (
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
          <h2>Upload Medical Document</h2>
          <p>Prescriptions, Lab Reports, X-rays, Discharge Summaries</p>
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
          <h3>Drop your medical document here</h3>
          <p>or click to browse • PNG, JPEG, WebP, PDF up to 20MB</p>
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
