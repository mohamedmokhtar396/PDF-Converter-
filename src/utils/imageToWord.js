import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel, PageBreak } from 'docx';
import { createWorker } from 'tesseract.js';
import { readAsDataURL, getImageDimensions } from './helpers';

/**
 * Convert images to Word (.docx) with optional Tesseract.js OCR
 */
export async function convertImagesToWord(files, options = {}, onProgress = () => {}) {
  if (!files || files.length === 0) {
    throw new Error('No images selected for conversion.');
  }

  const { enableOcr = false, ocrLanguage = 'eng', imageWidth = 550 } = options;

  onProgress({ percent: 5, stage: 'Preparing Word document builder...' });

  let ocrWorker = null;
  if (enableOcr) {
    onProgress({ percent: 10, stage: 'Initializing OCR engine (Tesseract)...' });
    try {
      ocrWorker = await createWorker(ocrLanguage);
    } catch (err) {
      console.warn('OCR Worker initialization fallback:', err);
    }
  }

  const children = [];

  for (let i = 0; i < files.length; i++) {
    const fileItem = files[i];
    const basePercent = 15 + Math.round((i / files.length) * 75);

    onProgress({
      percent: basePercent,
      stage: `Processing image ${i + 1} of ${files.length}: ${fileItem.file?.name || fileItem.name || 'Image'}`,
    });

    const dataUrl = fileItem.preview || await readAsDataURL(fileItem.file || fileItem);
    const dims = await getImageDimensions(dataUrl);

    // Section title
    const imageName = fileItem.file?.name || fileItem.name || `Image ${i + 1}`;
    children.push(
      new Paragraph({
        text: `Image ${i + 1}: ${imageName}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      })
    );

    // Convert DataURL to ArrayBuffer for ImageRun
    const base64Data = dataUrl.split(',')[1];
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

    // Calculate dimensions
    const scale = imageWidth / dims.width;
    const calcWidth = Math.min(imageWidth, dims.width);
    const calcHeight = Math.round(dims.height * (calcWidth / dims.width));

    // Add Image to Word
    children.push(
      new Paragraph({
        children: [
          new ImageRun({
            data: binaryData,
            transformation: {
              width: calcWidth,
              height: calcHeight,
            },
          }),
        ],
        spacing: { after: 200 },
      })
    );

    // OCR Extraction if enabled
    if (enableOcr && ocrWorker) {
      onProgress({
        percent: basePercent + Math.round(70 / files.length),
        stage: `Extracting text via OCR from image ${i + 1}...`,
      });

      try {
        const ret = await ocrWorker.recognize(dataUrl);
        const extractedText = ret.data.text.trim();

        if (extractedText) {
          children.push(
            new Paragraph({
              text: 'Extracted Text (OCR):',
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 120, after: 80 },
            })
          );

          const lines = extractedText.split('\n');
          for (const line of lines) {
            if (line.trim()) {
              children.push(
                new Paragraph({
                  children: [new TextRun({ text: line.trim(), size: 22 })],
                  spacing: { after: 60 },
                })
              );
            }
          }
        }
      } catch (ocrErr) {
        console.error('OCR Error:', ocrErr);
      }
    }

    // Page break between images if multiple
    if (i < files.length - 1) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  if (ocrWorker) {
    await ocrWorker.terminate();
  }

  onProgress({ percent: 95, stage: 'Generating .docx file...' });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  const wordBlob = await Packer.toBlob(doc);

  onProgress({ percent: 100, stage: 'Images to Word conversion complete!' });
  return wordBlob;
}
