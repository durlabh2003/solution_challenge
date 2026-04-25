import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area, CartesianGrid } from 'recharts';

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [restocks, setRestocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [logModal, setLogModal] = useState(null); // item id
  const [form, setForm] = useState({ item_name: '', category: 'essentials', current_quantity: 0, unit: 'units', location_name: '', restock_threshold: 100, burn_rate_per_day: 0 });
  const [newLocation, setNewLocation] = useState({ city: '', locality: '' });
  const [isNewLocation, setIsNewLocation] = useState(false);
  const [logForm, setLogForm] = useState({ quantity_change: 0, note: '' });
  const [saving, setSaving] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal visibility states
  const [showAlerts, setShowAlerts] = useState(false);
  const [showRestocks, setShowRestocks] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [selectedItemForForecast, setSelectedItemForForecast] = useState(null);

  // Generate 14-day forecast data for the selected item
  const forecastData = (() => {
    if (!selectedItemForForecast) return [];
    const item = items.find(i => i.id === selectedItemForForecast);
    if (!item) return [];

    const currentQty = item.current_quantity ?? item.current_stock ?? 0;
    const rate = item.burn_rate_per_day ?? item.daily_burn_rate ?? 0;
    const data = [];
    
    for (let i = 0; i < 14; i++) {
      const projected = Math.max(0, currentQty - (rate * i));
      const date = new Date();
      date.setDate(date.getDate() + i);
      data.push({
        day: i === 0 ? 'Today' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        quantity: projected,
        threshold: item.restock_threshold ?? 100
      });
    }
    return data;
  })();


  useEffect(() => {
    const qInventory = query(collection(db, 'inventory'), orderBy('created_at', 'desc'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qRestocks = query(collection(db, 'restock_requests'), orderBy('created_at', 'desc'), limit(10));
    const unsubscribeRestocks = onSnapshot(qRestocks, (snapshot) => {
      setRestocks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const qLogs = query(collection(db, 'inventory_logs'), orderBy('created_at', 'desc'), limit(20));
    const unsubscribeLogs = onSnapshot(qLogs, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeInventory();
      unsubscribeRestocks();
      unsubscribeLogs();
    };

  }, []);

  async function addItem() {
    if (!form.item_name) return;
    setSaving(true);
    const qty = Number(form.current_quantity);
    const rate = Number(form.burn_rate_per_day);
    const predictedEmpty = rate > 0 ? new Date(Date.now() + (qty / rate) * 86400000).toISOString() : null;
    const finalLocation = isNewLocation ? `${newLocation.city} - ${newLocation.locality}` : form.location_name;
    
    await addDoc(collection(db, 'inventory'), {
      ...form,
      location_name: finalLocation,
      current_stock: qty,
      current_quantity: qty,
      daily_burn_rate: rate,
      burn_rate_per_day: rate,
      predicted_empty_at: predictedEmpty,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString()
    });
    setSaving(false);
    setShowModal(false);
    setForm({ item_name: '', category: 'essentials', current_quantity: 0, unit: 'units', location_name: '', restock_threshold: 100, burn_rate_per_day: 0 });
    setNewLocation({ city: '', locality: '' });
    setIsNewLocation(false);
  }

  async function logUsage() {
    if (!logModal) return;
    setSaving(true);
    const item = items.find(i => i.id === logModal);
    const change = Number(logForm.quantity_change);
    const newQty = Math.max(0, (item.current_quantity ?? item.current_stock ?? 0) + change);
    const rate = item.burn_rate_per_day ?? item.daily_burn_rate ?? 0;
    const predictedEmpty = rate > 0 ? new Date(Date.now() + (newQty / rate) * 86400000).toISOString() : null;

    await updateDoc(doc(db, 'inventory', logModal), {
      current_stock: newQty,
      current_quantity: newQty,
      predicted_empty_at: predictedEmpty,
      last_updated: new Date().toISOString()
    });

    await addDoc(collection(db, 'inventory_logs'), {
      inventory_id: logModal,
      quantity_change: change,
      note: logForm.note,
      created_at: new Date().toISOString()
    });

    // Auto restock if below threshold
    if (newQty <= (item.restock_threshold || 100)) {
      await addDoc(collection(db, 'restock_requests'), {
        inventory_id: logModal,
        item_name: item.item_name,
        quantity_requested: (item.restock_threshold || 100) * 3,
        auto_generated: true,
        status: 'pending',
        created_at: new Date().toISOString()
      });
    }

    setSaving(false);
    setLogModal(null);
    setLogForm({ quantity_change: 0, note: '' });
  }

  async function approveRestock(id) {
    await updateDoc(doc(db, 'restock_requests', id), { status: 'approved' });
  }

  const [apiAlerts, setApiAlerts] = useState([]);

  // Fetch Sentinel Alerts from FastAPI Backend
  useEffect(() => {
    async function fetchSentinel() {
      try {
        const response = await fetch('/api/sentinel');
        const data = await response.json();
        if (data.status === 'success') {
          setApiAlerts(data.alerts || []);
        }
      } catch (e) {
        console.error("Sentinel API Error:", e);
      }
    }
    fetchSentinel();
    // Refresh alerts every 30 seconds
    const interval = setInterval(fetchSentinel, 30000);
    return () => clearInterval(interval);
  }, []);

  const uniqueLocations = Array.from(new Set(items.map(i => String(i.location_name || '').trim()).filter(Boolean))).sort();
  const uniqueCategories = Array.from(new Set(items.map(i => String(i.category || '').trim()).filter(Boolean))).sort();

  const isExistingItem = items.some(i => i.item_name === form.item_name);
  
  const chartData = items.map(i => ({
    name: i.item_name?.slice(0, 12),
    stock: i.current_quantity ?? i.current_stock ?? 0,
    threshold: i.restock_threshold ?? 100,
  }));

  const filteredItems = items.filter(item => {
    const warehouseMatch = warehouseFilter === 'All' || 
      String(item.location_name || '').trim().toLowerCase() === String(warehouseFilter).trim().toLowerCase();
    const categoryMatch = categoryFilter === 'All' || 
      String(item.category || '').trim().toLowerCase() === String(categoryFilter).trim().toLowerCase();
    const searchMatch = !searchQuery || 
      String(item.item_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(item.location_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return warehouseMatch && categoryMatch && searchMatch;
  });


  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">📦 Inventory</h2>
          <p className="page-subtitle">Sentinel Agent — Burn rate & shortage prediction (FastAPI)</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {apiAlerts.length > 0 && (
            <button className="btn btn-critical" onClick={() => setShowAlerts(true)}>
              🛡️ Alerts ({apiAlerts.length})
            </button>
          )}
          {restocks.filter(r => r.status === 'pending').length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowRestocks(true)}>
              📝 Restocks ({restocks.filter(r => r.status === 'pending').length})
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setShowLogs(true)}>
            🕒 Activity Logs
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Item</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20, marginBottom: 24 }}>
        {/* Chart Section - Clustered Bar */}
        <div className="chart-container">
          <div className="section-title">📊 Stock vs Threshold (Clustered)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }} onClick={(data) => {
               if (data && data.activePayload) {
                 const itemName = data.activePayload[0].payload.name;
                 const item = items.find(i => i.item_name.startsWith(itemName));
                 if (item) setSelectedItemForForecast(item.id);
               }
            }}>
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 8, color: 'var(--text-primary)' }} 
              />
              <Bar dataKey="stock" name="Current Stock" radius={[4,4,0,0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.stock <= entry.threshold ? '#ef4444' : '#3b82f6'} />
                ))}
              </Bar>
              <Bar dataKey="threshold" name="Restock Threshold" fill="rgba(71, 85, 105, 0.4)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Predictive Forecast Section */}
        <div className="chart-container" style={{ position: 'relative' }}>
          <div className="section-title" style={{ justifyContent: 'space-between' }}>
            <span>📉 Sentinel Burn Forecast</span>
            {selectedItemForForecast && <span style={{ fontSize: 11, color: 'var(--accent-primary)' }}>{items.find(i => i.id === selectedItemForForecast)?.item_name}</span>}
          </div>
          
          {selectedItemForForecast ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={forecastData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip 
                   contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-visible)', borderRadius: 8 }}
                />
                <Area type="monotone" dataKey="quantity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#forecastGrad)" />
                <Area type="monotone" dataKey="threshold" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: 20 }}>
              Click an item in the bar chart to see its AI-powered 14-day burn forecast.
            </div>
          )}
          {selectedItemForForecast && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              🤖 Projected exhaustion in {forecastData.findIndex(d => d.quantity === 0) !== -1 ? forecastData.findIndex(d => d.quantity === 0) : '>14'} days.
            </div>
          )}
        </div>
      </div>


      {/* Premium Filter Control Center */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-visible)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 10, color: 'var(--accent-primary)' }}>🔍</div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>Inventory Control Center</div>
            </div>
            {(warehouseFilter !== 'All' || categoryFilter !== 'All' || searchQuery) && (
              <button 
                className="btn btn-sm btn-ghost" 
                style={{ color: 'var(--accent-red)', fontSize: 12 }}
                onClick={() => { setWarehouseFilter('All'); setCategoryFilter('All'); setSearchQuery(''); }}
              >
                ↺ Clear All Filters
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16 }}>
            {/* Search Filter */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>ITEM SEARCH</label>
              <input 
                className="form-input" 
                placeholder="Search by name or serial..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ height: 42, background: 'var(--bg-elevated)' }}
              />
            </div>

            {/* Location Filter */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>WAREHOUSE LOCATION</label>
              <select 
                className="form-select" 
                value={warehouseFilter}
                onChange={e => setWarehouseFilter(e.target.value)}
                style={{ height: 42, background: 'var(--bg-elevated)' }}
              >
                <option value="All">All Regions / Warehouses</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>📍 {loc}</option>)}
              </select>
            </div>

            {/* Category Filter */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ fontSize: 11, color: 'var(--text-muted)' }}>CATEGORY</label>
              <select 
                className="form-select" 
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ height: 42, background: 'var(--bg-elevated)' }}
              >
                <option value="All">All Product Categories</option>
                {uniqueCategories.map(cat => <option key={cat} value={cat}>🏷️ {cat}</option>)}
              </select>
            </div>
          </div>

          {/* Quick Category Pills */}
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            <button 
              className={`btn btn-sm ${categoryFilter === 'All' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setCategoryFilter('All')}
              style={{ padding: '4px 12px', fontSize: 11 }}
            >
              All Items
            </button>
            {uniqueCategories.map(cat => (
              <button 
                key={cat}
                className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setCategoryFilter(cat)}
                style={{ padding: '4px 12px', fontSize: 11, whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Inventory Registry Table */}
      <div className="table-container">
        <div className="section-title" style={{ marginBottom: 20, padding: '0 4px' }}>📋 Inventory Registry</div>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Current Stock</th>
              <th>Burn Rate/Day</th>
              <th>Days Left</th>
              <th>Threshold</th>
              <th>Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}><div className="skeleton" style={{ height: 40 }} /></td></tr>
            ) : filteredItems.map(item => {
              const qty = item.current_quantity ?? item.current_stock ?? 0;
              const rate = item.burn_rate_per_day ?? item.daily_burn_rate ?? 0;
              const threshold = item.restock_threshold ?? 100;
              const daysLeft = rate > 0 ? (qty / rate).toFixed(1) : '∞';
              const pct = Math.min(100, (qty / (threshold * 3)) * 100);
              const isLow = qty <= threshold;
              return (
                <tr key={item.id}>
                  <td style={{ fontWeight: 600 }}>{item.item_name}</td>
                  <td><span style={{ fontSize: 11, background: 'var(--bg-elevated)', borderRadius: 99, padding: '2px 8px', color: 'var(--text-secondary)' }}>{item.category}</span></td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: isLow ? 'var(--accent-red)' : 'var(--text-primary)' }}>{qty} {item.unit}</span>
                      <div className="progress-bar" style={{ '--progress-color': isLow ? 'var(--accent-red)' : 'var(--accent-green)' }}>
                        <div className="progress-fill" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{rate}/day</td>
                  <td style={{ fontWeight: 600, color: Number(daysLeft) <= 2 ? 'var(--accent-red)' : Number(daysLeft) <= 5 ? 'var(--accent-amber)' : 'var(--accent-green)' }}>
                    {daysLeft} days
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{threshold}</td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{item.location_name || '—'}</td>
                  <td>{isLow ? <span className="badge badge-critical">Low Stock</span> : <span className="badge badge-completed">OK</span>}</td>
                  <td>
                    <button className="btn btn-sm btn-ghost" onClick={() => setLogModal(item.id)}>📝 Log Usage</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Item Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">📦 Add Inventory Item</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Select Item *</label>
                  <select 
                    className="form-select" 
                    value={items.some(i => i.item_name === form.item_name) ? form.item_name : 'new'} 
                    onChange={e => {
                      const val = e.target.value;
                      if (val === 'new') {
                        setForm({ item_name: '', category: 'essentials', current_quantity: 0, unit: 'units', location_name: '', restock_threshold: 100, burn_rate_per_day: 0 });
                      } else {
                        const existing = items.find(i => i.item_name === val);
                        if (existing) {
                          setForm({
                            ...form,
                            item_name: existing.item_name,
                            category: existing.category || 'essentials',
                            current_quantity: existing.current_quantity ?? existing.current_stock ?? 0,
                            unit: existing.unit || 'units',
                            location_name: existing.location_name || '',
                            restock_threshold: existing.restock_threshold || 100,
                            burn_rate_per_day: existing.burn_rate_per_day ?? existing.daily_burn_rate ?? 0
                          });
                        }
                      }
                    }}
                  >
                    <option value="new">➕ Choose another item...</option>
                    {items.map(i => <option key={i.id} value={i.item_name}>{i.item_name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category {isExistingItem && <span style={{fontSize: 10, color: 'var(--accent-amber)'}}>(Locked)</span>}</label>
                  <select 
                    className="form-select" 
                    value={form.category} 
                    onChange={e => setForm({ ...form, category: e.target.value })}
                    disabled={isExistingItem}
                    style={isExistingItem ? { opacity: 0.7, cursor: 'not-allowed' } : {}}
                  >
                    {['essentials','food','medical','shelter','equipment','other'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {!items.some(i => i.item_name === form.item_name) && (
                <div className="form-group fade-in">
                  <label className="form-label">New Item Name *</label>
                  <input 
                    className="form-input" 
                    value={form.item_name} 
                    onChange={e => setForm({ ...form, item_name: e.target.value })} 
                    placeholder="e.g. Drinking Water" 
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input className="form-input" type="number" value={form.current_quantity} onChange={e => setForm({ ...form, current_quantity: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <input className="form-input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} placeholder="units / liters / kg" />
                </div>
                <div className="form-group">
                  <label className="form-label">Burn Rate/Day</label>
                  <input className="form-input" type="number" value={form.burn_rate_per_day} onChange={e => setForm({ ...form, burn_rate_per_day: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Restock Threshold</label>
                  <input className="form-input" type="number" value={form.restock_threshold} onChange={e => setForm({ ...form, restock_threshold: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Warehouse Location</label>
                  <select 
                    className="form-select" 
                    value={isNewLocation ? 'new' : form.location_name}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setIsNewLocation(true);
                        setForm({ ...form, location_name: '' });
                      } else {
                        setIsNewLocation(false);
                        setForm({ ...form, location_name: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select location...</option>
                    <option value="new">➕ Add new warehouse location...</option>
                    {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
              </div>

              {isNewLocation && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="fade-in">
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input 
                      className="form-input" 
                      value={newLocation.city} 
                      onChange={e => setNewLocation({ ...newLocation, city: e.target.value })} 
                      placeholder="e.g. Delhi" 
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Locality / Warehouse Name *</label>
                    <input 
                      className="form-input" 
                      value={newLocation.locality} 
                      onChange={e => setNewLocation({ ...newLocation, locality: e.target.value })} 
                      placeholder="e.g. Okhla Warehouse" 
                    />
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addItem} disabled={saving || !form.item_name}>
                  {saving ? '⏳ Saving...' : '✅ Add Item'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Usage Modal */}
      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h3 className="modal-title">📝 Log Usage</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setLogModal(null)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Quantity Change (negative = used, positive = restocked)</label>
                <input className="form-input" type="number" value={logForm.quantity_change} onChange={e => setLogForm({ ...logForm, quantity_change: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Note</label>
                <textarea className="form-textarea" value={logForm.note} onChange={e => setLogForm({ ...logForm, note: e.target.value })} placeholder="e.g. Used 50L for Shelter B" style={{ minHeight: 60 }} />
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setLogModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={logUsage} disabled={saving}>
                  {saving ? '⏳ Saving...' : '✅ Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Sentinel Alerts Modal */}
      {showAlerts && (
        <div className="modal-overlay" onClick={() => setShowAlerts(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">🛡️ Sentinel Alerts</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAlerts(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apiAlerts.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No active alerts</div>
              ) : apiAlerts.map(alert => (
                <div key={alert.item_id} className="inventory-alert" style={{ margin: 0 }}>
                  <span style={{ fontSize: 22 }}>📦</span>
                  <div style={{ flex: 1 }}>
                    <strong>{alert.item_name}</strong>
                    <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                      {alert.current_stock} remaining · {alert.message}
                    </div>
                  </div>
                  <span className="badge badge-critical">⚠️ Low Stock</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Restock Requests Modal */}
      {showRestocks && (
        <div className="modal-overlay" onClick={() => setShowRestocks(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h3 className="modal-title">📝 Restock Requests</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRestocks(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {restocks.filter(r => r.status === 'pending').length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No pending requests</div>
              ) : restocks.filter(r => r.status === 'pending').map(r => (
                <div key={r.id} style={{ background: 'var(--bg-surface)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{r.item_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Qty: {r.quantity_requested} {r.auto_generated ? '· 🤖 Auto-generated' : ''}
                      </div>
                    </div>
                    <button className="btn btn-sm btn-success" onClick={() => { approveRestock(r.id); if (restocks.filter(res => res.status === 'pending').length === 1) setShowRestocks(false); }}>
                      ✅ Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Modal */}
      {showLogs && (
        <div className="modal-overlay" onClick={() => setShowLogs(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="modal-title">🕒 Activity Logs</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowLogs(false)}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflowY: 'auto', paddingRight: 8 }}>
              {logs.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>No recent activity</div>
              ) : logs.map(log => {
                const item = items.find(i => i.id === log.inventory_id);
                return (
                  <div key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item?.item_name || 'Unknown Item'}</span>
                      <span style={{ color: log.quantity_change > 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 700, fontSize: 12 }}>
                        {log.quantity_change > 0 ? '+' : ''}{log.quantity_change}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{log.note}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(log.created_at).toLocaleDateString()}</span>
                      <span>{new Date(log.created_at).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
