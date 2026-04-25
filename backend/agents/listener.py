import os
import json
import datetime
import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import BaseModel
from database import db
from agents.translator import translate_text, TranslationRequest

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class ReportRequest(BaseModel):
    text: str
    location: str = "Unknown Location"
    source: str = "text"

def process_report(report: ReportRequest):
    """
    Listener Agent: Uses Gemini to extract structured task data from raw text.
    """
    original_text = report.text
    
    # 1. First, detect language and translate if needed (using upgraded Translator)
    translation_res = translate_text(TranslationRequest(text=original_text, target_lang="en"))
    processing_text = translation_res["translated_text"]
    detected_lang = translation_res["detected_language"]

    new_task = None

    if api_key:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            prompt = f"""
            Extract disaster relief tasks from the following text.
            Return a JSON object with:
            {{
                "task_type": "string (one of: water, food, medical, shelter, logistics, other)",
                "urgency_level": "string (low, medium, high, critical)",
                "urgency_score": int (1-10),
                "location_name": "string (the specific place mentioned, or 'Unknown')",
                "quantity": "string (if mentioned, e.g. '500 liters', or 'N/A')",
                "confidence": float (0.0 to 1.0)
            }}
            TEXT: {processing_text}
            """
            response = model.generate_content(prompt)
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            extracted = json.loads(raw_text)

            new_task = {
                "title": f"AI Extracted: {extracted.get('task_type', 'other').capitalize()} Request",
                "description": original_text,
                "translated_description": processing_text if detected_lang != "english" else None,
                "task_type": extracted.get("task_type", "other"),
                "status": "pending",
                "urgency_level": extracted.get("urgency_level", "medium"),
                "urgency_score": extracted.get("urgency_score", 5),
                "location_name": extracted.get("location_name") if extracted.get("location_name") != "Unknown" else report.location,
                "quantity": extracted.get("quantity"),
                "ai_confidence": extracted.get("confidence", 0.8),
                "created_from": report.source,
                "language": detected_lang,
                "created_at": datetime.datetime.utcnow().isoformat() + "Z"
            }
        except Exception as e:
            print(f"Listener AI Error: {e}")

    if not new_task:
        # Fallback to Rule-based extraction
        new_task = rule_based_extraction(original_text, processing_text, detected_lang, report.location, report.source)

    return {
        "status": "success",
        "message": "Report processed and task proposed",
        "detected_language": detected_lang,
        "task": new_task
    }

def rule_based_extraction(original_text, processing_text, detected_lang, report_location, source):
    """Fallback logic using keyword matching."""
    lower_text = processing_text.lower()
    task_type = "other"
    if any(w in lower_text for w in ["water", "drinking"]): task_type = "water"
    elif any(w in lower_text for w in ["food", "meal"]): task_type = "food"
    elif any(w in lower_text for w in ["medical", "doctor"]): task_type = "medical"
    
    urgency = "medium"
    if any(w in lower_text for w in ["urgent", "emergency"]): urgency = "high"
    
    return {
        "title": f"AI Extracted: {task_type.capitalize()} Request (Fallback)",
        "description": original_text,
        "task_type": task_type,
        "status": "pending",
        "urgency_level": urgency,
        "urgency_score": 7 if urgency == "high" else 5,
        "location_name": report_location,
        "ai_confidence": 0.5,
        "created_from": source,
        "language": detected_lang,
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }
