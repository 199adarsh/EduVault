import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import {
    Search,
    Plus,
    Filter,
    Archive,
    Zap,
    FileText,
    Eye,
    X,
    ChevronDown,
    Inbox,
    Clock,
    ArrowUpRight,
    Brain,
    History,
    Activity,
    Layers,
    ChevronRight,
    Monitor
} from 'lucide-react';
import { cn } from '../../lib/utils';

const API_BASE = 'http://localhost:8081/api';

const PYQsDatabase = () => {
    const { subjects } = useOutletContext();
    const [pyqs, setPyqs] = useState([]);
    const [filterSubject, setFilterSubject] = useState('');
    const [filterExam, setFilterExam] = useState('');
    const [loading, setLoading] = useState(true);

    // AI Predictor State
    const [predictorPyq, setPredictorPyq] = useState('');
    const [predictorQb, setPredictorQb] = useState('');
    const [predictionResult, setPredictionResult] = useState(null);
    const [predicting, setPredicting] = useState(false);

    const [selectedPyq, setSelectedPyq] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Upload Modal State
    const [showUpload, setShowUpload] = useState(false);
    const [newPyq, setNewPyq] = useState({
        subjectId: '',
        examType: 'ESE',
        year: new Date().getFullYear().toString(),
        tags: '',
        textContent: ''
    });

    useEffect(() => {
        fetchPyqs();
    }, [filterSubject, filterExam]);

    const fetchPyqs = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/pyqs`, {
                params: { subjectId: filterSubject, examType: filterExam }
            });
            setPyqs(res.data);
        } catch (err) {
            toast.error("Archive synchronization failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePredict = async () => {
        if (!predictorPyq.trim()) {
            toast.error("Context required for neural analysis");
            return;
        }
        setPredicting(true);
        try {
            const res = await axios.post(`${API_BASE}/pyqs/predict`, {
                pyqText: predictorPyq,
                qbText: predictorQb
            });
            setPredictionResult(res.data);
            toast.success("Priority Matrix Synthesized");
        } catch (err) {
            toast.error("AI Logic Engine offline");
        } finally {
            setPredicting(false);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/pyqs`, newPyq);
            toast.success("Archival Record Ingested");
            setShowUpload(false);
            fetchPyqs();
        } catch (err) {
            toast.error("Ingestion protocol failure");
        }
    };

    const [isPredictorVisible, setIsPredictorVisible] = useState(false);

    return (
        <div className="flex-1 flex flex-col h-full bg-black text-zinc-100 antialiased overflow-hidden font-sans relative">
            {/* Background Grain/Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/5 via-transparent to-transparent pointer-events-none" />

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto no-scrollbar p-6 lg:p-10 space-y-10 relative z-10">
                {/* Header Container */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-blue-400 mb-1">
                            <Archive className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">Institutional Repository</span>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Question Vault</h1>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Examination Sequence Mapping & Archival Logic</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsPredictorVisible(!isPredictorVisible)}
                            className={cn(
                                "h-10 px-4 rounded-sm text-[10px] font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                                isPredictorVisible
                                    ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                                    : "bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20"
                            )}
                        >
                            <Brain className="w-3.5 h-3.5" />
                            <span>{isPredictorVisible ? 'Hide Predictor' : 'Launch AI Predictor'}</span>
                        </button>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="h-10 px-5 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] bg-white text-black hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/5"
                        >
                            Ingest Record
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                    {/* Library Core (Left Column) */}
                    <div className="xl:col-span-12 space-y-8 transition-all duration-500">
                        {/* Filters Bar */}
                        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-5 backdrop-blur-md flex flex-col md:flex-row gap-5 items-center">
                            <div className="relative flex-1 w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search historical sequences..."
                                    className="w-full bg-black/40 border border-zinc-800/50 rounded-sm py-3 pl-11 pr-5 text-[13px] text-zinc-200 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/10 transition-all font-medium placeholder:text-zinc-800"
                                />
                            </div>

                            <div className="flex gap-3 w-full md:w-auto">
                                <div className="relative flex-1 min-w-[160px]">
                                    <select
                                        value={filterSubject}
                                        onChange={(e) => setFilterSubject(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800/50 rounded-sm py-3 pl-4 pr-10 text-[12px] text-zinc-300 outline-none hover:border-zinc-700 transition-all appearance-none cursor-pointer font-bold uppercase tracking-wider"
                                    >
                                        <option value="">Global Archive</option>
                                        {(subjects || []).map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 pointer-events-none" />
                                </div>

                                <div className="relative flex-1 min-w-[120px]">
                                    <select
                                        value={filterExam}
                                        onChange={(e) => setFilterExam(e.target.value)}
                                        className="w-full bg-black/40 border border-zinc-800/50 rounded-sm py-3 pl-4 pr-10 text-[12px] text-zinc-300 outline-none hover:border-zinc-700 transition-all appearance-none cursor-pointer font-bold uppercase tracking-wider"
                                    >
                                        <option value="">All Exams</option>
                                        <option value="ISE01">ISE 01</option>
                                        <option value="ISE02">ISE 02</option>
                                        <option value="ESE">End-Sem</option>
                                        <option value="Backlog">Backlog</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-700 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Data Grid */}
                        <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl overflow-hidden backdrop-blur-md shadow-2xl">
                            <div className="overflow-x-auto no-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[800px]">
                                    <thead>
                                        <tr className="border-b border-zinc-800/50 bg-zinc-900/40">
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Subject Name</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Exam</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 text-center">Release</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500">Labels</th>
                                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-500 text-right">Vault</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800/20">
                                        {loading ? (
                                            [1, 2, 3, 4, 5].map(i => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={5} className="px-6 py-4 h-16 bg-zinc-900/5"></td>
                                                </tr>
                                            ))
                                        ) : pyqs.length > 0 ? pyqs.map((q, i) => (
                                            <tr key={q.id || i} className="hover:bg-zinc-800/30 transition-all group">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-1 h-3 bg-blue-500/30 rounded-sm group-hover:bg-blue-500 transition-all duration-300"></div>
                                                        <span className="text-[13px] font-bold text-zinc-300 group-hover:text-white transition-colors">
                                                            {(subjects || []).find(s => s.id === q.subjectId)?.name || 'General Record'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-[9px] font-black px-2.5 py-1 bg-black/40 border border-zinc-800/50 text-zinc-500 rounded-sm uppercase tracking-widest group-hover:border-zinc-700 transition-colors">
                                                        {q.examType}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[12px] font-mono font-bold text-zinc-600">{q.year}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {q.tags ? q.tags.split(',').map(tag => (
                                                            <span key={tag} className="text-[8px] font-bold uppercase text-zinc-500 bg-black/40 px-2 py-0.5 rounded-sm border border-zinc-800/40">
                                                                {tag.trim()}
                                                            </span>
                                                        )) : <span className="text-[9px] text-zinc-800 italic opacity-40">Unlabeled</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => {
                                                            setSelectedPyq(q);
                                                            setShowViewModal(true);
                                                        }}
                                                        className="w-9 h-9 rounded-sm inline-flex items-center justify-center hover:bg-blue-600/10 text-zinc-700 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="px-6 py-40 text-center">
                                                    <div className="flex flex-col items-center gap-6 opacity-30 group">
                                                        <Inbox className="w-16 h-16 text-zinc-800 group-hover:scale-110 transition-all duration-700" />
                                                        <div className="space-y-2">
                                                            <p className="text-xs font-black uppercase tracking-[0.4em] text-zinc-600">Archive Void</p>
                                                            <p className="text-[10px] text-zinc-700 font-bold uppercase tracking-widest">No historical records synthesized in this sector</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>


                </div>
            </main>

            {/* Predictor Popup */}
            {isPredictorVisible && (
                <div className="fixed bottom-6 right-6 z-[200] w-[400px] max-w-[calc(100vw-3rem)] bg-zinc-900/95 border border-zinc-800/50 backdrop-blur-xl rounded-xl shadow-2xl flex flex-col max-h-[600px] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    {/* Predictor Header */}
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/80 rounded-t-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-blue-600/10 rounded-sm ring-1 ring-blue-500/20">
                                <Brain className="w-4 h-4 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="text-[10px] font-black tracking-[0.2em] text-white uppercase">Neural Predictor</h3>
                                <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-[0.2em] flex items-center gap-1.5 mt-0.5">
                                    <Activity className="w-2.5 h-2.5 text-emerald-500 animate-pulse" />
                                    Engine v4.2
                                </p>
                            </div>
                        </div>
                        <button onClick={() => setIsPredictorVisible(false)} className="text-zinc-600 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Predictor Body */}
                    <div className="p-4 space-y-4 overflow-y-auto no-scrollbar flex-1">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Archival Data</label>
                            </div>
                            <textarea
                                value={predictorPyq}
                                onChange={(e) => setPredictorPyq(e.target.value)}
                                className="w-full h-24 bg-black/40 border border-zinc-800/50 rounded-lg p-3 text-[10px] text-zinc-300 resize-none focus:border-blue-500/40 outline-none transition-all placeholder:text-zinc-800 leading-relaxed font-medium"
                                placeholder="Input examination strings..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[8px] font-black uppercase tracking-[0.3em] text-zinc-600">Neural Context</label>
                            </div>
                            <textarea
                                value={predictorQb}
                                onChange={(e) => setPredictorQb(e.target.value)}
                                className="w-full h-24 bg-black/40 border border-zinc-800/50 rounded-lg p-3 text-[10px] text-zinc-300 resize-none focus:border-blue-500/40 outline-none transition-all placeholder:text-zinc-800 leading-relaxed font-medium"
                                placeholder="Syllabus reference mapping..."
                            />
                        </div>

                        <button
                            onClick={handlePredict}
                            disabled={predicting}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-2 hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] active:scale-[0.98] disabled:opacity-50"
                        >
                            {predicting ? <Activity className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                            {predicting ? 'Processing...' : 'Execute Analysis'}
                        </button>

                        {/* Result Box */}
                        {predictionResult && (
                            <div className="pt-4 border-t border-zinc-800/50 animate-in zoom-in-95 duration-500">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[8px] font-black uppercase tracking-[0.25em] text-blue-400">Synthesis Output</h4>
                                </div>

                                <div className="space-y-3">
                                    {predictionResult.guide ? predictionResult.guide.map((item, idx) => (
                                        <div key={idx} className="bg-black/40 rounded-lg border border-zinc-800/50 p-3 space-y-2 hover:border-blue-500/30 transition-all">
                                            <div className="flex justify-between items-start gap-2">
                                                <h5 className="text-[10px] font-bold leading-snug flex-1 text-zinc-200 uppercase tracking-tight">{item.topic}</h5>
                                                <span className={cn(
                                                    "text-[7px] font-black uppercase px-1.5 py-0.5 rounded border",
                                                    item.priority === 'High' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                        item.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                )}>
                                                    {item.priority}
                                                </span>
                                            </div>
                                            <div className="space-y-1">
                                                {item.questions.slice(0, 1).map((q, qIdx) => (
                                                    <div key={qIdx} className="text-[9px] text-zinc-600 flex gap-2 leading-relaxed italic">
                                                        <div className="w-1 h-1 rounded-full bg-blue-500/20 mt-1 shrink-0" />
                                                        <span className="line-clamp-2">{q}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-[9px] font-mono leading-relaxed text-zinc-500 bg-black/60 p-3 rounded-lg border border-zinc-800/50 whitespace-pre-wrap max-h-32 overflow-y-auto">
                                            {typeof predictionResult === 'string' ? predictionResult : 'Synthesis recorded.'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showUpload && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
                    <div className="bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-xl rounded-xl w-full max-w-xl shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                            <h3 className="text-[11px] font-black tracking-[0.2em] text-white uppercase">Vault Record Ingestion</h3>
                            <button onClick={() => setShowUpload(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleUpload} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Identity</label>
                                    <select required value={newPyq.subjectId} onChange={e => setNewPyq({ ...newPyq, subjectId: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 outline-none focus:border-blue-500/40 font-bold uppercase">
                                        <option value="">Select Subject</option>
                                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Protocol</label>
                                    <select value={newPyq.examType} onChange={e => setNewPyq({ ...newPyq, examType: e.target.value })} className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-xs text-zinc-300 outline-none focus:border-blue-500/40 font-bold uppercase">
                                        <option value="ISE01">ISE 01</option>
                                        <option value="ISE02">ISE 02</option>
                                        <option value="ESE">End-Sem</option>
                                        <option value="Backlog">Backlog</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-600 ml-1">Archival Content</label>
                                <textarea required className="w-full h-40 bg-black border border-zinc-800 rounded-xl p-4 text-xs text-zinc-300 resize-none outline-none focus:border-blue-500/40 leading-relaxed placeholder:text-zinc-900" placeholder="Paste Examine strings..." value={newPyq.textContent} onChange={e => setNewPyq({ ...newPyq, textContent: e.target.value })} />
                            </div>
                            <button className="w-full py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all">Authenticate & Commit</button>
                        </form>
                    </div>
                </div>
            )}

            {showViewModal && selectedPyq && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
                    <div className="bg-zinc-900/90 border border-zinc-800/50 backdrop-blur-xl rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
                        <div className="px-8 py-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950">
                            <div className="flex items-center gap-4">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <h3 className="text-[11px] font-black tracking-[0.2em] text-white uppercase">{selectedPyq.examType} Entry</h3>
                            </div>
                            <button onClick={() => setShowViewModal(false)} className="text-zinc-600 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="bg-black/50 border border-zinc-800/50 rounded-xl p-6 h-[400px] overflow-y-auto no-scrollbar font-sans text-[13px] leading-relaxed text-zinc-400 whitespace-pre-wrap">
                                {selectedPyq.textContent}
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        setPredictorPyq(selectedPyq.textContent);
                                        setIsPredictorVisible(true);
                                        setShowViewModal(false);
                                        toast.success("Push successful");
                                    }}
                                    className="px-6 py-3 border border-blue-500/30 text-blue-400 text-[9px] font-black uppercase tracking-widest hover:bg-blue-500/5 rounded-xl flex items-center gap-2"
                                >
                                    <Brain className="w-3.5 h-3.5" />
                                    Push to Predictor
                                </button>
                                <button onClick={() => setShowViewModal(false)} className="px-8 py-3 bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700">Dismiss</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PYQsDatabase;

