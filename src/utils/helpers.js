/**
 * Format bytes into human-readable string (KB, MB, GB)
 */
export function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Read File object as Data URL string
 */
export function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Read File object as ArrayBuffer
 */
export function readAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Get natural width & height of an image (File, Blob, or URL string)
 */
export function getImageDimensions(source) {
  return new Promise((resolve) => {
    const img = new Image();
    let src = source;
    let isCreatedUrl = false;
    if (source instanceof Blob || source instanceof File) {
      src = URL.createObjectURL(source);
      isCreatedUrl = true;
    }
    img.onload = () => {
      const dims = { width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      if (isCreatedUrl) URL.revokeObjectURL(src);
      resolve(dims);
    };
    img.onerror = () => {
      if (isCreatedUrl) URL.revokeObjectURL(src);
      resolve({ width: 800, height: 600 });
    };
    img.src = src;
  });
}

/**
 * Generate a tiny lightweight low-res thumbnail Object URL for fast grid display
 * Prevents base64 state memory explosion for 100+ images!
 */
export async function createThumbnailUrl(file, maxDim = 180) {
  if (!file || !file.type.startsWith('image/')) return null;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            resolve(objectUrl);
          }
        },
        'image/jpeg',
        0.6
      );
    };

    img.onerror = () => {
      resolve(objectUrl);
    };

    img.src = objectUrl;
  });
}

/**
 * Apply Document Scanner Filter Effects to Canvas Context
 * @param {CanvasRenderingContext2D} ctx 
 * @param {number} width 
 * @param {number} height 
 * @param {string} filterType 'bw' | 'grayscale' | 'magic' | 'paper' | 'none'
 */
export function applyScanFilterToCanvas(ctx, width, height, filterType = 'bw') {
  if (!filterType || filterType === 'none') return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (filterType === 'bw') {
      // High-Contrast Document B&W threshold
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      // High contrast thresholding (Adaptive feel)
      const bw = gray < 135 ? Math.max(0, gray - 40) : Math.min(255, gray + 40);
      const finalVal = bw < 128 ? 0 : 255;
      data[i] = finalVal;
      data[i + 1] = finalVal;
      data[i + 2] = finalVal;
    } else if (filterType === 'grayscale') {
      // Document Grayscale scan
      const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      data[i] = gray;
      data[i + 1] = gray;
      data[i + 2] = gray;
    } else if (filterType === 'magic') {
      // Magic Color (Boost contrast and whites)
      let nr = (r - 128) * 1.35 + 128 + 15;
      let ng = (g - 128) * 1.35 + 128 + 15;
      let nb = (b - 128) * 1.35 + 128 + 15;
      data[i] = Math.min(255, Math.max(0, nr));
      data[i + 1] = Math.min(255, Math.max(0, ng));
      data[i + 2] = Math.min(255, Math.max(0, nb));
    } else if (filterType === 'paper') {
      // Vintage Paper Scan tone
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = Math.min(255, gray * 0.95 + 15);
      data[i + 1] = Math.min(255, gray * 0.92 + 10);
      data[i + 2] = Math.min(255, gray * 0.85);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Sanitize filename to ensure safe extension handling
 */
export function sanitizeFileName(name, defaultExt = '') {
  if (!name) return `converted_document${defaultExt ? '.' + defaultExt : ''}`;
  let cleaned = name.trim().replace(/[\\/:*?"<>|]/g, '_');
  if (defaultExt && !cleaned.toLowerCase().endsWith('.' + defaultExt.toLowerCase())) {
    cleaned = `${cleaned}.${defaultExt}`;
  }
  return cleaned;
}

/**
 * Universal AI Paper Document Edge Detector (0-100%)
 * Uses Otsu Thresholding to find white/light paper boundaries in photos, PDF pages & scans
 * @param {HTMLCanvasElement | HTMLImageElement} source
 * @returns {Promise<{x: number, y: number, w: number, h: number}>} Crop percentages (0..100)
 */
export async function detectDocumentCropBounds(source) {
  return new Promise((resolve) => {
    try {
      const sampleW = 320;
      const imgW = source.width || source.naturalWidth || 800;
      const imgH = source.height || source.naturalHeight || 600;
      const sampleH = Math.round((imgH * sampleW) / imgW);

      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, sampleW, sampleH);

      const { data } = ctx.getImageData(0, 0, sampleW, sampleH);

      // Build Uint8 luminance map
      const lum = new Uint8Array(sampleW * sampleH);
      for (let i = 0; i < data.length; i += 4) {
        lum[i / 4] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // Otsu's thresholding over luminance map
      const hist = new Int32Array(256);
      for (let i = 0; i < lum.length; i++) hist[lum[i]]++;

      const total = lum.length;
      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * hist[t];

      let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (!wB) continue;
        const wF = total - wB;
        if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const varB = wB * wF * (mB - mF) ** 2;
        if (varB > maxVar) { maxVar = varB; threshold = t; }
      }

      let minX = sampleW, minY = sampleH, maxX = 0, maxY = 0;
      let found = 0;

      // Scan for paper region pixels above paper threshold
      const paperThresh = Math.max(130, threshold);
      for (let y = 0; y < sampleH; y++) {
        for (let x = 0; x < sampleW; x++) {
          if (lum[y * sampleW + x] >= paperThresh) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            found++;
          }
        }
      }

      // If paper document region is detected within the photo
      if (found > 300 && maxX > minX && maxY > minY) {
        const padX = Math.round(sampleW * 0.015);
        const padY = Math.round(sampleH * 0.015);

        const cx = Math.max(0, minX - padX);
        const cy = Math.max(0, minY - padY);
        const cw = Math.min(sampleW - cx, (maxX - minX) + padX * 2);
        const ch = Math.min(sampleH - cy, (maxY - minY) + padY * 2);

        const pctX = Math.round((cx / sampleW) * 100);
        const pctY = Math.round((cy / sampleH) * 100);
        const pctW = Math.min(100 - pctX, Math.round((cw / sampleW) * 100));
        const pctH = Math.min(100 - pctY, Math.round((ch / sampleH) * 100));

        if (pctW >= 20 && pctH >= 20 && (pctX > 1 || pctY > 1 || pctW < 97 || pctH < 97)) {
          resolve({ x: pctX, y: pctY, w: pctW, h: pctH });
          return;
        }
      }

      // Default smart document trim (5% margins)
      resolve({ x: 5, y: 5, w: 90, h: 90 });
    } catch (e) {
      console.warn('detectDocumentCropBounds error:', e);
      resolve({ x: 5, y: 5, w: 90, h: 90 });
    }
  });
}






