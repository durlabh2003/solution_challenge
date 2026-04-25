from pydantic import BaseModel
from database import db
import datetime
import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class GuardianRequest(BaseModel):
    avg_sentiment: float
    tasks_completed: int
    tasks_pending: int
    volunteers_active: int
    notes: str = ""

def get_community_sentiment():
    """
    Guardian Agent: Fetches recent reports and uses Gemini to gauge collective morale.
    Returns a sentiment score between 0.0 and 1.0.
    """
    if not api_key:
        return 0.65 # Neutral-positive fallback
        
    try:
        # Fetch last 15 reports
        reports_ref = db.collection("reports").order_by("timestamp", direction="DESCENDING").limit(15).get()
        report_texts = [r.to_dict().get("text", "") for r in reports_ref]
        
        if not report_texts:
            return 0.7 # High morale if no issues reported
            
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Analyze the collective sentiment of these disaster field reports.
        Reports: {report_texts}
        Return only a JSON object: {{"sentiment_score": float (0.0 to 1.0)}}
        0.0 means extreme despair/chaos, 1.0 means high hope/stability.
        """
        response = model.generate_content(prompt)
        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        return json.loads(raw_text).get("sentiment_score", 0.6)
    except Exception as e:
        print(f"Guardian Sentiment Error: {e}")
        return 0.6

def calculate_hope_score(request: GuardianRequest):
    """
    Guardian Agent: Calculates the weighted Hope Score and tracks volunteer wellness.
    Formula: (Sentiment * 0.4) + (CompletionRate * 0.4) + (VolunteerActivity * 0.2)
    """
    # Use AI-integrated sentiment if provided sentiment is missing/default, 
    # otherwise default to the AI analysis.
    s = get_community_sentiment()
    
    tc = request.tasks_completed
    tp = request.tasks_pending
    va = request.volunteers_active
    
    # Calculate completion rate (0.0 to 1.0)
    total_tasks = tc + tp
    completion_rate = tc / total_tasks if total_tasks > 0 else 0.5
    
    # Normalize volunteer activity (target: 20 active volunteers for a 'full' score in this metric)
    volunteer_activity_score = min(va, 20) / 20
    
    # Calculate weighted score (0.0 to 10.0)
    raw_score = (s * 0.4) + (completion_rate * 0.4) + (volunteer_activity_score * 0.2)
    final_score = round(min(10.0, raw_score * 10), 1)
    
    # Create Hope Score Document
    new_score = {
        "score_date": datetime.datetime.utcnow().strftime("%Y-%m-%d"),
        "avg_sentiment": s,
        "tasks_completed": tc,
        "tasks_pending": tp,
        "volunteers_active": va,
        "score": final_score,
        "notes": request.notes,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
    
    # Add to Firestore
    try:
        db.collection("hope_scores").add(new_score)
        
        # 4. Automated Intervention: If Hope Score is critical, alert the team
        if final_score < 3.0:
            create_wellness_task(final_score, tc, va)
            
        return {
            "status": "success",
            "message": "Hope Score calculated and saved by Guardian Agent",
            "score": final_score,
            "data": new_score
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Guardian Agent failed to save score: {str(e)}"
        }

def create_wellness_task(score, completed, active):
    """
    Creates a high-urgency task for psychological support or team briefing.
    """
    try:
        # Avoid duplicate wellness tasks for the same day
        today = datetime.datetime.utcnow().strftime("%Y-%m-%d")
        existing = db.collection("tasks").where("task_type", "==", "other").where("status", "==", "pending").where("created_at", ">=", today).get()
        if any("Wellness" in doc.to_dict().get("title", "") for doc in existing):
            return

        new_task = {
            "title": "🚨 Urgent Wellness Check & Team Briefing",
            "description": f"Hope Score has dropped to critical level ({score}/10). \n"
                           f"Completed Tasks: {completed}, Active Volunteers: {active}. \n"
                           "Action required: Brief logistics team and provide psychological support to volunteers.",
            "task_type": "other",
            "status": "pending",
            "urgency_level": "critical",
            "urgency_score": 9,
            "location_name": "Relief Command Center",
            "ai_confidence": 0.98,
            "created_from": "guardian_agent",
            "created_at": datetime.datetime.utcnow().isoformat() + "Z"
        }
        db.collection("tasks").add(new_task)
    except Exception as e:
        print(f"Guardian failed to create wellness task: {e}")

