/**
 * Extracts specified pages of a PDF File as Base64 JPEG strings on the client side.
 * Avoids sending heavy PDF binaries across the wire to stay well within Vercel's payload limits.
 */

let pdfjsPromise = null;

/**
 * Safely loads PDF.js without Webpack bundling conflicts
 */
async function getPdfJsLib() {
  if (typeof window === 'undefined') {
    throw new Error('PDF processing is only supported in the browser.');
  }

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    return window.pdfjsLib;
  }

  if (pdfjsPromise) {
    return pdfjsPromise;
  }

  pdfjsPromise = new Promise((resolve, reject) => {
    // Check if script already exists in document
    const existing = document.querySelector('script[src="/pdf.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else {
          loadFromCdn(resolve, reject);
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.src = '/pdf.min.js';
    script.async = true;

    script.onload = () => {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      } else {
        loadFromCdn(resolve, reject);
      }
    };

    script.onerror = () => {
      loadFromCdn(resolve, reject);
    };

    document.head.appendChild(script);
  });

  return pdfjsPromise;
}

function loadFromCdn(resolve, reject) {
  const cdnScript = document.createElement('script');
  cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  cdnScript.async = true;
  cdnScript.onload = () => {
    if (window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(window.pdfjsLib);
    } else {
      reject(new Error('PDF.js লাইব্রেরি লোড করা সম্ভব হয়নি।'));
    }
  };
  cdnScript.onerror = () => reject(new Error('PDF.js CDN লোড করতে ব্যর্থ হয়েছে।'));
  document.head.appendChild(cdnScript);
}

/**
 * @param {File} file - User-selected PDF file
 * @param {number} startPage - 1-indexed starting page
 * @param {number} endPage - 1-indexed ending page
 * @returns {Promise<Array<{ pageNumber: number, base64Data: string, mimeType: string }>>}
 */
export async function convertPdfPagesToBase64(file, startPage = 1, endPage = 1) {
  try {
    const pdfjsLib = await getPdfJsLib();

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

      // Convert canvas to base64 JPEG at 0.85 quality
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      // Strip the data URL prefix for the Google GenAI inlineData format
      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

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

export async function getPdfPageCount(file) {
  try {
    const pdfjsLib = await getPdfJsLib();
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/',
    });
    const pdf = await loadingTask.promise;
    return pdf.numPages || 1;
  } catch (err) {
    console.warn('Failed to get PDF page count:', err);
    return 1;
  }
}

