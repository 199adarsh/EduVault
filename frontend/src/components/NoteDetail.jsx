import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft, Download, ExternalLink, MessageSquare, Bot, X,
    FileText, User, Calendar, CheckCircle2, Send, Inbox
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

    // Fetch file as blob for iframe rendering (bypasses X-Frame-Options)
    useEffect(() => {
        if (!presignedUrl && !note?.fileUrl) return;
        let cancelled = false;

        const loadBlob = async () => {
            try {
                if (presignedUrl) {
                    const res = await fetch(presignedUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
                        return;
                    }
                }
            } catch (e) {
                console.warn('Presigned fetch failed, falling back to local file API:', e);
            }

            // Fallback to local server raw file endpoint
            if (note?.fileUrl && !cancelled) {
                try {
                    const fallbackUrl = `${API_BASE}/files/raw/${note.fileUrl}`;
                    const res = await fetch(fallbackUrl);
                    if (res.ok) {
                        const blob = await res.blob();
                        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
                    }
                } catch (err) {
                    console.error('Failed to fetch file blob fallback:', err);
                }
            }
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
        <div className="relative flex-1 flex flex-col bg-black overflow-hidden antialiased h-[100dvh] md:h-[90dvh] m-0 md:m-4 rounded-none md:rounded-3xl border-0 md:border border-zinc-800/50">
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-6 py-6 bg-gradient-to-b from-black via-black/80 to-transparent pointer-events-none">
                <div className="flex items-center gap-4 pointer-events-auto">
                    <button onClick={() => navigate('/notes')} className="p-2.5 bg-zinc-900/80 hover:bg-zinc-800 backdrop-blur-md border border-zinc-800/80 rounded-xl transition-all duration-300 text-zinc-400 hover:text-white shadow-xl">
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="bg-zinc-900/80 backdrop-blur-md border border-zinc-800/80 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-xl">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <h2 className="text-sm font-bold text-zinc-100 tracking-tight truncate max-w-[300px] md:max-w-[500px]">{note.title}</h2>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 pointer-events-auto">
                    <a 
                        href={presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : '#')}
                        download
                        className="p-2.5 bg-blue-600/20 hover:bg-blue-600/40 backdrop-blur-md border border-blue-500/30 rounded-xl transition-all duration-300 text-blue-400 hover:text-blue-300 shadow-xl" 
                        title="Download Source"
                    >
                        <Download className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Document Viewer Area */}
            <div className="flex-1 w-full h-full pt-20 pb-0 md:pb-4 px-0 md:px-4 lg:px-6 flex">
                <div className="w-full h-full rounded-none md:rounded-2xl overflow-hidden border-0 md:border border-zinc-800/50 bg-zinc-950/80 shadow-2xl relative flex flex-col">
                    {isPdf ? (
                        <iframe 
                            src={blobUrl ? `${blobUrl}#toolbar=0` : 'about:blank'} 
                            className="w-full flex-1 border-none bg-white rounded-2xl"
                            title="Document Preview"
                        />
                    ) : isOfficeDoc ? (
                        <iframe 
                            src={presignedUrl ? `https://docs.google.com/gview?url=${encodeURIComponent(presignedUrl)}&embedded=true` : 'about:blank'} 
                            className="w-full flex-1 border-none bg-white rounded-2xl"
                            title="Document Preview"
                        />
                    ) : isImage ? (
                        <div className="flex-1 flex items-center justify-center p-8 bg-zinc-900/20">
                            <img 
                                src={blobUrl || 'about:blank'} 
                                alt={note.title}
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                            />
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-900/20">
                            <FileText className="w-16 h-16 text-zinc-800 mb-6" />
                            <h3 className="text-xl font-bold text-zinc-300 tracking-tight">Preview Unavailable</h3>
                            <p className="text-xs text-zinc-500 mt-2 max-w-sm">This asset format requires external viewing. Please download to access.</p>
                            <a 
                                href={presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : '#')}
                                download
                                className="mt-8 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/50 rounded-xl transition-all text-xs font-bold text-white uppercase tracking-widest"
                            >
                                Download Asset
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Action Button for Panel */}
            <div className={`absolute bottom-8 right-10 z-20 transition-all duration-700 ease-in-out ${isPanelOpen ? 'translate-y-24 opacity-0 pointer-events-none scale-90' : 'translate-y-0 opacity-100 scale-100'}`}>
                <div className="relative group cursor-pointer" onClick={() => setIsPanelOpen(true)}>
                    <div className="absolute -inset-1 bg-blue-600/40 rounded-full blur-md opacity-70 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-pulse"></div>
                    <button className="relative flex items-center gap-4 px-6 py-3 bg-zinc-950/90 hover:bg-zinc-900 backdrop-blur-xl border border-zinc-800 hover:border-zinc-700 text-white rounded-full transition-all duration-300 shadow-xl">
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 shadow-inner group-hover:scale-110 transition-transform duration-500">
                            <Bot className="w-4 h-4 text-white absolute" />
                        </div>
                        <div className="flex flex-col items-start pr-2">
                            <span className="text-[10px] font-black tracking-[0.2em] uppercase text-blue-400 group-hover:text-blue-300 transition-colors">DocBot & Doubts</span>
                            <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">Interact & Learn</span>
                        </div>
                    </button>
                </div>
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

