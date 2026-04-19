from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import joblib
import numpy as np
from datetime import datetime, timedelta
import os
from jose import jwt, JWTError
import json
import string
import logging
import uuid

from dotenv import load_dotenv
from passlib.context import CryptContext

from app.database.mongodb import mongodb
from app.services.feature_engineering import calculate_engineered_features
from app.shap.explanation_generator import ShapExplainer
from app.risk.risk_calculator import RiskCalculator

load_dotenv()
logger = logging.getLogger(__name__)

app = FastAPI(title="Student Dropout Prediction API")

# CORS — allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# LOAD MODELS
# ============================================
MODEL_PATH = "app/models/ml_models/"

try:
    model = joblib.load(f"{MODEL_PATH}best_model.pkl")
    scaler = joblib.load(f"{MODEL_PATH}scaler_selected.pkl")
    feature_names = joblib.load(f"{MODEL_PATH}selected_features.pkl")
    label_encoder = joblib.load(f"{MODEL_PATH}label_encoder.pkl")
    print("ML Models loaded successfully")
except Exception as e:
    print(f"Error loading ML models: {e}")
    model = None
    scaler = None
    feature_names = None
    label_encoder = None

# Warnakulaarachchi's SHAP explainer (uses its own internal RF model)
try:
    shap_explainer = ShapExplainer(
        "app/shap/shap_explainer.pkl",
        f"{MODEL_PATH}selected_features.pkl",
    )
    print("SHAP explainer loaded successfully")
except Exception as e:
    print(f"Error loading SHAP explainer: {e}")
    shap_explainer = None

# Rajakaruna's risk thresholds
try:
    with open("app/risk/risk_thresholds.json", "r") as f:
        risk_thresholds = json.load(f)
except Exception as e:
    print(f"Error loading risk_thresholds.json: {e}")
    risk_thresholds = {}

# Piyarathne's NLP models
# intent_classifier is a Pipeline(TfidfVectorizer, LogisticRegression) — accepts raw text directly
try:
    intent_classifier = joblib.load("app/nlp/intent_classifier.pkl")
    with open("app/nlp/response_templates.json", "r") as f:
        response_templates = json.load(f)
    print("NLP models loaded successfully")
except Exception as e:
    print(f"Error loading NLP models: {e}")
    intent_classifier = None
    response_templates = {}

# Auth config (Rajakaruna)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT config (Thennakoon analytics auth)
SECRET_KEY = os.getenv("SECRET_KEY", "student-dropout-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# Simple session store — maps token string -> {username, role}
# Tokens are plain UUIDs, no expiry, stored in memory while the server runs.
# Used as fallback for endpoints that may receive session tokens (admin).
active_sessions: dict = {}


def make_session_token(username: str, role: str) -> str:
    """Create a new UUID session token and store it in active_sessions."""
    token = str(uuid.uuid4())
    active_sessions[token] = {"username": username, "role": role}
    return token


def _get_session(authorization: Optional[str]) -> Optional[dict]:
    """Parse 'Bearer <token>' header and return session dict or None."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[len("Bearer "):]
    return active_sessions.get(token)


async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    """Verify JWT and return user dict. Supports Bearer token in Authorization header."""
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated. Please log in.")
    # Try JWT first
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return {"username": payload["sub"], "role": payload.get("role", "staff")}
    except JWTError:
        pass
    # Fallback to legacy session token (for backward compat)
    session = _get_session(f"Bearer {token}" if token else None)
    if session:
        return session
    raise HTTPException(status_code=401, detail="Invalid or expired token")


async def require_staff(user: dict = Depends(get_current_user)) -> dict:
    """Allow only staff or admin roles."""
    if user["role"] not in ("staff", "admin"):
        raise HTTPException(status_code=403, detail="Staff or admin access required")
    return user


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    """Allow only admin role."""
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def require_predict_access(authorization: Optional[str] = Header(default=None)) -> dict:
    """Allow anyone — anonymous students need no token; token is optional."""
    session = _get_session(authorization)
    if session:
        return session
    return {"username": "anonymous", "role": "student"}


# ============================================
# PYDANTIC MODELS
# ============================================

class StudentData(BaseModel):
    marital_status: int
    gender: int
    age_at_enrollment: int
    nacionality: int
    international: int
    displaced: int
    application_mode: int
    application_order: int
    course: int
    daytime_evening_attendance: int
    previous_qualification: int
    mothers_qualification: int
    fathers_qualification: int
    mothers_occupation: int
    fathers_occupation: int
    debtor: int
    tuition_fees_up_to_date: int
    scholarship_holder: int
    educational_special_needs: int
    curricular_units_1st_sem_credited: int
    curricular_units_1st_sem_enrolled: int
    curricular_units_1st_sem_evaluations: int
    curricular_units_1st_sem_approved: int
    curricular_units_1st_sem_grade: float
    curricular_units_1st_sem_without_evaluations: int
    curricular_units_2nd_sem_credited: int
    curricular_units_2nd_sem_enrolled: int
    curricular_units_2nd_sem_evaluations: int
    curricular_units_2nd_sem_approved: int
    curricular_units_2nd_sem_grade: float
    curricular_units_2nd_sem_without_evaluations: int
    unemployment_rate: float
    inflation_rate: float
    gdp: float


class ChatMessage(BaseModel):
    user_id: str
    message: str
    risk_level: Optional[str] = None


class ChatRequest(BaseModel):
    student_id: str
    message: str


# ============================================
# HELPERS
# ============================================

def require_db():
    """Raise 503 if MongoDB is not connected."""
    if not mongodb.is_connected:
        raise HTTPException(
            status_code=503,
            detail="Database not connected. Check MongoDB URL in .env and network access."
        )

def preprocess_text(text: str) -> str:
    """Lowercase and strip punctuation — no external NLP dependency needed."""
    text = text.lower()
    text = text.translate(str.maketrans("", "", string.punctuation))
    return text.strip()


# ============================================
# STARTUP / SHUTDOWN
# ============================================

@app.on_event("startup")
async def startup_event():
    try:
        await mongodb.connect_to_database()
        print("Application started — MongoDB connected")
    except Exception as e:
        print(f"WARNING: MongoDB connection failed: {e}")
        print("Server will start without database. Endpoints requiring DB will return 503.")


@app.on_event("shutdown")
async def shutdown_event():
    await mongodb.close_database_connection()


# ============================================
# ROOT & HEALTH
# ============================================

@app.get("/")
async def root():
    return {
        "message": "Student Dropout Prediction API",
        "version": "1.0.0",
        "status": "active",
    }


@app.get("/health")
async def health_check():
    try:
        await mongodb.db.command("ping")
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy",
        "database": db_status,
        "members": {
            "Gangadhara": "Student Registration",
            "Wansanayaka": "Predictions",
            "Piyarathne": "Chatbot",
            "Warnakulaarachchi": "Explanations",
            "Rajakaruna": "Auth & Admin",
            "Thennakoon": "Analytics",
        },
        "timestamp": datetime.utcnow(),
    }


# ============================================
# GANGADHARA'S ENDPOINT - Student Registration
# ============================================

@app.post("/students/register")
async def register_student(student_data: StudentData):
    """Gangadhara's endpoint — Student registration."""
    require_db()
    student_id = f"STU{datetime.now().strftime('%Y%m%d%H%M%S')}"

    student_dict = student_data.dict()
    student_dict["student_id"] = student_id
    student_dict["created_at"] = datetime.utcnow()

    await mongodb.create_student(student_dict)
    return {"student_id": student_id, "message": "Student registered successfully"}


# ============================================
# WANSANAYAKA'S ENDPOINTS - Prediction
# ============================================

@app.post("/predict")
async def predict_dropout(
    student_data: StudentData,
    user: dict = Depends(require_predict_access),
):
    """Wansanayaka's endpoint — ML Prediction."""
    require_db()
    student_id = f"STU{datetime.now().strftime('%Y%m%d%H%M%S')}"

    # Feature engineering (Gangadhara's code)
    engineered = calculate_engineered_features(student_data)

    features_array = None  # will be set in the ML branch for SHAP reuse

    if model is None:
        # Rule-based fallback when model unavailable
        risk_score = engineered.get("risk_score", 0)
        if risk_score < 2:
            risk_level = "Graduate"
            probs = {"dropout": 0.05, "enrolled": 0.15, "graduate": 0.80}
        elif risk_score < 4:
            risk_level = "Enrolled"
            probs = {"dropout": 0.20, "enrolled": 0.60, "graduate": 0.20}
        else:
            risk_level = "Dropout"
            probs = {"dropout": 0.70, "enrolled": 0.20, "graduate": 0.10}
    else:
        feature_vector = [engineered.get(feat, 0) for feat in feature_names]
        features_array = np.array([feature_vector])
        features_scaled = scaler.transform(features_array)

        prediction = model.predict(features_scaled)[0]
        probabilities = model.predict_proba(features_scaled)[0]

        if label_encoder is not None:
            risk_level = label_encoder.inverse_transform([prediction])[0]
            classes = label_encoder.classes_
        else:
            classes = ["Graduate", "Enrolled", "Dropout"]
            risk_level = classes[prediction]

        probs = {cls.lower(): float(prob) for cls, prob in zip(classes, probabilities)}

    # Derive clean scalar fields for the predictions schema
    dropout_prob = float(probs.get("dropout", 0.0))
    confidence = float(max(probs.values())) if probs else 0.0

    # Rajakaruna's risk categorization: convert dropout probability to Low/Medium/High
    risk_calculator = RiskCalculator(low_threshold=2.5, high_threshold=5.0)
    risk_category = risk_calculator.get_risk_level(dropout_prob * 10)

    prediction_data = {
        "student_id": student_id,
        "risk_level": risk_level,
        "risk_category": risk_category,
        "probability": dropout_prob,
        "confidence": confidence,
        "risk_probabilities": probs,
        "timestamp": datetime.utcnow(),
        "explanation_id": None,
    }

    try:
        prediction_id = await mongodb.save_prediction(prediction_data)
    except Exception:
        prediction_id = "unsaved"

    # Warnakulaarachchi's SHAP explanation — generated eagerly with real features
    if shap_explainer is not None and features_array is not None and prediction_id != "unsaved":
        try:
            explanation = shap_explainer.explain(features_array, str(prediction_id))
            top_positive = [f for f in explanation["top_factors"] if f["direction"] == "positive"]
            top_negative = [f for f in explanation["top_factors"] if f["direction"] == "negative"]
            explanation_doc = {
                "prediction_id": str(prediction_id),
                "student_id": student_id,
                "risk_level": risk_level,
                "top_positive_factors": top_positive,
                "top_negative_factors": top_negative,
                "generated_at": datetime.utcnow(),
            }
            exp_id = await mongodb.save_explanation(explanation_doc)
            await mongodb.update_prediction_explanation_id(prediction_id, exp_id)
        except Exception as e:
            logger.warning("SHAP explanation generation failed: %s", e)

    return {
        "prediction_id": str(prediction_id),
        "student_id": student_id,
        "risk_level": risk_level,
        "risk_category": risk_category,
        "probability": dropout_prob,
        "confidence": confidence,
        "risk_probabilities": probs,
    }


@app.get("/predictions/explanation/{prediction_id}")
async def get_prediction_explanation_endpoint(
    prediction_id: str,
    user: dict = Depends(require_staff),
):
    """Warnakulaarachchi's endpoint — SHAP explanation for a prediction (staff/admin only)."""
    require_db()
    doc = await mongodb.get_prediction_explanation(prediction_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Explanation not found for this prediction")
    doc.pop("_id", None)
    return doc


@app.get("/predictions/{student_id}/summary")
async def get_prediction_summary(student_id: str):
    """Wansanayaka's endpoint — Prediction summary for a student."""
    require_db()
    predictions = await mongodb.get_student_predictions(student_id, limit=1000)
    if not predictions:
        return {
            "student_id": student_id,
            "total": 0,
            "latest_risk_level": None,
            "low": 0,
            "medium": 0,
            "high": 0,
        }
    counts = {"Low": 0, "Medium": 0, "High": 0,
              "Graduate": 0, "Enrolled": 0, "Dropout": 0}
    for p in predictions:
        rl = p.get("risk_level", "")
        if rl in counts:
            counts[rl] += 1
    latest = predictions[0]
    return {
        "student_id": student_id,
        "total": len(predictions),
        "latest_risk_level": latest.get("risk_level"),
        "low": counts.get("Low", 0) + counts.get("Graduate", 0),
        "medium": counts.get("Medium", 0) + counts.get("Enrolled", 0),
        "high": counts.get("High", 0) + counts.get("Dropout", 0),
    }


@app.get("/predictions/{student_id}")
async def get_student_predictions(student_id: str):
    """Wansanayaka's endpoint — Prediction history."""
    require_db()
    predictions = await mongodb.get_student_predictions(student_id)
    for p in predictions:
        p.pop("_id", None)
        if "timestamp" in p and hasattr(p["timestamp"], "isoformat"):
            p["timestamp"] = p["timestamp"].isoformat()
    return {"student_id": student_id, "predictions": predictions}


# ============================================
# PIYARATHNE'S ENDPOINTS - Chatbot
# ============================================

@app.post("/chatbot/message")
async def chatbot_message(message: ChatMessage):
    """Piyarathne's endpoint — Chatbot interaction."""
    require_db()
    if intent_classifier is None:
        raise HTTPException(status_code=503, detail="NLP model not available")

    # Preprocess using stdlib only — the Pipeline handles its own TF-IDF internally
    processed = preprocess_text(message.message)

    # Pipeline accepts a list of raw strings directly
    intent = intent_classifier.predict([processed])[0]
    confidence = float(intent_classifier.predict_proba([processed])[0].max())

    # Look up response template
    if intent in response_templates:
        template = response_templates[intent]
        if isinstance(template, dict):
            risk = (message.risk_level or "MEDIUM").upper()
            response = template.get(risk, template.get("MEDIUM", "Please seek guidance from your advisor."))
        else:
            # String template with placeholders — fill in sensible defaults
            response = template.format(
                risk_level=message.risk_level or "unknown",
                factors="academic performance and attendance",
                suggestions="improving attendance, meeting your advisor, and seeking tutoring",
            )
    else:
        response = "I'm here to help. Could you please rephrase that?"

    log = {
        "student_id": message.user_id,
        "user_message": message.message,
        "predicted_intent": intent,
        "risk_level": message.risk_level,
        "bot_response": response,
        "confidence": confidence,
        "timestamp": datetime.utcnow(),
    }
    await mongodb.save_chat_log(log)

    return {
        "intent": intent,
        "confidence": confidence,
        "response": response,
    }


@app.post("/chat")
async def chat(request: ChatRequest):
    """Piyarathne's primary endpoint — Chat with automatic risk context from predictions."""
    require_db()
    if intent_classifier is None:
        raise HTTPException(status_code=503, detail="NLP model not available")

    # Detect intent
    processed = preprocess_text(request.message)
    intent = intent_classifier.predict([processed])[0]
    confidence = float(intent_classifier.predict_proba([processed])[0].max())

    # Fetch latest student risk from predictions collection
    latest_predictions = await mongodb.get_student_predictions(request.student_id, limit=1)
    risk_level = latest_predictions[0]["risk_level"] if latest_predictions else None

    # Generate contextual response
    if intent in response_templates:
        template = response_templates[intent]
        if isinstance(template, dict):
            risk_key = (risk_level or "MEDIUM").upper()
            bot_response = template.get(risk_key, template.get("MEDIUM", "Please seek guidance from your advisor."))
        else:
            bot_response = template.format(
                risk_level=risk_level or "unknown",
                factors="academic performance and attendance",
                suggestions="improving attendance, meeting your advisor, and seeking tutoring",
            )
    else:
        bot_response = "I'm here to help. Could you please rephrase that?"

    # Save to chat_logs with correct schema
    log = {
        "student_id": request.student_id,
        "user_message": request.message,
        "predicted_intent": intent,
        "risk_level": risk_level,
        "bot_response": bot_response,
        "confidence": confidence,
        "timestamp": datetime.utcnow(),
    }
    await mongodb.save_chat_log(log)

    return {
        "student_id": request.student_id,
        "intent": intent,
        "confidence": confidence,
        "risk_level": risk_level,
        "response": bot_response,
    }


@app.get("/chatbot/stats")
async def get_chatbot_stats():
    """Piyarathne's endpoint — Chatbot analytics."""
    require_db()
    return await mongodb.get_chat_stats()


# ============================================
# WARNAKULAARACHCHI'S ENDPOINT - SHAP Explanations (deprecated legacy)
# ============================================

@app.get("/explain/{prediction_id}")
async def get_explanation_legacy(prediction_id: str):
    """Deprecated — use GET /predictions/explanation/{prediction_id} instead."""
    raise HTTPException(
        status_code=301,
        detail=f"This endpoint is deprecated. Use /predictions/explanation/{prediction_id}",
    )


# ============================================
# RAJAKARUNA'S ENDPOINTS - Auth & Admin
# ============================================

@app.post("/auth/register")
async def register_user(
    username: str,
    email: str,
    password: str,
    full_name: Optional[str] = None,
    role: str = "staff",
):
    """Rajakaruna's endpoint — User registration."""
    require_db()

    if role not in ("student", "staff", "admin"):
        raise HTTPException(status_code=400, detail="Invalid role. Must be student, staff, or admin.")

    existing = await mongodb.get_user(username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered")

    existing_email = await mongodb.get_user_by_email(email)
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = f"USR{datetime.now().strftime('%Y%m%d%H%M%S')}"
    user_data = {
        "user_id": user_id,
        "username": username,
        "email": email,
        "password_hash": pwd_context.hash(password),
        "full_name": full_name,
        "role": role,
        "account_status": "active",
        "created_at": datetime.utcnow(),
    }

    await mongodb.create_user(user_data)
    return {"user_id": user_id, "username": username, "role": role}


@app.post("/auth/login")
async def login_user(username: str, password: str):
    """Rajakaruna's endpoint — User login. Returns JWT with exp claim."""
    require_db()
    user = await mongodb.get_user(username)
    stored_hash = user.get("password_hash") or user.get("hashed_password") if user else None
    if not user or not stored_hash or not pwd_context.verify(password, stored_hash):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    role = user.get("role", "staff")
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": username,
        "role": role,
        "exp": expire,
    }
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    await mongodb.update_user_login(username)

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": role,
        "user_id": user.get("user_id", ""),
        "username": username,
    }


@app.get("/admin/stats")
async def get_admin_stats(user: dict = Depends(require_admin)):
    """Rajakaruna's endpoint — Admin dashboard stats."""
    require_db()
    total_students = await mongodb.db.students.count_documents({})
    total_predictions = await mongodb.db.predictions.count_documents({})
    risk_stats = await mongodb.get_prediction_stats()

    return {
        "total_students": total_students,
        "total_predictions": total_predictions,
        "risk_distribution": risk_stats,
        "thresholds": risk_thresholds,
    }


@app.put("/admin/thresholds")
async def update_thresholds(new_thresholds: dict, user: dict = Depends(require_admin)):
    """Rajakaruna's endpoint — Update risk thresholds."""
    with open("app/risk/risk_thresholds.json", "w") as f:
        json.dump(new_thresholds, f, indent=2)

    global risk_thresholds
    risk_thresholds = new_thresholds

    return {"message": "Thresholds updated successfully"}


# ============================================
# THENNAKOON'S ENDPOINTS - Analytics Dashboard
# ============================================

@app.get("/analytics/dashboard")
async def get_analytics_dashboard():
    """Thennakoon's endpoint — Analytics dashboard (DEPRECATED, no auth). Use /analytics/summary etc."""
    require_db()
    return await mongodb.get_analytics_dashboard()


@app.get("/analytics/summary")
async def get_analytics_summary(
    staff_id: str = "",
    filter_range: str = "30d",
    user: dict = Depends(require_staff),
):
    """Thennakoon's endpoint — Aggregated summary statistics (staff/admin only)."""
    require_db()
    generated_by = staff_id or user.get("username", "system")

    total_students = await mongodb.db.students.count_documents({})
    total_predictions = await mongodb.db.predictions.count_documents({})
    total_conversations = await mongodb.db.chat_logs.count_documents({})

    report = {
        "report_type": "summary",
        "generated_at": datetime.utcnow(),
        "generated_by": generated_by,
        "filter_range": filter_range,
        "total_students": total_students,
        "total_predictions": total_predictions,
        "total_conversations": total_conversations,
    }
    await mongodb.save_analytics_report(report)
    report.pop("_id", None)
    return report


@app.get("/analytics/risk-distribution")
async def get_risk_distribution(
    staff_id: str = "",
    filter_range: str = "30d",
    user: dict = Depends(require_staff),
):
    """Thennakoon's endpoint — Risk level distribution from predictions (staff/admin only)."""
    require_db()
    generated_by = staff_id or user.get("username", "system")

    risk_stats = await mongodb.get_prediction_stats()

    report = {
        "report_type": "risk_distribution",
        "generated_at": datetime.utcnow(),
        "generated_by": generated_by,
        "filter_range": filter_range,
        "risk_distribution": risk_stats,
    }
    await mongodb.save_analytics_report(report)
    report.pop("_id", None)
    return report


@app.get("/analytics/trends")
async def get_analytics_trends(
    days: int = 30,
    staff_id: str = "",
    user: dict = Depends(require_staff),
):
    """Thennakoon's endpoint — Risk trend time-series (staff/admin only)."""
    require_db()
    generated_by = staff_id or user.get("username", "system")

    trends = await mongodb.get_risk_trends(days=days)

    report = {
        "report_type": "trends",
        "generated_at": datetime.utcnow(),
        "generated_by": generated_by,
        "filter_range": f"{days}d",
        "risk_trends": trends,
    }
    await mongodb.save_analytics_report(report)
    report.pop("_id", None)
    return report


@app.get("/analytics/top-factors")
async def get_top_factors(
    staff_id: str = "",
    filter_range: str = "30d",
    user: dict = Depends(require_staff),
):
    """Thennakoon's endpoint — Most common SHAP contributing factors (staff/admin only)."""
    require_db()
    generated_by = staff_id or user.get("username", "system")

    factors = await mongodb.get_top_factors(limit=10)

    report = {
        "report_type": "top_factors",
        "generated_at": datetime.utcnow(),
        "generated_by": generated_by,
        "filter_range": filter_range,
        "top_factors": factors,
    }
    await mongodb.save_analytics_report(report)
    report.pop("_id", None)
    return report


@app.get("/analytics/latest")
async def get_analytics_latest(user: dict = Depends(require_staff)):
    """Thennakoon's endpoint — Most recent analytics report (staff/admin only)."""
    require_db()
    report = await mongodb.get_latest_analytics_report()
    if not report:
        raise HTTPException(status_code=404, detail="No analytics reports found")
    report.pop("_id", None)
    return report


@app.get("/analytics/history")
async def get_analytics_history(limit: int = 20, user: dict = Depends(require_staff)):
    """Thennakoon's endpoint — List of past analytics reports (staff/admin only)."""
    require_db()
    reports = await mongodb.get_analytics_history(limit=limit)
    for r in reports:
        r.pop("_id", None)
    return {"reports": reports, "total": len(reports)}
