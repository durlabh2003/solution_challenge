import os
import google.generativeai as genai
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# Configure Gemini
api_key = os.getenv("GOOGLE_API_KEY")
if api_key:
    genai.configure(api_key=api_key)

class TranslationRequest(BaseModel):
    text: str
    target_lang: str = "en"

def translate_text(request: TranslationRequest):
    """
    Translator Agent: Handles multi-dialect and language translation using Gemini.
    """
    text = request.text
    target = request.target_lang
    
    if not api_key:
        # Mock Fallback if no API key is set
        return mock_translate_fallback(text, target)

    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"""
        Detect the language of the following text and translate it to {target}.
        Return a JSON object with:
        {{
            "detected_language": "string",
            "translated_text": "string",
            "confidence": float (0.0 to 1.0)
        }}
        TEXT: {text}
        """
        response = model.generate_content(prompt)
        import json
        raw_text = response.text.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw_text)
        
        return {
            "status": "success",
            "original_text": text,
            "detected_language": result.get("detected_language", "unknown"),
            "translated_text": result.get("translated_text", text),
            "confidence": result.get("confidence", 0.9)
        }
    except Exception as e:
        print(f"Translator Agent Error: {e}")
        return mock_translate_fallback(text, target)

def mock_translate_fallback(text, target):
    """Simple heuristic fallback for when API is unavailable."""
    non_en_keywords = {
        "hindi": ["pani", "khana", "madad", "bacha", "bimari"],
        "spanish": ["agua", "comida", "ayuda", "niños", "enfermo"]
    }
    detected_lang = "english"
    for lang, keywords in non_en_keywords.items():
        if any(word in text.lower() for word in keywords):
            detected_lang = lang
            break
            
    return {
        "status": "success",
        "original_text": text,
        "detected_language": detected_lang,
        "translated_text": f"[Fallback] {text}",
        "confidence": 0.5
    }
