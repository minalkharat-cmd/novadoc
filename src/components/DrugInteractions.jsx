import React from 'react'

const LABELS = {
  en: {
    title: 'Drug Interaction Checker',
    subtitle: 'AI-powered medication safety analysis',
    meds: 'Current Medications',
    interactions: 'Detected Interactions',
    noInteractions: 'No interactions detected',
    noMeds: 'No medications found. Upload a prescription to see drug interaction analysis.',
    severity: { major: 'MAJOR', moderate: 'MODERATE', minor: 'MINOR' },
  },
  hi: {
    title: 'दवा इंटरैक्शन चेकर',
    subtitle: 'AI-संचालित दवा सुरक्षा विश्लेषण',
    meds: 'वर्तमान दवाइयाँ',
    interactions: 'पाई गई इंटरैक्शन',
    noInteractions: 'कोई इंटरैक्शन नहीं मिली',
    noMeds: 'कोई दवाई नहीं मिली। दवा इंटरैक्शन विश्लेषण के लिए प्रिस्क्रिप्शन अपलोड करें।',
    severity: { major: 'गंभीर', moderate: 'मध्यम', minor: 'मामूली' },
  },
}

export default function DrugInteractions({ medications, interactions, lang = 'en' }) {
  const L = LABELS[lang]

  if (!medications || medications.length === 0) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-icon orange">💊</div>
          <div>
            <h2>{L.title}</h2>
            <p>{L.subtitle}</p>
          </div>
        </div>
        <div className="timeline-empty">
          <div className="timeline-empty-icon">💊</div>
          <p>{L.noMeds}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card">
      <div className="card-header">
        <div className="card-header-icon orange">💊</div>
        <div>
          <h2>{L.title}</h2>
          <p>{L.subtitle}</p>
        </div>
      </div>

      {/* Current Medications */}
      <div className="mb-16">
        <h3 className="section-label">💉 {L.meds}</h3>
        <div className="med-pills">
          {medications.map((med, i) => (
            <span key={i} className="med-pill">{med}</span>
          ))}
        </div>
      </div>

      {/* Interactions */}
      <div>
        <h3 className="section-label">⚠️ {L.interactions}</h3>
        {interactions.length === 0 ? (
          <div className="insight-alert low">
            <p>✅ {L.noInteractions}</p>
          </div>
        ) : (
          <div className="insights-container">
            {interactions.map((ix, i) => (
              <div key={i} className={`insight-alert ${ix.severity === 'major' ? 'high' : ix.severity === 'moderate' ? 'medium' : 'low'}`}>
                <div className="insight-alert-header">
                  <span className="insight-alert-severity">
                    {ix.severity === 'major' ? '🔴' : ix.severity === 'moderate' ? '🟡' : '🟢'}{' '}
                    {L.severity[ix.severity] || ix.severity.toUpperCase()}
                  </span>
                </div>
                <h4>{ix.drugs.join(' + ')}</h4>
                <p>{ix.detail}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
