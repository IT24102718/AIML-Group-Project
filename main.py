from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
from typing import List, Dict, Any
from datetime import datetime
import os

# Import MongoDB functions
from database import connect_to_mongo, close_mongo_connection, get_database

app = FastAPI(title="Risk Explanation API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request model
class StudentData(BaseModel):
    student_id: str
    class Config:
        extra = "allow"

# Load ML models
print("Loading models...")
try:
    model = joblib.load('models/my_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    label_encoder = joblib.load('models/label_encoder.pkl')
    selected_features = joblib.load('models/selected_features.pkl')
    all_features = joblib.load('models/feature_names.pkl')
    explainer = joblib.load('models/shap_explainer.pkl')
    print("✅ All models loaded successfully!")
    print(f"📊 Scaler expects {len(all_features)} features")
    print(f"📊 Model uses {len(selected_features)} features")
except Exception as e:
    print(f"❌ Error loading models: {e}")

# Startup event - connect to MongoDB
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

# Shutdown event - close MongoDB connection
@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Risk Explanation API is running"}

@app.post("/explain")
async def explain(student: StudentData):
    """
    Get SHAP explanation for a student using data from predictions collection
    """
    try:
        # Get database connection
        db = get_database()
        if db is None:
            raise HTTPException(status_code=500, detail="Database not connected")
        
        # STEP 1: Fetch the latest prediction for this student
        prediction = await db.predictions.find_one(
            {"student_id": student.student_id},
            sort=[("created_at", -1)]
        )
        
        if not prediction:
            raise HTTPException(
                status_code=404, 
                detail=f"No prediction found for student {student.student_id}"
            )
        
        print(f"📊 Found prediction for {student.student_id}")
        
        # STEP 2: Get the student data from the prediction
        if "engineered_features" in prediction:
            student_dict = prediction["engineered_features"]
        else:
            # Fallback: use the whole prediction without _id and timestamp
            student_dict = {k: v for k, v in prediction.items() 
                           if k not in ["_id", "created_at", "student_id", "risk_level", "risk_probabilities"]}
        
        print(f"📊 Using student data with {len(student_dict)} features")
        
        # STEP 3: Create array with ALL 48 features for scaler
        all_input_features = []
        for feature in all_features:
            value = student_dict.get(feature, 0)
            all_input_features.append(value)
        
        all_input_array = np.array(all_input_features).reshape(1, -1)
        all_input_scaled = scaler.transform(all_input_array)
        
        # STEP 4: Extract features for model (24 features)
        selected_indices = []
        for feature in selected_features:
            if feature in all_features:
                idx = list(all_features).index(feature)
                selected_indices.append(idx)
        
        model_input = all_input_scaled[:, selected_indices]
        
        # STEP 5: Make prediction
        prediction_result = model.predict(model_input)[0]
        probabilities = model.predict_proba(model_input)[0]
        risk_level = label_encoder.inverse_transform([prediction_result])[0]
        
        # STEP 6: Get SHAP values
        shap_values = explainer.shap_values(model_input)
        shap_values_for_pred = shap_values[prediction_result][0]
        
        # ==================== FIXED: IMPROVED RISK/PROTECTIVE FACTORS ====================
        # STEP 7: Sort features by absolute SHAP impact (most important first)
        impacts = list(zip(selected_features, shap_values_for_pred))
        impacts.sort(key=lambda x: abs(x[1]), reverse=True)

        risk_factors = []
        protective_factors = []

        # Separate based on SHAP sign: positive = increases dropout risk, negative = protective
        for feature, impact in impacts[:12]:   # Take top 12 for better selection
            feature_name = str(feature).strip()
            impact_val = float(impact)

            if impact_val > 0:   # Risk factor (increases probability of dropout)
                risk_factors.append({
                    "feature": feature_name,
                    "impact": round(impact_val, 4),
                    "advice": get_advice(feature_name)
                })
            else:                # Protective factor (decreases probability of dropout)
                protective_factors.append({
                    "feature": feature_name,
                    "impact": round(abs(impact_val), 4),
                    "advice": f"Good {feature_name} - maintain this"
                })

        # Fallback: If no factors were separated (rare case), put top 5 as risk factors
        if len(risk_factors) == 0 and len(protective_factors) == 0:
            for feature, impact in impacts[:5]:
                risk_factors.append({
                    "feature": str(feature),
                    "impact": round(abs(float(impact)), 4),
                    "advice": get_advice(str(feature))
                })

        # ==================== RESULT ====================
        result = {
            "student_id": student.student_id,
            "risk_level": risk_level,
            "confidence": round(float(max(probabilities)), 3),
            "summary": f"{risk_level} risk student",
            "top_risk_factors": risk_factors[:5],
            "top_protective_factors": protective_factors[:5],
            "prediction_id": str(prediction["_id"])
        }
        
        # STEP 9: Save explanation to MongoDB with reference to prediction
        try:
            explanation_doc = {
                "student_id": student.student_id,
                "prediction_id": prediction["_id"],
                "risk_level": risk_level,
                "confidence": result["confidence"],
                "prediction": int(prediction_result),
                "probabilities": {
                    "Dropout": float(probabilities[0]),
                    "Enrolled": float(probabilities[1]),
                    "Graduate": float(probabilities[2])
                },
                "top_risk_factors": risk_factors[:5],
                "top_protective_factors": protective_factors[:5],
                "shap_values": {feature: float(impact) for feature, impact in impacts[:15]},
                "timestamp": datetime.now(),
                "input_data_used": student_dict
            }
            
            await db.explanations.insert_one(explanation_doc)
            print(f"✅ Saved explanation for {student.student_id} to MongoDB")
            
        except Exception as e:
            print(f"⚠️ Error saving to MongoDB: {e}")
        
        return result
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Explanation error: {e}")
        raise HTTPException(status_code=500, detail=f"Explanation error: {str(e)}")

@app.post("/predict")
async def predict(student: StudentData):
    """
    Make a prediction for a student (simple prediction without database fetch)
    """
    try:
        student_dict = student.dict()
        
        # Create array with ALL features for scaler
        all_input_features = []
        for feature in all_features:
            value = student_dict.get(feature, 0)
            all_input_features.append(value)
        
        all_input_array = np.array(all_input_features).reshape(1, -1)
        all_input_scaled = scaler.transform(all_input_array)
        
        # Extract features for model
        selected_indices = []
        for feature in selected_features:
            if feature in all_features:
                idx = list(all_features).index(feature)
                selected_indices.append(idx)
        
        model_input = all_input_scaled[:, selected_indices]
        
        # Make prediction
        prediction = model.predict(model_input)[0]
        probabilities = model.predict_proba(model_input)[0]
        risk_level = label_encoder.inverse_transform([prediction])[0]
        
        result = {
            "student_id": student.student_id,
            "risk_level": risk_level,
            "confidence": float(max(probabilities)),
            "probabilities": {
                "Dropout": float(probabilities[0]),
                "Enrolled": float(probabilities[1]),
                "Graduate": float(probabilities[2])
            }
        }
        
        return result
    
    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/history/{student_id}")
async def get_history(student_id: str, limit: int = 10):
    """
    Get explanation history for a student from MongoDB
    """
    try:
        db = get_database()
        if db is None:
            return {"student_id": student_id, "history": [], "message": "Database not connected"}
        
        # Query explanations from MongoDB
        cursor = db.explanations.find(
            {"student_id": student_id}
        ).sort("timestamp", -1).limit(limit)
        
        history = []
        async for doc in cursor:
            history.append({
                "student_id": doc["student_id"],
                "risk_level": doc["risk_level"],
                "confidence": doc["confidence"],
                "timestamp": doc["timestamp"].isoformat() if doc["timestamp"] else None,
                "prediction_id": str(doc["prediction_id"]) if "prediction_id" in doc else None
            })
        
        if not history:
            return {"student_id": student_id, "history": [], "message": "No history found"}
        
        return {"student_id": student_id, "history": history}
    
    except Exception as e:
        print(f"History error: {e}")
        raise HTTPException(status_code=500, detail=f"History error: {str(e)}")

@app.get("/students")
async def get_all_students(limit: int = 10, page: int = 1):
    """
    Get list of all unique students with their latest predictions (with pagination)
    """
    try:
        db = get_database()
        if db is None:
            return {"students": [], "message": "Database not connected", "total": 0, "page": page, "limit": limit}
        
        # First, get total count of unique students
        count_pipeline = [
            {
                "$group": {
                    "_id": "$student_id"
                }
            },
            {
                "$count": "total"
            }
        ]
        
        count_result = await db.predictions.aggregate(count_pipeline).to_list(length=1)
        total = count_result[0]["total"] if count_result else 0
        
        # Calculate skip
        skip = (page - 1) * limit
        
        # Get paginated unique students
        pipeline = [
            {
                "$sort": {"created_at": -1}
            },
            {
                "$group": {
                    "_id": "$student_id",
                    "risk_level": {"$first": "$risk_level"},
                    "timestamp": {"$first": "$created_at"}
                }
            },
            {
                "$project": {
                    "student_id": "$_id",
                    "risk_level": 1,
                    "timestamp": 1
                }
            },
            {
                "$skip": skip
            },
            {
                "$limit": limit
            }
        ]
        
        cursor = db.predictions.aggregate(pipeline)
        
        students = []
        async for doc in cursor:
            students.append({
                "student_id": doc["student_id"],
                "risk_level": doc.get("risk_level", "Unknown"),
                "timestamp": doc["timestamp"].isoformat() if doc.get("timestamp") else None
            })
        
        # Also try to get from students collection if predictions is empty
        if not students and total == 0:
            students_cursor = db.students.find().limit(limit)
            async for doc in students_cursor:
                students.append({
                    "student_id": doc.get("student_id", "Unknown"),
                    "risk_level": "Unknown",
                    "timestamp": None
                })
            total = len(students)
        
        return {
            "students": students, 
            "count": len(students),
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit if total > 0 else 1
        }
    
    except Exception as e:
        print(f"Error fetching students: {e}")
        return {"students": [], "message": str(e), "total": 0, "page": page, "limit": limit}

def get_advice(feature):
    """Improved advice mapping"""
    advice = {
        "failure_rate_sem2": "Meet with academic advisor immediately",
        "risk_score": "Schedule counseling session",
        "success_rate_sem2": "Join study groups for better performance",
        "Tuition fees up to date": "Contact financial aid office",
        "Scholarship holder": "Maintain good grades to keep scholarship",
        "Debtor": "Seek financial counseling",
        "Age at enrollment": "Connect with student support services",
        "Course": "Talk to academic advisor about course selection",
        "Mother's qualification": "Seek academic support and mentoring",
        "Father's qualification": "Connect with student mentoring program",
        "Curricular units 2nd sem (approved)": "Focus on completing more units",
        "academic_performance_score": "Attend extra tutorials and study sessions",
        # Add more features as they appear in your model
    }
    return advice.get(feature, f"Discuss {feature} with your academic advisor")
