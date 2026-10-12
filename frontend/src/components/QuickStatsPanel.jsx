import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpen, FileText, Clock, CheckCircle, GraduationCap } from 'lucide-react';

const API_BASE = 'http://localhost:8081/api';

const QuickStatsPanel = () => {
    const [profile, setProfile] = useState(null);
    const [notes, setNotes] = useState([]);

    useEffect(() => {
        axios.get(`${API_BASE}/profile`).then(res => setProfile(res.data)).catch(() => {});
        axios.get(`${API_BASE}/notes`).then(res => setNotes(res.data)).catch(() => {});
    }, []);

    const daysUntilExam = 14;
    const totalNotes = notes.length;
    const yourUploads = profile?.name ? notes.filter(n => n.uploadedBy === profile.name).length : 0;
    const verifiedNotes = Math.max(0, totalNotes - 1); // Mock verified logic

    return (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            {/* Student Profile Section - spans 2 cols */}
            <div className="md:col-span-2 space-y-4">
                <h2 className="text-lg font-bold tracking-tight text-foreground/80">Student Profile</h2>
                <Card className="h-[140px] bg-card border-border/60 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary/80" />
                    <CardContent className="p-6 h-full flex flex-col justify-center">
                        <div className="flex items-center gap-5">
                            <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center text-xl font-bold text-foreground shadow-sm">
                                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-xl font-bold tracking-tight leading-none group-hover:text-primary transition-colors">{profile?.name || 'Guest User'}</h3>
                                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted/50 w-fit px-2 py-1 rounded-lg border border-border/30">
                                    <GraduationCap className="w-3.5 h-3.5" />
                                    {profile?.department ? `${profile.department} • ${profile.semester}` : 'Update profile to set details'}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Stats Section - spans 3 cols */}
            <div className="md:col-span-3 space-y-4">
                <h2 className="text-lg font-bold tracking-tight text-foreground/80">Quick Stats</h2>
                <div className="grid grid-cols-2 gap-4 h-[140px]">
                    <Card className="border-border/60 shadow-sm hover:-translate-y-[2px] transition-transform duration-200">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Available Notes
                                <BookOpen className="w-4 h-4 text-muted-foreground/50" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="text-3xl font-bold tracking-tighter text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">{totalNotes}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm hover:-translate-y-[2px] transition-transform duration-200">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Your Uploads
                                <FileText className="w-4 h-4 text-indigo-500/50" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="text-3xl font-bold tracking-tighter text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both delay-100">{yourUploads}</div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm hover:-translate-y-[2px] transition-transform duration-200">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Upcoming Exam
                                <Clock className="w-4 h-4 text-amber-500/50" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2 flex items-baseline gap-1">
                            <div className="text-3xl font-bold tracking-tighter text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both delay-200">{daysUntilExam}</div>
                            <span className="text-sm font-medium text-muted-foreground animate-in fade-in duration-500 delay-300">Days</span>
                        </CardContent>
                    </Card>

                    <Card className="border-border/60 shadow-sm hover:-translate-y-[2px] transition-transform duration-200">
                        <CardHeader className="p-4 pb-0">
                            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                                Verified
                                <CheckCircle className="w-4 h-4 text-emerald-500/50" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-2">
                            <div className="text-3xl font-bold tracking-tighter text-foreground animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both delay-300">{verifiedNotes}</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default QuickStatsPanel;
