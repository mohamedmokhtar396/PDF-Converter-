import React from 'react';
import { AlertCircle, CheckCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type = 'info', message = '' } = toast;

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-400" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    info: <Info className="w-5 h-5 text-indigo-400" />,
  };

  const borders = {
    error: 'border-rose-500/40 bg-rose-950/90 text-rose-200',
    success: 'border-emerald-500/40 bg-emerald-950/90 text-emerald-200',
    info: 'border-indigo-500/40 bg-slate-900/90 text-slate-100',
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full px-4 animate-slide-up">
      <div className={`flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${borders[type] || borders.info}`}>
        <div className="shrink-0">{icons[type] || icons.info}</div>
        <p className="text-xs sm:text-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
