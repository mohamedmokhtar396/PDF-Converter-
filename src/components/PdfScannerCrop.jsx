import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import { applyScanFilterToCanvas, detectDocumentCropBounds, formatBytes } from '../utils/helpers';
import { Wand2, Crop, RotateCw, Check, ArrowLeft, ArrowRight, Layers, FileText, Sparkles, Maximize, Scissors } from 'lucide-react';

// Configure pdfjs worker locally for 100% offline usage
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function PdfScannerCrop({ pdfFile, onComplete, onCancel, isDarkMode = true, t = {} }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageConfigs, setPageConfigs] = useState([]); // Array of { filter: 'bw', rotation: 0, crop: { x, y, w, h } }
  const [isRendering, setIsRendering] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);

  const [activeFilter, setActiveFilter] = useState('none'); // Default to Original photo colors
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [dragHandle, setDragHandle] = useState(null);
  const [renderProgress, setRenderProgress] = useState({ loaded: 0, total: 0, percent: 0 });

  const previewCanvasRef = useRef(null);
  const cropContainerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 100, h: 100 } });

  // Load PDF Document & Run AI Auto-Crop Edge Detection on Pages
  useEffect(() => {
    if (!pdfFile) return;

    let isMounted = true;
    setIsRendering(true);
    setRenderProgress({ loaded: 0, total: 1, percent: 0 });

    const loadPdf = async () => {
      try {
        const buffer = await pdfFile.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setRenderProgress({ loaded: 0, total: doc.numPages, percent: 0 });

        // Auto-detect crop bounds for each page with progress reporting
        const configs = [];
        for (let i = 1; i <= doc.numPages; i++) {
          const pct = Math.round((i / doc.numPages) * 100);
          if (isMounted) {
            setRenderProgress({ loaded: i, total: doc.numPages, percent: pct });
          }

          // Micro-pause for smooth UI re-render & animation
          await new Promise((r) => setTimeout(r, 0));

          try {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 1.0 });
            const sampleCanvas = document.createElement('canvas');
            sampleCanvas.width = viewport.width;
            sampleCanvas.height = viewport.height;
            const sampleCtx = sampleCanvas.getContext('2d');
            await page.render({ canvasContext: sampleCtx, viewport }).promise;

            const autoBounds = await detectDocumentCropBounds(sampleCanvas);
            configs.push({
              filter: 'none',
              rotation: 0,
              crop: autoBounds,
            });
          } catch (e) {
            configs.push({ filter: 'none', rotation: 0, crop: { x: 4, y: 4, w: 92, h: 92 } });
          }
        }

        if (!isMounted) return;
        setPageConfigs(configs);
        if (configs[0]) setCropArea(configs[0].crop);
        setIsRendering(false);
      } catch (err) {
        console.error('PDF load error:', err);
        if (isMounted) setIsRendering(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfFile]);

  // Sync cropArea state when changing active page
  useEffect(() => {
    if (pageConfigs[currentPage - 1]) {
      setCropArea(pageConfigs[currentPage - 1].crop || { x: 0, y: 0, w: 100, h: 100 });
    }
  }, [currentPage]);

  // Render Current Page Canvas Preview with Scan Filter & Rotation
  const renderCurrentPage = async () => {
    if (!pdfDoc || !previewCanvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      const config = pageConfigs[currentPage - 1] || { filter: activeFilter, rotation: 0, crop: cropArea };
      const currentRot = config.rotation || 0;

      if (currentRot === 90 || currentRot === 270) {
        canvas.width = viewport.height;
        canvas.height = viewport.width;
      } else {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const offCanvas = document.createElement('canvas');
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

      await page.render({ canvasContext: offCtx, viewport }).promise;

      ctx.save();
      if (currentRot === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (currentRot === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (currentRot === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((270 * Math.PI) / 180);
      }
      ctx.drawImage(offCanvas, 0, 0);
      ctx.restore();

      if (config.filter && config.filter !== 'none') {
        applyScanFilterToCanvas(ctx, canvas.width, canvas.height, config.filter);
      }
    } catch (e) {
      console.warn('Page render error:', e);
    }
  };

  useEffect(() => {
    renderCurrentPage();
  }, [pdfDoc, currentPage, pageConfigs]);

  // Update Config for Current Page
  const updateCurrentPageConfig = (key, value) => {
    setPageConfigs((prev) => {
      const copy = [...prev];
      if (!copy[currentPage - 1]) return prev;
      copy[currentPage - 1] = {
        ...copy[currentPage - 1],
        [key]: value,
      };
      return copy;
    });
  };

  // Direct On-Image Corner Drag Logic (No Bottom Sliders)
  const handleDragStart = (e, handle) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragHandle(handle);
    startPosRef.current = {
      x: clientX,
      y: clientY,
      crop: { ...cropArea },
    };
  };

  const handleDragMove = (e) => {
    if (!dragHandle || !cropContainerRef.current) return;
    const rect = cropContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dxPct = ((clientX - startPosRef.current.x) / rect.width) * 100;
    const dyPct = ((clientY - startPosRef.current.y) / rect.height) * 100;
    const initial = startPosRef.current.crop;

    let { x, y, w, h } = initial;

    if (dragHandle === 'nw') {
      const newX = Math.max(0, Math.min(initial.x + initial.w - 10, initial.x + dxPct));
      const newY = Math.max(0, Math.min(initial.y + initial.h - 10, initial.y + dyPct));
      x = newX;
      y = newY;
      w = initial.x + initial.w - newX;
      h = initial.y + initial.h - newY;
    } else if (dragHandle === 'ne') {
      const newY = Math.max(0, Math.min(initial.y + initial.h - 10, initial.y + dyPct));
      const newW = Math.max(10, Math.min(100 - initial.x, initial.w + dxPct));
      y = newY;
      w = newW;
      h = initial.y + initial.h - newY;
    } else if (dragHandle === 'sw') {
      const newX = Math.max(0, Math.min(initial.x + initial.w - 10, initial.x + dxPct));
      const newH = Math.max(10, Math.min(100 - initial.y, initial.h + dyPct));
      x = newX;
      w = initial.x + initial.w - newX;
      h = newH;
    } else if (dragHandle === 'se') {
      const newW = Math.max(10, Math.min(100 - initial.x, initial.w + dxPct));
      const newH = Math.max(10, Math.min(100 - initial.y, initial.h + dyPct));
      w = newW;
      h = newH;
    } else if (dragHandle === 'move') {
      x = Math.max(0, Math.min(100 - initial.w, initial.x + dxPct));
      y = Math.max(0, Math.min(100 - initial.h, initial.y + dyPct));
    }

    const updatedCrop = {
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    };

    setCropArea(updatedCrop);
    updateCurrentPageConfig('crop', updatedCrop);
  };

  const handleDragEnd = () => {
    setDragHandle(null);
  };

  useEffect(() => {
    if (dragHandle) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleDragMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragHandle]);

  // Update All Pages to Current Filter
  const applyFilterToAllPages = (filterName) => {
    setActiveFilter(filterName);
    setPageConfigs((prev) =>
      prev.map((item) => ({ ...item, filter: filterName }))
    );
  };

  // Run AI Auto Edge Detection on Current Page Canvas
  const handleRunPageAutoCrop = async () => {
    if (!previewCanvasRef.current) return;
    const bounds = await detectDocumentCropBounds(previewCanvasRef.current);
    setCropArea(bounds);
    updateCurrentPageConfig('crop', bounds);
  };

  // Final Export: Process all pages with filters & crop, compile back to PDF
  const handleExportScannedPdf = async () => {
    if (!pdfDoc) return;
    setIsProcessing(true);

    try {
      let doc = null;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });

        const config = pageConfigs[i - 1] || { filter: 'bw', rotation: 0, crop: { x: 0, y: 0, w: 100, h: 100 } };

        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = viewport.width;
        rawCanvas.height = viewport.height;
        const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: rawCtx, viewport }).promise;

        const rotCanvas = document.createElement('canvas');
        const rot = config.rotation || 0;

        if (rot === 90 || rot === 270) {
          rotCanvas.width = viewport.height;
          rotCanvas.height = viewport.width;
        } else {
          rotCanvas.width = viewport.width;
          rotCanvas.height = viewport.height;
        }

        const rotCtx = rotCanvas.getContext('2d', { willReadFrequently: true });
        rotCtx.save();
        if (rot === 90) {
          rotCtx.translate(rotCanvas.width, 0);
          rotCtx.rotate((90 * Math.PI) / 180);
        } else if (rot === 180) {
          rotCtx.translate(rotCanvas.width, rotCanvas.height);
          rotCtx.rotate((180 * Math.PI) / 180);
        } else if (rot === 270) {
          rotCtx.translate(0, rotCanvas.height);
          rotCtx.rotate((270 * Math.PI) / 180);
        }
        rotCtx.drawImage(rawCanvas, 0, 0);
        rotCtx.restore();

        if (config.filter && config.filter !== 'none') {
          applyScanFilterToCanvas(rotCtx, rotCanvas.width, rotCanvas.height, config.filter);
        }

        // Apply Crop Area if < 100%
        const c = config.crop || { x: 0, y: 0, w: 100, h: 100 };
        let finalCanvas = rotCanvas;

        if (c.w < 100 || c.h < 100 || c.x > 0 || c.y > 0) {
          const cropX = Math.round((c.x / 100) * rotCanvas.width);
          const cropY = Math.round((c.y / 100) * rotCanvas.height);
          const cropW = Math.max(50, Math.round((c.w / 100) * rotCanvas.width));
          const cropH = Math.max(50, Math.round((c.h / 100) * rotCanvas.height));

          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          finalCanvas = cropCanvas;
        }

        const imgData = finalCanvas.toDataURL('image/jpeg', 0.88);
        const pWidth = finalCanvas.width;
        const pHeight = finalCanvas.height;
        const orientation = pWidth > pHeight ? 'landscape' : 'portrait';

        if (i === 1) {
          doc = new jsPDF({
            orientation,
            unit: 'pt',
            format: [pWidth, pHeight],
          });
          doc.addImage(imgData, 'JPEG', 0, 0, pWidth, pHeight);
        } else {
          doc.addPage([pWidth, pHeight], orientation);
          doc.addImage(imgData, 'JPEG', 0, 0, pWidth, pHeight);
        }

        await new Promise((r) => setTimeout(r, 10));
      }

      const outBlob = doc.output('blob');
      const baseName = pdfFile.name.replace(/\.pdf$/i, '');
      const outName = `${baseName}_scanned.pdf`;

      onComplete({
        blob: outBlob,
        defaultFileName: outName,
        extension: 'pdf',
      });
    } catch (e) {
      console.error('Export error:', e);
      alert('An error occurred during PDF scan processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentConfig = pageConfigs[currentPage - 1] || { filter: 'bw', rotation: 0, crop: { x: 0, y: 0, w: 100, h: 100 } };

  const containerBg = isDarkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  return (
    <div className={`w-full border rounded-3xl p-6 mb-8 backdrop-blur-xl shadow-2xl transition-colors ${containerBg}`}>
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b mb-6 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
        <div>
          <h3 className="text-xl font-extrabold flex items-center gap-2">
            <span>{t.pdfScannerTitle || 'PDF Document Scanner & AI Auto-Crop'}</span>
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {t.pdfScannerDesc || 'AI automatically crops document margins. Drag corner handles directly on top of page.'}
          </p>
        </div>

        <button
          onClick={onCancel}
          className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
            isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
          }`}
        >
          Cancel
        </button>
      </div>

      {isRendering ? (
        <div className="text-center py-12 px-4 max-w-md mx-auto flex flex-col items-center">
          {/* Big Ring % Counter */}
          <div className="relative w-24 h-24 mb-4 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="38" className={isDarkMode ? 'text-slate-800' : 'text-slate-200'} strokeWidth="7" stroke="currentColor" fill="transparent" />
              <circle
                cx="48"
                cy="48"
                r="38"
                className="text-indigo-500 transition-all duration-300 ease-out"
                strokeWidth="7"
                strokeDasharray={238}
                strokeDashoffset={238 - (238 * renderProgress.percent) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-xl font-black tracking-tight">{renderProgress.percent}%</span>
            </div>
          </div>

          <p className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            AI is analyzing PDF page {renderProgress.loaded} of {renderProgress.total} & auto-cropping document margins...
          </p>

          {/* Linear Progress Bar Underneath */}
          <div className={`w-full h-3 rounded-full overflow-hidden relative border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
            <div
              className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 relative"
              style={{ width: `${renderProgress.percent}%` }}
            >
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Page Preview Column */}
          <div className="lg:col-span-2 flex flex-col items-center">
            
            {/* Page Navigation Toolbar */}
            <div className={`w-full border rounded-2xl p-3 mb-4 flex flex-wrap items-center justify-between gap-2 ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  disabled={currentPage === numPages}
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunPageAutoCrop}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                  title="Run AI Edge Auto-Detect for Page"
                >
                  <Sparkles className="w-3.5 h-3.5" /> AI Auto Detect
                </button>

                <button
                  onClick={() => {
                    const fullCrop = { x: 0, y: 0, w: 100, h: 100 };
                    setCropArea(fullCrop);
                    updateCurrentPageConfig('crop', fullCrop);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="100% Entire Content"
                >
                  <Maximize className="w-3.5 h-3.5" /> {t.entireContent || 'Entire Content'}
                </button>

                <button
                  onClick={() => {
                    const newRot = ((currentConfig.rotation || 0) + 90) % 360;
                    updateCurrentPageConfig('rotation', newRot);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> {t.rotate || 'Rotate'}
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas Window with DIRECT On-Image Corner Handles */}
            <div
              ref={cropContainerRef}
              className="relative w-full min-h-[400px] max-h-[520px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-3 select-none shadow-2xl"
            >
              <canvas
                ref={previewCanvasRef}
                className="max-h-[500px] max-w-full object-contain shadow-2xl rounded-lg pointer-events-none"
              />

              {/* Direct On-Canvas Corner Drag Overlay (NO SLIDERS) */}
              <div
                onMouseDown={(e) => handleDragStart(e, 'move')}
                onTouchStart={(e) => handleDragStart(e, 'move')}
                className="absolute border-2 border-indigo-400 bg-indigo-500/15 rounded-lg cursor-grab active:cursor-grabbing shadow-2xl transition-shadow"
                style={{
                  left: `${cropArea.x}%`,
                  top: `${cropArea.y}%`,
                  width: `${cropArea.w}%`,
                  height: `${cropArea.h}%`,
                }}
              >
                <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-bold pointer-events-none flex items-center gap-1 shadow-sm">
                  <Crop className="w-3 h-3" /> Page Crop
                </span>

                {/* 4 Corner Handle Dots directly ON TOP of PDF Page */}
                <div
                  onMouseDown={(e) => handleDragStart(e, 'nw')}
                  onTouchStart={(e) => handleDragStart(e, 'nw')}
                  className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -left-2.5 cursor-nwse-resize touch-none shadow-lg hover:scale-125 transition-transform"
                />
                <div
                  onMouseDown={(e) => handleDragStart(e, 'ne')}
                  onTouchStart={(e) => handleDragStart(e, 'ne')}
                  className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -right-2.5 cursor-nesw-resize touch-none shadow-lg hover:scale-125 transition-transform"
                />
                <div
                  onMouseDown={(e) => handleDragStart(e, 'sw')}
                  onTouchStart={(e) => handleDragStart(e, 'sw')}
                  className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -left-2.5 cursor-nesw-resize touch-none shadow-lg hover:scale-125 transition-transform"
                />
                <div
                  onMouseDown={(e) => handleDragStart(e, 'se')}
                  onTouchStart={(e) => handleDragStart(e, 'se')}
                  className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -right-2.5 cursor-nwse-resize touch-none shadow-lg hover:scale-125 transition-transform"
                />
              </div>
            </div>

          </div>

          {/* Right Sidebar: Scan Filters & Actions */}
          <div className="flex flex-col justify-between space-y-4">
            
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <h4 className="text-sm font-bold flex items-center gap-2 mb-3 text-indigo-500">
                  <Wand2 className="w-4 h-4" /> Scan Filter Presets
                </h4>

                <div className="space-y-2">
                  {[
                    { id: 'bw', name: 'High-Contrast B&W Document', desc: 'Real Paper Scan Look' },
                    { id: 'grayscale', name: 'Clean Grayscale Document', desc: 'Smooth Grayscale' },
                    { id: 'magic', name: 'Magic Color Enhancement', desc: 'Vibrant Colors' },
                    { id: 'none', name: 'Original Digital Page', desc: 'Unfiltered PDF' },
                  ].map((f) => {
                    const isSelected = (currentConfig.filter || 'bw') === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          setActiveFilter(f.id);
                          updateCurrentPageConfig('filter', f.id);
                        }}
                        className={`w-full p-3 rounded-xl text-left border transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-500 font-bold'
                            : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{f.name}</div>
                        <div className="text-[11px] opacity-75">{f.desc}</div>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => applyFilterToAllPages(activeFilter)}
                  className="w-full mt-3 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{t.applyFilterAll || 'Apply Filter to All Pages'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-4">
              <button
                disabled={isProcessing}
                onClick={handleExportScannedPdf}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 hover:from-amber-400 hover:to-rose-500 text-white font-black text-sm shadow-xl shadow-amber-500/25 flex items-center justify-center gap-2 group transition-all disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t.generatingPdf || 'Generating Scanned PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>{t.saveScannedPdf || 'Save Scanned & Cropped PDF'}</span>
                  </>
                )}
              </button>

              <button
                onClick={onCancel}
                className={`w-full py-3 px-4 rounded-xl border text-xs font-semibold ${
                  isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                }`}
              >
                Cancel
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
