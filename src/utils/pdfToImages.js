import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import { readAsArrayBuffer } from './helpers';

// Local worker setup for 100% offline usage
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


/**
 * Render PDF pages into individual image files or a ZIP archive
 */
export async function convertPdfToImages(file, options = {}, onProgress = () => {}) {
  if (!file) throw new Error('No PDF file selected.');

  const { format = 'png', scale = 2.0 } = options; // format: 'png' or 'jpeg'

  onProgress({ percent: 5, stage: 'Reading PDF pages...' });

  const arrayBuffer = await readAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const imageResults = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const stepPercent = Math.round(10 + (pageNum / totalPages) * 75);
    onProgress({
      percent: stepPercent,
      stage: `Rendering PDF page ${pageNum} of ${totalPages} as ${format.toUpperCase()}...`,
    });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const mimeType = format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png';
    const dataUrl = canvas.toDataURL(mimeType, 0.92);

    // Convert dataUrl to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    const fileName = `${file.name.replace(/\.[^/.]+$/, '')}_page_${pageNum}.${format}`;
    imageResults.push({
      pageNum,
      fileName,
      blob,
      dataUrl,
    });
  }

  onProgress({ percent: 90, stage: 'Preparing output files...' });

  if (imageResults.length === 1) {
    onProgress({ percent: 100, stage: 'PDF to Image conversion complete!' });
    return {
      type: 'single',
      blob: imageResults[0].blob,
      fileName: imageResults[0].fileName,
      preview: imageResults[0].dataUrl,
    };
  } else {
    onProgress({ percent: 95, stage: 'Creating ZIP archive for multi-page output...' });
    const zip = new JSZip();
    const folderName = file.name.replace(/\.[^/.]+$/, '') + '_images';
    const folder = zip.folder(folderName);

    imageResults.forEach((img) => {
      folder.file(img.fileName, img.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    onProgress({ percent: 100, stage: 'PDF to Images conversion complete!' });

    return {
      type: 'zip',
      blob: zipBlob,
      fileName: `${folderName}.zip`,
      items: imageResults,
    };
  }
}
