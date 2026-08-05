import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, RotateCw, Wand2, Image as ImageIcon, Sparkles, Maximize, Crop, Scissors, CheckCircle2 } from 'lucide-react';
import { applyScanFilterToCanvas, detectDocumentCropBounds } from '../utils/helpers';

export default function CameraScanner({ onAddPhoto, onClose, isDarkMode = true, t = {} }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [filter, setFilter] = useState('none'); // Default to Original photo colors
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isAutoDetecting, setIsAutoDetecting] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);

  // Interactive Photo Crop State (0-100% bounds)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const [dragHandle, setDragHandle] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageContainerRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0, crop: { x: 0, y: 0, w: 100, h: 100 } });

  // Start Camera Stream with explicit Mobile Video Playback fixes (playsinline, muted)
  const startCamera = async (mode = facingMode) => {
    setCameraError(null);
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(newStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = newStream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;
        video.onloadedmetadata = () => {
          video.play().catch((err) => console.warn('Video play error:', err));
        };
      }
    } catch (err) {
      console.warn('Camera Access Error:', err);
      setCameraError('Unable to access camera on mobile device. You can still upload photos below.');
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

  // Process and Auto-Crop Canvas, then add directly to PDF queue
  const processAndAddCroppedPhoto = async (sourceCanvas) => {
    try {
      setIsAutoDetecting(true);
      const bounds = await detectDocumentCropBounds(sourceCanvas);

      const cropX = Math.round((bounds.x / 100) * sourceCanvas.width);
      const cropY = Math.round((bounds.y / 100) * sourceCanvas.height);
      const cropW = Math.max(50, Math.round((bounds.w / 100) * sourceCanvas.width));
      const cropH = Math.max(50, Math.round((bounds.h / 100) * sourceCanvas.height));

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');
      croppedCtx.drawImage(sourceCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

      if (filter !== 'none') {
        applyScanFilterToCanvas(croppedCtx, cropW, cropH, filter);
      }

      croppedCanvas.toBlob(
        (blob) => {
          if (!blob) return;
          const fileName = `scanned_photo_${Date.now()}_${scannedCount + 1}.jpg`;
          const fileObj = new File([blob], fileName, { type: 'image/jpeg' });
          const previewUrl = URL.createObjectURL(blob);

          onAddPhoto({
            id: `scan-${Date.now()}-${scannedCount}`,
            file: fileObj,
            name: fileName,
            size: blob.size,
            preview: previewUrl,
          });

          setScannedCount((c) => c + 1);
        },
        'image/jpeg',
        0.88
      );
    } catch (e) {
      console.warn('Auto process error:', e);
    } finally {
      setIsAutoDetecting(false);
    }
  };

  // Capture Snapshot & Instant CamScanner Auto-Crop
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

    // Auto Crop & Add directly to PDF queue
    await processAndAddCroppedPhoto(canvas);
  };

  // Handle Photo File Upload (Multiple or Single)
  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      await new Promise((res) => {
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          await processAndAddCroppedPhoto(canvas);
          URL.revokeObjectURL(objUrl);
          res();
        };
        img.src = objUrl;
      });
    }
  };

  // Render Preview Canvas for manual inspection if needed
  useEffect(() => {
    if (!capturedDataUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

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

      if (filter !== 'none') {
        applyScanFilterToCanvas(ctx, canvas.width, canvas.height, filter);
      }
    };
    img.src = capturedDataUrl;
  }, [capturedDataUrl, filter, rotation]);

  // Direct On-Image Drag Corner Logic
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
                <span>{t.scannerTitle || 'Mobile Photo Scanner & AI Auto-Crop'}</span>
                <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              </h3>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                Snap or upload photos — AI automatically crops document paper & builds your PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {scannedCount > 0 && (
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Finish ({scannedCount} photos)</span>
              </button>
            )}

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
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center justify-center">
          {!capturedDataUrl ? (
            /* Live Camera Feed View */
            <div className="w-full max-w-lg flex flex-col items-center gap-4">
              
              {/* Scanned Badge Counter */}
              {scannedCount > 0 && (
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 animate-bounce">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{scannedCount} scanned document photo(s) added to PDF queue!</span>
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

              {/* Camera Action Controls */}
              <div className="flex items-center justify-center gap-6 w-full pt-2">
                {isCameraActive && (
                  <button
                    onClick={toggleFacingMode}
                    className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 shadow-md"
                    title="Switch Camera"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                )}

                {isCameraActive && (
                  <button
                    onClick={handleCapture}
                    disabled={isAutoDetecting}
                    className="w-18 h-18 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/50 flex items-center justify-center border-4 border-white transition-transform"
                    title="Snap Document Photo"
                  >
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      {isAutoDetecting && <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />}
                    </div>
                  </button>
                )}

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3.5 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 flex items-center justify-center shadow-md"
                  title="Upload Photos from Gallery"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Tap photo button to snap & AI auto-crops paper directly into PDF!
              </p>
            </div>
          ) : (
            /* Manual Inspection & Adjustment View if Triggered */
            <div className="w-full max-w-xl flex flex-col items-center gap-4">
              <div
                ref={imageContainerRef}
                className="relative max-h-[380px] max-w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center shadow-2xl select-none"
              >
                <canvas ref={canvasRef} className="max-h-[380px] max-w-full object-contain pointer-events-none" />

                <div
                  onMouseDown={(e) => handleDragStart(e, 'move')}
                  onTouchStart={(e) => handleDragStart(e, 'move')}
                  className="absolute border-2 border-indigo-400 bg-indigo-500/15 rounded-lg cursor-grab active:cursor-grabbing shadow-2xl"
                  style={{
                    left: `${cropArea.x}%`,
                    top: `${cropArea.y}%`,
                    width: `${cropArea.w}%`,
                    height: `${cropArea.h}%`,
                  }}
                >
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-indigo-600 text-white font-mono text-[9px] font-bold pointer-events-none flex items-center gap-1 shadow-sm">
                    <Crop className="w-3 h-3" /> Auto Crop
                  </span>

                  <div onMouseDown={(e) => handleDragStart(e, 'nw')} onTouchStart={(e) => handleDragStart(e, 'nw')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -left-2.5 cursor-nwse-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'ne')} onTouchStart={(e) => handleDragStart(e, 'ne')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -top-2.5 -right-2.5 cursor-nesw-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'sw')} onTouchStart={(e) => handleDragStart(e, 'sw')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -left-2.5 cursor-nesw-resize touch-none shadow-lg" />
                  <div onMouseDown={(e) => handleDragStart(e, 'se')} onTouchStart={(e) => handleDragStart(e, 'se')} className="w-5 h-5 bg-indigo-500 border-2 border-white rounded-full absolute -bottom-2.5 -right-2.5 cursor-nwse-resize touch-none shadow-lg" />
                </div>
              </div>

              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    setCapturedDataUrl(null);
                    startCamera();
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Snap Another</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
