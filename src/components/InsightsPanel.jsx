import React from 'react'

export default function InsightsPanel({ insights, findings }) {
  if (!insights) {
    return (
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-icon orange">🔍</div>
          <div>
            <h2>Clinical Insights</h2>
            <p>AI-generated analysis of your medical data</p>
          </div>
        </div>
        <div className="timeline-empty">
          <div className="timeline-empty-icon">🔬</div>
          <p>No insights yet.<br/>Upload a medical document to get AI-powered clinical analysis.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Risk Alerts */}
      {insights.riskAlerts && insights.riskAlerts.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-icon orange">⚠️</div>
            <div>
              <h2>Risk Alerts</h2>
              <p>{insights.riskAlerts.length} alert{insights.riskAlerts.length > 1 ? 's' : ''} detected</p>
            </div>
          </div>
          <div className="insights-container">
            {insights.riskAlerts.map((alert, i) => (
              <div key={i} className={`insight-alert ${alert.severity}`}>
                <div className="insight-alert-header">
                  <span className="insight-alert-severity">
                    {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🟢'} {alert.severity}
                  </span>
                </div>
                <h4>{alert.title}</h4>
                <p>{alert.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Findings Table */}
      {findings && findings.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-icon cyan">📊</div>
            <div>
              <h2>Lab Results</h2>
              <p>{findings.length} parameters analyzed</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="findings-table">
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Value</th>
                  <th>Reference</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{f.test}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>{f.value}</td>
                    <td style={{ fontSize: '0.7rem' }}>{f.range}</td>
                    <td>
                      <span className={`status-badge ${f.status}`}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {insights.recommendations && insights.recommendations.length > 0 && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-icon green">💡</div>
            <div>
              <h2>Recommendations</h2>
              <p>Evidence-based clinical suggestions</p>
            </div>
          </div>
          <ul className="recommendations-list">
            {insights.recommendations.map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Trend Analysis */}
      {insights.trendAnalysis && (
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-icon purple">📈</div>
            <div>
              <h2>Trend Analysis</h2>
              <p>Longitudinal health tracking</p>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {insights.trendAnalysis}
          </p>
        </div>
      )}
    </div>
  )
}
