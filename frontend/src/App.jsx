import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import SovereignLayout from './components/Sovereign/SovereignLayout';
import LandingPage from './components/Landing/LandingPage';
import { APP_BASE } from './config/appPaths';

const PrivacyPolicy = React.lazy(() => import('./components/Landing/PrivacyPolicy'));
const TermsOfUse = React.lazy(() => import('./components/Landing/TermsOfUse'));
const HomeDashboard = React.lazy(() => import('./components/Sovereign/HomeDashboard'));
const NotesLibrary = React.lazy(() => import('./components/Sovereign/NotesLibrary'));
const NoteDetail = React.lazy(() => import('./components/NoteDetail'));
const Roadmaps = React.lazy(() => import('./components/Sovereign/Roadmaps'));
const AttendanceAnalytics = React.lazy(() => import('./components/Sovereign/AttendanceAnalytics'));
const Announcements = React.lazy(() => import('./components/Sovereign/Announcements'));
const AIAssistant = React.lazy(() => import('./components/Sovereign/AIAssistant'));
const OptimizationPage = React.lazy(() => import('./components/Sovereign/OptimizationPage'));
const Settings = React.lazy(() => import('./components/Sovereign/Settings'));

const RouteLoadingFallback = () => (
  <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8 text-center animate-pulse">
    <div className="w-8 h-8 rounded-full border-2 border-[#0071E3]/20 border-t-[#0071E3] animate-spin mb-3" />
    <span className="text-xs text-slate-400 font-medium tracking-wide">Loading module...</span>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
          <Route path={APP_BASE} element={<SovereignLayout />}>
            <Route index element={<HomeDashboard />} />
            <Route path="notes" element={<NotesLibrary />} />
            <Route path="notes/:id" element={<NoteDetail />} />
            <Route path="pyqs" element={<NotesLibrary defaultTab="pyqs" />} />
            <Route path="roadmaps" element={<Roadmaps />} />
            <Route path="ai-assistant" element={<AIAssistant />} />
            <Route path="announcements" element={<Announcements />} />
            <Route path="attendance" element={<AttendanceAnalytics />} />
            <Route path="optimization" element={<OptimizationPage />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
