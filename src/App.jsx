import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ModeSelector, { CONVERSION_MODES } from './components/ModeSelector';
import DropZone from './components/DropZone';
import FileListPreview from './components/FileListPreview';
import ConversionOptions from './components/ConversionOptions';
import ProgressModal from './components/ProgressModal';
import DownloadResult from './components/DownloadResult';
import Toast from './components/Toast';
import Footer from './components/Footer';

import { convertImagesToPdf } from './utils/imageToPdf';
import { convertPdfToWord } from './utils/pdfToWord';
import { convertImagesToWord } from './utils/imageToWord';
import { convertPdfToImages } from './utils/pdfToImages';
import { readAsDataURL } from './utils/helpers';
import { Play, Sparkles, Shield, Zap, FileCheck2 } from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeMode, setActiveMode] = useState(CONVERSION_MODES[0]);
  const [files, setFiles] = useState([]);
  const [options, setOptions] = useState({});
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [conversionResult, setConversionResult] = useState(null);
  const [toast, setToast] = useState(null);

  // Handle Mode Change
  const handleSelectMode = (newMode) => {
    setActiveMode(newMode);
    setFiles([]);
    setConversionResult(null);
    setOptions({});
  };

  // Process Files Selected from DropZone or Input
  const handleFilesSelected = async (newFiles) => {
    setConversionResult(null);

    const processed = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      let preview = null;

      if (file.type.startsWith('image/')) {
        try {
          preview = await readAsDataURL(file);
        } catch (e) {
          console.warn('Preview error:', e);
        }
      }

      processed.push({
        id: `${file.name}-${Date.now()}-${i}`,
        file,
        name: file.name,
        size: file.size,
        preview,
      });
    }

    if (activeMode.multiple) {
      setFiles((prev) => [...prev, ...processed]);
    } else {
      setFiles(processed.slice(0, 1));
    }
  };

  // File Removal & Reordering
  const handleRemoveFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReorderFile = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= files.length) return;
    const copy = [...files];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setFiles(copy);
  };

  const handleClearAll = () => {
    setFiles([]);
    setConversionResult(null);
  };

  // Main Conversion Dispatcher
  const handleStartConversion = async () => {
    if (!files || files.length === 0) {
      showToast('error', 'Please select at least one file to convert.');
      return;
    }

    setIsConverting(true);
    setProgress({ percent: 0, stage: 'Starting engine...' });
    setConversionResult(null);

    try {
      let resultBlob = null;
      let defaultFileName = 'converted_output';
      let extension = 'pdf';
      let resultObj = null;

      const firstFileName = files[0].file?.name || files[0].name || 'file';
      const baseName = firstFileName.replace(/\.[^/.]+$/, '');

      if (activeMode.id === 'image-to-pdf') {
        extension = 'pdf';
        defaultFileName = `${baseName}_converted.pdf`;
        resultBlob = await convertImagesToPdf(files, options, setProgress);
        resultObj = {
          blob: resultBlob,
          defaultFileName,
          extension,
          preview: files[0]?.preview,
        };
      } else if (activeMode.id === 'pdf-to-word') {
        extension = 'docx';
        defaultFileName = `${baseName}_converted.docx`;
        resultBlob = await convertPdfToWord(files[0].file, options, setProgress);
        resultObj = {
          blob: resultBlob,
          defaultFileName,
          extension,
        };
      } else if (activeMode.id === 'image-to-word') {
        extension = 'docx';
        defaultFileName = `${baseName}_converted.docx`;
        resultBlob = await convertImagesToWord(files, options, setProgress);
        resultObj = {
          blob: resultBlob,
          defaultFileName,
          extension,
          preview: files[0]?.preview,
        };
      } else if (activeMode.id === 'pdf-to-images') {
        const imgResult = await convertPdfToImages(files[0].file, options, setProgress);
        if (imgResult.type === 'single') {
          extension = options.format || 'png';
          defaultFileName = imgResult.fileName;
          resultObj = {
            blob: imgResult.blob,
            defaultFileName,
            extension,
            preview: imgResult.preview,
          };
        } else {
          extension = 'zip';
          defaultFileName = imgResult.fileName;
          resultObj = {
            blob: imgResult.blob,
            defaultFileName,
            extension,
          };
        }
      }

      setConversionResult(resultObj);
      showToast('success', 'Conversion completed successfully!');
    } catch (error) {
      console.error('Conversion Error:', error);
      showToast('error', error.message || 'An error occurred during conversion. Please try again.');
    } finally {
      setIsConverting(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-900 text-slate-100'
    }`}>
      {/* Top Header */}
      <Header isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {/* Main App Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center justify-start">
        
        {/* Converter Category Selector */}
        <ModeSelector activeMode={activeMode} onSelectMode={handleSelectMode} />

        {/* Workspace Card Container */}
        <div className="w-full max-w-4xl mx-auto">
          {conversionResult ? (
            /* Download & Rename Result View */
            <DownloadResult
              result={conversionResult}
              activeMode={activeMode}
              onReset={() => {
                setConversionResult(null);
                setFiles([]);
              }}
            />
          ) : (
            /* Upload, Preview & Convert View */
            <div>
              {/* DropZone Uploader */}
              {files.length === 0 ? (
                <DropZone activeMode={activeMode} onFilesSelected={handleFilesSelected} />
              ) : (
                /* Selected File List & Preview Grid */
                <FileListPreview
                  files={files}
                  onRemoveFile={handleRemoveFile}
                  onReorderFile={handleReorderFile}
                  onClearAll={handleClearAll}
                  onAddMore={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = activeMode.accept;
                    input.multiple = activeMode.multiple;
                    input.onchange = (e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesSelected(Array.from(e.target.files));
                      }
                    };
                    input.click();
                  }}
                  activeMode={activeMode}
                />
              )}

              {/* Conversion Options (visible when files selected or active) */}
              {files.length > 0 && (
                <>
                  <ConversionOptions
                    activeMode={activeMode}
                    options={options}
                    setOptions={setOptions}
                  />

                  {/* Big Convert Action Button */}
                  <div className="flex items-center justify-center pt-2">
                    <button
                      onClick={handleStartConversion}
                      className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-lg shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>Convert Now ({files.length} {files.length === 1 ? 'file' : 'files'})</span>
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights Footer Badges */}
        <div className="mt-16 pt-8 border-t border-slate-800/80 w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
            <Zap className="w-6 h-6 text-indigo-400 mb-2" />
            <h5 className="font-bold text-sm text-slate-200">Lightning Fast</h5>
            <p className="text-xs text-slate-400 mt-1">Direct client-side processing with instant output</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
            <Shield className="w-6 h-6 text-emerald-400 mb-2" />
            <h5 className="font-bold text-sm text-slate-200">100% Private</h5>
            <p className="text-xs text-slate-400 mt-1">Your documents never leave your browser</p>
          </div>
          <div className="flex flex-col items-center p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50">
            <FileCheck2 className="w-6 h-6 text-purple-400 mb-2" />
            <h5 className="font-bold text-sm text-slate-200">Custom Rename & Download</h5>
            <p className="text-xs text-slate-400 mt-1">Full control over filenames before downloading</p>
          </div>
        </div>

      </main>

      {/* Progress Modal Overlay */}
      <ProgressModal
        isConverting={isConverting}
        progress={progress}
        onCancel={() => {
          setIsConverting(false);
          showToast('info', 'Conversion cancelled.');
        }}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Footer */}
      <Footer />
    </div>
  );
}
