import React, { useState, useRef, useEffect } from 'react';

const SUGGESTED_QUERIES = [
  "How much water do we have?",
  "What is our Hope Score?",
  "Show pending tasks",
  "Report: Need medical supplies at Sector 4"
];

const InventorySummaryWidget = ({ metadata }) => (
  <div className="chat-widget inventory-widget">
    <div className="chat-widget-header">📦 Low Stock Alert</div>
    <div className="chat-widget-items">
      {metadata.items.map((item, i) => (
        <div key={i} className="chat-widget-item">
          <span className="item-name">{item.name}</span>
          <span className="item-qty badge-critical">{item.qty} {item.unit}</span>
        </div>
      ))}
    </div>
    <div className="chat-widget-footer">Sentinel Agent notified for replenishment.</div>
  </div>
);

const TaskSummaryWidget = ({ metadata }) => (
  <div className="chat-widget task-widget">
    <div className="chat-widget-grid">
      <div className="chat-widget-stat">
        <div className="stat-label">Pending</div>
        <div className="stat-value">{metadata.pending}</div>
      </div>
      <div className="chat-widget-stat">
        <div className="stat-label">Critical</div>
        <div className="stat-value" style={{ color: 'var(--accent-red)' }}>{metadata.urgent}</div>
      </div>
    </div>
  </div>
);

const HopeScoreWidget = ({ metadata }) => (
  <div className="chat-widget hope-widget">
    <div className="hope-gauge">
      <div className="hope-gauge-value" style={{ color: metadata.score < 5 ? 'var(--accent-red)' : 'var(--accent-green)' }}>
        {metadata.score}
      </div>
      <div className="hope-gauge-label">/ 10</div>
    </div>
    <div className="chat-widget-details">
      <div>Sentiment: <strong>{metadata.sentiment}</strong></div>
      <div>Active Responders: <strong>{metadata.volunteers_active}</strong></div>
    </div>
  </div>
);


const formatMessage = (text) => {
  if (!text) return "";
  // Simple bold: **text** -> <strong>text</strong>
  // Simple code: `text` -> <code>text</code>
  const formatted = text.split(/(\*\*.*?\*\*|`.*?`)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="chat-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
  return formatted;
};

export default function ChatbotWidget() {

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: "Hello! I'm the **OptiRelief AI Assistant**. I can help you monitor inventory, check volunteer availability, or even log new reports directly. What can I do for you?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'bot', 
        content: data.reply,
        data_type: data.data_type,
        metadata: data.metadata
      }]);

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', content: "Sorry, I am having trouble connecting to the backend right now." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  return (
    <div className="chatbot-container">
      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'open' : ''}`}>
        <div className="chatbot-header">
          <div className="chatbot-header-title">
            <span className="chatbot-dot"></span>
            OptiRelief AI
          </div>
          <button className="chatbot-close" onClick={() => setIsOpen(false)}>×</button>
        </div>
        
        <div className="chatbot-messages">
          {messages.map((msg, idx) => (
            <div key={idx} className={`chatbot-message ${msg.role}`}>
              {msg.role === 'bot' && <div className="chatbot-avatar">🤖</div>}
              <div className="chatbot-bubble">
                <div className="bubble-text">{formatMessage(msg.content)}</div>
                {msg.data_type === 'inventory_summary' && <InventorySummaryWidget metadata={msg.metadata} />}
                {msg.data_type === 'tasks' && <TaskSummaryWidget metadata={msg.metadata} />}
                {msg.data_type === 'hope_score' && <HopeScoreWidget metadata={msg.metadata} />}
              </div>


            </div>
          ))}
          {isLoading && (
            <div className="chatbot-message bot">
              <div className="chatbot-avatar">🤖</div>
              <div className="chatbot-bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chatbot-input-area">
          {messages.length <= 1 && !input && (
            <div className="chatbot-suggestions">
              {SUGGESTED_QUERIES.map(q => (
                <button key={q} className="chatbot-suggestion-pill" onClick={() => { setInput(q); }}>
                  {q}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question..."
              className="chatbot-input"
            />
            <button 
              className="chatbot-send-btn" 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Toggle Button */}
      <button 
        className={`chatbot-toggle ${isOpen ? 'hidden' : ''}`}
        onClick={() => setIsOpen(true)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    </div>
  );
}
