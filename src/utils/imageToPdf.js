import { jsPDF } from 'jspdf';
import { applyScanFilterToCanvas } from './helpers';

/**
 * Load an image File or Blob into an HTMLImageElement safely
 */
function loadImageFromFile(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();
    img.onload = () => {
      resolve({ img, objectUrl });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };
    img.src = objectUrl;
  });
}

/**
 * Convert images array to a single PDF blob with real-time progress callbacks & memory compression
 */
export async function convertImagesToPdf(files, options = {}, onProgress = () => {}) {
  if (!files || files.length === 0) {
    throw new Error('No images provided for conversion.');
  }

  onProgress({ percent: 5, stage: 'Initializing PDF engine...' });

  const {
    orientation = 'auto', // 'auto', 'portrait', 'landscape'
    pageSize = 'a4', // 'a4', 'letter', 'fit'
    margin = 10, // mm
    fit = 'contain', // 'contain', 'stretch'
    quality = 0.80, // compression quality 0.1 - 1.0
    maxDimension = 1920, // max pixel dimension (0 for native)
    scanFilter = 'none', // 'none', 'bw', 'grayscale', 'magic', 'paper'
    compressPhotos = true,
  } = options;

  let doc = null;

  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i];
    const rawFile = fileItem.file || fileItem;
    const stepPercent = Math.round(10 + ((i + 1) / files.length) * 80);

    onProgress({
      percent: stepPercent,
      stage: `Processing page ${i + 1} of ${files.length}: ${rawFile.name || 'Image'}`,
    });

    // Yield control to main loop to allow UI updates and memory cleanup
    await new Promise((r) => setTimeout(r, 0));

    let loadedImg, objectUrl;
    try {
      if (rawFile instanceof Blob || rawFile instanceof File) {
        const res = await loadImageFromFile(rawFile);
        loadedImg = res.img;
        objectUrl = res.objectUrl;
      } else if (typeof rawFile === 'string') {
        const img = new Image();
        img.src = rawFile;
        await new Promise((res) => { img.onload = res; });
        loadedImg = img;
      } else if (fileItem.preview) {
        const img = new Image();
        img.src = fileItem.preview;
        await new Promise((res) => { img.onload = res; });
        loadedImg = img;
      }
    } catch (e) {
      console.warn(`Failed to load image at index ${i}:`, e);
      continue;
    }

    let origW = loadedImg.naturalWidth || loadedImg.width || 1200;
    let origH = loadedImg.naturalHeight || loadedImg.height || 1600;

    // Calculate canvas render target dimensions
    let targetW = origW;
    let targetH = origH;

    if (maxDimension > 0 && (origW > maxDimension || origH > maxDimension)) {
      if (origW > origH) {
        targetH = Math.round((origH * maxDimension) / origW);
        targetW = maxDimension;
      } else {
        targetW = Math.round((origW * maxDimension) / origH);
        targetH = maxDimension;
      }
    }

    // Render to intermediate canvas for compression & scan filters
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(loadedImg, 0, 0, targetW, targetH);

    // Apply document scan filter if requested
    if (scanFilter && scanFilter !== 'none') {
      applyScanFilterToCanvas(ctx, targetW, targetH, scanFilter);
    }

    // Export compressed JPEG data URL
    const imageQuality = compressPhotos ? Math.min(1.0, Math.max(0.1, quality)) : 0.92;
    const compressedDataUrl = canvas.toDataURL('image/jpeg', imageQuality);

    // Cleanup image blob URL
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
    // Clear canvas
    canvas.width = 1;
    canvas.height = 1;

    // Page orientation & sizing calculations
    let pageOrient = orientation;
    if (pageOrient === 'auto') {
      pageOrient = targetW > targetH ? 'landscape' : 'portrait';
    }

    let pWidth, pHeight;
    if (pageSize === 'fit') {
      pWidth = Math.max(100, targetW * 0.264583);
      pHeight = Math.max(100, targetH * 0.264583);
    } else if (pageSize === 'letter') {
      pWidth = pageOrient === 'landscape' ? 279.4 : 215.9;
      pHeight = pageOrient === 'landscape' ? 215.9 : 279.4;
    } else {
      // A4
      pWidth = pageOrient === 'landscape' ? 297 : 210;
      pHeight = pageOrient === 'landscape' ? 210 : 297;
    }

    if (!doc) {
      doc = new jsPDF({
        orientation: pageOrient,
        unit: 'mm',
        format: pageSize === 'fit' ? [pWidth, pHeight] : pageSize,
        compress: true,
      });
    } else {
      doc.addPage(pageSize === 'fit' ? [pWidth, pHeight] : pageSize, pageOrient);
    }

    const availWidth = Math.max(10, pWidth - margin * 2);
    const availHeight = Math.max(10, pHeight - margin * 2);

    let renderWidth = availWidth;
    let renderHeight = availHeight;
    let xPos = margin;
    let yPos = margin;

    if (fit === 'contain') {
      const imgRatio = targetW / targetH;
      const availRatio = availWidth / availHeight;

      if (imgRatio > availRatio) {
        renderWidth = availWidth;
        renderHeight = availWidth / imgRatio;
      } else {
        renderHeight = availHeight;
        renderWidth = availHeight * imgRatio;
      }
      xPos = margin + (availWidth - renderWidth) / 2;
      yPos = margin + (availHeight - renderHeight) / 2;
    }

    doc.addImage(compressedDataUrl, 'JPEG', xPos, yPos, renderWidth, renderHeight);
  }

  if (!doc) {
    throw new Error('No valid images could be processed.');
  }

  onProgress({ percent: 95, stage: 'Finalizing PDF output...' });
  const pdfBlob = doc.output('blob');

  onProgress({ percent: 100, stage: 'PDF generation complete!' });
  return pdfBlob;
}

