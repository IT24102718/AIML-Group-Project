import numpy as np
import joblib
from pathlib import Path

MODELS_DIR = Path(__file__).parent.parent / "models" / "ml_models"

class PredictionService:
    def __init__(self):
        try:
            self.model = joblib.load(MODELS_DIR / "best_model.pkl")
            self.scaler = joblib.load(MODELS_DIR / "scaler_selected.pkl")
            self.label_encoder = joblib.load(MODELS_DIR / "label_encoder.pkl")
            self.feature_names = joblib.load(MODELS_DIR / "selected_features.pkl")
            print(" ML Model loaded successfully!")
            print(f" Model expects {len(self.feature_names)} features")
        except Exception as e:
            print(f" Error loading model: {e}")
            raise e
    
    def prepare_features(self, student_data: dict):
        """Convert student data to feature array in correct order"""
        features = []
        
        # Get features in the exact order the model expects
        for feature_name in self.feature_names:
            # Get value from student_data, default to 0 if not found
            value = student_data.get(feature_name, 0)
            features.append(float(value))
        
        # Convert to numpy array and reshape for single prediction
        features_array = np.array(features).reshape(1, -1)
        return features_array
    
    async def predict(self, student_data: dict):
        """Make prediction for one student"""
        try:
            # Prepare features
            features = self.prepare_features(student_data)
            
            # Scale features
            features_scaled = self.scaler.transform(features)
            
            # Make prediction
            prediction = self.model.predict(features_scaled)[0]
            probabilities = self.model.predict_proba(features_scaled)[0]
            
            # Convert prediction to class name
            risk_level = self.label_encoder.inverse_transform([prediction])[0]
            
            # Create probabilities dictionary
            prob_dict = {}
            for i, class_name in enumerate(self.label_encoder.classes_):
                prob_dict[class_name] = float(probabilities[i])
            
            return {
                "risk_level": risk_level,
                "confidence": float(max(probabilities)),
                "probabilities": prob_dict
            }
        except Exception as e:
            print(f" Prediction error: {e}")
            raise e