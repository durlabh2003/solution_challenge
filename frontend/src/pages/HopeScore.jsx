import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function HopeScore() {
  const [scores, setScores] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [form, setForm] = useState({ avg_sentiment: 0.7, tasks_completed: 0, tasks_pending: 0, volunteers_active: 0, notes: '' });
  const [saving, setSaving] = useState(false);
  const [realtimePending, setRealtimePending] = useState(0);


  useEffect(() => {
    const qHope = query(collection(db, 'hope_scores'), orderBy('score_date', 'asc'));
    const unsubscribe = onSnapshot(qHope, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setScores(data);
      setLatest(data.length > 0 ? data[data.length - 1] : null);
      setLoading(false);
    });

    const qTasks = query(collection(db, 'tasks'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const pendingCount = snapshot.docs.filter(doc => doc.data().status === 'pending').length;
      setRealtimePending(pendingCount);
    });

    return () => {
      unsubscribe();
      unsubscribeTasks();
    };

  }, []);

  async function logScore() {
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/guardian`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      const data = await response.json();
      if (data.status === 'success') {
        // The real-time listener will update the list automatically
        setShowLogModal(false);
        setForm({ avg_sentiment: 0.7, tasks_completed: 0, tasks_pending: 0, volunteers_active: 0, notes: '' });
      } else {
        alert("Guardian Agent Error: " + data.message);
      }
    } catch (e) {
      console.error("Backend Connection Error:", e);
      alert("Error connecting to the Guardian Agent backend.");
    } finally {
      setSaving(false);
    }
  }

  const chartData = scores.map(s => ({
    date: s.score_date,
    score: s.score,
    sentiment: Math.round(s.avg_sentiment * 100),
    completion: s.tasks_completed,
  }));

  const getScoreColor = (s) => s >= 7.5 ? 'var(--accent-green)' : s >= 5 ? 'var(--accent-amber)' : 'var(--accent-red)';
  const getScoreLabel = (s) => s >= 7.5 ? '🌟 Excellent' : s >= 5 ? '😐 Moderate' : '😔 Critical';

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">💚 Hope Score Dashboard</h2>
          <p className="page-subtitle">Guardian Agent — Sentiment analysis & volunteer wellness tracking (Firebase)</p>
        </div>
        <button className="btn btn-primary" onClick={() => {
          setForm(f => ({ ...f, tasks_pending: realtimePending }));
          setShowLogModal(true);
        }}>📝 Log Today's Score</button>

      </div>

      {/* Hero Score */}
      {latest && (
        <div className="card" style={{ marginBottom: 24, background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(6,182,212,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1, color: getScoreColor(latest.score) }}>
                {latest.score?.toFixed(1)}
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>out of 10</div>
              <div style={{ marginTop: 8, fontSize: 18 }}>{getScoreLabel(latest.score)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'Avg Sentiment', value: `${Math.round(latest.avg_sentiment * 100)}%`, icon: '😊', color: 'var(--accent-green)' },
                  { label: 'Tasks Completed', value: latest.tasks_completed, icon: '✅', color: 'var(--accent-primary)' },
                  { label: 'Tasks Pending', value: realtimePending, icon: '⏳', color: 'var(--accent-amber)' },

                  { label: 'Volunteers Active', value: latest.volunteers_active, icon: '👥', color: 'var(--accent-purple)' },
                ].map(item => (
                  <div key={item.label} style={{ background: 'var(--bg-surface)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: 20, marginBottom: 4 }}>{item.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.label}</div>
                  </div>
                ))}
              </div>
              {latest.notes && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  "{latest.notes}"
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Hope Score Trend */}
        <div className="chart-container">
          <div className="section-title">📈 Hope Score Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hopeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2.5} fill="url(#hopeGrad)" dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Trend */}
        <div className="chart-container">
          <div className="section-title">😊 Sentiment & Completions</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 8, color: 'var(--text-primary)' }} />
              <Line type="monotone" dataKey="sentiment" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} name="Sentiment %" />
              <Line type="monotone" dataKey="completion" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="Completed Tasks" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* History Table */}
      <div className="section-title">📅 Score History</div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Hope Score</th>
              <th>Sentiment</th>
              <th>Completed</th>
              <th>Pending</th>
              <th>Active Volunteers</th>
              <th>Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}><div className="skeleton" style={{ height: 40 }} /></td></tr>
            ) : [...scores].reverse().map(s => (
              <tr key={s.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{s.score_date}</td>
                <td>
                  <span style={{ fontSize: 20, fontWeight: 800, color: getScoreColor(s.score) }}>{s.score?.toFixed(1)}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="progress-bar" style={{ width: 60, '--progress-color': s.avg_sentiment >= 0.7 ? 'var(--accent-green)' : s.avg_sentiment >= 0.4 ? 'var(--accent-amber)' : 'var(--accent-red)' }}>
                      <div className="progress-fill" style={{ width: `${s.avg_sentiment * 100}%` }} />
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{Math.round(s.avg_sentiment * 100)}%</span>
                  </div>
                </td>
                <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{s.tasks_completed}</td>
                <td style={{ color: 'var(--accent-amber)', fontWeight: 600 }}>{s.tasks_pending}</td>
                <td style={{ color: 'var(--accent-purple)', fontWeight: 600 }}>{s.volunteers_active}</td>
                <td><span style={{ fontSize: 16 }}>{getScoreLabel(s.score)}</span></td>
                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Log Modal */}
      {showLogModal && (
        <div className="modal-overlay" onClick={() => setShowLogModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📝 Log Today's Hope Score</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Average Sentiment Score (0.0 – 1.0)</label>
                <input className="form-input" type="number" min={0} max={1} step={0.01} value={form.avg_sentiment} onChange={e => setForm({ ...form, avg_sentiment: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Tasks Completed</label>
                  <input className="form-input" type="number" value={form.tasks_completed} onChange={e => setForm({ ...form, tasks_completed: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tasks Pending</label>
                  <input className="form-input" type="number" value={form.tasks_pending} onChange={e => setForm({ ...form, tasks_pending: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Volunteers Active</label>
                  <input className="form-input" type="number" value={form.volunteers_active} onChange={e => setForm({ ...form, volunteers_active: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <textarea className="form-textarea" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Morale improving after water supply restored..." style={{ minHeight: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowLogModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={logScore} disabled={saving}>
                  {saving ? '⏳ Saving...' : '💚 Log Score'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
