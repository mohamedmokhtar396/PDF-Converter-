import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import { Document, Packer, Paragraph, TextRun, ImageRun, HeadingLevel } from 'docx';
import { readAsArrayBuffer } from './helpers';

// Configure pdfjs worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;

/**
 * Convert a PDF file to a Microsoft Word (.docx) blob
 */
export async function convertPdfToWord(file, options = {}, onProgress = () => {}) {
  if (!file) throw new Error('No PDF file selected.');

  onProgress({ percent: 5, stage: 'Loading PDF document...' });

  const arrayBuffer = await readAsArrayBuffer(file);
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  onProgress({ percent: 15, stage: `Loaded PDF (${totalPages} pages). Processing content...` });

  const docSections = [];
  const { includeImages = true, includeText = true } = options;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const stepPercent = Math.round(15 + (pageNum / totalPages) * 75);
    onProgress({
      percent: stepPercent,
      stage: `Processing PDF page ${pageNum} of ${totalPages}...`,
    });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });

    const pageParagraphs = [];

    // Page header title
    pageParagraphs.push(
      new Paragraph({
        text: `--- Page ${pageNum} ---`,
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
      })
    );

    // 1. Extract Text content
    if (includeText) {
      const textContent = await page.getTextContent();
      let currentLineY = null;
      let lineText = '';

      for (const item of textContent.items) {
        if (!item.str) continue;

        // Group items into lines based on Y coordinate
        const itemY = Math.round(item.transform[5]);
        if (currentLineY === null || Math.abs(currentLineY - itemY) > 5) {
          if (lineText.trim()) {
            pageParagraphs.push(
              new Paragraph({
                children: [new TextRun({ text: lineText, size: 24 })],
                spacing: { after: 80 },
              })
            );
          }
          lineText = item.str;
          currentLineY = itemY;
        } else {
          lineText += ' ' + item.str;
        }
      }

      if (lineText.trim()) {
        pageParagraphs.push(
          new Paragraph({
            children: [new TextRun({ text: lineText, size: 24 })],
            spacing: { after: 120 },
          })
        );
      }
    }

    // 2. Render Page Canvas snapshot to embed in DOCX for exact layout representation
    if (includeImages) {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      const imageDataUrl = canvas.toDataURL('image/png');
      const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Calculate width for Word (max 550px width)
      const targetWidth = Math.min(550, viewport.width * 0.7);
      const targetHeight = targetWidth * (viewport.height / viewport.width);

      pageParagraphs.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: targetWidth,
                height: targetHeight,
              },
            }),
          ],
          spacing: { before: 120, after: 240 },
        })
      );
    }

    docSections.push(...pageParagraphs);
  }

  onProgress({ percent: 92, stage: 'Building Microsoft Word (.docx) document...' });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docSections.length > 0 ? docSections : [
          new Paragraph({
            children: [new TextRun('Document extracted from PDF')],
          }),
        ],
      },
    ],
  });

  const wordBlob = await Packer.toBlob(doc);
  onProgress({ percent: 100, stage: 'PDF to Word conversion complete!' });
  return wordBlob;
}
