import { jsPDF } from 'jspdf';
import { readAsDataURL, getImageDimensions } from './helpers';

/**
 * Convert images array to a single PDF blob with real-time progress callbacks
 */
export async function convertImagesToPdf(files, options = {}, onProgress = () => {}) {
  if (!files || files.length === 0) {
    throw new Error('No images provided for conversion.');
  }

  onProgress({ percent: 5, stage: 'Initializing PDF generator...' });

  const {
    orientation = 'auto', // 'auto', 'portrait', 'landscape'
    pageSize = 'a4', // 'a4', 'letter', 'fit'
    margin = 10, // mm
    fit = 'contain', // 'contain', 'stretch'
  } = options;

  let doc = null;

  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i];
    const stepPercent = Math.round(10 + ((i + 1) / files.length) * 80);
    onProgress({
      percent: stepPercent,
      stage: `Processing image ${i + 1} of ${files.length}: ${fileItem.file?.name || fileItem.name || 'Image'}`,
    });

    const dataUrl = fileItem.preview || await readAsDataURL(fileItem.file || fileItem);
    const dims = await getImageDimensions(dataUrl);

    // Determine page orientation & size
    let pageOrient = orientation;
    if (pageOrient === 'auto') {
      pageOrient = dims.width > dims.height ? 'landscape' : 'portrait';
    }

    let pWidth, pHeight;
    if (pageSize === 'fit') {
      // 1px = 0.264583 mm
      pWidth = Math.max(100, dims.width * 0.264583);
      pHeight = Math.max(100, dims.height * 0.264583);
    } else if (pageSize === 'letter') {
      pWidth = pageOrient === 'landscape' ? 279.4 : 215.9;
      pHeight = pageOrient === 'landscape' ? 215.9 : 279.4;
    } else {
      // A4 default
      pWidth = pageOrient === 'landscape' ? 297 : 210;
      pHeight = pageOrient === 'landscape' ? 210 : 297;
    }

    if (i === 0) {
      doc = new jsPDF({
        orientation: pageOrient,
        unit: 'mm',
        format: pageSize === 'fit' ? [pWidth, pHeight] : pageSize,
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
      const imgRatio = dims.width / dims.height;
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

    // Determine format type
    let imageFormat = 'JPEG';
    if (dataUrl.startsWith('data:image/png')) imageFormat = 'PNG';
    else if (dataUrl.startsWith('data:image/webp')) imageFormat = 'WEBP';

    doc.addImage(dataUrl, imageFormat, xPos, yPos, renderWidth, renderHeight);
  }

  onProgress({ percent: 95, stage: 'Finalizing PDF output...' });
  const pdfBlob = doc.output('blob');

  onProgress({ percent: 100, stage: 'PDF generation complete!' });
  return pdfBlob;
}
