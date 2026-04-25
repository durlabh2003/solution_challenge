import React, { useState, useEffect } from 'react';
import './index.css';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import TaskBoard from './pages/TaskBoard';
import Volunteers from './pages/Volunteers';
import Inventory from './pages/Inventory';
import FieldReports from './pages/FieldReports';
import HopeScore from './pages/HopeScore';
import IssueRaiser from './pages/IssueRaiser';
import Instructions from './pages/Instructions';
import ChatbotWidget from './components/ChatbotWidget';
import { db } from './lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';

export default function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [userRole, setUserRole] = useState('admin'); // admin, warehouse_manager, volunteer, issue_raiser
  
  // Notification States
  const [sosAlerts, setSosAlerts] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState([]);
  const [hopeLatest, setHopeLatest] = useState(null);

  useEffect(() => {
    // 1. SOS Alerts Listener
    const qSOS = query(
      collection(db, 'field_reports'), 
      where('urgency_level', 'in', ['critical', 'high']),
      orderBy('created_at', 'desc'),
      limit(10)
    );
    const unsubscribeSOS = onSnapshot(qSOS, (snapshot) => {
      setSosAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Inventory Alerts Listener (for Notification Bar)
    const qInventory = collection(db, 'inventory');
    const unsubscribeInventory = onSnapshot(qInventory, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const lowStock = items.filter(item => {
        const qty = item.current_quantity ?? item.current_stock ?? 0;
        const threshold = item.restock_threshold ?? 100;
        const rate = item.burn_rate_per_day ?? 0;
        return qty <= threshold || (rate > 0 && qty / rate <= 2);
      });
      setInventoryAlerts(lowStock);
    });

    // 3. Hope Score Listener
    const qHope = query(collection(db, 'hope_scores'), orderBy('created_at', 'desc'), limit(1));
    const unsubscribeHope = onSnapshot(qHope, (snapshot) => {
      if (!snapshot.empty) {
        setHopeLatest(snapshot.docs[0].data());
      }
    });

    return () => {
      unsubscribeSOS();
      unsubscribeInventory();
      unsubscribeHope();
    };
  }, []);

  const pageTitles = {
    dashboard: { title: 'Strategic Command', subtitle: 'Global oversight & agent coordination' },
    tasks: { title: 'Task Command', subtitle: 'Real-time assignment & tracking' },
    volunteers: { title: 'Volunteer Force', subtitle: 'Personnel management & deployment' },
    inventory: { title: 'Supply Chain', subtitle: 'Inventory levels & logistics' },
    reports: { title: 'Field Intel', subtitle: 'Incident reports & AI analysis' },
    hope: { title: 'Guardian Analytics', subtitle: 'Hope Score & regional morale' },
    sos: { title: 'Emergency Portal', subtitle: 'Raise critical alerts' },
    instructions: { title: 'Command Manual', subtitle: 'Platform documentation & roles' },
  };

  const currentTitle = pageTitles[currentPage] || { title: 'OptiRelief', subtitle: 'AI Coordination' };

  const pages = {
    dashboard: <Dashboard setCurrentPage={setCurrentPage} userRole={userRole} />,
    tasks: <TaskBoard userRole={userRole} />,
    volunteers: <Volunteers userRole={userRole} />,
    inventory: <Inventory userRole={userRole} />,
    reports: <FieldReports userRole={userRole} />,
    hope: <HopeScore userRole={userRole} />,
    sos: <IssueRaiser />,
    instructions: <Instructions userRole={userRole} />,
  };

  return (
    <div className="app-shell">
      <Sidebar 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        userRole={userRole} 
        setUserRole={setUserRole} 
      />
      <main className="main-content">
        <Header 
          title={currentTitle.title}
          subtitle={currentTitle.subtitle}
          userRole={userRole}
          sosAlerts={sosAlerts}
          inventoryAlerts={inventoryAlerts}
          hopeLatest={hopeLatest}
          setCurrentPage={setCurrentPage}
        />
        <div className="page-container">
          {pages[currentPage] || <Dashboard setCurrentPage={setCurrentPage} userRole={userRole} />}
        </div>
      </main>
      <ChatbotWidget />
    </div>
  );
}
