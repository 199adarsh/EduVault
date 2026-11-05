import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import mammoth from 'mammoth';
import {
    ArrowLeft02Icon,
    Download01Icon,
    Message01Icon,
    AiChat02Icon,
    Cancel01Icon,
    File01Icon,
    Tick02Icon,
    Copy01Icon,
    RefreshIcon,
    Search01Icon,
    Loading01Icon,
    SparklesIcon,
    ArrowUp02Icon
} from 'hugeicons-react';
import { Maximize2 } from 'lucide-react';
import DocumentLoadingBar from './DocumentLoadingBar';
import PdfViewer from './PdfViewer';
import FullScreenNoteViewer from './FullScreenNoteViewer';
import { cn } from '@/lib/utils';
import { getCachedNoteBlob, setCachedNoteBlob } from '@/lib/pdfCache';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

// In-memory instant caches for rapid note reopening
const presignedCache = new Map();
const blobCache = new Map();
const doubtsCache = new Map();

const NoteDetail = () => {
    const { id: noteId } = useParams();
    const { profile, setSidebarCollapsed, notes = [], catalogSubjects = [] } = useOutletContext() || {};
    const navigate = useNavigate();

    // Teacher role and subjects detection
    const userRole = localStorage.getItem('eduvault_user_role') || (profile?.dob === 'TEACHER' ? 'teacher' : 'student');
    const isTeacher = userRole === 'teacher' || userRole === 'faculty' || userRole === 'admin' || profile?.dob === 'TEACHER' || profile?.role === 'TEACHER';

    const teacherSubjects = React.useMemo(() => {
        try {
            const saved = localStorage.getItem('eduvault_teacher_subjects');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch { /* ignore */ }
        return profile?.selectedSubjects || profile?.subjectIds || [];
    }, [profile]);

    const cachedNote = (notes || []).find(n => String(n.id) === String(noteId));
    const [note, setNote] = useState(() => cachedNote || null);
    const [doubts, setDoubts] = useState(() => doubtsCache.get(noteId) || []);
    const [activeTab, setActiveTab] = useState('ai');
    const [loading, setLoading] = useState(() => !cachedNote);
    const [doubtQuery, setDoubtQuery] = useState('');
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Doubts access check: only teachers who selected this note's subject (and all students)
    const canViewDoubts = React.useMemo(() => {
        if (!isTeacher) return true;
        if (!teacherSubjects || teacherSubjects.length === 0) return false;
        const norm = teacherSubjects.map(s => (typeof s === 'string' ? s : s?.name || s?.id || '').toLowerCase().trim());
        const noteSubId = (note?.subjectId || '').toLowerCase().trim();
        const noteTitle = (note?.title || '').toLowerCase().trim();

        // Check catalog subjects for subject name and code matching
        const matchedCatalogSub = (notes || []).find(n => n.id === note?.id)?.subject ||
            (catalogSubjects || []).find(s => s.id?.toLowerCase() === noteSubId || s.name?.toLowerCase() === noteSubId);
        const subName = (matchedCatalogSub?.name || '').toLowerCase().trim();
        const subCode = (matchedCatalogSub?.code || '').toLowerCase().trim();

        return norm.some(s => s && (
            s === noteSubId ||
            noteSubId.includes(s) ||
            s.includes(noteSubId) ||
            (subName && (subName === s || subName.includes(s) || s.includes(subName))) ||
            (subCode && subCode === s) ||
            (noteTitle && (noteTitle.includes(s) || s.includes(noteTitle)))
        ));
    }, [isTeacher, teacherSubjects, note, catalogSubjects, notes]);
    const [aiQuery, setAiQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [presignedUrl, setPresignedUrl] = useState(null);
    const [blobUrl, setBlobUrl] = useState(null);
    const [pdfData, setPdfData] = useState(null);
    const [docxHtml, setDocxHtml] = useState(null);
    const [docLoading, setDocLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [chatMessages, setChatMessages] = useState([
        {
            role: 'assistant',
            text: "Hello! I am Caxie, your study assistant for this document. Ask any question, request key summaries, or clarify difficult topics."
        }
    ]);
    const [copiedIndex, setCopiedIndex] = useState(null);
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);

    // Minimize sidebar when side panel is open so notes and AI chat stay side-by-side
    useEffect(() => {
        if (isPanelOpen) {
            setSidebarCollapsed?.(true);
        } else {
            setSidebarCollapsed?.(false);
        }
        return () => {
            setSidebarCollapsed?.(false);
        };
    }, [isPanelOpen, setSidebarCollapsed]);

    // Auto-scroll chat stream
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatMessages, isSubmitting]);

    const handleCopyMessage = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleClearNoteChat = () => {
        setChatMessages([
            {
                role: 'assistant',
                text: "Chat cleared. What would you like to explore in this document?"
            }
        ]);
        toast.success("Chat cleared");
    };

    useEffect(() => {
        if (!noteId) return;

        // Populate from cache immediately if present
        if (presignedCache.has(noteId)) {
            setPresignedUrl(presignedCache.get(noteId));
        }
        if (blobCache.has(noteId)) {
            setBlobUrl(blobCache.get(noteId));
        }

        const fetchNoteData = async () => {
            try {
                const doubtHeaders = {
                    'X-User-Role': isTeacher ? 'teacher' : 'student',
                    'X-Teacher-Subjects': (teacherSubjects || []).map(s => typeof s === 'string' ? s : s?.name || s?.id || '').join(',')
                };
                const requests = [
                    axios.get(`${API_BASE}/notes/${noteId}`),
                    axios.get(`${API_BASE}/notes/${noteId}/doubts`, { headers: doubtHeaders }).catch(() => ({ data: [] }))
                ];
                if (!presignedCache.has(noteId)) {
                    requests.push(axios.get(`${API_BASE}/files/${noteId}/presigned`).catch(() => null));
                }

                const [noteRes, doubtsRes, fileRes] = await Promise.all(requests);
                if (noteRes?.data) {
                    setNote(noteRes.data);
                }
                const freshDoubts = doubtsRes?.data || [];
                setDoubts(freshDoubts);
                doubtsCache.set(noteId, freshDoubts);

                if (fileRes?.data?.url) {
                    presignedCache.set(noteId, fileRes.data.url);
                    setPresignedUrl(fileRes.data.url);
                }
            } catch (err) {
                console.error('Error fetching note details:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchNoteData();
    }, [noteId]);

    useEffect(() => {
        if (!presignedUrl && !note?.fileUrl) return;
        if (blobCache.has(noteId)) {
            setBlobUrl(blobCache.get(noteId));
            return;
        }

        let cancelled = false;
        const loadBlob = async () => {
            setDocLoading(true);
            let blob = null;

            // 0. Persistent IndexedDB Cache (0 KB B2 Bandwidth)
            try {
                const idbBlob = await getCachedNoteBlob(noteId);
                if (idbBlob) {
                    blob = idbBlob;
                }
            } catch (e) {
                console.warn('IDB read error:', e);
            }

            // 1. Direct Backend Note Raw Proxy (Guaranteed same-origin, bypasses B2 CORS)
            if (!blob && noteId) {
                try {
                    const res = await fetch(`${API_BASE}/files/${noteId}/raw`);
                    if (res.ok) {
                        blob = await res.blob();
                        setCachedNoteBlob(noteId, blob);
                    }
                } catch (e) {
                    console.warn('Direct backend raw fetch failed, trying presigned:', e);
                }
            }

            // 2. Fetch from fast B2 CDN presigned URL if not in local cache
            if (!blob && presignedUrl) {
                try {
                    const res = await fetch(presignedUrl);
                    if (res.ok) {
                        blob = await res.blob();
                        setCachedNoteBlob(noteId, blob);
                    }
                } catch (e) {
                    console.warn('Presigned fetch failed, falling back:', e);
                }
            }

            // 3. Fallback to local raw if presigned not working
            if (!blob && note?.fileUrl) {
                try {
                    const res = await fetch(`${API_BASE}/files/raw/${encodeURIComponent(note.fileUrl)}`);
                    if (res.ok) {
                        blob = await res.blob();
                        setCachedNoteBlob(noteId, blob);
                    }
                } catch (err) {
                    console.warn('Local raw fetch error:', err);
                }
            }

            if (cancelled) return;

            if (blob) {
                const bUrl = URL.createObjectURL(blob);
                blobCache.set(noteId, bUrl);
                setBlobUrl(bUrl);

                const ext = note?.fileUrl ? note.fileUrl.split('.').pop().toLowerCase() : '';
                if (ext === 'docx') {
                    try {
                        const arrayBuffer = await blob.arrayBuffer();
                        const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
                        if (!cancelled) setDocxHtml(html);
                    } catch (e) {
                        console.warn('DOCX parse error:', e);
                    }
                } else if (ext === 'pdf') {
                    try {
                        const arrayBuffer = await blob.arrayBuffer();
                        if (!cancelled) setPdfData(new Uint8Array(arrayBuffer));
                    } catch (e) {
                        console.warn('PDF arrayBuffer read error:', e);
                    }
                }
            }
            if (!cancelled) setDocLoading(false);
        };

        loadBlob();
        return () => {
            cancelled = true;
        };
    }, [presignedUrl, note?.fileUrl, noteId]);

    const handlePostDoubt = async () => {
        if (!doubtQuery.trim()) return;
        setIsSubmitting(true);
        try {
            const res = await axios.post(`${API_BASE}/notes/${noteId}/doubts`, {
                studentName: profile?.name || 'Anonymous Student',
                question: doubtQuery.trim()
            });
            setDoubts(prev => [res.data, ...prev]);
            setDoubtQuery('');
            toast.success('Doubt posted to instructor & classmates.');
        } catch {
            toast.error('Failed to post doubt.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAIChat = async (overridePrompt) => {
        const queryText = (overridePrompt || aiQuery).trim();
        if (!queryText) return;

        const userMsg = { role: 'user', text: queryText };
        setChatMessages(prev => [...prev, userMsg]);
        setAiQuery('');
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
                    } catch (e) { }
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
                                    text: `You are an academic study tutor for the document "${note.title}". Answer concisely using the chapter content:\n\n=== CONTENT ===\n${note.extractedText.slice(0, 4000)}\n\n=== QUESTION ===\n${userMsg.text}`
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

            if (!answer) throw new Error("AI service temporarily unavailable");

            setChatMessages(prev => [...prev, {
                role: 'assistant',
                text: answer
            }]);
        } catch (err) {
            toast.error(err.message);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                text: "Error: " + err.message,
                isError: true
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

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-[#F5F5F7] min-h-screen p-6">
                <DocumentLoadingBar
                    inline
                    message="Opening document..."
                    submessage="Fetching document metadata and discussions..."
                />
            </div>
        );
    }

    if (!note) return null;

    const fileExt = note.fileUrl ? note.fileUrl.split('.').pop().toLowerCase() : '';
    const isPdf = fileExt === 'pdf';
    const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(fileExt);
    const resolvedPdfUrl = blobUrl || presignedUrl || (note?.fileUrl ? (note.fileUrl.startsWith('http') ? note.fileUrl : `${API_BASE}/files/raw/${note.fileUrl}`) : null);

    return (
        <div className="relative flex-1 flex flex-col bg-[#F5F5F7] overflow-hidden antialiased h-full w-full font-sans text-[#1D1D1F]">
            {/* Global Overlay while downloading */}
            {downloading && (
                <DocumentLoadingBar
                    progress={downloadProgress}
                    message="Downloading document..."
                    submessage={note.title}
                />
            )}

            {/* Top Navigation Bar */}
            <header className="h-14 px-4 sm:px-6 bg-[#FFFFFF] border-b border-[#E5E5EA] flex items-center justify-between shrink-0 z-20">
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={() => navigate('/notes')}
                        className="p-2 bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] rounded-xl transition-colors cursor-pointer shrink-0 border border-[#E5E5EA]"
                        title="Back to Notes"
                    >
                        <ArrowLeft02Icon size={16} />
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                        <File01Icon size={16} className="text-[#0071E3] shrink-0" />
                        <h1 className="text-xs sm:text-sm font-semibold text-[#1D1D1F] truncate max-w-[200px] sm:max-w-[360px] md:max-w-[480px]">
                            {note.title}
                        </h1>
                        {note.unit && (
                            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#6E6E73] border border-[#E5E5EA] shrink-0">
                                {note.unit}
                            </span>
                        )}
                    </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            if (isPanelOpen && activeTab === 'ai') {
                                setIsPanelOpen(false);
                            } else {
                                setActiveTab('ai');
                                setIsPanelOpen(true);
                            }
                        }}
                        className={cn(
                            "px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95",
                            isPanelOpen && activeTab === 'ai'
                                ? "bg-[#0071E3] text-white shadow-xs"
                                : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA]"
                        )}
                    >
                        <AiChat02Icon size={16} />
                        <span>Ask AI</span>
                    </button>

                    {canViewDoubts && (
                        <button
                            onClick={() => {
                                if (isPanelOpen && activeTab === 'doubts') {
                                    setIsPanelOpen(false);
                                } else {
                                    setActiveTab('doubts');
                                    setIsPanelOpen(true);
                                }
                            }}
                            className={cn(
                                "px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer active:scale-95",
                                isPanelOpen && activeTab === 'doubts'
                                    ? "bg-[#0071E3] text-white shadow-xs"
                                    : "bg-[#F5F5F7] hover:bg-[#E5E5EA] text-[#1D1D1F] border border-[#E5E5EA]"
                            )}
                        >
                            <Message01Icon size={16} />
                            <span className="hidden sm:inline">Doubts</span>
                            {doubts.length > 0 && (
                                <span className={cn(
                                    "px-1.5 py-0.2 rounded-full text-[10px] font-bold",
                                    isPanelOpen && activeTab === 'doubts' ? "bg-white text-[#0071E3]" : "bg-[#0071E3] text-white"
                                    )}>
                                    {doubts.length}
                                </span>
                            )}
                        </button>
                    )}

                    {isTeacher && (
                        <button
                            onClick={() => setIsFullScreen(true)}
                            className="px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded-xl transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-xs active:scale-95"
                            title="Open Full Screen Note Annotator"
                        >
                            <Maximize2 size={14} />
                            <span className="hidden sm:inline">Open in Full Screen</span>
                            <span className="sm:hidden">Full Screen</span>
                        </button>
                    )}

                    <button
                        onClick={handleDownload}
                        className="px-3.5 py-1.5 bg-[#F5F5F7] hover:bg-[#E5E5EA] border border-[#E5E5EA] text-[#1D1D1F] rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                        title="Download Document"
                    >
                        <Download01Icon size={16} />
                        <span className="hidden sm:inline">Download</span>
                    </button>
                </div>
            </header>

            {/* Side-by-Side Content Canvas */}
            <div className="flex-1 w-full h-[calc(100%-3.5rem)] min-h-[450px] flex flex-col md:flex-row overflow-hidden relative">

                {/* LEFT: Notes Document Preview Area */}
                <div className={cn(
                    "h-full min-h-[450px] bg-[#F5F5F7] relative flex flex-col overflow-hidden transition-all duration-200",
                    isPanelOpen
                        ? "hidden md:flex flex-1 min-w-0 border-r border-[#E5E5EA]"
                        : "flex-1 w-full"
                )}>
                    {isPdf ? (
                        (!resolvedPdfUrl) ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F5F5F7]">
                                <DocumentLoadingBar
                                    inline
                                    message="Loading document..."
                                    submessage={note.title || "Preparing PDF viewer..."}
                                />
                            </div>
                        ) : (
                            <PdfViewer
                                url={resolvedPdfUrl}
                                data={pdfData}
                                presignedUrl={presignedUrl || resolvedPdfUrl}
                                title={note.title}
                                onDownload={handleDownload}
                            />
                        )
                    ) : isOfficeDoc ? (
                        docLoading ? (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F5F5F7]">
                                <DocumentLoadingBar
                                    inline
                                    message="Parsing document..."
                                    submessage="Preparing layout preview..."
                                />
                            </div>
                        ) : docxHtml ? (
                            <div className="flex-1 w-full h-full overflow-y-auto bg-[#F5F5F7] p-4 sm:p-6 text-[#1D1D1F]">
                                <div className="max-w-4xl mx-auto bg-white border border-[#E5E5EA] rounded-2xl p-6 sm:p-8 shadow-xs">
                                    <div
                                        className="docx-content prose prose-slate max-w-none prose-headings:font-semibold prose-headings:text-[#1D1D1F] prose-h1:text-2xl prose-h2:text-xl prose-p:text-sm prose-p:leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: docxHtml }}
                                    />
                                </div>
                            </div>
                        ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                            <div className="flex-1 w-full h-full overflow-y-auto bg-[#F5F5F7] p-4 sm:p-6 text-[#1D1D1F]">
                                <div className="max-w-4xl mx-auto bg-white border border-[#E5E5EA] rounded-2xl p-6 sm:p-8 shadow-xs">
                                    <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                                        <span>Document layout preview unavailable. Showing extracted text.</span>
                                    </div>
                                    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1D1D1F]">
                                        {note.extractedText}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F5F5F7]">
                                <div className="bg-white border border-[#E5E5EA] rounded-2xl p-8 max-w-md mx-auto text-center shadow-xs">
                                    <File01Icon size={36} className="text-[#0071E3] mx-auto mb-3" />
                                    <h3 className="text-base font-semibold text-[#1D1D1F]">Word Document</h3>
                                    <p className="text-xs text-[#6E6E73] mt-1.5 mb-5">Download original file to view with full fidelity.</p>
                                    <button
                                        onClick={handleDownload}
                                        className="px-4 py-2 bg-[#0071E3] hover:bg-[#005BB5] rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                        <Download01Icon size={16} />
                                        <span>Download File</span>
                                    </button>
                                </div>
                            </div>
                        )
                    ) : isImage ? (
                        <div className="flex-1 flex items-center justify-center p-4 bg-[#F5F5F7]">
                            <img
                                src={blobUrl || 'about:blank'}
                                alt={note.title}
                                className="max-w-full max-h-full object-contain rounded-2xl border border-[#E5E5EA] bg-white shadow-xs"
                            />
                        </div>
                    ) : note?.extractedText && note.extractedText.trim().length > 10 ? (
                        <div className="flex-1 w-full h-full overflow-y-auto bg-[#F5F5F7] p-4 sm:p-6 text-[#1D1D1F]">
                            <div className="max-w-4xl mx-auto bg-white border border-[#E5E5EA] rounded-2xl p-6 sm:p-8 shadow-xs">
                                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1D1D1F]">
                                    {note.extractedText}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#F5F5F7]">
                            <div className="bg-white border border-[#E5E5EA] rounded-2xl p-8 max-w-md mx-auto text-center shadow-xs">
                                <File01Icon size={36} className="text-[#8E8E93] mx-auto mb-3" />
                                <h3 className="text-base font-semibold text-[#1D1D1F]">Preview Unavailable</h3>
                                <p className="text-xs text-[#6E6E73] mt-1.5 mb-5">Please download the file directly to view its contents.</p>
                                <button
                                    onClick={handleDownload}
                                    className="px-4 py-2 bg-[#0071E3] hover:bg-[#005BB5] rounded-xl text-xs font-semibold text-white inline-flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                    <Download01Icon size={16} />
                                    <span>Download File</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* RIGHT: Side-by-Side ChatGPT-style AI Assistant Panel */}
                {isPanelOpen && (
                    <aside className="w-full md:w-[440px] lg:w-[480px] xl:w-[520px] shrink-0 h-full min-h-0 bg-[#FFFFFF] flex flex-col border-l border-[#E5E5EA] z-30 transition-all duration-200">
                        {/* Panel Header */}
                        <div className="h-12 px-4 border-b border-[#E5E5EA] bg-[#FFFFFF] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <AiChat02Icon size={18} className="text-[#0071E3] shrink-0" />
                                <span className="text-xs font-semibold text-[#1D1D1F] truncate">
                                    {activeTab === 'ai' ? 'Study Assistant' : 'Doubts & Discussion'}
                                </span>
                            </div>

                            <div className="flex items-center gap-1">
                                {activeTab === 'ai' && (
                                    <button
                                        type="button"
                                        onClick={handleClearNoteChat}
                                        className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                                        title="Clear conversation"
                                    >
                                        <RefreshIcon size={16} />
                                    </button>
                                )}
                                <button
                                    onClick={() => setIsPanelOpen(false)}
                                    className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7] rounded-lg transition-colors cursor-pointer"
                                    title="Close panel"
                                >
                                    <Cancel01Icon size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Stream / Messages History - Clean ChatGPT Flow */}
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto px-4 py-5 space-y-5 bg-white scroll-smooth min-h-0"
                        >
                            {activeTab === 'doubts' ? (
                                !canViewDoubts ? (
                                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-3 mx-auto">
                                            <Message01Icon size={24} />
                                        </div>
                                        <h3 className="text-sm font-semibold text-[#1D1D1F]">Subject Not Assigned</h3>
                                        <p className="text-xs text-[#6E6E73] max-w-xs mt-1.5 leading-relaxed">
                                            Doubts are only shown to teachers who have selected this subject ({note?.subjectId || 'this subject'}).
                                        </p>
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className="mt-4 px-3.5 py-1.5 bg-[#0071E3] hover:bg-[#005BB5] text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
                                        >
                                            Assign Subject in Settings
                                        </button>
                                    </div>
                                ) : doubts.length > 0 ? (
                                    doubts.map((doubt, i) => (
                                        <div key={i} className="space-y-2 p-3.5 rounded-2xl border border-[#E5E5EA] bg-[#F9F9FB]">
                                            <div className="flex gap-2.5">
                                                <div className="shrink-0 w-7 h-7 rounded-full bg-[#E5E5EA] flex items-center justify-center text-[10px] font-semibold text-[#1D1D1F]">
                                                    {doubt.studentName?.substring(0, 2).toUpperCase() || 'ST'}
                                                </div>
                                                <div className="space-y-1 flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs font-semibold text-[#1D1D1F] truncate">{doubt.studentName}</span>
                                                        <span className="text-[10px] text-[#8E8E93]">
                                                            {new Date(doubt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[#1D1D1F] leading-relaxed">{doubt.question}</p>
                                                </div>
                                            </div>
                                            {doubt.answer && (
                                                <div className="ml-9 bg-white border-l-2 border-[#0071E3] pl-3 py-2 rounded-r-xl border border-[#E5E5EA]">
                                                    <span className="text-[10px] font-semibold text-[#0071E3] block mb-0.5">Instructor Response</span>
                                                    <p className="text-xs text-[#1D1D1F] leading-relaxed">{doubt.answer}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center py-16 text-center">
                                        <Message01Icon size={32} className="text-[#8E8E93] mb-2" />
                                        <p className="text-xs font-medium text-[#6E6E73]">No doubts posted yet</p>
                                    </div>
                                )
                            ) : (
                                <div className="flex flex-col gap-5">
                                    {/* Messages - Exact ChatGPT Style Stream */}
                                    {chatMessages.map((msg, i) => {
                                        const isUser = msg.role === 'user';
                                        return (
                                            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1 w-full`}>
                                                {isUser ? (
                                                    <div className="max-w-[85%] bg-[#F4F4F4] text-[#1D1D1F] px-4 py-2.5 rounded-2xl rounded-tr-sm text-xs leading-relaxed">
                                                        {msg.text}
                                                    </div>
                                                ) : (
                                                    /* Assistant Response (Clean markdown, no boxed headers, no filenames) */
                                                    <div className="w-full space-y-1.5 group">
                                                        <div className="prose prose-sm max-w-none text-[#1D1D1F] leading-relaxed text-xs">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkGfm]}
                                                                components={{
                                                                    table: ({ node, ...rest }) => (
                                                                        <div className="overflow-x-auto my-2">
                                                                            <table className="min-w-full divide-y divide-[#E5E5EA] border border-[#E5E5EA] text-xs" {...rest} />
                                                                        </div>
                                                                    ),
                                                                    th: ({ node, ...rest }) => (
                                                                        <th className="bg-[#F5F5F7] px-2.5 py-1.5 text-left font-semibold text-[#1D1D1F] border-b border-[#E5E5EA]" {...rest} />
                                                                    ),
                                                                    td: ({ node, ...rest }) => (
                                                                        <td className="px-2.5 py-1.5 border-b border-[#E5E5EA] text-[#6E6E73]" {...rest} />
                                                                    ),
                                                                }}
                                                                children={typeof msg.text === "string" ? msg.text : String(msg.text || "")}
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 pt-1 opacity-60 hover:opacity-100 transition-opacity">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyMessage(msg.text, i)}
                                                                className="p-1 text-[#8E8E93] hover:text-[#1D1D1F] rounded transition-colors cursor-pointer"
                                                                title="Copy response"
                                                            >
                                                                {copiedIndex === i ? (
                                                                    <Tick02Icon size={14} className="text-[#34C759]" />
                                                                ) : (
                                                                    <Copy01Icon size={14} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {/* Clean, Simple ChatGPT-style Loading State */}
                                    {isSubmitting && (
                                        <div className="flex items-center gap-2 py-2 text-xs text-[#6E6E73]">
                                            <div className="flex items-center gap-1.5">
                                                <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse" />
                                                <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse [animation-delay:200ms]" />
                                                <span className="w-2 h-2 rounded-full bg-[#0071E3] animate-pulse [animation-delay:400ms]" />
                                            </div>
                                            <span className="text-[12px] font-medium text-[#8E8E93] ml-1">
                                                Searching knowledge...
                                            </span>
                                        </div>
                                    )}

                                    {/* Suggested Starters on initial conversation */}

                                </div>
                            )}
                        </div>

                        {/* ChatGPT-style Minimalist Capsule Composer */}
                        <div className="p-3 bg-white border-t border-[#E5E5EA] shrink-0">
                            {activeTab === 'ai' ? (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (!aiQuery.trim() || isSubmitting) return;
                                        handleAIChat();
                                    }}
                                    className="flex flex-col bg-[#F4F4F4] focus-within:bg-white rounded-3xl border border-[#E5E5EA] focus-within:border-[#D1D1D6] focus-within:shadow-xs px-3.5 py-2 transition-all"
                                >
                                    <textarea
                                        ref={textareaRef}
                                        value={aiQuery}
                                        onChange={(e) => setAiQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (aiQuery.trim() && !isSubmitting) {
                                                    handleAIChat();
                                                }
                                            }
                                        }}
                                        rows={2}
                                        placeholder="Message study assistant..."
                                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                                        className="w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none resize-none text-xs text-[#1D1D1F] placeholder:text-[#8E8E93] leading-relaxed p-1"
                                    />

                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] text-[#8E8E93] pl-1 select-none">
                                            Grounded in document
                                        </span>

                                        <button
                                            type="submit"
                                            disabled={!aiQuery.trim() || isSubmitting}
                                            aria-label="Send message"
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                aiQuery.trim() && !isSubmitting
                                                    ? "bg-[#1D1D1F] hover:bg-black text-white active:scale-95 shadow-xs"
                                                    : "bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed opacity-60"
                                            )}
                                        >
                                            {isSubmitting ? (
                                                <Loading01Icon size={14} className="animate-spin" />
                                            ) : (
                                                <ArrowUp02Icon size={15} />
                                            )}
                                        </button>
                                    </div>
                                </form>
                            ) : !canViewDoubts ? (
                                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-center">
                                    <p className="text-xs font-medium text-amber-800">
                                        You are not assigned to this subject. Doubts are only available to teachers who have selected it.
                                    </p>
                                </div>
                            ) : (
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (doubtQuery.trim() && !isSubmitting) handlePostDoubt();
                                    }}
                                    className="flex flex-col bg-[#F4F4F4] focus-within:bg-white rounded-3xl border border-[#E5E5EA] focus-within:border-[#D1D1D6] focus-within:shadow-xs px-3.5 py-2 transition-all"
                                >
                                    <textarea
                                        value={doubtQuery}
                                        onChange={(e) => setDoubtQuery(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (doubtQuery.trim() && !isSubmitting) handlePostDoubt();
                                            }
                                        }}
                                        rows={2}
                                        placeholder="Post a doubt for teachers & classmates..."
                                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                                        className="w-full bg-transparent border-0 outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 shadow-none resize-none text-xs text-[#1D1D1F] placeholder:text-[#8E8E93] leading-relaxed p-1"
                                    />
                                    <div className="flex items-center justify-between pt-1">
                                        <span className="text-[10px] text-[#8E8E93] pl-1 select-none">
                                            Notifies enrolled class
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={!doubtQuery.trim() || isSubmitting}
                                            aria-label="Post doubt"
                                            className={cn(
                                                "w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0",
                                                doubtQuery.trim() && !isSubmitting
                                                    ? "bg-[#1D1D1F] hover:bg-black text-white active:scale-95 shadow-xs"
                                                    : "bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed opacity-60"
                                            )}
                                        >
                                            {isSubmitting ? (
                                                <Loading01Icon size={14} className="animate-spin" />
                                            ) : (
                                                <ArrowUp02Icon size={15} />
                                            )}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </aside>
                )}
            </div>

            {/* Full-Screen Annotator Overlay (Active only when teacher opens full screen, resets on exit) */}
            {isFullScreen && (
                <FullScreenNoteViewer
                    note={note}
                    isPdf={isPdf}
                    resolvedPdfUrl={resolvedPdfUrl}
                    pdfData={pdfData}
                    docxHtml={docxHtml}
                    blobUrl={blobUrl}
                    onClose={() => setIsFullScreen(false)}
                />
            )}
        </div>
    );
};

export default NoteDetail;
