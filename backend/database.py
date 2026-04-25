import os
import firebase_admin
from firebase_admin import credentials, firestore

def get_db():
    if not firebase_admin._apps:
        # Check if the service account key exists (for local development)
        cred_path = os.path.join(os.path.dirname(__file__), "firebase-adminsdk.json")
        try:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Use Application Default Credentials (for Cloud deployment)
                firebase_admin.initialize_app()
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
            raise e
    
    return firestore.client()

db = get_db()
