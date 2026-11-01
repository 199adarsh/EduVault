import React, { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Smooth Animated Dummy Loading Progress Bar
 * Animates from 0% to ~95% during loading/opening/downloading of documents,
 * and up to 100% on complete.
 */
const DocumentLoadingBar = ({
    progress: controlledProgress,
    message = 'Loading document...',
    submessage,
    inline = false,
    dark = false,
    className
}) => {
    const isControlled = typeof controlledProgress === 'number' && Number.isFinite(controlledProgress);
    const [autoProgress, setAutoProgress] = useState(12);

    useEffect(() => {
        if (isControlled) return;

        // Auto-animate dummy loading progress from ~12% up to 95%
        const interval = setInterval(() => {
            setAutoProgress(prev => {
                if (prev >= 95) return 95;
                const remaining = 95 - prev;
                // Realistic progress tapering: fast at start, slower as it nears 95%
                const step = Math.max(1, Math.floor(remaining * 0.15) + (Math.random() > 0.6 ? 2 : 1));
                return Math.min(95, prev + step);
            });
        }, 90);

        return () => clearInterval(interval);
    }, [isControlled]);

    const activeProgress = isControlled ? controlledProgress : autoProgress;
    const safeProgress = Number.isFinite(Number(activeProgress)) ? Number(activeProgress) : 0;
    const rounded = Math.min(100, Math.max(0, Math.round(safeProgress)));
    const isDone = rounded >= 100;

    const content = (
        <div className={cn(
            "w-full max-w-md rounded-2xl p-5 shadow-xl transition-all duration-300",
            dark
                ? "bg-zinc-900/95 border border-zinc-800 text-zinc-100 shadow-black/40"
                : "bg-white border border-slate-200/90 text-slate-800 shadow-slate-200/50",
            className
        )}>
            {/* Header: Icon, Message & Percentage */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center relative shadow-xs shrink-0",
                        isDone
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : dark
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-blue-50 text-blue-600 border border-blue-200"
                    )}>
                        {isDone ? (
                            <CheckCircle2 className="w-4 h-4 animate-in zoom-in" />
                        ) : (
                            <FileText className="w-4 h-4 animate-pulse" />
                        )}
                        {!isDone && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping opacity-75" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className={cn(
                            "text-xs font-bold tracking-tight truncate",
                            dark ? "text-zinc-100" : "text-slate-900"
                        )}>
                            {isDone ? "Document Ready" : message}
                        </h4>
                        <p className={cn(
                            "text-[11px] truncate max-w-[260px]",
                            dark ? "text-zinc-400" : "text-slate-500"
                        )}>
                            {submessage || (isDone ? "Opening content..." : "Streaming document from Backblaze B2 storage...")}
                        </p>
                    </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                    <span className={cn(
                        "text-xs font-black tabular-nums tracking-tight",
                        isDone
                            ? "text-emerald-500"
                            : dark ? "text-blue-400" : "text-blue-600"
                    )}>
                        {String(rounded)}%
                    </span>
                </div>
            </div>

            {/* Smooth Animated Progress Bar Track */}
            <div className={cn(
                "w-full h-2 rounded-full overflow-hidden relative",
                dark ? "bg-zinc-800" : "bg-slate-100"
            )}>
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out relative rounded-full",
                        isDone
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400"
                    )}
                    style={{ width: `${rounded}%` }}
                >
                    {!isDone && (
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    )}
                </div>
            </div>

            {/* Footer status tip */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 dark:text-zinc-500">
                <span className="inline-flex items-center gap-1.5">
                    {!isDone ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
                            <span>{rounded < 50 ? "Fetching document chunks..." : rounded < 90 ? "Verifying checksums & parsing layout..." : "Finalizing preview..."}</span>
                        </>
                    ) : (
                        <span>Complete</span>
                    )}
                </span>
                <span className="uppercase font-semibold tracking-wider text-[9px]">Campusaxis PDF Engine</span>
            </div>
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
            {content}
        </div>
    );
};

export default DocumentLoadingBar;
