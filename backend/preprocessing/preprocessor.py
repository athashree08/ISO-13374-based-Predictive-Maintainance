"""
Preprocessing Module
ISO 13374 Layer 2: Data Manipulation

Implements exact preprocessing pipeline from the C-MAPSS notebook:
- RUL computation with piecewise linear degradation model
- Constant sensor removal
- MinMax scaling
- Sequence generation for LSTM
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib
import os

# ─────────────────────────────────────────
# Feature Configuration (from notebook)
# ─────────────────────────────────────────
COLUMN_NAMES = (
    ['engine_id', 'cycle', 'op_setting_1', 'op_setting_2', 'op_setting_3']
    + [f'sensor_{i}' for i in range(1, 22)]
)

# Sensors removed due to zero/near-zero variance (from EDA in notebook)
CONSTANT_SENSORS = ['sensor_1', 'sensor_5', 'sensor_10', 'sensor_16', 'sensor_18', 'sensor_19']

# SHAP-significant sensors (from explainability analysis)
IMPORTANT_SENSORS = ['sensor_4', 'sensor_11', 'sensor_12']

# Feature set used for training
FEATURE_COLS = [col for col in COLUMN_NAMES 
                if col not in ['engine_id', 'cycle'] + CONSTANT_SENSORS]

# RUL thresholds for health classification (ISO 13374 aligned)
RUL_HEALTHY_THRESHOLD = 80    # > 80 cycles: HEALTHY
RUL_CAUTION_THRESHOLD = 40    # 40-80 cycles: CAUTION
RUL_WARNING_THRESHOLD = 15    # 15-40 cycles: WARNING
                               # < 15 cycles: CRITICAL

# Piecewise linear degradation cap from notebook
RUL_CAP = 125

# LSTM sequence length
SEQUENCE_LENGTH = 30


def load_cmapss_txt(file_content: str, is_test: bool = False) -> pd.DataFrame:
    """
    Parse NASA C-MAPSS text format.
    Compatible with train_FD001.txt and test_FD001.txt
    """
    import io
    df = pd.read_csv(
        io.StringIO(file_content),
        sep=r'\s+',
        header=None,
        names=COLUMN_NAMES
    )
    return df


def add_rul_column(df: pd.DataFrame, rul_cap: int = RUL_CAP) -> pd.DataFrame:
    """
    Add capped RUL column using piecewise linear model.
    Matches notebook Section 5 preprocessing exactly.
    """
    max_cycles = df.groupby('engine_id')['cycle'].max().reset_index()
    max_cycles.columns = ['engine_id', 'max_cycle']
    df = df.merge(max_cycles, on='engine_id', how='left')
    df['RUL'] = df['max_cycle'] - df['cycle']
    
    # Apply piecewise linear cap
    df['RUL'] = df['RUL'].clip(upper=rul_cap)
    
    df.drop('max_cycle', axis=1, inplace=True)
    return df


def remove_constant_sensors(df: pd.DataFrame) -> pd.DataFrame:
    """Remove constant/near-constant sensors (zero variance)"""
    cols_to_drop = [col for col in CONSTANT_SENSORS if col in df.columns]
    return df.drop(columns=cols_to_drop)


def fit_scaler(df: pd.DataFrame, feature_cols: list) -> MinMaxScaler:
    """Fit MinMaxScaler on training data"""
    scaler = MinMaxScaler()
    scaler.fit(df[feature_cols])
    return scaler


def scale_features(df: pd.DataFrame, scaler: MinMaxScaler, feature_cols: list) -> pd.DataFrame:
    """Apply MinMax scaling to feature columns"""
    df_scaled = df.copy()
    df_scaled[feature_cols] = scaler.transform(df[feature_cols])
    return df_scaled


def create_sequences(df: pd.DataFrame, feature_cols: list, 
                     sequence_length: int = SEQUENCE_LENGTH,
                     target_col: str = 'RUL') -> tuple:
    """
    Create overlapping sequences for LSTM.
    Returns X (sequences) and y (targets).
    
    For each engine, creates sliding window sequences.
    """
    X_list = []
    y_list = []
    engine_ids = []
    
    for engine_id in df['engine_id'].unique():
        engine_df = df[df['engine_id'] == engine_id].sort_values('cycle')
        features = engine_df[feature_cols].values
        
        if target_col in engine_df.columns:
            targets = engine_df[target_col].values
        else:
            targets = None
        
        n_cycles = len(features)
        
        for i in range(n_cycles - sequence_length + 1):
            X_list.append(features[i:i + sequence_length])
            if targets is not None:
                y_list.append(targets[i + sequence_length - 1])
            engine_ids.append(engine_id)
    
    X = np.array(X_list)
    y = np.array(y_list) if y_list else None
    
    return X, y, engine_ids


def create_test_sequences(df: pd.DataFrame, feature_cols: list,
                           sequence_length: int = SEQUENCE_LENGTH) -> tuple:
    """
    Create sequences for test data (last sequence per engine).
    This matches the notebook's test preprocessing.
    """
    X_list = []
    engine_ids = []
    
    for engine_id in df['engine_id'].unique():
        engine_df = df[df['engine_id'] == engine_id].sort_values('cycle')
        features = engine_df[feature_cols].values
        
        n_cycles = len(features)
        
        if n_cycles >= sequence_length:
            # Take last sequence_length cycles
            X_list.append(features[-sequence_length:])
        else:
            # Pad with zeros if insufficient data
            padded = np.zeros((sequence_length, len(feature_cols)))
            padded[-n_cycles:] = features
            X_list.append(padded)
        
        engine_ids.append(engine_id)
    
    X = np.array(X_list)
    return X, engine_ids


def classify_health(rul: float) -> tuple:
    """
    Classify engine health based on RUL.
    Returns (health_status, alert_level, color)
    ISO 13374 Health Assessment Layer
    """
    if rul > RUL_HEALTHY_THRESHOLD:
        return "HEALTHY", "normal", "#22c55e"
    elif rul > RUL_CAUTION_THRESHOLD:
        return "CAUTION", "caution", "#eab308"
    elif rul > RUL_WARNING_THRESHOLD:
        return "WARNING", "warning", "#f97316"
    else:
        return "CRITICAL", "critical", "#ef4444"


def preprocess_uploaded_data(file_content: str, scaler=None) -> dict:
    """
    Full preprocessing pipeline for uploaded CSV/TXT data.
    Returns processed data ready for inference.
    """
    # Parse data
    df = load_cmapss_txt(file_content)
    
    # Basic validation
    validation = validate_data(df)
    if not validation['valid']:
        return {'error': validation['message'], 'valid': False}
    
    # Remove constant sensors
    df_clean = remove_constant_sensors(df)
    
    # Determine feature columns (excluding engine_id, cycle, RUL if present)
    feature_cols = [col for col in df_clean.columns 
                    if col not in ['engine_id', 'cycle', 'RUL']]
    
    # Scale features
    if scaler is not None:
        df_scaled = scale_features(df_clean, scaler, feature_cols)
    else:
        # Fit scaler on this data (for new uploads without pre-trained scaler)
        scaler = fit_scaler(df_clean, feature_cols)
        df_scaled = scale_features(df_clean, scaler, feature_cols)
    
    # Create test sequences
    X, engine_ids = create_test_sequences(df_scaled, feature_cols)
    
    return {
        'valid': True,
        'X': X,
        'engine_ids': engine_ids,
        'feature_cols': feature_cols,
        'df': df,
        'df_scaled': df_scaled,
        'scaler': scaler,
        'n_engines': df['engine_id'].nunique(),
        'n_cycles': len(df)
    }


def validate_data(df: pd.DataFrame) -> dict:
    """
    Validate uploaded data quality.
    ISO 13374 Data Acquisition Layer validation.
    """
    errors = []
    
    # Check required columns
    required_cols = ['engine_id', 'cycle']
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        errors.append(f"Missing required columns: {missing_cols}")
    
    # Check for NaN values
    nan_count = df.isnull().sum().sum()
    if nan_count > 0:
        errors.append(f"Dataset contains {nan_count} missing values")
    
    # Check minimum cycles
    if 'engine_id' in df.columns and 'cycle' in df.columns:
        min_cycles = df.groupby('engine_id')['cycle'].count().min()
        if min_cycles < SEQUENCE_LENGTH:
            errors.append(f"Insufficient data: minimum {SEQUENCE_LENGTH} cycles required per engine, got {min_cycles}")
    
    # Check for sensor columns
    sensor_cols = [col for col in df.columns if 'sensor' in col]
    if len(sensor_cols) < 10:
        errors.append(f"Insufficient sensor data: expected at least 10 sensor columns, got {len(sensor_cols)}")
    
    if errors:
        return {'valid': False, 'message': '; '.join(errors)}
    
    return {'valid': True, 'message': 'Data validation passed'}


def get_missing_value_report(df: pd.DataFrame) -> dict:
    """Summarize missing values before model inference."""
    missing_by_column = df.isnull().sum()
    missing_columns = {
        col: int(count)
        for col, count in missing_by_column.items()
        if int(count) > 0
    }
    total_cells = int(df.shape[0] * df.shape[1])
    total_missing = int(missing_by_column.sum())

    return {
        'passed': total_missing == 0,
        'total_missing': total_missing,
        'missing_rate': float(total_missing / total_cells) if total_cells else 0.0,
        'rows_with_missing': int(df.isnull().any(axis=1).sum()),
        'columns': missing_columns
    }


def detect_anomalies(df: pd.DataFrame, z_threshold: float = 3.0) -> dict:
    """Detect sensor outliers using a per-column z-score check."""
    sensor_cols = [
        col for col in df.columns
        if col.startswith('sensor_') and pd.api.types.is_numeric_dtype(df[col])
    ]
    total_points = int(len(df) * len(sensor_cols))
    per_sensor = {}
    anomaly_rows = set()

    for col in sensor_cols:
        series = df[col].dropna()
        std = float(series.std(ddof=0)) if len(series) else 0.0
        if std == 0.0:
            count = 0
        else:
            z_scores = ((df[col] - float(series.mean())).abs() / std)
            mask = z_scores > z_threshold
            count = int(mask.sum())
            anomaly_rows.update(df.index[mask.fillna(False)].tolist())

        if count > 0:
            per_sensor[col] = count

    total_anomalies = int(sum(per_sensor.values()))
    anomaly_rate = float(total_anomalies / total_points) if total_points else 0.0

    return {
        'passed': anomaly_rate <= 0.05,
        'total_anomalies': total_anomalies,
        'anomaly_rate': anomaly_rate,
        'rows_with_anomalies': len(anomaly_rows),
        'threshold': z_threshold,
        'sensors': dict(sorted(per_sensor.items(), key=lambda item: item[1], reverse=True)[:10])
    }


def get_sensor_statistics(df: pd.DataFrame) -> dict:
    """Return compact sensor statistics for ingestion review."""
    sensor_cols = [
        col for col in df.columns
        if col.startswith('sensor_') and pd.api.types.is_numeric_dtype(df[col])
    ]
    selected_cols = [col for col in IMPORTANT_SENSORS if col in sensor_cols]
    selected_cols += [col for col in sensor_cols if col not in selected_cols][:max(0, 6 - len(selected_cols))]

    stats = {}
    for col in selected_cols:
        series = df[col].dropna()
        stats[col] = {
            'mean': float(series.mean()) if len(series) else None,
            'std': float(series.std()) if len(series) else None,
            'min': float(series.min()) if len(series) else None,
            'max': float(series.max()) if len(series) else None
        }

    return {
        'sensor_count': len(sensor_cols),
        'important_sensors_present': [col for col in IMPORTANT_SENSORS if col in sensor_cols],
        'statistics': stats
    }


def calculate_data_quality_score(validation: dict, missing_report: dict, anomaly_report: dict, df: pd.DataFrame) -> dict:
    """Score data readiness for model inference on a 0-100 scale."""
    score = 100.0
    score -= missing_report.get('missing_rate', 0.0) * 100 * 60
    score -= anomaly_report.get('anomaly_rate', 0.0) * 100 * 25

    if not validation.get('valid'):
        score -= 35

    if 'engine_id' in df.columns and 'cycle' in df.columns and len(df):
        min_cycles = int(df.groupby('engine_id')['cycle'].count().min())
        if min_cycles < SEQUENCE_LENGTH:
            score -= 20

    sensor_count = len([col for col in df.columns if col.startswith('sensor_')])
    if sensor_count < 10:
        score -= 20

    score = round(max(0.0, min(100.0, score)), 1)
    if score >= 90:
        grade = 'Excellent'
    elif score >= 75:
        grade = 'Good'
    elif score >= 60:
        grade = 'Review'
    else:
        grade = 'Poor'

    return {
        'score': score,
        'grade': grade,
        'ready_for_model': bool(validation.get('valid') and score >= 60)
    }


def get_sensor_trends(df: pd.DataFrame, engine_id: int, 
                       sensors: list = None) -> dict:
    """
    Extract sensor trend data for visualization.
    Used for Engine Details Page.
    """
    if sensors is None:
        sensors = IMPORTANT_SENSORS
    
    engine_df = df[df['engine_id'] == engine_id].sort_values('cycle')
    
    trends = {}
    for sensor in sensors:
        if sensor in engine_df.columns:
            trends[sensor] = {
                'cycles': engine_df['cycle'].tolist(),
                'values': engine_df[sensor].tolist(),
                'mean': float(engine_df[sensor].mean()),
                'std': float(engine_df[sensor].std()),
                'trend': 'degrading' if engine_df[sensor].iloc[-1] < engine_df[sensor].iloc[0] else 'stable'
            }
    
    return trends
