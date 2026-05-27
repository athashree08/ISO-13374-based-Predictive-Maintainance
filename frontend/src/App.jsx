import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import EngineDetailsPage from './pages/EngineDetailsPage';
import DataIngestionPage from './pages/DataIngestionPage';
import AnalyticsPage from './pages/AnalyticsPage';
import ArchitecturePage from './pages/ArchitecturePage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen" style={{ background: 'var(--color-bg-primary)' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 ml-[240px] min-h-screen overflow-y-auto">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/engine" element={<EngineDetailsPage />} />
            <Route path="/engine/:id" element={<EngineDetailsPage />} />
            <Route path="/ingest" element={<DataIngestionPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
