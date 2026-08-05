import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, RefreshCw, X, ImageIcon, Sparkles, CheckCircle2, Zap, Eye } from 'lucide-react';
import { applyScanFilterToCanvas } from '../utils/helpers';

// =============================================================================
// Inline Sobel Edge Document Detector - Runs directly on video frames
// =============================================================================
function detectDocumentInFrame(sourceCanvas) {
  try {
    const sampleW = 160; // Smaller for real-time performance
    const imgW = sourceCanvas.width || 640;
    const imgH = sourceCanvas.height || 480;
    const sampleH = Math.round((imgH * sampleW) / imgW);

    const sc = document.createElement('canvas');
    sc.width = sampleW;
    sc.height = sampleH;
    const sctx = sc.getContext('2d');
    sctx.drawImage(sourceCanvas, 0, 0, sampleW, sampleH);

    const imageData = sctx.getImageData(0, 0, sampleW, sampleH);
    const data = imageData.data;

    // Build luminance map
    const lum = new Float32Array(sampleW * sampleH);
    for (let i = 0; i < data.length; i += 4) {
      lum[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    const getLum = (x, y) => lum[y * sampleW + x];

    // Sobel gradient detection
    let minX = sampleW, minY = sampleH, maxX = 0, maxY = 0;
    let edgeCount = 0;

    for (let y = 1; y < sampleH - 1; y++) {
      for (let x = 1; x < sampleW - 1; x++) {
        const gx =
          -getLum(x - 1, y - 1) + getLum(x + 1, y - 1) +
          -2 * getLum(x - 1, y) + 2 * getLum(x + 1, y) +
          -getLum(x - 1, y + 1) + getLum(x + 1, y + 1);
        const gy =
          -getLum(x - 1, y - 1) - 2 * getLum(x, y - 1) - getLum(x + 1, y - 1) +
          getLum(x - 1, y + 1) + 2 * getLum(x, y + 1) + getLum(x + 1, y + 1);
        const mag = Math.abs(gx) + Math.abs(gy);
        if (mag > 40) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          edgeCount++;
        }
      }
    }

    if (edgeCount < 50 || maxX <= minX || maxY <= minY) {
      return { x: 5, y: 5, w: 90, h: 90, confidence: 0 };
    }

    const pad = 2;
    const cropX = Math.max(0, minX - pad);
    const cropY = Math.max(0, minY - pad);
    const cropW = Math.min(sampleW - cropX, (maxX - minX) + pad * 2);
    const cropH = Math.min(sampleH - cropY, (maxY - minY) + pad * 2);

    const pctX = Math.round((cropX / sampleW) * 100);
    const pctY = Math.round((cropY / sampleH) * 100);
    const pctW = Math.round((cropW / sampleW) * 100);
    const pctH = Math.round((cropH / sampleH) * 100);

    // Confidence score: how much did we trim vs original?
    const trimmed = (pctX > 3 || pctY > 3 || pctW < 94 || pctH < 94);
    const confidence = trimmed && pctW >= 25 && pctH >= 25 ? edgeCount : 0;

    return { x: pctX, y: pctY, w: pctW, h: pctH, confidence };
  } catch (e) {
    return { x: 5, y: 5, w: 90, h: 90, confidence: 0 };
  }
}

// Crop image canvas using percentage bounds
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

// =============================================================================
// Main CameraScanner Component
// =============================================================================
export default function CameraScanner({ onAddPhoto, onClose, isDarkMode = true, t = {} }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [scannedCount, setScannedCount] = useState(0);
  const [scannedPreviews, setScannedPreviews] = useState([]); // Array of preview URLs
  const [liveDetection, setLiveDetection] = useState({ x: 5, y: 5, w: 90, h: 90, confidence: 0 });
  const [autoScanReady, setAutoScanReady] = useState(false); // true when doc is stable & ready

  const videoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const rafRef = useRef(null);
  const stabilityRef = useRef({ frames: 0, lastBounds: null });
  const AUTO_CAPTURE_FRAMES = 30; // ~1 second of stable detection before auto-capture notification

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
      setCameraError('Cannot access camera. Use photo upload below.');
      setIsCameraActive(false);
    }
  }, [facingMode, stream]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [facingMode]);

  // ─── Real-Time Live Frame Analysis Loop ─────────────────────────────────────
  useEffect(() => {
    if (!isCameraActive) return;

    let frameSkip = 0;
    const SKIP_FRAMES = 6; // Analyse every 6th frame for performance

    const analyzeFrame = () => {
      const video = videoRef.current;
      const overlayCanvas = overlayCanvasRef.current;

      if (video && video.readyState >= 2 && overlayCanvas) {
        frameSkip++;
        if (frameSkip >= SKIP_FRAMES) {
          frameSkip = 0;

          // Draw video frame to temp canvas for analysis
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = video.videoWidth || 640;
          tempCanvas.height = video.videoHeight || 480;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx.drawImage(video, 0, 0);

          // Detect document bounds in this frame
          const detection = detectDocumentInFrame(tempCanvas);

          setLiveDetection(detection);

          // Stability check: if same region detected for N frames → auto-ready
          const last = stabilityRef.current.lastBounds;
          if (last && detection.confidence > 200) {
            const diffX = Math.abs(detection.x - last.x);
            const diffY = Math.abs(detection.y - last.y);
            const diffW = Math.abs(detection.w - last.w);
            const diffH = Math.abs(detection.h - last.h);

            if (diffX < 4 && diffY < 4 && diffW < 4 && diffH < 4) {
              stabilityRef.current.frames++;
              if (stabilityRef.current.frames >= AUTO_CAPTURE_FRAMES) {
                setAutoScanReady(true);
              }
            } else {
              stabilityRef.current.frames = 0;
              setAutoScanReady(false);
            }
          } else {
            stabilityRef.current.frames = 0;
            setAutoScanReady(false);
          }
          stabilityRef.current.lastBounds = detection;

          // Draw overlay on transparent canvas overlay
          overlayCanvas.width = overlayCanvas.offsetWidth;
          overlayCanvas.height = overlayCanvas.offsetHeight;
          const octx = overlayCanvas.getContext('2d');
          octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

          if (detection.confidence > 100) {
            const ox = (detection.x / 100) * overlayCanvas.width;
            const oy = (detection.y / 100) * overlayCanvas.height;
            const ow = (detection.w / 100) * overlayCanvas.width;
            const oh = (detection.h / 100) * overlayCanvas.height;

            const isReady = stabilityRef.current.frames >= AUTO_CAPTURE_FRAMES;
            const color = isReady ? 'rgba(34, 197, 94, 0.9)' : 'rgba(99, 102, 241, 0.9)';
            const fillColor = isReady ? 'rgba(34, 197, 94, 0.08)' : 'rgba(99, 102, 241, 0.08)';

            // Fill
            octx.fillStyle = fillColor;
            octx.fillRect(ox, oy, ow, oh);

            // Border
            octx.strokeStyle = color;
            octx.lineWidth = 3;
            octx.setLineDash([]);
            octx.strokeRect(ox, oy, ow, oh);

            // Corner handles
            const handleSize = 14;
            octx.fillStyle = color;
            [[ox, oy], [ox + ow - handleSize, oy], [ox, oy + oh - handleSize], [ox + ow - handleSize, oy + oh - handleSize]].forEach(([hx, hy]) => {
              octx.fillRect(hx, hy, handleSize, handleSize);
            });
          }
        }
      }

      rafRef.current = requestAnimationFrame(analyzeFrame);
    };

    rafRef.current = requestAnimationFrame(analyzeFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isCameraActive]);

  // ─── Capture Frame + AI Crop + Add to Queue ─────────────────────────────────
  const captureAndProcess = useCallback(async (customBounds = null) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;

    setIsCapturing(true);
    setAutoScanReady(false);
    stabilityRef.current.frames = 0;

    try {
      const w = video.videoWidth || 1280;
      const h = video.videoHeight || 720;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      // Use live detection bounds or run fresh detection
      const bounds = customBounds || liveDetection;
      const croppedCanvas = cropCanvasByBounds(canvas, bounds);

      croppedCanvas.toBlob(
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
          setScannedPreviews((prev) => [...prev.slice(-3), previewUrl]);
        },
        'image/jpeg',
        0.88
      );
    } catch (e) {
      console.warn('Capture error:', e);
    } finally {
      setIsCapturing(false);
    }
  }, [liveDetection, onAddPhoto]);

  // ─── Upload Gallery Photos ───────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    for (const file of files) {
      await new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const bounds = detectDocumentInFrame(canvas);
          const croppedCanvas = cropCanvasByBounds(canvas, bounds);

          croppedCanvas.toBlob(
            (blob) => {
              if (!blob) { resolve(); return; }
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
              setScannedPreviews((prev) => [...prev.slice(-3), previewUrl]);
              URL.revokeObjectURL(url);
              resolve();
            },
            'image/jpeg',
            0.88
          );
        };
        img.src = url;
      });
    }
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    stabilityRef.current = { frames: 0, lastBounds: null };
    setAutoScanReady(false);
  };

  // ─── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)' }}>
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-white text-sm font-bold">
            AI Document Scanner
          </span>
        </div>

        <div className="flex items-center gap-2">
          {scannedCount > 0 && (
            <button
              onClick={() => { stopCamera(); onClose(); }}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Done ({scannedCount})</span>
            </button>
          )}
          <button
            onClick={() => { stopCamera(); onClose(); }}
            className="p-2 rounded-full bg-black/50 text-white border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Camera Viewport - Full Screen */}
      <div className="relative flex-1 bg-black overflow-hidden">
        {isCameraActive ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Real-time AI Detection Overlay Canvas */}
            <canvas
              ref={overlayCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            />

            {/* Status indicator */}
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20">
              {autoScanReady ? (
                <div className="px-4 py-2 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg animate-bounce">
                  <Zap className="w-4 h-4" />
                  <span>Document Detected! Tap to Capture!</span>
                </div>
              ) : liveDetection.confidence > 100 ? (
                <div className="px-4 py-2 rounded-full bg-indigo-500/80 text-white text-xs font-bold flex items-center gap-2 backdrop-blur">
                  <Eye className="w-4 h-4 animate-pulse" />
                  <span>Scanning for document edges...</span>
                </div>
              ) : (
                <div className="px-4 py-2 rounded-full bg-black/50 text-white/70 text-xs font-semibold flex items-center gap-2 backdrop-blur border border-white/10">
                  <Camera className="w-4 h-4" />
                  <span>Point camera at a document</span>
                </div>
              )}
            </div>

          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <Camera className="w-16 h-16 text-slate-500" />
            <p className="text-sm text-slate-400 text-center px-8 max-w-xs">
              {cameraError || 'Starting camera...'}
            </p>
            <button
              onClick={() => startCamera(facingMode)}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="absolute bottom-0 left-0 right-0 z-20 pb-8 pt-4 px-6 flex items-center justify-between"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}>

        {/* Gallery Upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/30 flex items-center justify-center overflow-hidden">
            {scannedPreviews.length > 0 ? (
              <img src={scannedPreviews[scannedPreviews.length - 1]} alt="last" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon className="w-5 h-5 text-white" />
            )}
          </div>
          <span className="text-white/60 text-[10px] font-medium">Gallery</span>
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />

        {/* Main Capture Button */}
        <button
          onClick={() => captureAndProcess()}
          disabled={isCapturing}
          className={`w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-2xl transition-all active:scale-95 ${
            autoScanReady
              ? 'border-emerald-400 bg-emerald-500 shadow-emerald-500/50 scale-110'
              : 'border-white bg-white/20'
          }`}
        >
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            autoScanReady ? 'bg-emerald-400' : 'bg-white'
          }`}>
            {isCapturing
              ? <div className="w-6 h-6 border-3 border-slate-800 border-t-transparent rounded-full animate-spin" />
              : autoScanReady
              ? <Zap className="w-7 h-7 text-white" />
              : null
            }
          </div>
        </button>

        {/* Flip Camera */}
        <button
          onClick={toggleCamera}
          className="flex flex-col items-center gap-1"
        >
          <div className="w-12 h-12 rounded-xl bg-black/60 border border-white/30 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <span className="text-white/60 text-[10px] font-medium">Flip</span>
        </button>
      </div>

      {/* Scanned counter badge */}
      {scannedCount > 0 && (
        <div className="absolute bottom-36 left-1/2 -translate-x-1/2 z-20">
          <div className="px-4 py-1.5 rounded-full bg-black/60 text-white text-xs font-bold border border-white/20 backdrop-blur flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>{scannedCount} scanned</span>
          </div>
        </div>
      )}
    </div>
  );
}
