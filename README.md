# Student Dropout Prediction System

A full-stack AI-powered web application that predicts student dropout risk using machine learning, provides NLP-based chatbot support, and explains predictions with SHAP (SHapley Additive exPlanations). Built as a collaborative team project with each team member owning a distinct module.

---

## Team Members

| ID | Name | Module | Responsibility |
|----|------|--------|----------------|
| IT24102718 | Gangadhara J.S | Student Data Collection | Input form, student registration, feature engineering (24 engineered features) |
| IT24103341 | Wansanayaka | Prediction Management | Random Forest ML model, prediction pipeline, history |
| IT24102236 | Piyarathne A.K.G.C.K | NLP Chatbot | Intent classification, contextual response generation |
| IT24103766 | Warnakulaarachchi W.R.D.C.N | SHAP Explainability | Feature impact explanation, SHAP values, risk explanations |
| IT24102762 | Rajakaruna R.A.R.M.O.S | RBAC & Auth | JWT authentication, role-based access control, admin dashboard |
| IT24103869 | Thennakoon T.M.S.D | Analytics Dashboard | Staff analytics, aggregated reports, EDA visualisations |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Material UI v7 |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Database | MongoDB Atlas (cloud) via Motor async driver |
| ML Models | scikit-learn (Random Forest, Logistic Regression) |
| Explainability | SHAP (SHapley Additive exPlanations) |
| NLP | TF-IDF Vectorizer + Logistic Regression Pipeline |
| Auth | JWT tokens (python-jose), bcrypt password hashing (passlib) |

---

## How the System Works

The application has two user types: **students** (who submit data and get predictions) and **staff/admin** (who view analytics and manage the system). Here is the end-to-end data flow:

```
Student Journey:
  1. Student fills the registration form at /register
  2. Form data is saved to the `students` collection via POST /students/register
  3. Simultaneously, the ML model runs on the same data via POST /predict
  4. The Random Forest model outputs: Graduate / Enrolled / Dropout
  5. The RiskCalculator converts dropout probability → Low / Medium / High category
  6. SHAP values are generated immediately and saved to `risk_explanations`
  7. The prediction result is shown on-screen with risk level and probability

Chatbot Journey:
  1. Student sends a message at /chatbot
  2. NLP pipeline classifies the intent (6 possible intents)
  3. The student's latest risk level is fetched from `predictions`
  4. A contextual response is generated based on intent + risk level
  5. Conversation is saved to `chat_logs`

Staff Journey:
  1. Staff logs in at /login → receives a JWT token (30 min expiry)
  2. JWT is stored in localStorage and auto-attached to every API request
  3. Staff can access /staff/analytics (aggregated reports, risk trends)
  4. Staff can view SHAP explanations at /staff/explanation/{predictionId}
  5. Admin-only: /admin/stats and /admin/thresholds
```

---

## Prerequisites

### On Linux / Mac

- Python 3.11 or 3.12
- Node.js v18 or v20 (LTS)
- Git

### On Windows

- Python 3.11 or 3.12 — https://www.python.org/downloads/ (**check "Add Python to PATH"**)
- Node.js v18 or v20 — https://nodejs.org/
- Git — https://git-scm.com/download/win

### MongoDB Atlas (Database)

The project uses a shared MongoDB Atlas cluster. Before running, you must whitelist your IP address:

1. Go to https://cloud.mongodb.com and log in
2. Select **Cluster0** → click **Network Access** in the left sidebar
3. Click **+ Add IP Address**
4. Click **Allow Access from Anywhere** (adds `0.0.0.0/0`)
5. Click **Confirm** and wait ~30 seconds

---

## Project Structure

```
student-dropout-project/
├── backend/
│   ├── app/
│   │   ├── main.py                        # FastAPI app — 22 API endpoints
│   │   ├── database/
│   │   │   └── mongodb.py                 # MongoDB connection & all 6 collection operations
│   │   ├── models/ml_models/
│   │   │   ├── best_model.pkl             # Trained Random Forest classifier (required)
│   │   │   ├── scaler_selected.pkl        # StandardScaler for 24 features (required)
│   │   │   ├── selected_features.pkl      # List of 24 feature names (required)
│   │   │   └── label_encoder.pkl          # Encodes Graduate / Enrolled / Dropout (required)
│   │   ├── nlp/
│   │   │   ├── intent_classifier.pkl      # TF-IDF + LogisticRegression pipeline (required)
│   │   │   ├── response_templates.json    # Chatbot response templates per intent
│   │   │   └── intent_training_data.csv   # NLP training data (17 labelled utterances)
│   │   ├── shap/
│   │   │   ├── shap_explainer.pkl         # RandomForest for SHAP value generation (required)
│   │   │   ├── explanation_generator.py   # ShapExplainer class
│   │   │   └── feature_impact_mapping.json # Human-readable feature descriptions
│   │   ├── risk/
│   │   │   ├── risk_thresholds.json       # Configurable risk threshold values
│   │   │   ├── risk_calculator.py         # Converts dropout probability → Low/Medium/High
│   │   │   └── intervention_rules.json    # Intervention rules per risk level
│   │   └── services/
│   │       └── feature_engineering.py     # Computes 24 engineered features from raw input
│   ├── .env                               # Environment variables (MongoDB URL, JWT secret)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx                        # Router with all page routes
│   │   ├── context/
│   │   │   └── AuthContext.tsx            # JWT token state, login/logout, role management
│   │   ├── components/
│   │   │   ├── admin/                     # AdminDashboard.tsx, RiskSettings.tsx
│   │   │   ├── analytics/                 # AnalyticsDashboard.tsx, StaffAnalyticsDashboard.tsx
│   │   │   ├── auth/                      # LoginPage.tsx, ProtectedRoute.tsx
│   │   │   ├── chatbot/                   # Chatbot.tsx
│   │   │   ├── common/                    # MemberCredit.tsx (attribution chip)
│   │   │   ├── forms/                     # StudentRegistrationForm.tsx, FormField.tsx
│   │   │   ├── layout/                    # ProfessionalLayout.tsx (AppBar + nav)
│   │   │   └── results/                   # PredictionResult.tsx, PredictionHistory.tsx, ShapExplanation.tsx
│   │   ├── pages/
│   │   │   └── AllPages.tsx               # Page wrappers for each route
│   │   └── services/
│   │       └── api.service.ts             # All axios API calls to the backend
│   ├── public/images/                     # EDA chart PNG files
│   ├── .env                               # REACT_APP_API_URL=http://localhost:8000
│   └── package.json
├── data/
│   └── raw/data.csv                       # Original dataset (4,424 students, 35 features)
├── docs/
│   ├── model_results.csv                  # Model comparison: LR / DT / RF accuracy
│   ├── confusion_matrix.png               # Confusion matrix for best model
│   └── eda_insights.md                    # Key EDA findings
└── notebooks/                             # Jupyter notebooks for each module
    ├── eda.ipynb
    ├── model_training.ipynb
    ├── preprocessing.ipynb
    ├── nlp_chatbot.ipynb
    ├── risk_analysis.ipynb
    └── shap_analysis.ipynb
```

> **Note:** Files marked `(required)` are binary `.pkl` model files that must be present for the respective features to work. If missing, the backend starts in degraded mode and returns 503 for those endpoints.

---

## Setup & Run — Linux / Mac

### Step 1 — Clone the repository

```bash
git clone <your-repo-url> student-dropout-project
cd student-dropout-project
```

### Step 2 — Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install fastapi "uvicorn[standard]" motor pymongo python-dotenv scikit-learn \
    pandas numpy joblib "python-jose[cryptography]" "passlib[bcrypt]" python-multipart shap
```

> If a `venv_linux/` folder already exists in the repo, you can activate it directly:
> `source venv_linux/bin/activate` (no need to recreate it)

### Step 3 — Start the backend

```bash
# Inside backend/ with (venv) active
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected output:
```
ML Models loaded successfully
SHAP explainer loaded successfully
NLP models loaded successfully
Application started — MongoDB connected
INFO: Uvicorn running on http://0.0.0.0:8000
```

### Step 4 — Frontend setup (new terminal)

```bash
cd frontend
npm install
npm start
```

The browser opens at http://localhost:3000 automatically.

---

## Setup & Run — Windows

### Step 1 — Clone the repository

Open **Command Prompt** or **PowerShell**:

```cmd
git clone <your-repo-url> student-dropout-project
cd student-dropout-project
```

### Step 2 — Backend setup

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install --upgrade pip setuptools wheel
pip install fastapi "uvicorn[standard]" motor pymongo python-dotenv scikit-learn pandas numpy joblib "python-jose[cryptography]" "passlib[bcrypt]" python-multipart shap
```

### Step 3 — Start the backend

```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 4 — Frontend setup (new Command Prompt window)

```cmd
cd frontend
npm install
npm start
```

---

## Environment Configuration

### `backend/.env`

```env
# MongoDB Atlas — replace with your cluster URL if needed
MONGODB_URL=mongodb+srv://samidulagangadhara_db_user:<password>@cluster0.5svhy5y.mongodb.net/?appName=Cluster0
MONGODB_DB_NAME=student_dropout_db

# Server
API_PORT=8000
API_HOST=0.0.0.0

# JWT — IMPORTANT: change this to a long random string before deploying
JWT_SECRET=your-super-secret-key-change-this-to-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### `frontend/.env`

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ENV=development
```

---

## Application Pages

| URL | Page | Access | Member |
|-----|------|--------|--------|
| http://localhost:3000/register | Student registration form + ML prediction result | Public | Gangadhara / Wansanayaka |
| http://localhost:3000/chatbot | NLP support chatbot | Public | Piyarathne |
| http://localhost:3000/predictions | Search prediction history by student ID | Public | Wansanayaka |
| http://localhost:3000/analytics | Basic analytics + EDA visualisations | Public | Thennakoon |
| http://localhost:3000/admin | Admin stats dashboard | Public (UI) | Rajakaruna |
| http://localhost:3000/admin/risk-settings | Edit risk threshold values | Public (UI) | Rajakaruna |
| http://localhost:3000/login | Staff / admin login page | Public | Rajakaruna |
| http://localhost:3000/staff/analytics | Full staff analytics dashboard | **Staff / Admin only** | Thennakoon |
| http://localhost:3000/staff/explanation/:id | SHAP feature explanation view | **Staff / Admin only** | Warnakulaarachchi |

---

## Authentication & JWT

### How JWT works in this system

```
1. User calls POST /auth/login?username=X&password=Y
2. Backend looks up the user in the `users` MongoDB collection
3. Backend verifies the password against the bcrypt hash stored in password_hash
4. If valid, backend creates a signed JWT token containing:
      { sub: "username", role: "admin", user_id: "USR...", exp: <30 min from now> }
   The token is signed with JWT_SECRET from .env using HS256 algorithm
5. Frontend receives the token and stores it in localStorage under key "access_token"
6. Every subsequent API request automatically attaches:
      Authorization: Bearer <token>
   This is done by an axios request interceptor in api.service.ts
7. On protected endpoints, FastAPI's get_current_user dependency decodes the token,
   verifies the signature, checks expiry, and extracts the role
8. Role-specific guards (require_staff, require_admin) then allow or reject the request
9. Token expires after 30 minutes. On logout, the token is deleted from localStorage
```

### Three roles and what each can access

| Role | Description | Protected Routes |
|------|-------------|-----------------|
| `student` | Default for unauthenticated users | POST /predict (no token needed), POST /students/register, POST /chat |
| `staff` | Logged-in staff member | All student routes + GET /analytics/*, GET /predictions/explanation/{id}, GET /staff/analytics |
| `admin` | Full administrator | All staff routes + GET /admin/stats, PUT /admin/thresholds |

### Route protection summary

| Route | Guard | What Happens Without Valid Token |
|-------|-------|----------------------------------|
| POST /predict | Optional (auto_error=False) | Works anonymously as student role |
| GET /analytics/summary | require_staff | 401 Unauthorized |
| GET /analytics/risk-distribution | require_staff | 401 Unauthorized |
| GET /analytics/trends | require_staff | 401 Unauthorized |
| GET /analytics/top-factors | require_staff | 401 Unauthorized |
| GET /analytics/latest | require_staff | 401 Unauthorized |
| GET /analytics/history | require_staff | 401 Unauthorized |
| GET /predictions/explanation/{id} | require_staff | 401 Unauthorized |
| GET /admin/stats | require_admin | 401 Unauthorized |
| PUT /admin/thresholds | require_admin | 401 Unauthorized |

---

## First-Time Admin Setup

There is **no pre-created admin account**. You must create one before logging in. The backend must be running first.

### Option A — via FastAPI Interactive Docs (recommended)

1. Open http://localhost:8000/docs
2. Scroll to **POST /auth/register** → click **Try it out**
3. Fill in the query parameters:
   - `username`: e.g. `admin`
   - `email`: e.g. `admin@example.com`
   - `password`: e.g. `Admin1234`
   - `role`: **`admin`** ← this must be set explicitly, default is `staff`
4. Click **Execute**
5. You should get a `200` response like:
   ```json
   { "user_id": "USR20260101120000", "username": "admin", "role": "admin" }
   ```

### Option B — via curl (Linux/Mac)

```bash
curl -X POST "http://localhost:8000/auth/register?username=admin&email=admin@example.com&password=Admin1234&role=admin"
```

### Option C — via PowerShell (Windows)

```powershell
Invoke-WebRequest -Uri "http://localhost:8000/auth/register?username=admin&email=admin@example.com&password=Admin1234&role=admin" -Method POST
```

### Logging in via the UI

1. Go to http://localhost:3000/login
2. Enter your username and password
3. Click **Sign In**
4. On success you are redirected to `/staff/analytics`
5. The top navigation bar now shows your username chip and a **Staff Dashboard** link

### Creating a staff account

Same as above but set `role=staff`. Staff members can view analytics and SHAP explanations but cannot access admin stats or change risk thresholds.

---

## API Endpoints

Full interactive documentation: **http://localhost:8000/docs**

| Method | Endpoint | Auth Required | Description | Member |
|--------|----------|---------------|-------------|--------|
| GET | `/health` | None | Server + database health check | System |
| GET | `/` | None | Root info | System |
| POST | `/students/register` | None | Save student registration data | Gangadhara |
| POST | `/predict` | Optional | ML dropout prediction + SHAP generation | Wansanayaka |
| GET | `/predictions/explanation/{prediction_id}` | Staff / Admin | SHAP explanation for a prediction | Warnakulaarachchi |
| GET | `/predictions/{student_id}/summary` | None | Risk summary counts for a student | Wansanayaka |
| GET | `/predictions/{student_id}` | None | Full prediction history for a student | Wansanayaka |
| POST | `/chatbot/message` | None | Legacy chatbot (manual risk level input) | Piyarathne |
| POST | `/chat` | None | Chatbot (auto-fetches student risk) | Piyarathne |
| GET | `/chatbot/stats` | None | Intent distribution statistics | Piyarathne |
| POST | `/auth/register` | None | Create a new staff or admin user | Rajakaruna |
| POST | `/auth/login` | None | Login and receive JWT token | Rajakaruna |
| GET | `/admin/stats` | Admin only | System-wide admin statistics | Rajakaruna |
| PUT | `/admin/thresholds` | Admin only | Update risk threshold configuration | Rajakaruna |
| GET | `/analytics/dashboard` | None | Basic aggregated analytics data | Thennakoon |
| GET | `/analytics/summary` | Staff / Admin | Aggregated analytics snapshot | Thennakoon |
| GET | `/analytics/risk-distribution` | Staff / Admin | Risk level distribution breakdown | Thennakoon |
| GET | `/analytics/trends` | Staff / Admin | Risk trends over time (7d / 30d) | Thennakoon |
| GET | `/analytics/top-factors` | Staff / Admin | Top contributing SHAP features | Thennakoon |
| GET | `/analytics/latest` | Staff / Admin | Most recent saved analytics report | Thennakoon |
| GET | `/analytics/history` | Staff / Admin | All saved analytics reports | Thennakoon |

---

## Database (MongoDB Atlas)

Database name: `student_dropout_db`

| Collection | Owner | Description |
|------------|-------|-------------|
| `students` | Gangadhara | Raw student registration records |
| `predictions` | Wansanayaka | ML prediction results with risk_level and risk_category |
| `risk_explanations` | Warnakulaarachchi | SHAP top_positive_factors and top_negative_factors per prediction |
| `chat_logs` | Piyarathne | Chatbot messages, predicted intent, risk_level, bot_response |
| `users` | Rajakaruna | Staff and admin accounts with bcrypt password_hash, role, account_status |
| `analytics_reports` | Thennakoon | Saved analytics snapshots with risk trends and top factors |

### Check database connection

Open http://localhost:8000/health in your browser. Look for:
```json
{
  "status": "healthy",
  "database": "healthy"
}
```

If `"database": "unhealthy"` — your IP is not whitelisted in MongoDB Atlas (see Prerequisites above).

---

## ML Model Performance

| Model | Accuracy | Precision | Recall | F1-Score | Training Time |
|-------|----------|-----------|--------|----------|---------------|
| Logistic Regression | 78% | 0.77 | 0.78 | 0.77 | 2.3s |
| Decision Tree | 75% | 0.74 | 0.75 | 0.74 | 1.8s |
| **Random Forest** | **82%** | **0.82** | **0.82** | **0.82** | 4.2s |

The best model (Random Forest) is saved as `backend/app/models/ml_models/best_model.pkl`.

The model takes 24 engineered features as input (computed by `feature_engineering.py` from the raw form fields). Key features include:

- `success_rate_sem2` — courses passed / courses enrolled in semester 2
- `failure_rate_sem2` — 1 - success_rate_sem2
- `academic_performance_score` — weighted grade + success rate combination
- `family_support` — composite of scholarship, tuition status, debtor, displaced
- `risk_score` — overall rule-based risk score

---

## Chatbot Intents

The NLP chatbot classifies messages into 6 intents using a TF-IDF + Logistic Regression pipeline:

| Intent | Example Utterance | Response Varies By Risk Level |
|--------|-------------------|-------------------------------|
| `academic_difficulty` | "I'm struggling with my courses" | Yes (LOW / MEDIUM / HIGH) |
| `financial` | "I can't pay tuition" | Yes (LOW / MEDIUM / HIGH) |
| `time_management` | "No time to study" | Yes (LOW / MEDIUM / HIGH) |
| `motivation` | "I want to quit" | Yes (LOW / MEDIUM / HIGH) |
| `risk_inquiry` | "What is my risk level?" | No (fixed template) |
| `improvement_advice` | "How can I improve?" | No (fixed template) |

The new `POST /chat` endpoint automatically fetches the student's latest risk level from the `predictions` collection using the `student_id`, so the student does not need to provide their risk level manually.

---

## Running Both Servers — Quick Reference

**Linux / Mac:**
```bash
# Terminal 1 — Backend
cd backend && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend
cd frontend && npm start
```

**Windows:**
```cmd
rem Terminal 1 — Backend
cd backend && venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

rem Terminal 2 — Frontend
cd frontend && npm start
```

---

## Troubleshooting

### "MongoDB connection failed" on backend startup
Your IP is not whitelisted in MongoDB Atlas. Follow the steps in the Prerequisites section above.

### `pip install` fails with `No module named 'distutils'` (Python 3.12)
Run this first:
```bash
pip install setuptools wheel
```
Then install the other packages.

### Port 8000 or 3000 already in use

**Linux / Mac:**
```bash
lsof -ti:8000 | xargs kill -9
lsof -ti:3000 | xargs kill -9
```

**Windows:**
```cmd
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Frontend shows blank page or API errors
Make sure the backend is running on port 8000 before starting the frontend. Check `frontend/.env` has `REACT_APP_API_URL=http://localhost:8000`.

### scikit-learn version warning on startup
```
InconsistentVersionWarning: Trying to unpickle estimator from version 1.6.1 when using version 1.8.0
```
This is a warning only — models still work correctly. It occurs because the `.pkl` files were saved with an older scikit-learn version.

### Admin login fails — 401 Invalid credentials
You have not created an admin account yet. Use the FastAPI docs at http://localhost:8000/docs to call `POST /auth/register` with `role=admin` first (see First-Time Admin Setup section above).

### Analytics or Staff Dashboard shows 401 Unauthorized
You need to log in as a staff or admin user first. Go to http://localhost:3000/login and sign in. The Staff Dashboard link will appear in the navigation bar after login.

### SHAP explanation page shows an error or 404
The SHAP explanation is generated automatically when a prediction is made. If no explanation is found, either:
- The prediction was made before the SHAP module was integrated (re-run the prediction)
- The `shap_explainer.pkl` file is missing from `backend/app/shap/` (the file must be present for SHAP to work)

### `/admin/stats` returns 403 Forbidden
You are logged in as `staff`, not `admin`. Create a new account with `role=admin` or log in with an existing admin account.
