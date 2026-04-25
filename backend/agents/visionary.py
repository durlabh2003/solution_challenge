import os
import json
import base64
import datetime
import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional
from database import db

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class VisionRequest(BaseModel):
    images: List[str]  # List of base64 strings
    context_text: Optional[str] = None
    prompt: str = "Analyze these disaster site photos. Identify the disaster type, severity (Low, Medium, High, Critical), and key needs. Return valid JSON."

def analyze_disaster_image(request: VisionRequest):
    """
    Visionary Agent: Uses Gemini Vision to analyze multiple disaster photos and context text.
    Saves the analysis as a pending task in Firestore.
    """
    analysis = None

    if not api_key:
        # Mock Response if no API key is set
        context_preview = f" (Context: {request.context_text[:30]}...)" if request.context_text else ""
        analysis = {
            "category": "Flood (Simulated)",
            "severity": "High",
            "description": f"The analysis of {len(request.images)} images shows significant street flooding{context_preview}. Residents appear to be stranded on rooftops.",
            "needs": ["Boat evacuation", "Clean water", "Emergency food"],
            "is_emergency": True
        }
    else:
        try:
            # Initialize Gemini 1.5 Flash (Vision capable)
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Prepare content list (Prompt + Images)
            content = []
            
            # 1. System prompt and context
            System_prompt = f"""
            You are the Visionary Agent for OptiRelief, a disaster coordination platform.
            Analyze the provided image(s) and any additional context provided by the user.
            
            USER CONTEXT: {request.context_text or "No additional context provided."}
            
            Return a JSON object with exactly these fields:
            {{
                "category": "string (one of: Water, Food, Medical, Shelter, Logistics, Infrastructure, Other)",
                "severity": "string (Low, Medium, High, Critical)",
                "description": "string (1-2 sentences summarizing the visual damage and incorporating user context if relevant)",
                "needs": ["list of strings of urgent needs"],
                "is_emergency": boolean (true if severity is High or Critical)
            }}
            Do not include any markdown formatting or extra text, just the JSON.
            """
            content.append(System_prompt)

            # 2. Add multiple images
            for img_b64 in request.images:
                image_data = base64.b64decode(img_b64)
                content.append({"mime_type": "image/jpeg", "data": image_data})

            response = model.generate_content(content)

            # Clean response text (remove ```json ... ``` if present)
            raw_text = response.text.replace('```json', '').replace('```', '').strip()
            analysis = json.loads(raw_text)

        except Exception as e:
            print(f"Visionary Agent Error: {e}")
            analysis = {
                "error": str(e),
                "category": "Other",
                "severity": "Medium",
                "description": "Failed to analyze image with AI. Manual review required.",
                "needs": ["Manual assessment"],
                "is_emergency": False
            }

    # Map analysis to Firestore Task Schema
    task_type = analysis.get("category", "other").lower()
    if task_type not in ["water", "food", "medical", "shelter", "logistics"]:
        task_type = "other"

    new_task = {
        "title": f"Visual Report: {analysis.get('category')} detected",
        "description": analysis.get("description"),
        "task_type": task_type,
        "status": "pending",
        "urgency_level": analysis.get("severity", "Medium").lower(),
        "urgency_score": 9 if analysis.get("severity") == "Critical" else 7 if analysis.get("severity") == "High" else 5,
        "location_name": "Photo Location",
        "ai_confidence": 0.92,
        "created_from": "vision",
        "needs": analysis.get("needs", []),
        "num_photos": len(request.images),
        "created_at": datetime.datetime.utcnow().isoformat() + "Z"
    }

    # Return proposed task without saving to Firestore
    return {
        "status": "success",
        "analysis": analysis,
        "task": new_task
    }
