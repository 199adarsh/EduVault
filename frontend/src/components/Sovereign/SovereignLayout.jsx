import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SovereignSidebar from './SovereignSidebar';
import { Menu } from 'lucide-react';

import axios from 'axios';
import { toast } from 'sonner';
import UploadNotesView from '../UploadNotesView';

import { useLocation, matchPath, Navigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8081/api';

const SovereignLayout = () => {
    const [profile, setProfile] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Context Detection: Identify if we are viewing a specific note
    const match = matchPath({ path: "/notes/:id" }, location.pathname);
    const activeNoteId = match?.params?.id;

    const fetchData = async () => {
        try {
            const [profileRes, subjectsRes, notesRes] = await Promise.all([
                axios.get(`${API_BASE}/profile`),
                axios.get(`${API_BASE}/subjects`),
                axios.get(`${API_BASE}/notes`)
            ]);
            setProfile(profileRes.data || null);
            setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
            setNotes(Array.isArray(notesRes.data) ? notesRes.data : []);
        } catch (err) {
            console.error('Error fetching data:', err);
            toast.error('Server offline. Working with local cache.');
            // Fallback to empty states if null
            if (!profile) setProfile({ name: "Academic User", image: null });
            if (!subjects) setSubjects([]);
            if (!notes) setNotes([]);
        } finally {
            setLoading(false);
        }
    };

    const searchResults = searchQuery.length > 1 
        ? [
            ...notes.filter(n => n.title.toLowerCase().includes(searchQuery.toLowerCase())).map(n => ({ ...n, type: 'note', icon: 'description' })),
            ...subjects.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(s => ({ ...s, type: 'subject', icon: 'auto_stories' }))
        ].slice(0, 5)
        : [];

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="flex h-screen overflow-hidden bg-surface text-on-surface font-body selection:bg-primary/20">
            {/* Sidebar */}
            <SovereignSidebar profile={profile} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 z-[50] md:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Content Area */}
            <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-md z-40">
                    <span className="font-bold text-zinc-100 tracking-tighter">EduVault</span>
                    <button onClick={() => setMobileMenuOpen(true)} className="text-zinc-300 hover:text-white">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Page Content */}
                <div className="flex-1 overflow-hidden relative overflow-y-auto">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                            <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest">Synchronizing Vault...</p>
                        </div>
                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/' ? (
                        <Navigate to="/" replace />
                    ) : (
                        <Outlet context={{ profile, subjects, notes, refreshData: fetchData, setShowUpload }} />
                    )}
                </div>

                {/* Upload Modal Overlay */}
                {showUpload && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-surface/80 backdrop-blur-md">
                        <div className="bg-surface-container p-1 rounded-sm border border-outline-variant/20 max-w-5xl w-full shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 z-50">
                                <button 
                                    onClick={() => setShowUpload(false)}
                                    className="material-symbols-outlined text-on-surface-variant hover:text-on-surface transition-colors"
                                >
                                    close
                                </button>
                            </div>
                            <div className="p-6 max-h-[85vh] overflow-y-auto custom-scrollbar">
                                <UploadNotesView 
                                    profile={profile} 
                                    subjects={subjects} 
                                    onSuccess={() => {
                                        fetchData();
                                        setShowUpload(false);
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating AI Assistant Widget */}

            </main>
        </div>
    );
};

export default SovereignLayout;
