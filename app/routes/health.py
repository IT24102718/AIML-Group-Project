from fastapi import APIRouter
from app.database import ping_database

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "message": "API is running"
    }

@router.get("/database")
async def check_database():
    is_connected = await ping_database()
    return {"database": "connected" if is_connected else "disconnected"}