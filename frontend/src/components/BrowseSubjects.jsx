import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import clsx from 'clsx';

const BrowseSubjects = ({ subjects, selectedId, onSelect }) => {
  if (!subjects || subjects.length === 0) {
      return <div className="text-sm text-muted-foreground p-6 bg-muted/20 rounded-md border text-center">No subjects found for your profile. Upload notes to create new subjects!</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
      {subjects.map(subject => (
        <Card 
          key={subject.id}
          className={clsx(
            "transition-all duration-200 border-border/80 hover:shadow-sm hover:border-border hover:-translate-y-[2px]",
            selectedId === subject.id ? "ring-1 ring-primary/20 border-primary/20 shadow-sm bg-muted/20" : ""
          )}
        >
          <CardContent className="p-5 flex flex-col justify-between h-full gap-5">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted border border-border/50 flex items-center justify-center text-muted-foreground flex-shrink-0 shadow-sm">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="overflow-hidden flex-1">
                  <h3 className="font-semibold text-sm leading-tight mb-1 truncate text-foreground/90">{subject.name}</h3>
                  {subject.department && (
                      <p className="text-[11px] text-muted-foreground font-medium truncate uppercase tracking-wider">{subject.department} • {subject.semester}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2 font-medium">{subject.noteCount} Notes Available</p>
                </div>
            </div>
            
            <Button 
                variant={selectedId === subject.id ? "secondary" : "outline"} 
                className="w-full text-xs font-semibold h-8"
                onClick={() => onSelect(subject.id)}
            >
                {selectedId === subject.id ? "Viewing Selected" : "View Notes"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default BrowseSubjects;
