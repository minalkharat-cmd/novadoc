import React from 'react'

export default function Timeline({ documents, onSelectDocument }) {
  if (documents.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-icon green">📋</div>
          <div>
            <h2>Medical Timeline</h2>
            <p>Your health records in chronological order</p>
          </div>
        </div>
        <div className="timeline-empty">
          <div className="timeline-empty-icon">📁</div>
          <p>No documents uploaded yet.<br/>Upload a medical document to start building your timeline.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-header-icon green">📋</div>
        <div>
          <h2>Medical Timeline</h2>
          <p>{documents.length} document{documents.length > 1 ? 's' : ''} analyzed</p>
        </div>
      </div>
      <div className="timeline-container">
        {documents.map((doc) => {
          const abnormalCount = (doc.extraction?.findings || []).filter(
            f => f.status !== 'normal'
          ).length

          return (
            <div 
              key={doc.id} 
              className="timeline-card"
              onClick={() => onSelectDocument(doc)}
            >
              <div className="timeline-card-header">
                <span className="timeline-card-type">
                  {doc.extraction?.documentType || 'Document'}
                </span>
                <span className="timeline-card-date">
                  {doc.extraction?.date || 'Unknown date'}
                </span>
              </div>
              <h4>{doc.extraction?.facility || doc.filename}</h4>
              <p>{doc.extraction?.summary}</p>
              {abnormalCount > 0 && (
                <div className="mt-8">
                  <span className="status-badge high">
                    {abnormalCount} abnormal value{abnormalCount > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
