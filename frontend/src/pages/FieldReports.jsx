import React, { useEffect, useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';


import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function FieldReports({ userRole }) {
  const [reports, setReports] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [extractedTasks, setExtractedTasks] = useState([]);
  const [imageProcessing, setImageProcessing] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imageContext, setImageContext] = useState('');
  const [processing, setProcessing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef(null);

  // Center on a mock disaster zone (e.g., near Delhi)
  const mapCenter = [28.6139, 77.2090]; 

  useEffect(() => {
    const qReports = query(collection(db, 'field_reports'), orderBy('created_at', 'desc'));
    const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
      setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const qInventory = query(collection(db, 'inventory'));
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubscribeReports();
      unsubscribeInventory();
    };
  }, []);

  // Deterministic coordinates based on name/id
  const getMockCoords = (seed, isWarehouse = false) => {
    const hash = seed.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0);
    const latOffset = (hash % 100) * 0.0002;
    const lngOffset = (hash % 80) * 0.0002;
    // Base center shifted slightly for warehouses vs incidents to avoid overlapping
    const baseLat = isWarehouse ? 26.8500 : 26.8467;
    const baseLng = isWarehouse ? 80.9500 : 80.9462;
    return [baseLat + latOffset, baseLng + lngOffset];
  };

  const warehouses = Array.from(new Set(inventory.map(i => i.location_name)))
    .filter(Boolean)
    .map(name => ({
      name,
      items: inventory.filter(i => i.location_name === name),
      coords: getMockCoords(name, true)
    }));

  const warehouseIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="map-marker-container marker-warehouse">🏢</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  const incidentIcon = L.divIcon({
    className: 'custom-div-icon',
    html: `<div class="map-marker-container marker-incident">⚠️</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  });

  const [pendingReport, setPendingReport] = useState(null);

  async function submitReport() {
    const text = textInput;
    if (!text.trim()) return;
    setProcessing(true);
    setVisionResult(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: text, 
          source: 'text',
          location: 'Field location' 
        })
      });
      
      const data = await response.json();

      if (data.status === 'success' && data.task) {
        setExtractedTasks([data.task]);
        setPendingReport({
          raw_text: text,
          processed_text: data.task?.translated_description || text,
          translated_text: data.task?.translated_description || null,
          language_detected: data.detected_language || 'english',
          status: 'processed',
          ai_confidence: data.task?.ai_confidence || 0.85,
          created_at: new Date().toISOString()
        });
      }

      setSubmitted(true);
      setTextInput('');
    } catch (e) {
      console.error("Backend API Error:", e);
      alert("Error calling FastAPI Backend. Make sure it is running on port 8000!");
    } finally {
      setProcessing(false);
    }
  }

  const handleImageSelection = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    
    const newImages = [];
    let processed = 0;
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result.replace('data:', '').replace(/^.+,/, '');
        newImages.push({
           dataUrl: reader.result,
           base64: base64String
        });
        processed++;
        if (processed === files.length) {
            setSelectedImages(prev => [...prev, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const submitVisualReport = async () => {
    if (selectedImages.length === 0) return;

    setImageProcessing(true);
    setExtractedTasks([]);
    setVisionResult(null);

    try {
      const base64Images = selectedImages.map(img => img.base64);
      const response = await fetch('/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           images: base64Images,
           context_text: imageContext
        })
      });
      
      const data = await response.json();
      
      if (data.status === 'success') {
        setVisionResult(data.analysis);
        setExtractedTasks([data.task]);
        setPendingReport({
          raw_text: `[Image Report] ${selectedImages.length} photos. Context: ${imageContext || 'None'}\nAnalysis: ${data.analysis.description}`,
          processed_text: data.analysis.description,
          status: 'processed',
          ai_confidence: 0.92,
          created_at: new Date().toISOString(),
          report_type: 'image'
        });
        setSelectedImages([]);
        setImageContext('');
      }
    } catch (err) {
      console.error("Vision API Error:", err);
      alert("Failed to analyze images. Check if backend is running.");
    } finally {
      setImageProcessing(false);
    }
  };

  const handleConfirmTask = async (task) => {
    try {
      setProcessing(true);
      // 1. Save Task to Firestore (if available)
      if (task) {
        await addDoc(collection(db, 'tasks'), task);
      }
      // 2. Save Original Report to Firestore
      if (pendingReport) {
        await addDoc(collection(db, 'field_reports'), pendingReport);
      }
      // 3. Reset
      setExtractedTasks([]);
      setPendingReport(null);
      setVisionResult(null);
      alert(task ? "✅ Task and report confirmed!" : "✅ Field report confirmed!");
    } catch (e) {
      console.error("Confirm Error:", e);
      alert("Error saving data to Firestore.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDiscardTask = () => {
    setExtractedTasks([]);
    setPendingReport(null);
    setVisionResult(null);
  };

  const statusColor = { processed: 'var(--accent-green)', processing: 'var(--accent-amber)', unprocessed: 'var(--text-muted)', flagged: 'var(--accent-red)' };
  const statusEmoji = { processed: '✅', processing: '⏳', unprocessed: '📥', flagged: '🚩' };

  return (
    <div className="fade-in">

      {/* GIS Map Integration */}
      <div className="section" style={{ height: 400, borderRadius: 16, overflow: 'hidden', marginBottom: 24, border: '1px solid var(--border-visible)', position: 'relative' }}>
        <MapContainer center={[26.8467, 80.9462]} zoom={14} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Legend */}
          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--accent-primary)' }} />
              <span>Warehouse Location</span>
            </div>
            <div className="legend-item">
              <div className="legend-dot" style={{ background: 'var(--accent-red)' }} />
              <span>Active Incident Report</span>
            </div>
          </div>

          {/* Warehouse Markers */}
          {warehouses.map((wh, idx) => (
            <Marker key={`wh-${idx}`} position={wh.coords} icon={warehouseIcon}>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--accent-primary)' }}>🏢 {wh.name} Warehouse</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4, marginBottom: 4 }}>
                    Resource Hub
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {wh.items.slice(0, 3).map((item, i) => (
                      <div key={i} style={{ fontSize: 12, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{item.item_name}</span>
                        <span style={{ fontWeight: 600 }}>{item.current_quantity} {item.unit}</span>
                      </div>
                    ))}
                    {wh.items.length > 3 && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+ {wh.items.length - 3} more items...</div>}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Incident Markers */}
          {reports.map(report => {
            const coords = getMockCoords(report.id, false);
            return (
              <React.Fragment key={report.id}>
                <Circle 
                  center={coords}
                  radius={400}
                  pathOptions={{ 
                    fillColor: report.urgency === 'critical' ? '#ef4444' : '#f59e0b', 
                    color: 'transparent',
                    fillOpacity: 0.15 
                  }}
                />
                <Marker position={coords} icon={incidentIcon}>
                  <Popup>
                    <div style={{ minWidth: 150 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--accent-red)' }}>⚠️ Incident Report</div>
                      <div className={`badge badge-${report.urgency || 'high'}`} style={{ marginBottom: 8 }}>{report.urgency?.toUpperCase() || 'HIGH'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{report.raw_text?.slice(0, 100)}...</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Text Submit Panel */}
        <div className="card">
          <div className="section-title">📤 Text Report</div>

          <div className="form-group">
            <label className="form-label">Field Report (any language)</label>
            <textarea
              className="form-textarea"
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              placeholder="Type your field report here. E.g.: In Azra village, we have no clean water..."
              style={{ minHeight: 120 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={submitReport} disabled={processing || !textInput.trim()}>
              {processing ? <><div className="ai-dots"><div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/></div> Processing...</> : '✅ Analyze Text'}
            </button>
          </div>
        </div>

        {/* Vision Submit Panel */}
        <div className="card">
          <div className="section-title">📸 Visual Report</div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
            Upload multiple photos from the disaster site and provide context for AI analysis.
          </p>

          <div 
            onClick={() => fileInputRef.current.click()}
            style={{ 
              border: '2px dashed var(--border-color)', 
              borderRadius: 12, 
              padding: 20, 
              textAlign: 'center', 
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s ease',
              marginBottom: 16
            }}
            onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
            onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Select Photos</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Click to upload multiple images</div>
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageSelection} 
            hidden 
            accept="image/*" 
            multiple
          />

          {selectedImages.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16, paddingBottom: 8 }}>
              {selectedImages.map((img, idx) => (
                <div key={idx} style={{ position: 'relative', width: 60, height: 60, flexShrink: 0 }}>
                  <img src={img.dataUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} />
                  <button 
                    onClick={() => removeImage(idx)}
                    style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Supportive Context (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={imageContext}
              onChange={e => setImageContext(e.target.value)}
              placeholder="E.g. Water rising fast on Main St."
            />
          </div>

          <button className="btn btn-primary" onClick={submitVisualReport} disabled={imageProcessing || selectedImages.length === 0} style={{ width: '100%' }}>
            {imageProcessing ? <><div className="ai-dots"><div className="ai-dot"/><div className="ai-dot"/><div className="ai-dot"/></div> Analyzing...</> : '✅ Analyze Photos'}
          </button>
        </div>
      </div>

      {/* AI Analysis & Task Proposal Section */}
      {(extractedTasks.length > 0 || visionResult) && (
            <div className="section fade-in" style={{ 
              marginTop: 24,
              background: 'linear-gradient(145deg, rgba(63, 81, 181, 0.05), rgba(0, 0, 0, 0))',
              border: '1px solid rgba(63, 81, 181, 0.2)',
              borderRadius: 16,
              padding: 20
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: '1.5rem' }}>🤖</span>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>AI Analysis & Task Proposal</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Generated by {visionResult ? 'Visionary' : 'Listener'} Agent</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button 
                    className="btn btn-secondary" 
                    onClick={handleDiscardTask}
                    disabled={processing}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    Discard
                  </button>
                  <button 
                    className="btn btn-primary" 
                    onClick={() => handleConfirmTask(extractedTasks[0])}
                    disabled={processing}
                    style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                  >
                    {processing ? 'Processing...' : 'Confirm & Add Task'}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {visionResult && (
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span className={`badge badge-${visionResult.severity?.toLowerCase() || 'med'}`}>{visionResult.severity}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{visionResult.category}</span>
                    </div>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0 }}>{visionResult.description}</p>
                  </div>
                )}

                {extractedTasks.map((task, i) => (
                  <div key={i} style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--accent-primary)', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                      <span className={`confidence-pill ${task.ai_confidence >= 0.85 ? 'confidence-high' : 'confidence-med'}`}>
                        AI {Math.round(task.ai_confidence * 100)}%
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Proposed Task: {task.title}</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 12 }}>{task.description}</p>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>📍 {task.location_name || task.location}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>🏷️ {task.category}</span>
                      <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', fontSize: '0.75rem' }}>🕒 {task.urgency_level || task.priority}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

      {/* Reports History */}
      <div className="section-title">📋 Recent Field Reports</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />) :
          reports.map(r => (
            <div key={r.id} className="card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.5 }}>
                    {r.report_type === 'image' ? "📸 " : "📝 "}{r.raw_text || r.processed_text || 'No content'}
                  </div>
                  {r.translated_text && r.language_detected !== 'english' && (
                    <div style={{ fontSize: 13, color: 'var(--accent-primary)', marginBottom: 10, fontStyle: 'italic', background: 'rgba(59,130,246,0.05)', padding: '8px 12px', borderRadius: 8 }}>
                      🌐 {r.translated_text}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                    {r.language_detected && <span>🌐 {r.language_detected}</span>}
                    {r.geo_tagged_location && <span>📍 {r.geo_tagged_location}</span>}
                    <span>AI {Math.round((r.ai_confidence || 0) * 100)}%</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 20 }}>{statusEmoji[r.status] || '✅'}</span>
                  <div style={{ fontSize: 11, color: statusColor[r.status] || 'var(--accent-green)', fontWeight: 600, textAlign: 'center', marginTop: 2 }}>
                    {r.status || 'processed'}
                  </div>
                </div>
              </div>
            </div>
          ))
        }
        {!loading && reports.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>
            No reports yet. Submit your first report above!
          </div>
        )}
      </div>
    </div>
  );
}
