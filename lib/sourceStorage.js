/**
 * Hybrid Storage for Exam Sources (PDFs, Images, and Text Notes)
 * Supports Supabase Cloud Storage (Free Tier) & Local IndexedDB with seamless merging
 */

import { getSupabase } from './supabaseClient.js';
import { uploadDirectToUploadThing } from './uploadthing.js';

const DB_NAME = 'PrimarySchoolExamSourcesDB';
const DB_VERSION = 1;
const STORE_NAME = 'sources';
const STORAGE_BUCKET = 'exam_sources';

/**
 * Open local IndexedDB instance
 */
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('class_subject', ['className', 'subject'], { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Generate a unique ID
 */
export function generateSourceId() {
  return 'src_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Format bytes to human readable format (e.g. 2.4 MB)
 */
export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Save a new source (PDF, Image, or Text Note)
 * Supports UploadThing Cloud Storage, Supabase, and IndexedDB
 * 
 * @param {Object} params
 * @param {string} params.title - Custom name for the source
 * @param {string} params.className - Class name e.g. "পঞ্চম"
 * @param {string} params.subject - Subject name e.g. "বিজ্ঞান"
 * @param {'pdf'|'image'|'text'} params.type - Source type
 * @param {File|Blob} [params.file] - File if type is pdf or image
 * @param {string} [params.textContent] - Raw text if type is text
 * @param {number} [params.pageCount] - Total pages if PDF
 * @param {Array<{ id: string, title: string, startPage: number, endPage: number }>} [params.chapters] - Chapter definitions
 * @param {function(number):void} [params.onProgress] - Optional upload progress callback (0-100)
 */
export async function saveSource({
  title,
  className,
  subject,
  type,
  file = null,
  textContent = '',
  pageCount = 1,
  chapters = [],
  onProgress = null,
}) {
  const id = generateSourceId();
  const timestamp = Date.now();
  const safeTitle = (title || (file ? file.name : 'নামহীন সোর্স')).trim();
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const sizeBytes = file ? file.size : new Blob([textContent]).size;

  let publicUrl = null;
  let filePath = null;
  let uploadThingSuccess = false;
  let uploadThingErrorMsg = null;

  // 1. Try UploadThing Cloud Upload for PDF / Image files
  if (file && (type === 'pdf' || type === 'image')) {
    try {
      const endpoint = type === 'pdf' ? 'pdfUploader' : 'imageUploader';
      const utRes = await uploadDirectToUploadThing(file, endpoint, onProgress);
      if (utRes?.url) {
        publicUrl = utRes.url;
        filePath = utRes.key;
        uploadThingSuccess = true;
      }
    } catch (utErr) {
      console.warn('UploadThing upload note:', utErr.message);
      uploadThingErrorMsg = utErr.message;
    }
  }

  // 2. Try Supabase Cloud sync if configured
  const supabase = getSupabase();
  let supabaseSuccess = false;

  if (supabase) {
    try {
      // If UploadThing wasn't used or failed, try uploading file to Supabase storage
      if (!publicUrl && file && (type === 'pdf' || type === 'image')) {
        const rawExt = file.name ? file.name.split('.').pop() : '';
        const safeExt = (rawExt || (type === 'pdf' ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '') || (type === 'pdf' ? 'pdf' : 'jpg');
        const storagePath = `sources/${id}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, file, {
            upsert: true,
            contentType: file.type || (type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          });

        if (!uploadError) {
          filePath = storagePath;
          const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
          publicUrl = urlData?.publicUrl || null;
        }
      }

      // Save metadata to Supabase DB
      const dbPayload = {
        id,
        title: safeTitle,
        class_name: className,
        subject,
        type,
        file_name: file ? file.name : null,
        file_path: filePath,
        public_url: publicUrl,
        text_content: type === 'text' ? textContent : null,
        page_count: pageCount || 1,
        size_bytes: sizeBytes,
        chapters: safeChapters,
        created_at: new Date(timestamp).toISOString(),
        updated_at: new Date(timestamp).toISOString(),
      };

      let { error: dbError } = await supabase.from('exam_sources').insert(dbPayload);

      // If DB error is related to missing 'chapters' column in legacy tables, retry without 'chapters'
      if (dbError && (dbError.message?.includes('chapters') || dbError.details?.includes('chapters') || dbError.code === '42703')) {
        const legacyPayload = { ...dbPayload };
        delete legacyPayload.chapters;
        const retryResult = await supabase.from('exam_sources').insert(legacyPayload);
        dbError = retryResult.error;
      }

      if (!dbError) {
        supabaseSuccess = true;
      }
    } catch (supabaseErr) {
      console.warn('Supabase sync note:', supabaseErr.message);
    }
  }

  // 3. Always save a local copy to IndexedDB for offline reliability & instant UI load
  const storageType = uploadThingSuccess ? 'uploadthing' : (supabaseSuccess ? 'supabase' : 'indexeddb');

  const localRecord = {
    id,
    title: safeTitle,
    className,
    subject,
    type,
    fileName: file ? file.name : null,
    blob: file || null,
    filePath,
    publicUrl,
    textContent: type === 'text' ? textContent : null,
    pageCount: pageCount || 1,
    size: sizeBytes,
    mimeType: file ? file.type : (type === 'pdf' ? 'application/pdf' : 'text/plain'),
    chapters: safeChapters,
    storageType,
    uploadThingError: uploadThingErrorMsg,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  try {
    const db = await openIndexedDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(localRecord);
      request.onsuccess = () => resolve(localRecord);
      request.onerror = (e) => reject(e.target.error);
    });

    return localRecord;
  } catch (localErr) {
    console.error('IndexedDB save failed:', localErr);
    return localRecord;
  }
}

/**
 * Get all sources with hybrid merging (Supabase Cloud + Local IndexedDB)
 */
export async function getSources({ className = '', subject = '' } = {}) {
  const sourcesMap = new Map();
  const supabase = getSupabase();

  // 1. Fetch from Supabase Cloud if configured
  if (supabase) {
    try {
      let query = supabase
        .from('exam_sources')
        .select('*')
        .order('created_at', { ascending: false });

      if (className && className !== 'সকল') {
        query = query.eq('class_name', className);
      }
      if (subject && subject !== 'সকল') {
        query = query.eq('subject', subject);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        data.forEach((item) => {
          let chaps = [];
          if (Array.isArray(item.chapters)) {
            chaps = item.chapters;
          } else if (typeof item.chapters === 'string') {
            try { chaps = JSON.parse(item.chapters); } catch (e) { chaps = []; }
          }

          sourcesMap.set(item.id, {
            id: item.id,
            title: item.title,
            className: item.class_name,
            subject: item.subject,
            type: item.type,
            fileName: item.file_name,
            filePath: item.file_path,
            publicUrl: item.public_url,
            textContent: item.text_content,
            pageCount: item.page_count || 1,
            size: item.size_bytes || 0,
            chapters: chaps,
            storageType: 'supabase',
            createdAt: new Date(item.created_at).getTime(),
            updatedAt: new Date(item.updated_at).getTime(),
          });
        });
      } else if (error) {
        console.warn('Supabase getSources query error:', error.message);
      }
    } catch (err) {
      console.warn('Supabase fetch failed, will load from local storage:', err);
    }
  }

  // 2. Load from Local IndexedDB and merge
  try {
    const db = await openIndexedDB();
    const localList = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });

    localList.forEach((r) => {
      // Filter if specific className/subject was requested
      if (className && className !== 'সকল' && r.className !== className) return;
      if (subject && subject !== 'সকল' && r.subject !== subject) return;

      const existing = sourcesMap.get(r.id);
      if (!existing) {
        sourcesMap.set(r.id, {
          id: r.id,
          title: r.title,
          className: r.className,
          subject: r.subject,
          type: r.type,
          fileName: r.fileName,
          filePath: r.filePath,
          publicUrl: r.publicUrl,
          textContent: r.textContent,
          pageCount: r.pageCount || 1,
          size: r.size || 0,
          mimeType: r.mimeType,
          chapters: Array.isArray(r.chapters) ? r.chapters : [],
          storageType: r.storageType || 'indexeddb',
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        });
      } else {
        // If local has chapters metadata that remote didn't have, merge
        if ((!existing.chapters || existing.chapters.length === 0) && Array.isArray(r.chapters) && r.chapters.length > 0) {
          existing.chapters = r.chapters;
        }
      }
    });
  } catch (err) {
    console.error('Error fetching local sources:', err);
  }

  const allSources = Array.from(sourcesMap.values());
  // Sort latest first
  allSources.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return allSources;
}

/**
 * Fetch full file or blob content of a source
 * @param {Object} source - Metadata object of the source
 * @returns {Promise<File|Blob|string|null>}
 */
export async function getSourceContent(source) {
  if (!source) return null;

  if (source.type === 'text') {
    if (source.textContent) return source.textContent;
  }

  const supabase = getSupabase();

  // First try Supabase Cloud if available
  if (source.storageType === 'supabase' && supabase) {
    try {
      if (source.filePath) {
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .download(source.filePath);

        if (!error && data) {
          return new File([data], source.fileName || `${source.title}.${source.type === 'pdf' ? 'pdf' : 'jpg'}`, {
            type: source.type === 'pdf' ? 'application/pdf' : data.type || 'image/jpeg',
          });
        }
      }

      if (source.publicUrl) {
        const res = await fetch(source.publicUrl);
        if (res.ok) {
          const blob = await res.blob();
          return new File([blob], source.fileName || `${source.title}.${source.type === 'pdf' ? 'pdf' : 'jpg'}`, {
            type: source.type === 'pdf' ? 'application/pdf' : blob.type || 'image/jpeg',
          });
        }
      }
    } catch (err) {
      console.warn('Failed to download source from Supabase, checking local storage:', err);
    }
  }

  // Load from IndexedDB (fallback / local mode)
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(source.id);

      request.onsuccess = () => {
        const record = request.result;
        if (!record) {
          resolve(null);
          return;
        }

        if (record.type === 'text') {
          resolve(record.textContent || '');
          return;
        }

        if (record.blob) {
          const file = new File([record.blob], record.fileName || record.title, {
            type: record.mimeType || (record.type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          });
          resolve(file);
          return;
        }

        resolve(null);
      };

      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error fetching source content from IndexedDB:', err);
    return null;
  }
}

/**
 * Update a source's title
 */
export async function updateSourceTitle(id, newTitle) {
  const safeTitle = (newTitle || '').trim();
  if (!safeTitle) return false;

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('exam_sources')
        .update({ title: safeTitle, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase update failed:', err);
    }
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.title = safeTitle;
          record.updatedAt = Date.now();
          store.put(record);
        }
        resolve(true);
      };

      getReq.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error updating source title locally:', err);
    return false;
  }
}

/**
 * Update a source's chapters list
 * @param {string} id - Source ID
 * @param {Array<{ id: string, title: string, startPage: number, endPage: number }>} chapters
 */
export async function updateSourceChapters(id, chapters) {
  const safeChapters = Array.isArray(chapters) ? chapters : [];

  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase
        .from('exam_sources')
        .update({ chapters: safeChapters, updated_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('Supabase chapters update failed:', err);
    }
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);

      getReq.onsuccess = () => {
        const record = getReq.result;
        if (record) {
          record.chapters = safeChapters;
          record.updatedAt = Date.now();
          store.put(record);
        }
        resolve(true);
      };

      getReq.onerror = () => resolve(false);
    });
  } catch (err) {
    console.error('Error updating chapters locally:', err);
    return false;
  }
}

/**
 * Delete a source by ID
 */
export async function deleteSource(id, sourceInfo = null) {
  const supabase = getSupabase();

  if (supabase) {
    try {
      if (sourceInfo && sourceInfo.filePath) {
        await supabase.storage.from(STORAGE_BUCKET).remove([sourceInfo.filePath]);
      }
      await supabase.from('exam_sources').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete failed:', err);
    }
  }

  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error('Error deleting local source:', err);
    return false;
  }
}

