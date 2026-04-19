"""
SHAP Explanation Generator for Student Dropout Prediction
Author: Warnakulaarachchi
"""

import numpy as np
import joblib
import json
import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class ShapExplainer:
    def __init__(self, model_path, feature_names_path):
        self.model = joblib.load(model_path)
        self.feature_names = joblib.load(feature_names_path)

        # Load flat feature description mapping if available
        mapping_path = os.path.join(_BASE_DIR, "feature_impact_mapping.json")
        if os.path.exists(mapping_path):
            with open(mapping_path, "r") as f:
                self._feature_descriptions = json.load(f)
        else:
            self._feature_descriptions = {}

        # Attempt to initialise a SHAP TreeExplainer; fall back to feature_importances_
        self._shap_available = False
        try:
            import shap
            background = np.zeros((1, len(self.feature_names)))
            self.explainer = shap.TreeExplainer(self.model)
            self._shap_available = True
        except Exception:
            self.explainer = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def explain(self, features_array, prediction_id):
        """
        Generate a structured explanation for one student prediction.

        Parameters
        ----------
        features_array : np.ndarray
            1-D or 2-D feature array for a single student.
        prediction_id : str
            Unique identifier for this prediction (e.g. student_id).

        Returns
        -------
        dict with keys: prediction_id, top_factors, base_value, all_shap_values
        """
        if features_array.ndim == 1:
            features_array = features_array.reshape(1, -1)

        prediction = self.model.predict(features_array)[0]

        if self._shap_available:
            shap_values = self.explainer.shap_values(features_array)
            if isinstance(shap_values, list):
                class_shap = shap_values[prediction][0]
                base_value = float(self.explainer.expected_value[prediction])
            else:
                class_shap = shap_values[0]
                base_value = float(self.explainer.expected_value)
        else:
            # Fallback: use signed feature_importances_ scaled by feature deviation from zero
            importances = self.model.feature_importances_
            feature_row = features_array[0]
            # Sign: positive where feature value > 0 (higher value pushes toward predicted class)
            signs = np.where(feature_row >= 0, 1.0, -1.0)
            class_shap = importances * signs
            base_value = 0.0

        feature_impacts = list(zip(self.feature_names, class_shap))
        feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)

        top_factors = []
        for feature, impact in feature_impacts[:5]:
            description = self._feature_descriptions.get(
                feature,
                f"{'Increases' if impact > 0 else 'Decreases'} risk by {abs(impact):.3f}"
            )
            top_factors.append({
                "feature": feature,
                "impact": float(impact),
                "direction": "positive" if impact > 0 else "negative",
                "description": description,
            })

        return {
            "prediction_id": prediction_id,
            "top_factors": top_factors,
            "base_value": base_value,
            "all_shap_values": [float(v) for v in class_shap],
        }


# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import warnings
    warnings.filterwarnings("ignore")

    MODEL_DIR = os.path.join(_BASE_DIR, "..", "models", "ml_models")
    SHAP_DIR = _BASE_DIR

    explainer = ShapExplainer(
        model_path=os.path.join(SHAP_DIR, "shap_explainer.pkl"),
        feature_names_path=os.path.join(MODEL_DIR, "selected_features.pkl"),
    )

    feature_names = explainer.feature_names
    dummy = np.random.randn(len(feature_names))

    result = explainer.explain(dummy, prediction_id="TEST_001")
    print(json.dumps(result, indent=2))
