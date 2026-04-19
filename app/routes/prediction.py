from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.db_models import StudentIn, PredictionOut, PredictionDB
from app.database import predictions_collection, students_collection
from app.services.prediction_service import PredictionService

router = APIRouter(prefix="/api", tags=["Predictions"])
prediction_service = PredictionService()

@router.post("/predict", response_model=PredictionOut)
async def predict_dropout(student: StudentIn):
    try:
        result = await prediction_service.predict(student.dict())
        
        prediction_record = PredictionDB(
            student_id=student.student_id,
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            timestamp=datetime.utcnow()
        )
        
        await predictions_collection.insert_one(
            prediction_record.dict(by_alias=True)
        )
        
        return PredictionOut(
            student_id=student.student_id,
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            probabilities=result["probabilities"],
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/predictions/{student_id}")
async def get_student_history(student_id: str):
    cursor = predictions_collection.find(
        {"student_id": student_id}
    ).sort("timestamp", -1).limit(10)
    
    predictions = await cursor.to_list(length=10)
    
    for pred in predictions:
        pred["_id"] = str(pred["_id"])
    
    return {"student_id": student_id, "predictions": predictions}