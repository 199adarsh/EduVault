import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import mammoth from 'mammoth';
import {
    ArrowLeft, Download, MessageSquare, Bot, X,
    FileText, User, Calendar, CheckCircle2, Send, Inbox, Loader2
} from 'lucide-react';
import DocumentLoadingBar from './DocumentLoadingBar';
import { FluidTabs } from './fluid-tabs';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const NoteDetail = () => {
    const { id: noteId } = useParams();
    const { profile } = useOutletContext();
    const navigate = useNavigate();
    
    const [note, setNote] = useState(null);
    const [doubts, setDoubts] = useState([]);
    const [activeTab, setActiveTab] = useState('doubts');
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [presignedUrl, setPresignedUrl] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [docxHtml, setDocxHtml] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
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

    useEffect(() => {
        if (!presignedUrl && !note?.fileUrl) return;
        let cancelled = false;

        const loadBlob = async () => {
            setDocLoading(true);
            let blob = null;

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
                if (ext === 'docx') {
                    try {
                        const arrayBuffer = await blob.arrayBuffer();
                        const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
                        const isZip = bytes[0] === 0x50 && bytes[1] === 0x4B;
                        if (isZip && typeof mammoth !== 'undefined' && mammoth?.convertToHtml) {
                            const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
                            if (html && html.trim().length > 0 && !cancelled) {
                                setDocxHtml(html);
                            }
                        }
                    } catch (mErr) {
                        console.warn('Docx preview fallback:', mErr?.message || mErr);
                    }
                }
            }
            setDocLoading(false);
        };

        loadBlob();
        return () => { cancelled = true; };
    }, [presignedUrl, note]);

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
        } catch {
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
            const customApiKey = localStorage.getItem('eduvault_custom_gemini_key') || localStorage.getItem('eduvault_gemini_api_key');
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    ...(customApiKey ? { 'X-Gemini-Api-Key': customApiKey } : {})
                },
                body: JSON.stringify({ 
                    question: userMsg.text,
                    noteId: noteId,
                    customApiKey: customApiKey || undefined,
                    apiKey: customApiKey || undefined
                })
            });

            let answer = null;
            if (response.ok) {
                const data = await response.json();
                if (data.answer && !data.answer.toLowerCase().includes("encountered an error")) {
                    answer = data.answer;
                }
            }

            if (typeof answer === 'string') {
                let clean = answer.trim();
                if (clean.startsWith('```json')) {
                    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (clean.startsWith('```')) {
                    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                if (clean.startsWith('{') && clean.includes('"answer"')) {
                    try {
                        const parsed = JSON.parse(clean);
                        if (parsed.answer) answer = parsed.answer;
                    } catch (e) {}
                }
            }

            if (!answer && customApiKey && note?.extractedText) {
                try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(customApiKey)}`;
                    const directRes = await fetch(geminiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{ 
                                parts: [{ 
                                    text: `You are an AI study tutor for the chapter "${note.title}". Answer the student's question concisely using the chapter content:\n\n=== CONTENT ===\n${note.extractedText.slice(0, 4000)}\n\n=== QUESTION ===\n${userMsg.text}` 
                                }] 
                            }]
                        })
                    });
                    if (directRes.ok) {
                        const directData = await directRes.json();
                        answer = directData.candidates?.[0]?.content?.parts?.[0]?.text;
                    }
                } catch (directErr) {
                    console.warn("Direct Gemini call in NoteDetail failed:", directErr);
                }
            }

            if (!answer) throw new Error("AI Logic Engine offline");

            setChatMessages(prev => [...prev, { 
                role: 'assistant', 
                text: answer 
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

    const handleDownload = () => {
        const downloadUrl = presignedUrl || (note?.fileUrl ? `${API_BASE}/files/raw/${note.fileUrl}` : null);
        if (!downloadUrl) {
            toast.error('File URL not available for download.');
            return;
        }

        setDownloading(true);
        setDownloadProgress(12);

        const interval = setInterval(() => {
            setDownloadProgress(p => {
                if (p >= 92) {
                    clearInterval(interval);
                    return 95;
                }
                return p + Math.floor(Math.random() * 15 + 10);
            });
        }, 110);

        setTimeout(() => {
            clearInterval(interval);
            setDownloadProgress(100);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = note?.fileUrl ? note.fileUrl.split('/').pop() : `${note?.title || 'document'}.pdf`;
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            toast.success('Document download started');
            setTimeout(() => {
                setDownloading(false);
                setDownloadProgress(0);
            }, 500);
        }, 650);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (activeTab === 'doubts') handlePostDoubt();
        else handleAIChat();
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F2F7FC] min-h-screen p-6">
                <DocumentLoadingBar 
                    inline 
                    message="Loading document..." 
                    submessage="Fetching document metadata and study discussions..." 
                />
            </div>
        );
    }

    if (!note) return null;

    const fileExt = note.fileUrl ? note.fileUrl.split('.').pop().toLowerCase() : '';
    const isPdf = fileExt === 'pdf';
    const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt);

    return (
        <div className="relative flex-1 flex flex-col bg-[#F2F7FC] overflow-hidden antialiased h-full w-full">
            {/* Global Overlay while downloading */}
            {downloading && (
                <DocumentLoadingBar 
                    progress={downloadProgress} 
                    message="Downloading document..." 
                    submessage={note.title} 
                />
            )}

            {/* Header - Slim, Unstop Theme Top Bar */}
            <div className="h-14 px-4 sm:px-6 bg-white border-b border-[#E2E2E2] flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button 
                        onClick={() => navigate('/notes')} 
                        className="p-2 bg-[#F2F7FC] hover:bg-[#DEEDFC] border border-[#E2E2E2] rounded-xl text-[#383838] transition-colors cursor-pointer shrink-0"
                        title="Back to Notes"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-[#0073E6] shrink-0" />
                        <h2 className="text-xs sm:text-sm font-bold text-[#383838] truncate max-w-[200px] sm:max-w-[450px]">{note.title}</h2>
                        {note.unit && (
                            <span className="hidden md:inline-block px-2.5 py-0.5 rounded-full bg-[#DEEDFC] text-[10px] font-semibold text-[#174073] border border-[#D9ECFF] shrink-0">
                                {note.unit}
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => setIsPanelOpen(true)}
                        className="px-3 py-1.5 bg-[#F2F7FC] hover:bg-[#DEEDFC] border border-[#E2E2E2] rounded-xl text-[#383838] transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                        title="Open Doubts & Discussions"
                    >
                        <MessageSquare className="w-3.5 h-3.5 text-[#0073E6]" />
                        <span className="hidden sm:inline">Doubts</span>
                        {doubts.length > 0 && (
                            <span className="px-1.5 py-0.2 rounded-full bg-[#0073E6] text-white text-[10px] font-bold">
                                {doubts.length}
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={handleDownload}
                        className="px-3.5 py-1.5 bg-[#0073E6] hover:bg-[#0060c0] rounded-xl text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs" 
                        title="Download Document"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Download</span>
                    </button>
                </div>
            </div>

            {/* Document Viewer Area */}
            <div className="flex-1 w-full h-[calc(100%-3.5rem)] min-h-0 bg-[#F2F7FC] relative flex flex-col overflow-hidden">
                {isPdf ? (
                    (docLoading || !blobUrl) ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F2F7FC]">
                            <DocumentLoadingBar 
                                inline 
                                message="Loading document..." 
                                submessage={note.title || "Preparing PDF viewer and caching streams..."} 
                            />
                        </div>
                    ) : (
                        <iframe 
                            src={`${blobUrl}#toolbar=0`} 
                            className="w-full h-full border-none bg-white"
                            title="Document Preview"
                        />
                    )
                ) : isOfficeDoc ? (
                    docLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F2F7FC]">
                            <DocumentLoadingBar 
                                inline 
                                message="Loading document..." 
                                submessage="Parsing document layout and generating inline preview..." 
                            />
                        </div>
                    ) : docxHtml ? (
                        <div className="flex-1 w-full h-full overflow-y-auto bg-[#F2F7FC] p-4 sm:p-6 md:p-8 text-[#383838]">
                            <div className="max-w-4xl mx-auto bg-white border border-[#E2E2E2] rounded-2xl p-6 sm:p-10 shadow-xs">
                                <div 
                                    className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-[#383838] prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed prose-table:border prose-td:border prose-td:p-2 prose-th:border prose-th:p-2 prose-th:bg-[#F2F7FC] [&_p]:mb-4 [&_h1]:mb-4 [&_h2]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                    dangerouslySetInnerHTML={{ __html: docxHtml }} 
                                />
                            </div>
                        </div>
                    ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                        <div className="flex-1 w-full h-full overflow-y-auto bg-[#F2F7FC] p-4 sm:p-6 md:p-8 text-[#383838]">
                            <div className="max-w-4xl mx-auto bg-white border border-[#E2E2E2] rounded-2xl p-6 sm:p-10 shadow-xs">
                                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#383838]">
                                    {note.extractedText}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F2F7FC]">
                            <div className="bg-white border border-[#E2E2E2] rounded-2xl p-8 max-w-md mx-auto text-center shadow-xs">
                                <FileText className="w-12 h-12 text-[#0073E6] mx-auto mb-4" />
                                <h3 className="text-base font-bold text-[#383838] tracking-tight">Word Document</h3>
                                <p className="text-xs text-[#727272] mt-2">No preview could be parsed automatically. Download original file below.</p>
                                <button 
                                    onClick={handleDownload}
                                    className="mt-6 px-5 py-2.5 bg-[#0073E6] hover:bg-[#0060c0] rounded-xl transition-all text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    <span>Download Document</span>
                                </button>
                            </div>
                        </div>
                    )
                ) : isImage ? (
                    <div className="flex-1 flex items-center justify-center p-4 bg-[#F2F7FC]">
                        <img 
                            src={blobUrl || 'about:blank'} 
                            alt={note.title}
                            className="max-w-full max-h-full object-contain rounded-xl border border-[#E2E2E2] bg-white shadow-xs"
                        />
                    </div>
                ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                    <div className="flex-1 w-full h-full overflow-y-auto bg-[#F2F7FC] p-4 sm:p-6 md:p-8 text-[#383838]">
                        <div className="max-w-4xl mx-auto bg-white border border-[#E2E2E2] rounded-2xl p-6 sm:p-10 shadow-xs">
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#383838]">
                                {note.extractedText}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F2F7FC]">
                        <div className="bg-white border border-[#E2E2E2] rounded-2xl p-8 max-w-md mx-auto text-center shadow-xs">
                            <FileText className="w-12 h-12 text-[#727272] mx-auto mb-4" />
                            <h3 className="text-base font-bold text-[#383838] tracking-tight">Preview Unavailable</h3>
                            <p className="text-xs text-[#727272] mt-2">This file cannot be previewed in browser. Please download to view.</p>
                            <button 
                                onClick={handleDownload}
                                className="mt-6 px-5 py-2.5 bg-[#0073E6] hover:bg-[#0060c0] rounded-xl transition-all text-xs font-semibold text-white cursor-pointer inline-flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download File</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Slide-out Overlay */}
            {isPanelOpen && (
                <div 
                    className="absolute inset-0 z-30 bg-black/25 backdrop-blur-2xs transition-opacity duration-300"
                    onClick={() => setIsPanelOpen(false)}
                />
            )}

            {/* Slide-out Panel */}
            <div className={`absolute top-0 right-0 h-full w-full sm:w-[450px] bg-white border-l border-[#E2E2E2] shadow-2xl transition-transform duration-300 ease-out z-40 flex flex-col ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                {/* Panel Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E2E2]">
                    <div>
                        <h3 className="text-base font-bold text-[#383838] tracking-tight">Questions &amp; Discussion</h3>
                        <p className="text-[11px] font-semibold text-[#0073E6] mt-0.5">AI Study Helper &amp; Discussion</p>
                    </div>
                    <button 
                        onClick={() => setIsPanelOpen(false)} 
                        className="p-1.5 text-[#727272] hover:text-[#383838] hover:bg-[#F2F7FC] rounded-lg transition-all border border-transparent hover:border-[#E2E2E2]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Metadata Section */}
                <div className="px-6 py-4 border-b border-[#E2E2E2] bg-[#F2F7FC]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-white text-[#174073] text-[10px] font-semibold rounded-md border border-[#E2E2E2]">
                            {note.unit || 'General'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-semibold rounded-md border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Notes
                        </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#383838] mb-2 leading-snug">{note.title}</h4>
                    <div className="flex items-center gap-4 text-[11px] text-[#727272]">
                        <div className="flex items-center gap-1.5"><User className="w-3.5 h-3.5"/> {note.uploadedBy || 'System'}</div>
                        <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> {new Date(note.createdAt).toLocaleDateString()}</div>
                    </div>
                </div>

                {/* Panel Tabs */}
                <div className="p-3 border-b border-[#E2E2E2] bg-white flex justify-center">
                    <FluidTabs
                        value={activeTab}
                        onChange={setActiveTab}
                        size="sm"
                        layoutId="note-detail-panel-tabs"
                        className="w-full bg-[#F2F7FC] border-[#E2E2E2]"
                        tabClassName="flex-1"
                        activeClassName="font-bold text-[#0073E6]"
                        inactiveClassName="font-semibold text-[#727272] hover:text-[#383838]"
                        indicatorClassName="absolute inset-0 rounded-full border border-[#D9ECFF] bg-white shadow-xs"
                        tabs={[
                            {
                                id: 'doubts',
                                label: `Doubts (${doubts.length})`,
                                icon: <MessageSquare className="w-3.5 h-3.5 mr-1" />
                            },
                            {
                                id: 'ai',
                                label: 'AI Note Helper',
                                icon: <Bot className="w-3.5 h-3.5 mr-1 text-[#0073E6]" />
                            }
                        ]}
                    />
                </div>

                {/* Content Area */}
                <div 
                    ref={scrollRef} 
                    className="flex-1 overflow-y-auto p-5 space-y-4 bg-white scroll-smooth"
                >
                    {activeTab === 'doubts' ? (
                        doubts.length > 0 ? (
                            doubts.map((doubt, i) => (
                                <div key={i} className="space-y-2.5 p-3.5 rounded-xl border border-[#E2E2E2] bg-[#F2F7FC]">
                                    <div className="flex gap-3">
                                        <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-[#E2E2E2] flex items-center justify-center text-[10px] font-bold text-[#174073]">
                                            {doubt.studentName?.substring(0, 2).toUpperCase() || 'AN'}
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-[#383838] truncate">{doubt.studentName}</span>
                                                <span className="text-[10px] text-[#727272]">{new Date(doubt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <p className="text-xs text-[#383838] leading-relaxed">{doubt.question}</p>
                                        </div>
                                    </div>
                                    {doubt.answer && (
                                        <div className="ml-11 bg-emerald-50 border-l-2 border-emerald-500 pl-3 py-2 rounded-r-lg">
                                            <span className="text-[10px] font-bold text-emerald-700 block mb-1">Instructor Response</span>
                                            <p className="text-xs text-[#383838] leading-relaxed">{doubt.answer}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-12 text-center">
                                <Inbox className="w-10 h-10 text-[#727272] mb-3" />
                                <p className="text-xs font-medium text-[#727272]">No questions posted yet</p>
                            </div>
                        )
                    ) : (
                        chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${msg.role === 'user' ? 'bg-[#0073E6] text-white rounded-br-xs' : 'bg-[#F2F7FC] text-[#383838] border border-[#E2E2E2] rounded-bl-xs'}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-headings:text-[#383838]">
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
                <div className="p-4 border-t border-[#E2E2E2] bg-[#F2F7FC]">
                    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
                        <div className="flex-1 bg-white border border-[#E2E2E2] rounded-xl overflow-hidden focus-within:border-[#0073E6] focus-within:ring-1 focus-within:ring-[#0073E6]/20 transition-all">
                            <textarea 
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSubmit(e);
                                    }
                                }}
                                className="w-full bg-transparent border-none focus:ring-0 text-xs text-[#383838] resize-none py-2.5 px-3.5 placeholder:text-[#727272] outline-none min-h-[42px] max-h-32" 
                                placeholder={activeTab === 'doubts' ? "Ask a question to teachers or classmates..." : "Ask AI about this document..."} 
                                rows={1}
                            />
                        </div>
                        <button 
                            type="submit"
                            disabled={!query.trim() || isSubmitting}
                            className="w-10 h-10 flex items-center justify-center bg-[#0073E6] text-white rounded-xl hover:bg-[#0060c0] active:scale-95 transition-all shrink-0 disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                            ) : (
                                activeTab === 'ai' ? <Bot className="w-4 h-4" /> : <Send className="w-4 h-4" />
                            )}
                        </button>
                    </form>
                    <p className="text-[10px] text-[#727272] mt-2.5 text-center font-medium">
                        {activeTab === 'doubts' ? 'Questions are visible to classmates and teachers' : 'AI answers based on this document'}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default NoteDetail;
