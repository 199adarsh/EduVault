import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    ZoomInAreaIcon, 
    ZoomOutAreaIcon, 
    Download01Icon,
    ViewIcon,
    RefreshIcon,
    File01Icon
} from 'hugeicons-react';

// Use reliable CORS-friendly CDN worker compatible with all mobile browsers
if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export default function PdfViewer({ url, data, presignedUrl, title, onDownload, extractedText }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState(() => {
        if (typeof window !== 'undefined') {
            return Math.min(window.innerWidth - 32, 850);
        }
        return 360;
    });
    const [loadError, setLoadError] = useState(null);
    const containerRef = useRef(null);

    const onDocumentLoadSuccess = useCallback(({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setLoadError(null);
    }, []);

    const onDocumentLoadError = useCallback((err) => {
        console.warn('PDF canvas render issue on device:', err);
        setLoadError(err?.message || 'Failed to render PDF canvas');
    }, []);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;

        // Measure immediately
        const rect = node.getBoundingClientRect();
        if (rect.width > 50) {
            setContainerWidth(rect.width);
        }

        // Dynamically track mobile orientation and layout shifts
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect.width > 50) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });
        ro.observe(node);

        const handleResize = () => {
            if (node) {
                const w = node.getBoundingClientRect().width;
                if (w > 50) setContainerWidth(w);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            ro.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    // Target URL for direct opening in mobile native browser
    const directUrl = presignedUrl || (typeof url === 'string' ? url : null);

    const handleOpenNative = () => {
        if (directUrl) {
            window.open(directUrl, '_blank', 'noopener,noreferrer');
        } else if (onDownload) {
            onDownload();
        }
    };

    // Memoize fileSource to avoid infinite re-render loops in react-pdf
    const fileSource = useMemo(() => {
        if (data && data.byteLength > 0) {
            return { data };
        }
        return url;
    }, [data, url]);

    const calculatedWidth = useMemo(() => {
        const base = containerWidth ? Math.max(260, containerWidth - 32) : 340;
        return Math.round(base * scale);
    }, [containerWidth, scale]);

    const pageNav = (
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-md sticky top-0 z-20 select-none text-xs">
            <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                    type="button"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                    title="Previous page"
                >
                    <ArrowLeft01Icon size={14} />
                </button>
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-1.5 sm:px-2 min-w-[60px] sm:min-w-[70px] text-center text-[11px] sm:text-xs">
                    {numPages ? `${pageNumber} / ${numPages}` : '...'}
                </span>
                <button
                    type="button"
                    disabled={!numPages || pageNumber >= numPages}
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white transition-colors"
                    title="Next page"
                >
                    <ArrowRight01Icon size={14} />
                </button>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
                <button
                    type="button"
                    onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[#1D1D1F] dark:text-white transition-colors"
                    title="Zoom out"
                >
                    <ZoomOutAreaIcon size={14} />
                </button>
                <span className="font-mono text-[10px] sm:text-[11px] text-[#6E6E73] dark:text-[#AEAEB2] min-w-[36px] sm:min-w-[42px] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[#1D1D1F] dark:text-white transition-colors"
                    title="Zoom in"
                >
                    <ZoomInAreaIcon size={14} />
                </button>

                {directUrl && (
                    <button
                        type="button"
                        onClick={handleOpenNative}
                        className="ml-1 p-1.5 px-2.5 rounded-lg bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1 font-semibold text-[11px] cursor-pointer shadow-xs transition-colors"
                        title="Open in native mobile PDF viewer"
                    >
                        <ViewIcon size={13} />
                        <span className="hidden xs:inline">Full View</span>
                    </button>
                )}
            </div>
        </div>
    );

    if (loadError) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-start p-6 bg-[#F5F5F7] dark:bg-black overflow-y-auto">
                <div className="w-full max-w-3xl flex flex-col items-center text-center my-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#0071E3] flex items-center justify-center mb-3">
                        <File01Icon size={24} />
                    </div>
                    <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-white mb-1">
                        {title || "PDF Document"}
                    </h3>
                    <p className="text-xs text-[#8E8E93] max-w-md mb-4">
                        Cloud storage bandwidth cap reached or network blocked. You can still read the full extracted notes below or retry download.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6">
                        {directUrl && (
                            <button
                                type="button"
                                onClick={handleOpenNative}
                                className="px-4 py-2 bg-[#0071E3] hover:bg-[#0077ED] text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-95"
                            >
                                <ViewIcon size={14} />
                                <span>Open Direct Link</span>
                            </button>
                        )}
                        {onDownload && (
                            <button
                                type="button"
                                onClick={onDownload}
                                className="px-4 py-2 bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-white text-xs font-semibold rounded-xl flex items-center gap-2 cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5"
                            >
                                <Download01Icon size={14} />
                                <span>Download PDF</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => {
                                setLoadError(null);
                                setPageNumber(1);
                            }}
                            className="px-3 py-2 text-xs text-[#8E8E93] hover:text-[#1D1D1F] dark:hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                            <RefreshIcon size={13} />
                            <span>Retry</span>
                        </button>
                    </div>

                    {extractedText && (
                        <div className="w-full text-left bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-6 sm:p-8 shadow-xs">
                            <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                                <span>Showing full extracted document text while storage bandwidth resets.</span>
                            </div>
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#1D1D1F] dark:text-[#F5F5F7]">
                                {extractedText}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div id="pdf-canvas-container" ref={containerRef} className="w-full h-full min-h-[400px] flex flex-col bg-[#F5F5F7] dark:bg-black overflow-hidden relative">
            {pageNav}
            <div className="flex-1 overflow-y-auto overflow-x-auto flex justify-center p-2 sm:p-6 min-h-0">
                <Document
                    file={fileSource}
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={onDocumentLoadError}
                    loading={
                        <div className="flex flex-col items-center justify-center p-12 text-center text-xs text-[#6E6E73] dark:text-[#AEAEB2]">
                            <div className="w-5 h-5 border-2 border-[#0071E3]/30 border-t-[#0071E3] rounded-full animate-spin mb-3" />
                            <span>Rendering PDF pages...</span>
                        </div>
                    }
                    className="flex flex-col items-center max-w-full"
                >
                    <Page
                        pageNumber={pageNumber}
                        width={calculatedWidth}
                        className="shadow-sm rounded-lg overflow-hidden border border-[#E5E5EA] dark:border-[#2C2C2E] bg-white"
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                    />
                </Document>
            </div>
        </div>
    );
}
