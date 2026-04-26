import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is None:
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
                # During deployment discovery, we might not have credentials
                return None
        
        try:
            _db = firestore.client()
        except Exception as e:
            print(f"Warning: Could not initialize Firestore client: {e}")
            return None
    return _db

# Proxy object or just use get_db() in agents.
# For minimal changes, we can use a property-like behavior if we were in a class,
# but since it's a module, let's just export get_db and update imports, 
# or use a simple class-based singleton.

class DatabaseProxy:
    @property
    def client(self):
        return get_db()
    
    def collection(self, *args, **kwargs):
        return get_db().collection(*args, **kwargs)

db = DatabaseProxy()

