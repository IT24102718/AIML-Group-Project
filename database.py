from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL")
DATABASE_NAME = os.getenv("DATABASE_NAME", "student_dropout_db")

client = None
database = None

async def connect_to_mongo():
    """Connect to MongoDB"""
    global client, database
    try:
        print("Connecting to MongoDB...")
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[DATABASE_NAME]
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB successfully!")
        print(f"📊 Using database: {DATABASE_NAME}")
        return True
    except Exception as e:
        print(f"❌ MongoDB connection error: {e}")
        database = None
        return False

async def close_mongo_connection():
    global client
    if client:
        client.close()
        print("✅ MongoDB connection closed")

def get_database():
    return database

def is_db_connected():
    """Check if database is connected"""
    return database is not None