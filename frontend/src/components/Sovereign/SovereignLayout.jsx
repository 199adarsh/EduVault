import React, { useState, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import SovereignSidebar from './SovereignSidebar';
import { Menu } from 'lucide-react';

import axios from 'axios';
import { toast } from 'sonner';
import UploadNotesView from '../UploadNotesView';

import { useLocation, matchPath, Navigate, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

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

    const fetchData = async (overrideProfile, overrideSubjects) => {
        try {
            // 1. Read isolated user session from localStorage
            let currentProfile = overrideProfile;
            let currentSubjects = overrideSubjects;

            if (currentProfile === undefined) {
                try {
                    const saved = localStorage.getItem('eduvault_profile');
                    currentProfile = saved ? JSON.parse(saved) : null;
                } catch (e) {
                    currentProfile = null;
                }
            }

            if (currentSubjects === undefined) {
                try {
                    const savedSubs = localStorage.getItem('eduvault_subjects');
                    currentSubjects = savedSubs ? JSON.parse(savedSubs) : [];
                } catch (e) {
                    currentSubjects = [];
                }
            }

            setProfile(currentProfile);

            // 2. Fetch notes from server scoped to PRN if available
            const notesUrl = currentProfile?.prn 
                ? `${API_BASE}/notes?prn=${encodeURIComponent(currentProfile.prn)}` 
                : `${API_BASE}/notes`;
            const notesRes = await axios.get(notesUrl);
            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];
            setNotes(fetchedNotes);

            // 3. Set subjects: prioritize user's portal subjects from local session, fallback to catalog
            if (currentSubjects && currentSubjects.length > 0) {
                setSubjects(currentSubjects);
            } else if (currentProfile?.department && currentProfile?.semester) {
                const subsRes = await axios.get(`${API_BASE}/subjects?department=${encodeURIComponent(currentProfile.department)}&semester=${encodeURIComponent(currentProfile.semester)}`);
                setSubjects(Array.isArray(subsRes.data) ? subsRes.data : []);
            } else {
                const subsRes = await axios.get(`${API_BASE}/subjects`);
                setSubjects(Array.isArray(subsRes.data) ? subsRes.data : []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
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

    const overallAttendance = useMemo(() => {
        if (!subjects || subjects.length === 0) return null;
        const saved = localStorage.getItem('eduvault_excluded_subjects');
        const excludedIds = saved ? JSON.parse(saved) : [];
        const active = subjects.filter(s => !excludedIds.includes(s.id));
        if (active.length === 0) return null;

        let totalAttended = 0;
        let totalConducted = 0;
        active.forEach(s => {
            const cond = s.totalConducted > 0 ? s.totalConducted : (s.detailedAttendance?.length || 0);
            const att = s.totalAttended > 0 ? s.totalAttended : (s.detailedAttendance?.filter(r => r.status === 'Present').length || 0);
            totalConducted += cond;
            totalAttended += att;
        });
        if (totalConducted > 0) {
            return ((totalAttended / totalConducted) * 100).toFixed(1);
        }
        return null;
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
                    <span className="font-bold text-text-primary tracking-tight">Campusaxis</span>
                    <button onClick={() => setMobileMenuOpen(true)} className="text-text-secondary hover:text-text-primary">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>

                {/* Page Content */}
                <div className={`flex-1 relative ${location.pathname === '/ai-assistant' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden'}`}>
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                            <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest">Synchronizing Campusaxis...</p>
                        </div>
                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/' ? (
                        <Navigate to="/" replace />
                    ) : (
                        <Outlet context={{ profile, subjects, notes, refreshData: fetchData, setShowUpload }} />
                    )}
                </div>

                {/* Upload Modal Overlay (Clean Plain Modal) */}
                {showUpload && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                    </div>
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 leading-tight">Upload Notes</h2>
                                        <span className="text-[11px] font-medium text-slate-500">Add documents to student notes repository</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowUpload(false)}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-6 max-h-[80vh] overflow-y-auto">
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
