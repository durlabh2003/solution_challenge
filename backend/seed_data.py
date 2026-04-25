import random
import datetime
from database import db

# Data Constants
CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Lucknow"]
SKILLS = ["medical", "driving", "logistics", "IT", "coordination", "community-outreach", "translation", "first-aid", "pediatrics", "data-analysis", "python", "emergency"]
NAMES = [
    "Rahul", "Priya", "Amit", "Sneha", "Vikram", "Anjali", "Suresh", "Meera", "Arjun", "Kavita",
    "Mohammed", "Fatima", "Sandeep", "Deepa", "Vijay", "Sunita", "Rohan", "Pooja", "Karan", "Ishita",
    "Aditya", "Riya", "Manish", "Shweta", "Abhishek", "Neha", "Vivek", "Divya", "Sanjay", "Tanvi"
]
SURNAMES = ["Sharma", "Verma", "Gupta", "Malhotra", "Khan", "Iyer", "Reddy", "Patel", "Singh", "Joshi", "Das", "Choudhury", "Nair", "Kapoor", "Agarwal"]

CATEGORIES = ["essentials", "food", "medical", "shelter", "equipment", "other"]
ITEMS = [
    {"name": "Drinking Water", "cat": "essentials", "unit": "Liters"},
    {"name": "First Aid Kits", "cat": "medical", "unit": "kits"},
    {"name": "Tents", "cat": "shelter", "unit": "units"},
    {"name": "Food Rations", "cat": "food", "unit": "meals"},
    {"name": "Blankets", "cat": "shelter", "unit": "units"},
    {"name": "Portable Generators", "cat": "equipment", "unit": "units"},
    {"name": "Solar Lights", "cat": "equipment", "unit": "units"},
    {"name": "Hygiene Kits", "cat": "essentials", "unit": "kits"},
    {"name": "Masks", "cat": "medical", "unit": "packs"},
    {"name": "Medicines", "cat": "medical", "unit": "boxes"}
]

REPORT_TEXTS = [
    {"en": "We need more water in Azra village.", "hi": "Azra village mein pani ki zaroorat hai.", "lang": "hindi"},
    {"en": "Children are sick in Zone B.", "hi": "Zone B mein bachon ki tabiyat kharab hai.", "lang": "hindi"},
    {"en": "Need immediate medical aid for elderly people.", "es": "Necesitamos ayuda médica inmediata para las personas mayores.", "lang": "spanish"},
    {"en": "Food supply is running low in the central shelter.", "fr": "L'approvisionnement en nourriture est faible dans l'abri central.", "lang": "french"},
    {"en": "Tents are leaking after the heavy rain.", "hi": "Baarish ke baad tambuon mein pani bhar raha hai.", "lang": "hindi"},
    {"en": "Need a doctor at the camp site.", "en": "Need a doctor at the camp site.", "lang": "english"},
    {"en": "No electricity for three days, need generators.", "en": "No electricity for three days, need generators.", "lang": "english"}
]

def seed_field_reports(count=30):
    print(f"Seeding {count} field reports...")
    for i in range(count):
        report_choice = random.choice(REPORT_TEXTS)
        lang = report_choice["lang"]
        raw_text = report_choice.get(lang if lang != 'english' else 'en', report_choice['en'])
        
        report_data = {
            "raw_text": raw_text,
            "processed_text": report_choice["en"],
            "translated_text": report_choice["en"] if lang != 'english' else None,
            "language_detected": lang,
            "status": "processed",
            "ai_confidence": round(random.uniform(0.8, 0.99), 2),
            "created_at": (datetime.datetime.now() - datetime.timedelta(hours=random.randint(0, 48))).isoformat()
        }
        db.collection("field_reports").add(report_data)
    print("Completed seeding field reports.")

def seed_tasks(count=50):
    print(f"Seeding {count} tasks...")
    vols = [v.to_dict().get('name') for v in db.collection("volunteers").limit(10).get()]
    
    for i in range(count):
        status = random.choice(["pending", "pending", "assigned", "in_progress", "completed"])
        urgency = random.choice(["low", "medium", "high", "critical"])
        type = random.choice(["water", "food", "medical", "shelter", "logistics", "other"])
        
        task_data = {
            "title": f"{type.capitalize()} request at {random.choice(CITIES)} Zone {random.randint(1,10)}",
            "description": f"Urgent requirement for {type} based on field report.",
            "task_type": type,
            "status": status,
            "urgency_level": urgency,
            "urgency_score": random.randint(1, 10),
            "location_name": f"{random.choice(CITIES)} Zone {random.randint(1,10)}",
            "assigned_volunteer_name": random.choice(vols) if status != "pending" else None,
            "ai_confidence": round(random.uniform(0.7, 0.95), 2),
            "created_from": random.choice(["voice", "text", "manual"]),
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 5))).isoformat()
        }
        db.collection("tasks").add(task_data)
    print("Completed seeding tasks.")

def seed_restock_requests(count=20):
    print(f"Seeding {count} restock requests...")
    inv_items = [i.to_dict() for i in db.collection("inventory").limit(20).get()]
    if not inv_items: return
    
    for i in range(count):
        item = random.choice(inv_items)
        request_data = {
            "inventory_id": "mock_id",
            "item_name": item["item_name"],
            "quantity_requested": random.randint(100, 500),
            "auto_generated": random.choice([True, False]),
            "status": random.choice(["pending", "approved"]),
            "created_at": (datetime.datetime.now() - datetime.timedelta(days=random.randint(0, 10))).isoformat()
        }
        db.collection("restock_requests").add(request_data)
    print("Completed seeding restock requests.")

def seed_hope_scores_history(days=30):
    print(f"Seeding {days} days of hope score history...")
    for i in range(days):
        date = (datetime.date.today() - datetime.timedelta(days=days-i)).isoformat()
        score = round(random.uniform(4.0, 9.0), 1)
        
        hs_data = {
            "score_date": date,
            "avg_sentiment": round(random.uniform(0.4, 0.9), 2),
            "tasks_completed": random.randint(10, 50),
            "tasks_pending": random.randint(2, 20),
            "volunteers_active": random.randint(5, 30),
            "score": score,
            "notes": f"Seeded historical data for {date}",
            "created_at": datetime.datetime.now().isoformat()
        }
        db.collection("hope_scores").add(hs_data)
    print("Completed seeding hope scores.")

if __name__ == "__main__":
    # Note: We already seeded volunteers, warehouses and some logs.
    # Adding more specific data now.
    seed_field_reports(30)
    seed_tasks(50)
    seed_restock_requests(20)
    seed_hope_scores_history(30)
    print("Mock data expansion finished successfully!")
