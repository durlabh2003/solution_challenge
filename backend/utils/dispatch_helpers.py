import numpy as np
from typing import List, Dict, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def fetch_available_volunteers(db) -> List[Dict]:
    """Fetch volunteers with availability_status == 'available' from Firestore.
    Returns a list of volunteer dicts with an added 'id' field.
    """
    volunteers_ref = db.collection("volunteers").where("availability_status", "==", "available").stream()
    volunteers = []
    for v in volunteers_ref:
        data = v.to_dict()
        data["id"] = v.id
        volunteers.append(data)
    return volunteers

def build_task_query(task_data: Dict) -> str:
    """Combine task type and description into a single search string."""
    return f"{task_data.get('task_type', '')} {task_data.get('description', '')}".strip()

def volunteer_documents(volunteers: List[Dict]) -> List[str]:
    """Convert volunteer skill lists into space‑joined strings for TF‑IDF."""
    return [" ".join(v.get("skills", [])) for v in volunteers]

def compute_best_match(task_query: str, volunteer_docs: List[str]) -> Tuple[int, float]:
    """Return the index of the best matching volunteer and the similarity score.
    Uses TF‑IDF vectorization and cosine similarity.
    """
    if not volunteer_docs:
        raise ValueError("No volunteer documents provided")
    vectorizer = TfidfVectorizer()
    all_texts = [task_query] + volunteer_docs
    tfidf_matrix = vectorizer.fit_transform(all_texts)
    query_vec = tfidf_matrix[0:1]
    docs_vecs = tfidf_matrix[1:]
    similarities = cosine_similarity(query_vec, docs_vecs).flatten()
    best_idx = int(np.argmax(similarities))
    best_score = float(similarities[best_idx])
    return best_idx, best_score
