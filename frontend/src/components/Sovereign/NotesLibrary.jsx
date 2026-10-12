import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Search,
    Upload,
    BookOpen,
    FileText,
    ArrowUpRight,
    RefreshCw,
    Inbox,
    Layers,
    ChevronDown
} from 'lucide-react';
import { cn } from '../../lib/utils';
import LmsSyncModal from './LmsSyncModal';

const NotesLibrary = () => {
    const { subjects, notes, refreshData, setShowUpload } = useOutletContext();
    const navigate = useNavigate();

    const [showLmsSync, setShowLmsSync] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedUnit, setSelectedUnit] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    React.useEffect(() => {
        if (refreshData && (!notes || notes.length === 0)) {
            refreshData();
        }
    }, [notes, refreshData]);

    const resolveSubjectId = (note) => {
        if (!note || note.status === 'PENDING_MAPPING') return null;
        if (subjects?.some(s => s.id === note.subjectId)) return note.subjectId;
        return null;
    };

    const normalizeUnit = (u) => (u || '').toString().toLowerCase().replace(/[^0-9]/g, '');

    const filteredNotes = notes?.filter(note => {
        const resolvedId = resolveSubjectId(note);
        const matchSubject = selectedSubject === 'all' || resolvedId === selectedSubject;
        const matchUnit = selectedUnit === 'all' || normalizeUnit(note.unit) === normalizeUnit(selectedUnit);
        const matchSearch = (note.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (subjects?.find(s => s.id === resolvedId)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchSubject && matchUnit && matchSearch;
    }) || [];

    // Grouping logic by subjectId
    const groupedNotes = (subjects || []).reduce((acc, sub) => {
        const subNotes = filteredNotes.filter(n => n.subjectId === sub.id && n.status !== 'PENDING_MAPPING');
        if (subNotes.length > 0) {
            acc.push({ subject: sub, notes: subNotes });
        }
        return acc;
    }, []);

    // Needs Subject Mapping section
    const unmappedNotes = filteredNotes.filter(n => !n.subjectId || n.status === 'PENDING_MAPPING' || !subjects?.some(s => s.id === n.subjectId));
    if (unmappedNotes.length > 0) {
        groupedNotes.push({ subject: { name: 'Needs Subject Mapping', id: 'unmapped', isUnmapped: true }, notes: unmappedNotes });
    }

    const units = ['UNIT 01', 'UNIT 02', 'UNIT 03', 'UNIT 04', 'UNIT 05', 'UNIT 06'];

    const userRole = localStorage.getItem('eduvault_user_role') || 'student';
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin';

    return (
        <div className="flex-1 flex flex-col min-h-screen bg-[#f8fafc] text-slate-900 antialiased overflow-y-auto">
            <main className="p-6 sm:p-8 max-w-[1600px] w-full mx-auto flex flex-col gap-6">
                
                {/* Page Header */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 tracking-wide mb-1">
                            <BookOpen className="w-4 h-4 text-blue-600" />
                            <span className="uppercase tracking-wider text-[11px]">Academic Knowledge Vault</span>
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study Notes &amp; Resources</h1>
                        <p className="text-xs font-normal text-slate-500 mt-0.5">
                            Centralized repository for curriculum notes, unit materials, and lecture presentations
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {isTeacher && (
                            <button
                                onClick={() => setShowLmsSync(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-xs cursor-pointer"
                                title="Teacher access: Sync latest materials from Moodle LMS"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                                <span>SYNC LMS NOTES</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowUpload(true)}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 transition-all shadow-xs cursor-pointer"
                        >
                            <Upload className="w-3.5 h-3.5" />
                            <span>UPLOAD ASSET</span>
                        </button>
                    </div>
                </header>

                {/* Search & Filters Bar */}
                <section className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs flex flex-col md:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Search className="w-4 h-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes, chapters, topics, or subjects..."
                            className="w-full pl-10 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-48">
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Subjects</option>
                                {subjects?.map(sub => (
                                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                        </div>

                        <div className="relative flex-1 md:w-36">
                            <select
                                value={selectedUnit}
                                onChange={(e) => setSelectedUnit(e.target.value)}
                                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg py-2 pl-3 pr-8 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                            >
                                <option value="all">All Units</option>
                                {units.map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-3.5 h-3.5" />
                        </div>
                    </div>
                </section>

                {/* Grouped Content */}
                {groupedNotes.length > 0 ? (
                    <div className="space-y-8 pb-16">
                        {groupedNotes.map((group, groupIdx) => {
                            const isSingleSubject = selectedSubject !== 'all';

                            return (
                                <section key={groupIdx} className="space-y-3.5">
                                    {/* Group Header */}
                                    <div className="flex items-center justify-between pb-1">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                group.subject.isUnmapped ? "bg-amber-500" : "bg-blue-600"
                                            )} />
                                            <h2 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                                                {group.subject.name}
                                                <span className={cn(
                                                    "text-[10px] font-semibold border px-2 py-0.5 rounded-full",
                                                    group.subject.isUnmapped
                                                        ? "bg-amber-50 border-amber-200 text-amber-700"
                                                        : "bg-blue-50 border-blue-200 text-blue-700"
                                                )}>
                                                    {group.notes.length} {group.notes.length === 1 ? 'item' : 'items'}
                                                </span>
                                            </h2>
                                        </div>

                                        {!isSingleSubject && !group.subject.isUnmapped ? (
                                            <button
                                                onClick={() => setSelectedSubject(group.subject.id)}
                                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <span>Expand Subject</span>
                                                <ArrowUpRight className="w-3.5 h-3.5" />
                                            </button>
                                        ) : isSingleSubject ? (
                                            <button
                                                onClick={() => setSelectedSubject('all')}
                                                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <span>&larr; View all subjects</span>
                                            </button>
                                        ) : null}
                                    </div>

                                    {/* Cards Container: Horizontally scrollable by default, vertical grid only when 1 subject is selected */}
                                    <div className={cn(
                                        isSingleSubject
                                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                                            : "flex items-stretch gap-4 overflow-x-auto pb-3 pt-0.5 no-scrollbar snap-x scroll-smooth"
                                    )}>
                                        {group.notes.map((note) => {
                                            const fileExt = (note.fileUrl?.split('.').pop() || 'PDF').toUpperCase();
                                            const isUnmapped = group.subject.isUnmapped || note.status === 'PENDING_MAPPING';

                                            return (
                                                <div
                                                    key={note.id}
                                                    onClick={() => navigate(`/notes/${note.id}`)}
                                                    className={cn(
                                                        "bg-white border rounded-xl p-4.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group shadow-xs hover:shadow-md",
                                                        !isSingleSubject && "w-[280px] sm:w-[310px] shrink-0 snap-start",
                                                        isUnmapped
                                                            ? "border-amber-200 hover:border-amber-400 bg-amber-50/20"
                                                            : "border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/10"
                                                    )}
                                                >
                                                    <div className="space-y-3">
                                                        {/* Top Row: Icon, File Type, Unit */}
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className={cn(
                                                                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                                                                    isUnmapped
                                                                        ? "bg-amber-100/70 text-amber-700"
                                                                        : "bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white"
                                                                )}>
                                                                    <FileText className="w-4 h-4" />
                                                                </div>
                                                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-tight">
                                                                    {fileExt}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                                    {note.unit || "Unit 1"}
                                                                </span>
                                                                <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition-colors" />
                                                            </div>
                                                        </div>

                                                        {/* Title & Metadata */}
                                                        <div>
                                                            <h3 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                                                {note.title}
                                                            </h3>
                                                            <p className="text-[11px] text-slate-400 mt-1 truncate">
                                                                {isUnmapped ? 'Needs Subject Mapping' : (group.subject.name || 'Verified Record')}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Bottom Row: Date & Status */}
                                                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                                                        <span>
                                                            {note.createdAt
                                                                ? new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                                : 'Recent'}
                                                        </span>

                                                        {isUnmapped ? (
                                                            <span className="inline-flex items-center gap-1 text-amber-700 font-semibold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                Pending Map
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Ready
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                ) : (
                    /* Minimal Clean Empty State */
                    <div className="py-24 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-center p-6 shadow-xs">
                        <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                            <Inbox className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-bold text-slate-800">No study notes found</h3>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mb-6">
                            No materials match your current filter criteria or none have been ingested yet.
                        </p>
                        <div className="flex items-center gap-3">
                            {isTeacher && (
                                <button
                                    onClick={() => setShowLmsSync(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all shadow-xs cursor-pointer"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    <span>SYNC FROM LMS</span>
                                </button>
                            )}
                            <button
                                onClick={() => setShowUpload(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-xs cursor-pointer"
                            >
                                <Upload className="w-3.5 h-3.5" />
                                <span>UPLOAD LOCAL ASSET</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* LMS Synchronization Modal */}
                <LmsSyncModal
                    isOpen={showLmsSync}
                    onClose={() => setShowLmsSync(false)}
                    onSyncComplete={refreshData}
                />
            </main>
        </div>
    );
};

export default NotesLibrary;
