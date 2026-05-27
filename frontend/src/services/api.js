/**
 * API Service Layer
 * Connects to FastAPI backend with ISO 13374 endpoints
 */

import axios from 'axios';

const BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─────────────────────────────────────────
// Layer 3: Condition Monitoring
// ─────────────────────────────────────────

export const getFleetStatus = () => api.get('/fleet-status');

export const getAlerts = (limit = 20) => api.get(`/alerts?limit=${limit}`);

export const acknowledgeAlert = (alertId) => api.post(`/alerts/${alertId}/acknowledge`);

// ─────────────────────────────────────────
// Layer 4 & 5: Health & Prognostic Assessment
// ─────────────────────────────────────────

export const getEngineDetails = (engineId) => api.get(`/engine/${engineId}`);

export const predictRUL = (payload) => api.post('/predict', payload);

export const getSHAPAnalysis = (engineId) => api.get(`/shap/${engineId}`);

export const getModelMetrics = () => api.get('/model/metrics');

export const getAnalyticsSummary = () => api.get('/analytics/summary');

// ─────────────────────────────────────────
// Layer 1 & 2: Data Acquisition
// ─────────────────────────────────────────

export const uploadSensorData = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  
  return api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
};

export const listUploads = () => api.get('/data');

export const triggerPrediction = (uploadId) =>
  api.post(`/upload/${uploadId}/predict`);

// ─────────────────────────────────────────
// Layer 6: Advisory Generation
// ─────────────────────────────────────────

export const getRecommendations = (engineId) =>
  api.get(`/recommendations/${engineId}`);

export const getMaintenanceSchedule = () => api.get('/schedule');

// ─────────────────────────────────────────
// Real-Time Simulation
// ─────────────────────────────────────────

export const simulateTick = () => api.post('/simulate/tick');

// ─────────────────────────────────────────
// System
// ─────────────────────────────────────────

export const getHealth = () => api.get('/health');

export default api;
