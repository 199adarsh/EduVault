import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const formatName = (fullName) => {
    if (!fullName) return "Scholar";
    const trimmed = fullName.trim();
    if (!trimmed) return "Scholar";
    return trimmed.split(/\s+/).map(word => {
        if (word.length <= 2 && word.toUpperCase() === word) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const getInitials = (fullName) => {
    if (!fullName) return "AH";
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
        return (parts[1][0] + parts[0][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
};

const AIAssistant = () => {
    const { profile, loading } = useOutletContext();
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            content: `Core Link Established. Welcome, ${profile?.name ? profile.name.split(' ')[0] : 'Scholar'}. I'm synced with your institutional knowledge vault. How can I assist with your course synthesis today?`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);

    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleClearChat = () => {
        setMessages([
            {
                role: 'ai',
                content: `Session reset. Academic memory re-initialized. What would you like to explore?`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        toast.success("Chat history cleared");
    };

    const handleNewChat = () => {
        handleClearChat();
    };

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: 'user',
            content: input.trim(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        const queryText = input.trim();
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: queryText, prn: profile?.prn })
            });

            if (!response.ok) throw new Error("Synthesis connection interrupted");

            const data = await response.json();

            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.answer || "I processed your request but could not synthesize a conclusive response.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                confidence: data.confidence
            }]);
        } catch (err) {
            toast.error(err.message);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "Unable to process query: " + err.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-canvas-bg font-sans text-text-primary antialiased overflow-hidden">
            <main className="w-full px-3.5 sm:px-8 py-2.5 max-w-4xl mx-auto flex flex-col h-full overflow-hidden">
                {/* Section Top Bar */}
                <div className="w-full pb-3 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle shrink-0">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                                AI Assistant
                            </h1>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Your academic AI assistant
                        </p>
                    </div>
                    {/* Header Actions */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleClearChat}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-card hover:bg-surface-subtle-blue text-text-secondary hover:text-primary transition-colors text-xs font-semibold border border-border-subtle cursor-pointer"
                            id="clearChatBtn"
                        >
                            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                            <span>Clear History</span>
                        </button>
                        <button
                            onClick={handleNewChat}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-primary hover:bg-primary-hover text-white font-semibold text-xs transition-all cursor-pointer"
                            id="newChatBtn"
                        >
                            <span className="material-symbols-outlined text-[16px]">add</span>
                            <span>New Chat</span>
                        </button>
                    </div>
                </div>

                {/* Messages Scrollable Stream */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto flex flex-col gap-5 py-4 min-h-0 pr-1" id="chatStream">
                    {messages.map((msg, i) => (
                        <React.Fragment key={i}>
                            {msg.role === 'user' ? (
                                /* User Message Bubble */
                                <div className="flex items-start justify-end gap-3.5 max-w-2xl self-end animate-in fade-in duration-200">
                                    <div className="flex flex-col items-end gap-1.5 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-text-secondary">{msg.time}</span>
                                            <span className="text-xs font-semibold text-text-primary">
                                                {formatName(profile?.name)}
                                            </span>
                                        </div>
                                        <div className="bg-primary text-white rounded-2xl rounded-tr-sm p-4 text-sm leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </div>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center font-semibold text-xs shrink-0">
                                        {getInitials(profile?.name)}
                                    </div>
                                </div>
                            ) : (
                                /* AI Synthesis Response Bubble */
                                <div className="flex items-start gap-3.5 max-w-3xl animate-in fade-in duration-200">
                                    <div className="w-9 h-9 rounded-xl bg-surface-subtle-blue flex items-center justify-center text-primary shrink-0">
                                        <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                                    </div>
                                    <div className="flex flex-col gap-2 min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-bold text-text-primary">
                                                EduVault Synthesizer
                                            </span>
                                            <span className="text-xs text-text-secondary">{msg.time}</span>
                                        </div>
                                        <div className={`rounded-2xl rounded-tl-sm p-5 space-y-3 border ${msg.isError
                                                ? 'bg-status-danger-bg text-status-danger-text border-red-200'
                                                : 'bg-surface-card text-text-primary border-border-subtle'
                                            }`}>
                                            <div className="text-sm leading-relaxed">
                                                <ReactMarkdown
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2.5 last:mb-0 leading-relaxed" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc list-outside ml-4 mb-2.5 space-y-1 text-text-primary" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal list-outside ml-4 mb-2.5 space-y-1 text-text-primary" {...props} />,
                                                        li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                                                        h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-text-primary mt-3 mb-2" {...props} />,
                                                        h2: ({ node, ...props }) => <h2 className="text-base font-bold text-text-primary mt-3 mb-1.5" {...props} />,
                                                        h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-text-primary mt-2 mb-1" {...props} />,
                                                        strong: ({ node, ...props }) => <strong className="font-bold text-text-primary" {...props} />,
                                                        pre: ({ node, ...props }) => <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-xl overflow-x-auto text-xs font-mono my-2.5 border border-slate-800" {...props} />,
                                                        code: ({ node, className, children, ...props }) => {
                                                            const isMultiLine = String(children).includes('\n');
                                                            if (!className && !isMultiLine) {
                                                                return <code className="bg-slate-100 text-primary px-1.5 py-0.5 rounded text-xs font-mono border border-slate-200/80 font-semibold" {...props}>{children}</code>;
                                                            }
                                                            return <code className={className} {...props}>{children}</code>;
                                                        },
                                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-3 border-primary pl-3 italic text-text-secondary my-2" {...props} />,
                                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-3"><table className="min-w-full divide-y divide-border-subtle border border-border-subtle text-xs" {...props} /></div>,
                                                        th: ({ node, ...props }) => <th className="bg-slate-50 px-3 py-2 text-left font-bold text-text-primary border-b border-border-subtle" {...props} />,
                                                        td: ({ node, ...props }) => <td className="px-3 py-2 border-b border-border-subtle text-text-secondary" {...props} />
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>

                                            {msg.confidence && (
                                                <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-border-subtle/40">
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-subtle-blue text-primary text-xs font-semibold">
                                                        <span className="material-symbols-outlined text-[15px]">verified_user</span>
                                                        <span>{Math.round(msg.confidence * 100)}% Confidence</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}

                    {/* Typing Loader */}
                    {isTyping && (
                        <div className="flex items-start gap-3.5 max-w-3xl animate-in fade-in duration-200">
                            <div className="w-9 h-9 rounded-xl bg-surface-subtle-blue flex items-center justify-center text-primary shrink-0">
                                <span className="material-symbols-outlined text-[20px] animate-pulse">smart_toy</span>
                            </div>
                            <div className="flex flex-col gap-2 min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-text-primary">EduVault Synthesizer</span>
                                    <span className="text-[11px] text-text-secondary">Synthesizing...</span>
                                </div>
                                <div className="bg-surface-card rounded-2xl rounded-tl-sm p-4 text-text-secondary border border-border-subtle inline-flex items-center gap-2 w-fit">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                    <span className="text-xs font-medium">Accessing institutional records...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Anchored Input Box Area */}
                <div className="shrink-0 pt-2 pb-16 md:pb-2 bg-canvas-bg">
                    <div className="rounded-xl bg-surface-card border border-border-subtle p-2.5 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                        {/* Context Header Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2">

                        </div>

                        {/* Text Input & Send Trigger */}
                        <div className="flex items-center gap-2">
                            <textarea
                                className="w-full resize-none bg-slate-50 rounded-lg px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:bg-white border border-transparent focus:border-border-subtle transition-all"
                                id="aiPromptInput"
                                placeholder="Inquire about subject patterns or academic synthesis..."
                                rows="1"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isTyping || !input.trim()}
                                className="w-8 h-8 rounded-lg bg-primary hover:bg-primary-hover text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:scale-100 shrink-0 cursor-pointer"
                                id="sendPromptBtn"
                                title="Send Query"
                            >
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </button>
                        </div>

                        {/* Micro Helper Footer */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mt-1.5 pt-1.5 text-[10px] text-text-secondary border-t border-border-subtle/50">
                            <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">keyboard</span>
                                Enter to send • Shift + Enter for new line
                            </span>
                            <span className="flex items-center gap-1 text-[10px]">
                                <span className="material-symbols-outlined text-[12px] text-primary">verified_user</span>
                                EduVault Synthesis Engine
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AIAssistant;
