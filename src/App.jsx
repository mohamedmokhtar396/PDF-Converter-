import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ModeSelector, { CONVERSION_MODES } from './components/ModeSelector';
import DropZone from './components/DropZone';
import FileListPreview from './components/FileListPreview';
import ConversionOptions from './components/ConversionOptions';
import ProgressModal from './components/ProgressModal';
import DownloadResult from './components/DownloadResult';
import CameraScanner from './components/CameraScanner';
import PdfScannerCrop from './components/PdfScannerCrop';
import Toast from './components/Toast';
import Footer from './components/Footer';

import { convertImagesToPdf } from './utils/imageToPdf';
import { convertPdfToWord } from './utils/pdfToWord';
import { convertImagesToWord } from './utils/imageToWord';
import { convertPdfToImages } from './utils/pdfToImages';
import { createThumbnailUrl } from './utils/helpers';
import { translations } from './utils/translations';
import { Play, Sparkles, Shield, Zap, FileCheck2, Camera } from 'lucide-react';

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState('ar'); // Default to Arabic / English selectable
  const [activeMode, setActiveMode] = useState(CONVERSION_MODES[0]);
  const [files, setFiles] = useState([]);
  const [options, setOptions] = useState({});
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, stage: '' });
  const [conversionResult, setConversionResult] = useState(null);
  const [toast, setToast] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);

  const t = translations[lang] || translations.en;

  // Set initial document direction based on default language
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Handle Mode Change
  const handleSelectMode = (newMode) => {
    setActiveMode(newMode);
    setFiles([]);
    setConversionResult(null);
    setOptions({});

    if (newMode.id === 'camera-scanner') {
      setShowCameraModal(true);
    }
  };

  // Process Files Selected from DropZone or Input with Memory-Safe Thumbnail Creation
  const handleFilesSelected = async (newFiles) => {
    setConversionResult(null);

    const processed = [];
    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      let preview = null;

      if (file.type.startsWith('image/')) {
        try {
          preview = await createThumbnailUrl(file, 160);
        } catch (e) {
          console.warn('Thumbnail error:', e);
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

  // Add Photo Captured from Camera Scanner directly to file list
  const handleAddScannedPhotoFromCamera = (scannedItem) => {
    setFiles((prev) => [...prev, scannedItem]);
    showToast('success', lang === 'ar' ? 'تمت إضافة الصورة الممسوحة لقائمة التحويل!' : 'Scanned photo added to PDF queue!');
  };

  // File Removal & Reordering
  const handleRemoveFile = (index) => {
    setFiles((prev) => {
      const item = prev[index];
      if (item?.preview && item.preview.startsWith('blob:')) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleReorderFile = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= files.length) return;
    const copy = [...files];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setFiles(copy);
  };

  const handleClearAll = () => {
    files.forEach((f) => {
      if (f?.preview && f.preview.startsWith('blob:')) {
        URL.revokeObjectURL(f.preview);
      }
    });
    setFiles([]);
    setConversionResult(null);
  };

  // Main Conversion Dispatcher
  const handleStartConversion = async () => {
    if (!files || files.length === 0) {
      showToast('error', lang === 'ar' ? 'يرجى اختيار ملف واحد على الأقل للتحويل.' : 'Please select at least one file to convert.');
      return;
    }

    setIsConverting(true);
    setProgress({ percent: 0, stage: lang === 'ar' ? 'جاري بدء المحرك...' : 'Starting engine...' });
    setConversionResult(null);

    try {
      let resultBlob = null;
      let defaultFileName = 'converted_output';
      let extension = 'pdf';
      let resultObj = null;

      const firstFileName = files[0].file?.name || files[0].name || 'file';
      const baseName = firstFileName.replace(/\.[^/.]+$/, '');

      if (activeMode.id === 'image-to-pdf' || activeMode.id === 'camera-scanner') {
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
      showToast('success', lang === 'ar' ? 'تم اكتمال التحويل بنجاح!' : 'Conversion completed successfully!');
    } catch (error) {
      console.error('Conversion Error:', error);
      showToast('error', error.message || (lang === 'ar' ? 'حدث خطأ أثناء التحويل. يرجى المحاولة مرة أخرى.' : 'An error occurred during conversion. Please try again.'));
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
    <div className={`min-h-screen flex flex-col relative overflow-x-hidden transition-colors duration-500 ${
      isDarkMode
        ? 'bg-slate-950 text-slate-100'
        : 'bg-luxury-light text-slate-900'
    }`}>
      {/* Luxury Ambient Glow Elements for Light Mode */}
      {!isDarkMode && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 ltr:-left-40 rtl:-right-40 w-96 h-96 bg-indigo-300/20 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 ltr:-right-40 rtl:-left-40 w-96 h-96 bg-purple-300/20 rounded-full blur-[120px]" />
          <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-96 bg-amber-200/15 rounded-full blur-[140px]" />
        </div>
      )}

      {/* Top Header */}
      <Header
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        lang={lang}
        setLang={setLang}
        t={t}
      />

      {/* Main App Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col items-center justify-start">
        
        {/* Converter Category Selector */}
        <ModeSelector
          activeMode={activeMode}
          onSelectMode={handleSelectMode}
          isDarkMode={isDarkMode}
          t={t}
          lang={lang}
        />

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
              isDarkMode={isDarkMode}
              t={t}
            />
          ) : activeMode.id === 'pdf-scanner-crop' && files.length > 0 ? (
            /* Dedicated PDF Scanner & Crop View */
            <PdfScannerCrop
              pdfFile={files[0].file}
              onComplete={(resultObj) => {
                setConversionResult(resultObj);
                showToast('success', lang === 'ar' ? 'تمت معالجة ملف PDF وقصه بنجاح!' : 'PDF scanned and cropped successfully!');
              }}
              onCancel={() => {
                setFiles([]);
              }}
              isDarkMode={isDarkMode}
              t={t}
            />
          ) : (
            /* Upload, Preview & Convert View */
            <div>
              {/* DropZone Uploader */}
              {files.length === 0 ? (
                <DropZone activeMode={activeMode} onFilesSelected={handleFilesSelected} isDarkMode={isDarkMode} t={t} />
              ) : (
                /* Selected File List & Preview Grid */
                <FileListPreview
                  files={files}
                  onRemoveFile={handleRemoveFile}
                  onReorderFile={handleReorderFile}
                  onClearAll={handleClearAll}
                  onAddMore={() => {
                    if (activeMode.id === 'camera-scanner') {
                      setShowCameraModal(true);
                      return;
                    }
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
                  isDarkMode={isDarkMode}
                  t={t}
                />
              )}

              {/* Camera Scanner Trigger Button when in Camera Mode */}
              {activeMode.id === 'camera-scanner' && (
                <div className="mb-6 flex justify-center">
                  <button
                    onClick={() => setShowCameraModal(true)}
                    className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-rose-600/30 flex items-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    <span>{t.openCamera}</span>
                  </button>
                </div>
              )}

              {/* Conversion Options (visible when files selected) */}
              {files.length > 0 && activeMode.id !== 'pdf-scanner-crop' && (
                <>
                  <ConversionOptions
                    activeMode={activeMode}
                    options={options}
                    setOptions={setOptions}
                    isDarkMode={isDarkMode}
                    t={t}
                  />

                  {/* Big Convert Action Button */}
                  <div className="flex items-center justify-center pt-2">
                    <button
                      onClick={handleStartConversion}
                      className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-lg shadow-2xl shadow-indigo-500/30 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                    >
                      <Play className="w-5 h-5 fill-white" />
                      <span>{t.convertNow} ({files.length} {files.length === 1 ? 'file' : 'files'})</span>
                      <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Feature Highlights Footer Badges */}
        <div className={`mt-16 pt-8 border-t w-full max-w-4xl grid grid-cols-1 sm:grid-cols-3 gap-6 text-center ${
          isDarkMode ? 'border-slate-800/80' : 'border-slate-300/80'
        }`}>
          <div className={`flex flex-col items-center p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white/80 border-slate-200 shadow-sm'
          }`}>
            <Zap className="w-6 h-6 text-indigo-500 mb-2" />
            <h5 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{t.badge1Title}</h5>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.badge1Desc}</p>
          </div>
          <div className={`flex flex-col items-center p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white/80 border-slate-200 shadow-sm'
          }`}>
            <Shield className="w-6 h-6 text-emerald-500 mb-2" />
            <h5 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{t.badge2Title}</h5>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.badge2Desc}</p>
          </div>
          <div className={`flex flex-col items-center p-4 rounded-2xl border ${
            isDarkMode ? 'bg-slate-900/40 border-slate-800/50' : 'bg-white/80 border-slate-200 shadow-sm'
          }`}>
            <FileCheck2 className="w-6 h-6 text-purple-500 mb-2" />
            <h5 className={`font-bold text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>{t.badge3Title}</h5>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>{t.badge3Desc}</p>
          </div>
        </div>

      </main>

      {/* Camera Scanner Modal Overlay */}
      {showCameraModal && (
        <CameraScanner
          onAddPhoto={handleAddScannedPhotoFromCamera}
          onClose={() => setShowCameraModal(false)}
          isDarkMode={isDarkMode}
          t={t}
        />
      )}

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


