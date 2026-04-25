import React, { useState } from 'react';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function IssueRaiser() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    issue_type: 'medical',
    description: '',
    urgency: 'high'
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'field_reports'), {
        ...form,
        title: `SOS: ${form.issue_type.toUpperCase()} - ${form.location}`,
        status: 'pending',
        created_at: serverTimestamp(),
        created_from: 'sos_portal',
        urgency_level: form.urgency
      });
      setSubmitted(true);
    } catch (error) {
      console.error("SOS Submission failed:", error);
      alert("Submission failed. Please try again or call emergency services.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="fade-in" style={{ maxWidth: 500, margin: '100px auto', textAlign: 'center', padding: 40, background: 'var(--bg-elevated)', borderRadius: 24, border: '1px solid var(--border-visible)' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
        <h2 style={{ marginBottom: 16 }}>Request Received</h2>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
          Your SOS request has been broadcast to the nearest OptiRelief Command Center and registered volunteers. Please stay calm and wait for assistance.
        </p>
        <button className="btn btn-primary" onClick={() => setSubmitted(false)}>Send Another Request</button>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 600, margin: '40px auto', padding: '0 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>🆘 Emergency SOS Portal</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Immediate disaster assistance request for civilians and first responders.</p>
      </div>

      <div className="card" style={{ padding: 32, background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input 
                className="form-input" 
                required 
                value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Full name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number *</label>
              <input 
                className="form-input" 
                required 
                value={form.phone}
                onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="For rescue contact"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Incident Location *</label>
            <input 
              className="form-input" 
              required 
              value={form.location}
              onChange={e => setForm({...form, location: e.target.value})}
              placeholder="e.g., Block B, Near Metro Pillar 14"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Type of Emergency</label>
              <select 
                className="form-select" 
                value={form.issue_type}
                onChange={e => setForm({...form, issue_type: e.target.value})}
              >
                <option value="medical">Medical / Injury</option>
                <option value="fire">Fire Incident</option>
                <option value="flood">Water / Flooding</option>
                <option value="shelter">Need Shelter</option>
                <option value="missing">Missing Person</option>
                <option value="other">Other Crisis</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency Level</label>
              <select 
                className="form-select" 
                value={form.urgency}
                onChange={e => setForm({...form, urgency: e.target.value})}
                style={{ color: form.urgency === 'critical' ? 'var(--accent-red)' : 'var(--accent-amber)' }}
              >
                <option value="critical">CRITICAL - Immediate Danger</option>
                <option value="high">HIGH - Urgent Needs</option>
                <option value="medium">MEDIUM - Stability Support</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Describe the Situation</label>
            <textarea 
              className="form-input" 
              rows={4}
              value={form.description}
              onChange={e => setForm({...form, description: e.target.value})}
              placeholder="Provide specific details to help rescue teams..."
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ 
              height: 54, 
              fontSize: 18, 
              fontWeight: 700, 
              background: 'var(--accent-red)',
              marginTop: 10,
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.3)'
            }}
          >
            {loading ? 'BROADCASTING SOS...' : '🚨 BROADCAST SOS REQUEST'}
          </button>
        </form>
      </div>

      <div style={{ marginTop: 32, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
        <p>By clicking Broadcast, your location and contact details will be shared with the OptiRelief Emergency Network.</p>
      </div>
    </div>
  );
}
