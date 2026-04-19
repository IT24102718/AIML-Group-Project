import joblib
import numpy as np
import os

print("="*60)
print("🔍 TESTING MODEL LOADING (WITH SELECTED SCALER)")
print("="*60)

# Path to models
model_path = "app/models/ml_models/"

print(f"\n📁 Loading from: {model_path}")

try:
    # Load model
    model = joblib.load(os.path.join(model_path, 'best_model.pkl'))
    print(f"✅ Model loaded: {type(model).__name__}")
    
    # Load features
    features = joblib.load(os.path.join(model_path, 'selected_features.pkl'))
    print(f"✅ Features loaded: {len(features)} features")
    print(f"   First 5: {features[:5]}")
    
    # Load the new scaler_selected.pkl (24 features)
    scaler = joblib.load(os.path.join(model_path, 'scaler_selected.pkl'))
    print(f"✅ Scaler loaded: scaler_selected.pkl")
    print(f"   Scaler expects: {scaler.n_features_in_} features")
    
    # Verify it's 24 features
    if scaler.n_features_in_ != len(features):
        print(f"\n⚠️  WARNING: Scaler expects {scaler.n_features_in_} features but we have {len(features)}")
    else:
        print(f"✅ Feature count matches! ({scaler.n_features_in_} features)")
    
    # Test with random data
    print(f"\n🧪 Testing with {len(features)} features...")
    
    # Generate random test data
    random_data = np.random.rand(1, len(features))
    print(f"   Random input shape: {random_data.shape}")
    
    # Scale the data
    random_scaled = scaler.transform(random_data)
    print(f"   Data scaled successfully")
    
    # Make prediction
    prediction = model.predict(random_scaled)
    probabilities = model.predict_proba(random_scaled)
    
    # Try to load label encoder for class names
    try:
        label_encoder = joblib.load(os.path.join(model_path, 'label_encoder.pkl'))
        class_names = label_encoder.classes_
        predicted_class = class_names[prediction[0]]
    except:
        predicted_class = str(prediction[0])
        class_names = ['Class 0', 'Class 1', 'Class 2']
    
    print(f"\n✅ PREDICTION SUCCESSFUL!")
    print(f"   Predicted class: {predicted_class}")
    print(f"   Raw prediction: {prediction[0]}")
    print(f"\n   Probabilities:")
    for i, prob in enumerate(probabilities[0]):
        print(f"      {class_names[i]}: {prob:.4f} ({prob*100:.1f}%)")
    
    # Show which features were most important (if model has feature_importances_)
    if hasattr(model, 'feature_importances_'):
        print(f"\n📊 Top 5 most important features:")
        importances = model.feature_importances_
        top_indices = np.argsort(importances)[-5:][::-1]
        for i, idx in enumerate(top_indices):
            print(f"   {i+1}. {features[idx]}: {importances[idx]:.4f}")
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETED SUCCESSFULLY!")
    print("="*60)
    
except FileNotFoundError as e:
    print(f"\n❌ ERROR: File not found - {e}")
    print("\n📋 Available files in model folder:")
    try:
        files = os.listdir(model_path)
        for f in files:
            size = os.path.getsize(os.path.join(model_path, f)) / 1024
            print(f"   - {f:25} ({size:.1f} KB)")
    except:
        print(f"   Could not list files in {model_path}")
        
except Exception as e:
    print(f"\n❌ ERROR: {e}")
    print("\n🔍 Debug info:")
    import sys
    print(f"   Python version: {sys.version}")
    print(f"   Joblib version: {joblib.__version__}")
    print(f"   Numpy version: {np.__version__}")

input("\nPress Enter to exit...")