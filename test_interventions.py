import requests
import json

BASE_URL = "http://localhost:8000"

print("="*60)
print("🧪 TESTING INTERVENTION API")
print("="*60)

print("\n📝 1. Creating intervention...")
response = requests.post(f"{BASE_URL}/interventions", json={
    "student_id": "STU001",
    "student_name": "Test Student",
    "intervention_type": "counseling",
    "description": "Student struggling with courses - needs academic support",
    "priority": "high"
})
print(f"Status: {response.status_code}")
data = response.json()
print(f"Response: {json.dumps(data, indent=2)}")

if data.get('success'):
    intervention_id = data.get('intervention_id')
    print(f"✅ Created intervention ID: {intervention_id}")

print("\n📋 2. Getting all interventions...")
response = requests.get(f"{BASE_URL}/interventions")
data = response.json()
print(f"Found {len(data.get('interventions', []))} interventions")

print("\n📊 3. Getting stats...")
response = requests.get(f"{BASE_URL}/interventions/stats/summary")
data = response.json()
print(f"Stats: {json.dumps(data, indent=2)}")

print("\n✅ Test complete!")