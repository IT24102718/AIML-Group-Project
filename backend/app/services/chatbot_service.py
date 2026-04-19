import json
import re
import joblib
from datetime import datetime
from pathlib import Path


class StudentSupportChatbot:
    """Chatbot with intent detection and response generation"""

    def __init__(self):
        
        # parents[0]=services, parents[1]=app, parents[2]=backend
        APP_DIR = Path(__file__).resolve().parents[1]  

        model_path = APP_DIR / "models" / "ml_models" / "intent_classifier_best.pkl"
        data_path = APP_DIR / "data" / "chatbot"

        print("Loading model from:", model_path)
        print("Loading data from:", data_path)

        # Try load ML model (if numpy/sklearn mismatch, chatbot still works via keywords)
        try:
            self.model = joblib.load(model_path)
        except Exception as e:
            print("⚠️ ML model failed to load (using keyword-only mode):", e)
            self.model = None

        # Load templates/data
        with open(data_path / "response_templates.json", "r", encoding="utf-8") as f:
            self.responses = json.load(f)

        with open(data_path / "top_risk_factors.json", "r", encoding="utf-8") as f:
            self.risk_factors = json.load(f)

        try:
            with open(data_path / "intent_keywords.json", "r", encoding="utf-8") as f:
                self.intent_keywords = json.load(f)
        except Exception:
            self.intent_keywords = self._get_default_keywords()

        self.conversation_history = []
        self.user_sessions = {}

        print("----Chatbot loaded successfully----")

    def _get_default_keywords(self):
        return {
            "academic_difficulty": {
                "primary": ["struggling", "difficult", "fail", "grade", "gpa", "marks", "exam"],
                "secondary": ["course", "class", "homework", "assignment", "lecture"],
            },
            "financial_concerns": {
                "primary": ["money", "tuition", "pay", "fees", "payment", "loan", "scholarship"],
                "secondary": ["financial", "aid", "bursary", "grant"],
            },
            "time_management": {
                "primary": ["deadline", "schedule", "timetable", "no time", "late"],
                "secondary": ["busy", "plan", "routine", "organize"],
            },
            "motivation_issues": {
                "primary": ["unmotivated", "motivation", "give up", "quit", "drop out", "dropout"],
                "secondary": ["tired", "burnout", "hopeless"],
            },
            "study_tips": {
                "primary": ["study", "revision", "revise", "study tips", "how to study"],
                "secondary": ["notes", "memorize", "memory", "technique"],
            },
            "mental_health": {
                "primary": ["stress", "stressed", "anxiety", "panic", "overwhelmed", "depressed"],
                "secondary": ["mental", "counseling", "therapy"],
            },
        }

    def preprocess_text(self, text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        text = re.sub(r"[^\w\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _keyword_intent_detection(self, processed: str):
        """Use intent_keywords to detect intent when model is unreliable."""
        if not processed or not hasattr(self, "intent_keywords"):
            return None
        words = set(processed.split())
        best_intent = None
        best_score = 0

        for intent_name, kw in self.intent_keywords.items():
            if not isinstance(kw, dict):
                continue
            primary = set(w.lower() for w in kw.get("primary", []))
            secondary = set(w.lower() for w in kw.get("secondary", []))
            context = set(w.lower() for w in kw.get("context", []))

            score = 0
            for w in words:
                if w in primary:
                    score += 3
                elif w in secondary:
                    score += 2
                elif w in context:
                    score += 1

            if score > best_score and score >= 2:
                best_score = score
                best_intent = intent_name

        return best_intent

    def detect_intent(self, message: str):
        """Detect intent using strong keyword overrides + ML (if available)."""
        if not message:
            return "general", 0.3, []

        processed = self.preprocess_text(message)

        # Overrides for common phrases 
        overrides = {
            "greeting": ["hi", "hello", "hey", "good morning", "good evening"],
            "risk_inquiry": [  
                "what is my dropout risk", "dropout risk", "my risk level",
                "am i at risk", "risk of dropping out", "chance of dropping out",
                "probability of dropout", "will i graduate", "am i going to fail",
                "predict my risk", "risk assessment", "how likely am i to drop out",
                "what's my risk", "tell me my risk", "dropout probability"
            ],
            "study_tips": [
                "study tips", "how to study", "study method", "study techniques",
                "revision", "revise", "memorize", "notes", "note making", "active recall"
            ],
            "time_management": [
                "time management", "timetable", "schedule", "routine",
                "deadline", "no time", "manage time", "late submissions"
            ],
            "motivation_issues": [
                "motivation", "unmotivated", "no motivation", "give up",
                "quit", "drop out", "dropout", "leave university"
            ],
            "financial_concerns": [
                "tuition", "fees", "money", "scholarship", "loan",
                "financial aid", "payment", "cant pay"
            ],
            "academic_difficulty": [
                "struggling", "hard", "difficult", "fail", "grades",
                "gpa", "exam", "coursework", "assignment"
            ],
            "mental_health": [
                "stress", "stressed", "anxiety", "panic", "overwhelmed",
                "burnout", "depressed", "mental health"
            ],
        }

        for intent_name, keys in overrides.items():
            if any(k in processed for k in keys):
                return intent_name, 0.95, ["keyword_override"]

        # Keyword fallback
        kw_intent = self._keyword_intent_detection(processed)

        # If ML model not available, use keywords only
        if self.model is None:
            return (kw_intent, 0.75, []) if kw_intent else ("general", 0.3, [])

        # ML prediction + confidence threshold
        try:
            raw_intent = self.model.predict([processed])[0]
            intent = str(raw_intent).strip()

            confidence = 0.7
            if hasattr(self.model, "predict_proba"):
                proba = self.model.predict_proba([processed])[0]
                confidence = float(max(proba))

            # Low confidence → don't trust ML
            if confidence < 0.55:
                return (kw_intent, 0.75, []) if kw_intent else ("general", confidence, [])

            # If ML says greeting but it's not a greeting message, ignore
            if intent == "greeting":
                return "general", confidence, []

            # If ML intent not in templates but keywords match a template, use keywords
            if intent not in self.responses and kw_intent and kw_intent in self.responses:
                return kw_intent, 0.75, []

            # If ML says general but keywords found something better, use keywords
            if intent == "general" and kw_intent:
                return kw_intent, 0.75, []

            return intent, confidence, []
        except Exception:
            return (kw_intent, 0.75, []) if kw_intent else ("general", 0.3, [])

    def get_risk_factors_by_level(self, risk_level: str):
        if risk_level == "HIGH":
            return self.risk_factors[:5]
        elif risk_level == "MEDIUM":
            return self.risk_factors[3:8] if len(self.risk_factors) > 7 else self.risk_factors[3:]
        else:
            return self.risk_factors[5:10] if len(self.risk_factors) > 9 else self.risk_factors[-5:]

    def generate_response(self, intent, risk_level, user_message, user_id=None):
        self.conversation_history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "message": user_message,
                "intent": intent,
                "risk_level": risk_level,
                "user_id": user_id,
            }
        )

        factors = self.get_risk_factors_by_level(risk_level)
        factors_text = ", ".join(factors[:3]) if factors else "academic factors"

        tips = []
        resources = []

        # Use template if exists
        if intent in self.responses:
            intent_responses = self.responses[intent]

            if isinstance(intent_responses, dict) and risk_level in intent_responses:
                response_data = intent_responses[risk_level]
                if isinstance(response_data, dict):
                    response_text = response_data.get("text", "")
                    tips = response_data.get("tips", [])
                    resources = response_data.get("resources", [])
                else:
                    response_text = str(response_data)
            elif isinstance(intent_responses, dict):
                response_text = intent_responses.get("text", str(intent_responses))
                tips = intent_responses.get("tips", [])
                resources = intent_responses.get("resources", [])
            else:
                response_text = str(intent_responses)
        else:
            response_text = (
                "I'm here to help with your academic success. You can ask me about:\n"
                "• Study tips\n"
                "• Time management\n"
                "• Academic difficulties\n"
                "• Financial concerns\n"
                "• Motivation issues"
            )
            tips = ["Try asking: 'I need study tips' or 'I can't manage my time'"]
            resources = ["Student Support Services"]

        # Replace placeholders
        response_text = response_text.replace("{factors}", factors_text)
        response_text = response_text.replace("{risk_level}", risk_level)

        formatted = response_text

        return {
            "response": formatted,
            "intent": intent,
            "risk_level": risk_level,
            "tips": tips[:3],
            "resources": resources[:3],
        }

    def chat(self, message, risk_level="MEDIUM", user_id=None):
        if not message or not message.strip():
            return {
                "response": "Please type a message. I'm here to help!",
                "intent": "empty",
                "risk_level": risk_level,
                "tips": [],
                "resources": [],
            }

        intent, confidence, _ = self.detect_intent(message)
        result = self.generate_response(intent, risk_level, message, user_id)
        result["confidence"] = float(confidence)
        return result