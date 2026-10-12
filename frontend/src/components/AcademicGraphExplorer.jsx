import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, 
  ChevronRight, 
  Layers, 
  FileText, 
  ArrowLeft,
  GraduationCap,
  CalendarDays
} from 'lucide-react';
import clsx from 'clsx';
import NotesFeed from './NotesFeed';

const AcademicGraphExplorer = ({ 
  subjects, 
  notes, 
  profile, 
  onSelectNote, 
  selectedNoteId,
  loadingNotes,
  onFetchNotesBySubjectAndUnit 
}) => {
  const [view, setView] = useState('subjects'); // 'subjects' | 'units'
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedUnit, setSelectedUnit] = useState(null);

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject);
    setView('units');
    // Initially fetch all notes for this subject to show progress? 
    // Or just wait for unit selection.
    onFetchNotesBySubjectAndUnit(subject.id, null);
  };

  const handleUnitClick = (unit) => {
    setSelectedUnit(unit);
    onFetchNotesBySubjectAndUnit(selectedSubject.id, unit);
  };

  const resetToSubjects = () => {
    setView('subjects');
    setSelectedSubject(null);
    setSelectedUnit(null);
    onFetchNotesBySubjectAndUnit(null, null);
  };

  const units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Breadcrumb / Context header */}
      <div className="flex items-center gap-3 text-sm font-medium">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50 text-secondary-foreground shadow-sm">
          <GraduationCap className="w-4 h-4" />
          {profile?.department || 'Department'}
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
        <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/50 rounded-full border border-border/50 text-secondary-foreground shadow-sm">
          <CalendarDays className="w-4 h-4" />
          {profile?.semester || 'Semester'}
        </div>
        
        {selectedSubject && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            <button 
              onClick={() => { setSelectedUnit(null); setView('units'); }}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/20 font-semibold shadow-sm hover:bg-primary/20 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {selectedSubject.name}
            </button>
          </>
        )}
        
        {selectedUnit && (
          <>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-zinc-100 dark:bg-zinc-100 dark:text-zinc-900 rounded-full font-bold shadow-sm ring-1 ring-zinc-900/10">
              <Layers className="w-4 h-4" />
              {selectedUnit}
            </div>
          </>
        )}
      </div>

      <div className="relative min-h-[400px]">
        {view === 'subjects' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
            {subjects.map(subject => (
              <Card 
                key={subject.id}
                className="group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/60 bg-card/50 overflow-hidden relative"
                onClick={() => handleSubjectClick(subject)}
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-125 duration-500" />
                <CardContent className="p-6 relative z-10">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-white transition-colors duration-300 shadow-sm">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-1 group-hover:text-primary transition-colors">{subject.name}</h3>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">{subject.noteCount} Notes Available</p>
                  
                  <div className="mt-6 flex items-center text-sm font-semibold text-primary/80 group-hover:text-primary transition-colors">
                    Explore Units <ChevronRight className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {subjects.length === 0 && (
                <div className="col-span-full py-20 text-center bg-muted/20 border border-dashed rounded-lg">
                    <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground">No subjects found for your profile</h3>
                    <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">Update your profile or upload notes to see subjects here.</p>
                </div>
            )}
          </div>
        )}

        {view === 'units' && (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
                <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground" onClick={resetToSubjects}>
                    <ArrowLeft className="w-4 h-4" /> Back to Subjects
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {units.map(u => (
                <button
                  key={u}
                  onClick={() => handleUnitClick(u)}
                  className={clsx(
                    "relative px-4 py-8 rounded-lg border transition-all duration-300 flex flex-col items-center justify-center gap-3 overflow-hidden group shadow-sm",
                    selectedUnit === u 
                      ? "bg-primary border-primary text-white shadow-primary/25 scale-105 z-10" 
                      : "bg-card border-border/80 hover:border-primary/50 hover:bg-primary/5 text-foreground"
                  )}
                >
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    selectedUnit === u ? "bg-white/20" : "bg-muted group-hover:bg-primary/20 text-muted-foreground group-hover:text-primary"
                  )}>
                    <Layers className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-bold tracking-tight">{u}</span>
                  
                  {selectedUnit === u && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-white/30 animate-in slide-in-from-left duration-1000" />
                  )}
                </button>
              ))}
            </div>

            <div className="bg-muted/30 p-8 rounded-lg border border-border/50 min-h-[400px] shadow-inner backdrop-blur-sm">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-3">
                            <span className="text-primary">{selectedSubject.name}</span>
                            <ChevronRight className="w-6 h-6 text-muted-foreground/30" />
                            <span className="text-muted-foreground">{selectedUnit || 'All Units'}</span>
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.2em] mt-1 ml-0.5">Academic Graph Node</p>
                    </div>
                </div>

                <NotesFeed 
                  notes={notes} 
                  onSelectNote={onSelectNote}
                  selectedNoteId={selectedNoteId}
                  loading={loadingNotes}
                />
                
                {!loadingNotes && notes.length === 0 && (
                    <div className="py-20 text-center">
                        <FileText className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
                        <h3 className="text-lg font-medium text-muted-foreground">No notes found here</h3>
                        <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto mt-2">Contribute by uploading notes for this unit!</p>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicGraphExplorer;
