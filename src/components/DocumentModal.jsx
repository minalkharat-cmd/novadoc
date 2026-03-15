import React from 'react'

export default function DocumentModal({ document: doc, onClose }) {
  if (!doc) return null

  const { extraction, insights } = doc

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        
        <div className="timeline-card-type mb-8">
          {extraction?.documentType || 'Medical Document'}
        </div>
        <h2 className="modal-title">{extraction?.facility || doc.filename}</h2>
        <p className="modal-subtitle">
          {extraction?.date || 'Unknown date'} • Patient: {extraction?.patientName || 'N/A'}
        </p>

        {/* Summary */}
        <div className="modal-section">
          <h3>📋 Clinical Summary</h3>
          <div className="modal-summary">{extraction?.summary}</div>
        </div>

        {/* Findings */}
        {extraction?.findings && extraction.findings.length > 0 && (
          <div className="modal-section">
            <h3>🔬 Detailed Findings</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="findings-table">
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Value</th>
                    <th>Reference Range</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {extraction.findings.map((f, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.test}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{f.value}</td>
                      <td style={{ fontSize: '0.75rem' }}>{f.range}</td>
                      <td><span className={`status-badge ${f.status}`}>{f.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Risk Alerts */}
        {insights?.riskAlerts && insights.riskAlerts.length > 0 && (
          <div className="modal-section">
            <h3>⚠️ Risk Alerts</h3>
            <div className="insights-container">
              {insights.riskAlerts.map((alert, i) => (
                <div key={i} className={`insight-alert ${alert.severity}`}>
                  <div className="insight-alert-header">
                    <span className="insight-alert-severity">{alert.severity}</span>
                  </div>
                  <h4>{alert.title}</h4>
                  <p>{alert.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {insights?.recommendations && insights.recommendations.length > 0 && (
          <div className="modal-section">
            <h3>💡 Recommendations</h3>
            <ul className="recommendations-list">
              {insights.recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
