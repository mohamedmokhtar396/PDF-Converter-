import React, { useState, useRef } from 'react';
import { UploadCloud, FilePlus, Image as ImageIcon, FileText } from 'lucide-react';

export default function DropZone({ activeMode, onFilesSelected, isDarkMode, t }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  const processFiles = (files) => {
    if (!activeMode.multiple && files.length > 1) {
      onFilesSelected([files[0]]);
    } else {
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative w-full p-8 sm:p-12 rounded-3xl cursor-pointer transition-all duration-300 text-center border-2 border-dashed flex flex-col items-center justify-center group overflow-hidden ${
        isDragOver
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01] shadow-2xl'
          : isDarkMode
            ? 'border-slate-800 bg-slate-900/50 hover:bg-slate-850 hover:border-slate-700'
            : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 shadow-xl shadow-slate-200/60'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={activeMode.accept}
        multiple={activeMode.multiple}
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-5 group-hover:scale-110 border transition-all duration-300 shadow-xl ${
          isDragOver
            ? 'scale-110 border-indigo-400 bg-indigo-100'
            : isDarkMode
              ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 group-hover:border-indigo-500'
              : 'bg-indigo-50 border-indigo-100 text-indigo-600 group-hover:border-indigo-400'
        }`}>
          {activeMode.id.includes('pdf') ? (
            <FileText className={`w-10 h-10 ${isDragOver ? 'text-indigo-600 animate-bounce' : isDarkMode ? 'text-slate-300 group-hover:text-indigo-400' : 'text-indigo-600'}`} />
          ) : (
            <ImageIcon className={`w-10 h-10 ${isDragOver ? 'text-indigo-600 animate-bounce' : isDarkMode ? 'text-slate-300 group-hover:text-indigo-400' : 'text-indigo-600'}`} />
          )}
        </div>

        <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {t.dropTitle || 'Drop your files here to convert'}
        </h3>
        <p className={`text-sm max-w-md mb-6 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {t.dropSubtitle || 'or click to browse from device'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 group-hover:shadow-indigo-500/40 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>{t.dropSubtitle ? t.dropSubtitle.split(' ')[0] : 'Browse Files'}</span>
          </button>
          
          <span className={`text-xs font-mono ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
            Accepted: {activeMode.accept.replace(/application\/|image\//g, '').toUpperCase().replace(/,/g, ', ')}
          </span>
        </div>
      </div>
    </div>
  );
}

