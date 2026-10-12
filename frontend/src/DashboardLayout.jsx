import React, { useState, useEffect } from 'react';
import axios from 'axios';
import TopNav from './components/TopNav';
import SubjectExplorer from './components/SubjectExplorer';
import NotesFeed from './components/NotesFeed';
import NoteInsightsPanel from './components/NoteInsightsPanel';
import UploadModal from './components/UploadModal';


const API_BASE = 'http://localhost:8081/api';

const DashboardLayout = () => {
  const [subjects, setSubjects] = useState([]);
  const [notes, setNotes] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch initial data
  useEffect(() => {
    fetchSubjects();
    fetchNotes();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await axios.get(`${API_BASE}/subjects`);
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to fetch subjects", err);
    }
  };

  const fetchNotes = async (subjectId = null, query = '') => {
    try {
      let url = `${API_BASE}/notes?`;
      if (subjectId) url += `subjectId=${subjectId}&`;
      if (query) url += `keyword=${query}`;
      
      const res = await axios.get(url);
      setNotes(res.data);
    } catch (err) {
      console.error("Failed to fetch notes", err);
    }
  };

  // Handlers
  const handleSubjectSelect = (id) => {
    setSelectedSubjectId(id);
    setSelectedNoteId(null);
    fetchNotes(id, searchQuery);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchNotes(selectedSubjectId, query);
  };

  const activeSubject = subjects.find(s => s.id === selectedSubjectId);
  const activeNote = notes.find(n => n.id === selectedNoteId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopNav 
        onUploadClick={() => setIsUploadOpen(true)} 
        onSearch={handleSearch}
      />

      <div className="flex flex-1 overflow-hidden">
        
        <aside className="w-[250px] border-r border-notion-border bg-notion-sidebar flex-shrink-0 flex flex-col">
          <SubjectExplorer 
            subjects={subjects} 
            selectedId={selectedSubjectId} 
            onSelect={handleSubjectSelect} 
          />
        </aside>

        <main className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">
              {activeSubject ? activeSubject.name : 'All Notes'}
            </h1>
            <NotesFeed 
              notes={notes} 
              onSelectNote={setSelectedNoteId}
              selectedNoteId={selectedNoteId}
            />
          </div>
        </main>

        {selectedNoteId && (
          <aside className="w-[350px] border-l border-notion-border bg-white flex-shrink-0 flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
             <NoteInsightsPanel 
                noteId={selectedNoteId} 
                onClose={() => setSelectedNoteId(null)} 
                onDelete={() => {
                    setSelectedNoteId(null);
                    fetchNotes(selectedSubjectId, searchQuery);
                    fetchSubjects();
                }}
             />
          </aside>
        )}
      </div>

      {isUploadOpen && (
        <UploadModal 
          onClose={() => {
            setIsUploadOpen(false);
            fetchSubjects(); // Refresh counts maybe
            fetchNotes(selectedSubjectId, searchQuery); // Refresh lists
          }} 
          subjects={subjects}
        />
      )}
      

    </div>
  );
};

export default DashboardLayout;
