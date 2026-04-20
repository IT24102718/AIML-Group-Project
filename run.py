import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 Starting Student Dropout Prediction API")
    print("=" * 50)
    print(f"📊 Database: {os.getenv('MONGODB_DB_NAME', 'student_dropout_db')}")
    print(f"🌐 Server: http://127.0.0.1:8000")
    print(f"📖 API Docs: http://127.0.0.1:8000/docs")
    print("=" * 50)
    
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=8000,
        reload=True
    )