import { convertPdfPagesToBase64 } from './pdfProcessor.js';
import { getSourceContent } from './sourceStorage.js';

/**
 * Convert an image File/Blob into a Base64 string for Gemini API
 */
export async function convertImageFileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result || '';
      const base64Data = typeof dataUrl === 'string' && dataUrl.includes(',')
        ? dataUrl.split(',')[1]
        : dataUrl;
      resolve({
        base64Data,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Process multiple user-selected sources into a unified bundle for the question generator API.
 * 
 * @param {Array<{ source: Object, startPage?: number, endPage?: number, selectedChapters?: Array<{ id: string, title: string, startPage: number, endPage: number }> }>} selectedItems
 * @param {(statusMsg: string) => void} [onProgress]
 * @returns {Promise<{ images: Array<{ base64Data: string, mimeType: string, sourceTitle?: string }>, textSources: Array<{ title: string, text: string }> }>}
 */
export async function processSelectedSources(selectedItems, onProgress = () => {}) {
  const images = [];
  const textSources = [];

  for (let i = 0; i < selectedItems.length; i++) {
    const item = selectedItems[i];
    const { source, startPage = 1, endPage = 1, selectedChapters = [] } = item;
    onProgress(`সোর্স প্রসেস করা হচ্ছে (${i + 1}/${selectedItems.length}): "${source.title}"...`);

    const content = await getSourceContent(source);

    if (!content) {
      console.warn(`Source content could not be retrieved for: ${source.title}`);
      continue;
    }

    if (source.type === 'text') {
      textSources.push({
        title: source.title,
        text: typeof content === 'string' ? content : '',
      });
    } else if (source.type === 'image') {
      try {
        const imgObj = await convertImageFileToBase64(content);
        images.push({
          ...imgObj,
          sourceTitle: source.title,
        });
      } catch (err) {
        console.error(`Error converting image source "${source.title}":`, err);
      }
    } else if (source.type === 'pdf') {
      try {
        if (Array.isArray(selectedChapters) && selectedChapters.length > 0) {
          // Process each selected chapter
          for (const chap of selectedChapters) {
            onProgress(`অধ্যায় প্রসেস করা হচ্ছে: "${chap.title}" (${chap.startPage}-${chap.endPage} পৃষ্ঠা)...`);
            const sPage = Math.max(1, parseInt(chap.startPage) || 1);
            const ePage = Math.max(sPage, parseInt(chap.endPage) || sPage);
            const pdfImages = await convertPdfPagesToBase64(content, sPage, ePage);
            pdfImages.forEach((pImg) => {
              images.push({
                ...pImg,
                sourceTitle: `${source.title} • ${chap.title} (পৃষ্ঠা ${pImg.pageNumber})`,
              });
            });
          }
        } else {
          // Process specified page range
          const sPage = Math.max(1, parseInt(startPage) || 1);
          const ePage = Math.max(sPage, parseInt(endPage) || sPage);
          const pdfImages = await convertPdfPagesToBase64(content, sPage, ePage);
          pdfImages.forEach((pImg) => {
            images.push({
              ...pImg,
              sourceTitle: `${source.title} (পৃষ্ঠা ${pImg.pageNumber})`,
            });
          });
        }
      } catch (err) {
        console.error(`Error converting PDF source "${source.title}":`, err);
        throw new Error(`পিডিএফ "${source.title}" প্রসেস করতে সমস্যা: ${err.message}`);
      }
    }
  }

  return { images, textSources };
}

