from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health, prediction
from app.database import ping_database

app = FastAPI(
    title="Student Dropout Prediction API",
    description="Predict student dropout risk using ML",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(prediction.router)

@app.on_event("startup")
async def startup():
    print("\n" + "="*50)
    print("🚀 Starting Student Dropout API")
    print("="*50)
    await ping_database()
    print("\n📝 Docs: http://localhost:8000/docs")
    print("="*50)

@app.get("/")
async def root():
    return {
        "message": "🎓 Student Dropout Prediction API",
        "docs": "/docs",
        "version": "1.0.0"
    }