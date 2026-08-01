import React from 'react';
import { Trash2, MoveUp, MoveDown, FileText, Image as ImageIcon, Plus, HardDrive } from 'lucide-react';
import { formatBytes } from '../utils/helpers';

export default function FileListPreview({ files, onRemoveFile, onReorderFile, onClearAll, onAddMore, activeMode }) {
  if (!files || files.length === 0) return null;

  const totalSize = files.reduce((acc, f) => acc + (f.file?.size || f.size || 0), 0);

  return (
    <div className="w-full bg-slate-900/70 border border-slate-800 rounded-3xl p-6 mb-8 backdrop-blur-md">
      {/* List Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80 mb-6">
        <div>
          <h4 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Selected Files</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Total size: {formatBytes(totalSize)}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeMode.multiple && (
            <button
              onClick={onAddMore}
              className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Add More</span>
            </button>
          )}

          <button
            onClick={onClearAll}
            className="px-3.5 py-2 rounded-xl bg-rose-950/40 border border-rose-800/50 hover:bg-rose-900/40 text-rose-300 hover:text-rose-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
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
              className="relative p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-3.5 group hover:border-slate-600 transition-all"
            >
              {/* Index Badge for Reordering */}
              <span className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-400 text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>

              {/* Thumbnail or File Icon */}
              <div className="w-14 h-14 rounded-xl bg-slate-900 overflow-hidden shrink-0 border border-slate-700/80 flex items-center justify-center relative">
                {preview ? (
                  <img src={preview} alt={fileName} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-6 h-6 text-indigo-400" />
                )}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white" title={fileName}>
                  {fileName}
                </h5>
                <p className="text-[11px] text-slate-400 mt-0.5">
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
                      className="p-1 rounded-md bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                      title="Move up"
                    >
                      <MoveUp className="w-3 h-3" />
                    </button>
                    <button
                      disabled={idx === files.length - 1}
                      onClick={() => onReorderFile(idx, idx + 1)}
                      className="p-1 rounded-md bg-slate-900 border border-slate-700 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-[10px]"
                      title="Move down"
                    >
                      <MoveDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => onRemoveFile(idx)}
                  className="p-2 rounded-xl bg-slate-900/80 border border-slate-700 hover:bg-rose-950 hover:border-rose-800 text-slate-400 hover:text-rose-400 transition-colors"
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
