# ISO 13374 Predictive Maintenance System

## 1. Project Overview
This project is an enterprise-grade **Predictive Maintenance and Prognostics Platform** built for industrial applications, specifically modeled around aerospace engine degradation. It adheres strictly to the **ISO 13374 Standard**, which governs the condition monitoring and diagnostics of machines.

The system's primary goal is to analyze real-time multi-sensor data to predict the **Remaining Useful Life (RUL)** of engines. By predicting when a machine will fail, operators can transition from reactive or scheduled maintenance to highly efficient **predictive maintenance**, reducing downtime and maintenance costs.

---

## 2. The Machine Learning Notebook & Models

The core intelligence of the platform is driven by models trained on the **NASA C-MAPSS (Commercial Modular Aero-Propulsion System Simulation) FD001 Dataset**. 

### Data Preprocessing
Before feeding data to the algorithms, several data manipulation steps are performed:
1. **RUL Calculation**: The Remaining Useful Life is calculated for each engine cycle (max cycles for an engine minus the current cycle).
2. **Feature Pruning**: Constant sensors that do not provide any variance or predictive value are removed from the dataset.
3. **Scaling**: The remaining sensor features are normalized using `MinMaxScaler` to ensure neural networks converge correctly.
4. **Sequence Generation**: The data is split into sliding window sequences (e.g., 50 cycles per window) to capture the temporal, time-series nature of engine degradation.

### The Models
The system utilizes two distinct ML architectures, ultimately combining them for an accurate, robust prediction:

1. **Bidirectional LSTM (Long Short-Term Memory Network)**
   - **Architecture**: A Deep Neural Network using Bidirectional LSTM layers, Dropout layers (to prevent overfitting), and Batch Normalization. 
   - **Purpose**: Deep learning excels at capturing complex, non-linear patterns over time. The bidirectional nature allows the network to understand context from both past and "future" sequence data within the window.

2. **XGBoost Regressor (Extreme Gradient Boosting)**
   - **Architecture**: A tree-based ensemble model running on flattened temporal sequences.
   - **Purpose**: XGBoost is highly robust to noise and provides excellent baseline predictions, adding stability to the deep learning model.

3. **Weighted Ensemble Prediction**
   - The final output exposed to the frontend is a weighted average of both models: **60% LSTM + 40% XGBoost**.
   - This ensemble approach maximizes accuracy, mitigating the weaknesses of both individual models.

---

## 3. System Architecture (ISO 13374 Alignment)

The backend (built with Python & FastAPI) is architected directly around the 6 layers of the ISO 13374 standard:

1. **Layer 1: Data Acquisition (DA)** 
   - *Routes*: `/upload`, `/data`
   - Handles the ingestion of raw sensor telemetry (like the `sample_engine_data.txt` file) and stores it in a structured SQLite database.
2. **Layer 2: Data Manipulation (DM)**
   - Formats, cleans, and scales the raw data using the preprocessor module so it is ready for ML inference.
3. **Layer 3: Condition Monitoring (CM)**
   - *Routes*: `/fleet-status`, `/alerts`
   - Actively monitors the current sensor values against operational thresholds to detect immediate anomalies.
4. **Layer 4: Health Assessment (HA)**
   - *Routes*: `/engine/{id}`
   - Diagnoses the current "Health Status" of the machine (e.g., Healthy, Warning, Critical) based on data trends.
5. **Layer 5: Prognostic Assessment (PA)**
   - *Routes*: `/predict`, `/shap/{id}`
   - The ML Model layer. It forecasts the future state of the machine, specifically outputting the predicted Remaining Useful Life (RUL).
6. **Layer 6: Advisory Generation (AG)**
   - *Routes*: `/recommendations`
   - Translates the ML outputs into actionable insights for engineers (e.g., "Schedule maintenance within 10 cycles", "Inspect turbine pressure").

---

## 4. Frontend Features & Output

The frontend (built with React & Vite) provides a modern, interactive dashboard for engineers to monitor the fleet.

### Key Pages:
- **Dashboard (`DashboardPage.jsx`)**: A high-level overview of the entire fleet. It displays aggregate metrics, active alerts, and a summary of engines sorted by their health risk.
- **Data Ingestion (`DataIngestionPage.jsx`)**: Allows users to manually upload new sensor readings (txt/csv files) into the system for real-time analysis.
- **Analytics (`AnalyticsPage.jsx`)**: Provides fleet-wide statistical charts, comparing the distribution of RULs and sensor averages across all engines.
- **Engine Details (`EngineDetailsPage.jsx`)**: A deep dive into a single engine. 
  - Shows dynamic charts of individual sensor trajectories.
  - Displays the specific RUL prediction (Ensemble, LSTM, and XGBoost breakdown).
  - Shows SHAP (SHapley Additive exPlanations) values to explain *why* the ML model made its prediction (e.g., "Sensor 14 was the primary driver for this low RUL").
- **Architecture (`ArchitecturePage.jsx`)**: A visual breakdown of the ISO 13374 layers for stakeholders to understand the data flow.

### System Outputs
When looking at an engine, the system outputs three main metrics:
1. **RUL (Remaining Useful Life)**: The exact number of operational cycles the engine has left before expected failure.
2. **Health Status**: Categorized based on RUL (e.g., "Critical" if RUL < 20, "Warning" if RUL < 50, "Healthy" otherwise).
3. **Alert Level & Recommendations**: Color-coded UI alerts (Red/Yellow/Green) paired with generated text advising the maintenance crew on the next steps.
