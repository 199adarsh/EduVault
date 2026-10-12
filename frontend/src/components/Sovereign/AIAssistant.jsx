import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import {
    Bot,
    User,
    SendHorizonal,
    Cpu,
    History,
    Zap,
    Sparkles,
    Terminal,
    ArrowUp,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

const API_BASE = 'http://localhost:8081/api';

const AIAssistant = () => {
    const { profile, loading } = useOutletContext();
    const [messages, setMessages] = useState([
        {
            role: 'ai',
            content: `Core Link Established. Welcome, ${profile?.name?.split(' ')[0] || 'Scholar'}. I'm synced with your academic vault. How can I help you synthesize your materials?`,
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

    if (loading || !profile) {
        return (
            <div className="flex-1 flex items-center justify-center bg-black">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 text-zinc-800 animate-spin" />
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-700">Booting Logic Engine</p>
                </div>
            </div>
        );
    }

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage = {
            role: 'user',
            content: input,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        try {
            const response = await fetch(`${API_BASE}/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: input })
            });

            if (!response.ok) throw new Error("Logic Engine connection interrupted");

            const data = await response.json();

            setMessages(prev => [...prev, {
                role: 'ai',
                content: data.answer || "I processed your request but couldn't generate a clear synthesis.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                confidence: data.confidence
            }]);
        } catch (err) {
            toast.error(err.message);
            setMessages(prev => [...prev, {
                role: 'ai',
                content: "Error: " + err.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                isError: true
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-black text-zinc-100 antialiased font-sans">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/20 via-transparent to-transparent pointer-events-none" />

            {/* Chat Canvas */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-6 lg:px-10 pt-6 lg:pt-10 pb-48 max-w-4xl mx-auto w-full no-scrollbar relative z-10"
            >
                {/* Header Context */}
                <div className="mb-20 space-y-1">
                    <div className="flex items-center gap-2 text-blue-400 mb-1">
                        <Bot className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Sovereign Protocol</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Neural Logic Engine</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Institutional Knowledge Synthesis</p>
                </div>

                {/* Message Threads */}
                <div className="space-y-10">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn(
                            "flex animate-in fade-in slide-in-from-bottom-4 duration-500",
                            msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                            <div className={cn(
                                "flex gap-5 max-w-[85%]",
                                msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                            )}>
                                <div className={cn(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-500",
                                    msg.role === 'ai'
                                        ? 'bg-zinc-900 border-zinc-800 text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                                        : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                                )}>
                                    {msg.role === 'ai' ? <Bot size={18} strokeWidth={1.5} /> : <User size={18} strokeWidth={1.5} />}
                                </div>

                                <div className={cn(
                                    "space-y-3",
                                    msg.role === 'user' ? 'items-end' : 'items-start'
                                )}>
                                    <div className={cn(
                                        "text-[13px] leading-relaxed p-5 rounded-2xl border backdrop-blur-xl transition-all",
                                        msg.role === 'user'
                                            ? 'bg-zinc-900/30 border-zinc-800/50 text-zinc-200'
                                            : msg.isError
                                                ? 'bg-red-500/5 border-red-500/20 text-red-400'
                                                : 'bg-zinc-900/30 border-zinc-800/50 text-zinc-300 shadow-2xl'
                                    )}>
                                        {msg.content}
                                    </div>
                                    <div className={cn(
                                        "flex items-center gap-4 text-[9px] font-bold uppercase tracking-widest text-zinc-700",
                                        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                                    )}>
                                        {msg.confidence && (
                                            <span className="text-blue-500/40 font-black flex items-center gap-1">
                                                <ShieldCheck size={10} />
                                                {Math.round(msg.confidence * 100)}% RELIABILITY
                                            </span>
                                        )}
                                        <span>{msg.time}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Engine Processing */}
                    {isTyping && (
                        <div className="flex items-center gap-5 animate-in fade-in duration-300">
                            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                                <Loader2 size={18} className="animate-spin" strokeWidth={1.5} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-1 h-1 items-center">
                                    <div className="w-1 h-1 rounded-full bg-blue-500/30 animate-pulse"></div>
                                    <div className="w-1 h-1 rounded-full bg-blue-500/30 animate-pulse delay-75"></div>
                                    <div className="w-1 h-1 rounded-full bg-blue-500/30 animate-pulse delay-150"></div>
                                </div>
                                <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-600">Synthesizing Dataset...</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Input Module (Floating Bar) */}
            <div className="absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/95 to-transparent z-20">
                <div className="max-w-3xl mx-auto w-full">
                    <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl shadow-2xl overflow-hidden backdrop-blur-md">
                        {/* Status Bar */}
                        <div className="px-6 py-2.5 border-b border-zinc-800/50 flex items-center justify-between text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-600">
                            <div className="flex items-center gap-5">
                                <span className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2">
                                    <Cpu size={12} strokeWidth={1.5} />
                                    Context
                                </span>
                                <span className="hover:text-blue-400 cursor-pointer transition-colors flex items-center gap-2">
                                    <History size={12} strokeWidth={1.5} />
                                    Archives
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-blue-500/50">
                                <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
                                Quantum Sync Active
                            </div>
                        </div>

                        {/* Input Core */}
                        <div className="p-4 flex items-end gap-4">
                            <textarea
                                className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] text-zinc-200 placeholder-zinc-700 resize-none max-h-40 py-2 no-scrollbar outline-none font-medium leading-relaxed"
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
                                onInput={(e) => {
                                    e.target.style.height = 'auto';
                                    e.target.style.height = e.target.scrollHeight + 'px';
                                }}
                            ></textarea>
                            <button
                                onClick={handleSend}
                                disabled={isTyping || !input.trim()}
                                className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-10 disabled:grayscale disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                            >
                                <ArrowUp size={20} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Quick Tips */}
                        <div className="px-6 py-3 bg-white/[0.02] border-t border-zinc-800/50 flex items-center gap-6">
                            <div className="flex items-center gap-2 opacity-30">
                                <span className="text-[9px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">ENT</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest">Execute</span>
                            </div>
                            <div className="flex items-center gap-2 opacity-30">
                                <span className="text-[9px] font-bold bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400">SFT + ENT</span>
                                <span className="text-[8px] font-bold uppercase tracking-widest">Line Break</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;

