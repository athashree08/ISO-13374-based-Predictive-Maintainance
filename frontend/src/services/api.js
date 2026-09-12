import axios from 'axios';

const getBaseUrl = () => {
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';
                      
  const envUrl = import.meta.env.VITE_API_URL;

  if (isLocalhost) {
    return envUrl || 'http://localhost:8000/api/v1';
  }
  
  // In production (Vercel), if env URL is a valid absolute URL, use it.
  // Otherwise, default to the production Render backend to avoid 404s on relative paths.
  if (envUrl && envUrl.startsWith('http')) {
    return envUrl;
  }
  
  return 'https://iso-13374-based-predictive-maintainance.onrender.com/api/v1';
};

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,
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
