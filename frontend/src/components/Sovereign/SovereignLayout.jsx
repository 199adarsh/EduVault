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

    const handleLogout = () => {
        localStorage.clear();
        sessionStorage.clear();
        setProfile(null);
        setSubjects([]);
        window.location.replace('/');
        window.location.reload();
    };

    const navTabs = [
        { name: 'Home', path: '/', icon: 'home' },
        { name: 'Notes', path: '/notes', icon: 'menu_book' },
        { name: 'Notices', path: '/announcements', icon: 'campaign' },
        { name: 'Roadmaps', path: '/roadmaps', icon: 'alt_route' },
        { 
            name: 'Attendance', 
            path: '/attendance', 
            icon: 'how_to_reg', 
            badge: overallAttendance ? `${overallAttendance}%` : null 
        },
    ];

    return (
        <div className="flex h-screen overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">
            {/* Sidebar */}
            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLogout={handleLogout} />

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
                <header className="md:hidden sticky top-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle pt-safe">
                    <div className="h-14 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs font-black text-xs tracking-tight">CA</div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5 leading-none">
                                    <span className="font-bold text-[15px] tracking-tight text-text-primary leading-tight">Campusaxis</span>
                                    <span className="px-1.5 py-0.2 text-[9px] font-semibold bg-blue-50 text-primary rounded border border-blue-100">OS</span>
                                </div>
                                <span className="text-[10px] font-medium text-text-secondary truncate max-w-[150px] mt-0.5">
                                    {profile?.department || 'Academic Vault'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => navigate('/announcements')}
                                aria-label="Notifications"
                                className="relative w-9 h-9 rounded-full flex items-center justify-center text-text-secondary hover:text-text-primary active:bg-slate-100 transition-colors"
                            >
                                <span className="material-symbols-outlined text-[20px]">notifications</span>
                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>
                            </button>
                            <button
                                onClick={() => setMobileMenuOpen(true)}
                                className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs ml-1"
                                aria-label="Open menu"
                            >
                                {profile?.name ? profile.name.split(' ').map(n=>n[0]).slice(0,2).join('') : <Menu className="w-4 h-4 text-text-secondary" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`flex-1 relative ${location.pathname === '/ai-assistant' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden pb-20 md:pb-0'}`}>
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
                        className="fixed bottom-20 md:bottom-3 right-4 z-40 flex items-center gap-2 px-3.5 py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-lg shadow-primary/20 border border-primary/30 transition-all duration-200 group active:scale-95 cursor-pointer"
                        title="Open AI Academic Assistant"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                        </span>
                        <span className="material-symbols-outlined text-[17px]">smart_toy</span>
                        <span>Ask AI</span>
                    </button>
                )}

                {/* Mobile Bottom Navigation Dock */}
                <nav aria-label="Mobile Navigation" className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-border-subtle pb-safe md:hidden shadow-nav">
                    <div className="flex items-center justify-around h-14 px-2">
                        {navTabs.map((tab) => {
                            const isActive = tab.path === '/' 
                                ? location.pathname === '/' 
                                : location.pathname.startsWith(tab.path);

                            return (
                                <button
                                    key={tab.path}
                                    onClick={() => navigate(tab.path)}
                                    className={`flex-1 h-full flex flex-col items-center justify-center min-w-[54px] transition-colors relative cursor-pointer ${
                                        isActive ? 'text-primary font-bold' : 'text-text-secondary hover:text-text-primary'
                                    }`}
                                >
                                    <div className="relative">
                                        <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                                        {tab.badge && (
                                            <span className="absolute -top-1 -right-3 px-1 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold border border-emerald-200">
                                                {tab.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] leading-tight mt-0.5">{tab.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </main>
        </div>
    );
};

export default SovereignLayout;
