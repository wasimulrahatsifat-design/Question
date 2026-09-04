/**
 * Extracts specified pages of a PDF File as Base64 JPEG strings on the client side.
 * Avoids sending heavy PDF binaries across the wire to stay well within Vercel's payload limits.
 * 
 * @param {File} file - User-selected PDF file
 * @param {number} startPage - 1-indexed starting page
 * @param {number} endPage - 1-indexed ending page
 * @returns {Promise<Array<{ pageNumber: number, base64Data: string, mimeType: string }>>}
 */
export async function convertPdfPagesToBase64(file, startPage = 1, endPage = 1) {
  try {
    const pdfjsLib = await import('pdfjs-dist/build/pdf');

    // Use local worker first (zero CORS), fallback to CDN
    if (typeof window !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
    });
    
    const pdf = await loadingTask.promise;

  const totalPages = pdf.numPages;
  const validStart = Math.max(1, Math.min(startPage, totalPages));
  const validEnd = Math.max(validStart, Math.min(endPage, totalPages));

  const pageImages = [];

  for (let pageNum = validStart; pageNum <= validEnd; pageNum++) {
    const page = await pdf.getPage(pageNum);
    
    // Scale 1.5 gives clear text OCR readability while maintaining small JPEG footprint
    const viewport = page.getViewport({ scale: 1.5 });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to base64 JPEG at 0.8 quality
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Strip the "data:image/jpeg;base64," header for the Google GenAI inlineData format
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');

    pageImages.push({
      pageNumber: pageNum,
      base64Data,
      mimeType: 'image/jpeg',
    });
  }

    return pageImages;
  } catch (err) {
    console.error('PDF Conversion Error:', err);
    const msg = err && typeof err === 'object' && err.message 
      ? err.message 
      : 'PDF ফাইল প্রসেস করতে সমস্যা হয়েছে। অনুগ্রহ করে পৃষ্ঠা নম্বর সঠিক আছে কি না তা যাচাই করুন।';
    throw new Error(msg);
  }
}
