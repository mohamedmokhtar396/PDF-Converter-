import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Edit3, FileText, ArrowLeft, Sparkles, RefreshCw, FileArchive, Check, Share2, Smartphone } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatBytes, sanitizeFileName } from '../utils/helpers';
import { saveAs } from 'file-saver';

export default function DownloadResult({ result, activeMode, onReset, isDarkMode, t }) {
  if (!result) return null;

  const { blob, defaultFileName, extension = 'pdf', type, preview } = result;

  // Editable filename state
  const initialBaseName = defaultFileName
    ? defaultFileName.replace(new RegExp(`\\.${extension}$`, 'i'), '')
    : `converted_file`;

  const [fileName, setFileName] = useState(initialBaseName);
  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [canMobileShare, setCanMobileShare] = useState(false);

  // Check if Web Share API is available on phone/mobile browser
  useEffect(() => {
    if (navigator.canShare && blob) {
      try {
        const testFile = new File([blob], 'test.' + extension, { type: blob.type || 'application/pdf' });
        if (navigator.canShare({ files: [testFile] })) {
          setCanMobileShare(true);
        }
      } catch (e) {
        setCanMobileShare(false);
      }
    }
  }, [blob, extension]);

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

  // Standard File Saver Download
  const handleDownload = () => {
    const finalName = sanitizeFileName(fileName, extension);
    
    // Create forced download blob with octet-stream to prevent mobile browser inline opening
    const forcedBlob = new Blob([blob], { type: 'application/octet-stream' });
    saveAs(forcedBlob, finalName);
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

  // Mobile Web Share (Native Save to Downloads / Save to Files on Phones)
  const handleMobileSave = async () => {
    const finalName = sanitizeFileName(fileName, extension);
    const mimeType = extension === 'pdf' ? 'application/pdf' : blob.type || 'application/octet-stream';
    const file = new File([blob], finalName, { type: mimeType });

    if (navigator.share && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: finalName,
          text: 'Saved from PDF Converter',
        });
        setHasDownloaded(true);
      } catch (err) {
        if (err.name !== 'AbortError') {
          handleDownload();
        }
      }
    } else {
      handleDownload();
    }
  };

  const fileSize = blob ? blob.size : 0;

  const cardStyle = isDarkMode
    ? 'bg-slate-900/90 border-indigo-500/40 text-slate-100 shadow-2xl shadow-indigo-500/20'
    : 'bg-white border-indigo-200 text-slate-900 shadow-2xl shadow-slate-200/80';

  const innerCardStyle = isDarkMode
    ? 'bg-slate-950/70 border-slate-800'
    : 'bg-slate-50 border-slate-200';

  const inputStyle = isDarkMode
    ? 'bg-slate-900 border-indigo-500/50 text-white'
    : 'bg-white border-indigo-300 text-slate-900 shadow-sm';

  return (
    <div className={`w-full max-w-2xl mx-auto border rounded-3xl p-6 sm:p-8 backdrop-blur-xl animate-fade-in transition-colors ${cardStyle}`}>
      
      {/* Top Banner Success Badge */}
      <div className={`flex items-center gap-3 mb-6 p-4 rounded-2xl border ${
        isDarkMode
          ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border-emerald-500/30'
          : 'bg-gradient-to-r from-emerald-50 via-slate-50 to-indigo-50 border-emerald-300'
      }`}>
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-7 h-7 text-emerald-500" />
        </div>
        <div>
          <h3 className={`text-lg font-extrabold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <span>{t.conversionComplete || 'Conversion Complete!'}</span>
            <Sparkles className="w-4 h-4 text-emerald-500 animate-bounce" />
          </h3>
          <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            {t.conversionCompleteDesc || 'Your file is ready. You can customize the file name below before downloading.'}
          </p>
        </div>
      </div>

      {/* File Details & Rename Input Card */}
      <div className={`border rounded-2xl p-5 mb-6 space-y-4 ${innerCardStyle}`}>
        
        {/* Visual File Card */}
        <div className={`flex items-center gap-4 pb-4 border-b ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className={`w-16 h-16 rounded-xl border flex items-center justify-center shrink-0 overflow-hidden relative ${
            isDarkMode ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
          }`}>
            {preview ? (
              <img src={preview} alt="Result Preview" className="w-full h-full object-cover" />
            ) : extension === 'zip' ? (
              <FileArchive className="w-8 h-8 text-amber-500" />
            ) : extension === 'docx' ? (
              <FileText className="w-8 h-8 text-blue-500" />
            ) : (
              <FileText className="w-8 h-8 text-rose-500" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 text-[11px] font-mono font-bold uppercase">
                .{extension}
              </span>
              <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {formatBytes(fileSize)}
              </span>
            </div>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Ready for direct download with custom filename.
            </p>
          </div>
        </div>

        {/* Rename File Input Section */}
        <div>
          <label className={`block text-xs font-bold mb-2 flex items-center justify-between ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
            <span className="flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-indigo-500" /> {t.outputFileName || 'Output File Name:'}
            </span>
            <span className="text-[11px] text-indigo-500 font-normal">
              {t.editBeforeDownload || 'Edit before downloading'}
            </span>
          </label>

          <div className="relative flex items-center">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              placeholder="Enter custom file name..."
              className={`w-full border-2 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:outline-none focus:border-indigo-500 transition-all ${inputStyle}`}
            />
            <div className={`absolute ltr:right-2 rtl:left-2 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold pointer-events-none ${
              isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              .{extension}
            </div>
          </div>

          {/* Quick preset name suggestions */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{t.quickNaming || 'Quick naming:'}</span>
            {['My_Document', `Converted_${new Date().toISOString().slice(0, 10)}`, 'Official_Doc'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setFileName(preset)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${
                  isDarkMode
                    ? 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-700 hover:text-slate-900'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Download Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={handleDownload}
            className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2.5 group transition-all duration-300 hover:scale-[1.01]"
          >
            <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
            <span>{hasDownloaded ? (t.downloadAgain || 'Download Again') : (t.saveToDownloads || 'Save to Downloads')}</span>
          </button>

          {canMobileShare && (
            <button
              onClick={handleMobileSave}
              className="w-full sm:w-auto py-4 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>{t.saveOnMobile || 'Save on Mobile Phone'}</span>
            </button>
          )}

          <button
            onClick={onReset}
            className={`w-full sm:w-auto py-4 px-5 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${
              isDarkMode
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>{t.convertAnother || 'Convert Another'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}


