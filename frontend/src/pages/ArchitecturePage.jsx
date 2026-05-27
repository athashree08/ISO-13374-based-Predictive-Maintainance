import React from 'react';
import { motion } from 'framer-motion';
import {
  Database, Cpu, Activity, BarChart2, MessageSquare,
  RefreshCw, ArrowRight, Server, Code, Container, Layers
} from 'lucide-react';

const ISO_LAYERS = [
  {
    number: '01',
    name: 'Data Acquisition',
    abbr: 'DAQ',
    color: '#0ea5e9',
    desc: 'Raw sensor data collection from turbofan engines. Supports NASA C-MAPSS format and CSV uploads via REST API.',
    tech: ['FastAPI /upload', 'File Validation', 'SQLite Storage'],
    icon: Database,
  },
  {
    number: '02',
    name: 'Data Manipulation',
    abbr: 'DM',
    color: '#6366f1',
    desc: 'Preprocessing pipeline: constant sensor removal, MinMax scaling, piecewise linear RUL cap, LSTM sequence generation.',
    tech: ['Pandas', 'scikit-learn', 'NumPy', 'Sequence Gen'],
    icon: RefreshCw,
  },
  {
    number: '03',
    name: 'Condition Monitoring',
    abbr: 'CM',
    color: '#8b5cf6',
    desc: 'Real-time fleet health tracking, alert generation, and status dashboard. Threshold-based health classification.',
    tech: ['/fleet-status', '/alerts', 'Live Simulation'],
    icon: Activity,
  },
  {
    number: '04',
    name: 'Health Assessment',
    abbr: 'HA',
    color: '#f59e0b',
    desc: 'Engine-level health classification: HEALTHY / CAUTION / WARNING / CRITICAL based on predicted RUL.',
    tech: ['/engine/{id}', 'RUL Thresholds', 'Historical Trends'],
    icon: BarChart2,
  },
  {
    number: '05',
    name: 'Prognostic Assessment',
    abbr: 'PA',
    color: '#f97316',
    desc: 'ML-based RUL prediction using Bidirectional LSTM and XGBoost with 60/40 weighted ensemble. SHAP explainability.',
    tech: ['BiLSTM', 'XGBoost', 'SHAP', 'Ensemble'],
    icon: Cpu,
  },
  {
    number: '06',
    name: 'Advisory Generation',
    abbr: 'AG',
    color: '#22c55e',
    desc: 'Automated maintenance recommendations, priority actions, and fleet scheduling based on prognostic outputs.',
    tech: ['/recommendations', '/schedule', 'Priority Logic'],
    icon: MessageSquare,
  },
];

const TECH_STACK = [
  {
    category: 'ML Models',
    color: '#0ea5e9',
    items: [
      { name: 'Bidirectional LSTM', detail: '64→32 units · EarlyStopping' },
      { name: 'XGBoost Regressor', detail: '200 trees · depth=6' },
      { name: 'Weighted Ensemble', detail: '60% LSTM + 40% XGBoost' },
      { name: 'SHAP Explainer', detail: 'TreeExplainer for XGBoost' },
    ]
  },
  {
    category: 'Backend',
    color: '#8b5cf6',
    items: [
      { name: 'FastAPI', detail: 'REST API + async' },
      { name: 'TensorFlow 2.x', detail: 'LSTM inference' },
      { name: 'XGBoost', detail: 'Gradient boosting' },
      { name: 'SQLite', detail: 'Fleet state storage' },
    ]
  },
  {
    category: 'Frontend',
    color: '#22c55e',
    items: [
      { name: 'React + Vite', detail: 'SPA framework' },
      { name: 'TailwindCSS', detail: 'Utility styling' },
      { name: 'Framer Motion', detail: 'Animations' },
      { name: 'Recharts', detail: 'Data visualization' },
    ]
  },
  {
    category: 'Dataset',
    color: '#f97316',
    items: [
      { name: 'NASA C-MAPSS FD001', detail: '100 engines · 21 sensors' },
      { name: 'Training set', detail: '20,631 records · run-to-failure' },
      { name: 'RUL Cap', detail: 'Piecewise linear at 125 cycles' },
      { name: 'Sequence length', detail: '30 cycles sliding window' },
    ]
  },
];

export default function ArchitecturePage() {
  return (
    <div className="p-6 space-y-8 fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="iso-badge">ISO 13374:2003</div>
          <div className="iso-badge" style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' }}>
            Condition Monitoring & Diagnostics
          </div>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">System Architecture</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          ISO 13374-aligned Predictive Maintenance & Prognostics Platform
        </p>
      </div>

      {/* ─── ISO 13374 Pipeline ─── */}
      <div>
        <div className="section-label mb-4">ISO 13374 Architecture Pipeline</div>
        <div className="relative">
          {/* Connector line */}
          <div className="absolute top-12 left-[60px] right-[60px] h-0.5 bg-gradient-to-r from-sky-500/20 via-purple-500/20 to-green-500/20 hidden lg:block" />

          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
            {ISO_LAYERS.map((layer, i) => {
              const Icon = layer.icon;
              return (
                <motion.div
                  key={layer.number}
                  className="card text-center relative"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 relative z-10"
                       style={{ background: `${layer.color}20`, border: `1px solid ${layer.color}40` }}>
                    <Icon size={20} style={{ color: layer.color }} />
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mb-1">Layer {layer.number}</div>
                  <div className="text-xs font-bold text-white mb-1">{layer.abbr}</div>
                  <div className="text-[11px] text-slate-500 leading-tight">{layer.name}</div>

                  {i < ISO_LAYERS.length - 1 && (
                    <div className="hidden lg:flex absolute -right-3 top-10 z-20 items-center justify-center w-6 h-6 rounded-full bg-[#1a2035] border border-[#1e2d4a]">
                      <ArrowRight size={10} className="text-slate-500" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Layer Details ─── */}
      <div className="grid grid-cols-2 gap-6">
        {ISO_LAYERS.map((layer, i) => {
          const Icon = layer.icon;
          return (
            <motion.div
              key={layer.number}
              className="card"
              initial={{ opacity: 0, x: i % 2 === 0 ? -16 : 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                     style={{ background: `${layer.color}20`, border: `1px solid ${layer.color}40` }}>
                  <Icon size={18} style={{ color: layer.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono text-slate-600">ISO 13374-L{layer.number}</span>
                    <span className="font-bold text-white">{layer.name}</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{layer.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {layer.tech.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded text-[11px] font-mono"
                            style={{ background: `${layer.color}15`, color: layer.color, border: `1px solid ${layer.color}30` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Tech Stack ─── */}
      <div>
        <div className="section-label mb-4">Technology Stack</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {TECH_STACK.map((cat, i) => (
            <motion.div
              key={cat.category}
              className="card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="section-label mb-3" style={{ color: cat.color }}>{cat.category}</div>
              <div className="space-y-3">
                {cat.items.map(item => (
                  <div key={item.name}>
                    <div className="text-sm text-white font-medium">{item.name}</div>
                    <div className="text-[11px] text-slate-600">{item.detail}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── Data Pipeline ─── */}
      <div className="card">
        <div className="section-label mb-4">ML Pipeline Workflow</div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { step: 'Raw Data', desc: 'C-MAPSS TXT/CSV', color: '#0ea5e9' },
            { step: 'Clean', desc: 'Remove constant sensors', color: '#6366f1' },
            { step: 'RUL Label', desc: 'Piecewise linear cap=125', color: '#8b5cf6' },
            { step: 'Scale', desc: 'MinMax normalization', color: '#a78bfa' },
            { step: 'Sequence', desc: '30-cycle sliding window', color: '#f59e0b' },
            { step: 'LSTM', desc: 'BiLSTM inference', color: '#f97316' },
            { step: 'XGBoost', desc: 'Flat feature inference', color: '#ef4444' },
            { step: 'Ensemble', desc: '60/40 weighted avg', color: '#22c55e' },
            { step: 'SHAP', desc: 'Feature attribution', color: '#10b981' },
          ].map((step, i, arr) => (
            <React.Fragment key={step.step}>
              <div className="flex flex-col items-center min-w-[90px]">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-2 text-xs font-bold"
                     style={{ borderColor: step.color, background: `${step.color}15`, color: step.color }}>
                  {i + 1}
                </div>
                <div className="text-[12px] font-bold text-white text-center">{step.step}</div>
                <div className="text-[10px] text-slate-600 text-center leading-tight mt-0.5">{step.desc}</div>
              </div>
              {i < arr.length - 1 && (
                <ArrowRight size={16} className="text-slate-700 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>


    </div>
  );
}
