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
 * Auto-detect document edges / non-blank content boundaries for AI Auto-Crop (0-100%)
 * @param {HTMLCanvasElement | HTMLImageElement} source
 * @returns {Promise<{x: number, y: number, w: number, h: number}>} Crop percentages (0..100)
 */
export async function detectDocumentCropBounds(source) {
  return new Promise((resolve) => {
    try {
      const sampleWidth = 320;
      let imgW = source.width || source.naturalWidth || 800;
      let imgH = source.height || source.naturalHeight || 600;
      const sampleHeight = Math.round((imgH * sampleWidth) / imgW);

      const canvas = document.createElement('canvas');
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, sampleWidth, sampleHeight);

      const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
      const data = imageData.data;

      // Sample corner pixels to estimate background color (desk or page border)
      const cornerSamples = [
        [0, 0],
        [sampleWidth - 1, 0],
        [0, sampleHeight - 1],
        [sampleWidth - 1, sampleHeight - 1],
      ];

      let bgR = 0, bgG = 0, bgB = 0;
      cornerSamples.forEach(([cx, cy]) => {
        const idx = (cy * sampleWidth + cx) * 4;
        bgR += data[idx];
        bgG += data[idx + 1];
        bgB += data[idx + 2];
      });
      bgR = Math.round(bgR / 4);
      bgG = Math.round(bgG / 4);
      bgB = Math.round(bgB / 4);

      let minX = sampleWidth, minY = sampleHeight, maxX = 0, maxY = 0;
      let detectedCount = 0;

      for (let y = 0; y < sampleHeight; y++) {
        for (let x = 0; x < sampleWidth; x++) {
          const idx = (y * sampleWidth + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Calculate color difference from background
          const diff = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
          
          // Also check luminance contrast from white/dark borders
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;

          if (diff > 35 || lum < 220) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            detectedCount++;
          }
        }
      }

      // If document edge detected cleanly
      if (detectedCount > 100 && maxX > minX && maxY > minY) {
        // Add 1.5% padding margin
        const padX = Math.round(sampleWidth * 0.015);
        const padY = Math.round(sampleHeight * 0.015);

        const cropX = Math.max(0, minX - padX);
        const cropY = Math.max(0, minY - padY);
        const cropW = Math.min(sampleWidth - cropX, (maxX - minX) + (padX * 2));
        const cropH = Math.min(sampleHeight - cropY, (maxY - minY) + (padY * 2));

        const pctX = Math.round((cropX / sampleWidth) * 100);
        const pctY = Math.round((cropY / sampleHeight) * 100);
        const pctW = Math.round((cropW / sampleWidth) * 100);
        const pctH = Math.round((cropH / sampleHeight) * 100);

        // Ensure minimum 20% size
        if (pctW >= 20 && pctH >= 20) {
          resolve({ x: pctX, y: pctY, w: Math.min(100 - pctX, pctW), h: Math.min(100 - pctY, pctH) });
          return;
        }
      }

      // Default fallback: 100% full content
      resolve({ x: 0, y: 0, w: 100, h: 100 });
    } catch (e) {
      console.warn('Auto-crop detection error:', e);
      resolve({ x: 0, y: 0, w: 100, h: 100 });
    }
  });
}


