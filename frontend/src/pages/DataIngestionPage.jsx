import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, CheckCircle, AlertTriangle, XCircle,
  Database, RefreshCw, Eye, Play
} from 'lucide-react';
import { uploadSensorData, triggerPrediction } from '../services/api';

// ─── Drop Zone ───
const DropZone = ({ onFileSelect, loading }) => {
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) onFileSelect(file);
  };

  return (
    <div
      className={`upload-zone ${dragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onClick={() => document.getElementById('file-input').click()}
    >
      <input
        id="file-input"
        type="file"
        className="hidden"
        accept=".csv,.txt"
        onChange={handleFileInput}
      />
      <div className="flex flex-col items-center gap-4">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 transition-all ${
          dragging
            ? 'bg-sky-500/20 border-sky-500'
            : 'bg-[#1a2035] border-[#1e2d4a]'
        }`}>
          {loading ? (
            <RefreshCw size={28} className="text-sky-400 animate-spin" />
          ) : (
            <Upload size={28} className={dragging ? 'text-sky-400' : 'text-slate-500'} />
          )}
        </div>
        <div>
          <div className="text-white font-semibold mb-1">
            {dragging ? 'Release to upload' : 'Drag & drop sensor data file'}
          </div>
          <div className="text-slate-500 text-sm">
            Supports NASA C-MAPSS format (.txt) or structured CSV
          </div>
          <div className="text-slate-600 text-xs mt-2">
            Required: engine_id, cycle, op_setting_1-3, sensor_1-21
          </div>
        </div>
        <button className="btn-primary" disabled={loading}>
          {loading ? 'Uploading...' : 'Browse Files'}
        </button>
      </div>
    </div>
  );
};

// ─── Validation Result ───
const ValidationResult = ({ validation, stats }) => {
  const checks = [
    { key: 'missing_values', label: 'Missing Values', pass: stats?.missing_values === 0, value: stats?.missing_values === 0 ? '0 found' : `${stats?.missing_values} found` },
    { key: 'anomaly_count', label: 'Anomalies', pass: (stats?.anomaly_count || 0) === 0, value: `${stats?.anomaly_count || 0} detected` },
    { key: 'engine_count', label: 'Engine Count', pass: stats?.engine_count > 0, value: `${stats?.engine_count} engines` },
    { key: 'cycle_count', label: 'Data Points', pass: stats?.cycle_count > 30, value: `${stats?.cycle_count} cycles` },
    { key: 'sensor_count', label: 'Sensor Channels', pass: stats?.sensor_count >= 10, value: `${stats?.sensor_count} sensors` },
    { key: 'min_cycles', label: 'Min Cycles/Engine', pass: stats?.min_cycles_per_engine >= 30, value: `${stats?.min_cycles_per_engine} cycles` },
    { key: 'quality_score', label: 'Data Quality Score', pass: stats?.data_quality_score >= 60, value: `${stats?.data_quality_score || 0}%` },
  ];

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
          validation?.valid
            ? 'bg-green-500/10 border border-green-500/30'
            : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {validation?.valid
            ? <CheckCircle size={16} className="text-green-500" />
            : <XCircle size={16} className="text-red-500" />
          }
        </div>
        <div>
          <div className="section-label mb-0">Data Validation</div>
          <div className={`text-xs ${validation?.valid ? 'text-green-500' : 'text-red-400'}`}>
            {validation?.message}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {checks.map(check => (
          <div key={check.key} className="flex items-center justify-between py-2 border-b border-[#1e2d4a] last:border-0">
            <div className="flex items-center gap-2">
              {check.pass
                ? <CheckCircle size={13} className="text-green-500" />
                : <AlertTriangle size={13} className="text-red-400" />
              }
              <span className="text-sm text-slate-400">{check.label}</span>
            </div>
            <span className={`text-xs font-mono ${check.pass ? 'text-green-400' : 'text-red-400'}`}>
              {check.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// â”€â”€â”€ Ingestion Pipeline â”€â”€â”€
const IngestionPipeline = ({ steps = [] }) => {
  if (!steps.length) return null;

  const statusStyles = {
    complete: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    ready: { icon: Play, color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    failed: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    blocked: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };

  return (
    <div className="card">
      <div className="section-label mb-4">Ingestion Pipeline</div>
      <div className="grid grid-cols-7 gap-3">
        {steps.map((step) => {
          const style = statusStyles[step.status] || statusStyles.complete;
          const Icon = style.icon;
          return (
            <div key={step.key} className={`p-3 rounded-lg border ${style.bg} ${style.border}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={style.color} />
                <span className="text-[11px] text-white font-semibold leading-tight">{step.label}</span>
              </div>
              <div className="text-[10px] text-slate-500 leading-snug">{step.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// â”€â”€â”€ Sensor Statistics â”€â”€â”€
const SensorStatistics = ({ report }) => {
  const rows = Object.entries(report?.statistics || {});
  if (!rows.length) return null;

  return (
    <div className="card mt-4">
      <div className="section-label mb-3">Sensor Statistics</div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Sensor</th>
              <th>Mean</th>
              <th>Std</th>
              <th>Min</th>
              <th>Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([sensor, stat]) => (
              <tr key={sensor}>
                <td className="font-mono font-bold">{sensor}</td>
                <td className="font-mono">{stat.mean?.toFixed(3)}</td>
                <td className="font-mono">{stat.std?.toFixed(3)}</td>
                <td className="font-mono">{stat.min?.toFixed(3)}</td>
                <td className="font-mono">{stat.max?.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// â”€â”€â”€ Anomaly Summary â”€â”€â”€
const AnomalySummary = ({ report }) => {
  if (!report) return null;
  const sensors = Object.entries(report.sensors || {});

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="section-label mb-0">Anomaly Detection</div>
        <span className={`text-xs font-mono font-bold ${report.total_anomalies > 0 ? 'text-amber-400' : 'text-green-400'}`}>
          {report.total_anomalies} detected
        </span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-3 rounded-lg bg-[#1a2035]">
          <div className="text-[10px] text-slate-500 uppercase">Rows Affected</div>
          <div className="font-mono text-sky-400 font-bold">{report.rows_with_anomalies}</div>
        </div>
        <div className="p-3 rounded-lg bg-[#1a2035]">
          <div className="text-[10px] text-slate-500 uppercase">Anomaly Rate</div>
          <div className="font-mono text-sky-400 font-bold">{((report.anomaly_rate || 0) * 100).toFixed(2)}%</div>
        </div>
        <div className="p-3 rounded-lg bg-[#1a2035]">
          <div className="text-[10px] text-slate-500 uppercase">Z Threshold</div>
          <div className="font-mono text-sky-400 font-bold">{report.threshold}</div>
        </div>
      </div>
      {sensors.length > 0 ? (
        <div className="space-y-2">
          {sensors.map(([sensor, count]) => (
            <div key={sensor} className="flex items-center justify-between py-2 border-b border-[#1e2d4a] last:border-0">
              <span className="text-sm text-slate-400 font-mono">{sensor}</span>
              <span className="text-xs text-amber-400 font-mono">{count} outlier{count === 1 ? '' : 's'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-500">No sensor outliers were detected in this upload.</div>
      )}
    </div>
  );
};

// â”€â”€â”€ Engine RUL Assessment â”€â”€â”€
const EngineRULAssessment = ({ engines = [] }) => {
  if (!engines.length) return null;
  const critical = engines.filter(engine => engine.health_status === 'CRITICAL');

  return (
    <div className="card mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="section-label mb-0">Engine RUL Assessment</div>
        <span className={`text-xs font-mono font-bold ${critical.length ? 'text-red-400' : 'text-green-400'}`}>
          {critical.length ? `${critical.length} critical` : 'No critical engines'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Engine</th>
              <th>Current Cycle</th>
              <th>RUL</th>
              <th>Category</th>
            </tr>
          </thead>
          <tbody>
            {engines.map(engine => (
              <tr key={engine.engine_id}>
                <td className="font-mono font-bold">ENG-{String(engine.engine_id).padStart(3, '0')}</td>
                <td className="font-mono text-slate-300">{engine.current_cycle}</td>
                <td>
                  <span className="font-mono font-bold" style={{ color: engine.color }}>
                    {Math.round(engine.estimated_rul)}
                  </span>
                </td>
                <td>
                  <span className={`badge-${engine.alert_level}`}>
                    {engine.health_status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-slate-600 mt-3">
        Ingestion estimate uses current cycle against the configured RUL cap before model prediction.
      </div>
    </div>
  );
};

// â”€â”€â”€ Critical Machines â”€â”€â”€
const CriticalMachines = ({ predictions = [], criticalMachines = [] }) => {
  const critical = criticalMachines.length
    ? criticalMachines
    : predictions.filter(pred => pred.health_status === 'CRITICAL' || pred.alert_level === 'critical');

  return (
    <div className={`mb-4 p-4 rounded-xl border ${
      critical.length
        ? 'bg-red-500/10 border-red-500/30'
        : 'bg-green-500/10 border-green-500/30'
    }`}>
      <div className="flex items-center gap-3">
        {critical.length
          ? <AlertTriangle size={18} className="text-red-400" />
          : <CheckCircle size={18} className="text-green-500" />
        }
        <div>
          <div className="text-white font-medium">
            {critical.length ? `${critical.length} critical machine${critical.length === 1 ? '' : 's'} detected` : 'No critical machines detected'}
          </div>
          {critical.length > 0 && (
            <div className="text-xs text-red-300 mt-1">
              {critical.map(pred => `ENG-${String(pred.engine_id).padStart(3, '0')} (${Math.round(pred.rul_predicted)} RUL)`).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Data Preview Table ───
const DataPreview = ({ preview, columns }) => {
  if (!preview?.length) return null;
  const displayCols = ['engine_id', 'cycle', 'sensor_4', 'sensor_11', 'sensor_12'];
  const availCols = displayCols.filter(c => columns?.includes(c));

  return (
    <div className="card mt-4">
      <div className="section-label mb-3">Data Preview (First 10 Rows)</div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {availCols.map(col => <th key={col}>{col}</th>)}
              <th>... +{(columns?.length || 0) - availCols.length} more</th>
            </tr>
          </thead>
          <tbody>
            {preview.slice(0, 8).map((row, i) => (
              <tr key={i}>
                {availCols.map(col => (
                  <td key={col} className="font-mono">
                    {typeof row[col] === 'number' ? row[col].toFixed(2) : row[col]}
                  </td>
                ))}
                <td className="text-slate-600">...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ─── Main Page ───
export default function DataIngestionPage() {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (file) => {
    setError(null);
    setUploadResult(null);
    setPredictionResult(null);
    setUploading(true);
    setProgress(0);

    try {
      const res = await uploadSensorData(file, setProgress);
      setUploadResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handlePredict = async () => {
    if (!uploadResult?.upload_id) return;
    setPredicting(true);
    setPredictionResult(null);

    try {
      const res = await triggerPrediction(uploadResult.upload_id);
      setPredictionResult(res.data);
      navigate('/', {
        state: {
          ingestionMessage: res.data.message,
          uploadedEngines: (res.data.predictions || []).map(pred => pred.engine_id),
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Prediction failed');
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Data Ingestion</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          ISO 13374 Layer 1 · Data Acquisition · Upload & validate engine sensor data
        </p>
      </div>

      {/* ISO Layer Info */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { layer: 'L1', title: 'Data Acquisition', desc: 'Upload raw sensor data in C-MAPSS or CSV format', color: '#0ea5e9' },
          { layer: 'L2', title: 'Data Manipulation', desc: 'Automated preprocessing, scaling and sequence generation', color: '#8b5cf6' },
          { layer: 'L5', title: 'Prognostic Assessment', desc: 'LSTM + XGBoost ensemble RUL prediction on uploaded data', color: '#f97316' },
        ].map(item => (
          <div key={item.layer} className="card-elevated p-4 rounded-xl border border-[#1e2d4a]">
            <div className="iso-badge mb-3" style={{ color: item.color, background: `${item.color}15`, borderColor: `${item.color}30` }}>
              {item.layer}
            </div>
            <div className="text-sm font-semibold text-white mb-1">{item.title}</div>
            <div className="text-xs text-slate-500">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Upload Zone */}
      <div className="card">
        <div className="section-label mb-4">Upload Sensor Data</div>
        <DropZone onFileSelect={handleFileSelect} loading={uploading} />

        {/* Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill bg-sky-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30"
          >
            <XCircle size={16} className="text-red-400 flex-shrink-0" />
            <div className="text-sm text-red-400">{error}</div>
          </motion.div>
        )}
      </div>

      {/* Upload Results */}
      <AnimatePresence>
        {uploadResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Success Banner */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <CheckCircle size={20} className="text-green-500" />
              <div className="flex-1">
                <div className="text-white font-medium">{uploadResult.message}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  File: {uploadResult.filename} · Upload ID: #{uploadResult.upload_id}
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={handlePredict}
                disabled={predicting || uploadResult.quality_score?.ready_for_model === false}
              >
                {predicting ? (
                  <><RefreshCw size={14} className="animate-spin" /> Running...</>
                ) : (
                  <><Play size={14} /> Send to Model</>
                )}
              </button>
            </div>

            <IngestionPipeline steps={uploadResult.ingestion_pipeline} />

            {/* Validation + Preview */}
            <div className="grid grid-cols-2 gap-6">
              <ValidationResult
                validation={uploadResult.validation}
                stats={uploadResult.statistics}
              />
              <div>
                <div className="card h-full">
                  <div className="section-label mb-3">Dataset Statistics</div>
                  <div className="space-y-3">
                    {[
                      { label: 'Total Engines', value: uploadResult.statistics?.engine_count },
                      { label: 'Total Data Points', value: uploadResult.statistics?.cycle_count?.toLocaleString() },
                      { label: 'Sensor Channels', value: uploadResult.statistics?.sensor_count },
                      { label: 'Missing Values', value: uploadResult.statistics?.missing_values },
                      { label: 'Anomalies Detected', value: uploadResult.statistics?.anomaly_count },
                      { label: 'Quality Score', value: `${uploadResult.quality_score?.score || 0}% (${uploadResult.quality_score?.grade || 'N/A'})` },
                      { label: 'Min Cycles/Engine', value: uploadResult.statistics?.min_cycles_per_engine },
                      { label: 'Max Cycles/Engine', value: uploadResult.statistics?.max_cycles_per_engine },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">{stat.label}</span>
                        <span className="font-mono text-sky-400 text-sm font-bold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <EngineRULAssessment engines={uploadResult.engine_assessments} />
            <AnomalySummary report={uploadResult.anomalies} />
            <SensorStatistics report={uploadResult.sensor_statistics} />
            <DataPreview preview={uploadResult.preview} columns={uploadResult.columns} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prediction Results */}
      <AnimatePresence>
        {predictionResult && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle size={18} className="text-green-500" />
              <div className="section-label mb-0">Prediction Results</div>
              <span className="text-xs text-slate-500">
                {predictionResult.count} engines processed
              </span>
            </div>
            <CriticalMachines
              predictions={predictionResult.predictions}
              criticalMachines={predictionResult.critical_machines}
            />
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Engine</th>
                    <th>RUL (Ensemble)</th>
                    <th>LSTM</th>
                    <th>XGBoost</th>
                    <th>Health</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {(predictionResult.predictions || []).map((pred, i) => (
                    <tr key={i}>
                      <td className="font-mono font-bold">ENG-{String(pred.engine_id).padStart(3, '0')}</td>
                      <td>
                        <span className="font-mono font-bold text-lg" style={{ color: pred.color }}>
                          {Math.round(pred.rul_predicted)}
                        </span>
                      </td>
                      <td className="font-mono text-sky-400">{pred.rul_lstm ? Math.round(pred.rul_lstm) : '---'}</td>
                      <td className="font-mono text-purple-400">{pred.rul_xgboost ? Math.round(pred.rul_xgboost) : '---'}</td>
                      <td><span className={`badge-${pred.alert_level}`}>{pred.health_status}</span></td>
                      <td>
                        <span className="text-xs text-slate-400">
                          {((pred.confidence || 0.85) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
