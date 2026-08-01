import React from 'react';
import { Settings, Layout, Maximize2, Cpu, FileCheck } from 'lucide-react';

export default function ConversionOptions({ activeMode, options, setOptions }) {
  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mb-8 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-5 pb-3 border-b border-slate-800/80">
        <Settings className="w-5 h-5 text-indigo-400" />
        <h4 className="text-base font-bold text-white">Conversion Settings</h4>
      </div>

      {/* Mode 1: Image to PDF Settings */}
      {activeMode.id === 'image-to-pdf' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-indigo-400" /> Page Orientation
            </label>
            <select
              value={options.orientation || 'auto'}
              onChange={(e) => updateOption('orientation', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="auto">Auto (Match Image)</option>
              <option value="portrait">Portrait (Vertical)</option>
              <option value="landscape">Landscape (Horizontal)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" /> Page Size
            </label>
            <select
              value={options.pageSize || 'a4'}
              onChange={(e) => updateOption('pageSize', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="a4">A4 Standard (210 × 297 mm)</option>
              <option value="letter">US Letter (8.5 × 11 in)</option>
              <option value="fit">Fit Exact Image Size</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Page Margins</label>
            <select
              value={options.margin ?? 10}
              onChange={(e) => updateOption('margin', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={0}>No Margin (Full Bleed)</option>
              <option value={10}>Small Margin (10 mm)</option>
              <option value={20}>Big Margin (20 mm)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Image Alignment / Scaling</label>
            <select
              value={options.fit || 'contain'}
              onChange={(e) => updateOption('fit', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="contain">Maintain Aspect Ratio (Contain)</option>
              <option value="stretch">Fill Entire Page (Stretch)</option>
            </select>
          </div>
        </div>
      )}

      {/* Mode 2: PDF to Word Settings */}
      {activeMode.id === 'pdf-to-word' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <span className="text-xs font-semibold text-white block">Extract Formatted Text</span>
              <span className="text-[11px] text-slate-400">Extract readable text into Word paragraphs</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeText ?? true}
              onChange={(e) => updateOption('includeText', e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <span className="text-xs font-semibold text-white block">Include Layout Snapshot</span>
              <span className="text-[11px] text-slate-400">Embed page layout images for high visual fidelity</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeImages ?? true}
              onChange={(e) => updateOption('includeImages', e.target.checked)}
              className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Mode 3: Image to Word Settings */}
      {activeMode.id === 'image-to-word' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            <div>
              <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-purple-400" /> Enable AI OCR Text Extraction
              </span>
              <span className="text-[11px] text-slate-400">Recognize text inside images into Word</span>
            </div>
            <input
              type="checkbox"
              checked={options.enableOcr ?? false}
              onChange={(e) => updateOption('enableOcr', e.target.checked)}
              className="w-4 h-4 accent-purple-500 rounded cursor-pointer"
            />
          </div>

          {options.enableOcr && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">OCR Language</label>
              <select
                value={options.ocrLanguage || 'eng'}
                onChange={(e) => updateOption('ocrLanguage', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
              >
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Max Image Display Width (pt)</label>
            <select
              value={options.imageWidth || 550}
              onChange={(e) => updateOption('imageWidth', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value={450}>Medium (450 pt)</option>
              <option value={550}>Large / Full Width (550 pt)</option>
              <option value={350}>Compact (350 pt)</option>
            </select>
          </div>
        </div>
      )}

      {/* Mode 4: PDF to Images Settings */}
      {activeMode.id === 'pdf-to-images' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Output Image Format</label>
            <select
              value={options.format || 'png'}
              onChange={(e) => updateOption('format', e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="png">PNG (Lossless & Transparent support)</option>
              <option value="jpeg">JPEG (Smaller file size)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Image Quality / Resolution Scale</label>
            <select
              value={options.scale || 2.0}
              onChange={(e) => updateOption('scale', Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={1.5}>Standard Quality (1.5x scale)</option>
              <option value={2.0}>High Quality (2.0x scale - Recommended)</option>
              <option value={3.0}>Ultra HD (3.0x scale)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
