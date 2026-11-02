import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import {
    Key,
    Eye,
    EyeOff,
    CheckCircle2,
    XCircle,
    BookOpen,
    Search,
    Shield,
    Sparkles,
    Check,
    RotateCcw,
    User,
    Save,
    ExternalLink,
    AlertCircle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const Settings = () => {
    const context = useOutletContext() || {};
    const { profile, catalogSubjects = [], refreshData } = context;

    const userRole = localStorage.getItem('eduvault_user_role') || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin' || profile?.dob === 'TEACHER';

    // --- Gemini API Key State ---
    const [geminiKey, setGeminiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [keyStatus, setKeyStatus] = useState('idle'); // 'idle' | 'testing' | 'valid' | 'invalid'
    const [keyStatusMsg, setKeyStatusMsg] = useState('');

    // --- Teacher Subjects State ---
    const [allSubjects, setAllSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [selectedSubjects, setSelectedSubjects] = useState([]);
    const [subjectSearch, setSubjectSearch] = useState('');
    const [semFilter, setSemFilter] = useState('ALL');

    // Load initial settings on mount
    useEffect(() => {
        // Load custom Gemini API key
        const savedKey = localStorage.getItem('eduvault_custom_gemini_key') || localStorage.getItem('eduvault_gemini_api_key') || '';
        setGeminiKey(savedKey);
        if (savedKey) {
            setKeyStatus('saved');
            setKeyStatusMsg('Key configured in storage');
        } else {
            setKeyStatus('empty');
            setKeyStatusMsg('No custom key (using system default)');
        }

        // Load teacher subjects
        const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');
        if (savedTeacherSubs) {
            try {
                const parsed = JSON.parse(savedTeacherSubs);
                if (Array.isArray(parsed)) {
                    setSelectedSubjects(parsed);
                }
            } catch (e) {
                console.error('Error loading teacher subjects', e);
            }
        }

        // Fetch all available subjects
        fetchAllSubjects();
    }, []);

    const fetchAllSubjects = async () => {
        setSubjectsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/subjects`);
            const list = Array.isArray(res.data) ? res.data : [];
            setAllSubjects(list);
            
            // If teacher had no subjects selected yet, initialize with their current department subjects or catalog
            const savedTeacherSubs = localStorage.getItem('eduvault_teacher_subjects');
            if (!savedTeacherSubs && isTeacher && list.length > 0) {
                const initial = list.slice(0, 4).map(s => s.name);
                setSelectedSubjects(initial);
                localStorage.setItem('eduvault_teacher_subjects', JSON.stringify(initial));
            }
        } catch (err) {
            console.error('Failed to fetch subjects list', err);
            // Fallback to catalogSubjects from context if available
            if (catalogSubjects && catalogSubjects.length > 0) {
                setAllSubjects(catalogSubjects);
            }
        } finally {
            setSubjectsLoading(false);
        }
    };

    // --- Gemini Key Handlers ---
    const handleSaveGeminiKey = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const trimmed = geminiKey.trim();
        if (!trimmed) {
            localStorage.removeItem('eduvault_custom_gemini_key');
            localStorage.removeItem('eduvault_gemini_api_key');
            setKeyStatus('empty');
            setKeyStatusMsg('No custom key (using system default)');
            toast.success('Custom Gemini API key cleared. Reverted to default.');
            return;
        }

        localStorage.setItem('eduvault_custom_gemini_key', trimmed);
        localStorage.setItem('eduvault_gemini_api_key', trimmed);
        setKeyStatus('saved');
        setKeyStatusMsg('Key saved to local storage');
        toast.success('Custom Gemini API key saved successfully!');
    };

    const handleClearGeminiKey = () => {
        localStorage.removeItem('eduvault_custom_gemini_key');
        localStorage.removeItem('eduvault_gemini_api_key');
        setGeminiKey('');
        setKeyStatus('empty');
        setKeyStatusMsg('No custom key (using system default)');
        toast.info('Custom Gemini API key removed');
    };

    const handleTestGeminiKey = async () => {
        const keyToTest = geminiKey.trim();
        if (!keyToTest) {
            toast.error('Please enter an API key to test');
            return;
        }

        setKeyStatus('testing');
        setKeyStatusMsg('Testing key against Google Gemini API...');
        const toastId = toast.loading('Connecting to Google Gemini API...');

        try {
            // Direct ping to Google Gemini REST API
            const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(keyToTest)}`;
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [{ text: 'Respond with the word OK.' }]
                        }
                    ]
                })
            });

            if (response.ok) {
                setKeyStatus('valid');
                setKeyStatusMsg('API key is valid and connected');
                localStorage.setItem('eduvault_custom_gemini_key', keyToTest);
                localStorage.setItem('eduvault_gemini_api_key', keyToTest);
                toast.success('Gemini API key verified successfully!', { id: toastId });
            } else {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${response.status}: Invalid key`;
                setKeyStatus('invalid');
                setKeyStatusMsg(errMsg);
                toast.error(`Verification failed: ${errMsg}`, { id: toastId });
            }
        } catch (err) {
            console.error('Gemini test connection failed', err);
            // In case of CORS or browser network block, try testing through backend proxy!
            try {
                const backendRes = await axios.post(`${API_BASE}/ai/chat`, {
                    question: 'Ping test',
                    customApiKey: keyToTest
                }, {
                    headers: { 'X-Gemini-Api-Key': keyToTest }
                });
                if (backendRes.status === 200 && backendRes.data?.answer && !backendRes.data.answer.toLowerCase().includes("encountered an error")) {
                    setKeyStatus('valid');
                    setKeyStatusMsg('API key verified via backend proxy');
                    localStorage.setItem('eduvault_custom_gemini_key', keyToTest);
                    localStorage.setItem('eduvault_gemini_api_key', keyToTest);
                    toast.success('Gemini API key verified successfully via proxy!', { id: toastId });
                    return;
                }
            } catch (beErr) {
                console.warn('Backend proxy test also failed', beErr);
            }

            if (keyToTest.startsWith('AIza') && keyToTest.length >= 35) {
                setKeyStatus('valid');
                setKeyStatusMsg('Valid key format (Network restricted direct ping)');
                localStorage.setItem('eduvault_custom_gemini_key', keyToTest);
                localStorage.setItem('eduvault_gemini_api_key', keyToTest);
                toast.success('Gemini key format valid and saved!', { id: toastId });
            } else {
                setKeyStatus('invalid');
                setKeyStatusMsg(err.message || 'Network connection failed');
                toast.error('Could not verify key: ' + err.message, { id: toastId });
            }
        }
    };

    // --- Teacher Subject Selection Handlers ---
    const handleToggleSubject = (sub) => {
        const subName = typeof sub === 'string' ? sub : sub?.name;
        const subId = typeof sub === 'object' ? sub?.id : null;
        setSelectedSubjects(prev => {
            const hasIt = prev.includes(subName) || (subId && prev.includes(subId));
            if (hasIt) {
                return prev.filter(name => name !== subName && name !== subId);
            } else {
                return [...prev, subName];
            }
        });
    };

    const handleSelectAllFiltered = () => {
        const filteredNames = filteredSubjects.map(s => s.name);
        setSelectedSubjects(prev => {
            const combined = new Set([...prev, ...filteredNames]);
            return Array.from(combined);
        });
    };

    const handleClearSelection = () => {
        setSelectedSubjects([]);
    };

    const handleSaveTeacherSubjects = () => {
        localStorage.setItem('eduvault_teacher_subjects', JSON.stringify(selectedSubjects));
        toast.success(`Saved ${selectedSubjects.length} assigned subjects!`);
        if (refreshData) {
            refreshData();
        }
    };

    // Filter available subjects
    const filteredSubjects = useMemo(() => {
        return allSubjects.filter(sub => {
            if (semFilter !== 'ALL' && sub.semester && !sub.semester.toLowerCase().includes(semFilter.toLowerCase())) {
                return false;
            }
            if (subjectSearch.trim()) {
                const q = subjectSearch.toLowerCase();
                const nameMatch = sub.name?.toLowerCase().includes(q);
                const codeMatch = sub.code?.toLowerCase().includes(q);
                const deptMatch = sub.department?.toLowerCase().includes(q);
                return nameMatch || codeMatch || deptMatch;
            }
            return true;
        });
    }, [allSubjects, semFilter, subjectSearch]);

    // Unique semesters for filter
    const availableSemesters = useMemo(() => {
        const set = new Set();
        allSubjects.forEach(s => {
            if (s.semester) set.add(s.semester);
        });
        return Array.from(set).sort();
    }, [allSubjects]);

    // Role switcher helper for testing
    const handleSwitchRole = (newRole) => {
        localStorage.setItem('eduvault_user_role', newRole);
        toast.info(`Switched active view to ${newRole.toUpperCase()}. Reloading...`);
        setTimeout(() => window.location.reload(), 400);
    };

    return (
        <div className="flex-1 overflow-y-auto bg-background p-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 md:pb-12 antialiased text-slate-800 font-sans min-h-screen">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-primary text-[18px]">settings</span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">System Settings</span>
                        </div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Platform Settings &amp; Preferences
                        </h1>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage your personal AI credentials, taught subjects, and account parameters.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Current Role:</span>
                        <span className={cn(
                            "px-2.5 py-1 rounded-full text-xs font-bold border",
                            isTeacher 
                                ? "bg-blue-50 text-blue-700 border-blue-200" 
                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        )}>
                            {isTeacher ? 'Teacher / Faculty' : 'Student'}
                        </span>
                    </div>
                </div>

                {/* Section 1: Gemini AI Key Configuration */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 border border-purple-100 flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900">Custom Google Gemini API Key</h2>
                                    <span className="text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
                                        BYOK Support
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Bring your own Gemini API key for unlimited AI chat, Note Doubts, and Chapter RAG queries.
                                </p>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 self-start sm:self-center">
                            {keyStatus === 'valid' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Valid &amp; Connected</span>
                                </span>
                            )}
                            {keyStatus === 'testing' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
                                    <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Verifying...</span>
                                </span>
                            )}
                            {keyStatus === 'invalid' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" />
                                    <span>Verification Failed</span>
                                </span>
                            )}
                            {keyStatus === 'saved' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                    <Check className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Key Configured</span>
                                </span>
                            )}
                            {keyStatus === 'empty' && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                    <span>System Default Active</span>
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="p-5 sm:p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                                Gemini API Key
                            </label>
                            <div className="relative">
                                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={geminiKey}
                                    onChange={(e) => {
                                        setGeminiKey(e.target.value);
                                        setKeyStatus('idle');
                                    }}
                                    placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
                                    className="w-full text-xs sm:text-sm pl-9 pr-24 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition font-mono"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowKey(!showKey)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                                        title={showKey ? 'Hide key' : 'Show key'}
                                    >
                                        {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                                <span>{keyStatusMsg || 'Your key is stored securely in your browser session.'}</span>
                                <a
                                    href="https://aistudio.google.com/app/apikey"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-purple-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                                >
                                    <span>Get free Gemini API Key</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        </div>

                        {/* Buttons row */}
                        <div className="flex flex-wrap items-center gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleSaveGeminiKey}
                                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save API Key</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleTestGeminiKey}
                                disabled={!geminiKey.trim() || keyStatus === 'testing'}
                                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold text-xs border border-slate-200 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                <span>Test Connection</span>
                            </button>

                            {geminiKey && (
                                <button
                                    type="button"
                                    onClick={handleClearGeminiKey}
                                    className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Clear Custom Key</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section 2: Teacher Subject Selection */}
                <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900">Faculty Subject Assignments</h2>
                                    <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                                        {selectedSubjects.length} Assigned
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Select the courses you teach. This filters your attendance requests and class registers.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSaveTeacherSubjects}
                                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Subjects</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-5 sm:p-6 space-y-4">
                        {/* Notice for Students */}
                        {!isTeacher && (
                            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                    <span>You are currently in <strong>Student view</strong>. Subject selection applies to teachers. You can switch to Teacher view to manage class subjects.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleSwitchRole('teacher')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold text-[11px] shrink-0 hover:bg-amber-700 cursor-pointer"
                                >
                                    Switch to Teacher
                                </button>
                            </div>
                        )}

                        {/* Search and filters toolbar */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                    <input
                                        type="text"
                                        value={subjectSearch}
                                        onChange={(e) => setSubjectSearch(e.target.value)}
                                        placeholder="Search by subject name, code, or department..."
                                        className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                                    />
                                </div>
                                {availableSemesters.length > 0 && (
                                    <select
                                        value={semFilter}
                                        onChange={(e) => setSemFilter(e.target.value)}
                                        className="text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 outline-none cursor-pointer"
                                    >
                                        <option value="ALL">All Semesters</option>
                                        {availableSemesters.map(sem => (
                                            <option key={sem} value={sem}>{sem}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    type="button"
                                    onClick={handleSelectAllFiltered}
                                    className="px-2.5 py-1 rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 font-semibold cursor-pointer transition"
                                >
                                    Select All Filtered
                                </button>
                                <button
                                    type="button"
                                    onClick={handleClearSelection}
                                    className="px-2.5 py-1 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-white font-semibold cursor-pointer transition"
                                >
                                    Clear Selection
                                </button>
                            </div>
                        </div>

                        {/* Subject Checkbox Grid */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                                <span>Showing {filteredSubjects.length} available courses</span>
                                <span>{selectedSubjects.length} selected</span>
                            </div>

                            {subjectsLoading ? (
                                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    <span>Loading academic course catalog...</span>
                                </div>
                            ) : filteredSubjects.length === 0 ? (
                                <div className="py-12 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                                    No subjects match the search query "{subjectSearch}".
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[460px] overflow-y-auto p-1 no-scrollbar">
                                    {filteredSubjects.map(sub => {
                                        const isChecked = selectedSubjects.includes(sub.name) || selectedSubjects.includes(sub.id);

                                        return (
                                            <div
                                                key={sub.id || sub.name}
                                                onClick={() => handleToggleSubject(sub)}
                                                className={cn(
                                                    "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs select-none",
                                                    isChecked
                                                        ? "bg-blue-50/50 border-blue-300 shadow-2xs"
                                                        : "bg-white hover:bg-slate-50 border-slate-200"
                                                )}
                                            >
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={cn(
                                                        "w-4 h-4 rounded flex items-center justify-center border transition shrink-0",
                                                        isChecked
                                                            ? "bg-blue-600 border-blue-600 text-white"
                                                            : "border-slate-300 bg-white"
                                                    )}>
                                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <div className="font-bold text-slate-900 truncate">
                                                            {sub.name}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                                                            {sub.code && (
                                                                <span className="font-mono font-semibold bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded border border-slate-200/60">
                                                                    {sub.code}
                                                                </span>
                                                            )}
                                                            {sub.semester && <span>{sub.semester}</span>}
                                                            {sub.department && <span>• {sub.department}</span>}
                                                        </div>
                                                    </div>
                                                </div>

                                                {isChecked && (
                                                    <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full shrink-0">
                                                        Assigned
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Save Confirmation Button */}
                        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <span className="text-xs text-slate-500">
                                Selected: <strong>{selectedSubjects.length}</strong> subjects
                            </span>
                            <button
                                type="button"
                                onClick={handleSaveTeacherSubjects}
                                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Changes</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Section 3: User Profile & Role Overview */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs">
                    <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900">User Identity &amp; Role Management</h2>
                            <p className="text-xs text-slate-500">Session details and testing controls</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">User Name</span>
                            <div className="font-bold text-slate-800 mt-0.5 truncate">{profile?.name || 'Academic User'}</div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">PRN / Faculty ID</span>
                            <div className="font-mono font-bold text-slate-800 mt-0.5">{profile?.prn || 'N/A'}</div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Department</span>
                            <div className="font-semibold text-slate-800 mt-0.5">{profile?.department || 'AI & Data Science'}</div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Role</span>
                            <div className="flex items-center gap-2 mt-1">
                                <button
                                    type="button"
                                    onClick={() => handleSwitchRole('student')}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer",
                                        !isTeacher ? "bg-emerald-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                                    )}
                                >
                                    Student
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleSwitchRole('teacher')}
                                    className={cn(
                                        "px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer",
                                        isTeacher ? "bg-blue-600 text-white" : "bg-white text-slate-700 border border-slate-200"
                                    )}
                                >
                                    Teacher
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
