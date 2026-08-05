import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, RotateCw, Wand2, Image as ImageIcon, Sparkles, Sliders, Layers, Maximize, Crop, Scissors } from 'lucide-react';
import { applyScanFilterToCanvas } from '../utils/helpers';

export default function CameraScanner({ onAddPhoto, onClose, isDarkMode = true, t = {} }) {
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' or 'user'
  const [capturedDataUrl, setCapturedDataUrl] = useState(null);
  const [filter, setFilter] = useState('bw'); // 'bw', 'grayscale', 'magic', 'none'
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Photo Crop State (0-100%)
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, w: 100, h: 100 }); // Defaults to 100% Entire Photo Content

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

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
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Flip Camera Front / Back
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Snapshot from Video Stream
  const handleCapture = () => {
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
    setCropArea({ x: 0, y: 0, w: 100, h: 100 }); // Reset to 100% Entire Photo Content
    stopCamera();
  };

  // Handle Photo File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      setCapturedDataUrl(evt.target?.result);
      setCropArea({ x: 0, y: 0, w: 100, h: 100 }); // Reset to 100% Entire Photo Content
      stopCamera();
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

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
              <Camera className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base sm:text-lg flex items-center gap-2">
                <span>Photo Scanner & Crop to PDF</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">Capture or upload photos, crop entire content, and add to PDF queue</p>
            </div>
          </div>

          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
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
                      Align photo inside frame
                    </span>
                  </div>
                )}
              </div>

              {/* Camera Controls */}
              <div className="flex items-center gap-4">
                {isCameraActive && (
                  <button
                    onClick={toggleFacingMode}
                    className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
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
                  className="p-3 rounded-full bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 flex items-center justify-center"
                  title="Upload Existing Photo"
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
            /* Filter & Scan Preview Editor View */
            <div className="w-full max-w-xl flex flex-col items-center gap-4">
              <div className="relative max-h-[360px] max-w-full overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 flex items-center justify-center shadow-xl">
                <canvas ref={canvasRef} className="max-h-[360px] max-w-full object-contain" />

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
                      Crop Area
                    </span>
                  </div>
                )}
              </div>

              {/* Crop & Scan Quick Presets Bar */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCropArea({ x: 0, y: 0, w: 100, h: 100 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    title="Crop 100% Entire Photo Content"
                  >
                    <Maximize className="w-3.5 h-3.5" /> Entire Photo (100%)
                  </button>

                  <button
                    onClick={() => setCropArea({ x: 4, y: 4, w: 92, h: 92 })}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                    title="Trim Border Margins"
                  >
                    <Scissors className="w-3.5 h-3.5" /> Trim Margins
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setRotation((prev) => (prev + 90) % 360)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-indigo-400" /> Rotate
                  </button>

                  <button
                    onClick={() => setIsCropping(!isCropping)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors ${
                      isCropping
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    <Crop className="w-3.5 h-3.5" /> {isCropping ? 'Cropping Active' : 'Crop Handles'}
                  </button>
                </div>
              </div>

              {/* Crop Sliders if cropping is toggled */}
              {isCropping && (
                <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div>
                    <label className="text-slate-400 block mb-0.5">Left: {cropArea.x}%</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={cropArea.x}
                      onChange={(e) => {
                        const newX = Number(e.target.value);
                        const newW = 100 - newX - (100 - cropArea.x - cropArea.w);
                        setCropArea((prev) => ({ ...prev, x: newX, w: Math.max(20, newW) }));
                      }}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Top: {cropArea.y}%</label>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={cropArea.y}
                      onChange={(e) => {
                        const newY = Number(e.target.value);
                        const newH = 100 - newY - (100 - cropArea.y - cropArea.h);
                        setCropArea((prev) => ({ ...prev, y: newY, h: Math.max(20, newH) }));
                      }}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Width: {cropArea.w}%</label>
                    <input
                      type="range"
                      min="20"
                      max={100 - cropArea.x}
                      value={cropArea.w}
                      onChange={(e) => setCropArea((prev) => ({ ...prev, w: Number(e.target.value) }))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-0.5">Height: {cropArea.h}%</label>
                    <input
                      type="range"
                      min="20"
                      max={100 - cropArea.y}
                      value={cropArea.h}
                      onChange={(e) => setCropArea((prev) => ({ ...prev, h: Number(e.target.value) }))}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                </div>
              )}

              {/* Scan Filter Options */}
              <div className="w-full bg-slate-950/80 border border-slate-800 rounded-2xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5 text-indigo-400">
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
                          ? 'bg-indigo-600/30 border-indigo-500 text-white font-bold ring-1 ring-indigo-500'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
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
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Retake Photo
                </button>

                <button
                  onClick={handleAddScannedPhoto}
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" /> Add Scanned Photo to PDF Queue
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
