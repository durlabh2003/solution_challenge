import os
import google.generativeai as genai
from dotenv import load_dotenv
from database import db
from pydantic import BaseModel

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class ChatRequest(BaseModel):
    message: str
    user_context: str = "coordinator"

def get_chatbot_response(request: ChatRequest):
    """
    Chatbot Agent: A RAG-lite implementation. 
    Fetches real-time Firestore data and uses Gemini to synthesize an answer.
    """
    user_msg = request.message
    
    if not api_key:
        return {"response": "AI Chatbot is in limited mode (No API Key). Please check the manual dashboard for data."}

    try:
        # 1. Fetch Context from Firestore
        inventory = [doc.to_dict() for doc in db.collection("inventory").limit(15).get()]
        tasks = [doc.to_dict() for doc in db.collection("tasks").where("status", "==", "pending").limit(10).get()]
        hope_scores = db.collection("hope_scores").order_by("created_at", direction="DESCENDING").limit(1).get()
        
        current_hope = "Unknown"
        if hope_scores:
            current_hope = hope_scores[0].to_dict().get("score", "Unknown")

        context_str = f"""
        CURRENT SYSTEM STATE:
        - Hope Score (0-10): {current_hope}
        - Inventory Snapshot: {[{i.get('item_name', 'item'): i.get('current_quantity', 0)} for i in inventory]}
        - Pending High-Priority Tasks: {[t.get('title', 'task') for t in tasks if t.get('urgency_level') in ['high', 'critical']]}
        """

        model = genai.GenerativeModel('gemini-1.5-flash')
        system_prompt = f"""
        You are OptiRelief AI, a professional and empathetic disaster coordination assistant.
        Use the provided context to answer the user's question accurately.
        Format your response with markdown. Use bullet points for lists.
        Keep it professional, concise, and helpful.
        If the user asks for a 'report', guide them to use the 'Field Reports' page.
        
        CONTEXT: {context_str}
        """
        
        chat = model.start_chat(history=[])
        response = chat.send_message(f"{system_prompt}\n\nUSER: {user_msg}")
        
        return {
            "response": response.text.strip(),
            "status": "success",
            "agent": "Chatbot"
        }
    except Exception as e:
        print(f"Chatbot Agent Error: {e}")
        return {"response": "I'm having trouble accessing the tactical database. Please verify the connection or check the dashboard."}
