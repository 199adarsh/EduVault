import React, { useState } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Map, BookOpen, FileText, CalendarDays, Loader2, Target, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';

const API_BASE = 'http://localhost:8081/api';

const StudyRoadmapView = () => {
  const [activeTab, setActiveTab] = useState('guide');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // Holds generated JSON

  // Study Guide Form State
  const [guidePyq, setGuidePyq] = useState('');
  const [guideQb, setGuideQb] = useState('');

  // Roadmap Form State
  const [roadmapPyq, setRoadmapPyq] = useState('');
  const [roadmapQb, setRoadmapQb] = useState('');
  const [examDate, setExamDate] = useState('');
  const [subjectsCount, setSubjectsCount] = useState(1);

  const calculateDaysRemaining = (targetDateStr) => {
      if (!targetDateStr) return 0;
      const target = new Date(targetDateStr);
      const now = new Date();
      const diffTime = target - now;
      return Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  };

  const handleGenerateGuide = async () => {
      if (!guidePyq.trim() && !guideQb.trim()) {
          toast.error("Please provide at least some PYQ or Question Bank text.");
          return;
      }
      setLoading(true);
      setResult(null);
      try {
          const res = await axios.post(`${API_BASE}/ai/study-guide`, {
              pyqText: guidePyq,
              qbText: guideQb
          });
          if (res.data && res.data.error) {
              toast.error(res.data.error);
          } else {
              setResult({ type: 'guide', data: res.data });
              toast.success("Study guide generated successfully!");
          }
      } catch (err) {
          console.error(err);
          toast.error("Failed to generate guide: " + (err.response?.data?.error || err.message));
      } finally {
          setLoading(false);
      }
  };

  const handleGenerateRoadmap = async () => {
      if (!examDate) {
          toast.error("Exam date is required to calculate the roadmap.");
          return;
      }
      
      const daysLeft = calculateDaysRemaining(examDate);
      if (daysLeft <= 0) {
          toast.error("Exam date must be in the future.");
          return;
      }

      setLoading(true);
      setResult(null);

      // We need to send today's date context properly formatted
      const today = new Date().toISOString().split('T')[0];

      try {
          const res = await axios.post(`${API_BASE}/ai/roadmap`, {
              examDate: examDate,
              currentDate: today,
              daysRemaining: daysLeft,
              subjectsCount: parseInt(subjectsCount, 10),
              pyqText: roadmapPyq,
              qbText: roadmapQb
          });
          setResult({ type: 'roadmap', data: res.data });
          toast.success("Roadmap generated successfully!");
      } catch (err) {
          console.error(err);
          toast.error("Failed to generate roadmap: " + (err.response?.data?.error || err.message));
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
          <h2 className="text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
              <Map className="w-6 h-6 text-primary" />
              Study & Exam Roadmap
          </h2>
          <p className="text-muted-foreground max-w-2xl">Paste your syllabus, previous year questions (PYQs), or raw question banks below. Our AI planner will cross-reference the data to instantly synthesize what topics are actually important and build a prioritized schedule for you.</p>
      </div>

      <Tabs defaultValue="guide" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
              <TabsTrigger value="guide" className="flex items-center gap-2"><Target className="w-4 h-4" /> Study Guide</TabsTrigger>
              <TabsTrigger value="roadmap" className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Daily Roadmap</TabsTrigger>
          </TabsList>

          <TabsContent value="guide" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form Column */}
                  <div className="space-y-6">
                      <Card>
                          <CardHeader className="pb-3 border-b">
                              <CardTitle className="text-lg font-bold">1. Input Materials</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold flex justify-between">
                                      <span>Previous Year Questions (PYQ) Text</span>
                                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                                  </label>
                                  <Textarea 
                                    className="min-h-[150px] resize-none"
                                    placeholder="Paste raw text from previous exams here... The AI will use this to determine which topics appear most frequently."
                                    value={guidePyq}
                                    onChange={e => setGuidePyq(e.target.value)}
                                  />
                              </div>

                              <div className="space-y-2">
                                  <label className="text-sm font-semibold flex justify-between">
                                      <span>Question Bank / Syllabus Text</span>
                                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                                  </label>
                                  <Textarea 
                                    className="min-h-[150px] resize-none"
                                    placeholder="Paste your professor's question bank or raw syllabus topics here..."
                                    value={guideQb}
                                    onChange={e => setGuideQb(e.target.value)}
                                  />
                              </div>

                              <Button className="w-full font-bold" size="lg" onClick={handleGenerateGuide} disabled={loading}>
                                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Analyzing Patterns...</> : 'Generate Prioritized Study Guide'}
                              </Button>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Results Column */}
                  <div>
                      {!result && !loading && (
                          <div className="h-full min-h-[400px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-muted/20">
                              <Target className="w-12 h-12 mb-4 opacity-50 text-indigo-500" />
                              <h3 className="text-lg font-bold text-foreground mb-2">Awaiting Materials</h3>
                              <p className="max-w-sm text-sm">Provide your study materials on the left to generate an optimized, prioritized list of what topics you absolutely must study first.</p>
                          </div>
                      )}
                      
                      {loading && (
                           <div className="h-full min-h-[400px] border rounded-lg flex flex-col items-center justify-center text-center p-8 bg-card shadow-sm">
                               <Loader2 className="w-10 h-10 mb-4 text-primary animate-spin" />
                               <h3 className="text-base font-bold animate-pulse">Running Gemini Intelligence Phase...</h3>
                               <p className="text-xs text-muted-foreground mt-2">Cross-referencing your PYQs against syllabus topics...</p>
                           </div>
                      )}

                      {result && result.type === 'guide' && result.data.guide && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                              <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Prioritized Topics</h3>
                                  <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">{result.data.guide.length} Topics Extracted</span>
                              </div>
                              
                              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                  {result.data.guide.map((item, idx) => (
                                      <Card key={idx} className={`${item.priority?.toLowerCase() === 'high' ? 'bg-rose-500/5 dark:bg-rose-500/10' : item.priority?.toLowerCase() === 'medium' ? 'bg-amber-500/5 dark:bg-amber-500/10' : 'bg-emerald-500/5 dark:bg-emerald-500/10'}`}>
                                          <CardContent className="p-5">
                                              <div className="flex justify-between items-start mb-3">
                                                  <h4 className="font-bold text-base leading-tight pr-4">{item.topic}</h4>
                                                  <span className={`text-[10px] uppercase font-black tracking-wider px-2 py-1 rounded-sm ${item.priority?.toLowerCase() === 'high' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400' : item.priority?.toLowerCase() === 'medium' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'}`}>
                                                      {item.priority} Priority
                                                  </span>
                                              </div>
                                              
                                              {item.questions && item.questions.length > 0 && (
                                                  <div className="mt-3 space-y-2">
                                                      <p className="text-xs font-bold text-muted-foreground uppercase">Key Questions Examined:</p>
                                                      <ul className="text-sm space-y-1.5 pl-4 list-disc marker:text-muted-foreground/50">
                                                          {item.questions.map((q, qidx) => (
                                                              <li key={qidx} className="text-muted-foreground leading-snug">{q}</li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              )}
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </TabsContent>

          <TabsContent value="roadmap" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Form Column */}
                  <div className="space-y-6">
                      <Card>
                          <CardHeader className="pb-3 border-b">
                              <CardTitle className="text-lg font-bold">1. Define Exam Parameters</CardTitle>
                          </CardHeader>
                          <CardContent className="p-6 space-y-5">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold">Exam Date *</label>
                                      <Input 
                                        type="date"
                                        value={examDate}
                                        onChange={e => setExamDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                      />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold">Total Subjects *</label>
                                      <Input 
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={subjectsCount}
                                        onChange={e => setSubjectsCount(e.target.value)}
                                      />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold flex justify-between">
                                      <span>PYQ Text Context</span>
                                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                                  </label>
                                  <Textarea 
                                    className="min-h-[100px] resize-none"
                                    placeholder="Paste a sample of previous questions so the AI understands format..."
                                    value={roadmapPyq}
                                    onChange={e => setRoadmapPyq(e.target.value)}
                                  />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold flex justify-between">
                                      <span>Question Bank Context</span>
                                      <span className="text-xs text-muted-foreground font-normal">Optional</span>
                                  </label>
                                  <Textarea 
                                    className="min-h-[100px] resize-none"
                                    placeholder="Paste syllabus topics to evenly distribute over remaining days..."
                                    value={roadmapQb}
                                    onChange={e => setRoadmapQb(e.target.value)}
                                  />
                              </div>

                              {examDate && (
                                  <div className="bg-amber-500/10 p-4 rounded-lg flex items-start gap-3 border border-amber-500/20">
                                      <CalendarDays className="w-5 h-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                                      <div>
                                          <p className="text-sm font-bold text-amber-900 dark:text-amber-100">
                                              {calculateDaysRemaining(examDate)} Days Available
                                          </p>
                                          <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-1">
                                              The AI will condense your syllabus across {subjectsCount} subjects to fit within this tight timeframe.
                                          </p>
                                      </div>
                                  </div>
                              )}

                              <Button className="w-full font-bold" size="lg" onClick={handleGenerateRoadmap} disabled={loading || !examDate}>
                                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Calculating Roadmap...</> : 'Generate Timeline'}
                              </Button>
                          </CardContent>
                      </Card>
                  </div>

                  {/* Results Column */}
                  <div>
                      {!result && !loading && (
                          <div className="h-full min-h-[400px] border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-center p-8 text-muted-foreground bg-muted/20">
                              <CalendarDays className="w-12 h-12 mb-4 opacity-50 text-indigo-500" />
                              <h3 className="text-lg font-bold text-foreground mb-2">No Timeline Generated</h3>
                              <p className="max-w-sm text-sm">Provide your exam date and optional context to generate a strict day-by-day checklist to ensure you cover everything before the test.</p>
                          </div>
                      )}
                      
                      {loading && (
                           <div className="h-full min-h-[400px] border rounded-lg flex flex-col items-center justify-center text-center p-8 bg-card shadow-sm">
                               <Loader2 className="w-10 h-10 mb-4 text-primary animate-spin" />
                               <h3 className="text-base font-bold animate-pulse">Computing Daily Goals...</h3>
                           </div>
                      )}

                      {result && result.type === 'roadmap' && result.data.roadmap && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                              <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-xl font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Daily Action Plan</h3>
                                  <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">{result.data.roadmap.length} Days Planned</span>
                              </div>
                              
                              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                  {result.data.roadmap.map((dayPlan, idx) => (
                                      <Card key={idx} className="relative overflow-hidden">
                                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary/50" />
                                          <CardHeader className="pb-2 pt-4 px-5">
                                              <div className="flex justify-between items-baseline">
                                                  <CardTitle className="text-base font-bold text-primary">{dayPlan.day}</CardTitle>
                                                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{dayPlan.date}</span>
                                              </div>
                                          </CardHeader>
                                          <CardContent className="px-5 pb-5">
                                              <div className="space-y-3">
                                                  {dayPlan.tasks && dayPlan.tasks.map((t, tidx) => (
                                                      <label key={tidx} className="flex items-start gap-3 group cursor-pointer">
                                                          <div className="w-4 h-4 rounded border border-primary/50 mt-0.5 flex items-center justify-center flex-shrink-0 group-hover:border-primary transition-colors bg-background" />
                                                          <span className="text-sm leading-snug font-medium text-foreground/90 select-none group-hover:text-foreground">{t.task}</span>
                                                      </label>
                                                  ))}
                                              </div>
                                              
                                              {dayPlan.milestone && (
                                                  <div className="mt-4 pt-4 border-t border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-500/10 -mx-5 px-5 pb-4 pt-3 flex items-start gap-2">
                                                      <Target className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                                      <span>Milestone: {dayPlan.milestone}</span>
                                                  </div>
                                              )}
                                          </CardContent>
                                      </Card>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </TabsContent>
      </Tabs>
    </div>
  );
};

export default StudyRoadmapView;
