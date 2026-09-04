/**
 * IndexedDB-based Persistent Storage for Primary School Textbook PDFs
 * শ্রেণি ও বিষয়ভিত্তিক পাঠ্যবইয়ের পিডিএফ ব্রাউজারে স্থায়ীভাবে সংরক্ষণ করার ব্যবস্থা
 */

const DB_NAME = 'PrimarySchoolExamTextbooksDB';
const DB_VERSION = 1;
const STORE_NAME = 'textbooks';

function getStorageKey(className, subject) {
  return `${className || 'default'}_${subject || 'default'}`;
}

/**
 * Open or initialize the IndexedDB instance
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error || new Error('Failed to open IndexedDB.'));
    };
  });
}

/**
 * Save a textbook PDF file for a specific class and subject
 * @param {string} className
 * @param {string} subject
 * @param {File} file
 */
export async function saveBookPdf(className, subject, file) {
  const db = await openDB();
  const key = getStorageKey(className, subject);
  
  const record = {
    key,
    className,
    subject,
    name: file.name,
    size: file.size,
    type: file.type || 'application/pdf',
    blob: file,
    updatedAt: Date.now()
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(record);

    request.onsuccess = () => resolve(record);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Load the saved textbook PDF for a specific class and subject
 * @param {string} className 
 * @param {string} subject 
 * @returns {Promise<{ file: File, metadata: Object } | null>}
 */
export async function loadBookPdf(className, subject) {
  try {
    const db = await openDB();
    const key = getStorageKey(className, subject);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const record = request.result;
        if (!record || !record.blob) {
          resolve(null);
          return;
        }

        // Convert blob back to File object
        const file = new File([record.blob], record.name, {
          type: record.type || 'application/pdf',
          lastModified: record.updatedAt || Date.now()
        });

        resolve({
          file,
          name: record.name,
          size: record.size,
          updatedAt: record.updatedAt,
          className: record.className,
          subject: record.subject
        });
      };

      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Error loading book PDF from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a saved textbook PDF
 */
export async function deleteBookPdf(className, subject) {
  try {
    const db = await openDB();
    const key = getStorageKey(className, subject);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Error deleting book PDF from IndexedDB:', err);
    return false;
  }
}

/**
 * Get all stored textbooks across all classes and subjects
 */
export async function getAllStoredBooks() {
  try {
    const db = await openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = request.result || [];
        // Map to return metadata without loading heavy blobs in memory
        const list = records.map((r) => ({
          key: r.key,
          className: r.className,
          subject: r.subject,
          name: r.name,
          size: r.size,
          updatedAt: r.updatedAt
        }));
        resolve(list);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('Error retrieving stored books list:', err);
    return [];
  }
}

/**
 * Format bytes to readable string (e.g. 2.4 MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
