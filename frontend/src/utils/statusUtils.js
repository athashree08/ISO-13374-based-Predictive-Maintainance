/**
 * Status utilities for ISO 13374 health classification
 */

export const STATUS_CONFIG = {
  HEALTHY: {
    label: 'HEALTHY',
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.1)',
    border: 'rgba(34, 197, 94, 0.3)',
    badge: 'badge-healthy',
    alertLevel: 'normal',
    threshold: 80
  },
  CAUTION: {
    label: 'CAUTION',
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.1)',
    border: 'rgba(234, 179, 8, 0.3)',
    badge: 'badge-caution',
    alertLevel: 'caution',
    threshold: 40
  },
  WARNING: {
    label: 'WARNING',
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.1)',
    border: 'rgba(249, 115, 22, 0.3)',
    badge: 'badge-warning',
    alertLevel: 'warning',
    threshold: 15
  },
  CRITICAL: {
    label: 'CRITICAL',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    badge: 'badge-critical',
    alertLevel: 'critical',
    threshold: 0
  }
};

export const getStatusConfig = (healthStatus) => {
  return STATUS_CONFIG[healthStatus?.toUpperCase()] || STATUS_CONFIG.HEALTHY;
};

export const getStatusFromAlert = (alertLevel) => {
  const map = {
    'normal': STATUS_CONFIG.HEALTHY,
    'caution': STATUS_CONFIG.CAUTION,
    'warning': STATUS_CONFIG.WARNING,
    'critical': STATUS_CONFIG.CRITICAL
  };
  return map[alertLevel?.toLowerCase()] || STATUS_CONFIG.HEALTHY;
};

export const getRULColor = (rul) => {
  if (rul > 80) return '#22c55e';
  if (rul > 40) return '#eab308';
  if (rul > 15) return '#f97316';
  return '#ef4444';
};

export const formatRUL = (rul) => {
  if (rul === null || rul === undefined) return '---';
  return Math.round(rul).toString();
};

export const formatConfidence = (conf) => {
  if (conf === null || conf === undefined) return '---';
  return `${(conf * 100).toFixed(1)}%`;
};

export const formatTimestamp = (ts) => {
  if (!ts) return '---';
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};
