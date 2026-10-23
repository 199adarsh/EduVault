import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    X,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    BookOpen,
    Layers,
    FileText,
    ChevronDown,
    ChevronUp,
    Lock,
    User,
    Sparkles,
    Check
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const LmsSyncModal = ({ isOpen, onClose, onSyncComplete }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [syncMode, setSyncMode] = useState('all'); // 'test' | 'all'
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [progress, setProgress] = useState(null);
    const [showUnmatched, setShowUnmatched] = useState(false);
    const [discoveredCourses, setDiscoveredCourses] = useState(null);
    const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'preview'

    const pollingRef = useRef(null);
    const logContainerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
        };
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [progress?.logs]);

    if (!isOpen) return null;

    const handleDiscover = async () => {
        if (!username || !password) {
            toast.error('Please enter both LMS username and password.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Connecting to LMS & discovering courses...');
        const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
        try {
            const res = await axios.post(`${API_BASE}/lms/discover`, {
                username: username.trim(),
                password: password.trim()
            }, {
                headers: { 'X-User-Role': userRole }
            });
            setDiscoveredCourses(res.data);
            setActiveTab('preview');
            toast.success(`Discovered ${res.data.length} accessible courses!`, { id: toastId });
        } catch (err) {
            console.error('LMS Discovery failed:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to connect to LMS portal.';
            toast.error(msg, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!username || !password) {
            toast.error('Please enter both LMS username and password.');
            return;
        }

        setIsLoading(true);
        setSyncResult(null);
        setProgress({
            status: 'AUTHENTICATING',
            currentStage: 'Connecting to DKTE Moodle portal...',
            percent: 5,
            materialsFound: 0,
            importedCount: 0,
            skippedCount: 0,
            logs: ['[' + new Date().toLocaleTimeString() + '] Ingestion pipeline started for ' + username.trim()]
        });

        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const progRes = await axios.get(`${API_BASE}/lms/progress?username=${encodeURIComponent(username.trim())}`);
                if (progRes.data) {
                    setProgress(progRes.data);
                }
            } catch (ignored) { }
        }, 350);

        try {
            const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
            const payload = {
                username: username.trim(),
                password: password.trim(),
                testImport: syncMode === 'test'
            };

            const res = await axios.post(`${API_BASE}/lms/sync`, payload, {
                headers: { 'X-User-Role': userRole }
            });
            setSyncResult(res.data);
            toast.success(
                `Sync Completed! Imported ${res.data.importedCount} materials (${res.data.skippedDuplicatesCount} skipped duplicates).`
            );
            if (onSyncComplete) {
                onSyncComplete();
            }
        } catch (err) {
            console.error('LMS Sync failed:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to synchronize with LMS.';
            toast.error(msg);
        } finally {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsLoading(false);
        }
    };

    const resetState = () => {
        setSyncResult(null);
        setDiscoveredCourses(null);
        setActiveTab('sync');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-zinc-100">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800/80 bg-zinc-900/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold tracking-tight text-white uppercase">LMS Notes Synchronizer</h2>
                                <span className="text-[9px] font-black tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full uppercase">Moodle 4.x</span>
                            </div>
                            <p className="text-xs text-zinc-400">Automated ingestion from DKTE Society's Academic Portal</p>
                        </div>
                    </div>
                    <button
                        onClick={resetState}
                        disabled={isLoading}
                        className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-zinc-800/80 px-6 bg-zinc-900/20">
                    <button
                        onClick={() => setActiveTab('sync')}
                        className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all ${activeTab === 'sync'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        Sync Engine
                    </button>
                    <button
                        onClick={() => {
                            if (!discoveredCourses) handleDiscover();
                            else setActiveTab('preview');
                        }}
                        className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === 'preview'
                                ? 'border-blue-500 text-blue-400'
                                : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <span>Course Discovery</span>
                        {discoveredCourses && (
                            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.2 rounded-full">
                                {discoveredCourses.length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeTab === 'sync' && (
                        <>
                            {/* Credentials Form */}
                            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-xl p-5 space-y-4">
                                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                                    <Lock className="w-3.5 h-3.5 text-blue-400" /> Authorized LMS Credentials
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">LMS Username / PRN</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="text"
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                disabled={isLoading}
                                                placeholder="e.g. 24uad022"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">LMS Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                                            <input
                                                type="password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                disabled={isLoading}
                                                placeholder="Enter password"
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg py-2 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Sync Mode Selection */}
                                <div className="pt-3 border-t border-zinc-800/50">
                                    <label className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-2">Scope of Synchronization</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div
                                            onClick={() => !isLoading && setSyncMode('all')}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${syncMode === 'all'
                                                    ? 'border-blue-500/60 bg-blue-500/10 text-white'
                                                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider">Sync All Courses</span>
                                                {syncMode === 'all' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-tight">
                                                Scrape all accessible courses matching existing Campusaxis subjects.
                                            </p>
                                        </div>

                                        <div
                                            onClick={() => !isLoading && setSyncMode('test')}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${syncMode === 'test'
                                                    ? 'border-blue-500/60 bg-blue-500/10 text-white'
                                                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                                                }`}
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs font-bold uppercase tracking-wider">Test Sync (1 Course)</span>
                                                {syncMode === 'test' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                                            </div>
                                            <p className="text-[11px] text-zinc-500 leading-tight">
                                                Verify pipeline on 1 course (Machine Learning) before syncing all.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Ingestion HUD */}
                            {isLoading && (
                                <div className="bg-zinc-900/60 border border-blue-500/30 rounded-xl p-5 space-y-4 animate-in fade-in duration-300 shadow-xl shadow-blue-950/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">
                                                {progress?.status || 'INGESTING LMS NOTES'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono font-bold text-blue-400">
                                            {progress?.percent || 5}%
                                        </span>
                                    </div>

                                    {/* Animated Progress Bar */}
                                    <div className="w-full bg-zinc-950 rounded-full h-2.5 overflow-hidden border border-zinc-800">
                                        <div
                                            className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${Math.max(5, progress?.percent || 5)}%` }}
                                        />
                                    </div>

                                    {/* Active Course & Action */}
                                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 text-xs space-y-1.5">
                                        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                                            <span className="font-semibold text-zinc-300">Active Stage:</span>
                                            <span className="font-mono text-blue-400">
                                                {progress?.currentCourseIndex && progress?.totalCourses
                                                    ? `Course ${progress.currentCourseIndex} of ${progress.totalCourses}`
                                                    : 'Initializing'}
                                            </span>
                                        </div>
                                        <p className="text-white font-medium text-xs truncate">
                                            {progress?.currentStage || 'Uploding LMS materials...'}
                                        </p>
                                        {progress?.currentMaterial && (
                                            <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400 truncate border-t border-zinc-800/50">
                                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="truncate text-zinc-300 font-mono">{progress.currentMaterial}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Counters HUD */}
                                    <div className="grid grid-cols-3 gap-2.5 pt-1">
                                        <div className="bg-zinc-950 border border-zinc-800/60 rounded-lg p-2.5 text-center">
                                            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Materials Found</span>
                                            <span className="text-sm font-bold text-white">{progress?.materialsFound || 0}</span>
                                        </div>
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-2.5 text-center">
                                            <span className="text-[10px] uppercase font-bold text-emerald-400 block">Uploaded to B2</span>
                                            <span className="text-sm font-bold text-emerald-400">{progress?.importedCount || 0}</span>
                                        </div>
                                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-2.5 text-center">
                                            <span className="text-[10px] uppercase font-bold text-amber-400 block">Duplicates Skipped</span>
                                            <span className="text-sm font-bold text-amber-400">{progress?.skippedCount || 0}</span>
                                        </div>
                                    </div>

                                    {/* Live Terminal Feed */}
                                    {progress?.logs && progress.logs.length > 0 && (
                                        <div className="space-y-1 pt-1">
                                            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                                <span>Live Activity Feed</span>
                                                <span className="font-mono text-[9px] text-zinc-600">tail -f ingestion.log</span>
                                            </div>
                                            <div
                                                ref={logContainerRef}
                                                className="bg-black/90 border border-zinc-800 rounded-lg p-3 font-mono text-[11px] text-zinc-300 max-h-36 overflow-y-auto space-y-1"
                                            >
                                                {progress.logs.map((log, idx) => (
                                                    <div key={idx} className="leading-tight flex items-start gap-1.5">
                                                        <span className="text-blue-500 font-bold select-none">&gt;</span>
                                                        <span className={log.includes('Saved to B2') || log.includes('Complete') ? 'text-emerald-400 font-semibold' : log.includes('duplicate') ? 'text-amber-400' : 'text-zinc-300'}>
                                                            {log}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Results Display */}
                            {syncResult && (
                                <div className="space-y-4 animate-in fade-in duration-300">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Synchronization Telemetry
                                        </h3>
                                        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Live Session Data</span>
                                    </div>

                                    {/* Metrics Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl">
                                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Discovered</p>
                                            <p className="text-xl font-bold text-white mt-1">{syncResult.totalDiscoveredCourses}</p>
                                            <p className="text-[9px] text-zinc-500 mt-0.5">Total Portal Courses</p>
                                        </div>
                                        <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Matched</p>
                                            <p className="text-xl font-bold text-blue-400 mt-1">{syncResult.matchedCoursesCount}</p>
                                            <p className="text-[9px] text-blue-500/70 mt-0.5">Campusaxis Subjects</p>
                                        </div>
                                        <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Imported</p>
                                            <p className="text-xl font-bold text-emerald-400 mt-1">{syncResult.importedCount}</p>
                                            <p className="text-[9px] text-emerald-500/70 mt-0.5">New Materials Saved</p>
                                        </div>
                                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl">
                                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Duplicates Skipped</p>
                                            <p className="text-xl font-bold text-amber-400 mt-1">{syncResult.skippedDuplicatesCount}</p>
                                            <p className="text-[9px] text-amber-500/70 mt-0.5">Idempotent Guards</p>
                                        </div>
                                    </div>

                                    {/* Course Breakdown */}
                                    <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/40 overflow-hidden">
                                        <div className="px-4 py-2.5 bg-zinc-900/40 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                                            <span>Processed Courses</span>
                                            <span>Status</span>
                                        </div>
                                        {syncResult.courses?.filter(c => c.matched).map((c, i) => (
                                            <div key={i} className="px-4 py-3 flex items-center justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-white">{c.subjectName || c.courseName}</span>
                                                        <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.2 rounded">
                                                            {c.courseCode}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-zinc-400 mt-0.5">
                                                        Found: {c.materialsFound} &bull; Imported: <span className="text-emerald-400 font-bold">{c.importedCount}</span> &bull; Skipped: {c.skippedCount}
                                                    </p>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${c.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                    }`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Unmatched Courses Section */}
                                    {syncResult.unmatchedCourses?.length > 0 && (
                                        <div className="border border-zinc-800/60 rounded-xl overflow-hidden">
                                            <button
                                                onClick={() => setShowUnmatched(!showUnmatched)}
                                                className="w-full px-4 py-2.5 bg-zinc-900/40 flex items-center justify-between text-[11px] font-bold text-zinc-400 uppercase tracking-wider hover:bg-zinc-900/60 transition-colors"
                                            >
                                                <span>Unmatched Courses ({syncResult.unmatchedCourses.length})</span>
                                                {showUnmatched ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            {showUnmatched && (
                                                <div className="p-3 bg-zinc-950 max-h-40 overflow-y-auto space-y-1 text-xs text-zinc-500 font-mono divide-y divide-zinc-900">
                                                    {syncResult.unmatchedCourses.map((uc, i) => (
                                                        <p key={i} className="py-1 text-[11px] text-zinc-400">{uc}</p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {/* Preview / Discovery Tab */}
                    {activeTab === 'preview' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                    Discovered Portal Courses ({discoveredCourses?.length || 0})
                                </h3>
                                <button
                                    onClick={handleDiscover}
                                    disabled={isLoading}
                                    className="text-[10px] font-bold text-blue-400 hover:text-blue-300 uppercase tracking-widest flex items-center gap-1"
                                >
                                    <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                                </button>
                            </div>

                            <div className="bg-zinc-900/20 border border-zinc-800/60 rounded-xl divide-y divide-zinc-800/40 max-h-[380px] overflow-y-auto">
                                {discoveredCourses?.map((c, i) => (
                                    <div key={i} className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/30 transition-colors">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-zinc-200">{c.fullname}</span>
                                                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.2 rounded">
                                                    {c.code}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-zinc-500">
                                                ID: {c.id} &bull; Shortname: {c.shortname}
                                            </p>
                                        </div>
                                        <div>
                                            {c.matched ? (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">
                                                    Matches: {c.matchedSubjectName}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-800/80 text-zinc-500 whitespace-nowrap">
                                                    Other Curriculum
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/40">
                    <button
                        onClick={resetState}
                        disabled={isLoading}
                        className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-colors"
                    >
                        Close
                    </button>

                    <div className="flex items-center gap-3">
                        {activeTab === 'sync' ? (
                            <button
                                onClick={handleSync}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 h-9 px-5 gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                                <span>{isLoading ? 'Synchronizing...' : syncMode === 'test' ? 'Execute Test Sync' : 'Sync All Courses'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setActiveTab('sync')}
                                className="inline-flex items-center justify-center rounded-xl text-xs font-bold transition-all bg-blue-600 text-white hover:bg-blue-500 h-9 px-5 gap-2"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Proceed to Sync</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LmsSyncModal;
