/**
 * Cloud-based Textbook PDF Storage
 * Uses unified Supabase & UploadThing Cloud Storage (IndexedDB removed)
 */

import { saveSource, getSources, getSourceContent, deleteSource, formatBytes } from './sourceStorage.js';

export { formatBytes };

/**
 * Save a textbook PDF file for a specific class and subject to Cloud Storage
 */
export async function saveBookPdf(className, subject, file, storageProvider = 'supabase') {
  return await saveSource({
    title: file.name ? file.name.replace(/\.[^/.]+$/, '') : `${className} - ${subject}`,
    className,
    subject,
    type: 'pdf',
    file,
    storageProvider,
  });
}

/**
 * Load the saved textbook PDF for a specific class and subject from Cloud Storage
 */
export async function loadBookPdf(className, subject) {
  const sources = await getSources({ className, subject });
  const pdfSource = sources.find((s) => s.type === 'pdf');
  if (!pdfSource) return null;

  const file = await getSourceContent(pdfSource);
  if (!file) return null;

  return {
    file,
    name: pdfSource.fileName || pdfSource.title,
    size: pdfSource.size,
    updatedAt: pdfSource.updatedAt,
    className: pdfSource.className,
    subject: pdfSource.subject,
    publicUrl: pdfSource.publicUrl,
  };
}

/**
 * Delete a saved textbook PDF
 */
export async function deleteBookPdf(className, subject) {
  const sources = await getSources({ className, subject });
  const pdfSource = sources.find((s) => s.type === 'pdf');
  if (!pdfSource) return false;
  return await deleteSource(pdfSource.id, pdfSource);
}

/**
 * Get all stored textbooks across all classes and subjects
 */
export async function getAllStoredBooks() {
  const sources = await getSources();
  return sources.filter((s) => s.type === 'pdf');
}
