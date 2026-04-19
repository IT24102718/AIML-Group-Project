from pydantic import BaseModel, Field
from typing import Optional, Dict
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

class StudentIn(BaseModel):
    student_id: str
    success_rate_sem2: float
    risk_score: float
    failure_rate_sem2: float
    academic_performance_score: float
    curricular_units_2nd_sem_approved: int
    failure_rate_sem1: float
    success_rate_sem1: float
    curricular_units_1st_sem_approved: int
    curricular_units_2nd_sem_grade: float
    family_support: float
    curricular_units_1st_sem_grade: float
    age_at_enrollment: int
    mothers_occupation: int
    course: int
    grade_improvement: float
    unemployment_rate: float
    parents_education: float
    inflation_rate: float
    tuition_fees_up_to_date: int
    fathers_occupation: int
    displaced: int
    scholarship_holder: int
    debtor: int
    application_mode: int

class PredictionOut(BaseModel):
    student_id: str
    risk_level: str
    confidence: float
    probabilities: Dict[str, float]
    timestamp: datetime

class PredictionDB(PredictionOut):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    
    class Config:
        json_encoders = {ObjectId: str}