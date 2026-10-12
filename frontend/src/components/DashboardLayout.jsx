import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TopNav from './TopNav';
import AcademicGraphExplorer from './AcademicGraphExplorer';
import QuickStatsPanel from './QuickStatsPanel';
import NotesFeed from './NotesFeed';
import NoteInsightsPanel from './NoteInsightsPanel';
import UploadNotesView from './UploadNotesView';
import StudyRoadmapView from './StudyRoadmapView';

import PortalWidget from './PortalWidget';
import clsx from 'clsx';
import { Home, BookOpen, Map, UploadCloud, Settings, Hash } from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

const DashboardLayout = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  useEffect(() => {
    axios.get(`${API_BASE}/profile`).then(res => setProfile(res.data)).catch(() => {});
    fetchSubjects();
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [selectedSubjectId, selectedUnit, searchQuery]);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/subjects`);
      setSubjects(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotes = async () => {
    setLoadingNotes(true);
    try {
      let url = `${API_BASE}/notes?`;
      if (selectedSubjectId) url += `subjectId=${selectedSubjectId}&`;
      if (selectedUnit) url += `unit=${encodeURIComponent(selectedUnit)}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      const res = await axios.get(url);
      setNotes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotes(false);
    }
  };

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);

  // Render main content based on activeTab
  const renderMainContent = () => {
      switch (activeTab) {
          case 'dashboard':
              return (
                  <div className="max-w-7xl mx-auto space-y-8">
                     <PortalWidget />
                     <QuickStatsPanel />
                     
                     {/* Show a mini feed of all recent notes on Dashboard */}
                     <section>
                         <div className="flex items-center justify-between mb-6 border-b pb-4">
                             <h2 className="text-xl font-bold tracking-tight">Recent Notes</h2>
                             <button className="text-sm text-primary font-medium hover:text-primary/80 transition-colors" onClick={() => setActiveTab('subjects')}>View All</button>
                         </div>
                         <NotesFeed 
                           notes={notes.slice(0, 6)} 
                           onSelectNote={setSelectedNoteId}
                           selectedNoteId={selectedNoteId}
                           loading={loadingNotes}
                         />
                     </section>
                  </div>
              );
          case 'subjects':
              return (
                  <div className="max-w-7xl mx-auto space-y-8">
                     <section>
                         <div className="flex items-center justify-between mb-8">
                             <div>
                                <h2 className="text-3xl font-black tracking-tighter uppercase">Academic Graph</h2>
                                <p className="text-sm text-muted-foreground font-medium uppercase tracking-[0.3em]">Department → Semester → Subject → Unit</p>
                             </div>
                         </div>
                         <AcademicGraphExplorer 
                           subjects={subjects} 
                           notes={notes}
                           profile={profile}
                           selectedNoteId={selectedNoteId}
                           onSelectNote={setSelectedNoteId}
                           loadingNotes={loadingNotes}
                           onFetchNotesBySubjectAndUnit={(subId, unit) => {
                               setSelectedSubjectId(subId);
                               setSelectedUnit(unit);
                           }}
                         />
                     </section>
                     
                     <section className="bg-muted/30 p-8 rounded-xl border border-border/50 min-h-[500px] shadow-sm">
                         <div className="flex items-center justify-between mb-6 border-b pb-4">
                           <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                             <Hash className="w-5 h-5 text-muted-foreground" />
                             {searchQuery ? `Search Results for "${searchQuery}"` : (activeSubject ? activeSubject.name : 'All Notes')}
                           </h2>
                         </div>
                         <NotesFeed 
                           notes={notes} 
                           onSelectNote={setSelectedNoteId}
                           selectedNoteId={selectedNoteId}
                           loading={loadingNotes}
                         />
                     </section>
                  </div>
              );
          case 'upload':
              return (
                  <UploadNotesView 
                     subjects={subjects} 
                     profile={profile}
                     onSuccess={() => {
                         fetchNotes();
                         fetchSubjects();
                         setActiveTab('dashboard');
                     }} 
                  />
              );
          case 'roadmap':
              return <StudyRoadmapView />;
          default:
              return null;
      }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      
      {/* Sidebar Navigation */}
      <aside className="w-[260px] border-r border-border bg-muted/30 flex-shrink-0 flex flex-col hidden md:flex backdrop-blur-sm">
        <div className="h-16 border-b border-border flex items-center px-6 font-bold text-lg gap-3 tracking-tight">
          <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded-lg flex items-center justify-center text-zinc-50 dark:text-zinc-900 text-sm shadow-sm ring-1 ring-zinc-900/10 dark:ring-zinc-100/10">E</div>
          EduVault
        </div>
        <div className="p-4 flex-1 space-y-1">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2 mt-2">Main Menu</div>
          
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={clsx("flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150", activeTab === 'dashboard' ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/80")}
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab('subjects')} 
            className={clsx("flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150", activeTab === 'subjects' ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/80")}
          >
            <BookOpen className="w-4 h-4" /> Browse Subjects
          </button>
          
          <button 
            onClick={() => setActiveTab('upload')} 
            className={clsx("flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150", activeTab === 'upload' ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/80")}
          >
            <UploadCloud className="w-4 h-4" /> Upload Notes
          </button>
          
          <button 
            onClick={() => setActiveTab('roadmap')} 
            className={clsx("flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md transition-all duration-150", activeTab === 'roadmap' ? "bg-secondary text-secondary-foreground font-semibold" : "text-muted-foreground hover:bg-muted/80")}
          >
            <Map className="w-4 h-4" /> Study Roadmap
          </button>
        </div>
        
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium rounded-md text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="w-4 h-4" /> Settings
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <TopNav 
          onUploadClick={() => setActiveTab('upload')} 
          onSearch={setSearchQuery}
          searchQuery={searchQuery}
        />

        <main className="flex-1 overflow-y-auto p-8 lg:p-10 z-0 bg-background relative selection:bg-primary/10">
           {renderMainContent()}
        </main>
      </div>

      {selectedNoteId && (
        <NoteInsightsPanel 
            noteId={selectedNoteId} 
            onClose={() => setSelectedNoteId(null)} 
            onDelete={() => {
                setSelectedNoteId(null);
                fetchNotes();
                fetchSubjects();
            }}
        />
      )}
      

    </div>
  );
};

export default DashboardLayout;
