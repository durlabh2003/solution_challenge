import sys
import os
# Add the current directory to sys.path for module resolution
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agents.listener import process_report, ReportRequest
from agents.dispatcher import dispatch_task, DispatchRequest
from agents.sentinel import analyze_inventory_health
from agents.guardian import calculate_hope_score, GuardianRequest
from agents.translator import translate_text, TranslationRequest
from agents.visionary import analyze_disaster_image, VisionRequest
from firebase_functions import https_fn


app = FastAPI(title="OptiRelief Agent API", version="1.0")

# Enable CORS for the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174",
        "https://idea2exeution.web.app",
        "https://idea2exeution.firebaseapp.com"
    ], # Production and local domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "OptiRelief Agent Backend is running."}

@app.post("/api/reports")
def api_process_report(report: ReportRequest):
    """
    Listener Agent Endpoint
    Receives text/voice transcript, extracts task info, saves to Firestore.
    """
    return process_report(report)

@app.post("/api/dispatch")
def api_dispatch_task(request: DispatchRequest):
    """
    Dispatcher Agent Endpoint
    Assigns the best volunteer to a given task using TF-IDF similarity.
    """
    return dispatch_task(request)

@app.get("/api/sentinel")
def api_sentinel_analysis():
    """
    Sentinel Agent Endpoint
    Checks inventory burn rates and returns AI insights.
    """
    return analyze_inventory_health()

from agents.chatbot import get_chatbot_response, ChatRequest

@app.post("/api/chat")
def api_chat(request: ChatRequest):
    """
    Chatbot Agent Endpoint
    Receives user messages and returns Gemini-synthesized answers from live Firestore data.
    """
    return get_chatbot_response(request)

@app.post("/api/guardian")
def api_guardian(request: GuardianRequest):
    """
    Guardian Agent Endpoint
    Calculates Hope Score and logs it to Firestore.
    """
    return calculate_hope_score(request)

@app.post("/api/translate")
def api_translate(request: TranslationRequest):
    """
    Translator Agent Endpoint
    Simulates translation and language detection.
    """
    return translate_text(request)

@app.post("/api/vision")
def api_vision(request: VisionRequest):
    """
    Visionary Agent Endpoint
    Analyzes images for disaster context and creates tasks.
    """
    return analyze_disaster_image(request)


# --- Firebase Cloud Function Export ---
@https_fn.on_request()
def api_v1(req: https_fn.Request) -> https_fn.Response:
    return https_fn.as_wsgi(app)(req)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

