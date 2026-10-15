import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth';
import {
    ArrowLeft, Download, ExternalLink, MessageSquare, Bot, X,
    FileText, User, Calendar, CheckCircle2, Send, Inbox, Loader2
} from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

const NoteDetail = () => {
    const { id: noteId } = useParams();
    const { profile, refreshData } = useOutletContext();
    const navigate = useNavigate();
    
    const [note, setNote] = useState(null);
    const [doubts, setDoubts] = useState([]);
    const [activeTab, setActiveTab] = useState('doubts'); // 'doubts' or 'ai'
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [presignedUrl, setPresignedUrl] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [docxHtml, setDocxHtml] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [chatMessages, setChatMessages] = useState([
        { role: 'assistant', text: "Hello! I'm your AI academic assistant. Ask me anything about this document." }
    ]);

    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchNoteData = async () => {
            try {
                const [noteRes, doubtsRes, fileRes] = await Promise.all([
                    axios.get(`${API_BASE}/notes/${noteId}`),
                    axios.get(`${API_BASE}/notes/${noteId}/doubts`),
                    axios.get(`${API_BASE}/files/${noteId}/presigned`)
                ]);
                setNote(noteRes.data);
                setDoubts(doubtsRes.data);
                if (fileRes.data?.url) setPresignedUrl(fileRes.data.url);
            } catch (err) {
                console.error('Error fetching note details:', err);
                toast.error('Failed to load note data.');
                navigate('/notes');
            } finally {
                setLoading(false);
            }
        };

        if (noteId) fetchNoteData();
    }, [noteId, navigate]);

    // Fetch file and render preview (PDF/DOCX/Image)
    useEffect(() => {
        if (!presignedUrl && !note?.fileUrl) return;
        let cancelled = false;

        const loadBlob = async () => {
            setDocLoading(true);
            let blob = null;

            // 1. Try local backend endpoint first for reliable CORS and speed
            if (note?.fileUrl) {
                try {
                    const fallbackUrl = `${API_BASE}/files/raw/${note.fileUrl}`;
                    const res = await fetch(fallbackUrl);
                    if (res.ok) {
                        blob = await res.blob();
                    }
                } catch (err) {
                    console.warn('Local raw fetch error:', err);
                }
            }

            // 2. Try presigned URL if local fetch was not used/failed
            if (!blob && presignedUrl) {
                try {
                    const res = await fetch(presignedUrl);
                    if (res.ok) {
                        blob = await res.blob();
                    }
                } catch (e) {
                    console.warn('Presigned fetch failed:', e);
                }
            }

            if (cancelled) return;

            if (blob) {
                const bUrl = URL.createObjectURL(blob);
                setBlobUrl(bUrl);

                const ext = note?.fileUrl ? note.fileUrl.split('.').pop().toLowerCase() : '';
                if (['doc', 'docx'].includes(ext)) {
                    try {
                        const arrayBuffer = await blob.arrayBuffer();
                        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
                        if (html && html.trim().length > 0 && !cancelled) {
                            setDocxHtml(html);
                        }
                    } catch (mErr) {
                        console.warn('Mammoth docx parse failed:', mErr);
                    }
                }
            }
            setDocLoading(false);
        };

        loadBlob();
        return () => { cancelled = true; };
    }, [presignedUrl, note]);

    // Cleanup blob URL on unmount
    useEffect(() => {
        return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [blobUrl]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [doubts, chatMessages, activeTab, isPanelOpen]);

    const handlePostDoubt = async () => {
        if (!query.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE}/notes/${noteId}/doubts`, {
                studentName: profile?.name || 'Anonymous',
                question: query.trim()
            });
            setDoubts([...doubts, res.data]);
            setQuery('');
            toast.success('Doubt posted! Instructors will be notified.');
        } catch (err) {
            toast.error('Failed to post doubt.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAIChat = async () => {
        if (!query.trim()) return;
        const userMsg = { role: 'user', text: query.trim() };
        setChatMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsSubmitting(true);
        
        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    question: userMsg.text,
                    noteId: noteId
                })
            });

            if (!response.ok) throw new Error("AI Logic Engine offline");

            const data = await response.json();
            setChatMessages(prev => [...prev, { 
                role: 'assistant', 
                text: data.answer || "No synthesis generated." 
            }]);
        } catch (err) {
            toast.error(err.message);
            setChatMessages(prev => [...prev, { 
                role: 'assistant', 
                text: "Error: " + err.message 
            }]);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeTab === 'doubts') handlePostDoubt();
        else handleAIChat();
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black min-h-screen">
                <div className="flex flex-col items-center gap-6">
                    <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Accessing Vault...</span>
                </div>
            </div>
        );
    }

    if (!note) return null;

    const fileExt = note.fileUrl ? note.fileUrl.split('.').pop().toLowerCase() : '';
    const isPdf = fileExt === 'pdf';
    const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt);

    return (
        <div className="relative flex-1 flex flex-col bg-zinc-950 overflow-hidden antialiased h-full w-full">
            {/* Header - Slim, Non-intrusive Top Bar */}
            <div className="h-12 px-3 sm:px-5 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-2.5 min-w-0">
                    <button 
                        onClick={() => navigate('/notes')} 
                        className="p-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer shrink-0"
                        title="Back to Notes"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <h2 className="text-xs sm:text-sm font-semibold text-zinc-100 truncate max-w-[200px] sm:max-w-[450px]">{note.title}</h2>
                        {note.unit && (
                            <span className="hidden md:inline-block px-2 py-0.5 rounded bg-zinc-900 text-[10px] font-medium text-zinc-400 border border-zinc-800 shrink-0">
                                {note.unit}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => setIsPanelOpen(true)}
                        className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer"
                        title="Open Doubts & Discussions"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                        <span className="hidden sm:inline">Doubts</span>
                        {doubts.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-bold">
                                {doubts.length}
                            </span>
                        )}
                    </button>
                    <a 
                        href={presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : '#')}
                        download
                        className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer" 
                        title="Download Document"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                    </a>
                </div>
            </div>

            {/* Document Viewer Area - Full Viewport Coverage */}
            <div className="flex-1 w-full h-[calc(100%-3rem)] min-h-0 bg-white relative flex flex-col overflow-hidden">
                {isPdf ? (
                    <iframe 
                        src={blobUrl ? `${blobUrl}#toolbar=0` : 'about:blank'} 
                        className="w-full h-full border-none bg-white"
                        title="Document Preview"
                    />
                ) : isOfficeDoc ? (
                    docLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-950">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
                            <p className="text-xs text-zinc-400 font-medium">Parsing document content...</p>
                        </div>
                    ) : docxHtml ? (
                        <div className="flex-1 w-full h-full overflow-y-auto bg-white p-6 sm:p-10 md:p-12 text-slate-900 selection:bg-blue-100">
                            <div 
                                className="max-w-4xl mx-auto prose prose-slate prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-table:border prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-th:bg-slate-50 [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                dangerouslySetInnerHTML={{ __html: docxHtml }} 
                            />
                        </div>
                    ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                        <div className="flex-1 w-full h-full overflow-y-auto bg-white p-6 sm:p-10 md:p-12 text-slate-900 selection:bg-blue-100">
                            <div className="max-w-4xl mx-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                                {note.extractedText}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-950">
                            <FileText className="w-16 h-16 text-zinc-700 mb-6" />
                            <h3 className="text-xl font-bold text-zinc-200 tracking-tight">Word Document Asset</h3>
                            <p className="text-xs text-zinc-400 mt-2 max-w-sm">No preview could be parsed automatically. Download original file below.</p>
                            <a 
                                href={presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : '#')}
                                download
                                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl transition-all text-xs font-bold text-white shadow-lg cursor-pointer"
                            >
                                Download Document
                            </a>
                        </div>
                    )
                ) : isImage ? (
                    <div className="flex-1 flex items-center justify-center p-4 bg-zinc-950">
                        <img 
                            src={blobUrl || 'about:blank'} 
                            alt={note.title}
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                    <div className="flex-1 w-full h-full overflow-y-auto bg-white p-6 sm:p-10 md:p-12 text-slate-900 selection:bg-blue-100">
                        <div className="max-w-4xl mx-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                            {note.extractedText}
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-950">
                        <FileText className="w-16 h-16 text-zinc-800 mb-6" />
                        <h3 className="text-xl font-bold text-zinc-300 tracking-tight">Preview Unavailable</h3>
                        <p className="text-xs text-zinc-500 mt-2 max-w-sm">This asset format requires external viewing. Please download to access.</p>
                        <a 
                            href={presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : '#')}
                            download
                            className="mt-8 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl transition-all text-xs font-bold text-white uppercase tracking-widest cursor-pointer"
                        >
                            Download Asset
                        </a>
                    </div>
                )}
            </div>

            {/* Slide-out Overlay */}
            {isPanelOpen && (
                <div 
                    className="absolute inset-0 z-30 bg-black/40 backdrop-blur-sm transition-opacity duration-500"
                    onClick={() => setIsPanelOpen(false)}
                />
            )}

            {/* Slide-out Panel */}
            <div className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-800/80 shadow-2xl transition-transform duration-500 ease-out z-40 flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Panel Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50">
                    <div>
                        <h3 className="text-xl font-bold text-zinc-100 tracking-tight">Interactive Layer</h3>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">AI Assist & Peer Doubts</p>
                    </div>
                    <button onClick={() => setIsPanelOpen(false)} className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 rounded-lg transition-all border border-transparent hover:border-zinc-700">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Metadata Section (Compact) */}
                <div className="px-6 py-5 border-b border-zinc-800/50 bg-zinc-900/30">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest rounded border border-zinc-700">
                            {note.unit || 'General'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Verified Asset
                        </span>
                    </div>
                    <h4 className="text-[13px] font-bold text-zinc-200 mb-3 leading-tight">{note.title}</h4>
                    <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                        <div className="flex items-center gap-1.5"><User className="w-3 h-3"/> {note.uploadedBy || 'System'}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="w-3 h-3"/> {new Date(note.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Panel Tabs */}
                <div className="flex p-4 gap-2 border-b border-zinc-800/50 bg-zinc-950/50">
                    <button 
                        onClick={() => setActiveTab('doubts')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'doubts' ? 'bg-zinc-800 text-white border border-zinc-700 shadow-lg' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'}`}
                    >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Doubts ({doubts.length})
                    </button>
                    <button 
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'ai' ? 'bg-blue-600 text-white border border-blue-500 shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'}`}
                    >
                        <Bot className="w-3.5 h-3.5" />
                        DocBot
                    </button>
                </div>

                {/* Content Area */}
                <div 
                    ref={scrollRef} 
                    className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
                >
                    {activeTab === 'doubts' ? (
                        doubts.length > 0 ? (
                            doubts.map((doubt, i) => (
                                <div key={i} className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-300 border border-zinc-700">
                                            {doubt.studentName?.substring(0, 2).toUpperCase() || 'AN'}
                                        </div>
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[11px] font-bold text-zinc-200">{doubt.studentName}</span>
                                                <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest">{new Date(doubt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs text-zinc-400 leading-relaxed bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/50">{doubt.question}</p>
                                        </div>
                                    </div>
                                    {doubt.answer && (
                                        <div className="ml-11 bg-emerald-500/5 border-l-2 border-emerald-500/40 pl-4 py-2">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Instructor Response</span>
                                            </div>
                                            <p className="text-xs text-emerald-100/80 leading-relaxed">{doubt.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center opacity-40">
                                <Inbox className="w-10 h-10 text-zinc-600 mb-4" />
                                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Silence in the vault</p>
                            </div>
                        )
                    ) : (
                        chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                                <div className={`max-w-[85%] p-4 rounded-2xl text-[13px] leading-relaxed shadow-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-800 text-zinc-200 rounded-bl-sm border border-zinc-700'}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-950 prose-pre:border prose-pre:border-zinc-800">
                                            <ReactMarkdown>{msg.text}</ReactMarkdown>
                                        </div>
                                    ) : (
                                        msg.text
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/80 backdrop-blur-md">
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                            <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                className="w-full bg-transparent border-none focus:ring-0 text-xs text-zinc-200 resize-none py-3 px-4 placeholder:text-zinc-600 outline-none min-h-[44px] max-h-32 scrollbar-none" 
                                placeholder={activeTab === 'doubts' ? "Ask a specific doubt to instructors..." : "Ask DocBot about this note..."} 
                                rows={1}
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!query.trim() || isSubmitting}
                            className="w-11 h-11 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-95 transition-all flex-shrink-0 disabled:opacity-50 disabled:hover:bg-blue-600 shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                activeTab === 'ai' ? <Bot className="w-4 h-4" /> : <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                    <p className="text-[9px] text-zinc-600 mt-3 text-center uppercase font-bold tracking-[0.2em]">
                        {activeTab === 'doubts' ? 'Doubts are persistent and visible to peers' : 'DocBot uses internal AI nodes'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NoteDetail;

