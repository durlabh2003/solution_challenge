import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';

const SKILL_OPTIONS = ['medical','driving','logistics','IT','coordination','community-outreach','translation','first-aid','pediatrics','data-analysis','python','emergency'];

export default function Volunteers({ userRole }) {
  const [volunteers, setVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [form, setForm] = useState({ name: '', full_name: '', phone: '', email: '', location_name: '', skills: [], role: 'volunteer', languages: ['english'] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const qVolunteers = query(collection(db, 'volunteers'), orderBy('created_at', 'desc'));
    const unsubscribe = onSnapshot(qVolunteers, (snapshot) => {
      setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  async function toggleSkill(skill) {
    setForm(f => ({
      ...f,
      skills: f.skills.includes(skill) ? f.skills.filter(s => s !== skill) : [...f.skills, skill]
    }));
  }

  async function saveVolunteer() {
    console.log("Attempting to register volunteer with form:", form);
    const displayName = form.name || form.full_name;
    
    // Strict Validation
    if (!displayName) {
      alert("⚠️ Please enter a Full Name before registering.");
      return;
    }
    const phoneRegex = /^[0-9+]{10,15}$/;
    if (!phoneRegex.test(form.phone)) {
      alert("⚠️ Please enter a valid phone number (10-15 digits).");
      return;
    }
    if ((form.location_name || '').trim().length < 3) {
      alert("⚠️ Please enter a specific location.");
      return;
    }

    setSaving(true);
    try {
      const volunteerData = {
        name: displayName,
        full_name: displayName,
        phone: form.phone,
        email: form.email,
        location_name: form.location_name,
        skills: form.skills,
        role: form.role,
        languages: form.languages,
        availability_status: 'available',
        churn_risk_score: 0,
        sentiment_score: 0.75,
        tasks_completed: 0,
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      console.log("Sending to Firestore:", volunteerData);
      await addDoc(collection(db, 'volunteers'), volunteerData);
      setShowModal(false);
      setForm({ name: '', full_name: '', phone: '', email: '', location_name: '', skills: [], role: 'volunteer', languages: ['english'] });
      alert("✅ Volunteer registered successfully!");
    } catch (error) {
      console.error("Firestore Error:", error);
      alert(`❌ Registration failed: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id, status) {
    await updateDoc(doc(db, 'volunteers', id), { availability_status: status });
  }

  const filtered = volunteers.filter(v => {
    const nm = (v.full_name || v.name || '').toLowerCase();
    const matchSearch = !search || nm.includes(search.toLowerCase()) || (v.location_name || '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.availability_status === filterStatus;
    return matchSearch && matchStatus;
  });

  const churnAtRisk = volunteers.filter(v => (v.churn_risk_score || 0) >= 0.5);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">👥 Volunteers</h2>
          <p className="page-subtitle">{volunteers.length} registered · {volunteers.filter(v => v.availability_status === 'available').length} available (Firebase)</p>
        </div>
        <button className="btn btn-primary" onClick={() => { console.log("Register Volunteer clicked"); setShowModal(true); }}>+ Register Volunteer</button>
      </div>


      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="form-input" style={{ maxWidth: 220 }} placeholder="🔍 Search volunteers..." value={search} onChange={e => setSearch(e.target.value)} />
        {['all','available','busy','offline'].map(s => (
          <button key={s} className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilterStatus(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Status</th>
              <th>Skills</th>
              <th>Location</th>
              <th>Tasks Done</th>
              <th>Churn Risk</th>
              <th>Sentiment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div className="skeleton" style={{ height: 40 }} /></td></tr>
            ) : filtered.map(v => (
              <tr key={v.id}>
                <td>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.full_name || v.name}</div>
                  {v.email && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.email}</div>}
                </td>
                <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{v.role}</span></td>
                <td><span className={`badge badge-${v.availability_status}`}>{v.availability_status}</span></td>
                <td>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {(v.skills || []).slice(0, 3).map(s => (
                      <span key={s} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', borderRadius: 99, fontSize: 10, padding: '2px 8px', fontWeight: 500 }}>{s}</span>
                    ))}
                    {(v.skills || []).length > 3 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{(v.skills || []).length - 3}</span>}
                  </div>
                </td>
                <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{v.location_name || '—'}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent-primary)', textAlign: 'center' }}>{v.tasks_completed ?? 0}</td>
                <td>
                  {(() => {
                    const risk = v.churn_risk_score || 0;
                    const color = risk >= 0.6 ? 'var(--accent-red)' : risk >= 0.35 ? 'var(--accent-amber)' : 'var(--accent-green)';
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div className="progress-bar" style={{ width: 60, '--progress-color': color }}>
                          <div className="progress-fill" style={{ width: `${risk * 100}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color, fontWeight: 600 }}>{Math.round(risk * 100)}%</span>
                      </div>
                    );
                  })()}
                </td>
                <td>
                  {(() => {
                    const s = v.sentiment_score || 0.5;
                    const emoji = s >= 0.7 ? '😊' : s >= 0.4 ? '😐' : '😔';
                    const color = s >= 0.7 ? 'var(--accent-green)' : s >= 0.4 ? 'var(--accent-amber)' : 'var(--accent-red)';
                    return <span style={{ color }}>{emoji} {Math.round(s * 100)}%</span>;
                  })()}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {v.availability_status !== 'available' && (
                      <button className="btn btn-sm btn-success" onClick={() => updateStatus(v.id, 'available')}>✓ Available</button>
                    )}
                    {v.availability_status === 'available' && (
                      <button className="btn btn-sm btn-ghost" onClick={() => updateStatus(v.id, 'offline')}>Offline</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>No volunteers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">👤 Register Volunteer</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full Name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Role</label>
                  <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                    <option value="volunteer">Volunteer</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91-XXXXXXXXXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Delhi, India" />
              </div>
              <div className="form-group">
                <label className="form-label">Skills (select all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {SKILL_OPTIONS.map(skill => (
                    <button key={skill} type="button"
                      className="btn btn-sm"
                      style={{ background: form.skills.includes(skill) ? 'rgba(59,130,246,0.2)' : 'var(--bg-surface)', color: form.skills.includes(skill) ? 'var(--accent-primary)' : 'var(--text-secondary)', border: `1px solid ${form.skills.includes(skill) ? 'rgba(59,130,246,0.4)' : 'var(--border-visible)'}` }}
                      onClick={() => toggleSkill(skill)}>
                      {skill}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveVolunteer}>
                  {saving ? '⏳ Saving...' : '✅ Register'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
