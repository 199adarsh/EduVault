import React, { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Smooth Animated Document Loading Bar
 * Styled according to Unstop Design System (clean white cards, #0073E6 accent, #F2F7FC background)
 */
const DocumentLoadingBar = ({
    progress: controlledProgress,
    message = 'Loading document...',
    submessage,
    inline = false,
    className
}) => {
    const isControlled = typeof controlledProgress === 'number' && Number.isFinite(controlledProgress);
    const [autoProgress, setAutoProgress] = useState(12);

    useEffect(() => {
        if (isControlled) return;

        const interval = setInterval(() => {
            setAutoProgress(prev => {
                if (prev >= 95) return 95;
                const remaining = 95 - prev;
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
            "w-full max-w-md rounded-2xl p-5 bg-white border border-[#E2E2E2] text-[#383838] shadow-sm transition-all duration-300",
            className
        )}>
            {/* Header: Icon, Message & Percentage */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border",
                        isDone
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : "bg-[#DEEDFC] text-[#0073E6] border-[#D9ECFF]"
                    )}>
                        {isDone ? (
                            <CheckCircle2 className="w-4 h-4 animate-in zoom-in" />
                        ) : (
                            <FileText className="w-4 h-4" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-xs font-bold text-[#383838] tracking-tight truncate">
                            {isDone ? "Document Ready" : message}
                        </h4>
                        <p className="text-[11px] text-[#727272] truncate max-w-[260px]">
                            {submessage || (isDone ? "Opening preview..." : "Fetching document content...")}
                        </p>
                    </div>
                </div>

                <div className="text-right shrink-0 pl-3">
                    <span className={cn(
                        "text-xs font-bold tabular-nums tracking-tight",
                        isDone ? "text-emerald-600" : "text-[#0073E6]"
                    )}>
                        {String(rounded)}%
                    </span>
                </div>
            </div>

            {/* Smooth Animated Progress Bar Track */}
            <div className="w-full h-2 rounded-full overflow-hidden relative bg-[#F2F7FC] border border-[#E2E2E2]">
                <div
                    className={cn(
                        "h-full transition-all duration-300 ease-out rounded-full",
                        isDone ? "bg-emerald-500" : "bg-[#0073E6]"
                    )}
                    style={{ width: `${rounded}%` }}
                />
            </div>

            {/* Footer status tip */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-[#727272]">
                <span className="inline-flex items-center gap-1.5">
                    {!isDone ? (
                        <>
                            <Loader2 className="w-3 h-3 animate-spin text-[#0073E6]" />
                            <span>{rounded < 50 ? "Fetching document chunks..." : rounded < 90 ? "Verifying format & parsing layout..." : "Finalizing preview..."}</span>
                        </>
                    ) : (
                        <span>Complete</span>
                    )}
                </span>
                <span className="font-semibold text-[10px] text-[#174073]">EduVault Cloud Reader</span>
            </div>
        </div>
    );

    if (inline) {
        return content;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25 backdrop-blur-2xs animate-in fade-in duration-200">
            {content}
        </div>
    );
};

export default DocumentLoadingBar;
