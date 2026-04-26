import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc } from 'firebase/firestore';

const STATUS_ORDER = ['pending', 'assigned', 'in_progress', 'completed'];
const STATUS_LABELS = { pending: '⏳ Pending', assigned: '📡 Assigned', in_progress: '🔄 In Progress', completed: '✅ Completed' };
const TYPE_EMOJI = { water: '💧', food: '🍛', medical: '🏥', logistics: '🚛', shelter: '⛺', other: '📋' };

export default function TaskBoard({ userRole }) {
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', task_type: 'water', urgency_level: 'high', urgency_score: 7, location_name: '', quantity: '' });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const qTasks = query(collection(db, 'tasks'), orderBy('urgency_score', 'desc'));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qVolunteers = collection(db, 'volunteers');
    const unsubscribeVolunteers = onSnapshot(qVolunteers, (snapshot) => {
      const allVolunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVolunteers(allVolunteers.filter(v => v.availability_status === 'available'));
    });

    return () => {
      unsubscribeTasks();
      unsubscribeVolunteers();
    };
  }, []);

  async function createTask() {
    console.log("Attempting to create task with form:", form);
    if (!form.title || form.title.trim().length < 5) {
      alert("⚠️ Please enter a descriptive Task Title (min 5 chars).");
      return;
    }
    if (!form.location_name || form.location_name.trim().length < 3) {
      alert("⚠️ Please enter a specific Location Name (min 3 chars).");
      return;
    }
    setSaving(true);
    try {
      const taskData = {
        ...form,
        status: 'pending',
        created_from: 'manual',
        ai_confidence: 1.0,
        created_at: new Date().toISOString()
      };
      console.log("Sending to Firestore:", taskData);
      await addDoc(collection(db, 'tasks'), taskData);
      setShowModal(false);
      setForm({ title: '', description: '', task_type: 'water', urgency_level: 'high', urgency_score: 7, location_name: '', quantity: '' });
      alert("✅ Task created successfully!");
    } catch (error) {
      console.error("Firestore Error:", error);
      alert(`❌ Failed to create task: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(taskId, newStatus) {
    await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
  }

  async function assignVolunteer(taskId, volunteer) {
    await updateDoc(doc(db, 'tasks', taskId), {
      assigned_volunteer_id: volunteer.id,
      assigned_volunteer_name: volunteer.full_name || volunteer.name,
      status: 'assigned'
    });
  }

  async function autoDispatchTask(taskId) {
    setSaving(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: taskId })
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert(`Successfully dispatched to: ${data.assigned_to}\nMatch Score: ${data.match_score.toFixed(2)}`);
      } else {
        alert(`Dispatch Failed: ${data.message}`);
      }
    } catch (e) {
      console.error(e);
      alert('Error connecting to FastAPI backend');
    }
    setSaving(false);
    setSelectedTask(null);
  }

  const filtered = tasks.filter(t => {
    const matchFilter = filter === 'all' || t.status === filter;
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.location_name?.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const urgencyColor = { critical: 'var(--accent-red)', high: 'var(--accent-amber)', medium: 'var(--accent-primary)', low: 'var(--text-muted)' };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">✅ Task Board</h2>
          <p className="page-subtitle">{tasks.length} total tasks · {tasks.filter(t => t.status === 'pending').length} pending</p>
        </div>
        <button className="btn btn-primary" onClick={() => { console.log("Create Task clicked"); setShowModal(true); }}>+ Create Task</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          className="form-input"
          style={{ maxWidth: 220 }}
          placeholder="🔍 Search tasks..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {['all', ...STATUS_ORDER].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'All' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Kanban columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {STATUS_ORDER.map(status => {
          const col = filtered.filter(t => t.status === status);
          return (
            <div key={status}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>{STATUS_LABELS[status]}</span>
                <span style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', borderRadius: 99, fontSize: 11, padding: '2px 8px', fontWeight: 700 }}>{col.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.map(task => (
                  <div
                    key={task.id}
                    className="task-card"
                    style={{ '--task-urgency-color': urgencyColor[task.urgency_level] || 'var(--accent-primary)', cursor: 'pointer' }}
                    onClick={() => setSelectedTask(task)}
                  >
                    <div style={{ fontSize: 18, marginBottom: 4 }}>{TYPE_EMOJI[task.task_type] || '📋'}</div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, color: 'var(--text-primary)' }}>{task.title}</div>
                    {task.location_name && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>📍 {task.location_name}</div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                      <span className={`badge badge-${task.urgency_level || 'medium'}`}>{task.urgency_level || 'medium'}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        🔥 {task.urgency_score}/10
                      </span>
                    </div>
                    {task.ai_confidence < 1 && (
                      <div style={{ marginTop: 6 }}>
                        <span className={`confidence-pill ${task.ai_confidence >= 0.85 ? 'confidence-high' : task.ai_confidence >= 0.6 ? 'confidence-med' : 'confidence-low'}`}>
                          AI {Math.round((task.ai_confidence || 0) * 100)}%
                        </span>
                      </div>
                    )}
                    {task.assigned_volunteer_name && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent-green)' }}>
                        👤 {task.assigned_volunteer_name}
                      </div>
                    )}
                  </div>
                ))}
                {col.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '20px 0' }}>
                    No tasks here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{TYPE_EMOJI[selectedTask.task_type]} {selectedTask.title}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            {selectedTask.description && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 14, lineHeight: 1.6 }}>{selectedTask.description}</p>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                ['Status', <span className={`badge badge-${selectedTask.status?.replace('_','-')}`}>{selectedTask.status}</span>],
                ['Urgency', `${selectedTask.urgency_score}/10 (${selectedTask.urgency_level})`],
                ['Location', selectedTask.location_name || 'Unknown'],
                ['Source', selectedTask.created_from],
                ['AI Confidence', `${Math.round((selectedTask.ai_confidence || 1)*100)}%`],
                ['Quantity', selectedTask.quantity || '—'],
              ].map(([label, val]) => (
                <div key={label} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{val}</div>
                </div>
              ))}
            </div>
            {/* AI Volunteer Suggestions */}
            {selectedTask.status === 'pending' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)' }}>🤖 AI Dispatcher Suggestions</div>
                  <span className="badge badge-high" style={{ fontSize: 10 }}>TOP MATCHES</span>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {volunteers
                    .filter(v => v.availability_status === 'available' && !v.current_task_id)
                    .sort((a, b) => {
                      // Simple match logic: Prioritize volunteers with matching role or skills
                      const matchA = a.role?.toLowerCase() === selectedTask.task_type?.toLowerCase() ? 10 : 0;
                      const matchB = b.role?.toLowerCase() === selectedTask.task_type?.toLowerCase() ? 10 : 0;
                      return matchB - matchA;
                    })
                    .slice(0, 3)
                    .map(v => (
                      <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(59,130,246,0.05)', borderRadius: 10, border: '1px solid rgba(59,130,246,0.1)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{v.full_name || v.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.role || 'Volunteer'} · {v.experience_level || 'General'}</div>
                        </div>
                        <button 
                          className="btn btn-primary btn-sm" 
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => assignVolunteer(selectedTask.id, v).then(() => setSelectedTask(null))}
                        >
                          Dispatch
                        </button>
                      </div>
                    ))
                  }
                  <button 
                    className="btn btn-ghost btn-sm" 
                    style={{ width: '100%', justifyContent: 'center', marginTop: 4, background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)' }}
                    onClick={() => autoDispatchTask(selectedTask.id)}
                    disabled={saving}
                  >
                    {saving ? '⏳ Dispatching...' : '✨ Auto-Dispatch Agent (Deep Match)'}
                  </button>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              {selectedTask.status !== 'completed' && (
                <button className="btn btn-success" onClick={() => { updateStatus(selectedTask.id, 'completed'); setSelectedTask(null); }}>
                  ✅ Mark Complete
                </button>
              )}
              {selectedTask.status === 'pending' && (
                <button className="btn btn-primary" onClick={() => { updateStatus(selectedTask.id, 'in_progress'); setSelectedTask(null); }}>
                  🔄 Start Task
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">➕ Create New Task</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Task Title *</label>
                <input className="form-input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Deliver water to Azra village" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details about this task..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.task_type} onChange={e => setForm({ ...form, task_type: e.target.value })}>
                    {['water','food','medical','logistics','shelter','other'].map(t => <option key={t} value={t}>{TYPE_EMOJI[t]} {t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Urgency Level</label>
                  <select className="form-select" value={form.urgency_level} onChange={e => setForm({ ...form, urgency_level: e.target.value })}>
                    {['critical','high','medium','low'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Urgency Score (1–10)</label>
                  <input className="form-input" type="number" min={1} max={10} value={form.urgency_score} onChange={e => setForm({ ...form, urgency_score: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="e.g. 200L, 50 units" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Location</label>
                <input className="form-input" value={form.location_name} onChange={e => setForm({ ...form, location_name: e.target.value })} placeholder="e.g. Azra Village, Delhi" />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createTask}>
                  {saving ? '⏳ Saving...' : '✅ Create Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
