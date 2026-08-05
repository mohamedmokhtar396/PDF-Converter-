import React from 'react';
import { ShieldCheck, Sparkles, FileStack, Sun, Moon, Globe } from 'lucide-react';

export default function Header({ isDarkMode, setIsDarkMode, lang, setLang, t }) {
  const toggleLanguage = () => {
    const nextLang = lang === 'en' ? 'ar' : 'en';
    setLang(nextLang);
    document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = nextLang;
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b backdrop-blur-2xl transition-colors ${
      isDarkMode
        ? 'border-slate-800/80 bg-slate-950/85 text-white'
        : 'border-slate-200/80 bg-white/80 text-slate-900 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-transform duration-300">
            <FileStack className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold text-xl tracking-tight ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                {t.brandName} <span className="gradient-text font-black">{t.brandPro}</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> v2.0
              </span>
            </div>
            <p className={`text-xs font-medium hidden sm:block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              {t.brandTagline}
            </p>
          </div>
        </div>

        {/* Right Header Controls: Language Switcher, Privacy Badge & Light/Dark Theme */}
        <div className="flex items-center gap-2.5">
          <div className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            isDarkMode
              ? 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'
              : 'bg-emerald-50 border border-emerald-300 text-emerald-700'
          }`}>
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{t.privateBadge}</span>
          </div>

          {/* Language Switcher Button (Arabic / English) */}
          <button
            onClick={toggleLanguage}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700/80 text-indigo-300 hover:bg-slate-700 hover:text-white'
                : 'bg-slate-100 border-slate-300 text-indigo-600 hover:bg-slate-200'
            }`}
            title="Switch Language (العربية / English)"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{lang === 'en' ? 'العربية' : 'English'}</span>
          </button>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isDarkMode
                ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
          </button>
        </div>

      </div>
    </header>
  );
}

