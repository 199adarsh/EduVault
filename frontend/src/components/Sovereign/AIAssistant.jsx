import { isSubjectNameMatch } from "../../lib/noteUtils";
import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    SparklesIcon,
    Copy01Icon,
    Tick02Icon,
    RefreshIcon,
    Book02Icon,
    Layers01Icon,
    CheckmarkCircle02Icon,
    ArrowUp02Icon,
    Search01Icon,
} from "hugeicons-react";
import AiMascotInput from "@/components/ui/ai-mascot-input";

class AIAssistantErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("AIAssistant caught error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-white">
                    <div className="max-w-md w-full bg-white dark:bg-[#1C1C1E] border border-red-200 dark:border-red-900/50 rounded-2xl p-6 shadow-xs text-center">
                        <h3 className="text-sm font-bold text-red-600 mb-2">Notice in AI Assistant</h3>
                        <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mb-4">
                            {String(this.state.error?.message || this.state.error)}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                window.location.href = '/ai-assistant';
                            }}
                            className="px-4 py-2 bg-[#0071E3] text-white text-xs font-semibold rounded-xl cursor-pointer hover:bg-[#005BB5] transition-colors"
                        >
                            Reset Conversation
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}


const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const formatName = (fullName) => {
    if (!fullName) return "Scholar";
    const trimmed = fullName.trim();
    if (!trimmed) return "Scholar";
    return trimmed
        .split(/\s+/)
        .map((word) => {
            if (word.length <= 2 && word.toUpperCase() === word) return word;
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(" ");
};

const SUGGESTIONS = [
    {
        label: "Syllabus Breakdown",
        prompt: "Summarize the key modules and high-weightage topics in this syllabus.",
    },
    {
        label: "High-Yield PYQ Topics",
        prompt: "What questions and topics appear most frequently in past exam papers?",
    },
    {
        label: "Core Concept Explainer",
        prompt: "Explain the core concepts and fundamental principles simply with an applied example.",
    },
    {
        label: "Exam Revision Checklist",
        prompt: "Create a high-impact revision checklist for upcoming mid-term and end-term exams.",
    },
];

const AIAssistant = () => {
    const {
        profile,
        subjects = [],
        catalogSubjects = [],
        notes = [],
        loading = false,
    } = useOutletContext() || {};
    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedUnit, setSelectedUnit] = useState("all");
    const [copiedIndex, setCopiedIndex] = useState(null);

    const allKnownSubjects = useMemo(() => {
        const pool = subjects && subjects.length > 0 ? subjects : catalogSubjects || [];
        return Array.isArray(pool) ? pool.filter(Boolean) : [];
    }, [subjects, catalogSubjects]);

    const selectedSubject = searchParams.get("subjectId") || "all";
    const setSelectedSubject = useCallback(
        (val) => {
            setSearchParams(
                (prev) => {
                    const next = new URLSearchParams(prev);
                    if (val && val !== "all") {
                        next.set("subjectId", val);
                    } else {
                        next.delete("subjectId");
                    }
                    return next;
                },
                { replace: true }
            );
        },
        [setSearchParams]
    );

    const activeSubject = useMemo(() => {
        if (!selectedSubject || selectedSubject === "all") return null;
        const found = allKnownSubjects.find((s) => {
            if (!s) return false;
            if (typeof s === "string") return s.toLowerCase() === selectedSubject.toLowerCase();
            return (
                String(s.id) === String(selectedSubject) ||
                (s.code && String(s.code).toLowerCase() === String(selectedSubject).toLowerCase()) ||
                (s.name && String(s.name).toLowerCase() === String(selectedSubject).toLowerCase())
            );
        });
        if (found) return typeof found === "string" ? { id: found, name: found } : found;
        return { id: selectedSubject, name: selectedSubject };
    }, [allKnownSubjects, selectedSubject]);

    const isInvalidSubject = useMemo(() => {
        return Boolean(
            selectedSubject &&
            selectedSubject !== "all" &&
            allKnownSubjects.length > 0 &&
            !activeSubject
        );
    }, [selectedSubject, allKnownSubjects, activeSubject]);

    const subjectNotes = useMemo(() => {
        if (!activeSubject || !notes) return [];
        return (notes || []).filter(
            (n) =>
                n && (
                    String(n.subjectId) === String(activeSubject.id) ||
                    (activeSubject.code && String(n.subjectId) === String(activeSubject.code)) ||
                    (n.subject && (String(n.subject) === String(activeSubject.id) || String(n.subject) === String(activeSubject.name)))
                )
        );
    }, [activeSubject, notes]);

    const compiledCount = useMemo(() => {
        return (subjectNotes || []).filter((n) => n && n.okfStatus === "PROCESSED").length;
    }, [subjectNotes]);

    const pendingCount = useMemo(() => {
        return (subjectNotes || []).filter((n) => n && (n.okfStatus === "PENDING" || !n.okfStatus)).length;
    }, [subjectNotes]);

    const hasCompiledOkf = compiledCount > 0;

    const defaultInitialMessage = {
        role: "ai",
        content: `Hello ${profile?.name ? formatName(profile.name) : "Scholar"}. I am your academic study assistant, grounded in your syllabus, course notes, and exam archives. How can I assist your study session today?`,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
    };

    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem('eduvault_ai_tutor_messages');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (e) {
            console.error('Failed to parse saved ai chat:', e);
        }
        return [defaultInitialMessage];
    });

    useEffect(() => {
        try {
            if (messages && messages.length > 0) {
                localStorage.setItem('eduvault_ai_tutor_messages', JSON.stringify(messages));
            }
        } catch (e) {
            console.error('Failed to save ai chat:', e);
        }
    }, [messages]);

    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleClearChat = () => {
        const fresh = [
            {
                role: "ai",
                content: "Chat cleared. Ask any question about your courses, syllabus, or past exams.",
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                }),
            },
        ];
        setMessages(fresh);
        localStorage.setItem('eduvault_ai_tutor_messages', JSON.stringify(fresh));
        toast.success("Chat history cleared");
    };

    const handleCopy = (text, idx) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        toast.success("Copied to clipboard");
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const sendMessage = async (promptText) => {
        const queryText = (promptText || input).trim();
        if (!queryText) return;

        const userMessage = {
            role: "user",
            content: queryText,
            time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            }),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setIsTyping(true);

        let answer = null;
        let confidence = 0.95;
        let source = null;

        const customApiKey =
            localStorage.getItem("eduvault_custom_gemini_key") ||
            localStorage.getItem("eduvault_gemini_api_key");

        const currentSubjectId =
            activeSubject && selectedSubject && selectedSubject !== "all"
                ? activeSubject.id
                : undefined;
        const currentUnit =
            selectedUnit && selectedUnit !== "all" ? selectedUnit : undefined;

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(customApiKey ? { "X-Gemini-Api-Key": customApiKey } : {}),
                },
                body: JSON.stringify({
                    question: queryText,
                    prn: profile?.prn,
                    subjectId: currentSubjectId,
                    unit: currentUnit,
                    customApiKey: customApiKey || undefined,
                    apiKey: customApiKey || undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (
                    data.answer &&
                    !data.answer.toLowerCase().includes("encountered an error") &&
                    !data.answer.toLowerCase().includes("error processing")
                ) {
                    answer = data.answer;
                    confidence = data.confidence || 0.95;
                    source = data.source;
                }
            }
        } catch (err) {
            console.warn("Backend AI chat error:", err);
        }

        if (!answer && customApiKey) {
            try {
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(customApiKey)}`;
                const directRes = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: queryText }] }],
                    }),
                });
                if (directRes.ok) {
                    const directData = await directRes.json();
                    const candidate =
                        directData.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (candidate) {
                        answer = candidate;
                        confidence = 0.98;
                        source = "GENERAL_TUTOR";
                    }
                }
            } catch (directErr) {
                console.error("Direct Gemini call failed:", directErr);
            }
        }

        if (answer) {
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: answer,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    confidence,
                    source,
                    subjectId: currentSubjectId,
                },
            ]);
        } else {
            const fallbackMsg =
                "Unable to synthesize response. Ensure the backend service is running or check your API key in Settings.";
            toast.error(fallbackMsg);
            setMessages((prev) => [
                ...prev,
                {
                    role: "ai",
                    content: fallbackMsg,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                    }),
                    isError: true,
                },
            ]);
        }
        setIsTyping(false);
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="w-5 h-5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-[#F5F5F7] dark:bg-black font-sans text-[#1D1D1F] dark:text-[#F5F5F7] antialiased overflow-hidden">
            {/* Minimal Header */}
            <header className="h-12 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/70 dark:bg-[#1C1C1E]/70 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#34C759]" />
                    <span className="text-xs font-semibold text-[#1D1D1F] dark:text-white">
                        AI Academic Assistant
                    </span>
                    {activeSubject && (
                        <span className="text-[11px] font-medium text-[#0071E3] bg-[#0071E3]/10 px-2 py-0.5 rounded-full ml-1 truncate max-w-[200px]">
                            {activeSubject.name}
                        </span>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleClearChat}
                    className="p-1.5 text-[#6E6E73] hover:text-[#1D1D1F] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="Clear conversation"
                >
                    <RefreshIcon size={16} />
                </button>
            </header>

            {/* Main Chat Canvas (Full-width section scroll like ChatGPT) */}
            <main
                ref={scrollRef}
                className="flex-1 w-full overflow-y-auto select-text scroll-smooth relative"
                id="chatStream"
            >
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 flex flex-col gap-6 pt-6 pb-52 md:pb-40 min-h-full">
                    {/* Empty State / Welcome Screen */}
                    {messages.length <= 1 && (
                        <div className="flex flex-col items-center justify-center my-auto py-8 text-center select-none">
                            <div className="w-12 h-12 rounded-2xl bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] mb-4 shadow-xs">
                                <SparklesIcon size={24} />
                            </div>
                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1D1D1F] dark:text-white">
                                Hello, I am Caxiee !
                            </h2>
                            <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mt-1.5 max-w-md">
                                Your academic companion, ready to explain, guide, and help you learn.
                            </p>



                        </div>
                    )}

                    {/* Messages Flow */}
                    {messages.map((msg, i) => (
                        <div key={i} className="flex flex-col">
                            {msg.role === "user" ? (
                                <div className="self-end max-w-[85%] sm:max-w-[75%]">
                                    <div className="bg-[#E5E5EA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-3xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap select-text">
                                        {typeof msg.content === "string" ? msg.content : String(msg.content || "")}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-start gap-3 w-full group">
                                    <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5 select-none shadow-xs">
                                        <SparklesIcon size={14} />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7] select-text">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    p: ({ node, ...rest }) => (
                                                        <p className="mb-3 last:mb-0 leading-relaxed" {...rest} />
                                                    ),
                                                    ul: ({ node, ...rest }) => (
                                                        <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...rest} />
                                                    ),
                                                    ol: ({ node, ...rest }) => (
                                                        <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...rest} />
                                                    ),
                                                    li: ({ node, ...rest }) => (
                                                        <li className="leading-relaxed" {...rest} />
                                                    ),
                                                    h1: ({ node, ...rest }) => (
                                                        <h1 className="text-base font-bold text-[#1D1D1F] dark:text-white mt-4 mb-2" {...rest} />
                                                    ),
                                                    h2: ({ node, ...rest }) => (
                                                        <h2 className="text-sm font-bold text-[#1D1D1F] dark:text-white mt-3 mb-1.5" {...rest} />
                                                    ),
                                                    h3: ({ node, ...rest }) => (
                                                        <h3 className="text-xs font-semibold text-[#1D1D1F] dark:text-white mt-2 mb-1" {...rest} />
                                                    ),
                                                    strong: ({ node, ...rest }) => (
                                                        <strong className="font-semibold text-[#1D1D1F] dark:text-white" {...rest} />
                                                    ),
                                                    pre: ({ node, ...rest }) => (
                                                        <pre className="bg-[#1C1C1E] text-[#F5F5F7] p-3.5 rounded-xl overflow-x-auto text-xs font-mono my-3 border border-[#2C2C2E]" {...rest} />
                                                    ),
                                                    code: ({ node, className, children, ...rest }) => {
                                                        const isMultiLine = String(children).includes("\n");
                                                        if (!className && !isMultiLine) {
                                                            return (
                                                                <code className="bg-black/5 dark:bg-white/10 text-[#1D1D1F] dark:text-[#F5F5F7] px-1.5 py-0.5 rounded text-xs font-mono" {...rest}>
                                                                    {children}
                                                                </code>
                                                            );
                                                        }
                                                        return <code className={className} {...rest}>{children}</code>;
                                                    },
                                                    blockquote: ({ node, ...rest }) => (
                                                        <blockquote className="border-l-2 border-[#0071E3] pl-3 italic text-[#6E6E73] dark:text-[#AEAEB2] my-2" {...rest} />
                                                    ),
                                                    table: ({ node, ...rest }) => (
                                                        <div className="overflow-x-auto my-3">
                                                            <table className="min-w-full divide-y divide-[#E5E5EA] dark:divide-[#2C2C2E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-xs" {...rest} />
                                                        </div>
                                                    ),
                                                    th: ({ node, ...rest }) => (
                                                        <th className="bg-[#F5F5F7] dark:bg-[#2C2C2E] px-3 py-2 text-left font-semibold text-[#1D1D1F] dark:text-white border-b border-[#E5E5EA] dark:border-[#2C2C2E]" {...rest} />
                                                    ),
                                                    td: ({ node, ...rest }) => (
                                                        <td className="px-3 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] text-[#6E6E73] dark:text-[#AEAEB2]" {...rest} />
                                                    ),
                                                }}
                                                children={typeof msg.content === "string" ? msg.content : String(msg.content || "")}
                                            />
                                        </div>

                                        {/* Action Bar (Copy + Source Badge) */}
                                        <div className="flex items-center gap-2 mt-2 pt-1">
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(msg.content, i)}
                                                className="p-1 rounded text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white transition-colors cursor-pointer"
                                                title="Copy answer"
                                            >
                                                {copiedIndex === i ? (
                                                    <Tick02Icon size={14} className="text-[#34C759]" />
                                                ) : (
                                                    <Copy01Icon size={14} />
                                                )}
                                            </button>

                                            {msg.source === "OKF_KNOWLEDGE" && (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-full">
                                                    <CheckmarkCircle02Icon size={12} />
                                                    <span>Verified Syllabus</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Searching / Thinking State */}
                    {isTyping && (
                        <div className="flex items-start gap-3 w-full">
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] flex items-center justify-center text-[#0071E3] shrink-0 mt-0.5 shadow-xs">
                                <SparklesIcon size={14} />
                            </div>
                            <div className="flex items-center gap-2 py-1 text-xs text-[#6E6E73] dark:text-[#AEAEB2]">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#0071E3] animate-pulse" />
                                <span>Searching notes & syllabus context...</span>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Grounding & Chat Input Area (Fixed at bottom like ChatGPT) */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-[#F5F5F7] via-[#F5F5F7]/95 to-transparent dark:from-black dark:via-black/95 pt-8 pb-20 md:pb-4 z-10">
                <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pointer-events-auto">
                    <AiMascotInput
                        selectedSubject={selectedSubject}
                        setSelectedSubject={setSelectedSubject}
                        selectedUnit={selectedUnit}
                        setSelectedUnit={setSelectedUnit}
                        allKnownSubjects={allKnownSubjects}
                        isInvalidSubject={isInvalidSubject}
                        hasCompiledOkf={hasCompiledOkf}
                        compiledCount={compiledCount}
                        pendingCount={pendingCount}
                        subjectNotesCount={subjectNotes.length}
                        placeholder={
                            activeSubject
                                ? `Ask anything about ${activeSubject.name}...`
                                : "Ask anything across your courses, notes, and exam archives..."
                        }
                        onSubmit={(data) => sendMessage(data.prompt)}
                        isProcessing={isTyping}
                        disabled={isTyping}
                    />
                </div>
            </div>
        </div>
    );
};

const AIAssistantWrapped = (props) => <AIAssistantErrorBoundary><AIAssistant {...props} /></AIAssistantErrorBoundary>;
export default AIAssistantWrapped;
