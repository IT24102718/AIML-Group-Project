"""MongoDB connection for chat message storage."""
import os
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

# Load .env file from project root
env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(env_path)

MONGO_URI = os.environ.get("MONGODB_URL") or os.environ.get("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.environ.get("MONGODB_DB_NAME", "student_dropout_db")  # ← Changed to student_dropout_db

print(f"Connecting to MongoDB...")
print(f"Database: {DB_NAME}")

try:
    client = MongoClient(MONGO_URI)
    # Test connection
    client.admin.command('ping')
    print("MongoDB connected successfully!")
    
    db = client[DB_NAME]  # Using student_dropout_db
    messages_collection = db["messages"]  # Chat messages
    chat_sessions_collection = db["chat_sessions"]  # Chat sessions
    
    print(f"Using database: {DB_NAME}")
    print(f"Collections in database: {db.list_collection_names()}")
    
except Exception as e:
    print(f"MongoDB connection failed: {e}")
    client = None
    db = None
    messages_collection = None
    chat_sessions_collection = None