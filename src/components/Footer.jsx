import React from 'react';
import { Heart, ShieldCheck, Github, Globe, Sparkles } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 text-slate-400 py-8 px-4 sm:px-6 lg:px-8 mt-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
        
        {/* Copyright notice */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">
            © {currentYear} OmniConvert Pro.
          </span>
          <span>Created with</span>
          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 animate-pulse" />
          <span>by</span>
          <a
            href="https://github.com/mohamedmokhtar396"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-white hover:text-indigo-400 underline underline-offset-4 decoration-indigo-500 transition-colors flex items-center gap-1"
          >
            Mohamed Mokhtar
          </a>
        </div>

        {/* Middle privacy badge */}
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>100% Client-Side & Private • No Data Uploaded</span>
        </div>

        {/* Links */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/mohamedmokhtar396/PDF-Converter-"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:text-white transition-colors"
          >
            <Github className="w-4 h-4 text-slate-300" />
            <span>GitHub Repository</span>
          </a>
        </div>

      </div>
    </footer>
  );
}
