import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Settings2,
  Database,
  BarChart3,
  BookOpen,
  Cpu,
  Activity,
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Fleet Dashboard',
    icon: LayoutDashboard,
    isoLayer: 'L3',
    description: 'Condition Monitoring'
  },
  {
    path: '/engine',
    label: 'Engine Details',
    icon: Settings2,
    isoLayer: 'L4',
    description: 'Health Assessment'
  },
  {
    path: '/ingest',
    label: 'Data Ingestion',
    icon: Database,
    isoLayer: 'L1',
    description: 'Data Acquisition'
  },
  {
    path: '/analytics',
    label: 'Analytics & SHAP',
    icon: BarChart3,
    isoLayer: 'L5',
    description: 'Prognostic Assessment'
  },
  {
    path: '/architecture',
    label: 'System Architecture',
    icon: BookOpen,
    isoLayer: 'ISO',
    description: '13374 Framework'
  },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sidebar flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-[#1e2d4a]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Cpu size={16} className="text-sky-400" />
          </div>
          <div>
            <div className="text-white font-semibold text-sm tracking-wide">RULVision</div>
          </div>
        </div>
      </div>

      {/* Status indicator */}
      <div className="px-5 py-3 border-b border-[#1e2d4a]">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="live-dot" />
          <span className="text-slate-400">System Operational</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        <div className="section-label px-5 mb-2">Navigation</div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || 
            (item.path !== '/' && location.pathname.startsWith(item.path));

          return (
            <NavLink key={item.path} to={item.path}>
              {({ isActive: routerActive }) => (
                <motion.div
                  className={`sidebar-item ${routerActive ? 'active' : ''}`}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  <Icon size={16} />
                  <div className="flex-1">
                    <div className="text-sm">{item.label}</div>
                  </div>

                </motion.div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-[#1e2d4a]">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={12} className="text-sky-500" />
          <span className="text-[11px] text-slate-500">NASA C-MAPSS FD001</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-yellow-500" />
          <span className="text-[11px] text-slate-500">LSTM + XGBoost Ensemble</span>
        </div>

      </div>
    </aside>
  );
}
