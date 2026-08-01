import React, { useState, useRef } from 'react';
import { UploadCloud, FilePlus, Image as ImageIcon, FileText } from 'lucide-react';

export default function DropZone({ activeMode, onFilesSelected }) {
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
          ? 'border-indigo-400 bg-indigo-950/40 scale-[1.01] shadow-2xl shadow-indigo-500/20'
          : 'border-slate-800 bg-slate-900/50 hover:bg-slate-850/60 hover:border-slate-700'
      }`}
    >
      {/* Background glow animation on drag */}
      <div className={`absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none ${isDragOver ? 'opacity-100' : ''}`} />

      <input
        ref={fileInputRef}
        type="file"
        accept={activeMode.accept}
        multiple={activeMode.multiple}
        onChange={handleFileInput}
        className="hidden"
      />

      <div className="relative z-10 flex flex-col items-center">
        <div className={`w-20 h-20 rounded-3xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-indigo-500/50 transition-all duration-300 shadow-xl ${
          isDragOver ? 'scale-110 border-indigo-400 bg-indigo-900/40' : ''
        }`}>
          {activeMode.id.includes('pdf') ? (
            <FileText className={`w-10 h-10 ${isDragOver ? 'text-indigo-400 animate-bounce' : 'text-slate-300 group-hover:text-indigo-400'}`} />
          ) : (
            <ImageIcon className={`w-10 h-10 ${isDragOver ? 'text-indigo-400 animate-bounce' : 'text-slate-300 group-hover:text-indigo-400'}`} />
          )}
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Drop your {activeMode.id.includes('pdf-to') ? 'PDF document' : 'images'} here
        </h3>
        <p className="text-slate-400 text-sm max-w-md mb-6">
          {activeMode.multiple
            ? 'Drag & drop single or multiple files, or click anywhere to browse from your computer'
            : 'Select a PDF document to convert to editable format'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 flex items-center gap-2 group-hover:shadow-indigo-500/40 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Browse Files</span>
          </button>
          
          <span className="text-xs text-slate-500 font-mono">
            Accepted: {activeMode.accept.replace(/application\/|image\//g, '').toUpperCase().replace(/,/g, ', ')}
          </span>
        </div>
      </div>
    </div>
  );
}
