from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "dropout_prediction_db")

client = AsyncIOMotorClient(MONGODB_URL)
database = client[DATABASE_NAME]

students_collection = database["students"]
predictions_collection = database["predictions"]

async def ping_database():
    try:
        await client.admin.command('ping')
        print(" MongoDB connected!")
        return True
    except:
        print(" MongoDB connection failed")
        return False