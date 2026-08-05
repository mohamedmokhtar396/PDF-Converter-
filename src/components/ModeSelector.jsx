import React from 'react';
import { FileImage, FileText, Images, ArrowRight, Layers, Camera, Wand2, ArrowLeft } from 'lucide-react';

export const CONVERSION_MODES = [
  {
    id: 'image-to-pdf',
    key: 'imageToPdf',
    icon: FileImage,
    color: 'from-indigo-500 to-purple-600',
    hoverBorder: 'hover:border-indigo-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif',
    multiple: true,
  },
  {
    id: 'pdf-scanner-crop',
    key: 'pdfScannerCrop',
    icon: Wand2,
    color: 'from-amber-500 to-orange-600',
    hoverBorder: 'hover:border-amber-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'camera-scanner',
    key: 'cameraScanner',
    icon: Camera,
    color: 'from-rose-500 to-pink-600',
    hoverBorder: 'hover:border-rose-500/50',
    accept: 'image/*',
    multiple: true,
  },
  {
    id: 'pdf-to-word',
    key: 'pdfToWord',
    icon: FileText,
    color: 'from-blue-500 to-cyan-500',
    hoverBorder: 'hover:border-blue-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'image-to-word',
    key: 'imageToWord',
    icon: Layers,
    color: 'from-purple-500 to-pink-600',
    hoverBorder: 'hover:border-purple-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/bmp',
    multiple: true,
  },
  {
    id: 'pdf-to-images',
    key: 'pdfToImages',
    icon: Images,
    color: 'from-emerald-500 to-teal-600',
    hoverBorder: 'hover:border-emerald-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
];

export default function ModeSelector({ activeMode, onSelectMode, isDarkMode, t, lang }) {
  const isRtl = lang === 'ar';

  return (
    <div className="w-full mb-8">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          {t.heroTitle}
        </h1>
        <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          {t.heroSubtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {CONVERSION_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode.id === mode.id;
          const modeTrans = t.modes[mode.key] || {};

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode)}
              className={`relative p-4 rounded-2xl transition-all duration-300 flex flex-col justify-between group ${
                isRtl ? 'text-right' : 'text-left'
              } ${
                isActive
                  ? isDarkMode
                    ? 'bg-slate-800/90 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                    : 'bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-500/15 scale-[1.02]'
                  : isDarkMode
                    ? 'bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/50 ' + mode.hoverBorder
                    : 'bg-white/80 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/40'
                      : isDarkMode
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {modeTrans.badge || 'Tool'}
                  </span>
                </div>

                <h3 className={`font-bold text-base transition-colors ${
                  isDarkMode ? 'text-slate-100 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'
                }`}>
                  {modeTrans.title || mode.id}
                </h3>
                <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {modeTrans.subtitle || ''}
                </p>
              </div>

              <div className={`mt-4 pt-3 flex items-center justify-between text-xs font-medium ${
                isDarkMode ? 'border-t border-slate-800/60' : 'border-t border-slate-200/80'
              }`}>
                <span className={isActive ? 'text-indigo-500 font-semibold' : isDarkMode ? 'text-slate-500 group-hover:text-slate-300' : 'text-slate-500 group-hover:text-slate-800'}>
                  {isActive ? t.activeMode : t.selectMode}
                </span>
                {isRtl ? (
                  <ArrowLeft className={`w-3.5 h-3.5 transition-transform group-hover:-translate-x-1 ${
                    isActive ? 'text-indigo-500' : 'text-slate-400'
                  }`} />
                ) : (
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${
                    isActive ? 'text-indigo-500' : 'text-slate-400'
                  }`} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


