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
 * Ultra-High Precision AI Document Paper Edge Detection (0-100%)
 * Automatically locates paper sheet boundaries vs desk/background
 * @param {HTMLCanvasElement | HTMLImageElement} source
 * @returns {Promise<{x: number, y: number, w: number, h: number}>} Crop percentages (0..100)
 */
export async function detectDocumentCropBounds(source) {
  return new Promise((resolve) => {
    try {
      const sampleW = 320;
      let imgW = source.width || source.naturalWidth || 800;
      let imgH = source.height || source.naturalHeight || 600;
      const sampleH = Math.round((imgH * sampleW) / imgW);

      const canvas = document.createElement('canvas');
      canvas.width = sampleW;
      canvas.height = sampleH;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, sampleW, sampleH);

      const imageData = ctx.getImageData(0, 0, sampleW, sampleH);
      const data = imageData.data;

      const getPixelLum = (x, y) => {
        const idx = (y * sampleW + x) * 4;
        return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
      };

      // Sample outer border luminance (outer 4% frame)
      let borderLumSum = 0;
      let count = 0;
      for (let x = 0; x < sampleW; x += 4) {
        borderLumSum += getPixelLum(x, 2) + getPixelLum(x, sampleH - 3);
        count += 2;
      }
      for (let y = 0; y < sampleH; y += 4) {
        borderLumSum += getPixelLum(2, y) + getPixelLum(sampleW - 3, y);
        count += 2;
      }
      const borderLum = borderLumSum / Math.max(1, count);

      // 1. Find Top Edge (Top -> Down scan)
      let topY = 0;
      for (let y = 0; y < Math.round(sampleH * 0.45); y++) {
        let matchCount = 0;
        for (let x = Math.round(sampleW * 0.15); x < Math.round(sampleW * 0.85); x += 2) {
          const lum = getPixelLum(x, y);
          if (Math.abs(lum - borderLum) > 20 || lum > 140) matchCount++;
        }
        if (matchCount > Math.round(sampleW * 0.25)) {
          topY = y;
          break;
        }
      }

      // 2. Find Bottom Edge (Bottom -> Up scan)
      let bottomY = sampleH - 1;
      for (let y = sampleH - 1; y > Math.round(sampleH * 0.55); y--) {
        let matchCount = 0;
        for (let x = Math.round(sampleW * 0.15); x < Math.round(sampleW * 0.85); x += 2) {
          const lum = getPixelLum(x, y);
          if (Math.abs(lum - borderLum) > 20 || lum > 140) matchCount++;
        }
        if (matchCount > Math.round(sampleW * 0.25)) {
          bottomY = y;
          break;
        }
      }

      // 3. Find Left Edge (Left -> Right scan)
      let leftX = 0;
      for (let x = 0; x < Math.round(sampleW * 0.45); x++) {
        let matchCount = 0;
        for (let y = Math.round(sampleH * 0.15); y < Math.round(sampleH * 0.85); y += 2) {
          const lum = getPixelLum(x, y);
          if (Math.abs(lum - borderLum) > 20 || lum > 140) matchCount++;
        }
        if (matchCount > Math.round(sampleH * 0.25)) {
          leftX = x;
          break;
        }
      }

      // 4. Find Right Edge (Right -> Left scan)
      let rightX = sampleW - 1;
      for (let x = sampleW - 1; x > Math.round(sampleW * 0.55); x--) {
        let matchCount = 0;
        for (let y = Math.round(sampleH * 0.15); y < Math.round(sampleH * 0.85); y += 2) {
          const lum = getPixelLum(x, y);
          if (Math.abs(lum - borderLum) > 20 || lum > 140) matchCount++;
        }
        if (matchCount > Math.round(sampleH * 0.25)) {
          rightX = x;
          break;
        }
      }

      let pctX = Math.round((leftX / sampleW) * 100);
      let pctY = Math.round((topY / sampleH) * 100);
      let pctW = Math.round(((rightX - leftX) / sampleW) * 100);
      let pctH = Math.round(((bottomY - topY) / sampleH) * 100);

      pctX = Math.max(0, pctX);
      pctY = Math.max(0, pctY);
      pctW = Math.min(100 - pctX, Math.max(30, pctW));
      pctH = Math.min(100 - pctY, Math.max(30, pctH));

      resolve({ x: pctX, y: pctY, w: pctW, h: pctH });
    } catch (e) {
      console.warn('AI Crop Detection error:', e);
      resolve({ x: 0, y: 0, w: 100, h: 100 });
    }
  });
}



