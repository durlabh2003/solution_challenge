import os
import firebase_admin
from firebase_admin import credentials, firestore

def get_db():
    if not firebase_admin._apps:
        # Load the service account key from the same directory
        cred_path = os.path.join(os.path.dirname(__file__), "firebase-adminsdk.json")
        try:
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        except Exception as e:
            print(f"Error initializing Firebase Admin SDK: {e}")
            raise e
    
    return firestore.client()

db = get_db()
