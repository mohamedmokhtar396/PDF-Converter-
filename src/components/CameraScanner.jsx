import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, ImageIcon, Sparkles, CheckCircle2, Zap, Crop, Check, Layers } from 'lucide-react';
import { applyScanFilterToCanvas, detectDocumentCropBounds } from '../utils/helpers';

// Helper to crop canvas by percentage bounds
function cropCanvasByBounds(source, bounds) {
  const { x, y, w, h } = bounds;
  const cx = Math.round((x / 100) * source.width);
  const cy = Math.round((y / 100) * source.height);
  const cw = Math.max(50, Math.round((w / 100) * source.width));
  const ch = Math.max(50, Math.round((h / 100) * source.height));

  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  const ctx = out.getContext('2d');
  ctx.drawImage(source, cx, cy, cw, ch, 0, 0, cw, ch);
  return out;
}

export default function CameraScanner({ onAddPhoto, onClose, isDarkMode = true, t = {} }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  // Active Photo Inspection & AI Crop State
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [activeImageCanvas, setActiveImageCanvas] = useState(null);
  const [cropArea, setCropArea] = useState({ x: 5, y: 5, w: 90, h: 90 });
  const [dragHandle, setDragHandle] = useState(null);

  const videoRef = useRef(null);
  const previewCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, crop: { x: 5, y: 5, w: 90, h: 90 } });

  // ─── Start Camera ───────────────────────────────────────────────────────────
  const startCamera = useCallback(async (mode) => {
    setCameraError(null);
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode || facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        const v = videoRef.current;
        v.srcObject = newStream;
        v.setAttribute('playsinline', '');
        v.setAttribute('webkit-playsinline', '');
        v.muted = true;
        v.onloadedmetadata = () => {
          v.play().catch(() => {});
        };
      }
    } catch (err) {
      console.warn('Camera error:', err);
      setCameraError('Cannot access camera. You can upload photos below.');
      setIsCameraActive(false);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => stopCamera();
  }, [facingMode]);

  // ─── Open Inspection & Run AI Paper Crop ────────────────────────────────────
  const openInspectionAndAutoCrop = async (canvasSource, dataUrl) => {
    stopCamera();
    setActiveImageCanvas(canvasSource);
    setCapturedDataUrl(dataUrl);

    // Run AI paper edge detection
    try {
      const bounds = await detectDocumentCropBounds(canvasSource);
      setCropArea(bounds);
    } catch (e) {
      setCropArea({ x: 5, y: 5, w: 90, h: 90 });
    }
  };

  // ─── Capture Photo from Camera ──────────────────────────────────────────────
  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setIsCapturing(true);
    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      await openInspectionAndAutoCrop(canvas, dataUrl);
    } catch (e) {
      console.warn('Capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  };

  // ─── Upload Gallery Photo ───────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        await openInspectionAndAutoCrop(canvas, dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Render Image Preview on Canvas in Inspection View
  useEffect(() => {
    if (!capturedDataUrl || !previewCanvasRef.current || !activeImageCanvas) return;
    const canvas = previewCanvasRef.current;
    canvas.width = activeImageCanvas.width;
    canvas.height = activeImageCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(activeImageCanvas, 0, 0);
  }, [capturedDataUrl, activeImageCanvas]);

  // Confirm Current Cropped Photo & Add to PDF List
  const handleConfirmCroppedPhoto = () => {
    if (!activeImageCanvas) return;

    const cropped = cropCanvasByBounds(activeImageCanvas, cropArea);
    cropped.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `scanned_${Date.now()}.jpg`;
        const fileObj = new File([blob], fileName, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        onAddPhoto({
          id: `scan-${Date.now()}`,
          file: fileObj,
          name: fileName,
          size: blob.size,
          preview: previewUrl,
        });

        setScannedCount((c) => c + 1);
        setCapturedDataUrl(null);
        setActiveImageCanvas(null);
        startCamera();
      },
      'image/jpeg',
      0.88
    );
  };

  // Direct Drag Corner Handles Logic
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
    if (!dragHandle || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    const dxPct = ((clientX - startPosRef.current.x) / rect.width) * 100;
    const dyPct = ((clientY - startPosRef.current.y) / rect.height) * 100;
    const initial = startPosRef.current.crop;

    let { x, y, w, h } = initial;

    if (dragHandle === 'nw') {
      const newX = Math.max(0, Math.min(initial.x + initial.w - 10, initial.x + dxPct));
      const newY = Math.max(0, Math.min(initial.y + initial.h - 10, initial.y + dyPct));
      x = newX; y = newY;
      w = initial.x + initial.w - newX;
      h = initial.y + initial.h - newY;
    } else if (dragHandle === 'ne') {
      const newY = Math.max(0, Math.min(initial.y + initial.h - 10, initial.y + dyPct));
      const newW = Math.max(10, Math.min(100 - initial.x, initial.w + dxPct));
      y = newY; w = newW;
      h = initial.y + initial.h - newY;
    } else if (dragHandle === 'sw') {
      const newX = Math.max(0, Math.min(initial.x + initial.w - 10, initial.x + dxPct));
      const newH = Math.max(10, Math.min(100 - initial.y, initial.h + dyPct));
      x = newX; w = initial.x + initial.w - newX; h = newH;
    } else if (dragHandle === 'se') {
      const newW = Math.max(10, Math.min(100 - initial.x, initial.w + dxPct));
      const newH = Math.max(10, Math.min(100 - initial.y, initial.h + dyPct));
      w = newW; h = newH;
    } else if (dragHandle === 'move') {
      x = Math.max(0, Math.min(100 - initial.w, initial.x + dxPct));
      y = Math.max(0, Math.min(100 - initial.h, initial.y + dyPct));
    }

    setCropArea({
      x: Math.round(x),
      y: Math.round(y),
      w: Math.round(w),
      h: Math.round(h),
    });
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className={`border rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${
        isDarkMode ? 'bg-slate-900 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Camera className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>{capturedDataUrl ? 'AI Document Crop Inspection' : 'Mobile Photo Scanner & AI Auto-Crop'}</span>
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {capturedDataUrl ? 'AI auto-cropped paper. Drag corner handles to fine-tune bounds.' : 'Snap or upload photo — AI crops paper & builds PDF.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scannedCount > 0 && !capturedDataUrl && (
              <button
                onClick={() => { stopCamera(); onClose(); }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Done ({scannedCount} photos)</span>
              </button>
            )}

            <button
              onClick={() => { stopCamera(); onClose(); }}
              className={`p-2 rounded-xl border transition-colors ${
                isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {!capturedDataUrl ? (
            /* Live Camera Feed View */
            <div className="w-full max-w-lg flex flex-col items-center gap-4">
              {scannedCount > 0 && (
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{scannedCount} document photo(s) added to PDF list!</span>
                </div>
              )}

              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    webkit-playsinline="true"
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {cameraError || 'Camera stream initializing...'}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-6 w-full pt-2">
                {isCameraActive && (
                  <button
                    onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                    className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shadow-md"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}

                {isCameraActive && (
                  <button
                    onClick={handleCapture}
                    disabled={isCapturing}
                    className="w-18 h-18 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:scale-105 active:scale-95 shadow-2xl flex items-center justify-center border-4 border-white transition-transform"
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      {isCapturing && <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                    </div>
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 border border-slate-700 flex items-center justify-center shadow-md"
                  title="Upload Photo from Gallery"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <p className="text-xs text-slate-400 text-center font-medium">
                Snap or upload photo — AI crops paper & opens crop preview!
              </p>
            </div>
          ) : (
            /* Interactive AI Crop Inspection View */
            <div className="w-full max-w-xl flex flex-col items-center gap-4">
              <div
                ref={imageContainerRef}
                className="relative max-h-[400px] max-w-full overflow-hidden rounded-2xl border border-indigo-500/50 bg-slate-950 flex items-center justify-center shadow-2xl select-none"
              >
                <canvas ref={previewCanvasRef} className="max-h-[400px] max-w-full object-contain pointer-events-none" />

                {/* AI Crop Corner Drag Handles Overlay */}
                <div
                  onMouseDown={(e) => handleDragStart(e, 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'move')}
                  className="absolute border-2 border-indigo-400 bg-indigo-500/20 rounded-lg cursor-grab active:cursor-grabbing shadow-2xl"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.w}%`,
                    height: `${cropArea.h}%`,
                  }}
                >
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[10px] font-bold pointer-events-none flex items-center gap-1 shadow-md">
                    <Crop className="w-3.5 h-3.5" /> AI Paper Crop ({cropArea.w}% × {cropArea.h}%)
                  </span>

                  {/* 4 Corner Drag Handles ON TOP of the picture */}
                  <div onMouseDown={(e) => handleDragStart(e, 'nw')} onTouchStart={(e) => handleDragStart(e, 'nw')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -left-2.5 cursor-nwse-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'ne')} onTouchStart={(e) => handleDragStart(e, 'ne')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -right-2.5 cursor-nesw-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'sw')} onTouchStart={(e) => handleDragStart(e, 'sw')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -left-2.5 cursor-nesw-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'se')} onTouchStart={(e) => handleDragStart(e, 'se')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -right-2.5 cursor-nwse-resize touch-none shadow-lg" />
                </div>
              </div>

              {/* Inspection Actions */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setCapturedDataUrl(null);
                    setActiveImageCanvas(null);
                    startCamera();
                  }}
                  className={`py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retake / Cancel</span>
                </button>

                <button
                  onClick={handleConfirmCroppedPhoto}
                  className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-xs shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Add Cropped Photo to PDF Queue ({scannedCount + 1})</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
