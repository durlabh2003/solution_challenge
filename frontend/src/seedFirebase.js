import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCWGJjCv8yta0O0yOKomC6UpnNqTduQBH4",
  authDomain: "idea2exeution.firebaseapp.com",
  databaseURL: "https://idea2exeution-default-rtdb.firebaseio.com",
  projectId: "idea2exeution",
  storageBucket: "idea2exeution.firebasestorage.app",
  messagingSenderId: "631449358720",
  appId: "1:631449358720:web:edb25ee2312e9df90d3165",
  measurementId: "G-7YF401PM1X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const seedData = async () => {
    console.log("Seeding Firebase data...");

    // 1. Hope Scores
    const hopeScores = [
      { score_date: '2025-01-10', avg_sentiment: 0.45, tasks_completed: 12, tasks_pending: 25, volunteers_active: 8, score: 4.8, notes: 'Initial response chaos.', created_at: new Date().toISOString() },
      { score_date: '2025-01-11', avg_sentiment: 0.52, tasks_completed: 18, tasks_pending: 20, volunteers_active: 12, score: 5.6, notes: 'More volunteers arrived.', created_at: new Date().toISOString() },
      { score_date: '2025-01-12', avg_sentiment: 0.61, tasks_completed: 25, tasks_pending: 15, volunteers_active: 15, score: 6.4, notes: 'Water supply restored to Zone A.', created_at: new Date().toISOString() },
      { score_date: '2025-01-13', avg_sentiment: 0.58, tasks_completed: 22, tasks_pending: 18, volunteers_active: 14, score: 6.0, notes: 'Rain caused slight delays.', created_at: new Date().toISOString() },
      { score_date: '2025-01-14', avg_sentiment: 0.68, tasks_completed: 30, tasks_pending: 10, volunteers_active: 18, score: 7.2, notes: 'Major medical supply delivery.', created_at: new Date().toISOString() },
      { score_date: '2025-01-15', avg_sentiment: 0.75, tasks_completed: 35, tasks_pending: 5, volunteers_active: 20, score: 8.0, notes: 'Shelters fully operational.', created_at: new Date().toISOString() }
    ];

    for (let hs of hopeScores) {
        await addDoc(collection(db, 'hope_scores'), hs);
    }
    console.log("Seeded Hope Scores");

    // 2. Volunteers
    const volunteers = [
      { name: 'Dr. Priya Sharma', full_name: 'Dr. Priya Sharma', role: 'volunteer', availability_status: 'available', skills: ['medical', 'pediatrics', 'emergency'], location_name: 'Noida, India', tasks_completed: 28, churn_risk_score: 0.65, sentiment_score: 0.45, created_at: new Date().toISOString() },
      { name: 'Ahmed Khan', full_name: 'Ahmed Khan', role: 'volunteer', availability_status: 'available', skills: ['logistics', 'driving', 'first-aid'], location_name: 'Delhi, India', tasks_completed: 12, churn_risk_score: 0.10, sentiment_score: 0.80, created_at: new Date().toISOString() },
      { name: 'Maria Jose', full_name: 'Maria Jose', role: 'volunteer', availability_status: 'busy', skills: ['community-outreach', 'translation', 'coordination'], location_name: 'Faridabad, India', tasks_completed: 31, churn_risk_score: 0.05, sentiment_score: 0.90, created_at: new Date().toISOString() },
      { name: 'Raj Malhotra', full_name: 'Raj Malhotra', role: 'volunteer', availability_status: 'available', skills: ['IT', 'data-analysis', 'python'], location_name: 'Gurgaon, India', tasks_completed: 5, churn_risk_score: 0.20, sentiment_score: 0.75, created_at: new Date().toISOString() }
    ];

    for (let vol of volunteers) {
        await addDoc(collection(db, 'volunteers'), vol);
    }
    console.log("Seeded Volunteers");

    // 3. Inventory
    const inventory = [
      { item_name: 'Drinking Water', category: 'essentials', current_quantity: 500, unit: 'Liters', restock_threshold: 600, burn_rate_per_day: 250, daily_burn_rate: 250, current_stock: 500, location_name: 'Warehouse A', created_at: new Date().toISOString() },
      { item_name: 'First Aid Kits', category: 'medical', current_quantity: 120, unit: 'kits', restock_threshold: 50, burn_rate_per_day: 10, daily_burn_rate: 10, current_stock: 120, location_name: 'Warehouse B', created_at: new Date().toISOString() },
      { item_name: 'Tents', category: 'shelter', current_quantity: 15, unit: 'units', restock_threshold: 20, burn_rate_per_day: 2, daily_burn_rate: 2, current_stock: 15, location_name: 'Warehouse A', created_at: new Date().toISOString() },
      { item_name: 'Food Rations', category: 'food', current_quantity: 800, unit: 'meals', restock_threshold: 500, burn_rate_per_day: 300, daily_burn_rate: 300, current_stock: 800, location_name: 'Warehouse C', created_at: new Date().toISOString() }
    ];

    for (let item of inventory) {
        await addDoc(collection(db, 'inventory'), item);
    }
    console.log("Seeded Inventory");

    // 4. Tasks
    const tasks = [
      { title: 'Deliver 200L Water to Azra Village', description: 'Urgent water requirement at Azra Village community center.', task_type: 'water', status: 'pending', urgency_level: 'critical', urgency_score: 9, location_name: 'Azra Village, Delhi', ai_confidence: 0.92, created_from: 'voice', created_at: new Date().toISOString() },
      { title: 'Medical Aid: Pediatric Medicines', description: 'Need fever syrup and antibiotics for children.', task_type: 'medical', status: 'assigned', assigned_volunteer_name: 'Dr. Priya Sharma', urgency_level: 'critical', urgency_score: 10, location_name: 'Azra Village, Delhi', ai_confidence: 0.88, created_from: 'text', created_at: new Date().toISOString() },
      { title: 'Food Distribution at Shelter B', description: 'Deliver 100 hot meals to Shelter B.', task_type: 'food', status: 'in_progress', assigned_volunteer_name: 'Ahmed Khan', urgency_level: 'high', urgency_score: 7, location_name: 'Shelter B, Central Delhi', ai_confidence: 0.95, created_from: 'manual', created_at: new Date().toISOString() },
      { title: 'Emergency Shelter Setup', description: 'Set up 5 new tents before evening.', task_type: 'shelter', status: 'pending', urgency_level: 'high', urgency_score: 8, location_name: 'Storm Zone, Faridabad', ai_confidence: 0.79, created_from: 'voice', created_at: new Date().toISOString() }
    ];

    for (let task of tasks) {
        await addDoc(collection(db, 'tasks'), task);
    }
    console.log("Seeded Tasks");

    console.log("Seeding complete! You can close this process.");
    process.exit(0);
};

seedData().catch(console.error);
