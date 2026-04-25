import React from 'react';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⚡', tip: 'Overview & Metrics' },
  { id: 'tasks',     label: 'Task Board',  icon: '✅', tip: 'Manage Tasks' },
  { id: 'reports',   label: 'Field Reports', icon: '📝', tip: 'Submit & View Reports' },
  { id: 'volunteers',label: 'Volunteers',  icon: '👥', tip: 'Volunteer Directory' },
  {id: 'inventory', label: 'Inventory',   icon: '📦', tip: 'Supply Management' },
  { id: 'hope',      label: 'Hope Score',  icon: '💚', tip: 'Sentiment Dashboard' },
  { id: 'sos',       label: 'SOS Portal',  icon: '🆘', tip: 'Broadcast Emergency' },
  { id: 'instructions', label: 'How to Use', icon: '📖', tip: 'User Manual' },
];

const ROLE_CONFIG = {
  admin: { label: 'Admin', icon: '🛡️', access: ['dashboard', 'tasks', 'reports', 'volunteers', 'inventory', 'hope', 'sos', 'instructions'] },
  warehouse_manager: { label: 'Warehouse Manager', icon: '📦', access: ['dashboard', 'inventory', 'tasks', 'instructions'] },
  volunteer: { label: 'Volunteer', icon: '👥', access: ['dashboard', 'tasks', 'hope', 'instructions'] },
  issue_raiser: { label: 'Field Worker', icon: '📝', access: ['dashboard', 'reports', 'sos', 'instructions'] },
};

export default function Sidebar({ currentPage, setCurrentPage, userRole, setUserRole }) {
  const filteredNav = NAV_ITEMS.filter(item => ROLE_CONFIG[userRole].access.includes(item.id));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>OptiRelief</h1>
        <p>AI Coordination Platform</p>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label" title={`Current Identity: ${ROLE_CONFIG[userRole].label}`}>
          Navigation ({ROLE_CONFIG[userRole].label})
        </div>
        {filteredNav.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
            onClick={() => setCurrentPage(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="nav-section-label" style={{ marginBottom: 8 }}>Switch Identity</div>
        <div className="role-switcher">
          {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
            <button 
              key={role}
              className={`role-btn ${userRole === role ? 'active' : ''}`}
              onClick={() => setUserRole(role)}
              title={cfg.label}
            >
              {cfg.icon}
            </button>
          ))}
        </div>

        <div className="status-indicator" style={{ marginTop: 16 }}>
          <div className="status-dot" />
          <span className="status-text">5 Agents Active</span>
        </div>
      </div>
    </aside>
  );
}
