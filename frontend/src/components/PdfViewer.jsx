import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { 
    ArrowLeft01Icon, 
    ArrowRight01Icon, 
    ZoomInAreaIcon, 
    ZoomOutAreaIcon, 
    Download01Icon,
    AlertCircleIcon
} from 'hugeicons-react';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

export default function PdfViewer({ url, title, onDownload }) {
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);
    const [containerWidth, setContainerWidth] = useState(null);
    const [loadError, setLoadError] = useState(null);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setLoadError(null);
    };

    const onDocumentLoadError = (err) => {
        console.error('PDF load error:', err);
        setLoadError(err?.message || 'Failed to render PDF');
    };

    const containerRef = React.useCallback((node) => {
        if (node !== null) {
            setContainerWidth(node.getBoundingClientRect().width);
        }
    }, []);

    React.useEffect(() => {
        const handleResize = () => {
            const el = document.getElementById('pdf-canvas-container');
            if (el) {
                setContainerWidth(el.getBoundingClientRect().width);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const pageNav = (
        <div className="flex items-center justify-between px-4 py-2 border-b border-[#E5E5EA] dark:border-[#2C2C2E] bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-md sticky top-0 z-20 select-none text-xs">
            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    disabled={pageNumber <= 1}
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white"
                    title="Previous page"
                >
                    <ArrowLeft01Icon size={14} />
                </button>
                <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7] px-2 min-w-[70px] text-center">
                    {numPages ? `${pageNumber} / ${numPages}` : 'Loading...'}
                </span>
                <button
                    type="button"
                    disabled={!numPages || pageNumber >= numPages}
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] disabled:opacity-40 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed text-[#1D1D1F] dark:text-white"
                    title="Next page"
                >
                    <ArrowRight01Icon size={14} />
                </button>
            </div>

            <div className="flex items-center gap-1.5">
                <button
                    type="button"
                    onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[#1D1D1F] dark:text-white"
                    title="Zoom out"
                >
                    <ZoomOutAreaIcon size={14} />
                </button>
                <span className="font-mono text-[11px] text-[#6E6E73] dark:text-[#AEAEB2] min-w-[42px] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    type="button"
                    onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
                    className="p-1.5 rounded-lg border border-[#E5E5EA] dark:border-[#2C2C2E] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-[#1D1D1F] dark:text-white"
                    title="Zoom in"
                >
                    <ZoomInAreaIcon size={14} />
                </button>
            </div>
        </div>
    );

    if (loadError) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#F5F5F7] dark:bg-black min-h-[300px]">
                <div className="bg-white dark:bg-[#1C1C1E] border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-2xl p-6 max-w-sm mx-auto shadow-xs flex flex-col items-center">
                    <AlertCircleIcon size={32} className="text-amber-500 mb-3" />
                    <h4 className="text-sm font-semibold text-[#1D1D1F] dark:text-white">Mobile PDF Display</h4>
                    <p className="text-xs text-[#6E6E73] dark:text-[#AEAEB2] mt-1.5 mb-4">
                        Unable to render PDF inline on this device browser. You can open or download the document directly.
                    </p>
                    <div className="flex gap-2 w-full">
                        {url && (
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl bg-[#0071E3] text-white text-center hover:bg-[#0077ED] transition-colors"
                            >
                                Open File
                            </a>
                        )}
                        {onDownload && (
                            <button
                                type="button"
                                onClick={onDownload}
                                className="flex-1 py-2 px-3 text-xs font-semibold rounded-xl border border-[#E5E5EA] dark:border-[#2C2C2E] text-[#1D1D1F] dark:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-1.5"
                            >
                                <Download01Icon size={14} />
                                <span>Download</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const calculatedWidth = containerWidth ? Math.max(280, (containerWidth - 32) * scale) : undefined;

    return (
        <div id="pdf-canvas-container" ref={containerRef} className="w-full h-full flex flex-col bg-[#F5F5F7] dark:bg-black overflow-hidden relative">
            {pageNav}
            <div className="flex-1 overflow-y-auto overflow-x-auto flex justify-center p-3 sm:p-6 min-h-0">
                <Document
                    file={url}
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
                        renderTextLayer={true}
                    />
                </Document>
            </div>
        </div>
    );
}
