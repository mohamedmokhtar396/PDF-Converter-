import React from 'react';
import { Settings, Layout, Maximize2, Cpu, FileCheck } from 'lucide-react';

export default function ConversionOptions({ activeMode, options, setOptions, isDarkMode, t }) {
  const updateOption = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const containerStyle = isDarkMode
    ? 'bg-slate-900/60 border-slate-800 text-white backdrop-blur-md'
    : 'bg-white/90 border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50 backdrop-blur-md';

  const selectStyle = isDarkMode
    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500'
    : 'bg-white border-slate-300 text-slate-900 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 shadow-sm';

  const labelStyle = isDarkMode ? 'text-slate-300' : 'text-slate-700';

  return (
    <div className={`w-full border rounded-3xl p-6 mb-8 transition-colors ${containerStyle}`}>
      <div className={`flex items-center gap-2 mb-5 pb-3 border-b ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <Settings className="w-5 h-5 text-indigo-500" />
        <h4 className="text-base font-bold">{t.settingsTitle || 'Conversion Settings'}</h4>
      </div>

      {/* Mode 1 & Mode 3: Image to PDF / Camera Scanner Settings */}
      {(activeMode.id === 'image-to-pdf' || activeMode.id === 'camera-scanner') && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${labelStyle}`}>
                <Layout className="w-3.5 h-3.5 text-indigo-500" /> {t.orientation || 'Page Orientation'}
              </label>
              <select
                value={options.orientation || 'auto'}
                onChange={(e) => updateOption('orientation', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="auto">{t.autoMatch || 'Auto (Match Image)'}</option>
                <option value="portrait">{t.portrait || 'Portrait (Vertical)'}</option>
                <option value="landscape">{t.landscape || 'Landscape (Horizontal)'}</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${labelStyle}`}>
                <Maximize2 className="w-3.5 h-3.5 text-indigo-500" /> {t.pageSize || 'Page Size'}
              </label>
              <select
                value={options.pageSize || 'a4'}
                onChange={(e) => updateOption('pageSize', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="a4">A4 Standard (210 × 297 mm)</option>
                <option value="letter">US Letter (8.5 × 11 in)</option>
                <option value="fit">Fit Exact Image Size</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>{t.pageMargins || 'Page Margins'}</label>
              <select
                value={options.margin ?? 10}
                onChange={(e) => updateOption('margin', Number(e.target.value))}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value={0}>{t.noMargin || 'No Margin'}</option>
                <option value={10}>{t.smallMargin || 'Small Margin (10 mm)'}</option>
                <option value={20}>{t.bigMargin || 'Big Margin (20 mm)'}</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>{t.scaling || 'Image Scaling'}</label>
              <select
                value={options.fit || 'contain'}
                onChange={(e) => updateOption('fit', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="contain">{t.containFit || 'Contain'}</option>
                <option value="stretch">{t.stretchFit || 'Stretch'}</option>
              </select>
            </div>
          </div>

          {/* Minimizer & Compression Options */}
          <div className={`pt-3 border-t grid grid-cols-1 sm:grid-cols-3 gap-4 ${isDarkMode ? 'border-slate-800/80' : 'border-slate-200'}`}>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 flex items-center gap-1.5 ${labelStyle}`}>
                <span className="text-amber-500 font-bold">{t.minimizerTitle || '⚡ File Size Minimizer'}</span>
              </label>
              <select
                value={options.compressLevel || 'balanced'}
                onChange={(e) => {
                  const val = e.target.value;
                  updateOption('compressLevel', val);
                  if (val === 'high') {
                    updateOption('quality', 0.50);
                    updateOption('maxDimension', 1280);
                  } else if (val === 'balanced') {
                    updateOption('quality', 0.78);
                    updateOption('maxDimension', 1920);
                  } else if (val === 'lossless') {
                    updateOption('quality', 0.95);
                    updateOption('maxDimension', 2560);
                  }
                }}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="high">{t.maxCompress || 'Maximum Compression'}</option>
                <option value="balanced">{t.balancedCompress || 'Balanced (Recommended)'}</option>
                <option value="lossless">{t.losslessCompress || 'Ultra HD / Minimal Compression'}</option>
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>{t.customQuality || 'Custom Quality'}: {Math.round((options.quality || 0.78) * 100)}%</label>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={options.quality || 0.78}
                onChange={(e) => updateOption('quality', Number(e.target.value))}
                className="w-full accent-indigo-600 mt-1"
              />
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>{t.scanEffectTitle || 'Document Scan Effect'}</label>
              <select
                value={options.scanFilter || 'none'}
                onChange={(e) => updateOption('scanFilter', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="none">{t.originalColors || 'Original Photo Colors'}</option>
                <option value="bw">{t.bwScan || 'B&W Scan'}</option>
                <option value="grayscale">{t.grayscaleScan || 'Grayscale'}</option>
                <option value="magic">{t.magicColor || 'Magic Color'}</option>
                <option value="paper">{t.vintagePaper || 'Vintage Paper'}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: PDF to Word Settings */}
      {activeMode.id === 'pdf-to-word' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-semibold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Extract Formatted Text</span>
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Extract readable text into Word paragraphs</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeText ?? true}
              onChange={(e) => updateOption('includeText', e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>

          <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-semibold block ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Include Layout Snapshot</span>
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Embed page layout images for high visual fidelity</span>
            </div>
            <input
              type="checkbox"
              checked={options.includeImages ?? true}
              onChange={(e) => updateOption('includeImages', e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Mode 3: Image to Word Settings */}
      {activeMode.id === 'image-to-word' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className={`flex items-center justify-between p-3.5 rounded-2xl border ${
            isDarkMode ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                <Cpu className="w-3.5 h-3.5 text-purple-500" /> Enable AI OCR Text Extraction
              </span>
              <span className={`text-[11px] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Recognize text inside images into Word</span>
            </div>
            <input
              type="checkbox"
              checked={options.enableOcr ?? false}
              onChange={(e) => updateOption('enableOcr', e.target.checked)}
              className="w-4 h-4 accent-purple-600 rounded cursor-pointer"
            />
          </div>

          {options.enableOcr && (
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>OCR Language</label>
              <select
                value={options.ocrLanguage || 'eng'}
                onChange={(e) => updateOption('ocrLanguage', e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
              >
                <option value="eng">English</option>
                <option value="ara">Arabic (العربية)</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
              </select>
            </div>
          )}

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>Max Image Display Width (pt)</label>
            <select
              value={options.imageWidth || 550}
              onChange={(e) => updateOption('imageWidth', Number(e.target.value))}
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>Output Image Format</label>
            <select
              value={options.format || 'png'}
              onChange={(e) => updateOption('format', e.target.value)}
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
            >
              <option value="png">PNG (Lossless & Transparent support)</option>
              <option value="jpeg">JPEG (Smaller file size)</option>
            </select>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${labelStyle}`}>Image Quality / Resolution Scale</label>
            <select
              value={options.scale || 2.0}
              onChange={(e) => updateOption('scale', Number(e.target.value))}
              className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none ${selectStyle}`}
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

