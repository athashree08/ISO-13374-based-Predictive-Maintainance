import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import {
  AlertTriangle, AlertCircle, CheckCircle, Clock,
  RefreshCw, ChevronRight,
  Zap, Shield
} from 'lucide-react';
import { getFleetStatus, getAlerts } from '../services/api';
import { getStatusFromAlert, formatRUL, formatTimestamp } from '../utils/statusUtils';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const engine = payload[0]?.payload;
  return (
    <div className="custom-tooltip">
      <div className="text-slate-400 text-xs mb-1">Engine #{label}</div>
      <div className="font-mono text-white font-bold text-lg">{payload[0]?.value} cycles</div>
      <div className="text-xs mt-1" style={{ color: engine?.color }}>
        {engine?.health_status}
      </div>
    </div>
  );
};

const KPICard = ({ label, value, icon: Icon, accent, sublabel }) => (
  <motion.div
    className="kpi-card"
    style={{ '--accent-color': accent }}
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
  >
    <div className="flex items-start justify-between mb-3">
      <div className="section-label mb-0">{label}</div>
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center"
        style={{ background: `${accent}20`, border: `1px solid ${accent}40` }}
      >
        <Icon size={14} style={{ color: accent }} />
      </div>
    </div>
    <div className="metric-value" style={{ color: accent }}>{value}</div>
    {sublabel && <div className="text-[11px] text-slate-500 mt-1">{sublabel}</div>}
  </motion.div>
);

const AlertItem = ({ alert }) => {
  const levelMap = {
    critical: { color: '#ef4444', icon: AlertTriangle },
    warning: { color: '#f97316', icon: AlertCircle },
    caution: { color: '#eab308', icon: AlertCircle },
    normal: { color: '#22c55e', icon: CheckCircle }
  };
  const cfg = levelMap[alert.alert_level] || levelMap.normal;
  const Icon = cfg.icon;

  return (
    <motion.div
      className={`alert-item ${alert.alert_level}`}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <Icon size={16} style={{ color: cfg.color, marginTop: 2, flexShrink: 0 }} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-slate-300 leading-snug">{alert.message}</div>
        <div className="text-[11px] text-slate-600 mt-0.5">{formatTimestamp(alert.timestamp)}</div>
      </div>
      <span className={`badge-${alert.alert_level}`}>{alert.alert_level}</span>
    </motion.div>
  );
};

export default function DashboardPage() {
  const location = useLocation();
  const [fleetData, setFleetData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [sortField, setSortField] = useState('rul');
  const [sortDir, setSortDir] = useState('asc');

  const fetchData = async () => {
    try {
      const [fleetRes, alertsRes] = await Promise.all([
        getFleetStatus(),
        getAlerts(10)
      ]);
      setFleetData(fleetRes.data);
      setAlerts(alertsRes.data.alerts || []);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch fleet data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const sortedEngines = fleetData?.fleet_data
    ? [...fleetData.fleet_data].sort((a, b) => {
        const aVal = a[sortField === 'rul' ? 'rul' : sortField];
        const bVal = b[sortField === 'rul' ? 'rul' : sortField];
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      })
    : [];

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const getBarColor = (engine) => {
    const colors = {
      normal: '#22c55e',
      caution: '#eab308',
      warning: '#f97316',
      critical: '#ef4444'
    };
    return colors[engine.alert_level] || '#22c55e';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <RefreshCw size={32} className="text-sky-500 animate-spin mx-auto mb-4" />
          <div className="text-slate-400">Loading fleet data...</div>
        </div>
      </div>
    );
  }

  const kpis = fleetData?.kpis || {};

  return (
    <div className="p-6 space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Fleet Operations Center</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {lastUpdate && <span>Updated {formatTimestamp(lastUpdate.toISOString())}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchData} className="btn-secondary" title="Refresh">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {location.state?.ingestionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 rounded-xl bg-sky-500/10 border border-sky-500/30"
        >
          <CheckCircle size={18} className="text-sky-400 flex-shrink-0" />
          <div>
            <div className="text-white font-medium">{location.state.ingestionMessage}</div>
            <div className="text-xs text-slate-500 mt-0.5">
              Added engines: {(location.state.uploadedEngines || []).map(id => `ENG-${String(id).padStart(3, '0')}`).join(', ')}
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid-kpi">
        <KPICard label="Total Engines" value={kpis.total_engines || 0} icon={Zap} accent="#0ea5e9" sublabel="Monitored units" />
        <KPICard label="Healthy" value={kpis.healthy || 0} icon={CheckCircle} accent="#22c55e" sublabel="RUL > 80 cycles" />
        <KPICard label="Caution" value={kpis.caution || 0} icon={AlertCircle} accent="#eab308" sublabel="40-80 cycles RUL" />
        <KPICard label="Warning" value={kpis.warning || 0} icon={AlertTriangle} accent="#f97316" sublabel="15-40 cycles RUL" />
        <KPICard label="Critical" value={kpis.critical || 0} icon={AlertTriangle} accent="#ef4444" sublabel="< 15 cycles RUL" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 chart-container">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="section-label mb-0">Fleet RUL Overview</div>
              <div className="text-xs text-slate-500 mt-0.5">Remaining Useful Life by Engine Unit</div>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Caution</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500" /> Warning</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Critical</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sortedEngines} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
              <XAxis
                dataKey="engine_id"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#1e2d4a' }}
                label={{ value: 'Engine ID', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 11 }}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                label={{ value: 'RUL (cycles)', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 11 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 4" strokeOpacity={0.4} />
              <ReferenceLine y={40} stroke="#eab308" strokeDasharray="4 4" strokeOpacity={0.4} />
              <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="4 4" strokeOpacity={0.4} />
              <Bar dataKey="rul" radius={[3, 3, 0, 0]}>
                {sortedEngines.map((engine, index) => (
                  <Cell key={`cell-${index}`} fill={getBarColor(engine)} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="section-label mb-0">Live Alerts</div>
            <div className="flex items-center gap-2">
              {alerts.filter(a => a.alert_level === 'critical').length > 0 && (
                <span className="badge-critical text-[10px]">
                  {alerts.filter(a => a.alert_level === 'critical').length} Critical
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1 max-h-[280px] overflow-y-auto">
            {alerts.length > 0 ? alerts.map((alert, i) => (
              <AlertItem key={alert.id || i} alert={alert} />
            )) : (
              <div className="text-center py-8 text-slate-600">
                <Shield size={24} className="mx-auto mb-2 opacity-40" />
                <div className="text-sm">No active alerts</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label mb-0">Fleet Monitoring Table</div>
            <div className="text-xs text-slate-500 mt-0.5">All engine units with latest predictions</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Clock size={12} />
            Real-time
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Engine</th>
                <th className="cursor-pointer hover:text-sky-400 transition-colors" onClick={() => handleSort('rul')}>
                  RUL (Cycles) {sortField === 'rul' && (sortDir === 'asc' ? 'up' : 'down')}
                </th>
                <th>Health Status</th>
                <th>Last Cycle</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(fleetData?.recent_predictions || sortedEngines).map((engine, i) => {
                const status = getStatusFromAlert(engine.alert_level);
                const rul = engine.rul_predicted || engine.rul;
                return (
                  <motion.tr
                    key={engine.engine_id || i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 rounded-full" style={{ background: status.color }} />
                        <span className="font-mono font-bold text-white">ENG-{String(engine.engine_id).padStart(3, '0')}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono text-lg font-bold" style={{ color: status.color }}>
                        {formatRUL(rul)}
                      </span>
                      <span className="text-slate-600 text-xs ml-1">cyc</span>
                    </td>
                    <td>
                      <span className={status.badge}>{engine.health_status}</span>
                    </td>
                    <td>
                      <span className="font-mono text-slate-400 text-xs">
                        {engine.last_cycle || engine.cycle || '---'}
                      </span>
                    </td>
                    <td>
                      <a href={`/engine/${engine.engine_id}`} className="btn-secondary py-1.5 px-3 text-xs">
                        Details <ChevronRight size={12} />
                      </a>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
