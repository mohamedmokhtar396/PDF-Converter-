import React from 'react';
import { Trash2, MoveUp, MoveDown, FileText, Image as ImageIcon, Plus, HardDrive } from 'lucide-react';
import { formatBytes } from '../utils/helpers';

export default function FileListPreview({ files, onRemoveFile, onReorderFile, onClearAll, onAddMore, activeMode, isDarkMode, t }) {
  if (!files || files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + (f.file?.size || f.size || 0), 0);

  return (
    <div className={`w-full border rounded-3xl p-6 mb-8 backdrop-blur-md transition-colors ${
      isDarkMode
        ? 'bg-slate-900/70 border-slate-800 text-white'
        : 'bg-white/90 border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50'
    }`}>
      {/* List Header */}
      <div className={`flex flex-wrap items-center justify-between gap-4 pb-4 border-b mb-6 ${
        isDarkMode ? 'border-slate-800/80' : 'border-slate-200'
      }`}>
        <div>
          <h4 className={`text-lg font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            <span>{t.selectedFiles || 'Selected Files'}</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </h4>
          <p className={`text-xs mt-0.5 flex items-center gap-1.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <HardDrive className="w-3.5 h-3.5 text-slate-400" />
            <span>{t.totalSize || 'Total size'}: {formatBytes(totalSize)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMode.multiple && (
            <button
              onClick={onAddMore}
              className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                isDarkMode
                  ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                  : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t.addMore || 'Add More'}</span>
            </button>
          )}

          <button
            onClick={onClearAll}
            className="px-3.5 py-2 rounded-xl bg-rose-950/20 border border-rose-500/30 hover:bg-rose-900/30 text-rose-500 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.clearAll || 'Clear All'}</span>
          </button>
        </div>
      </div>

      {/* File Items Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[380px] overflow-y-auto pr-1">
        {files.map((item, idx) => {
          const fileName = item.file?.name || item.name || `File ${idx + 1}`;
          const fileSize = item.file?.size || item.size || 0;
          const preview = item.preview;

          return (
            <div
              key={item.id || idx}
              className={`relative p-3.5 rounded-2xl border flex items-center gap-3.5 group transition-all ${
                isDarkMode
                  ? 'bg-slate-800/60 border-slate-700/60 hover:border-slate-600'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Index Badge */}
              <span className={`w-6 h-6 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-white border-slate-300 text-slate-700'
              }`}>
                {idx + 1}
              </span>

              {/* Thumbnail or File Icon */}
              <div className={`w-14 h-14 rounded-xl overflow-hidden shrink-0 border flex items-center justify-center relative ${
                isDarkMode ? 'bg-slate-900 border-slate-700/80' : 'bg-white border-slate-200'
              }`}>
                {preview ? (
                  <img src={preview} alt={fileName} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-6 h-6 text-indigo-500" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h5 className={`text-xs font-semibold truncate ${isDarkMode ? 'text-slate-200 group-hover:text-white' : 'text-slate-900 group-hover:text-indigo-600'}`} title={fileName}>
                  {fileName}
                </h5>
                <p className={`text-[11px] mt-0.5 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  {formatBytes(fileSize)}
                </p>
              </div>

              {/* Action Buttons: Move & Delete */}
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                {activeMode.multiple && files.length > 1 && (
                  <div className="flex flex-col gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => onReorderFile(idx, idx - 1)}
                      className={`p-1 rounded-md border text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                      title="Move up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={idx === files.length - 1}
                      onClick={() => onReorderFile(idx, idx + 1)}
                      className={`p-1 rounded-md border text-[10px] disabled:opacity-30 disabled:cursor-not-allowed ${
                        isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-slate-300 text-slate-700'
                      }`}
                      title="Move down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onRemoveFile(idx)}
                  className={`p-2 rounded-xl border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-900/80 border-slate-700 hover:bg-rose-950 hover:border-rose-800 text-slate-400 hover:text-rose-400'
                      : 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-slate-500 hover:text-rose-600'
                  }`}
                  title="Remove file"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

