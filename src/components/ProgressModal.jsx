import React from 'react';
import { Loader2, Sparkles, XCircle } from 'lucide-react';

export default function ProgressModal({ isConverting, progress, onCancel }) {
  if (!isConverting) return null;

  const { percent = 0, stage = 'Initializing conversion engine...' } = progress || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-indigo-500/20 text-center flex flex-col items-center overflow-hidden">
        {/* Top ambient glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Circular Progress Ring */}
        <div className="relative w-28 h-28 mb-6 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="56"
              cy="56"
              r="46"
              className="text-slate-800"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
            />
            <circle
              cx="56"
              cy="56"
              r="46"
              className="text-indigo-500 transition-all duration-300 ease-out"
              strokeWidth="8"
              strokeDasharray={289}
              strokeDashoffset={289 - (289 * percent) / 100}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white tracking-tight">{percent}%</span>
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin mt-0.5" />
          </div>
        </div>

        {/* Stage & Status message */}
        <div className="space-y-1 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
            <span>Converting Files</span>
            <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          </h3>
          <p className="text-xs text-slate-300 font-medium px-4 min-h-[36px] flex items-center justify-center text-center">
            {stage}
          </p>
        </div>

        {/* Linear Progress Bar */}
        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden mb-6 relative">
          <div
            className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 h-full rounded-full transition-all duration-300 relative"
            style={{ width: `${percent}%` }}
          >
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Cancel Operation</span>
          </button>
        )}
      </div>
    </div>
  );
}
