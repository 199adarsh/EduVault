import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const NotePreviewModal = ({ open, note, onClose, fileUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const fileExt = (note?.fileUrl || '').split('.').pop().toLowerCase();
  const isPdf = fileExt === 'pdf';
  const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden bg-muted/20">
        <DialogHeader className="p-4 border-b bg-background flex flex-row items-center justify-between flex-shrink-0 space-y-0">
          <DialogTitle className="truncate pr-4 leading-tight">{note?.title || 'Document Preview'}</DialogTitle>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={() => window.open(fileUrl, '_blank')}>
                <Download className="w-4 h-4 mr-2" /> Download
             </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 flex justify-center items-start bg-zinc-100/50">
           {fileUrl && isPdf ? (
               <Document
                 file={fileUrl}
                 onLoadSuccess={onDocumentLoadSuccess}
                 loading={
                     <div className="flex flex-col items-center justify-center p-20 text-muted-foreground">
                         <Loader2 className="w-8 h-8 animate-spin mb-4" />
                         <p>Loading PDF...</p>
                     </div>
                 }
                 error={
                     <div className="p-10 text-center text-destructive bg-destructive/10 rounded-lg border border-destructive/20 max-w-md mx-auto mt-10">
                         Failed to load PDF preview. Some documents cannot be previewed directly.
                         <br/><br/>
                         Please download the file to view it.
                     </div>
                 }
               >
                 <div className="shadow-2xl border border-border/50 bg-white inline-block">
                    <Page 
                      pageNumber={pageNumber} 
                      scale={scale} 
                      renderTextLayer={false} 
                      renderAnnotationLayer={false}
                    />
                 </div>
               </Document>
           ) : fileUrl && isOfficeDoc ? (
               <iframe 
                 src={`https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true`} 
                 className="w-full h-full border-none bg-white rounded-lg min-h-[500px]"
                 title="Document Preview"
               />
           ) : (
               <div className="p-10 text-center text-muted-foreground">
                   No direct preview available for this document type. Please click Download.
               </div>
           )}
        </div>

        {numPages && (
            <div className="h-14 border-t bg-background flex items-center justify-between px-6 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={zoomOut} disabled={scale <= 0.5}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium w-12 text-center">{Math.round(scale * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={zoomIn} disabled={scale >= 3.0}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))}
                        disabled={pageNumber <= 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[5rem] text-center">
                        Page {pageNumber} of {numPages}
                    </span>
                    <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={() => setPageNumber(prev => Math.min(prev + 1, numPages))}
                        disabled={pageNumber >= numPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NotePreviewModal;
