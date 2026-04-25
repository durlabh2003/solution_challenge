import os
import google.generativeai as genai
from dotenv import load_dotenv
from database import db
import datetime

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

def analyze_inventory_health():
    """
    Sentinel Agent: Analyzes inventory data and provides AI insights on supply chain health.
    """
    inventory_ref = db.collection("inventory").get()
    items = []
    low_stock_count = 0
    
    for doc in inventory_ref:
        data = doc.to_dict()
        items.append({
            "name": data.get("item_name"),
            "stock": data.get("current_quantity"),
            "threshold": data.get("restock_threshold")
        })
        if data.get("current_quantity", 0) < data.get("restock_threshold", 10):
            low_stock_count += 1

    ai_insight = "Monitoring active. Supply levels within normal range."
    
    if api_key and items:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            Analyze this disaster relief inventory data: {items}
            Identify critical shortages, predict which items might run out next, and suggest logistics priorities.
            Keep the insight concise (max 3 sentences).
            """
            response = model.generate_content(prompt)
            ai_insight = response.text.strip()
        except Exception as e:
            print(f"Sentinel AI Error: {e}")

    return {
        "total_items": len(items),
        "low_stock_alerts": low_stock_count,
        "ai_insight": ai_insight,
        "status": "warning" if low_stock_count > 0 else "healthy",
        "timestamp": datetime.datetime.utcnow().isoformat() + "Z"
    }

def analyze_inventory():
    """
    Sentinel Agent: Analyzes inventory burn rates and creates automated tasks for logistics.
    """
    try:
        inventory_ref = db.collection("inventory").get()
        alerts = []
        
        for doc in inventory_ref:
            item = doc.to_dict()
            item_id = doc.id
            name = item.get("item_name", "Unknown")
            qty = item.get("current_quantity", 0)
            threshold = item.get("restock_threshold", 100)
            
            # Simple stock check
            if qty <= (threshold * 0.5):
                # Critical Alert
                alert = {"item": name, "level": "critical", "message": f"CRITICAL: {name} is at {qty} units (below 50% of threshold)."}
                alerts.append(alert)
                create_automated_task(name, "critical", qty, item_id)
            elif qty <= threshold:
                # Warning
                alert = {"item": name, "level": "warning", "message": f"WARNING: {name} is at {qty} units (below threshold)."}
                alerts.append(alert)
                create_automated_task(name, "high", qty, item_id)
                
        return {
            "status": "success",
            "agent": "Sentinel",
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "alerts_found": len(alerts),
            "alerts": alerts
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

def create_automated_task(item_name, urgency, current_qty, item_id):
    """
    Helper to create a logistics task for restocking.
    """
    try:
        # Check if a pending restock task already exists for this item to avoid duplicates
        existing = db.collection("tasks").where("inventory_item_id", "==", item_id).where("status", "==", "pending").get()
        if len(list(existing)) > 0:
            return # Task already exists
            
        new_task = {
            "title": f"Restock Request: {item_name}",
            "description": f"Automated alert from Sentinel Agent: {item_name} is running low ({current_qty} units left). Please coordinate delivery.",
            "task_type": "logistics",
            "status": "pending",
            "urgency_level": urgency,
            "urgency_score": 9 if urgency == "critical" else 7,
            "location_name": "Main Warehouse",
            "inventory_item_id": item_id,
            "ai_confidence": 0.95,
            "created_from": "sentinel_agent",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        db.collection("tasks").add(new_task)
    except Exception as e:
        print(f"Error creating automated task: {e}")
