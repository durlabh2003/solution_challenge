from pydantic import BaseModel
from database import db
from utils.dispatch_helpers import fetch_available_volunteers, build_task_query, volunteer_documents, compute_best_match
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
import logging
from google.cloud import firestore

class DispatchRequest(BaseModel):
    task_id: str

def dispatch_task(request: DispatchRequest):
    """
    Dispatcher Agent: Finds the best available volunteer for a given task using 
    TF-IDF and Cosine Similarity on skills and task descriptions.
    """
    task_ref = db.collection("tasks").document(request.task_id)
    task_doc = task_ref.get()
    
    if not task_doc.exists:
        return {"status": "error", "message": "Task not found"}
        
    task_data = task_doc.to_dict()
    if task_data.get("status") != "pending":
        return {"status": "error", "message": "Task is not pending"}
        
    # Get available volunteers
    volunteers_ref = db.collection("volunteers").where("availability_status", "==", "available").get()
    
    if not volunteers_ref:
        return {"status": "error", "message": "No available volunteers found"}
        
    volunteers = []
    for v in volunteers_ref:
        v_data = v.to_dict()
        v_data["id"] = v.id
        volunteers.append(v_data)
        
    # Prepare documents for TF-IDF
    # Query: Task Type + Task Description
    task_query = f"{task_data.get('task_type', '')} {task_data.get('description', '')}"
    
    # Documents: Volunteer Skills joined as string
    volunteer_docs = [" ".join(v.get("skills", [])) for v in volunteers]
    
    # Calculate similarity
    vectorizer = TfidfVectorizer()
    try:
        # Fit on all texts to build vocabulary
        all_texts = [task_query] + volunteer_docs
        tfidf_matrix = vectorizer.fit_transform(all_texts)
        
        # Calculate cosine similarity between query (index 0) and all volunteer docs (index 1 onwards)
        query_vec = tfidf_matrix[0:1]
        docs_vecs = tfidf_matrix[1:]
        similarities = cosine_similarity(query_vec, docs_vecs).flatten()
        
        best_match_idx = np.argmax(similarities)
        best_score = similarities[best_match_idx]
        best_volunteer = volunteers[best_match_idx]
        
    except ValueError:
        # Fallback if vocabulary is empty
        best_volunteer = volunteers[0]
        best_score = 0.0

    # Assign task to the best volunteer
    task_ref.update({
        "status": "assigned",
        "assigned_volunteer_name": best_volunteer.get("name")
    })
    
    # Update volunteer status
    db.collection("volunteers").document(best_volunteer["id"]).update({
        "availability_status": "busy"
    })
    
    return {
        "status": "success",
        "message": "Task dispatched successfully",
        "task_id": request.task_id,
        "assigned_to": best_volunteer.get("name"),
        "match_score": float(best_score)
    }
