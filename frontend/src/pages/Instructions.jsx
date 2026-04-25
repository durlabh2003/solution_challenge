const ROLE_INSTRUCTIONS = {
  admin: {
    title: "🛡️ Strategic Command Manual",
    subtitle: "Global coordination and mission orchestration",
    responsibility: "As an Admin, you are the final authority in the disaster theater. Your objective is to ensure resource efficiency, coordinate between multiple stakeholders, and monitor the overall community morale to guide strategic decisions.",
    steps: [
      {
        title: "Strategic Dashboard Overview",
        desc: "The Dashboard serves as your tactical eyes. Monitor the 'Hope Score'—a real-time sentiment index derived from field reports. If it drops below 5.0, immediate intervention in community engagement is required. Use the metric grid to track volunteer saturation and supply health at a glance.",
        icon: "⚡"
      },
      {
        title: "Intelligent Task Orchestration",
        desc: "Manage the entire mission lifecycle in the Task Board. AI Agents (Listener/Visionary) automatically propose tasks from field data. You must review, prioritize, and monitor these tasks. Drag tasks between 'Pending', 'In Progress', and 'Completed' to maintain an accurate operational picture.",
        icon: "✅"
      },
      {
        title: "Logistics & Sentinel Integration",
        desc: "The Sentinel AI monitors your global inventory. When stock levels hit critical thresholds, a 'Low Stock' alert will pulsate in your top-right notification bar. Use the Inventory page to oversee warehouse distribution and approve automated restock requests.",
        icon: "📦"
      },
      {
        title: "Emergency SOS Management",
        desc: "A red siren badge (🚨) in your header indicates life-critical field reports. These are prioritized broadcasts from the field. Click the badge to instantly view the incident details and coordinate immediate relief via the nearest logistics hub.",
        icon: "🆘"
      }
    ],
    ai_collab: "Collaborate with the Guardian Agent to identify sentiment trends and the Sentinel Agent for predictive logistics."
  },
  warehouse_manager: {
    title: "📦 Logistics & Supply Chain Manual",
    subtitle: "Inventory integrity and resource distribution",
    responsibility: "Your mission is to maintain the backbone of the relief effort: the supply chain. You ensure that life-saving resources are stored correctly, tracked accurately, and dispatched to the front lines without delay.",
    steps: [
      {
        title: "Inventory Health Management",
        desc: "Regularly update stock levels as supplies arrive or are dispatched. Use the 'Warehouse' filter to focus on your specific area of responsibility. Ensure that item categories are correctly tagged to allow for precise search and retrieval.",
        icon: "🔍"
      },
      {
        title: "Predictive Burn Rate Analysis",
        desc: "The Sentinel AI calculates your 'Burn Rate' based on historical consumption. Pay close attention to the forecast charts; they predict exactly when a resource will run empty. Initiate restocks early to avoid life-critical shortages.",
        icon: "🔔"
      },
      {
        title: "Logistics Fulfillment",
        desc: "Keep the Task Board filtered for 'Logistics' tasks. When you dispatch a truck or a delivery, update the task status immediately. This allows Admins to see that supplies are in transit in real-time.",
        icon: "🚛"
      }
    ],
    ai_collab: "The Sentinel Agent is your primary partner. It handles the complex math of supply forecasting, allowing you to focus on physical coordination."
  },
  volunteer: {
    title: "👥 Volunteer Impact Manual",
    subtitle: "Front-line engagement and community support",
    responsibility: "Volunteers are the hands and feet of OptiRelief. You translate digital coordination into real-world impact by completing tasks, engaging with the community, and providing direct relief to those in need.",
    steps: [
      {
        title: "Tactical Task Selection",
        desc: "Browse the Task Board for missions marked 'Pending'. Choose tasks that align with your current location and skill set (e.g., Medical, Food Distribution). Once you 'Pick Up' a task, it becomes your responsibility to see it through to completion.",
        icon: "🎯"
      },
      {
        title: "Community Hope Advocacy",
        desc: "Monitor the Hope Score on your dashboard. This score reflects the emotional state of the disaster zone. Use this data to prioritize areas that feel neglected or where morale is particularly low.",
        icon: "💚"
      },
      {
        title: "Status Reporting",
        desc: "Transparency is key. Always update your task status to 'In Progress' when starting and 'Completed' when finished. This ensures that the Command Center knows where resources are effectively being utilized.",
        icon: "✨"
      }
    ],
    ai_collab: "The Guardian Agent provides you with the emotional context of the community, helping you tailor your approach to the survivors' needs."
  },
  issue_raiser: {
    title: "📝 Field Intelligence & Reporting Manual",
    subtitle: "Real-time situational awareness from the ground",
    responsibility: "As a Field Worker, your reporting drives the entire platform. You provide the raw intelligence that AI Agents process into actionable tasks. Your accuracy directly impacts how fast help reaches those in need.",
    steps: [
      {
        title: "AI Listener (Voice/Text)",
        desc: "Submit reports by simply describing the situation. The AI Listener Agent uses NLP to translate local languages and extract specific needs like '10 liters of water' or 'emergency medical attention for 5 people'.",
        icon: "✍️"
      },
      {
        title: "AI Visionary (Visual Evidence)",
        desc: "A photo is worth a thousand data points. Upload multiple images of infrastructure damage or resource needs. The Visionary Agent analyzes the severity of the situation to generate high-priority tasks automatically.",
        icon: "📸"
      },
      {
        title: "Critical SOS Broadcasting",
        desc: "In life-threatening emergencies, use the SOS Portal. This sends an immediate, high-priority alert to all dashboard users. Include clear location details to ensure the closest responders can reach you.",
        icon: "🚨"
      },
      {
        title: "Strategic GIS Mapping",
        desc: "Use the Field Reports map to see your proximity to nearby Warehouses and other Incident clusters. This helps you identify where help is already on the way and where gaps in coverage exist.",
        icon: "📍"
      }
    ],
    ai_collab: "You work directly with the Listener and Visionary Agents to ensure that every report is converted into a concrete mission."
  }
};

export default function Instructions({ userRole }) {
  const config = ROLE_INSTRUCTIONS[userRole] || ROLE_INSTRUCTIONS.admin;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">📖 Operation Manual</h2>
          <p className="page-subtitle">Standard Operating Procedures for the {userRole.replace('_', ' ')} unit</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 30, background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(37,99,235,0.05) 100%)', border: '1px solid rgba(59,130,246,0.2)', padding: '24px 32px' }}>
        <h3 style={{ fontSize: 26, marginBottom: 12, color: 'var(--accent-primary)', fontWeight: 800 }}>{config.title}</h3>
        <p style={{ color: 'var(--text-primary)', fontSize: 16, lineHeight: 1.6, maxWidth: 800 }}>{config.responsibility}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {config.steps.map((step, idx) => (
          <div key={idx} className="card instruction-card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div className="instruction-icon">{step.icon}</div>
            <h4 style={{ fontSize: 18, marginBottom: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{step.title}</h4>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, flex: 1 }}>{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 24, background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--accent-green)' }}>AI COLLABORATION STRATEGY</div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{config.ai_collab}</div>
          </div>
        </div>
      </div>

      <div className="section" style={{ marginTop: 40, textAlign: 'center', opacity: 0.6 }}>
        <p style={{ fontSize: 12, letterSpacing: '0.05em' }}>
          OPTIRelief PROTOCOL v2.0 • MISSION CRITICAL DOCUMENTATION
        </p>
      </div>
    </div>
  );
}
