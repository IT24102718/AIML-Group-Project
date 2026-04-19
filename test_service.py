import asyncio
import traceback
from app.services.prediction_service import PredictionService

async def test():
    try:
        service = PredictionService()
        test_data = {
            "student_id": "TEST001",
            "success_rate_sem2": 0.85,
            "risk_score": 2.5,
            "failure_rate_sem2": 0.15,
            "academic_performance_score": 12.5,
            "curricular_units_2nd_sem_approved": 5,
            "failure_rate_sem1": 0.2,
            "success_rate_sem1": 0.8,
            "curricular_units_1st_sem_approved": 4,
            "curricular_units_2nd_sem_grade": 13.5,
            "family_support": 3.0,
            "curricular_units_1st_sem_grade": 12.0,
            "age_at_enrollment": 20,
            "mothers_occupation": 5,
            "course": 12,
            "grade_improvement": 1.5,
            "unemployment_rate": 10.8,
            "parents_education": 13.5,
            "inflation_rate": 1.4,
            "tuition_fees_up_to_date": 1,
            "fathers_occupation": 8,
            "displaced": 1,
            "scholarship_holder": 0,
            "debtor": 0,
            "application_mode": 8
        }
        result = await service.predict(test_data)
        print(" Success:", result)
    except Exception as e:
        print(" Error:")
        traceback.print_exc()

asyncio.run(test())