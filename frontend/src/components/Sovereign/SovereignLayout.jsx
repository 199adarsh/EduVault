import React, { useState, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { motion } from 'motion/react';
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
    const [catalogSubjects, setCatalogSubjects] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showUpload, setShowUpload] = useState(false);
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

            // 2. Fetch notes from server scoped to PRN/role if available
            const role = localStorage.getItem('eduvault_user_role') || (currentProfile?.dob === 'TEACHER' ? 'teacher' : 'student');
            const isTeacher = role === 'teacher' || role === 'faculty' || role === 'admin';
            const notesUrl = (currentProfile?.prn && !isTeacher) 
                ? `${API_BASE}/notes?prn=${encodeURIComponent(currentProfile.prn)}` 
                : `${API_BASE}/notes`;
            const notesRes = await axios.get(notesUrl, {
                headers: { 'X-User-Role': role, 'X-Student-PRN': currentProfile?.prn || '' }
            });
            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];
            setNotes(fetchedNotes);

            // 3. Fetch full catalog subjects from backend
            const subsRes = await axios.get(`${API_BASE}/subjects`);
            const catalogSubs = Array.isArray(subsRes.data) ? subsRes.data : [];
            setCatalogSubjects(catalogSubs);

            // 4. Set enrolled subjects: maintain student attendance/CIE integrity
            if (isTeacher) {
                const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');
                if (savedTeacherSubs) {
                    try {
                        const parsed = JSON.parse(savedTeacherSubs);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            const filtered = catalogSubs.filter(cs =>
                                parsed.includes(cs.name) || parsed.includes(cs.id) || parsed.some(p => p === cs.name || p === cs.id)
                            );
                            setSubjects(filtered.length > 0 ? filtered : catalogSubs);
                        } else {
                            setSubjects(catalogSubs);
                        }
                    } catch (e) {
                        setSubjects(catalogSubs);
                    }
                } else {
                    setSubjects(catalogSubs);
                }
            } else if (currentSubjects && currentSubjects.length > 0) {
                // Student has portal-scraped subjects: reconcile and guarantee id, department, and semester
                const repairedLocal = currentSubjects.map(ls => {
                    const match = catalogSubs.find(cs =>
                        (ls.id && cs.id === ls.id) ||
                        (ls.code && cs.code && ls.code.toLowerCase() === cs.code.toLowerCase()) ||
                        (ls.name && cs.name && ls.name.toLowerCase() === cs.name.toLowerCase())
                    );
                    return {
                        ...ls,
                        id: match?.id || ls.id || (ls.code ? `sub-${ls.code.toLowerCase()}` : `sub-${ls.name?.toLowerCase().replace(/\s+/g, '-')}`),
                        department: match?.department || ls.department || currentProfile?.department || 'B.Tech-UAD',
                        semester: match?.semester || ls.semester || currentProfile?.semester || 'SEM 05'
                    };
                });
                localStorage.setItem('eduvault_subjects', JSON.stringify(repairedLocal));
                setSubjects(repairedLocal);
            } else if (currentProfile?.department && currentProfile?.semester) {
                const normDept = (d) => {
                    if (!d) return 'AIDS';
                    const u = d.toUpperCase();
                    if (u.includes('UAD') || u.includes('AIDS') || u.includes('AI&DS') || u.includes('AI & DS') || u.includes('ARTIFICIAL')) return 'AIDS';
                    if (u.includes('CSE') || u.includes('COMPUTER')) return 'CSE';
                    return u.replace(/[^A-Z0-9]/g, '');
                };
                const normSem = (s) => {
                    if (!s) return 'S05';
                    const m = s.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);
                    return m ? `S0${m[1]}` : s.toString().toUpperCase().trim();
                };
                const scoped = catalogSubs.filter(cs =>
                    normDept(cs.department) === normDept(currentProfile.department) &&
                    normSem(cs.semester) === normSem(currentProfile.semester)
                );
                setSubjects(scoped.length > 0 ? scoped : catalogSubs);
            } else {
                setSubjects(catalogSubs);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="flex h-screen w-full max-w-full overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">
            {/* Sidebar */}
            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLogout={handleLogout} />

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-black/40 z-[45] md:hidden backdrop-blur-xs transition-opacity"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Content Area */}
            <main className="flex-1 md:pl-64 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden relative">
                {/* Mobile Header (Single Clean App Header) */}
                <header className="md:hidden sticky top-0 inset-x-0 z-40 bg-surface-card/95 backdrop-blur-md border-b border-border-subtle pt-safe shrink-0">
                    <div className="h-14 px-3.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white shadow-xs font-black text-xs tracking-tight shrink-0">CA</div>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5 leading-none">
                                    <span className="font-bold text-[15px] tracking-tight text-text-primary leading-tight">Campusaxis</span>
                                    <span className="px-1 py-0.2 text-[8px] font-bold bg-blue-50 text-primary rounded border border-blue-100">Portal</span>
                                </div>
                                <span className="text-[10px] font-medium text-text-secondary truncate mt-0.5">
                                    {profile?.department || 'Student Dashboard'}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
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
                                className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs ml-0.5"
                                aria-label="Open menu"
                            >
                                {profile?.name ? profile.name.split(' ').map(n=>n[0]).slice(0,2).join('') : <Menu className="w-4 h-4 text-text-secondary" />}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className={`flex-1 w-full max-w-full min-w-0 relative ${location.pathname === '/ai-assistant' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden pb-24 md:pb-0'}`}>
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 opacity-40">
                            <div className="w-10 h-10 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Loading CampusAxis...</p>
                        </div>
                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/' && location.pathname !== '/settings' ? (
                        <Navigate to="/" replace />
                    ) : (
                        <Outlet context={{ profile, subjects, catalogSubjects, notes, refreshData: fetchData, setShowUpload }} />
                    )}
                </div>

                {/* Upload Modal Overlay */}
                {showUpload && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
                        <div className="bg-white  rounded-2xl border border-border-subtle max-w-4xl w-full shadow-2xl relative overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-[18px]">upload_file</span>
                                    </div>
                                    <div>
                                        <h2 className="text-sm sm:text-base font-bold text-text-primary leading-tight">Upload Notes</h2>
                                        <span className="text-[11px] font-medium text-text-secondary">Share notes and study material with your class</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setShowUpload(false)}
                                    className="w-8 h-8 rounded-lg hover:bg-slate-100  text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer"
                                >
                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                </button>
                            </div>
                            <div className="p-6 max-h-[80vh] overflow-y-auto">
                                <UploadNotesView 
                                    profile={profile} 
                                    subjects={catalogSubjects.length > 0 ? catalogSubjects : subjects} 
                                    onSuccess={() => {
                                        fetchData();
                                        setShowUpload(false);
                                    }} 
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating AI Assistant Quick Access (Adjusted fixed positioning and clearance) */}
                {location.pathname !== '/ai-assistant' && !location.pathname.startsWith('/notes') && (
                    <button
                        onClick={() => navigate('/ai-assistant')}
                        className="fixed bottom-[4.25rem] md:bottom-4 right-3.5 md:right-5 z-40 flex items-center gap-1.5 p-2 sm:px-3.5 sm:py-2 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs shadow-lg shadow-primary/25 border border-primary/30 transition-all duration-200 active:scale-95 cursor-pointer"
                        title="Ask AI Study Assistant"
                        aria-label="Ask AI Assistant"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                        </span>
                        <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                        <span className="hidden sm:inline">Ask AI</span>
                    </button>
                )}

                {/* Mobile Bottom Navigation Dock */}
                <nav aria-label="Mobile Navigation" className="fixed bottom-0 inset-x-0 z-50 bg-white/95  backdrop-blur-md border-t border-border-subtle pb-safe md:hidden shadow-nav">
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
                                    {isActive && (
                                        <motion.div
                                            layoutId="mobile-dock-active-pill"
                                            transition={{
                                                type: 'spring',
                                                stiffness: 300,
                                                damping: 28,
                                                mass: 0.8,
                                            }}
                                            className="absolute inset-x-2 inset-y-1.5 rounded-2xl bg-blue-50/80 -z-0"
                                        />
                                    )}
                                    <div className="relative z-10">
                                        <span className="material-symbols-outlined text-[22px]">{tab.icon}</span>
                                        {tab.badge && (
                                            <span className="absolute -top-1 -right-3 px-1 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-bold border border-emerald-200">
                                                {tab.badge}
                                            </span>
                                        )}
                                    </div>
                                    <span className="relative z-10 text-[10px] leading-tight mt-0.5">{tab.name}</span>
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
