import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ZoomIn,
  ZoomOut,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileText
} from 'lucide-react';

// Setup pdf.js worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

interface PdfViewerProps {
  url: string;
  fileName?: string;
  className?: string;
}

export default function PdfViewer({ url, fileName = 'document.pdf', className = '' }: PdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState<number>(1.15);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});

  // 1. Fetch document data into memory (No browser auto-download!)
  useEffect(() => {
    let isCancelled = false;

    async function loadPdf() {
      if (!url) {
        setError('No document URL provided');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF (${response.status} ${response.statusText})`);
        }

        const arrayBuffer = await response.arrayBuffer();
        if (isCancelled) return;

        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setLoading(false);
      } catch (err: any) {
        console.error('PDF load error:', err);
        if (!isCancelled) {
          setError(err?.message || 'Failed to render PDF document');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // 2. Render all pages when pdfDoc or scale changes
  useEffect(() => {
    if (!pdfDoc || numPages === 0) return;

    let isRenderCancelled = false;
    const renderTasks: any[] = [];

    async function renderPages() {
      const dpr = window.devicePixelRatio || 1;

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        if (isRenderCancelled) break;

        const canvas = canvasRefs.current[pageNum];
        if (!canvas) continue;

        try {
          const page = await pdfDoc!.getPage(pageNum);
          if (isRenderCancelled) break;

          const viewport = page.getViewport({ scale: scale * dpr });
          const cssViewport = page.getViewport({ scale: scale });

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${cssViewport.width}px`;
          canvas.style.height = `${cssViewport.height}px`;

          const context = canvas.getContext('2d');
          if (!context) continue;

          // Clear previous canvas
          context.clearRect(0, 0, canvas.width, canvas.height);

          const renderTask = page.render({
            canvasContext: context,
            viewport: viewport,
          });

          renderTasks.push(renderTask);
          await renderTask.promise;
        } catch (pageErr: any) {
          // If cancelled due to zoom/re-render, ignore error
          if (pageErr?.name !== 'RenderingCancelledException') {
            console.warn(`Error rendering page ${pageNum}:`, pageErr);
          }
        }
      }
    }

    renderPages();

    return () => {
      isRenderCancelled = true;
      renderTasks.forEach((t) => {
        try {
          t.cancel();
        } catch {}
      });
    };
  }, [pdfDoc, numPages, scale]);

  // Zoom helpers
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.6));
  };

  const handleResetZoom = () => {
    setScale(1.15);
  };

  // Safe manual download only when user clicks "Download" button
  const handleDownload = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch (e) {
      // Fallback
      window.open(url, '_blank');
    }
  };

  // Open in new tab without triggering auto download
  const handleOpenNewTab = async () => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const pdfBlob = new Blob([blob], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(pdfBlob);
      window.open(blobUrl, '_blank');
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-100/90 rounded-xl overflow-hidden border border-gray-200 ${className}`}>
      {/* Top Toolbar for PDF Controls */}
      <div className="bg-white px-4 py-2.5 border-b border-gray-200 flex items-center justify-between gap-3 flex-shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-[#004fcb]" />
          <span className="text-xs font-semibold text-gray-700 truncate max-w-[220px]" title={fileName}>
            {fileName}
          </span>
          {numPages > 0 && (
            <span className="text-[11px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium ml-1">
              {numPages} {numPages === 1 ? 'Page' : 'Pages'}
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-0.5">
          <button
            onClick={handleZoomOut}
            disabled={scale <= 0.6 || loading}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-40 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 rounded transition-colors"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            disabled={scale >= 2.5 || loading}
            className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded disabled:opacity-40 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Action Buttons: Open & Download */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewTab}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-xs font-medium transition-colors shadow-sm"
            title="Open PDF in new tab"
          >
            <ExternalLink className="w-3.5 h-3.5 text-gray-500" />
            <span className="hidden sm:inline">Open New Tab</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#004fcb] hover:bg-[#003bb5] text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
            title="Download PDF File"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Main Document Scroll View Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-auto p-4 sm:p-6 flex flex-col items-center gap-6"
      >
        {loading && (
          <div className="my-auto flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-sm text-center">
            <Loader2 className="w-8 h-8 text-[#004fcb] animate-spin mb-3" />
            <p className="text-sm font-semibold text-gray-800">Rendering Agreement Document...</p>
            <p className="text-xs text-gray-400 mt-1">
              Loading pages directly into viewer without downloading
            </p>
          </div>
        )}

        {error && (
          <div className="my-auto flex flex-col items-center justify-center p-8 bg-white rounded-2xl shadow-sm border border-red-100 max-w-md text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-gray-900">Failed to render PDF</h4>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed">{error}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                onClick={handleDownload}
                className="px-3.5 py-1.5 bg-[#004fcb] hover:bg-[#003bb5] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download Directly
              </button>
            </div>
          </div>
        )}

        {!loading && !error && numPages > 0 && (
          <>
            {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                className="flex flex-col items-center group"
              >
                {/* PDF Page Canvas */}
                <div className="bg-white rounded shadow-md border border-gray-300 overflow-hidden transition-shadow group-hover:shadow-lg">
                  <canvas
                    ref={(el) => {
                      canvasRefs.current[pageNum] = el;
                    }}
                    className="block max-w-full"
                  />
                </div>

                {/* Page Number Label */}
                <span className="text-[11px] font-medium text-gray-500 bg-white/80 backdrop-blur-sm px-2.5 py-0.5 rounded-full mt-2 border border-gray-200 shadow-2xs">
                  Page {pageNum} of {numPages}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
