import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Edit3, FileText, ArrowLeft, Sparkles, RefreshCw, FileArchive, Check } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes, sanitizeFileName } from '../utils/helpers';
import { saveAs } from 'file-saver';

export default function DownloadResult({ result, activeMode, onReset }) {
  if (!result) return null;

  const { blob, defaultFileName, extension = 'pdf', type, preview } = result;

  // Editable filename state
  const initialBaseName = defaultFileName
    ? defaultFileName.replace(new RegExp(`\\.${extension}$`, 'i'), '')
    : `converted_file`;

  const [fileName, setFileName] = useState(initialBaseName);
  const [isCopied, setIsCopied] = useState(false);
  const [hasDownloaded, setHasDownloaded] = useState(false);

  // Trigger celebratory confetti on mount
  useEffect(() => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch (e) {
      console.warn('Confetti error:', e);
    }
  }, []);

  const handleDownload = () => {
    const finalName = sanitizeFileName(fileName, extension);
    saveAs(blob, finalName);
    setHasDownloaded(true);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.5 },
      });
    } catch (e) {
      // ignore
    }
  };

  const fileSize = blob ? blob.size : 0;

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 backdrop-blur-xl animate-fade-in text-slate-100">
      
      {/* Top Banner Success Badge */}
      <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
            <span>Conversion Complete!</span>
            <Sparkles className="w-4 h-4 text-emerald-400 animate-bounce" />
          </h3>
          <p className="text-xs text-slate-300">
            Your file is ready. You can customize the file name below before downloading.
          </p>
        </div>
      </div>

      {/* File Details & Rename Input Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 mb-6 space-y-4">
        
        {/* Visual File Card */}
        <div className="flex items-center gap-4 pb-4 border-b border-slate-800">
          <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shrink-0 overflow-hidden relative">
            {preview ? (
              <img src={preview} alt="Result Preview" className="w-full h-full object-cover" />
            ) : extension === 'zip' ? (
              <FileArchive className="w-8 h-8 text-amber-400" />
            ) : extension === 'docx' ? (
              <FileText className="w-8 h-8 text-blue-400" />
            ) : (
              <FileText className="w-8 h-8 text-rose-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-mono font-bold uppercase">
                .{extension}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {formatBytes(fileSize)}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ready for immediate instant download.
            </p>
          </div>
        </div>

        {/* Rename File Input Section */}
        <div>
          <label className="block text-xs font-bold text-slate-200 mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-indigo-400" /> Output File Name:
            </span>
            <span className="text-[11px] text-indigo-400 font-normal">
              Edit before downloading
            </span>
          </label>

          <div className="relative flex items-center">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter custom file name..."
              className="w-full bg-slate-900 border-2 border-indigo-500/50 rounded-xl pl-3.5 pr-20 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
            <div className="absolute right-2 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-300 pointer-events-none">
              .{extension}
            </div>
          </div>

          {/* Quick preset name suggestions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] text-slate-400">Quick naming:</span>
            {['Document_Final', `Converted_${new Date().toISOString().slice(0, 10)}`, 'My_Converted_File'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFileName(preset)}
                className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Download Button & Reset Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={handleDownload}
          className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2.5 group transition-all duration-300 hover:scale-[1.01]"
        >
          <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
          <span>{hasDownloaded ? 'Download Again' : 'Download Converted File'}</span>
        </button>

        <button
          onClick={onReset}
          className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Convert Another</span>
        </button>
      </div>

    </div>
  );
}
