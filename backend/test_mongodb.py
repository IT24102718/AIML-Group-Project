# test_mongodb_simple.py
from pymongo import MongoClient
import certifi
from datetime import datetime

print("="*60)
print("🔍 TESTING MONGODB ATLAS CONNECTION (SIMPLE)")
print("="*60)

# Your MongoDB connection string
uri = "mongodb+srv://janukigangadhara_db_user:nMeeGHMqF9NXOSy7@cluster0.e4nmdrh.mongodb.net/?appName=Cluster0"

print(f"\n📡 Connecting to MongoDB Atlas...")

try:
    # Create client
    client = MongoClient(
        uri, 
        tlsCAFile=certifi.where(),
        serverSelectionTimeoutMS=5000  # 5 second timeout
    )
    
    # Send a ping
    print("⏳ Sending ping...")
    client.admin.command('ping')
    print("✅ Connected successfully to MongoDB Atlas!")
    
    # List databases
    dbs = client.list_database_names()
    print(f"📊 Available databases: {dbs}")
    
    # Test insert
    db = client['test_db']
    collection = db['test_collection']
    
    test_doc = {
        "test": "connection",
        "timestamp": datetime.utcnow(),
        "status": "success"
    }
    
    result = collection.insert_one(test_doc)
    print(f"✅ Test document inserted with ID: {result.inserted_id}")
    
    # Clean up
    collection.delete_one({"_id": result.inserted_id})
    print("✅ Test document cleaned up")
    
    client.close()
    print("\n✅✅✅ DATABASE CONNECTION: SUCCESSFUL! ✅✅✅")
    
except Exception as e:
    print(f"\n❌ Connection failed: {e}")
    print("\n🔧 Troubleshooting:")
    print("1. Go to MongoDB Atlas → Network Access → Add your current IP")
    print("2. Check username/password in connection string")
    print("3. Make sure cluster is not paused")