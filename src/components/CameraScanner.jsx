import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, RotateCw, Wand2, Image as ImageIcon, Sparkles, Maximize, Crop, Scissors, Sparkle } from 'lucide-react';
import { applyScanFilterToCanvas, detectDocumentCropBounds } from '../utils/helpers';

export default function CameraScanner({ onAddPhoto, onClose, isDarkMode = true, t = {} }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [filter, setFilter] = useState('none'); // Default to Original photo colors as requested
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);

  // Interactive Photo Crop State (0-100% bounds)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [dragHandle, setDragHandle] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 100, h: 100 } });

  // Start Camera Stream
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(newStream);
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.warn('Camera Access Error:', err);
      setCameraError('Unable to access camera. You can still upload a photo below.');
      setIsCameraActive(false);
    }
  };

  // Stop Camera Stream
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  // Flip Camera Front / Back
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Run AI Auto Edge Detection on Canvas
  const runAutoDetectCrop = async (sourceCanvas) => {
    setIsAutoDetecting(true);
    try {
      const bounds = await detectDocumentCropBounds(sourceCanvas);
      setCropArea(bounds);
    } catch (e) {
      console.warn('Auto crop error:', e);
      setCropArea({ x: 0, y: 0, w: 100, h: 100 });
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Capture Snapshot from Video Stream
  const handleCapture = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedDataUrl(dataUrl);
    stopCamera();

    // Auto AI Document Crop
    await runAutoDetectCrop(canvas);
  };

  // Handle Photo File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const dataUrl = evt.target?.result;
      setCapturedDataUrl(dataUrl);
      stopCamera();

      const img = new Image();
      img.onload = async () => {
        await runAutoDetectCrop(img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Render Filtered Canvas Preview
  useEffect(() => {
    if (!capturedDataUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      // Handle canvas dimensions according to rotation
      if (rotation === 90 || rotation === 270) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      if (rotation === 90) {
        ctx.translate(canvas.width, 0);
        ctx.rotate((90 * Math.PI) / 180);
      } else if (rotation === 180) {
        ctx.translate(canvas.width, canvas.height);
        ctx.rotate((180 * Math.PI) / 180);
      } else if (rotation === 270) {
        ctx.translate(0, canvas.height);
        ctx.rotate((270 * Math.PI) / 180);
      }
      ctx.drawImage(img, 0, 0, w, h);
      ctx.restore();

      // Apply selected scan filter algorithm
      if (filter !== 'none') {
        applyScanFilterToCanvas(ctx, canvas.width, canvas.height, filter);
      }
    };
    img.src = capturedDataUrl;
  }, [capturedDataUrl, filter, rotation]);

  // Direct On-Image Drag Corner Logic (No Bottom Sliders)
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

    setCropArea(() => {
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

      return {
        x: Math.round(x),
        y: Math.round(y),
        w: Math.round(w),
        h: Math.round(h),
      };
    });
  };

  const handleDragEnd = () => {
    setDragHandle(null);
  };

  // Add event listeners for dragging
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
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [dragHandle]);

  // Save / Add Scanned & Cropped Photo to Queue
  const handleAddScannedPhoto = () => {
    if (!canvasRef.current && !capturedDataUrl) return;

    const fullCanvas = canvasRef.current;
    if (!fullCanvas) return;

    let targetCanvas = fullCanvas;

    // Apply Crop if cropped area < 100%
    if (cropArea.w < 100 || cropArea.h < 100 || cropArea.x > 0 || cropArea.y > 0) {
      const cropX = Math.round((cropArea.x / 100) * fullCanvas.width);
      const cropY = Math.round((cropArea.y / 100) * fullCanvas.height);
      const cropW = Math.max(50, Math.round((cropArea.w / 100) * fullCanvas.width));
      const cropH = Math.max(50, Math.round((cropArea.h / 100) * fullCanvas.height));

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(fullCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
      targetCanvas = croppedCanvas;
    }

    targetCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const fileName = `scanned_photo_${Date.now()}.jpg`;
        const fileObj = new File([blob], fileName, { type: 'image/jpeg' });
        const previewUrl = URL.createObjectURL(blob);

        onAddPhoto({
          id: `scan-${Date.now()}`,
          file: fileObj,
          name: fileName,
          size: blob.size,
          preview: previewUrl,
        });

        // Reset to capture another
        setCapturedDataUrl(null);
        setCropArea({ x: 0, y: 0, w: 100, h: 100 });
        startCamera();
      },
      'image/jpeg',
      0.88
    );
  };

  const modalBg = isDarkMode ? 'bg-slate-900 border-indigo-500/30 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-2xl';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className={`border rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] ${modalBg}`}>
        
        {/* Modal Header */}
        <div className={`p-4 sm:p-5 border-b flex items-center justify-between ${isDarkMode ? 'border-slate-800 bg-slate-950/50' : 'border-slate-200 bg-slate-50'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Camera className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg flex items-center gap-2">
                <span>{t.scannerTitle || 'Photo Scanner & AI Auto-Crop'}</span>
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {t.scannerDesc || 'Capture photos, AI auto-detects edges, or drag corner handles directly on the image'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className={`p-2 rounded-xl border transition-colors ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white' : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {!capturedDataUrl ? (
            /* Live Camera Feed View */
            <div className="w-full max-w-lg flex flex-col items-center gap-4">
              <div className="relative w-full aspect-[4/3] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center shadow-inner">
                {isCameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-center p-6">
                    <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 max-w-xs mx-auto">
                      {cameraError || 'Camera stream offline.'}
                    </p>
                  </div>
                )}

                {/* Target Overlay Scanner Frame */}
                {isCameraActive && (
                  <div className="absolute inset-6 border-2 border-dashed border-indigo-400/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[11px] font-semibold text-indigo-300 bg-slate-950/80 px-3 py-1 rounded-full border border-indigo-500/40">
                      {t.alignPhoto || 'Align photo inside frame'}
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-4">
                {isCameraActive && (
                  <button
                    onClick={toggleFacingMode}
                    className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-md"
                    title="Switch Camera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}

                {isCameraActive && (
                  <button
                    onClick={handleCapture}
                    className="w-16 h-16 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 active:scale-95 shadow-xl shadow-indigo-500/40 flex items-center justify-center border-4 border-white/20 transition-transform"
                    title="Take Photo"
                  >
                    <div className="w-8 h-8 rounded-full bg-white" />
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 flex items-center justify-center shadow-md"
                  title="Upload Photo"
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
            </div>
          ) : (
            /* Filter & On-Image Corner Drag Crop Preview */
            <div className="w-full max-w-xl flex flex-col items-center gap-4">
              
              {/* Image Preview Canvas with DIRECT Interactive Corner Handles */}
              <div
                ref={imageContainerRef}
                className="relative max-h-[380px] max-w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center shadow-2xl select-none"
              >
                <canvas ref={canvasRef} className="max-h-[380px] max-w-full object-contain pointer-events-none" />

                {/* Direct On-Image Corner & Edge Drag Overlay (NO SLIDERS) */}
                <div
                  onMouseDown={(e) => handleDragStart(e, 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'move')}
                  className="absolute border-2 border-indigo-400 bg-indigo-500/15 rounded-lg cursor-grab active:cursor-grabbing shadow-xl transition-shadow"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.w}%`,
                    height: `${cropArea.h}%`,
                  }}
                >
                  {/* Badge */}
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-bold pointer-events-none flex items-center gap-1 shadow-sm">
                    <Crop className="w-3 h-3" /> Auto-Crop
                  </span>

                  {/* Corner Handle Dots directly ON TOP of the picture */}
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

              {/* Quick Presets Bar */}
              <div className={`w-full border rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2 ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => runAutoDetectCrop(canvasRef.current)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
                    title="Run AI Edge Auto-Detect"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> AI Auto Detect
                  </button>

                  <button
                    onClick={() => setCropArea({ x: 0, y: 0, w: 100, h: 100 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    title="100% Full Photo"
                  >
                    <Maximize className="w-3.5 h-3.5" /> {t.entirePhoto || 'Entire Photo (100%)'}
                  </button>

                  <button
                    onClick={() => setCropArea({ x: 4, y: 4, w: 92, h: 92 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    title="Trim Border Margins"
                  >
                    <Scissors className="w-3.5 h-3.5" /> {t.trimMargins || 'Trim Margins'}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> {t.rotate || 'Rotate'}
                  </button>
                </div>
              </div>

              {/* Scan Filter Options */}
              <div className={`w-full border rounded-2xl p-3.5 space-y-2 ${
                isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-500">
                  <Wand2 className="w-4 h-4" /> Document Scan Effect:
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'bw', name: 'B&W Scan', desc: 'Crisp Document' },
                    { id: 'grayscale', name: 'Grayscale', desc: 'Clean Gray' },
                    { id: 'magic', name: 'Magic Color', desc: 'Enhanced' },
                    { id: 'none', name: 'Original', desc: 'No Filter' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilter(f.id)}
                      className={`p-2 rounded-xl text-center border transition-all ${
                        filter === f.id
                          ? 'bg-indigo-600/30 border-indigo-500 text-indigo-500 font-bold ring-1 ring-indigo-500'
                          : isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className="text-xs font-semibold">{f.name}</div>
                      <div className="text-[10px] opacity-75">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setCapturedDataUrl(null);
                    setCropArea({ x: 0, y: 0, w: 100, h: 100 });
                    startCamera();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.retake || 'Retake / Upload Another'}</span>
                </button>

                <button
                  onClick={handleAddScannedPhoto}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{t.addPhotoToQueue || 'Add Scanned Photo to PDF Queue'}</span>
                </button>
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
