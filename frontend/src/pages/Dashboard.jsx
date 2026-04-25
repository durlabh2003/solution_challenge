import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, getDocs, where } from 'firebase/firestore';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell } from 'recharts';

function MetricCard({ label, value, sub, icon, color, onClick }) {
  return (
    <div className="metric-card" style={{ '--metric-accent': color, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      <div className="metric-sub">{sub}</div>
    </div>
  );
}

function TaskCard({ task }) {
  const urgencyColor = {
    critical: 'var(--accent-red)',
    high: 'var(--accent-amber)',
    medium: 'var(--accent-primary)',
    low: 'var(--text-muted)',
  }[task.urgency_level] || 'var(--accent-primary)';

  const typeEmoji = {
    water: '💧', food: '🍛', medical: '🏥', logistics: '🚛', shelter: '⛺', other: '📋'
  }[task.task_type] || '📋';

  const confidence = task.ai_confidence || 1;
  const confClass = confidence >= 0.85 ? 'confidence-high' : confidence >= 0.6 ? 'confidence-med' : 'confidence-low';

  return (
    <div className="task-card" style={{ '--task-urgency-color': urgencyColor }}>
      <div className="task-card-header">
        <span className="task-card-title">{typeEmoji} {task.title}</span>
        <span className={`badge badge-${task.status?.replace('_', '-')}`}>{task.status}</span>
      </div>
      {task.description && (
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10, lineHeight: 1.5 }}>
          {task.description}
        </p>
      )}
      <div className="task-card-meta">
        <span className="task-meta-item">📍 {task.location_name || 'Unknown'}</span>
        {task.urgency_score && (
          <span className="task-meta-item">🔥 Urgency {task.urgency_score}/10</span>
        )}
        <span className={`confidence-pill ${confClass}`}>
          AI {Math.round(confidence * 100)}%
        </span>
        {task.created_from && task.created_from !== 'manual' && (
          <span className="task-meta-item">
            {task.created_from === 'voice' ? '🎙️' : task.created_from === 'photo' ? '📷' : '💬'} {task.created_from}
          </span>
        )}
      </div>
    </div>
  );
}

export default function Dashboard({ setCurrentPage, userRole }) {
  const [metrics, setMetrics] = useState({ tasks: 0, pending: 0, volunteers: 0, available: 0, my_tasks: 0 });
  const [tasks, setTasks] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [hopeScores, setHopeScores] = useState([]);
  const [hopeLatest, setHopeLatest] = useState(null);
  const [sosAlerts, setSosAlerts] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null); // 'alerts' | 'sos' | null
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Realtime subscriptions
    const qTasks = query(collection(db, 'tasks'), orderBy('created_at', 'desc'), limit(50));
    const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(allTasks.slice(0, 5));
      setMetrics(prev => ({
        ...prev,
        tasks: allTasks.length,
        pending: allTasks.filter(t => t.status === 'pending').length,
        my_tasks: allTasks.filter(t => t.status === 'in_progress').length // Simulating "My Tasks"
      }));
    });
    // ... (rest of useEffect logic remains similar)
    const qVolunteers = collection(db, 'volunteers');
    const unsubscribeVolunteers = onSnapshot(qVolunteers, (snapshot) => {
      const allVolunteers = snapshot.docs.map(doc => doc.data());
      setMetrics(prev => ({
        ...prev,
        volunteers: allVolunteers.length,
        available: allVolunteers.filter(v => v.availability_status === 'available').length,
      }));
    });

    const qInventory = query(collection(db, 'inventory'), orderBy('created_at', 'desc'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qHope = query(collection(db, 'hope_scores'), orderBy('score_date', 'asc'), limit(7));
    const unsubscribeHope = onSnapshot(qHope, (snapshot) => {
      const allHope = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHopeScores(allHope.map(h => ({ date: h.score_date, score: h.score, sentiment: Math.round(h.avg_sentiment * 100) })));
      setHopeLatest(allHope[allHope.length - 1]);
    });

    const qSOS = query(
      collection(db, 'field_reports'), 
      where('urgency_level', 'in', ['critical', 'high']),
      orderBy('created_at', 'desc'),
      limit(10)
    );
    const unsubscribeSOS = onSnapshot(qSOS, (snapshot) => {
      setSosAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    setLoading(false);

    return () => {
      unsubscribeTasks();
      unsubscribeVolunteers();
      unsubscribeInventory();
      unsubscribeHope();
      unsubscribeSOS();
    };
  }, []);

  const roleConfig = {
    admin: { title: '⚡ Strategic Command', subtitle: 'Global oversight & agent coordination' },
    warehouse_manager: { title: '📦 Logistics Hub', subtitle: 'Inventory burn rates & supply chains' },
    volunteer: { title: '🤝 Volunteer Portal', subtitle: 'My assignments & community impact' },
    issue_raiser: { title: '📝 Field Operations', subtitle: 'Reporting & incident tracking' },
  };

  const currentConfig = roleConfig[userRole] || roleConfig.admin;

  // Inventory alerts (burn rate check)
  const alerts = inventory.filter(item => {
    const qty = item.current_quantity ?? item.current_stock ?? 0;
    const rate = item.burn_rate_per_day ?? item.daily_burn_rate ?? 0;
    const threshold = item.restock_threshold ?? 100;
    return qty <= threshold || (rate > 0 && qty / rate <= 2);
  });

  return (
    <div className="fade-in">
      <div className="metric-grid section">
        {userRole === 'admin' && (
          <>
            <MetricCard label="Total Tasks" value={loading ? '…' : metrics.tasks} sub="Global volume" icon="✅" color="var(--accent-primary)" onClick={() => setCurrentPage('tasks')} />
            <MetricCard label="Volunteers" value={loading ? '…' : metrics.volunteers} sub={`${metrics.available} active`} icon="👥" color="var(--accent-green)" onClick={() => setCurrentPage('volunteers')} />
            <MetricCard label="Hope Score" value={loading || !hopeLatest ? '…' : `${hopeLatest.score?.toFixed(1)}/10`} sub="Sentiment index" icon="💚" color="var(--accent-purple)" onClick={() => setCurrentPage('hope')} />
            <MetricCard label="Active Alerts" value={inventory.filter(i => (i.current_quantity ?? 0) <= (i.restock_threshold ?? 100)).length} sub="Logistics needs" icon="🚨" color="var(--accent-red)" onClick={() => setCurrentPage('inventory')} />
          </>
        )}
        {userRole === 'warehouse_manager' && (
          <>
            <MetricCard label="Low Stock Items" value={inventory.filter(i => (i.current_quantity ?? 0) <= (i.restock_threshold ?? 100)).length} sub="Immediate restock needed" icon="📦" color="var(--accent-red)" onClick={() => setCurrentPage('inventory')} />
            <MetricCard label="Burn Rates" value="High" sub="Supply depletion alert" icon="🔥" color="var(--accent-amber)" onClick={() => setCurrentPage('inventory')} />
            <MetricCard label="Warehouses" value="5" sub="Across 3 cities" icon="🏢" color="var(--accent-primary)" onClick={() => setCurrentPage('inventory')} />
            <MetricCard label="Pending Tasks" value={metrics.pending} sub="Logistics focus" icon="🚛" color="var(--accent-green)" onClick={() => setCurrentPage('tasks')} />
          </>
        )}
        {userRole === 'volunteer' && (
          <>
            <MetricCard label="My Tasks" value={metrics.my_tasks} sub="Currently in progress" icon="🎯" color="var(--accent-primary)" onClick={() => setCurrentPage('tasks')} />
            <MetricCard label="Open Tasks" value={metrics.pending} sub="Available to pick up" icon="📂" color="var(--accent-green)" onClick={() => setCurrentPage('tasks')} />
            <MetricCard label="Community Hope" value={loading || !hopeLatest ? '…' : `${hopeLatest.score?.toFixed(1)}/10`} sub="Sentiment index" icon="💚" color="var(--accent-purple)" onClick={() => setCurrentPage('hope')} />
            <MetricCard label="My Impact" value="12" sub="Tasks completed" icon="✨" color="var(--accent-amber)" />
          </>
        )}
        {userRole === 'issue_raiser' && (
          <>
            <MetricCard label="My Reports" value="8" sub="Submitted this week" icon="📝" color="var(--accent-primary)" onClick={() => setCurrentPage('reports')} />
            <MetricCard label="Active Incidents" value={metrics.tasks} sub="Regional status" icon="📍" color="var(--accent-red)" onClick={() => setCurrentPage('tasks')} />
            <MetricCard label="Resolved" value="5" sub="Actions taken" icon="✅" color="var(--accent-green)" />
            <MetricCard label="AI Confidence" value="94%" sub="Report accuracy" icon="🤖" color="var(--accent-purple)" />
          </>
        )}
      </div>



      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Recent Tasks */}
        <div className="section" style={{ margin: 0 }}>
          <div className="section-title" style={{ justifyContent: 'space-between' }}>
            <span>📋 Recent Tasks</span>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('tasks')}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {loading
              ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)
              : tasks.map(t => <TaskCard key={t.id} task={t} />)
            }
          </div>
        </div>

        {/* Admin Sentinel Analytics - COMMANDER ONLY */}
      {userRole === 'admin' && (
        <div className="chart-container" style={{ marginBottom: 24, padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 10, color: 'var(--accent-primary)' }}>📈</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>Guardian Sentinel Analytics</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Historical Hope Score & Sentiment Trends</div>
              </div>
            </div>
            <div className="badge badge-high">REAL-TIME DATA</div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hopeScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hopeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 12 }}
                itemStyle={{ color: 'var(--accent-green)' }}
              />
              <Area 
                type="monotone" 
                dataKey="score" 
                name="Hope Score"
                stroke="#10b981" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#hopeGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>AVG SENTIMENT</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-primary)' }}>
                { hopeScores.length > 0 
                  ? (hopeScores.reduce((a,b) => a + (b.sentiment || 0), 0) / hopeScores.length).toFixed(1) 
                  : '0.0' }%
              </div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>RESPONSE EFFICIENCY</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-green)' }}>+14.2%</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>VOLUNTEER MORALE</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent-amber)' }}>High</div>
            </div>
          </div>
        </div>
      )}

        {/* Hope Score Chart */}
        <div>
          <div className="section-title">💚 Hope Score — Last 7 Days</div>
          <div className="chart-container">
            {hopeScores.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={hopeScores} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 8, color: 'var(--text-primary)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#scoreGrad)" dot={{ fill: '#10b981', r: 4 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="skeleton" style={{ height: 220 }} />
            )}
            {hopeLatest && (
              <div className="hope-score-display" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
                <div className="hope-score-big">{hopeLatest.score?.toFixed(1)}</div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Today's Hope Score</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {hopeLatest.tasks_completed} tasks done · {hopeLatest.volunteers_active} active
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Status */}
      <div>
        <div className="section-title">🤖 Agent Swarm Status</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            { name: 'Listener', icon: '📝', desc: 'Data-to-Task', status: 'active', color: 'var(--accent-primary)' },
            { name: 'Dispatcher', icon: '📡', desc: 'Volunteer Match', status: 'active', color: 'var(--accent-green)' },
            { name: 'Sentinel', icon: '🛡️', desc: 'Inventory Pred.', status: 'active', color: 'var(--accent-amber)' },
            { name: 'Translator', icon: '🌐', desc: 'Multi-dialect', status: 'active', color: 'var(--accent-purple)' },
            { name: 'Visionary', icon: '📷', desc: 'Photo Analysis', status: 'active', color: 'var(--accent-pink)' },
            { name: 'Guardian', icon: '💙', desc: 'Retention', status: 'active', color: 'var(--accent-cyan)' },
          ].map(agent => (
            <div key={agent.name} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{agent.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{agent.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{agent.desc}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: agent.color, animation: 'pulse-dot 2s infinite' }} />
                <span style={{ fontSize: 11, color: agent.color, fontWeight: 500 }}>Online</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
