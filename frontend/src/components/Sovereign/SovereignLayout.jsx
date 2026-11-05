import { cn } from '../../lib/utils';
import React, { useState, useEffect, useMemo, useRef } from 'react';

import { Outlet } from 'react-router-dom';

import { motion } from 'motion/react';

import SovereignSidebar from './SovereignSidebar';

import {
    Menu01Icon,
    Home01Icon,
    Book02Icon,
    Notification01Icon,
    MapsLocation02Icon,
    Calendar03Icon,
    SparklesIcon,
    Cancel01Icon,
    Upload01Icon,
    Logout01Icon,
    UserIcon,
} from 'hugeicons-react';

import { DiscreteTabs } from '../watermelon/discrete-tabs';
import { TetrisLoader } from '../ui/loader-tetris';
import { IconFolder } from '../ui/icon-folder';

const DEVELOPER_ICONS = [
    {
        label: "GitHub",
        background: "linear-gradient(135deg,#24292e,#0d1117)",
        node: (
            <svg viewBox="0 0 24 24" width="52%" height="52%" fill="#fff">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
        ),
    },
    {
        label: "LinkedIn",
        background: "linear-gradient(135deg,#0077b5,#005582)",
        node: (
            <svg viewBox="0 0 24 24" width="48%" height="48%" fill="#fff">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
        ),
    },
    {
        label: "React",
        background: "linear-gradient(135deg,#1f242d,#0e1726)",
        node: (
            <svg viewBox="-11.5 -10.23174 23 20.46348" width="52%" height="52%" fill="#61dafb">
                <circle cx="0" cy="0" r="2.05" fill="#61dafb" />
                <g stroke="#61dafb" strokeWidth="1" fill="none">
                    <ellipse rx="11" ry="4.2" />
                    <ellipse rx="11" ry="4.2" transform="rotate(60)" />
                    <ellipse rx="11" ry="4.2" transform="rotate(120)" />
                </g>
            </svg>
        ),
    },
    {
        label: "Spring Boot",
        background: "linear-gradient(135deg,#243b24,#162b16)",
        node: (
            <svg viewBox="0 0 24 24" width="48%" height="48%" fill="#6db33f">
                <path d="M21.574 8.767a5.53 5.53 0 0 0-3.535-4.707c-2.315-.89-4.832.062-6.195 2.122-1.398-1.536-3.676-2.189-5.756-1.428-2.36.865-3.876 3.125-3.766 5.642.1 2.34 1.625 4.385 3.823 5.117 1.34.447 2.802.26 3.99-.472v2.443c0 2.213 1.794 4.007 4.007 4.007s4.007-1.794 4.007-4.007V15.02c1.348-.99 2.18-2.557 2.278-4.225.078-1.34-.337-2.678-1.127-3.754-.42-.572-.94-1.042-1.542-1.378z" />
            </svg>
        ),
    }
];



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
    const [isDockMinimized, setIsDockMinimized] = useState(false);

    const [notes, setNotes] = useState([]);

    const [loading, setLoading] = useState(true);

    const [showUpload, setShowUpload] = useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const [showLogoutMenu, setShowLogoutMenu] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [showDeveloperModal, setShowDeveloperModal] = useState(false);

    const userMenuRef = useRef(null);



    useEffect(() => {

        const handleClickOutside = (e) => {

            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {

                setShowLogoutMenu(false);

            }

        };

        if (showLogoutMenu) {

            document.addEventListener('mousedown', handleClickOutside);

            document.addEventListener('touchstart', handleClickOutside);

        }

        return () => {

            document.removeEventListener('mousedown', handleClickOutside);

            document.removeEventListener('touchstart', handleClickOutside);

        };

    }, [showLogoutMenu]);

    const location = useLocation();

    // Auto-minimize dock whenever route changes
    useEffect(() => {
        setIsDockMinimized(true);
    }, [location.pathname]);

    // Dynamic SEO Titles & Meta Descriptions per page
    useEffect(() => {
        const routeMeta = {
            '/': {
                title: 'CampusAxis | Student Command Center & Academic Portal',
                desc: 'Unified academic platform with real-time attendance analytics, CIE marks tracking, and course updates.'
            },
            '/notes': {
                title: 'Academic Notes & PYQs | CampusAxis',
                desc: 'Access syllabus-organized subject notes, chapter materials, and previous semester question papers.'
            },
            '/ai-assistant': {
                title: 'AI Study Tutor & Exam Prep | CampusAxis',
                desc: 'Curriculum-grounded AI tutor providing instant doubts clearance and syllabus-grounded explanations.'
            },
            '/attendance': {
                title: 'Attendance Analytics & Bunk Planner | CampusAxis',
                desc: 'Track subject attendance percentages, calculate buffer bunks, and forecast semester exam eligibility.'
            },
            '/roadmaps': {
                title: 'Engineering & Career Roadmaps | CampusAxis',
                desc: 'Step-by-step verified learning paths for frontend, backend, DSA, and placements with curriculum mapping.'
            },
            '/announcements': {
                title: 'Notices & Circulars | CampusAxis',
                desc: 'Official college announcements, exam schedules, and department bulletins.'
            }
        };

        const current = Object.entries(routeMeta).find(([path]) => {
            if (path === '/') return location.pathname === '/';
            return location.pathname.startsWith(path);
        });

        const meta = current ? current[1] : {
            title: 'CampusAxis | Student Academic Intelligence',
            desc: 'The complete student operating system for university academics and placements.'
        };

        document.title = meta.title;
        let descTag = document.querySelector('meta[name="description"]');
        if (!descTag) {
            descTag = document.createElement('meta');
            descTag.name = 'description';
            document.head.appendChild(descTag);
        }
        descTag.setAttribute('content', meta.desc);
    }, [location.pathname]);



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



            // 2. Fetch full catalog subjects from backend

            const subsRes = await axios.get(`${API_BASE}/subjects`);

            const catalogSubs = Array.isArray(subsRes.data) ? subsRes.data : [];

            setCatalogSubjects(catalogSubs);



            // 3. Set enrolled subjects using canonical IDs from backend catalog

            const role = localStorage.getItem('eduvault_user_role') || (currentProfile?.dob === 'TEACHER' ? 'teacher' : 'student');

            const isTeacher = role === 'teacher' || role === 'faculty' || role === 'admin';

            let enrolledSubjects = [];



            if (isTeacher) {

                const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');

                if (savedTeacherSubs) {

                    try {

                        const parsed = JSON.parse(savedTeacherSubs);

                        if (Array.isArray(parsed) && parsed.length > 0) {

                            const filtered = catalogSubs.filter(cs =>

                                parsed.includes(cs.name) || parsed.includes(cs.id) || parsed.some(p => p === cs.name || p === cs.id)

                            );

                            enrolledSubjects = filtered.length > 0 ? filtered : catalogSubs;

                        } else {

                            enrolledSubjects = catalogSubs;

                        }

                    } catch (e) {

                        enrolledSubjects = catalogSubs;

                    }

                } else {

                    enrolledSubjects = catalogSubs;

                }

                setSubjects(enrolledSubjects);

            } else if (currentSubjects && currentSubjects.length > 0) {

                // Strict 3-tier canonical matching: Exact code first, canonical ID second, normalized exact name third.

                // Never generate detached subject IDs; preserve unresolved subjects explicitly.

                enrolledSubjects = currentSubjects.map(ls => {

                    let match = null;

                    if (ls.code && ls.code.trim()) {

                        const cleanCode = ls.code.trim().toUpperCase();

                        const codeMatches = catalogSubs.filter(cs => cs.code && cs.code.trim().toUpperCase() === cleanCode);

                        if (codeMatches.length === 1) match = codeMatches[0];

                    }

                    if (!match && ls.id && ls.id.trim()) {

                        const idMatches = catalogSubs.filter(cs => cs.id && cs.id.toLowerCase() === ls.id.trim().toLowerCase());

                        if (idMatches.length === 1) match = idMatches[0];

                    }

                    if (!match && ls.name && ls.name.trim()) {

                        const normLsName = ls.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                        const nameMatches = catalogSubs.filter(cs => {

                            if (!cs.name) return false;

                            const normCsName = cs.name.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ').toLowerCase();

                            return normLsName && normCsName && normLsName === normCsName;

                        });

                        if (nameMatches.length === 1) {

                            match = nameMatches[0];

                        } else if (nameMatches.length > 1) {

                            const deptMatches = nameMatches.filter(cs => normDept(cs.department) === normDept(currentProfile?.department));

                            const pool = deptMatches.length > 0 ? deptMatches : nameMatches;

                            match = pool.reduce((best, cur) => ((cur.noteCount || 0) > (best.noteCount || 0) ? cur : best), pool[0]);

                        }

                    }



                    const canonicalId = match ? match.id : (ls.id || null);

                    return {

                        ...ls,

                        id: canonicalId,

                        canonicalCode: match?.code || ls.code || null,

                        isUnresolved: !canonicalId,

                        department: match?.department || ls.department || currentProfile?.department || 'GENERAL',

                        semester: match?.semester || ls.semester || currentProfile?.semester || 'SEM 01'

                    };

                });

                localStorage.setItem('eduvault_subjects', JSON.stringify(enrolledSubjects));

                setSubjects(enrolledSubjects);

            } else if (currentProfile?.department && currentProfile?.semester) {

                const normDept = (d) => {

                    if (!d) return 'GENERAL';

                    const u = d.toUpperCase();

                    if (u.includes('UAD') || u.includes('AIDS') || u.includes('AI&DS') || u.includes('AI & DS') || u.includes('ARTIFICIAL')) return 'AIDS';

                    if (u.includes('CSE') || u.includes('COMPUTER')) return 'CSE';

                    return u.replace(/[^A-Z0-9]/g, '');

                };

                const normSem = (s) => {

                    if (!s) return 'S01';

                    const m = s.toString().match(/(?:sem|semester|s)?\s*0?([1-8])/i);

                    return m ? `S0${m[1]}` : s.toString().toUpperCase().trim();

                };

                const scoped = catalogSubs.filter(cs =>

                    normDept(cs.department) === normDept(currentProfile.department) &&

                    normSem(cs.semester) === normSem(currentProfile.semester)

                );

                enrolledSubjects = scoped.length > 0 ? scoped : catalogSubs;

                setSubjects(enrolledSubjects);

            } else {

                enrolledSubjects = catalogSubs;

                setSubjects(enrolledSubjects);

            }



            // 4. Fetch notes from server scoped to PRN, role, and canonical enrolled subjects

            const enrolledIds = (enrolledSubjects || []).map(s => s.id).filter(Boolean);

            const notesUrl = (currentProfile?.prn && !isTeacher)

                ? `${API_BASE}/notes?prn=${encodeURIComponent(currentProfile.prn)}`

                : `${API_BASE}/notes`;

            const notesRes = await axios.get(notesUrl, {

                headers: {

                    'X-User-Role': role,

                    'X-Student-PRN': currentProfile?.prn || '',

                    'X-Student-Subjects': enrolledIds.join(',')

                }

            });

            const fetchedNotes = Array.isArray(notesRes.data) ? notesRes.data : [];

            setNotes(fetchedNotes);

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
        { name: 'Home', path: '/', icon: Home01Icon },
        { name: 'Notes', path: '/notes', icon: Book02Icon },
        { name: 'AI Tutor', path: '/ai-assistant', icon: SparklesIcon },
        { name: 'Notices', path: '/announcements', icon: Notification01Icon },
        { name: 'Roadmaps', path: '/roadmaps', icon: MapsLocation02Icon },
        {
            name: 'Attendance',
            path: '/attendance',
            icon: Calendar03Icon,
            badge: null
        },
    ];



    const activeDockTab = useMemo(() => {

        if (location.pathname === '/') return '/';

        const found = navTabs.find(t => t.path !== '/' && location.pathname.startsWith(t.path));

        return found ? found.path : '/';

    }, [location.pathname, navTabs]);



    const discreteTabItems = useMemo(() => {

        return navTabs.map(t => {

            const Icon = t.icon;

            return {

                id: t.path,

                label: t.name,

                icon: <Icon size={17} className="shrink-0" />,

                badge: t.badge

            };

        });

    }, [navTabs, activeDockTab]);



    return (

        <div className="flex h-screen w-full max-w-full overflow-hidden bg-canvas-bg text-text-primary font-sans antialiased selection:bg-primary/20">

            {/* Sidebar */}

            <SovereignSidebar profile={profile} attendance={overallAttendance} mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} onLogout={handleLogout} collapsed={sidebarCollapsed} onOpenDeveloper={() => setShowDeveloperModal(true)} />



            {/* Mobile Overlay */}

            {mobileMenuOpen && (

                <div

                    className="fixed inset-0 bg-black/40 z-[45] md:hidden backdrop-blur-xs transition-opacity"

                    onClick={() => setMobileMenuOpen(false)}

                />

            )}



            {/* Content Area */}

            <main className={cn("flex-1 flex flex-col min-w-0 w-full max-w-full h-full overflow-hidden relative transition-all duration-300", sidebarCollapsed ? "md:pl-16" : "md:pl-64")}>

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

                                <Notification01Icon size={20} className="text-[#8E8E93]" />

                                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white"></span>

                            </button>

                            <div className="relative" ref={userMenuRef}>

                                <button

                                    onClick={() => setShowLogoutMenu(!showLogoutMenu)}

                                    className="w-8 h-8 rounded-full bg-[#DEEDFC] border border-[#D9ECFF] flex items-center justify-center text-[#0073E6] font-bold text-xs ml-0.5 cursor-pointer shadow-2xs active:scale-95 transition-transform"

                                    aria-label="Profile actions"

                                >

                                    {profile?.name ? profile.name.split(' ').map(n => n[0]).slice(0, 2).join('') : <UserIcon size={16} className="text-[#0073E6]" />}

                                </button>



                                {showLogoutMenu && (

                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E2E2E2] rounded-xl shadow-lg p-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">

                                        <div className="px-2.5 py-1.5 border-b border-[#E2E2E2] mb-1">

                                            <p className="text-xs font-bold text-[#383838] truncate">{profile?.name || 'Student'}</p>

                                            <p className="text-[10px] text-[#727272] truncate">{profile?.prn || profile?.rollNo || 'Academic Vault'}</p>

                                        </div>

                                        <button

                                            onClick={() => {

                                                setShowLogoutMenu(false);

                                                handleLogout();

                                            }}

                                            className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"

                                        >

                                            <Logout01Icon size={16} />

                                            <span>Logout</span>

                                        </button>

                                    </div>

                                )}

                            </div>

                        </div>

                    </div>

                </header>



                {/* Page Content */}

                <div className={`flex-1 w-full max-w-full min-w-0 relative ${location.pathname === '/ai-assistant' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto overflow-x-hidden pb-24 md:pb-0'}`}>

                    {loading ? (

                        <div className="h-full min-h-[60vh] flex flex-col items-center justify-center gap-3">

                            <TetrisLoader columns={8} rows={14} cellSize={4} gap={1.5} speed={35} label="Loading CampusAxis..." />

                            <p className="text-xs font-bold uppercase tracking-widest text-[#727272]">Loading CampusAxis...</p>

                        </div>

                    ) : (!profile || !profile.prn || !profile.dob) && location.pathname !== '/' && location.pathname !== '/settings' ? (

                        <Navigate to="/" replace />

                    ) : (

                        <Outlet context={{ profile, subjects, catalogSubjects, notes, refreshData: fetchData, setShowUpload, sidebarCollapsed, setSidebarCollapsed, onOpenDeveloper: () => setShowDeveloperModal(true) }} />

                    )}

                </div>



                {/* Upload Modal Overlay */}

                {showUpload && (

                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">

                        <div className="bg-white  rounded-2xl border border-border-subtle max-w-4xl w-full shadow-2xl relative overflow-hidden">

                            <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">

                                <div className="flex items-center gap-2.5">

                                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">

                                        <Upload01Icon size={16} className="text-[#0071E3]" />

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

                                    <Cancel01Icon size={18} />

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




                {/* Mobile Floating Bottom Navigation Dock (Collapsible, never overlays notes detail) */}
                {!mobileMenuOpen && !(location.pathname.startsWith('/notes/') && location.pathname !== '/notes') && (
                    <div className="fixed bottom-3 inset-x-0 z-30 md:hidden flex justify-center pointer-events-none px-3">
                        {isDockMinimized ? (
                            <button
                                type="button"
                                onClick={() => setIsDockMinimized(false)}
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full px-3.5 py-1.5 shadow-lg flex items-center gap-1.5 text-xs font-semibold text-[#1D1D1F] dark:text-white cursor-pointer active:scale-95 transition-all shadow-black/10"
                                title="Expand navigation"
                            >
                                <Menu01Icon size={16} className="text-[#0071E3]" />
                                <span>Menu</span>
                            </button>
                        ) : (
                            <nav
                                aria-label="Mobile Navigation"
                                className="pointer-events-auto bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-md border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-full p-1 shadow-lg shadow-black/8 w-auto max-w-[330px] mx-auto flex items-center justify-between gap-0.5"
                            >
                                <DiscreteTabs
                                    tabs={discreteTabItems}
                                    activeTab={activeDockTab}
                                    onTabChange={(path) => {
                                        navigate(path);
                                        setIsDockMinimized(true);
                                    }}
                                    className="h-9 py-0 px-0.5 flex-1 justify-between gap-0.5"
                                    itemClassName="h-8 px-1.5"
                                />
                                <button
                                    type="button"
                                    onClick={() => setIsDockMinimized(true)}
                                    className="w-6 h-6 rounded-full text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center shrink-0 ml-0.5 mr-0.5 cursor-pointer transition-colors"
                                    title="Minimize navigation bar"
                                >
                                    <Cancel01Icon size={13} />
                                </button>
                            </nav>
                        )}
                    </div>
                )}

                {/* Meet Developer Modal */}
                {showDeveloperModal && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                        onClick={() => setShowDeveloperModal(false)}
                    >
                        <div
                            className="relative flex flex-col items-center justify-center p-6 sm:p-8 max-w-lg w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => setShowDeveloperModal(false)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 dark:bg-[#1C1C1E]/80 border border-black/10 dark:border-white/10 flex items-center justify-center text-[#727272] hover:text-black dark:hover:text-white transition-colors cursor-pointer z-30 shadow-sm"
                                aria-label="Close"
                            >
                                <Cancel01Icon size={16} />
                            </button>

                            <IconFolder
                                theme="dark"
                                title="Meet Developer"
                                tags={["Adarsh Patil", "Full-Stack", "Spring Boot", "React"]}
                                icons={DEVELOPER_ICONS}
                                defaultOpen={true}
                                spread={75}
                                showPill={true}
                            />

                            <div className="mt-5 flex items-center gap-3 z-10">
                                <a
                                    href="https://github.com/199adarsh"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 rounded-full text-xs font-semibold bg-white/95 dark:bg-[#1C1C1E]/95 hover:bg-white text-[#1D1D1F] dark:text-white border border-[#E5E5EA] dark:border-[#2C2C2E] shadow-sm transition-all"
                                >
                                    GitHub Profile
                                </a>
                            </div>
                        </div>
                    </div>
                )}

            </main>

        </div>

    );

};



export default SovereignLayout;

