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
 * AI Document Paper Edge Detector with Connected Component Analysis
 *
 * Algorithm (mirrors OpenCV findContours pipeline):
 *   1. Downscale → Grayscale luminance
 *   2. Otsu adaptive threshold → binary mask (paper=1, background=0)
 *   3. Morphological Close (3×3 dilation then erosion) to fill small gaps
 *   4. Connected Component Labeling via Union-Find
 *   5. Pick the LARGEST connected component (= the paper sheet)
 *   6. Bounding box of that component → crop percentages
 *
 * This approach correctly ignores scattered bright reflections/noise
 * because they form tiny components, not the largest one.
 *
 * @param {HTMLCanvasElement | HTMLImageElement} source
 * @returns {Promise<{x: number, y: number, w: number, h: number}>}
 */
export async function detectDocumentCropBounds(source) {
  return new Promise((resolve) => {
    try {
      const W = 240;  // analysis width
      const imgW = source.width || source.naturalWidth || 800;
      const imgH = source.height || source.naturalHeight || 600;
      const H = Math.round((imgH * W) / imgW);

      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(source, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      // ── Step 1: Build luminance map ──────────────────────────────────────
      const N = W * H;
      const lum = new Uint8Array(N);
      for (let i = 0; i < data.length; i += 4) {
        lum[i >> 2] = (data[i] * 77 + data[i+1] * 150 + data[i+2] * 29) >> 8;
      }

      // ── Step 2: Otsu threshold ───────────────────────────────────────────
      const hist = new Int32Array(256);
      for (let i = 0; i < N; i++) hist[lum[i]]++;

      let sum = 0;
      for (let t = 0; t < 256; t++) sum += t * hist[t];

      let sumB = 0, wB = 0, bestVar = 0, otsuT = 128;
      for (let t = 0; t < 256; t++) {
        wB += hist[t];
        if (!wB) continue;
        const wF = N - wB;
        if (!wF) break;
        sumB += t * hist[t];
        const diff = (sumB / wB) - ((sum - sumB) / wF);
        const v = wB * wF * diff * diff;
        if (v > bestVar) { bestVar = v; otsuT = t; }
      }

      // Build binary mask: 1 = paper (bright), 0 = background
      const paperT = Math.max(otsuT, 120);
      const mask = new Uint8Array(N);
      for (let i = 0; i < N; i++) mask[i] = lum[i] >= paperT ? 1 : 0;

      // ── Step 3: Morphological Close (dilate then erode, 3×3) ─────────────
      // This fills 1-pixel gaps inside the paper region.
      const dilated = new Uint8Array(N);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const idx = y * W + x;
          // 3×3 max (dilation)
          dilated[idx] =
            mask[idx] | mask[idx-1] | mask[idx+1] |
            mask[idx-W] | mask[idx-W-1] | mask[idx-W+1] |
            mask[idx+W] | mask[idx+W-1] | mask[idx+W+1];
        }
      }
      const closed = new Uint8Array(N);
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          const idx = y * W + x;
          // 3×3 min (erosion)
          closed[idx] =
            dilated[idx] & dilated[idx-1] & dilated[idx+1] &
            dilated[idx-W] & dilated[idx-W-1] & dilated[idx-W+1] &
            dilated[idx+W] & dilated[idx+W-1] & dilated[idx+W+1];
        }
      }

      // ── Step 4: Connected Component Labeling (Union-Find) ────────────────
      const parent = new Int32Array(N).fill(-1); // -1 = unlabeled
      const rank   = new Uint8Array(N);

      function find(a) {
        while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; }
        return a;
      }
      function union(a, b) {
        a = find(a); b = find(b);
        if (a === b) return;
        if (rank[a] < rank[b]) { const tmp = a; a = b; b = tmp; }
        parent[b] = a;
        if (rank[a] === rank[b]) rank[a]++;
      }

      // First pass: label and union
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x;
          if (!closed[idx]) continue;
          parent[idx] = idx; // self-root

          // Check left neighbor
          if (x > 0 && closed[idx - 1]) union(idx, idx - 1);
          // Check top neighbor
          if (y > 0 && closed[idx - W]) union(idx, idx - W);
          // Check top-left diagonal
          if (x > 0 && y > 0 && closed[idx - W - 1]) union(idx, idx - W - 1);
          // Check top-right diagonal
          if (x < W - 1 && y > 0 && closed[idx - W + 1]) union(idx, idx - W + 1);
        }
      }

      // ── Step 5: Find LARGEST component ───────────────────────────────────
      const compSize = new Map();
      for (let i = 0; i < N; i++) {
        if (parent[i] < 0) continue;
        const root = find(i);
        compSize.set(root, (compSize.get(root) || 0) + 1);
      }

      let bestRoot = -1, bestSize = 0;
      for (const [root, size] of compSize) {
        if (size > bestSize) { bestSize = size; bestRoot = root; }
      }

      // ── Step 6: Bounding box of the largest component ────────────────────
      if (bestRoot >= 0 && bestSize > 200) {
        let minX = W, minY = H, maxX = 0, maxY = 0;

        for (let y = 0; y < H; y++) {
          for (let x = 0; x < W; x++) {
            const idx = y * W + x;
            if (parent[idx] < 0) continue;
            if (find(idx) === bestRoot) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (maxX > minX && maxY > minY) {
          const padX = Math.round(W * 0.01);
          const padY = Math.round(H * 0.01);

          const cx = Math.max(0, minX - padX);
          const cy = Math.max(0, minY - padY);
          const cw = Math.min(W - cx, (maxX - minX) + padX * 2);
          const ch = Math.min(H - cy, (maxY - minY) + padY * 2);

          const pctX = Math.round((cx / W) * 100);
          const pctY = Math.round((cy / H) * 100);
          const pctW = Math.min(100 - pctX, Math.round((cw / W) * 100));
          const pctH = Math.min(100 - pctY, Math.round((ch / H) * 100));

          // Only use crop if it actually trimmed something meaningful
          if (pctW >= 15 && pctH >= 15 && (pctX > 2 || pctY > 2 || pctW < 96 || pctH < 96)) {
            resolve({ x: pctX, y: pctY, w: pctW, h: pctH });
            return;
          }
        }
      }

      // Fallback — trim 5% margins
      resolve({ x: 5, y: 5, w: 90, h: 90 });
    } catch (e) {
      console.warn('detectDocumentCropBounds error:', e);
      resolve({ x: 5, y: 5, w: 90, h: 90 });
    }
  });
}






