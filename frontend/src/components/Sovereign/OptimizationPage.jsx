import React from 'react';
import { useOutletContext } from 'react-router-dom';
import OptimizationPanel from '../OptimizationPanel';
import { Sparkles } from 'lucide-react';

const OptimizationPage = () => {
    const { subjects, loading } = useOutletContext();
    
    const saved = localStorage.getItem('eduvault_excluded_subjects');
    const excludedIds = saved ? JSON.parse(saved) : [];
    
    const activeSubjects = subjects?.filter(s => !excludedIds.includes(s.id)) || [];

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] w-full text-zinc-400 font-mono uppercase tracking-[0.3em] gap-4 animate-pulse">
                <Sparkles className="w-5 h-5 text-blue-400" />
                <span className="text-[8px]">Synchronizing...</span>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-10 space-y-10 max-w-[1400px] mx-auto w-full no-scrollbar bg-black min-h-screen antialiased">
            <div className="flex justify-between items-center mb-8 px-1">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-purple-400 mb-1">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">Algorithmic Planning</span>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Optimization Center</h1>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-[0.2em] opacity-60">Predictive Strategy & Risk Mitigation</p>
                </div>
            </div>
            
            <OptimizationPanel subjects={activeSubjects} />
            
            <div className="mt-5 bg-zinc-900/30 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 transition-all hover:border-zinc-700/50 shadow-2xl shadow-blue-500/5">
                <h3 className="text-[8px] font-black text-zinc-400 mb-5 uppercase tracking-[0.3em]">System Architecture</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-1">
                    <div className="space-y-1.5">
                        <div className="text-blue-400 font-black text-[8px] uppercase tracking-[0.2em]">01. Assessment</div>
                        <p className="text-[9px] text-zinc-300 leading-relaxed font-medium">Projects future deficits based on remaining sessions and target thresholds.</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="text-blue-400 font-black text-[8px] uppercase tracking-[0.2em]">02. Efficiency</div>
                        <p className="text-[9px] text-zinc-300 leading-relaxed font-medium">Weights sessions by impact to maximize stability with minimum input.</p>
                    </div>
                    <div className="space-y-1.5">
                        <div className="text-blue-400 font-black text-[8px] uppercase tracking-[0.2em]">03. Strategy</div>
                        <p className="text-[9px] text-zinc-300 leading-relaxed font-medium">Allocates mandatory attendance then unlocks validated bunk budgets.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OptimizationPage;
