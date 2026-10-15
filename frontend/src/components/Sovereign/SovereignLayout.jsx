import React, { useState, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import SovereignSidebar from './SovereignSidebar';
import { Menu } from 'lucide-react';

import axios from 'axios';
import { toast } from 'sonner';
import UploadNotesView from '../UploadNotesView';

import { useLocation, matchPath, Navigate, useNavigate } from 'react-router-dom';

const API_BASE = 'http://localhost:8081/api';

const SovereignLayout = () => {
    const navigate = useNavigate();
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

    const fetchData = async (retries = 3) => {
        try {
            const [profileRes, subjectsRes, notesRes] = await Promise.all([
                axios.get(`${API_BASE}/profile`),
                axios.get(`${API_BASE}/subjects`),
                axios.get(`${API_BASE}/notes`)
            ]);
            setProfile(profileRes.data || null);
            setSubjects(Array.isArray(subjectsRes.data) ? subjectsRes.data : []);
            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];
            setNotes(fetchedNotes);

            if (fetchedNotes.length === 0 && retries > 0) {
                setTimeout(() => fetchData(retries - 1), 2000);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
            if (retries > 0) {
                setTimeout(() => fetchData(retries - 1), 2000);
            } else {
                toast.error('Server offline. Working with local cache.');
                if (!profile) setProfile({ name: "Academic User", image: null });
                if (!subjects) setSubjects([]);
                if (!notes) setNotes([]);
            }
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
        fetchData(3);
    }, []);

    const overallAttendance = useMemo(() => {
        if (!subjects || subjects.length === 0) return null;
        const saved = localStorage.getItem('eduvault_excluded_subjects');
        const excludedIds = saved ? JSON.parse(saved) : [];
        const active = subjects.filter(s => !excludedIds.includes(s.id));
        if (active.length === 0) return null;

        const getPrecisePct = (s) => {
            const conducted = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
            const present = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
            if (conducted === 0) return parseFloat(s.attendance) || 0;
            return parseFloat(((present / conducted) * 100).toFixed(1));
        };

        const totalCredits = active.reduce((acc, s) => acc + (s.credit || 1), 0);
        const weightedSum = active.reduce((acc, s) => acc + (getPrecisePct(s) * (s.credit || 1)), 0);
        return totalCredits > 0 ? (weightedSum / totalCredits).toFixed(1) : null;
    }, [subjects]);

    return (
        <div className="flex h-screen overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">
            {/* Sidebar */}
            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-[45] md:hidden backdrop-blur-sm"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Content Area */}
            <main className="flex-1 md:pl-64 flex flex-col min-w-0 h-full overflow-hidden relative">

                {/* Mobile Header */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-border-subtle bg-surface-card/90 backdrop-blur-md z-40">
                    <span className="font-bold text-text-primary tracking-tight">EduVault</span>
                    <button onClick={() => setMobileMenuOpen(true)} className="text-text-secondary hover:text-text-primary">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Page Content */}
                <div className={`flex-1 relative ${location.pathname === '/ai-assistant' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden'}`}>
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

                {/* Floating AI Assistant Quick Access */}
                {location.pathname !== '/ai-assistant' && !location.pathname.startsWith('/notes') && (
                    <button
                        onClick={() => navigate('/ai-assistant')}
                        className="fixed bottom-3 right-4 z-40 flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] border border-blue-500/30 transition-all duration-200 group active:scale-95 cursor-pointer"
                        title="Open AI Academic Assistant"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                        </span>
                        <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                        <span className="hidden sm:inline">Ask AI</span>
                    </button>
                )}
            </main>
        </div>
    );
};

export default SovereignLayout;
