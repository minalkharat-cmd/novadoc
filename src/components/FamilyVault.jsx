import React, { useState, useEffect } from 'react'

export default function FamilyVault({ onClose, onSwitch, activeProfile }) {
  const [profiles, setProfiles] = useState([])
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState('👤')

  const AVATARS = ['👨', '👩', '👴', '👵', '👦', '👧', '🧑', '👶']

  useEffect(() => {
    fetch('/api/profiles')
      .then(r => r.json())
      .then(data => setProfiles(data.profiles || []))
      .catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, avatar: newAvatar }),
    })
    const data = await res.json()
    if (data.success) {
      setProfiles(prev => [...prev, { id: data.id, ...data.profile }])
      setNewName('')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <div className="modal-title">👨‍👩‍👧‍👦 Family Health Vault</div>
        <p className="modal-subtitle">Manage separate health records for each family member</p>

        {/* Profile List */}
        <div className="family-profiles">
          {profiles.map(p => (
            <div
              key={p.id}
              className={`family-profile-card ${p.id === activeProfile?.id ? 'active' : ''}`}
              onClick={() => onSwitch(p.id)}
            >
              <div className="family-avatar">{p.avatar}</div>
              <div>
                <h4>{p.name}</h4>
                <span>{p.documentCount || 0} documents</span>
              </div>
              {p.id === activeProfile?.id && <span className="active-badge">Active</span>}
            </div>
          ))}
        </div>

        {/* Add New Profile */}
        <div className="add-profile-form">
          <h3>Add Family Member</h3>
          <div className="avatar-picker">
            {AVATARS.map(a => (
              <button
                key={a}
                className={`avatar-option ${newAvatar === a ? 'selected' : ''}`}
                onClick={() => setNewAvatar(a)}
              >
                {a}
              </button>
            ))}
          </div>
          <div className="chat-input-area" style={{ borderTop: 'none', paddingTop: 0 }}>
            <input
              className="chat-input"
              placeholder="Family member name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
            <button className="chat-send-btn" onClick={handleCreate} disabled={!newName.trim()}>
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
