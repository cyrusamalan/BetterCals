BetterCals Machine Learning Roadmap

This document outlines the architecture and implementation phases for integrating Machine Learning into the BetterCals tracking engine.

## Core Philosophy

Predictive, not Diagnostic: Machine learning will be used for document extraction, trend forecasting, and behavioral recommendations.

Deterministic Clinical Math: Medical diagnostics (ASCVD Risk, Marker Bins, Health Scores) will remain strictly deterministic and rule-based to maintain clinical explainability and regulatory safety.

## Phase 0: The Prerequisite (Data Persistence & Feature Engineering)

Machine learning models require a clean, structured dataset. Before implementing any ML features, the application must transition from local state to a persistent database.

Database Stack: PostgreSQL (via Supabase or Vercel Postgres).

Schema Requirements:

users (id, age, gender, race, baseline_metrics)
blood_reports (id, user_id, date, raw_text, extracted_markers JSON)
user_outcomes (id, user_id, intervention_used, marker_delta)

Key Feature Variables to Track (The ML Feature Vector):

To train highly accurate predictive models, the database schema must be designed to capture and engineer the following data domains:

Metabolic & Lipid Indices: Fasting glucose, HbA1c, triglycerides, HDL, and LDL. The system must also calculate derived surrogate markers like the TyG (Triglyceride-Glucose) index and HOMA-IR, which are critical predictors of insulin resistance.

Hepatic, Renal, and Inflammatory Markers: Liver function enzymes (ALT, AST), serum albumin, uric acid, creatinine, and high-sensitivity C-reactive protein (hs-CRP).

Anthropometric & Demographic Data: Age, biological sex, BMI, and waist-to-hip ratio.

Lifestyle & Wearable Data: Self-reported or wearable-derived physical activity levels, diet composition, and sleep characteristics (including sleep duration, quality, and fragmentation).

"Aging Velocity" (Longitudinal Slopes): Once historical data is established, the application must engineer dynamic features representing the annualized rate of change for key biomarkers (e.g., the slope of HbA1c over 6 months). These slope features, termed "aging velocity," drastically improve the prediction of biological aging and future health states.

## Phase 1: Intelligent Document Processing (NLP / OCR)

The Goal: Replace the brittle Regular Expression (regex) logic in lib/bloodParser.ts with a robust Named Entity Recognition (NER) pipeline that can understand unstructured lab reports from any clinic.

Implementation Strategy

Option A (Managed Cloud): Integrate AWS Textract or Google Cloud Document AI (Healthcare Parser).

Send the uploaded PDF/Image to the cloud function.
Receive a structured JSON of key-value pairs and map the returned keys directly to the BloodMarkers interface.

Option B (Custom NLP Service): Build a lightweight Python microservice using FastAPI and spaCy.

Train a custom spaCy NER model on sample lab reports to recognize entities like `` and [VALUE].

## Phase 2: Predictive Health Models & Algorithm Selection

The Goal: Forecast where a user's markers will be in the next 6 months based on current trends, and classify their risk for metabolic syndrome.

Implementation Strategy

Tabular Clinical Data (Tree-Based Ensembles): For predicting metabolic phenotypes or biological age from a discrete set of blood biomarkers and anthropometrics, use decision tree ensembles such as eXtreme Gradient Boosting (XGBoost), LightGBM, or Random Forest. These models inherently handle the multicollinearity present in blood panels and consistently outperform deep neural networks on tabular clinical data.

Time-Series Forecasting: Implement statistical forecasting models (like ARIMA or Facebook Prophet) via a Python backend to project future marker trajectories. Update the MarkerComparisonChart.tsx to render predicted future data as a dashed line.

## Phase 3: Client-Side Inference Architecture (ONNX Runtime Web)

The Goal: Execute the trained machine learning models directly in the user's browser to guarantee data privacy (no health data leaves the device), eliminate server latency, and reduce cloud computing costs.

Implementation Strategy

Model Conversion: Train the models (e.g., XGBoost) in Python, then export them to the Open Neural Network Exchange (ONNX) format.

Next.js Integration: Place the .onnx model files directly into the Next.js /public directory so they can be served as static assets.

Local Execution: Install the onnxruntime-web package. Within the Next.js client components, instantiate an InferenceSession to load the model. Construct a tensor using the user's feature variables and execute the prediction entirely within the browser using WebAssembly or WebGPU.

## Phase 4: Explainable AI (XAI) for Personalized Insights

The Goal: Move away from hardcoded if/else recommendation logic and translate complex ML predictions into highly personalized, readable insights.

Implementation Strategy

Integrate SHAP: Because algorithms like XGBoost operate as "black boxes," integrate SHapley Additive exPlanations (SHAP) into the inference pipeline.

Feature Attribution: SHAP calculates the exact mathematical contribution of each specific feature to the final risk prediction. For example, SHAP can identify if a user's metabolic risk is primarily driven by their hs-CRP levels or their poor sleep quality.

Natural Language Generation: Parse the top contributing SHAP values in the frontend and map them to targeted natural language advice, allowing the application to dynamically prioritize recommendations (e.g., focusing on sleep interventions rather than broad caloric restriction).

## Phase 5: Collaborative Recommendation Engine

The Goal: Suggest interventions based on what successfully improved markers for similar user profiles.

Implementation Strategy

Vectorization & Clustering: Convert users into mathematical vectors based on their demographics and baseline markers. Use K-Means clustering to group users with similar metabolic profiles.

Outcome Tracking: Track which recommendations users actually followed, and measure the delta in their next blood test.

The Algorithm: When a new user uploads a test, find their nearest neighbors in the vector space. Surface the specific dietary or exercise interventions that yielded the highest success rate for that specific cluster.

## Summary of Next Steps for the Engineering Team

Immediate: Setup Supabase/PostgreSQL schema to track the extended feature vector variables.

Short-Term: Train an initial XGBoost model on synthetic or open-source data (like NHANES) to predict metabolic risk, and deploy it locally using ONNX Runtime Web.

Long-Term: Implement SHAP to power the Insights dashboard, replacing the static threshold logic with true personalized AI interpretations.
