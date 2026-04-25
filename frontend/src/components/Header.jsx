import React, { useState } from 'react';

export default function Header({ title, subtitle, userRole, sosAlerts, inventoryAlerts, hopeLatest, setCurrentPage }) {
  const [activeDropdown, setActiveDropdown] = useState(null);

  const totalAIAlerts = inventoryAlerts.length + (hopeLatest && hopeLatest.score < 3.0 ? 1 : 0);

  return (
    <div className="page-header global-header">
      <div>
        <h2 className="page-title">{title}</h2>
        <p className="page-subtitle">{subtitle}</p>
      </div>
      
      <div className="header-actions">
        {/* SOS Notifications */}
        <div className="notification-container">
          <button 
            className={`notification-btn ${activeDropdown === 'sos' ? 'active' : ''}`}
            onClick={() => setActiveDropdown(activeDropdown === 'sos' ? null : 'sos')}
            title="SOS Emergency Alerts"
          >
            🚨
            {sosAlerts.length > 0 && <span className="notification-badge sos">{sosAlerts.length}</span>}
          </button>
          
          {activeDropdown === 'sos' && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>🚨 SOS Emergency Alerts</h3>
                <span className="badge badge-critical">{sosAlerts.length} Active</span>
              </div>
              <div className="notification-list">
                {sosAlerts.length > 0 ? sosAlerts.map(sos => (
                  <div key={sos.id} className="notification-item unread" onClick={() => { setCurrentPage('reports'); setActiveDropdown(null); }}>
                    <div className="notification-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-red)' }}>🆘</div>
                    <div className="notification-content">
                      <div className="notification-title">{sos.title}</div>
                      <div className="notification-desc">{sos.description || `Incident at ${sos.location}`}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>📍 {sos.location}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>🛡️</div>
                    <p>No active SOS alerts</p>
                  </div>
                )}
              </div>
              <div className="notification-footer">
                <button onClick={() => { setCurrentPage('reports'); setActiveDropdown(null); }}>View All Incidents</button>
              </div>
            </div>
          )}
        </div>

        {/* AI Critical Alerts */}
        <div className="notification-container">
          <button 
            className={`notification-btn ${activeDropdown === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveDropdown(activeDropdown === 'alerts' ? null : 'alerts')}
            title="AI Agent Critical Alerts"
          >
            🔔
            {totalAIAlerts > 0 && (
              <span className="notification-badge">{totalAIAlerts}</span>
            )}
          </button>

          {activeDropdown === 'alerts' && (
            <div className="notification-dropdown">
              <div className="notification-header">
                <h3>🔔 AI Agent Critical Alerts</h3>
                <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px' }} onClick={() => setActiveDropdown(null)}>Close</button>
              </div>
              <div className="notification-list">
                {hopeLatest && hopeLatest.score < 3.0 && (
                  <div className="notification-item" style={{ borderLeft: '3px solid var(--accent-red)' }}>
                    <div className="notification-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>💙</div>
                    <div className="notification-content">
                      <div className="notification-title">Critical Hope Score Alert</div>
                      <div className="notification-desc">Morale dropped to {hopeLatest.score.toFixed(1)}/10. Guardian intervention suggested.</div>
                    </div>
                  </div>
                )}
                {inventoryAlerts.map(item => {
                  const qty = item.current_quantity ?? item.current_stock ?? 0;
                  return (
                    <div key={item.id} className="notification-item" onClick={() => { setCurrentPage('inventory'); setActiveDropdown(null); }}>
                      <div className="notification-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>📦</div>
                      <div className="notification-content">
                        <div className="notification-title">Low Stock: {item.item_name}</div>
                        <div className="notification-desc">{qty} {item.unit} remaining. Restock threshold hit.</div>
                      </div>
                    </div>
                  );
                })}
                {totalAIAlerts === 0 && (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: 32, marginBottom: 12 }}>✨</div>
                    <p>System operational. No alerts.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="header-divider" />

        {userRole === 'issue_raiser' && (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrentPage('reports')}>
            📝 New Report
          </button>
        )}
        {(userRole === 'admin' || userRole === 'warehouse_manager') && (
          <button className="btn btn-primary btn-sm" onClick={() => setCurrentPage('reports')}>
            📝 Global Actions
          </button>
        )}
      </div>
    </div>
  );
}
