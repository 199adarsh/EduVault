import React, { useState, useEffect } from 'react';
import { FileText, Download, Clock, Eye } from 'lucide-react';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import clsx from 'clsx';
import axios from 'axios';
import NotePreviewModal from './NotePreviewModal';

const API_BASE = 'http://localhost:8081/api';

const NotesFeed = ({ notes, onSelectNote, selectedNoteId, loading }) => {
  const [previewNote, setPreviewNote] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (!previewNote) { setPreviewUrl(null); return; }
    axios.get(`${API_BASE}/files/${previewNote.id}/presigned`)
      .then(res => setPreviewUrl(res.data?.url || null))
      .catch(() => setPreviewUrl(null));
  }, [previewNote]);
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

    if (!notes || notes.length === 0) {
      return (
        <div className="border border-dashed border-border/60 rounded-lg p-12 flex flex-col items-center justify-center text-center bg-muted/20">
          <FileText className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No notes found.</p>
        </div>
      );
    }

  const handleDownload = (e, noteId) => {
      e.stopPropagation();
      window.open(`${API_BASE}/files/${noteId}`, '_blank');
  };

  return (
    <>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {notes.map(note => {
        const uploader = note.uploadedBy || 'Anonymous';
        return (
          <Card 
            key={note.id}
            onClick={() => onSelectNote(note.id)}
            className={clsx(
              "cursor-pointer hover:shadow-sm transition-all duration-200 group overflow-hidden border-border/80 hover:border-border hover:-translate-y-[2px] flex flex-col",
              selectedNoteId === note.id ? "ring-1 ring-primary/20 border-primary/20 shadow-sm bg-muted/20" : ""
            )}
          >
            <CardHeader className="p-5 pb-3 flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted border border-border/50 text-muted-foreground shadow-sm">
                    <FileText className="w-5 h-5" />
                  </div>
              </div>
              <Badge variant="secondary" className="capitalize text-[10px] uppercase tracking-wider font-semibold opacity-80">
                {note.examType}
              </Badge>
            </CardHeader>
            <CardContent className="px-5 pb-3 flex-1">
              <CardTitle className="text-base font-semibold line-clamp-2 leading-tight">
                {note.title}
              </CardTitle>
              {note.department && (
                <CardDescription className="mt-1 text-xs">{note.department}</CardDescription>
              )}
              {note.subjectId && (
                <CardDescription className="mt-1 text-xs text-primary/70 font-medium">Subject ID: {note.subjectId}</CardDescription>
              )}
            </CardContent>
            
            <CardFooter className="px-5 pb-5 pt-0 flex flex-col items-start gap-4 mt-auto">
              <div className="flex items-center gap-3 text-xs text-muted-foreground w-full">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold uppercase shrink-0 ring-1 ring-foreground/10">
                    {uploader.charAt(0)}
                  </div>
                  <span className="truncate font-medium">{uploader}</span>
                </div>
                
                <div className="w-1 h-1 rounded-full bg-border shrink-0" />
                
                <div className="flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{note.createdAt}</span>
                </div>
              </div>

              <div className="w-full pt-4 border-t flex justify-between gap-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button 
                  onClick={(e) => { e.stopPropagation(); setPreviewNote(note); }}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-semibold transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview
                </button>
                <button 
                  onClick={(e) => handleDownload(e, note.id)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
              </div>
            </CardFooter>
          </Card>
        );
      })}
    </div>
    <NotePreviewModal 
       open={!!previewNote} 
       note={previewNote} 
       onClose={() => setPreviewNote(null)} 
       fileUrl={previewUrl}
    />
    </>
  );
};

export default NotesFeed;
