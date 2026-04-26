import os
import firebase_admin
from firebase_admin import credentials, firestore

_db = None

def get_db():
    global _db
    if _db is None:
        try:
            # Try to initialize with Environment Variable (JSON string) first
            service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT")
            if service_account_json:
                import json
                cred_dict = json.loads(service_account_json)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                print("Initialized Firebase with Service Account from ENV.")
            else:
                # Fallback to Application Default Credentials or local file
                try:
                    firebase_admin.initialize_app()
                    print("Initialized Firebase with Application Default Credentials.")
                except Exception:
                    # Last resort for local testing
                    cred_path = os.path.join(os.path.dirname(__file__), "firebase-adminsdk.json")
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    print("Initialized Firebase with local firebase-adminsdk.json.")
            
            _db = firestore.client()
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise e
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

