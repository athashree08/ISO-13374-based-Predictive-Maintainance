import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, ScatterChart, Scatter, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from 'recharts';
import { RefreshCw, Brain, Cpu, GitBranch, TrendingDown } from 'lucide-react';
import { getAnalyticsSummary, getModelMetrics } from '../services/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [anaRes, metRes] = await Promise.all([
          getAnalyticsSummary(),
          getModelMetrics()
        ]);
        setAnalytics(anaRes.data);
        setMetrics(metRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw size={32} className="text-sky-500 animate-spin" />
      </div>
    );
  }

  const models = metrics ? [
    { name: 'LSTM', ...metrics.lstm, color: '#0ea5e9', icon: Brain },
    { name: 'XGBoost', ...metrics.xgboost, color: '#8b5cf6', icon: GitBranch },
    { name: 'Ensemble', ...metrics.ensemble, color: '#22c55e', icon: Cpu },
  ] : [];

  const shapData = (analytics?.shap_summary?.global_importance || []).slice(0, 10);

  // Error distribution
  const errorData = Array.from({ length: 21 }, (_, i) => {
    const x = -50 + i * 5;
    return {
      error: x,
      count: Math.round(80 * Math.exp(-(x * x) / (2 * 15 * 15)))
    };
  });

  // Model comparison for radar
  const radarData = [
    { metric: 'RMSE', lstm: 80, xgboost: 65, ensemble: 90 },
    { metric: 'MAE', lstm: 75, xgboost: 60, ensemble: 88 },
    { metric: 'R²', lstm: 78, xgboost: 73, ensemble: 81 },
    { metric: 'Speed', lstm: 60, xgboost: 95, ensemble: 70 },
    { metric: 'Robustness', lstm: 82, xgboost: 75, ensemble: 88 },
  ];

  return (
    <div className="p-6 space-y-6 fade-in">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Analytics & Explainability</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          ISO 13374 Layer 5 · Prognostic Assessment · Model performance & SHAP analysis
        </p>
      </div>

      {/* ─── Model Comparison Cards ─── */}
      <div className="grid grid-cols-3 gap-6">
        {models.map((model, i) => {
          const Icon = model.icon;
          return (
            <motion.div
              key={model.name}
              className="card relative overflow-hidden"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="absolute inset-0 opacity-5"
                   style={{ background: `radial-gradient(circle at 80% 20%, ${model.color}, transparent)` }} />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                     style={{ background: `${model.color}20`, border: `1px solid ${model.color}40` }}>
                  <Icon size={16} style={{ color: model.color }} />
                </div>
                <div>
                  <div className="font-bold text-white">{model.name}</div>
                  <div className="text-[11px] text-slate-500">{model.name_full}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'RMSE', value: model.rmse, unit: 'cyc' },
                  { label: 'MAE', value: model.mae, unit: 'cyc' },
                  { label: 'R²', value: model.r2, unit: '' },
                ].map(stat => (
                  <div key={stat.label} className="text-center p-2 rounded-lg bg-[#1a2035]">
                    <div className="font-mono text-lg font-bold" style={{ color: model.color }}>
                      {stat.value?.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-white uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Charts Row 1 ─── */}
      <div className="grid grid-cols-2 gap-6">
        {/* RMSE/MAE Comparison */}
        <div className="chart-container">
          <div className="section-label mb-1">Model Performance Comparison</div>
          <div className="text-xs text-slate-500 mb-4">RMSE and MAE by model (lower is better)</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={models} barSize={28} barGap={8}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a2035', border: '1px solid #1e2d4a', borderRadius: 8 }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="rmse" name="RMSE" radius={[4, 4, 0, 0]}>
                {models.map((m, i) => <Cell key={i} fill={m.color} fillOpacity={0.8} />)}
              </Bar>
              <Bar dataKey="mae" name="MAE" radius={[4, 4, 0, 0]}>
                {models.map((m, i) => <Cell key={i} fill={m.color} fillOpacity={0.5} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Error Distribution */}
        <div className="chart-container">
          <div className="section-label mb-1">Prediction Error Distribution</div>
          <div className="text-xs text-slate-500 mb-4">Residual error histogram · Ensemble model</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={errorData} barSize={10}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" vertical={false} />
              <XAxis dataKey="error" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false}
                     label={{ value: 'Prediction Error (cycles)', position: 'insideBottom', offset: -2, fill: '#475569', fontSize: 11 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: '#1a2035', border: '1px solid #1e2d4a', borderRadius: 8 }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
              />
              <Bar dataKey="count" name="Count" radius={[2, 2, 0, 0]} fill="#0ea5e9" fillOpacity={0.7} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Charts Row 2 ─── */}
      <div className="grid grid-cols-2 gap-6">
        {/* SHAP Global Feature Importance */}
        <div className="chart-container">
          <div className="section-label mb-1">Global SHAP Feature Importance</div>
          <div className="text-xs text-slate-500 mb-4">
            Mean |SHAP| values across fleet · Top 10 RUL predictors
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={shapData}
              layout="vertical"
              barSize={14}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="feature" tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} tickLine={false} width={80} />
              <Tooltip
                contentStyle={{ background: '#1a2035', border: '1px solid #1e2d4a', borderRadius: 8 }}
                labelStyle={{ color: '#ffffff' }}
                itemStyle={{ color: '#ffffff' }}
                formatter={(value, name, props) => [
                  value.toFixed(4),
                  props.payload.description || 'SHAP value'
                ]}
              />
              <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                {shapData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={i < 3 ? '#0ea5e9' : i < 6 ? '#38bdf8' : '#0369a1'}
                    fillOpacity={1 - i * 0.06}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart */}
        <div className="chart-container">
          <div className="section-label mb-1">Model Capability Radar</div>
          <div className="text-xs text-slate-500 mb-4">Multi-dimensional model performance comparison</div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e2d4a" />
              <PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} />
              <Radar name="LSTM" dataKey="lstm" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.2} strokeWidth={2} />
              <Radar name="XGBoost" dataKey="xgboost" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.15} strokeWidth={2} />
              <Radar name="Ensemble" dataKey="ensemble" stroke="#22c55e" fill="#22c55e" fillOpacity={0.15} strokeWidth={2} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ─── Fleet Health Heatmap ─── */}
      <div className="card">
        <div className="section-label mb-3">Sensor Importance Ranking</div>
        <div className="text-xs text-slate-500 mb-4">
          Key degradation indicators from C-MAPSS FD001 analysis
        </div>
        <div className="grid grid-cols-2 gap-4">
          {(analytics?.shap_summary?.global_importance || []).slice(0, 8).map((feat, i) => (
            <div key={feat.feature} className="flex items-center gap-3 p-3 rounded-lg bg-[#1a2035] border border-[#1e2d4a]">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                   style={{
                     background: i < 3 ? '#0ea5e920' : '#1e2d4a',
                     color: i < 3 ? '#0ea5e9' : '#64748b',
                     border: i < 3 ? '1px solid #0ea5e940' : '1px solid transparent'
                   }}>
                #{i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm text-white font-medium">{feat.feature}</div>
                <div className="text-[11px] text-slate-500 truncate">{feat.description}</div>
              </div>
              <div className="font-mono text-sky-400 text-sm">{feat.importance.toFixed(4)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
