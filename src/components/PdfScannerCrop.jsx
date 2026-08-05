import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { jsPDF } from 'jspdf';
import { applyScanFilterToCanvas, formatBytes } from '../utils/helpers';
import { Wand2, Crop, RotateCw, Check, ArrowLeft, ArrowRight, Layers, FileText, Sparkles, Sliders, Maximize, Scissors } from 'lucide-react';

// Configure pdfjs worker locally for 100% offline usage
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


export default function PdfScannerCrop({ pdfFile, onComplete, onCancel }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageConfigs, setPageConfigs] = useState([]); // Array of { filter: 'bw', rotation: 0, crop: { x, y, w, h } }
  const [isRendering, setIsRendering] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfDoc, setPdfDoc] = useState(null);

  // Active page editing state
  const [activeFilter, setActiveFilter] = useState('bw');
  const [activeRotation, setActiveRotation] = useState(0);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 }); // percentage 0-100%

  const previewCanvasRef = useRef(null);
  const cropContainerRef = useRef(null);

  // Load PDF Document
  useEffect(() => {
    if (!pdfFile) return;

    let isMounted = true;
    setIsRendering(true);

    const loadPdf = async () => {
      try {
        const buffer = await pdfFile.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: buffer }).promise;
        if (!isMounted) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);

        // Initialize default config for each page
        const initialConfigs = Array.from({ length: doc.numPages }, () => ({
          filter: 'bw',
          rotation: 0,
          crop: { x: 0, y: 0, w: 100, h: 100 },
        }));
        setPageConfigs(initialConfigs);
        setIsRendering(false);
      } catch (err) {
        console.error('PDF load error:', err);
        setIsRendering(false);
      }
    };

    loadPdf();

    return () => {
      isMounted = false;
    };
  }, [pdfFile]);

  // Render Current Page Canvas Preview with Scan Filter & Rotation
  const renderCurrentPage = async () => {
    if (!pdfDoc || !previewCanvasRef.current) return;

    try {
      const page = await pdfDoc.getPage(currentPage);
      const viewport = page.getViewport({ scale: 1.5 });

      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      // Config for this page
      const config = pageConfigs[currentPage - 1] || { filter: activeFilter, rotation: activeRotation, crop: cropArea };
      const currentRot = config.rotation;

      if (currentRot === 90 || currentRot === 270) {
        canvas.width = viewport.height;
        canvas.height = viewport.width;
      } else {
        canvas.width = viewport.width;
        canvas.height = viewport.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Render PDF page to offscreen canvas first
      const offCanvas = document.createElement('canvas');
      offCanvas.width = viewport.width;
      offCanvas.height = viewport.height;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });

      await page.render({ canvasContext: offCtx, viewport }).promise;

      // Draw onto target canvas with rotation
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

      // Apply scan filter
      if (config.filter && config.filter !== 'none') {
        applyScanFilterToCanvas(ctx, canvas.width, canvas.height, config.filter);
      }
    } catch (e) {
      console.warn('Page render error:', e);
    }
  };

  useEffect(() => {
    renderCurrentPage();
  }, [pdfDoc, currentPage, pageConfigs, activeFilter, activeRotation]);

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

  // Update All Pages to Current Filter
  const applyFilterToAllPages = (filterName) => {
    setActiveFilter(filterName);
    setPageConfigs((prev) =>
      prev.map((item) => ({ ...item, filter: filterName }))
    );
  };

  // Final Export: Process all pages with filters & crop, compile back to PDF
  const handleExportScannedPdf = async () => {
    if (!pdfDoc) return;
    setIsProcessing(true);

    try {
      let doc = null;

      for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 }); // 2.0 HD scale

        const config = pageConfigs[i - 1] || { filter: 'bw', rotation: 0, crop: { x: 0, y: 0, w: 100, h: 100 } };

        // Render raw page
        const rawCanvas = document.createElement('canvas');
        rawCanvas.width = viewport.width;
        rawCanvas.height = viewport.height;
        const rawCtx = rawCanvas.getContext('2d', { willReadFrequently: true });
        await page.render({ canvasContext: rawCtx, viewport }).promise;

        // Rotated & Filtered Canvas
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

        // Apply Scan Filter
        if (config.filter && config.filter !== 'none') {
          applyScanFilterToCanvas(rotCtx, rotCanvas.width, rotCanvas.height, config.filter);
        }

        // Apply Crop if cropped
        const crop = config.crop || { x: 0, y: 0, w: 100, h: 100 };
        let finalCanvas = rotCanvas;

        if (crop.w < 100 || crop.h < 100 || crop.x > 0 || crop.y > 0) {
          const cropX = Math.round((crop.x / 100) * rotCanvas.width);
          const cropY = Math.round((crop.y / 100) * rotCanvas.height);
          const cropW = Math.max(50, Math.round((crop.w / 100) * rotCanvas.width));
          const cropH = Math.max(50, Math.round((crop.h / 100) * rotCanvas.height));

          const croppedCanvas = document.createElement('canvas');
          croppedCanvas.width = cropW;
          croppedCanvas.height = cropH;
          const croppedCtx = croppedCanvas.getContext('2d');
          croppedCtx.drawImage(rotCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          finalCanvas = croppedCanvas;
        }

        // Convert to compressed JPEG data URL
        const dataUrl = finalCanvas.toDataURL('image/jpeg', 0.82);

        // Add to jsPDF
        const pOrient = finalCanvas.width > finalCanvas.height ? 'landscape' : 'portrait';
        const pW = Math.max(100, finalCanvas.width * 0.264583);
        const pH = Math.max(100, finalCanvas.height * 0.264583);

        if (!doc) {
          doc = new jsPDF({
            orientation: pOrient,
            unit: 'mm',
            format: [pW, pH],
            compress: true,
          });
        } else {
          doc.addPage([pW, pH], pOrient);
        }

        doc.addImage(dataUrl, 'JPEG', 0, 0, pW, pH);

        // Yield for GC
        await new Promise((r) => setTimeout(r, 0));
      }

      const outBlob = doc.output('blob');
      const baseName = pdfFile.name.replace(/\.[^/.]+$/, '');
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

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-6 mb-8 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800 mb-6">
        <div>
          <h3 className="text-xl font-extrabold text-white flex items-center gap-2">
            <span>PDF Document Scanner & Crop</span>
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </h3>
          <p className="text-xs text-slate-400">
            Convert digital PDFs into realistic scanned documents and crop margins/photos inside pages.
          </p>
        </div>

        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
        >
          Cancel
        </button>
      </div>

      {isRendering ? (
        <div className="text-center py-12 text-slate-400">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-semibold">Loading and rendering PDF pages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Page Preview Column */}
          <div className="lg:col-span-2 flex flex-col items-center">
            
            {/* Page Navigation Toolbar */}
            <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-200">
                  Page {currentPage} of {numPages}
                </span>
                <button
                  disabled={currentPage === numPages}
                  onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const fullCrop = { x: 0, y: 0, w: 100, h: 100 };
                    setCropArea(fullCrop);
                    updateCurrentPageConfig('crop', fullCrop);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Crop Entire Content / Full Page"
                >
                  <Maximize className="w-3.5 h-3.5" /> Entire Content
                </button>

                <button
                  onClick={() => {
                    const trimCrop = { x: 4, y: 4, w: 92, h: 92 };
                    setCropArea(trimCrop);
                    updateCurrentPageConfig('crop', trimCrop);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  title="Trim Empty White Margins"
                >
                  <Scissors className="w-3.5 h-3.5" /> Trim Margins
                </button>

                <button
                  onClick={() => {
                    const newRot = ((currentConfig.rotation || 0) + 90) % 360;
                    updateCurrentPageConfig('rotation', newRot);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> Rotate
                </button>

                <button
                  onClick={() => setIsCropping(!isCropping)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isCropping
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  <Crop className="w-3.5 h-3.5" /> {isCropping ? 'Cropping Active' : 'Crop Handles'}
                </button>
              </div>
            </div>

            {/* Interactive Preview Canvas Window */}
            <div
              ref={cropContainerRef}
              className="relative w-full min-h-[400px] max-h-[520px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-3"
            >
              <canvas
                ref={previewCanvasRef}
                className="max-h-[500px] max-w-full object-contain shadow-2xl rounded-lg"
              />

              {/* Interactive Crop Box Overlay */}
              {isCropping && (
                <div
                  className="absolute border-2 border-dashed border-indigo-400 bg-indigo-500/10 rounded-lg pointer-events-auto"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.w}%`,
                    height: `${cropArea.h}%`,
                  }}
                >
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold">
                    Crop Region
                  </span>
                </div>
              )}
            </div>

            {/* Quick Crop Controls Sliders if cropping */}
            {isCropping && (
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-4 mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Inset Left: {cropArea.x}%</label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={cropArea.x}
                    onChange={(e) => {
                      const newX = Number(e.target.value);
                      const newW = 100 - newX - (100 - cropArea.x - cropArea.w);
                      setCropArea((prev) => ({ ...prev, x: newX, w: Math.max(20, newW) }));
                      updateCurrentPageConfig('crop', { ...cropArea, x: newX, w: Math.max(20, newW) });
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Inset Top: {cropArea.y}%</label>
                  <input
                    type="range"
                    min="0"
                    max="40"
                    value={cropArea.y}
                    onChange={(e) => {
                      const newY = Number(e.target.value);
                      const newH = 100 - newY - (100 - cropArea.y - cropArea.h);
                      setCropArea((prev) => ({ ...prev, y: newY, h: Math.max(20, newH) }));
                      updateCurrentPageConfig('crop', { ...cropArea, y: newY, h: Math.max(20, newH) });
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Width: {cropArea.w}%</label>
                  <input
                    type="range"
                    min="20"
                    max={100 - cropArea.x}
                    value={cropArea.w}
                    onChange={(e) => {
                      const newW = Number(e.target.value);
                      setCropArea((prev) => ({ ...prev, w: newW }));
                      updateCurrentPageConfig('crop', { ...cropArea, w: newW });
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Height: {cropArea.h}%</label>
                  <input
                    type="range"
                    min="20"
                    max={100 - cropArea.y}
                    value={cropArea.h}
                    onChange={(e) => {
                      const newH = Number(e.target.value);
                      setCropArea((prev) => ({ ...prev, h: newH }));
                      updateCurrentPageConfig('crop', { ...cropArea, h: newH });
                    }}
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Settings & Export Controls Column */}
          <div className="flex flex-col justify-between space-y-6 bg-slate-950/60 border border-slate-800 rounded-2xl p-5">
            <div>
              <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-indigo-400" />
                <span>Scanner Filter Options</span>
              </h4>

              {/* Filter Selection Grid */}
              <div className="space-y-2.5 mb-6">
                {[
                  { id: 'bw', name: 'High-Contrast B&W Scan', desc: 'Converts page into clean black & white document' },
                  { id: 'grayscale', name: 'Document Grayscale', desc: 'Smooth grayscale paper scan look' },
                  { id: 'magic', name: 'Magic Color Scan', desc: 'Enhances colors and boosts contrast' },
                  { id: 'paper', name: 'Vintage Paper Scan', desc: 'Adds warm scanner paper tone' },
                  { id: 'none', name: 'Original PDF (No Filter)', desc: 'Keep original PDF color' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      updateCurrentPageConfig('filter', f.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      currentConfig.filter === f.id
                        ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold ring-1 ring-indigo-500'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="text-xs font-bold text-slate-200">{f.name}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{f.desc}</div>
                  </button>
                ))}
              </div>

              {/* Apply Filter to All Pages Button */}
              <button
                onClick={() => applyFilterToAllPages(currentConfig.filter || 'bw')}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 text-xs font-semibold mb-6 flex items-center justify-center gap-2"
              >
                <Layers className="w-4 h-4" /> Apply Filter to All {numPages} Pages
              </button>
            </div>

            {/* Export Main Action */}
            <div className="pt-4 border-t border-slate-800">
              <button
                disabled={isProcessing}
                onClick={handleExportScannedPdf}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-extrabold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2.5 transition-all duration-300 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Scanned PDF...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Save Scanned & Cropped PDF</span>
                  </>
                )}
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
