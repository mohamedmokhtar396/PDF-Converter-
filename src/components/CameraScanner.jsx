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
    const SKIP = 5; // analyse every 5th frame

    const analyzeFrame = () => {
      const video = videoRef.current;
      const overlay = overlayCanvasRef.current;

      if (video && video.readyState >= 2 && overlay) {
        frameSkip++;
        if (frameSkip >= SKIP) {
          frameSkip = 0;

          // Match overlay pixel dimensions to the video element's rendered size
          const rect = video.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            overlay.width = rect.width;
            overlay.height = rect.height;
          }

          // Render video frame to offscreen canvas for analysis
          const vw = video.videoWidth || 640;
          const vh = video.videoHeight || 480;
          if (vw > 0 && vh > 0) {
            const temp = document.createElement('canvas');
            temp.width = vw;
            temp.height = vh;
            temp.getContext('2d').drawImage(video, 0, 0);

            // Inline fast Otsu detection on the live frame
            const sW = 160, sH = Math.round(vh * sW / vw);
            const sc = document.createElement('canvas');
            sc.width = sW; sc.height = sH;
            const sctx = sc.getContext('2d');
            sctx.drawImage(temp, 0, 0, sW, sH);
            const { data } = sctx.getImageData(0, 0, sW, sH);

            const lumArr = new Uint8Array(sW * sH);
            for (let i = 0; i < data.length; i += 4) {
              lumArr[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            }

            // Corner average to pick mode
            const cs = Math.round(sW * 0.08);
            let cSum = 0, cCnt = 0;
            for (let cy = 0; cy < cs; cy++) {
              for (let cx = 0; cx < cs; cx++) {
                cSum += lumArr[cy * sW + cx] + lumArr[cy * sW + (sW - 1 - cx)] +
                        lumArr[(sH - 1 - cy) * sW + cx] + lumArr[(sH - 1 - cy) * sW + (sW - 1 - cx)];
                cCnt += 4;
              }
            }
            const cAvg = cSum / cCnt;

            let minX = sW, minY = sH, maxX = 0, maxY = 0, found = 0;

            if (cAvg < 130) {
              // Dark background — Otsu threshold to find bright paper
              const hist = new Int32Array(256);
              for (let i = 0; i < lumArr.length; i++) hist[lumArr[i]]++;
              const total = lumArr.length;
              let sum = 0; for (let t = 0; t < 256; t++) sum += t * hist[t];
              let sumB = 0, wB = 0, maxVar = 0, thresh = 128;
              for (let t = 0; t < 256; t++) {
                wB += hist[t]; if (!wB) continue;
                const wF = total - wB; if (!wF) break;
                sumB += t * hist[t];
                const v = wB * wF * ((sumB / wB) - ((sum - sumB) / wF)) ** 2;
                if (v > maxVar) { maxVar = v; thresh = t; }
              }
              thresh = Math.max(thresh, 140);
              for (let y = 0; y < sH; y++) for (let x = 0; x < sW; x++) {
                if (lumArr[y * sW + x] >= thresh) {
                  if (x < minX) minX = x; if (x > maxX) maxX = x;
                  if (y < minY) minY = y; if (y > maxY) maxY = y;
                  found++;
                }
              }
            } else {
              minX = 2; minY = 2; maxX = sW - 3; maxY = sH - 3; found = 9999;
            }

            let detection = { x: 5, y: 5, w: 90, h: 90, confidence: 0 };
            if (found > 100 && maxX > minX && maxY > minY) {
              detection = {
                x: Math.round((minX / sW) * 100),
                y: Math.round((minY / sH) * 100),
                w: Math.round(((maxX - minX) / sW) * 100),
                h: Math.round(((maxY - minY) / sH) * 100),
                confidence: found,
              };
            }

            setLiveDetection(detection);

            // Stability check
            const last = stabilityRef.current.lastBounds;
            if (last && detection.confidence > 200) {
              const stable = Math.abs(detection.x - last.x) < 5 &&
                             Math.abs(detection.y - last.y) < 5 &&
                             Math.abs(detection.w - last.w) < 5 &&
                             Math.abs(detection.h - last.h) < 5;
              if (stable) {
                stabilityRef.current.frames++;
                if (stabilityRef.current.frames >= AUTO_CAPTURE_FRAMES) setAutoScanReady(true);
              } else {
                stabilityRef.current.frames = 0;
                setAutoScanReady(false);
              }
            } else {
              stabilityRef.current.frames = 0;
              setAutoScanReady(false);
            }
            stabilityRef.current.lastBounds = detection;

            // Draw overlay
            const octx = overlay.getContext('2d');
            octx.clearRect(0, 0, overlay.width, overlay.height);

            const isReady = stabilityRef.current.frames >= AUTO_CAPTURE_FRAMES;
            if (detection.confidence > 100) {
              const ox = (detection.x / 100) * overlay.width;
              const oy = (detection.y / 100) * overlay.height;
              const ow = (detection.w / 100) * overlay.width;
              const oh = (detection.h / 100) * overlay.height;

              const color = isReady ? 'rgba(34,197,94,0.95)' : 'rgba(99,102,241,0.95)';
              const fill  = isReady ? 'rgba(34,197,94,0.10)' : 'rgba(99,102,241,0.10)';

              octx.fillStyle = fill;
              octx.fillRect(ox, oy, ow, oh);
              octx.strokeStyle = color;
              octx.lineWidth = 3;
              octx.strokeRect(ox, oy, ow, oh);

              const hs = 16;
              octx.fillStyle = color;
              [[ox, oy], [ox + ow - hs, oy], [ox, oy + oh - hs], [ox + ow - hs, oy + oh - hs]].forEach(([hx, hy]) => {
                octx.fillRect(hx, hy, hs, hs);
              });
            }
          }
        }
      }

      rafRef.current = requestAnimationFrame(analyzeFrame);
    };

    rafRef.current = requestAnimationFrame(analyzeFrame);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
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
