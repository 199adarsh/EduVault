import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import SovereignLayout from './components/Sovereign/SovereignLayout';
import HomeDashboard from './components/Sovereign/HomeDashboard';
import NotesLibrary from './components/Sovereign/NotesLibrary';
import NoteDetail from './components/NoteDetail';
import Roadmaps from './components/Sovereign/Roadmaps';
import AttendanceAnalytics from './components/Sovereign/AttendanceAnalytics';
import PYQsDatabase from './components/Sovereign/PYQsDatabase';
import Announcements from './components/Sovereign/Announcements';
import AIAssistant from './components/Sovereign/AIAssistant';
import OptimizationPage from './components/Sovereign/OptimizationPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<SovereignLayout />}>
          <Route index element={<HomeDashboard />} />
          <Route path="notes" element={<NotesLibrary />} />
          <Route path="notes/:id" element={<NoteDetail />} />
          <Route path="pyqs" element={<NotesLibrary defaultTab="pyqs" />} />
          <Route path="roadmaps" element={<Roadmaps />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="attendance" element={<AttendanceAnalytics />} />
          <Route path="optimization" element={<OptimizationPage />} />
          <Route path="settings" element={<div className="p-10 text-on-surface-variant">Settings Module - Coming Soon</div>} />
        </Route>
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App;

