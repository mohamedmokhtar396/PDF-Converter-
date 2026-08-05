import React, { useState } from 'react';
import { FileImage, FileText, Images, ArrowRight, Layers, Camera, Wand2, ArrowLeft, Sparkles, Scan, RefreshCw } from 'lucide-react';

export const CONVERSION_MODES = [
  {
    id: 'camera-scanner',
    key: 'cameraScanner',
    category: 'scanner',
    icon: Camera,
    color: 'from-rose-500 via-pink-500 to-amber-500',
    hoverBorder: 'hover:border-rose-500/50',
    accept: 'image/*',
    multiple: true,
  },
  {
    id: 'pdf-scanner-crop',
    key: 'pdfScannerCrop',
    category: 'scanner',
    icon: Wand2,
    color: 'from-amber-500 via-orange-500 to-rose-500',
    hoverBorder: 'hover:border-amber-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'image-to-pdf',
    key: 'imageToPdf',
    category: 'converter',
    icon: FileImage,
    color: 'from-indigo-500 to-purple-600',
    hoverBorder: 'hover:border-indigo-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif',
    multiple: true,
  },
  {
    id: 'pdf-to-word',
    key: 'pdfToWord',
    category: 'converter',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    hoverBorder: 'hover:border-blue-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'image-to-word',
    key: 'imageToWord',
    category: 'converter',
    icon: Layers,
    color: 'from-purple-500 to-pink-600',
    hoverBorder: 'hover:border-purple-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/bmp',
    multiple: true,
  },
  {
    id: 'pdf-to-images',
    key: 'pdfToImages',
    category: 'converter',
    icon: Images,
    color: 'from-emerald-500 to-teal-600',
    hoverBorder: 'hover:border-emerald-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
];

export default function ModeSelector({ activeMode, onSelectMode, isDarkMode, t, lang }) {
  const isRtl = lang === 'ar';
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'scanner', 'converter'

  const scannerModes = CONVERSION_MODES.filter((m) => m.category === 'scanner');
  const converterModes = CONVERSION_MODES.filter((m) => m.category === 'converter');

  const renderModeCard = (mode) => {
    const Icon = mode.icon;
    const isActive = activeMode.id === mode.id;
    const modeTrans = t.modes[mode.key] || {};

    return (
      <button
        key={mode.id}
        onClick={() => onSelectMode(mode)}
        className={`relative p-5 rounded-3xl transition-all duration-300 flex flex-col justify-between group ${
          isRtl ? 'text-right' : 'text-left'
        } ${
          isActive
            ? isDarkMode
              ? 'bg-slate-800/90 border-2 border-indigo-500 shadow-2xl shadow-indigo-500/25 scale-[1.02]'
              : 'bg-white border-2 border-indigo-600 shadow-2xl shadow-indigo-500/20 scale-[1.02]'
            : isDarkMode
              ? 'bg-slate-900/70 border border-slate-800/90 hover:bg-slate-800/60 ' + mode.hoverBorder
              : 'bg-white/90 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-md'
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-3.5">
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-full border ${
              isActive
                ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40'
                : isDarkMode
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {modeTrans.badge || 'Tool'}
            </span>
          </div>

          <h3 className={`font-extrabold text-base sm:text-lg transition-colors ${
            isDarkMode ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'
          }`}>
            {modeTrans.title || mode.id}
          </h3>
          <p className={`text-xs mt-1 leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {modeTrans.subtitle || ''}
          </p>
        </div>

        <div className={`mt-5 pt-3.5 flex items-center justify-between text-xs font-bold ${
          isDarkMode ? 'border-t border-slate-800/80' : 'border-t border-slate-200/80'
        }`}>
          <span className={isActive ? 'text-indigo-500' : isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-800'}>
            {isActive ? t.activeMode : t.selectMode}
          </span>
          {isRtl ? (
            <ArrowLeft className={`w-4 h-4 transition-transform group-hover:-translate-x-1 ${
              isActive ? 'text-indigo-500' : 'text-slate-400'
            }`} />
          ) : (
            <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${
              isActive ? 'text-indigo-500' : 'text-slate-400'
            }`} />
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="w-full mb-10">
      {/* Hero Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <h1 className={`text-3xl sm:text-4xl font-black tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {t.heroTitle}
        </h1>
        <p className={`mt-2 text-sm sm:text-base font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {t.heroSubtitle}
        </p>

        {/* Category Navigation Tabs */}
        <div className="flex items-center justify-center gap-2 mt-6 p-1.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 max-w-fit mx-auto backdrop-blur-md">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRtl ? 'جميع الأدوات' : 'All Tools'}</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scan className="w-3.5 h-3.5" />
            <span>{isRtl ? 'قسم الماسح الضوئي (Scanner)' : 'Scanner & AI Crop'}</span>
          </button>

          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'converter'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{isRtl ? 'قسم التحويلات (Converters)' : 'Format Converters'}</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: DEDICATED SCANNER & AI CROP SUITE */}
      {(activeTab === 'all' || activeTab === 'scanner') && (
        <div className="mb-10 p-6 sm:p-8 rounded-3xl border bg-gradient-to-br from-amber-500/5 via-rose-500/5 to-purple-500/5 backdrop-blur-xl shadow-2xl relative overflow-hidden transition-all duration-300 border-amber-500/30">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-lg">
              <Scan className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-xl font-black flex items-center gap-2 ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
                <span>{t.scannerSectionTitle}</span>
                <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t.scannerSectionDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {scannerModes.map((mode) => renderModeCard(mode))}
          </div>
        </div>
      )}

      {/* SECTION 2: FILE FORMAT CONVERTERS */}
      {(activeTab === 'all' || activeTab === 'converter') && (
        <div className="p-6 sm:p-8 rounded-3xl border bg-slate-900/40 backdrop-blur-xl shadow-xl transition-all duration-300 border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className={`text-xl font-black ${isDarkMode ? 'text-indigo-400' : 'text-indigo-800'}`}>
                {t.converterSectionTitle}
              </h2>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {t.converterSectionDesc}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {converterModes.map((mode) => renderModeCard(mode))}
          </div>
        </div>
      )}
    </div>
  );
}
