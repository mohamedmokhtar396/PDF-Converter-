import React from 'react';
import { FileImage, FileText, Images, ArrowRight, Layers } from 'lucide-react';

export const CONVERSION_MODES = [
  {
    id: 'image-to-pdf',
    title: 'Images to PDF',
    subtitle: 'JPG, PNG, WEBP → PDF',
    icon: FileImage,
    badge: 'Popular',
    color: 'from-indigo-500 to-purple-600',
    hoverBorder: 'hover:border-indigo-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/svg+xml,image/gif',
    multiple: true,
  },
  {
    id: 'pdf-to-word',
    title: 'PDF to Word',
    subtitle: 'PDF → Editable .DOCX',
    icon: FileText,
    badge: 'Layout Preserved',
    color: 'from-blue-500 to-cyan-500',
    hoverBorder: 'hover:border-blue-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
  {
    id: 'image-to-word',
    title: 'Images to Word',
    subtitle: 'Pictures → Word + OCR',
    icon: Layers,
    badge: 'AI OCR Text',
    color: 'from-purple-500 to-pink-600',
    hoverBorder: 'hover:border-purple-500/50',
    accept: 'image/jpeg,image/png,image/webp,image/bmp',
    multiple: true,
  },
  {
    id: 'pdf-to-images',
    title: 'PDF to Images',
    subtitle: 'PDF → PNG / JPG',
    icon: Images,
    badge: 'HD Resolution',
    color: 'from-emerald-500 to-teal-600',
    hoverBorder: 'hover:border-emerald-500/50',
    accept: 'application/pdf',
    multiple: false,
  },
];

export default function ModeSelector({ activeMode, onSelectMode }) {
  return (
    <div className="w-full mb-8">
      <div className="text-center max-w-2xl mx-auto mb-6">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          All-in-One <span className="gradient-text">Document & Image</span> Converter
        </h1>
        <p className="mt-2 text-slate-400 text-sm sm:text-base">
          Transform your files seamlessly in seconds. Drag and drop, preview, customize options, rename & download.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {CONVERSION_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode.id === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onSelectMode(mode)}
              className={`relative p-4 rounded-2xl text-left transition-all duration-300 flex flex-col justify-between group ${
                isActive
                  ? 'bg-slate-800/90 border-2 border-indigo-500 shadow-xl shadow-indigo-500/20 scale-[1.02]'
                  : 'bg-slate-900/60 border border-slate-800/80 hover:bg-slate-800/50 ' + mode.hoverBorder
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-md`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {mode.badge}
                  </span>
                </div>

                <h3 className="font-bold text-slate-100 text-base group-hover:text-white transition-colors">
                  {mode.title}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {mode.subtitle}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs font-medium">
                <span className={isActive ? 'text-indigo-400 font-semibold' : 'text-slate-500 group-hover:text-slate-300'}>
                  {isActive ? 'Active Mode' : 'Select Mode'}
                </span>
                <ArrowRight className={`w-3.5 h-3.5 transition-transform group-hover:translate-x-1 ${
                  isActive ? 'text-indigo-400' : 'text-slate-600'
                }`} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
