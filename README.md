# RULVision

### ISO 13374-Based Predictive Maintenance & Remaining Useful Life Prediction

[![Live Demo](https://iso-13374-based-predictive-maintainance-fngtud2gc.vercel.app/)]

RULVision is an end-to-end predictive maintenance system designed to estimate the **Remaining Useful Life (RUL)** of industrial engines from multivariate sensor data.

The project uses the **NASA C-MAPSS FD001 turbofan engine dataset** and combines deep learning and gradient-boosted trees to model engine degradation. The system also incorporates **SHAP-based explainability** and follows the six-layer architecture defined by **ISO 13374** for condition monitoring and diagnostics.

---

## Why RULVision?

Traditional maintenance strategies are often:

* **Reactive** — repair equipment after failure
* **Preventive** — perform maintenance at fixed intervals

Predictive maintenance instead asks:

> **"Given the sensor history of this machine, how much useful operating life does it have left?"**

RULVision attempts to answer that question using temporal sensor data and machine learning.

---

## System Overview

```text
                ┌─────────────────────┐
                │  Engine Sensor Data  │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Data Acquisition     │
                │ & Preprocessing      │
                └──────────┬──────────┘
                           │
                 Sliding Window
                  (50 cycles)
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      ┌───────────────┐         ┌───────────────┐
      │    BiLSTM     │         │    XGBoost    │
      │   + Conv1D    │         │   Regressor   │
      └───────┬───────┘         └───────┬───────┘
              │                         │
              └──────────┬──────────────┘
                         ▼
                ┌─────────────────────┐
                │ Weighted Ensemble   │
                │ 60% BiLSTM + 40%    │
                │ XGBoost              │
                └──────────┬──────────┘
                           │
                           ▼
                 ┌───────────────────┐
                 │ RUL Prediction    │
                 │ + SHAP Analysis   │
                 └─────────┬─────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Maintenance         │
                │ Recommendations     │
                └─────────────────────┘
```

---

# Dataset

RULVision is trained and evaluated using the:

**NASA C-MAPSS FD001 dataset**

The dataset contains multivariate time-series measurements from simulated turbofan engines operating until failure.

Each engine is represented by multiple operating cycles with measurements from different sensors.

### RUL Target

For an engine with a maximum operating cycle `C_max`, the RUL at cycle `C` is calculated as:

```text
RUL = C_max - C
```

Therefore, as an engine approaches failure, its RUL decreases toward zero.

---

# Machine Learning Pipeline

## 1. Data Preprocessing

The raw sensor data goes through several preprocessing stages.

### Feature Pruning

Sensors with constant values or no useful variance are removed before training.

This reduces unnecessary features and avoids feeding non-informative signals into the models.

### Scaling

Remaining sensor features are normalized using `MinMaxScaler`.

This is particularly important for the neural-network component because differently scaled sensor values can make optimization more difficult.

### Sliding-Window Sequences

Because engine degradation is temporal, individual rows are not treated as independent observations.

Instead, consecutive cycles are converted into sequences.

Example:

```text
Cycle 1  ─┐
Cycle 2   │
Cycle 3   │
...       ├──► Sequence
Cycle 50 ─┘
```

A window of 50 cycles is used to provide the model with temporal context.

---

# Models

## BiLSTM + Conv1D

The deep-learning component uses a temporal neural-network architecture consisting of a **Conv1D front-end followed by Bidirectional LSTM layers**, with dropout and batch normalization.

The model is designed to learn nonlinear temporal relationships between sensor measurements and engine degradation.

### Why LSTM?

Engine degradation is not independent from one cycle to the next.

A sequence model can learn relationships such as:

```text
Sensor behavior at t-20
        ↓
Sensor behavior at t-10
        ↓
Current sensor behavior
        ↓
Estimated degradation
        ↓
RUL
```

### Result

The standalone BiLSTM achieved:

**RMSE: 13.63 cycles**

on the reported evaluation.

---

## XGBoost

A separate **XGBoost regression model** is trained on flattened temporal features.

XGBoost provides a strong tree-based baseline and can capture nonlinear relationships without requiring the same sequential architecture as the neural network.

---

# Ensemble Model

The final RUL prediction combines both models:

```text
Final RUL =
    0.60 × BiLSTM Prediction
  + 0.40 × XGBoost Prediction
```

The goal is to combine the temporal representation learned by the neural network with the robustness of gradient-boosted trees.

The individual model predictions are also exposed by the application so their behavior can be inspected separately.

---

# Explainable AI

A prediction is more useful in a maintenance environment when engineers can understand **why** the model produced it.

RULVision therefore integrates **SHAP (SHapley Additive exPlanations)**.

For an individual engine prediction, SHAP values can be used to identify which sensor features contributed most strongly to the predicted RUL.

Example interpretation:

```text
Predicted RUL: 18 cycles

Important contributing features:

Sensor 14  ███████████
Sensor 11  ███████
Sensor 9   █████
Sensor 2   ███
```

This allows the system to move beyond:

> "The engine has 18 cycles remaining."

toward:

> "The prediction is strongly influenced by changes in these sensor signals."

---

# ISO 13374 Architecture

RULVision organizes the backend around the six functional layers of **ISO 13374**.

| Layer | Function              | RULVision                        |
| ----- | --------------------- | -------------------------------- |
| 1     | Data Acquisition      | Sensor/file ingestion            |
| 2     | Data Manipulation     | Cleaning, formatting and scaling |
| 3     | Condition Monitoring  | Sensor monitoring and alerts     |
| 4     | Health Assessment     | Engine health classification     |
| 5     | Prognostic Assessment | RUL prediction                   |
| 6     | Advisory Generation   | Maintenance recommendations      |

### Data Flow

```text
Data Acquisition
       ↓
Data Manipulation
       ↓
Condition Monitoring
       ↓
Health Assessment
       ↓
Prognostic Assessment
       ↓
Advisory Generation
```

---

# Backend

The backend is built using:

* **Python**
* **FastAPI**
* **SQLite**
* TensorFlow / Keras
* XGBoost
* SHAP
* NumPy
* Pandas
* scikit-learn

### Main API functionality

```text
/upload
/data
/fleet-status
/alerts
/engine/{id}
/predict
/shap/{id}
/recommendations
```

The API handles data ingestion, model inference, engine health information, explainability and maintenance recommendations.

---

# Frontend

The frontend is built with:

* React
* Vite

### Dashboard

Provides an overview of the monitored engine fleet, including health states and active alerts.

### Data Ingestion

Allows sensor data files to be uploaded for processing.

### Analytics

Provides fleet-level statistics and sensor/RUL visualizations.

### Engine Details

Provides detailed information for an individual engine:

* Sensor trajectories
* Predicted RUL
* BiLSTM prediction
* XGBoost prediction
* Ensemble prediction
* SHAP feature contributions
* Health status
* Alerts

### Architecture

Provides a visual representation of the ISO 13374 workflow.

---

# Health & Maintenance Logic

Predicted RUL is translated into operational health categories.

```text
RUL < 20
   ↓
CRITICAL

20 ≤ RUL < 50
   ↓
WARNING

RUL ≥ 50
   ↓
HEALTHY
```

The system then generates maintenance-oriented recommendations based on the predicted health state.

---

# Tech Stack

```text
Machine Learning
├── TensorFlow / Keras
├── XGBoost
├── scikit-learn
└── SHAP

Data
├── NumPy
├── Pandas
└── NASA C-MAPSS

Backend
├── Python
├── FastAPI
└── SQLite

Frontend
├── React
└── Vite

Development
├── Git
└── Jupyter / Colab
```

---

# Key Results

### BiLSTM

**RMSE: 13.63 cycles**

The standalone BiLSTM outperformed the baseline and tuned XGBoost models in the reported evaluation.

### Ensemble

The final system combines:

```text
60% BiLSTM
+
40% XGBoost
```

to produce the final RUL estimate.

---

# What I Learned

This project involved more than training a regression model.

Key areas explored include:

* Multivariate time-series preprocessing
* Remaining Useful Life formulation
* Sliding-window sequence generation
* LSTM-based temporal modeling
* Gradient-boosted regression
* Ensemble modeling
* Model explainability with SHAP
* ML inference APIs with FastAPI
* Condition-monitoring architecture
* Translating model predictions into maintenance decisions

---

# Project Structure

```text
RULVision/
│
├── backend/
│   ├── models/
│   ├── routes/
│   ├── preprocessing/
│   └── main.py
│
├── frontend/
│   ├── src/
│   └── ...
│
├── notebooks/
│   └── model_training.ipynb
│
├── data/
│   └── sample_engine_data.txt
│
├── requirements.txt
└── README.md
```

---

# Future Improvements

Potential improvements include:

* Evaluating the ensemble weights using a dedicated validation set
* Hyperparameter optimization
* Comparing against additional RUL architectures such as Temporal CNNs and Transformers
* Uncertainty estimation for RUL predictions
* Online/streaming sensor ingestion
* Automated model monitoring
* More rigorous failure-cost-aware maintenance recommendations

---

# Disclaimer

The NASA C-MAPSS dataset is a simulated turbofan engine dataset. RULVision is a research/portfolio project demonstrating predictive-maintenance concepts and should not be treated as a certified system for real aircraft maintenance decisions.

---

## Author

**Athashree Badokar**

B.Tech Data Science
Department of Technology, Savitribai Phule Pune University

[LinkedIn] · [GitHub]
