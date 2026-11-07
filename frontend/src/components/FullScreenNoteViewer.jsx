import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Maximize2,
    Minimize2,
    MousePointer,
    Pen,
    Highlighter,
    Eraser,
    Type,
    Square,
    ArrowUpRight,
    Undo2,
    Redo2,
    Trash2,
    X,
    ZoomIn,
    ZoomOut,
    ChevronLeft,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { toast } from 'sonner';

if (typeof window !== 'undefined') {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
    ).toString();
}

const COLORS = [
    { id: 'white', hex: '#FFFFFF', name: 'White' },
    { id: 'blue', hex: '#0071E3', name: 'Blue' },
    { id: 'red', hex: '#FF3B30', name: 'Red' },
    { id: 'green', hex: '#34C759', name: 'Green' },
    { id: 'yellow', hex: '#FFD60A', name: 'Yellow' },
    { id: 'purple', hex: '#AF52DE', name: 'Purple' },
    { id: 'black', hex: '#1D1D1F', name: 'Black' }
];

const STROKE_WIDTHS = [
    { label: 'S', width: 2 },
    { label: 'M', width: 4 },
    { label: 'L', width: 8 }
];

export default function FullScreenNoteViewer({
    note,
    isPdf,
    resolvedPdfUrl,
    pdfData,
    docxHtml,
    blobUrl,
    onClose
}) {
    // Current tool: 'select' | 'pen' | 'highlighter' | 'eraser' | 'text' | 'rect' | 'arrow'
    const [tool, setTool] = useState('pen');
    const [color, setColor] = useState('#0071E3');
    const [strokeWidth, setStrokeWidth] = useState(4);

    // Canvas drawing state (memory-only, non-persistent)
    const [strokes, setStrokes] = useState([]);
    const [redoStack, setRedoStack] = useState([]);
    const [currentStroke, setCurrentStroke] = useState(null);

    // Text annotations state (memory-only)
    const [textInputs, setTextInputs] = useState([]);
    const [activeTextInput, setActiveTextInput] = useState(null);

    // PDF pagination and scaling state
    const [numPages, setNumPages] = useState(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [scale, setScale] = useState(1.0);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const isDrawingRef = useRef(false);

    // Request native browser fullscreen (F11 equivalent) on open, and exit cleanly on close
    useEffect(() => {
        const enterBrowserFullscreen = async () => {
            try {
                if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                    const el = document.documentElement;
                    if (el.requestFullscreen) {
                        await el.requestFullscreen();
                    } else if (el.webkitRequestFullscreen) {
                        await el.webkitRequestFullscreen();
                    } else if (el.msRequestFullscreen) {
                        await el.msRequestFullscreen();
                    }
                }
            } catch (err) {
                // Ignore if browser requires direct user interaction or permissions
                console.warn('Browser fullscreen request failed:', err);
            }
        };

        enterBrowserFullscreen();

        const handleFullscreenChange = () => {
            // When user exits native fullscreen via Esc or F11, close viewer
            if (!document.fullscreenElement && !document.webkitFullscreenElement) {
                onClose?.();
            }
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                try {
                    if (document.exitFullscreen) {
                        document.exitFullscreen().catch(() => {});
                    } else if (document.webkitExitFullscreen) {
                        document.webkitExitFullscreen();
                    }
                } catch { /* ignore */ }
            }
        };
    }, [onClose]);

    const handleClose = useCallback(() => {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
            try {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if (document.webkitExitFullscreen) {
                    document.webkitExitFullscreen();
                }
            } catch { /* ignore */ }
        }
        onClose?.();
    }, [onClose]);

    // Handle Esc key to close full screen
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleClose();
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) {
                    handleRedo();
                } else {
                    handleUndo();
                }
            } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                handleRedo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [strokes, redoStack, handleClose]);

    // Resize canvas to match viewport/container
    const syncCanvasSize = useCallback(() => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
            redrawCanvas();
        }
    }, [strokes, currentStroke]);

    useEffect(() => {
        syncCanvasSize();
        window.addEventListener('resize', syncCanvasSize);
        return () => window.removeEventListener('resize', syncCanvasSize);
    }, [syncCanvasSize]);

    // Redraw all strokes on HTML5 canvas
    const redrawCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

        const allToDraw = currentStroke ? [...strokes, currentStroke] : strokes;

        for (const item of allToDraw) {
            ctx.save();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (item.type === 'pen') {
                ctx.strokeStyle = item.color;
                ctx.lineWidth = item.width;
                ctx.globalAlpha = 1.0;
                ctx.beginPath();
                for (let i = 0; i < item.points.length; i++) {
                    const pt = item.points[i];
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            } else if (item.type === 'highlighter') {
                ctx.strokeStyle = item.color;
                ctx.lineWidth = item.width * 3.5;
                ctx.globalAlpha = 0.38;
                ctx.globalCompositeOperation = 'source-over';
                ctx.beginPath();
                for (let i = 0; i < item.points.length; i++) {
                    const pt = item.points[i];
                    if (i === 0) ctx.moveTo(pt.x, pt.y);
                    else ctx.lineTo(pt.x, pt.y);
                }
                ctx.stroke();
            } else if (item.type === 'rect') {
                ctx.strokeStyle = item.color;
                ctx.lineWidth = item.width;
                ctx.globalAlpha = 1.0;
                const { startX, startY, endX, endY } = item;
                const w = endX - startX;
                const h = endY - startY;
                ctx.strokeRect(startX, startY, w, h);
            } else if (item.type === 'arrow') {
                ctx.strokeStyle = item.color;
                ctx.fillStyle = item.color;
                ctx.lineWidth = item.width;
                ctx.globalAlpha = 1.0;
                const { startX, startY, endX, endY } = item;

                // Draw shaft
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();

                // Draw arrowhead
                const angle = Math.atan2(endY - startY, endX - startX);
                const headLen = Math.max(12, item.width * 3.5);
                ctx.beginPath();
                ctx.moveTo(endX, endY);
                ctx.lineTo(
                    endX - headLen * Math.cos(angle - Math.PI / 7),
                    endY - headLen * Math.sin(angle - Math.PI / 7)
                );
                ctx.lineTo(
                    endX - headLen * Math.cos(angle + Math.PI / 7),
                    endY - headLen * Math.sin(angle + Math.PI / 7)
                );
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore();
    }, [strokes, currentStroke]);

    useEffect(() => {
        redrawCanvas();
    }, [redrawCanvas]);

    // Coordinate helper
    const getCanvasCoords = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    // Eraser helper: remove strokes within radius of point
    const eraseNear = (pt, radius = 18) => {
        setStrokes(prev => prev.filter(stroke => {
            if (stroke.points) {
                return !stroke.points.some(p => {
                    const dx = p.x - pt.x;
                    const dy = p.y - pt.y;
                    return (dx * dx + dy * dy) <= (radius * radius);
                });
            } else if (stroke.type === 'rect' || stroke.type === 'arrow') {
                const minX = Math.min(stroke.startX, stroke.endX) - radius;
                const maxX = Math.max(stroke.startX, stroke.endX) + radius;
                const minY = Math.min(stroke.startY, stroke.endY) - radius;
                const maxY = Math.max(stroke.startY, stroke.endY) + radius;
                return !(pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY);
            }
            return true;
        }));
    };

    // Pointer event handlers for drawing
    const handlePointerDown = (e) => {
        if (tool === 'select') return;
        const coords = getCanvasCoords(e);

        if (tool === 'eraser') {
            isDrawingRef.current = true;
            eraseNear(coords);
            return;
        }

        if (tool === 'text') {
            setActiveTextInput({
                id: Date.now(),
                x: coords.x,
                y: coords.y,
                text: '',
                color,
                fontSize: strokeWidth === 2 ? 14 : strokeWidth === 4 ? 18 : 24
            });
            return;
        }

        isDrawingRef.current = true;
        setRedoStack([]); // New action invalidates redo stack

        if (tool === 'pen' || tool === 'highlighter') {
            setCurrentStroke({
                type: tool,
                color,
                width: strokeWidth,
                points: [coords]
            });
        } else if (tool === 'rect' || tool === 'arrow') {
            setCurrentStroke({
                type: tool,
                color,
                width: strokeWidth,
                startX: coords.x,
                startY: coords.y,
                endX: coords.x,
                endY: coords.y
            });
        }
    };

    const handlePointerMove = (e) => {
        if (!isDrawingRef.current) return;
        const coords = getCanvasCoords(e);

        if (tool === 'eraser') {
            eraseNear(coords);
            return;
        }

        if (tool === 'pen' || tool === 'highlighter') {
            setCurrentStroke(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    points: [...prev.points, coords]
                };
            });
        } else if (tool === 'rect' || tool === 'arrow') {
            setCurrentStroke(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    endX: coords.x,
                    endY: coords.y
                };
            });
        }
    };

    const handlePointerUp = () => {
        if (!isDrawingRef.current) return;
        isDrawingRef.current = false;

        if (currentStroke) {
            setStrokes(prev => [...prev, currentStroke]);
            setCurrentStroke(null);
        }
    };

    // Actions
    const handleUndo = () => {
        if (strokes.length === 0) return;
        const last = strokes[strokes.length - 1];
        setStrokes(prev => prev.slice(0, prev.length - 1));
        setRedoStack(prev => [last, ...prev]);
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[0];
        setRedoStack(prev => prev.slice(1));
        setStrokes(prev => [...prev, next]);
    };

    const handleClearAll = () => {
        if (strokes.length === 0 && textInputs.length === 0) return;
        setStrokes([]);
        setRedoStack([]);
        setTextInputs([]);
        setActiveTextInput(null);
        toast.info('Annotations cleared');
    };

    const handleCommitText = () => {
        if (!activeTextInput) return;
        if (activeTextInput.text.trim()) {
            setTextInputs(prev => [...prev, activeTextInput]);
        }
        setActiveTextInput(null);
    };

    // File Source for PDF
    const fileSource = pdfData && pdfData.byteLength > 0 ? { data: pdfData } : resolvedPdfUrl;

    return (
        <div className="fixed inset-0 z-50 bg-[#121214] flex flex-col text-[#F5F5F7] select-none font-sans overflow-hidden">
            {/* Top Minimalist Header */}
            <header className="h-12 px-4 bg-[#18181B]/95 backdrop-blur-md border-b border-[#27272A] flex items-center justify-between shrink-0 z-30">
                <div className="flex items-center gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-[#27272A] text-[11px] font-mono text-[#A1A1AA] flex items-center gap-1.5">

                        <span>Live Whiteboard</span>
                    </span>
                    <span className="text-xs text-[#71717A] hidden md:inline">|</span>
                    <h2 className="text-xs sm:text-sm font-medium text-white truncate max-w-[240px] sm:max-w-md">
                        {note?.title || 'Document Annotation'}
                    </h2>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium hidden sm:inline">
                        CampusAxis Whiteboard
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* PDF Page Controls */}
                    {isPdf && numPages && (
                        <div className="flex items-center gap-1 mr-2 bg-[#27272A]/70 px-2 py-1 rounded-lg text-xs">
                            <button
                                onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                                disabled={pageNumber <= 1}
                                className="p-1 hover:bg-[#3F3F46] rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#D4D4D8]"
                                title="Previous Page"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="text-[11px] font-mono text-[#E4E4E7] px-1">
                                {pageNumber} / {numPages}
                            </span>
                            <button
                                onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                                disabled={pageNumber >= numPages}
                                className="p-1 hover:bg-[#3F3F46] rounded disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed text-[#D4D4D8]"
                                title="Next Page"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}

                    {/* Zoom Controls */}
                    <div className="hidden sm:flex items-center gap-1 bg-[#27272A]/70 px-1.5 py-1 rounded-lg text-xs">
                        <button
                            onClick={() => setScale(s => Math.max(0.6, s - 0.15))}
                            className="p-1 hover:bg-[#3F3F46] rounded text-[#D4D4D8] cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut size={13} />
                        </button>
                        <span className="text-[11px] font-mono text-[#A1A1AA] px-1 min-w-[36px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(s => Math.min(2.5, s + 0.15))}
                            className="p-1 hover:bg-[#3F3F46] rounded text-[#D4D4D8] cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn size={13} />
                        </button>
                    </div>

                    {/* Exit Full Screen */}
                    <button
                        onClick={handleClose}
                        className="px-3 py-1.5 bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#3F3F46]"
                        title="Close Full Screen (Esc)"
                    >
                        <Minimize2 size={13} />
                        <span className="hidden sm:inline">Exit Full Screen</span>
                    </button>
                </div>
            </header>

            {/* Document + Canvas Annotation Workspace */}
            <div
                ref={containerRef}
                className="relative flex-1 w-full h-[calc(100vh-3rem)] overflow-auto bg-[#18181B] flex justify-center items-start"
            >
                {/* 1. Underlying Note Content */}
                <div
                    className="relative min-w-full min-h-full flex flex-col items-center p-4 sm:p-8"
                    style={{
                        transform: `scale(${scale})`,
                        transformOrigin: 'top center',
                        transition: 'transform 0.1s ease-out'
                    }}
                >
                    {isPdf && fileSource ? (
                        <Document
                            file={fileSource}
                            onLoadSuccess={({ numPages: n }) => setNumPages(n)}
                            loading={
                                <div className="text-xs text-[#71717A] py-20 flex flex-col items-center gap-2">
                                    <div className="w-5 h-5 border-2 border-[#0071E3] border-t-transparent rounded-full animate-spin" />
                                    <span>Rendering document page...</span>
                                </div>
                            }
                            className="flex flex-col items-center shadow-2xl rounded-xl overflow-hidden border border-[#27272A]"
                        >
                            <Page
                                pageNumber={pageNumber}
                                width={Math.min(window.innerWidth - 64, 960)}
                                renderAnnotationLayer={false}
                                renderTextLayer={false}
                                className="bg-white shadow-xl"
                            />
                        </Document>
                    ) : docxHtml ? (
                        <div className="max-w-4xl w-full bg-white text-[#1D1D1F] rounded-2xl p-8 sm:p-12 shadow-2xl border border-[#27272A]">
                            <div
                                className="docx-content prose prose-slate max-w-none"
                                dangerouslySetInnerHTML={{ __html: docxHtml }}
                            />
                        </div>
                    ) : note?.fileUrl && ['png', 'jpg', 'jpeg', 'webp'].some(ext => note.fileUrl.toLowerCase().endsWith(ext)) ? (
                        <img
                            src={blobUrl || resolvedPdfUrl}
                            alt={note.title}
                            className="max-w-4xl max-h-[85vh] object-contain rounded-2xl border border-[#27272A] shadow-2xl bg-white"
                        />
                    ) : note?.extractedText ? (
                        <div className="max-w-4xl w-full bg-white text-[#1D1D1F] rounded-2xl p-8 sm:p-12 shadow-2xl border border-[#27272A]">
                            <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                                {note.extractedText}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-24 text-[#71717A] text-sm">
                            Document preview ready for whiteboard annotation.
                        </div>
                    )}
                </div>

                {/* 2. Live HTML5 Annotation Canvas Overlay */}
                <canvas
                    ref={canvasRef}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className={`absolute inset-0 z-20 ${tool === 'select'
                        ? 'pointer-events-none cursor-default'
                        : tool === 'eraser'
                            ? 'pointer-events-auto cursor-cell'
                            : tool === 'text'
                                ? 'pointer-events-auto cursor-text'
                                : 'pointer-events-auto cursor-crosshair'
                        }`}
                />

                {/* 3. Committed Text Annotations */}
                {textInputs.map(txt => (
                    <div
                        key={txt.id}
                        className="absolute z-20 pointer-events-none font-semibold px-2 py-0.5 rounded"
                        style={{
                            left: txt.x,
                            top: txt.y,
                            color: txt.color,
                            fontSize: `${txt.fontSize}px`,
                            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
                        }}
                    >
                        {txt.text}
                    </div>
                ))}

                {/* 4. Active Text Input Box */}
                {activeTextInput && (
                    <div
                        className="absolute z-30 flex items-center gap-1.5 bg-[#18181B] border border-[#3F3F46] rounded-lg p-1.5 shadow-2xl"
                        style={{
                            left: Math.min(activeTextInput.x, window.innerWidth - 260),
                            top: Math.min(activeTextInput.y, window.innerHeight - 80)
                        }}
                    >
                        <input
                            type="text"
                            autoFocus
                            value={activeTextInput.text}
                            onChange={e => setActiveTextInput({ ...activeTextInput, text: e.target.value })}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleCommitText();
                                if (e.key === 'Escape') setActiveTextInput(null);
                            }}
                            placeholder="Type note & hit Enter..."
                            className="bg-[#27272A] text-white text-xs px-2.5 py-1.5 rounded outline-none border border-transparent focus:border-[#0071E3] w-48"
                        />
                        <button
                            onClick={handleCommitText}
                            className="p-1.5 bg-[#0071E3] hover:bg-[#0077ED] text-white rounded text-xs font-semibold cursor-pointer"
                        >
                            Add
                        </button>
                        <button
                            onClick={() => setActiveTextInput(null)}
                            className="p-1.5 hover:bg-[#27272A] text-[#A1A1AA] rounded text-xs cursor-pointer"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* Eraser.io Inspired Floating Minimalist Bottom Toolbar */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-[#18181B]/90 backdrop-blur-xl border border-[#27272A] shadow-2xl">
                {/* Select / Pan Tool */}
                <button
                    onClick={() => setTool('select')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'select'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Select & Navigate Document"
                >
                    <MousePointer size={16} />
                </button>

                <div className="w-[1px] h-5 bg-[#27272A] mx-0.5" />

                {/* Pen Tool */}
                <button
                    onClick={() => setTool('pen')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'pen'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Pen (Freehand Writing)"
                >
                    <Pen size={16} />
                </button>

                {/* Highlighter Tool */}
                <button
                    onClick={() => setTool('highlighter')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'highlighter'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Highlighter"
                >
                    <Highlighter size={16} />
                </button>

                {/* Eraser Tool */}
                <button
                    onClick={() => setTool('eraser')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'eraser'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Eraser"
                >
                    <Eraser size={16} />
                </button>

                {/* Text Annotation Tool */}
                <button
                    onClick={() => setTool('text')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'text'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Text Annotation"
                >
                    <Type size={16} />
                </button>

                {/* Rectangle Tool */}
                <button
                    onClick={() => setTool('rect')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'rect'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Rectangle Box"
                >
                    <Square size={16} />
                </button>

                {/* Arrow Pointer Tool */}
                <button
                    onClick={() => setTool('arrow')}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${tool === 'arrow'
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'hover:bg-[#27272A] text-[#A1A1AA] hover:text-white'
                        }`}
                    title="Arrow Pointer"
                >
                    <ArrowUpRight size={16} />
                </button>

                <div className="w-[1px] h-5 bg-[#27272A] mx-0.5" />

                {/* Color Palette Dropdown / Swatches */}
                <div className="flex items-center gap-1 px-1">
                    {COLORS.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setColor(c.hex)}
                            className={`w-4 h-4 rounded-full transition-transform cursor-pointer border ${color === c.hex
                                ? 'scale-125 border-white ring-2 ring-[#0071E3]/50'
                                : 'border-white/20 hover:scale-110'
                                }`}
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                        />
                    ))}
                </div>

                <div className="w-[1px] h-5 bg-[#27272A] mx-0.5" />

                {/* Stroke Width Selector */}
                <div className="flex items-center gap-1 bg-[#27272A]/70 p-0.5 rounded-lg">
                    {STROKE_WIDTHS.map(sw => (
                        <button
                            key={sw.label}
                            onClick={() => setStrokeWidth(sw.width)}
                            className={`px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${strokeWidth === sw.width
                                ? 'bg-[#0071E3] text-white'
                                : 'text-[#A1A1AA] hover:text-white'
                                }`}
                        >
                            {sw.label}
                        </button>
                    ))}
                </div>

                <div className="w-[1px] h-5 bg-[#27272A] mx-0.5" />

                {/* Undo & Redo */}
                <button
                    onClick={handleUndo}
                    disabled={strokes.length === 0}
                    className="p-2 hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Undo (Ctrl+Z)"
                >
                    <Undo2 size={16} />
                </button>
                <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-2 hover:bg-[#27272A] text-[#A1A1AA] hover:text-white rounded-xl disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Redo (Ctrl+Y)"
                >
                    <Redo2 size={16} />
                </button>

                {/* Clear All */}
                <button
                    onClick={handleClearAll}
                    disabled={strokes.length === 0 && textInputs.length === 0}
                    className="p-2 hover:bg-rose-500/20 text-[#A1A1AA] hover:text-rose-400 rounded-xl disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed transition-colors"
                    title="Clear All Annotations"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
}
