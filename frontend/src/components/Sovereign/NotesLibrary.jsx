import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
    Search,
    Upload,
    Filter,
    FileText,
    ChevronRight,
    ArrowUpRight,
    Plus,
    BookOpen,
    LayoutGrid,
    Bell,
    Settings,
    MoreVertical,
    Inbox,
    RefreshCw
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

    const filteredNotes = notes?.filter(note => {
        const matchSubject = selectedSubject === 'all' || note.subjectId === selectedSubject;
        const matchUnit = selectedUnit === 'all' || note.unit === selectedUnit;
        const matchSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (subjects?.find(s => s.id === note.subjectId)?.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        return matchSubject && matchUnit && matchSearch;
    }) || [];

    // Grouping logic for systematic organization
    const groupedNotes = (subjects || []).reduce((acc, sub) => {
        const subNotes = filteredNotes.filter(n => n.subjectId === sub.id);
        if (subNotes.length > 0) {
            acc.push({ subject: sub, notes: subNotes });
        }
        return acc;
    }, []);

    // Also handle notes with no matching subject (if any)
    const orphanNotes = filteredNotes.filter(n => !(subjects || []).find(s => s.id === n.subjectId));
    if (orphanNotes.length > 0) {
        groupedNotes.push({ subject: { name: 'Uncategorized Assets', id: 'other' }, notes: orphanNotes });
    }

    const units = ['UNIT 01', 'UNIT 02', 'UNIT 03', 'UNIT 04', 'UNIT 05', 'UNIT 06'];

    return (
        <div className="p-6 lg:p-10 space-y-10 max-w-7xl mx-auto w-full antialiased bg-black text-zinc-100 min-h-screen">
            {/* Page Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Knowledge Repository</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Intellectual Assets</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Neural architecture for centralized academic records</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowLmsSync(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-200 bg-zinc-900 border border-zinc-700/60 text-zinc-200 hover:text-white hover:bg-zinc-800 h-9 px-4 gap-2 shadow-lg hover:border-blue-500/50"
                    >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                        <span>SYNC LMS NOTES</span>
                    </button>
                    <button
                        onClick={() => setShowUpload(true)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-lg text-xs font-bold transition-all duration-200 bg-blue-600/90 text-white hover:bg-blue-600 h-9 px-4 gap-2 shadow-lg shadow-blue-500/10"
                    >
                        <Upload className="w-3.5 h-3.5" />
                        <span>UPLOAD ASSET</span>
                    </button>
                    <div className="flex items-center gap-2 ml-2 pl-4 border-l border-zinc-800">
                        <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-all">
                            <Bell className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50 rounded-lg transition-all">
                            <Settings className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Controls Bar */}
            <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 backdrop-blur-md flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search academic records..."
                        className="w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2.5 pl-10 pr-4 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition-all font-medium"
                    />
                </div>

                <div className="flex gap-3 w-full lg:w-auto">
                    <div className="relative flex-1 lg:flex-none">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full lg:w-[200px] bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2.5 pl-4 pr-10 text-xs text-zinc-300 outline-none focus:border-blue-500/40 transition-all appearance-none font-medium cursor-pointer"
                        >
                            <option value="all">All Subjects</option>
                            {subjects?.map(sub => (
                                <option key={sub.id} value={sub.id}>{sub.name}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none w-4 h-4 rotate-90" />
                    </div>

                    <div className="relative flex-1 lg:flex-none">
                        <select
                            value={selectedUnit}
                            onChange={(e) => setSelectedUnit(e.target.value)}
                            className="w-full lg:w-[150px] bg-zinc-950/50 border border-zinc-800/50 rounded-lg py-2.5 pl-4 pr-10 text-xs text-zinc-300 outline-none focus:border-blue-500/40 transition-all appearance-none font-medium cursor-pointer"
                        >
                            <option value="all">All Units</option>
                            {units.map(u => (
                                <option key={u} value={u}>{u}</option>
                            ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 pointer-events-none w-4 h-4 rotate-90" />
                    </div>
                </div>
            </div>

            {/* Grouped Content */}
            {groupedNotes.length > 0 ? (
                <div className="space-y-12 pb-24">
                    {groupedNotes.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-6 animate-in fade-in duration-700">
                            <div className="flex items-center justify-between px-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-1 h-5 bg-blue-500/60 rounded-full"></div>
                                    <h2 className="text-sm font-bold text-zinc-300 tracking-tight flex items-center gap-2">
                                        {group.subject.name}
                                        <span className="text-[10px] font-black bg-zinc-800/50 border border-zinc-700/30 px-2 py-0.5 rounded-full text-zinc-500 tracking-normal">
                                            {group.notes.length}
                                        </span>
                                    </h2>
                                </div>
                                <div className="h-[1px] flex-1 mx-6 bg-zinc-900/50 hidden md:block"></div>
                                <button className="text-[10px] font-bold text-zinc-600 hover:text-zinc-400 uppercase tracking-widest transition-colors">
                                    EXPAND ALL
                                </button>
                            </div>

                            <div className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide">
                                {group.notes.map((note, i) => (
                                    <div
                                        key={i}
                                        onClick={() => navigate(`/notes/${note.id}`)}
                                        className="w-[280px] shrink-0 snap-start group relative flex flex-col p-4 rounded-xl border border-zinc-800/50 bg-zinc-900/20 hover:bg-zinc-800/40 hover:border-zinc-700/50 transition-all duration-300 cursor-pointer overflow-hidden backdrop-blur-sm"
                                    >
                                        <div className="relative flex flex-col h-full space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div className="w-10 h-10 rounded-lg bg-zinc-950/80 border border-zinc-800 flex items-center justify-center group-hover:scale-105 group-hover:border-blue-500/30 transition-all duration-500 shadow-inner">
                                                    <FileText className="w-5 h-5 text-zinc-500 group-hover:text-blue-400 transition-colors" />
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-zinc-800/80 text-zinc-500 border border-zinc-700/30 uppercase tracking-tighter">
                                                        {note.fileUrl?.split('.').pop() || 'PDF'}
                                                    </span>
                                                    <ArrowUpRight className="w-3.5 h-3.5 text-zinc-800 group-hover:text-blue-400/50 transition-all" />
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <h3 className="font-semibold text-[13px] text-zinc-200 line-clamp-2 leading-tight group-hover:text-white transition-colors tracking-tight">
                                                    {note.title}
                                                </h3>
                                                <p className="text-[10px] text-zinc-600 font-medium">Verified Academic Record</p>
                                            </div>

                                            <div className="pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-2">
                                                <div className="space-y-0.5">
                                                    <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Unit</p>
                                                    <p className="text-[10px] font-semibold text-zinc-400">{note.unit || "N/A"}</p>
                                                </div>
                                                <div className="space-y-0.5 text-right">
                                                    <p className="text-[8px] font-bold text-zinc-700 uppercase tracking-widest">Access</p>
                                                    <p className="text-[10px] font-semibold text-zinc-400">Public</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[8px] font-bold text-zinc-600 uppercase tracking-widest mt-auto">
                                                <span>{new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]"></div>
                                                    <span className="text-zinc-700">ONLINE</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="py-32 bg-zinc-900/10 border border-dashed border-zinc-800/50 rounded-xl flex flex-col items-center justify-center text-zinc-800 group transition-all hover:bg-zinc-900/20">
                    <div className="w-16 h-16 rounded-full bg-zinc-950 border border-zinc-900 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Inbox className="w-8 h-8 text-zinc-800 group-hover:text-zinc-700 transition-colors" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.3em] text-zinc-600 mb-2">Vault Sector Empty</p>
                    <p className="text-[10px] text-zinc-700 font-medium mb-8">No academic records found in the current subspace</p>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowLmsSync(true)}
                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all shadow-xl flex items-center gap-2"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>SYNC FROM LMS</span>
                        </button>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all border border-zinc-800 hover:border-zinc-700 shadow-xl"
                        >
                            UPLOAD LOCAL ASSET
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
        </div>
    );
};

export default NotesLibrary;

