# 🚀 OmniConvert Pro - Modern Client-Side Document Converter Suite

OmniConvert Pro is a feature-rich, high-performance web application built with **React**, **Vite**, and **Tailwind CSS**. It allows users to convert between Images, PDFs, and Microsoft Word documents entirely in the browser with **100% privacy**.

Created by **Mohamed Mokhtar**.

---

## 🔥 Features

- 📸 **Images to PDF**: Convert JPG, PNG, WEBP, GIF, and SVG into a single customized PDF. Adjust orientation, margins, and page fit.
- 📄 **PDF to Word (.docx)**: Extract layout, formatted text, and embedded page images into editable Microsoft Word documents using `pdfjs-dist` & `docx`.
- 🖼️ **Images to Word (.docx)**: Convert pictures directly into Word documents with optional **AI / OCR Text Extraction** powered by `tesseract.js`.
- 📑 **PDF to Images**: Convert PDF pages into high-resolution PNG or JPEG images (or download as `.zip`).
- ⏳ **Real-Time Progress Visualizer**: Live percentage ring, progress bar, and stage status messages.
- ✏️ **Custom File Renaming**: Rename files before downloading with extension locks and preset chips.
- 🎆 **Confetti Celebrations**: Download feedback with `canvas-confetti`.
- 🔒 **100% Client-Side Privacy**: All processing runs locally inside the browser. No server uploads.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + Vite 6
- **Styling**: Tailwind CSS v4 + Glassmorphism UI Design System
- **Icons**: Lucide React
- **Document Engines**: `jspdf`, `pdf-lib`, `pdfjs-dist`, `docx`, `tesseract.js`, `jszip`, `file-saver`

---

## 🚀 How to Run Locally

```bash
# Clone the repository
git clone https://github.com/mohamedmokhtar396/PDF-Converter-.git

# Navigate into the project
cd PDF-Converter-

# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🌐 Deploy to Vercel (One-Click)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New..."** -> **"Project"**.
2. Connect your GitHub account and select repository: **`PDF-Converter-`**.
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Click **Deploy**!

---

## 📄 License & Copyright

© 2026 **Mohamed Mokhtar**. All rights reserved.
[Design System Guide](DESIGN_SYSTEM_GUIDE.md)
