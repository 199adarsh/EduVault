import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import DocumentLoadingBar from './DocumentLoadingBar';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
}

const NotePreviewModal = ({ open, note, onClose, fileUrl }) => {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const scrollContainerRef = useRef(null);
  const pageRefs = useRef({});

  const scrollToPage = useCallback((target) => {
    const el = pageRefs.current[target];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPageNumber(target);
    }
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  useEffect(() => {
    if (!numPages || numPages <= 1) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const page = Number(entry.target.getAttribute('data-page-number'));
            if (page && !isNaN(page)) {
              setPageNumber(page);
            }
          }
        }
      },
      {
        root: container,
        rootMargin: '-10% 0px -70% 0px',
        threshold: 0,
      }
    );

    Object.values(pageRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [numPages]);

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const handleDownload = () => {
    if (!fileUrl) return;
    setDownloading(true);
    setDownloadProgress(12);

    const interval = setInterval(() => {
      setDownloadProgress(p => {
        if (p >= 92) {
          clearInterval(interval);
          return 95;
        }
        return p + Math.floor(Math.random() * 15 + 10);
      });
    }, 110);

    setTimeout(() => {
      clearInterval(interval);
      setDownloadProgress(100);
      window.open(fileUrl, '_blank');
      setTimeout(() => {
        setDownloading(false);
        setDownloadProgress(0);
      }, 500);
    }, 650);
  };

  const fileExt = (note?.fileUrl || '').split('.').pop().toLowerCase();
  const isPdf = fileExt === 'pdf';
  const isOfficeDoc = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(fileExt);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 overflow-hidden bg-muted/20">
        <DialogHeader className="p-4 border-b bg-background flex flex-row items-center justify-between flex-shrink-0 space-y-0">
          <DialogTitle className="truncate pr-4 leading-tight">{note?.title || 'Document Preview'}</DialogTitle>
          <div className="flex items-center gap-2">
             <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" /> Download
             </Button>
          </div>
        </DialogHeader>

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 flex justify-center items-start bg-zinc-100/50 relative scroll-smooth">
           {downloading && (
             <DocumentLoadingBar 
               progress={downloadProgress} 
               message="Downloading document..." 
               submessage={note?.title} 
             />
           )}
           {fileUrl && isPdf ? (
               <Document
                 file={fileUrl}
                 onLoadSuccess={onDocumentLoadSuccess}
                 loading={
                     <div className="flex flex-col items-center justify-center p-12 w-full">
                         <DocumentLoadingBar 
                             inline 
                             message="Loading document..." 
                             submessage={note?.title || "Rendering PDF pages..."} 
                         />
                     </div>
                 }
                 error={
                     <div className="p-10 text-center text-destructive bg-destructive/10 rounded-lg border border-destructive/20 max-w-md mx-auto mt-10">
                         Failed to load PDF preview. Some documents cannot be previewed directly.
                         <br/><br/>
                         Please download the file to view it.
                     </div>
                 }
                 className="flex flex-col items-center gap-4 pb-6"
               >
                 {numPages ? (
                   Array.from(new Array(numPages), (_, index) => {
                     const pNum = index + 1;
                     return (
                       <div
                         key={`page_${pNum}`}
                         ref={(el) => (pageRefs.current[pNum] = el)}
                         data-page-number={pNum}
                         className="flex flex-col items-center shadow-lg border border-border/50 bg-white"
                       >
                         <Page 
                           pageNumber={pNum} 
                           scale={scale} 
                           renderTextLayer={false} 
                           renderAnnotationLayer={false}
                         />
                       </div>
                     );
                   })
                 ) : (
                   <div className="shadow-2xl border border-border/50 bg-white inline-block">
                     <Page 
                       pageNumber={1} 
                       scale={scale} 
                       renderTextLayer={false} 
                       renderAnnotationLayer={false}
                     />
                   </div>
                 )}
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
                        onClick={() => scrollToPage(Math.max(pageNumber - 1, 1))}
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
                        onClick={() => scrollToPage(Math.min(pageNumber + 1, numPages))}
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
