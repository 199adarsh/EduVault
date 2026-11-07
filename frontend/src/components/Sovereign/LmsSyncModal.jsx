import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
    X,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    FileText,
    ChevronDown,
    ChevronUp,
    Lock,
    User,
    Check,
    Minus,
    Maximize2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FluidTabs } from '../fluid-tabs';
import { DropdownDisclosure } from '../dropdown-disclosure';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const LmsSyncModal = ({ isOpen, onClose, onSyncComplete, availableSubjects = [] }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [syncMode, setSyncMode] = useState('all'); // 'all' | 'single' | 'test'
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjectList, setSubjectList] = useState(availableSubjects);
    const [isLoading, setIsLoading] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [progress, setProgress] = useState(null);
    const [showUnmatched, setShowUnmatched] = useState(false);
    const [discoveredCourses, setDiscoveredCourses] = useState(null);
    const [activeTab, setActiveTab] = useState('sync'); // 'sync' | 'preview'
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSubjectDropdownOpen, setIsSubjectDropdownOpen] = useState(false);

    const subjectDropdownItems = React.useMemo(() => [
        { id: '', name: '-- Choose Subject to Scrape --' },
        ...(subjectList || []).map(s => ({
            id: s.code || s.id || s.name,
            name: s.code ? `${s.name} (${s.code})` : s.name,
            description: s.code ? `Course Code: ${s.code}` : undefined
        }))
    ], [subjectList]);

    const pollingRef = useRef(null);
    const logContainerRef = useRef(null);

    useEffect(() => {
        if (availableSubjects && availableSubjects.length > 0) {
            setSubjectList(availableSubjects);
        } else {
            axios.get(`${API_BASE}/subjects`).then(res => {
                if (Array.isArray(res.data) && res.data.length > 0) {
                    setSubjectList(res.data);
                }
            }).catch(() => {});
        }
    }, [availableSubjects]);

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

    // If modal is opened fresh, reset minimize state
    useEffect(() => {
        if (isOpen && !isLoading && !syncResult) {
            setIsMinimized(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDiscover = async () => {
        if (!username || !password) {
            toast.error('Please enter both Moodle username and password.');
            return;
        }

        setIsLoading(true);
        const toastId = toast.loading('Connecting to Moodle portal & discovering courses...');
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
            toast.success(`Discovered ${res.data.length} accessible courses`, { id: toastId });
        } catch (err) {
            console.error('Moodle Discovery failed:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to connect to Moodle portal.';
            toast.error(msg, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSync = async () => {
        if (!username || !password) {
            toast.error('Please enter both Moodle username and password.');
            return;
        }

        if (syncMode === 'single' && !selectedSubject) {
            toast.error('Please select a subject to scrape.');
            return;
        }

        setIsLoading(true);
        setSyncResult(null);
        setProgress({
            status: 'AUTHENTICATING',
            currentStage: 'Connecting to Moodle portal...',
            percent: 5,
            materialsFound: 0,
            importedCount: 0,
            skippedCount: 0,
            logs: [`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] Connecting to portal as ${username.trim()}`]
        });

        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const progRes = await axios.get(`${API_BASE}/lms/progress?username=${encodeURIComponent(username.trim())}`);
                if (progRes.data) {
                    setProgress(progRes.data);
                }
            } catch (ignored) { }
        }, 400);

        try {
            const userRole = localStorage.getItem('eduvault_user_role') || 'teacher';
            const payload = {
                username: username.trim(),
                password: password.trim(),
                testImport: syncMode === 'test',
                courseIds: syncMode === 'single' && selectedSubject ? [selectedSubject] : undefined
            };

            const res = await axios.post(`${API_BASE}/lms/sync`, payload, {
                headers: { 'X-User-Role': userRole }
            });
            setSyncResult(res.data);
            toast.success(
                `Sync complete: ${res.data.importedCount} new notes imported (${res.data.skippedDuplicatesCount} duplicates skipped).`
            );
            if (onSyncComplete) {
                onSyncComplete();
            }
        } catch (err) {
            console.error('Moodle Sync failed:', err);
            const msg = err.response?.data?.error || err.message || 'Failed to synchronize with Moodle.';
            toast.error(msg);
        } finally {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsLoading(false);
        }
    };

    const resetState = () => {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsLoading(false);
        setSyncResult(null);
        setDiscoveredCourses(null);
        setActiveTab('sync');
        setIsMinimized(false);
        onClose();
    };

    // Minimized Floating Widget
    if (isMinimized) {
        return (
            <div
                className="fixed bottom-6 right-6 z-[120] bg-white border border-[#E5E5EA] rounded-2xl shadow-xl p-3.5 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-200 text-xs text-[#1D1D1F] max-w-sm"
                role="region"
                aria-label="Background Moodle Sync"
            >
                <div className="w-8 h-8 rounded-full bg-[#0071E3]/8 text-[#0071E3] flex items-center justify-center shrink-0">
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1D1D1F] truncate">
                            {isLoading ? 'Syncing Moodle...' : syncResult ? 'Sync Completed' : 'Moodle Sync'}
                        </span>
                        {isLoading && (
                            <span className="font-mono text-[10px] text-[#0071E3] font-semibold tabular-nums">
                                {progress?.percent || 5}%
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-[#6E6E73] truncate mt-0.5">
                        {isLoading
                            ? (progress?.currentStage || 'Processing courses...')
                            : syncResult
                                ? `${syncResult.importedCount} materials imported`
                                : 'Ready to resume'}
                    </p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    <button
                        type="button"
                        onClick={() => setIsMinimized(false)}
                        className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                        title="Expand window"
                    >
                        <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                    {!isLoading && (
                        <button
                            type="button"
                            onClick={resetState}
                            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            title="Dismiss"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] bg-white border border-[#E5E5EA] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#1D1D1F] animate-in zoom-in-95 duration-150"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA] bg-[#FBFBFD]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#F5F5F7] border border-[#E5E5EA] flex items-center justify-center text-[#1D1D1F] shrink-0">
                            <RefreshCw className={cn("w-4 h-4 text-[#0071E3]", isLoading && "animate-spin")} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-semibold text-[#1D1D1F] tracking-tight">
                                    Sync Moodle Notes
                                </h2>
                                <span className="text-[10px] font-medium text-[#0071E3] bg-[#0071E3]/8 px-2 py-0.2 rounded-full border border-[#0071E3]/20">
                                    Portal Integration
                                </span>
                            </div>
                            <p className="text-xs text-[#6E6E73] mt-0.5">
                                Import syllabus modules, slides and question banks directly from institutional LMS
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => setIsMinimized(true)}
                            className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            title="Minimize to background"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={resetState}
                            disabled={isLoading}
                            className="p-1.5 rounded-lg text-[#8E8E93] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer disabled:opacity-40"
                            title="Close"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-[#E5E5EA] px-6 py-2.5 bg-white">
                    <FluidTabs
                        value={activeTab}
                        onChange={(tabId) => {
                            if (tabId === 'preview' && !discoveredCourses) {
                                handleDiscover();
                            } else {
                                setActiveTab(tabId);
                            }
                        }}
                        size="xs"
                        layoutId="lms-sync-fluid-tabs"
                        className="bg-[#F5F5F7] border-[#E5E5EA]"
                        activeClassName="font-semibold text-[#1D1D1F]"
                        inactiveClassName="font-medium text-[#6E6E73] hover:text-[#1D1D1F]"
                        indicatorClassName="absolute inset-0 rounded-full border border-[#E5E5EA] bg-white shadow-xs"
                        tabs={[
                            { id: 'sync', label: 'Sync Setup' },
                            {
                                id: 'preview',
                                label: 'Course Discovery',
                                badge: discoveredCourses ? discoveredCourses.length : undefined
                            }
                        ]}
                    />
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    {activeTab === 'sync' && (
                        <>
                            {/* Credentials & Scope Form (disappears when syncing or completed) */}
                            {!isLoading && !syncResult && (
                                <div className="bg-[#FBFBFD] border border-[#E5E5EA] rounded-xl p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                                            <Lock className="w-3.5 h-3.5 text-[#0071E3]" />
                                            <span>Authorized Moodle Credentials</span>
                                        </h3>
                                        <span className="text-[11px] text-[#8E8E93]">Encrypted session transit</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#6E6E73]">Username / PRN</label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
                                                <input
                                                    type="text"
                                                    value={username}
                                                    onChange={(e) => setUsername(e.target.value)}
                                                    disabled={isLoading}
                                                    placeholder="e.g. 24uad022"
                                                    className="w-full bg-white border border-[#E5E5EA] rounded-lg py-2 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#0071E3] transition"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-[#6E6E73]">Moodle Password</label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8E8E93]" />
                                                <input
                                                    type="password"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    disabled={isLoading}
                                                    placeholder="••••••••"
                                                    className="w-full bg-white border border-[#E5E5EA] rounded-lg py-2 pl-9 pr-3 text-xs text-[#1D1D1F] placeholder:text-[#8E8E93] focus:outline-none focus:border-[#0071E3] transition"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Scope of Synchronization */}
                                    <div className="pt-2 border-t border-[#E5E5EA]/70 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-medium text-[#6E6E73] block">
                                                Scope of Synchronization
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setSyncMode(syncMode === 'test' ? 'all' : 'test')}
                                                className="text-[11px] text-[#8E8E93] hover:text-[#0071E3] transition cursor-pointer"
                                            >
                                                {syncMode === 'test' ? '✓ Test Run Mode Active' : 'Switch to Test Run'}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div
                                                onClick={() => !isLoading && setSyncMode('all')}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition text-left",
                                                    syncMode === 'all'
                                                        ? "border-[#0071E3] bg-[#0071E3]/5 text-[#1D1D1F]"
                                                        : "border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#D2D2D7]"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-[#1D1D1F]">All Enrolled Courses</span>
                                                    {syncMode === 'all' && <Check className="w-3.5 h-3.5 text-[#0071E3]" />}
                                                </div>
                                                <p className="text-[11px] text-[#6E6E73] leading-snug">
                                                    Scans all semester subjects and downloads verified notes to EduVault.
                                                </p>
                                            </div>

                                            <div
                                                onClick={() => !isLoading && setSyncMode('single')}
                                                className={cn(
                                                    "p-3 rounded-lg border cursor-pointer transition text-left",
                                                    syncMode === 'single'
                                                        ? "border-[#0071E3] bg-[#0071E3]/5 text-[#1D1D1F]"
                                                        : "border-[#E5E5EA] bg-white text-[#6E6E73] hover:border-[#D2D2D7]"
                                                )}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-semibold text-[#1D1D1F]">Single Subject Scrape</span>
                                                    {syncMode === 'single' && <Check className="w-3.5 h-3.5 text-[#0071E3]" />}
                                                </div>
                                                <p className="text-[11px] text-[#6E6E73] leading-snug">
                                                    Scrapes and imports notes for one specific subject of your choice.
                                                </p>
                                            </div>
                                        </div>

                                        {syncMode === 'single' && (
                                            <div className="pt-2.5 space-y-1.5 animate-in fade-in duration-150">
                                                <label className="text-xs font-medium text-[#1D1D1F] flex items-center justify-between">
                                                    <span>Target Subject to Scrape</span>
                                                    <span className="text-[10px] text-[#0071E3] font-normal">Select subject</span>
                                                </label>
                                                <DropdownDisclosure
                                                    items={subjectDropdownItems}
                                                    selectedId={selectedSubject}
                                                    onChange={(item) => setSelectedSubject(item.id)}
                                                    isOpen={isSubjectDropdownOpen}
                                                    onOpenChange={setIsSubjectDropdownOpen}
                                                    title="Target Subject"
                                                    compact={false}
                                                    placement="bottom"
                                                    align="left"
                                                    className="w-full"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Live Ingestion Progress (Clean flattened layout) */}
                            {isLoading && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse" />
                                            <span className="text-xs font-semibold text-[#1D1D1F]">
                                                {progress?.status || 'Downloading Moodle Materials...'}
                                            </span>
                                        </div>
                                        <span className="text-xs font-mono font-semibold text-[#0071E3] tabular-nums">
                                            {progress?.percent || 5}%
                                        </span>
                                    </div>

                                    {/* Minimal Progress Bar */}
                                    <div className="w-full bg-[#F5F5F7] rounded-full h-1.5 overflow-hidden border border-[#E5E5EA]">
                                        <div
                                            className="bg-[#0071E3] h-full rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${Math.max(5, progress?.percent || 5)}%` }}
                                        />
                                    </div>

                                    {/* Active Stage Details */}
                                    <div className="bg-[#FBFBFD] border border-[#E5E5EA] rounded-lg p-3 text-xs space-y-1">
                                        <div className="flex items-center justify-between text-[11px] text-[#6E6E73]">
                                            <span>Current Stage</span>
                                            <span className="font-mono text-[#1D1D1F]">
                                                {progress?.currentCourseIndex && progress?.totalCourses
                                                    ? `Course ${progress.currentCourseIndex} of ${progress.totalCourses}`
                                                    : 'Connecting'}
                                            </span>
                                        </div>
                                        <p className="font-medium text-[#1D1D1F] truncate text-xs">
                                            {progress?.currentStage || 'Uploading Moodle documents...'}
                                        </p>
                                        {progress?.currentMaterial && (
                                            <div className="flex items-center gap-2 pt-1 text-[11px] text-[#6E6E73] truncate border-t border-[#E5E5EA]/50">
                                                <FileText className="w-3 h-3 text-[#0071E3] shrink-0" />
                                                <span className="truncate font-mono">{progress.currentMaterial}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Counts Row */}
                                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                        <div className="bg-[#F5F5F7] rounded-lg p-2 border border-[#E5E5EA]">
                                            <span className="text-[10px] text-[#6E6E73] block">Discovered</span>
                                            <span className="text-sm font-semibold text-[#1D1D1F] tabular-nums">
                                                {progress?.materialsFound || 0}
                                            </span>
                                        </div>
                                        <div className="bg-[#EAF9EE] rounded-lg p-2 border border-[#C6EFD2]">
                                            <span className="text-[10px] text-[#1B7F37] block">Imported</span>
                                            <span className="text-sm font-semibold text-[#1B7F37] tabular-nums">
                                                {progress?.importedCount || 0}
                                            </span>
                                        </div>
                                        <div className="bg-[#FFF8E6] rounded-lg p-2 border border-[#FFE29A]">
                                            <span className="text-[10px] text-[#B25E00] block">Duplicates</span>
                                            <span className="text-sm font-semibold text-[#B25E00] tabular-nums">
                                                {progress?.skippedCount || 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Activity Log Feed */}
                                    {progress?.logs && progress.logs.length > 0 && (
                                        <div className="space-y-1.5 pt-1">
                                            <span className="text-[11px] font-medium text-[#6E6E73] block">Activity Log</span>
                                            <div
                                                ref={logContainerRef}
                                                className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-lg p-2.5 font-mono text-[11px] text-[#1D1D1F] max-h-28 overflow-y-auto space-y-1"
                                            >
                                                {progress.logs.map((log, idx) => (
                                                    <div key={idx} className="leading-snug flex items-start gap-1.5">
                                                        <span className="text-[#8E8E93] select-none">·</span>
                                                        <span className={cn(
                                                            log.includes('Saved') || log.includes('Complete') ? 'text-[#1B7F37]' :
                                                            log.includes('duplicate') ? 'text-[#B25E00]' : 'text-[#6E6E73]'
                                                        )}>
                                                            {log}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Completed Results Summary */}
                            {syncResult && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-xs font-semibold text-[#1D1D1F] flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
                                            <span>Synchronization Summary</span>
                                        </h3>
                                        <span className="text-[11px] text-[#6E6E73]">Completed Session</span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                                        <div className="p-3 bg-[#F5F5F7] border border-[#E5E5EA] rounded-xl">
                                            <p className="text-[11px] text-[#6E6E73]">Discovered</p>
                                            <p className="text-lg font-semibold text-[#1D1D1F] mt-0.5 tabular-nums">
                                                {syncResult.totalDiscoveredCourses}
                                            </p>
                                            <p className="text-[10px] text-[#8E8E93]">Courses</p>
                                        </div>
                                        <div className="p-3 bg-white border border-[#E5E5EA] rounded-xl">
                                            <p className="text-[11px] text-[#6E6E73]">Matched</p>
                                            <p className="text-lg font-semibold text-[#0071E3] mt-0.5 tabular-nums">
                                                {syncResult.matchedCoursesCount}
                                            </p>
                                            <p className="text-[10px] text-[#8E8E93]">Subjects</p>
                                        </div>
                                        <div className="p-3 bg-[#EAF9EE] border border-[#C6EFD2] rounded-xl">
                                            <p className="text-[11px] text-[#1B7F37]">Imported</p>
                                            <p className="text-lg font-semibold text-[#1B7F37] mt-0.5 tabular-nums">
                                                {syncResult.importedCount}
                                            </p>
                                            <p className="text-[10px] text-[#1B7F37]/80">New Notes</p>
                                        </div>
                                        <div className="p-3 bg-[#FFF8E6] border border-[#FFE29A] rounded-xl">
                                            <p className="text-[11px] text-[#B25E00]">Duplicates</p>
                                            <p className="text-lg font-semibold text-[#B25E00] mt-0.5 tabular-nums">
                                                {syncResult.skippedDuplicatesCount}
                                            </p>
                                            <p className="text-[10px] text-[#B25E00]/80">Skipped</p>
                                        </div>
                                    </div>

                                    {/* Processed Courses List */}
                                    <div className="bg-white border border-[#E5E5EA] rounded-xl divide-y divide-[#E5E5EA] overflow-hidden">
                                        <div className="px-4 py-2.5 bg-[#FBFBFD] flex items-center justify-between text-xs font-medium text-[#6E6E73]">
                                            <span>Processed Courses</span>
                                            <span>Outcome</span>
                                        </div>
                                        {syncResult.courses?.filter(c => c.matched).map((c, i) => (
                                            <div key={i} className="px-4 py-3 flex items-center justify-between gap-4 text-xs">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-[#1D1D1F] truncate">{c.subjectName || c.courseName}</span>
                                                        <span className="text-[10px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-1.5 py-0.2 rounded border border-[#E5E5EA]">
                                                            {c.courseCode}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[#6E6E73] mt-0.5">
                                                        Found: {c.materialsFound} · Imported: <span className="font-medium text-[#1B7F37]">{c.importedCount}</span> · Skipped: {c.skippedCount}
                                                    </p>
                                                </div>
                                                <span className={cn(
                                                    "text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                                                    c.status === 'SUCCESS' ? "bg-[#EAF9EE] text-[#1B7F37] border-[#C6EFD2]" : "bg-[#FDF2F2] text-[#D32F2F] border-[#F8C8C8]"
                                                )}>
                                                    {c.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Unmatched Courses Collapsible */}
                                    {syncResult.unmatchedCourses?.length > 0 && (
                                        <div className="border border-[#E5E5EA] rounded-xl overflow-hidden text-xs">
                                            <button
                                                type="button"
                                                onClick={() => setShowUnmatched(!showUnmatched)}
                                                className="w-full px-4 py-2.5 bg-[#FBFBFD] flex items-center justify-between text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer"
                                            >
                                                <span>Unmatched Courses ({syncResult.unmatchedCourses.length})</span>
                                                {showUnmatched ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                            </button>
                                            {showUnmatched && (
                                                <div className="p-3 bg-white max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-[#6E6E73] divide-y divide-[#E5E5EA]/60">
                                                    {syncResult.unmatchedCourses.map((uc, i) => (
                                                        <p key={i} className="py-1">{uc}</p>
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
                        <div className="space-y-4 animate-in fade-in duration-200">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-[#1D1D1F]">
                                    Discovered Courses ({discoveredCourses?.length || 0})
                                </h3>
                                <button
                                    type="button"
                                    onClick={handleDiscover}
                                    disabled={isLoading}
                                    className="text-xs font-medium text-[#0071E3] hover:text-[#005BB5] flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                >
                                    <RefreshCw className={cn("w-3 h-3", isLoading && "animate-spin")} />
                                    <span>Refresh Discovery</span>
                                </button>
                            </div>

                            <div className="bg-white border border-[#E5E5EA] rounded-xl divide-y divide-[#E5E5EA] max-h-[380px] overflow-y-auto text-xs">
                                {discoveredCourses?.map((c, i) => (
                                    <div key={i} className="p-3.5 flex items-center justify-between gap-4 hover:bg-[#FBFBFD] transition">
                                        <div className="min-w-0 space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-[#1D1D1F] truncate">{c.fullname}</span>
                                                <span className="text-[10px] font-mono text-[#6E6E73] bg-[#F5F5F7] px-1.5 py-0.2 rounded border border-[#E5E5EA]">
                                                    {c.code}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-[#8E8E93]">
                                                ID: {c.id} · Shortcode: {c.shortname}
                                            </p>
                                        </div>
                                        <div>
                                            {c.matched ? (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#0071E3]/8 text-[#0071E3] border border-[#0071E3]/20 whitespace-nowrap">
                                                    Matches: {c.matchedSubjectName}
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#8E8E93] border border-[#E5E5EA] whitespace-nowrap">
                                                    Unmatched
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5E5EA] bg-[#FBFBFD]">
                    {syncResult ? (
                        <button
                            type="button"
                            onClick={() => setSyncResult(null)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#0071E3] hover:bg-[#0071E3]/5 transition cursor-pointer"
                        >
                            ← Scrape Another Subject
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={resetState}
                            disabled={isLoading}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#6E6E73] hover:text-[#1D1D1F] transition cursor-pointer disabled:opacity-40"
                        >
                            Close
                        </button>
                    )}

                    <div className="flex items-center gap-2.5">
                        {isLoading && (
                            <button
                                type="button"
                                onClick={() => setIsMinimized(true)}
                                className="px-3 py-1.5 rounded-lg border border-[#E5E5EA] bg-white text-xs font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition cursor-pointer"
                            >
                                Minimize
                            </button>
                        )}

                        {syncResult ? (
                            <button
                                type="button"
                                onClick={resetState}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#1D1D1F] hover:bg-black text-white h-9 px-5 shadow-xs transition cursor-pointer"
                            >
                                Done
                            </button>
                        ) : activeTab === 'sync' ? (
                            <button
                                type="button"
                                onClick={handleSync}
                                disabled={isLoading}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#0071E3] hover:bg-[#005BB5] text-white h-9 px-4 gap-2 shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                                <span>
                                    {isLoading
                                        ? 'Synchronizing...'
                                        : syncMode === 'single'
                                            ? 'Scrape Subject'
                                            : syncMode === 'test'
                                                ? 'Test Connection'
                                                : 'Sync Notes'}
                                </span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setActiveTab('sync')}
                                className="inline-flex items-center justify-center rounded-lg text-xs font-medium bg-[#0071E3] hover:bg-[#005BB5] text-white h-9 px-4 gap-2 shadow-xs transition cursor-pointer"
                            >
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
