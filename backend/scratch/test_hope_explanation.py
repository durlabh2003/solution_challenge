import requests
import json

url = "http://localhost:8000/api/chat"
payload = {"message": "what does hope score means"}
headers = {"Content-Type": "application/json"}

response = requests.post(url, data=json.dumps(payload), headers=headers)
print(response.json())
