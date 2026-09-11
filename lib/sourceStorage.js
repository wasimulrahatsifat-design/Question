/**
 * Cloud Storage Manager for Exam Sources & Textbooks
 * Fully Cloud-based architecture:
 * - PDF/Image Hosting: Supabase Storage Bucket & UploadThing CDN
 * - Global Database: Supabase PostgreSQL (exam_sources / books tables)
 * - Zero Local Storage (IndexedDB completely removed)
 */

import { getSupabase } from './supabaseClient.js';
import { uploadDirectToUploadThing, uploadMultipleToUploadThing } from './uploadthing.js';

const STORAGE_BUCKET = 'exam_sources';

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
 * Save a new book or source (PDF, Image / Multiple Images Folder, or Text Note)
 * Conditional routing:
 * - If storageProvider === 'supabase': Uploads to Supabase Storage Bucket
 * - If storageProvider === 'uploadthing': Uploads directly to UploadThing CDN
 * - Unified Global Save: Inserts metadata (title, file_url, provider, etc.) to Supabase PostgreSQL database
 * 
 * @param {Object} params
 * @param {string} params.title - Custom name for the source/book/folder
 * @param {string} params.className - Class name e.g. "পঞ্চম"
 * @param {string} params.subject - Subject name e.g. "বিজ্ঞান"
 * @param {'pdf'|'image'|'text'} params.type - Source type
 * @param {File|Blob} [params.file] - Single file
 * @param {Array<File>} [params.files] - Multiple files for image folder
 * @param {string} [params.textContent] - Raw text if type is text
 * @param {number} [params.pageCount] - Total pages/images
 * @param {Array<{ id: string, title: string, startPage: number, endPage: number }>} [params.chapters] - Chapter definitions
 * @param {'supabase'|'uploadthing'} [params.storageProvider='supabase'] - Cloud storage selection
 * @param {function(number):void} [params.onProgress] - Optional upload progress callback (0-100)
 * @returns {Promise<Object>} The saved book/source record from Supabase
 */
export async function saveSource({
  title,
  className,
  subject,
  type,
  file = null,
  files = [],
  textContent = '',
  pageCount = 1,
  chapters = [],
  storageProvider = 'supabase',
  onProgress = null,
}) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase ক্লাউড কনফিগারেশন পাওয়া যায়নি। দয়া করে অ্যাডমিন প্যানেলে Supabase URL ও Anon Key প্রদান করুন।');
  }

  const id = generateSourceId();
  const timestamp = Date.now();
  const inputFiles = Array.isArray(files) && files.length > 0 ? files : (file ? [file] : []);
  const isMultiImage = type === 'image' && inputFiles.length > 0;
  
  const safeTitle = (title || (inputFiles[0] ? inputFiles[0].name : 'নামহীন সোর্স')).trim();
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  let sizeBytes = inputFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  if (sizeBytes === 0 && textContent) sizeBytes = new Blob([textContent]).size;
  
  const chosenProvider = (storageProvider === 'uploadthing' ? 'uploadthing' : 'supabase');

  let publicUrl = null;
  let filePath = null;
  let savedImages = [];

  // 1. Multi-Image Folder Upload Routing
  if (isMultiImage && inputFiles.length > 1) {
    if (chosenProvider === 'uploadthing') {
      // Route A1: Batch Upload to UploadThing
      const utResults = await uploadMultipleToUploadThing(inputFiles, 'imageUploader', onProgress);
      savedImages = utResults.map((res, idx) => ({
        id: `${id}_img_${idx + 1}`,
        pageNumber: idx + 1,
        title: inputFiles[idx]?.name || `পৃষ্ঠা ${idx + 1}`,
        name: inputFiles[idx]?.name || `image_${idx + 1}.jpg`,
        url: res.url,
        key: res.key,
        size: res.size || inputFiles[idx]?.size || 0,
      }));
      publicUrl = savedImages[0]?.url || null;
      filePath = savedImages[0]?.key || null;
    } else {
      // Route B1: Upload each image to Supabase Storage
      const total = inputFiles.length;
      for (let i = 0; i < total; i++) {
        const currentFile = inputFiles[i];
        if (onProgress) onProgress(Math.round(((i + 0.2) / total) * 80));
        
        const rawExt = currentFile.name ? currentFile.name.split('.').pop() : 'jpg';
        const safeExt = (rawExt || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const storagePath = `sources/${id}/img_${i + 1}_${Date.now()}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, currentFile, {
            upsert: true,
            contentType: currentFile.type || 'image/jpeg',
          });

        if (uploadError) {
          throw new Error(`ছবি (${i + 1}/${total}) আপলোড ব্যর্থ: ${uploadError.message}`);
        }

        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        const imgUrl = urlData?.publicUrl || null;

        savedImages.push({
          id: `${id}_img_${i + 1}`,
          pageNumber: i + 1,
          title: currentFile.name || `পৃষ্ঠা ${i + 1}`,
          name: currentFile.name || `image_${i + 1}.${safeExt}`,
          url: imgUrl,
          path: storagePath,
          size: currentFile.size || 0,
        });

        if (onProgress) onProgress(Math.round(((i + 1) / total) * 80));
      }
      publicUrl = savedImages[0]?.url || null;
      filePath = savedImages[0]?.path || null;
    }
  } else if (file || (inputFiles.length === 1)) {
    const singleFile = file || inputFiles[0];
    if (type === 'pdf' || type === 'image') {
      if (chosenProvider === 'uploadthing') {
        const endpoint = type === 'pdf' ? 'pdfUploader' : 'imageUploader';
        const utRes = await uploadDirectToUploadThing(singleFile, endpoint, onProgress);
        if (!utRes?.url) {
          throw new Error('UploadThing ক্লাউডে ফাইল আপলোড ব্যর্থ হয়েছে।');
        }
        publicUrl = utRes.url;
        filePath = utRes.key;
        if (type === 'image') {
          savedImages = [{
            id: `${id}_img_1`,
            pageNumber: 1,
            title: singleFile.name,
            name: singleFile.name,
            url: publicUrl,
            key: filePath,
            size: singleFile.size,
          }];
        }
      } else {
        if (onProgress && typeof onProgress === 'function') onProgress(10);
        const rawExt = singleFile.name ? singleFile.name.split('.').pop() : '';
        const safeExt = (rawExt || (type === 'pdf' ? 'pdf' : 'jpg')).toLowerCase().replace(/[^a-z0-9]/g, '') || (type === 'pdf' ? 'pdf' : 'jpg');
        const storagePath = `sources/${id}.${safeExt}`;

        const { error: uploadError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, singleFile, {
            upsert: true,
            contentType: singleFile.type || (type === 'pdf' ? 'application/pdf' : 'image/jpeg'),
          });

        if (uploadError) {
          throw new Error(`Supabase Storage বাকেটে আপলোড ব্যর্থ: ${uploadError.message}`);
        }

        if (onProgress && typeof onProgress === 'function') onProgress(80);

        filePath = storagePath;
        const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
        publicUrl = urlData?.publicUrl || null;
        if (type === 'image') {
          savedImages = [{
            id: `${id}_img_1`,
            pageNumber: 1,
            title: singleFile.name,
            name: singleFile.name,
            url: publicUrl,
            path: storagePath,
            size: singleFile.size,
          }];
        }
      }
    }
  }

  if (onProgress && typeof onProgress === 'function') onProgress(90);

  // 2. Unified Global Database Save (Supabase PostgreSQL)
  // Store image list in chapters (JSONB) or as JSON string in text_content if needed
  const finalChapters = (type === 'image' && savedImages.length > 0) ? savedImages : safeChapters;
  const calculatedPageCount = (type === 'image' && savedImages.length > 0) ? savedImages.length : (pageCount || 1);

  const dbPayload = {
    id,
    title: safeTitle,
    file_url: publicUrl,
    public_url: publicUrl,
    provider: chosenProvider,
    class_name: className,
    subject,
    type,
    file_name: inputFiles[0] ? inputFiles[0].name : (file ? file.name : null),
    file_path: filePath,
    text_content: type === 'text' ? textContent : (type === 'image' && savedImages.length > 0 ? JSON.stringify(savedImages) : null),
    page_count: calculatedPageCount,
    size_bytes: sizeBytes,
    chapters: finalChapters,
    created_at: new Date(timestamp).toISOString(),
    updated_at: new Date(timestamp).toISOString(),
  };

  let { data, error: dbError } = await supabase
    .from('exam_sources')
    .insert(dbPayload)
    .select()
    .single();

  // Retry with backwards-compatible payload if optional columns differ
  if (dbError) {
    console.warn('Supabase initial insert error, retrying compatibility mode:', dbError.message);
    const fallbackPayload = { ...dbPayload };
    
    if (dbError.message?.includes('chapters') || dbError.code === '42703') {
      delete fallbackPayload.chapters;
    }
    if (dbError.message?.includes('file_url') || dbError.code === '42703') {
      delete fallbackPayload.file_url;
    }
    if (dbError.message?.includes('provider') || dbError.code === '42703') {
      delete fallbackPayload.provider;
    }

    const retryRes = await supabase.from('exam_sources').insert(fallbackPayload).select().single();
    if (retryRes.error) {
      throw new Error(`Supabase ডেটাবেজে মেটাডাটা সংরক্ষণ ব্যর্থ: ${retryRes.error.message}`);
    }
    data = retryRes.data;
  }

  // Also sync to global 'books' table for interoperability
  try {
    await supabase.from('books').upsert({
      id,
      title: safeTitle,
      file_url: publicUrl || '',
      provider: chosenProvider,
      class_name: className,
      subject,
      created_at: new Date(timestamp).toISOString(),
    });
  } catch (err) {
    // Non-critical if books table hasn't been created
  }

  if (onProgress && typeof onProgress === 'function') onProgress(100);

  return {
    id,
    title: safeTitle,
    className,
    subject,
    type,
    fileName: file ? file.name : null,
    filePath,
    publicUrl,
    fileUrl: publicUrl,
    textContent: type === 'text' ? textContent : null,
    pageCount: pageCount || 1,
    size: sizeBytes,
    chapters: safeChapters,
    provider: chosenProvider,
    storageType: chosenProvider,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Fetch books/sources exclusively from Supabase Global Database
 * All users across the internet see the same library of books.
 * 
 * @param {Object} [filter]
 * @param {string} [filter.className]
 * @param {string} [filter.subject]
 * @returns {Promise<Array<Object>>}
 */
export async function getSources({ className = '', subject = '' } = {}) {
  const supabase = getSupabase();
  if (!supabase) {
    return [];
  }

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

    if (error) {
      console.warn('Supabase getSources query error:', error.message);
      return [];
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data.map((item) => {
      let chaps = [];
      if (Array.isArray(item.chapters)) {
        chaps = item.chapters;
      } else if (typeof item.chapters === 'string') {
        try { chaps = JSON.parse(item.chapters); } catch (e) { chaps = []; }
      }

      let images = [];
      if (item.type === 'image') {
        if (Array.isArray(chaps) && chaps.length > 0 && chaps[0]?.url) {
          images = chaps;
        } else if (typeof item.text_content === 'string' && item.text_content.startsWith('[')) {
          try { images = JSON.parse(item.text_content); } catch (e) { images = []; }
        }
        if (images.length === 0 && (item.file_url || item.public_url)) {
          images = [{
            id: `${item.id}_img_1`,
            pageNumber: 1,
            title: item.file_name || item.title,
            name: item.file_name || item.title,
            url: item.file_url || item.public_url,
            size: item.size_bytes || 0,
          }];
        }
      }

      const fileUrl = item.file_url || item.public_url || (images[0]?.url) || null;
      const provider = item.provider || (item.public_url?.includes('uploadthing') ? 'uploadthing' : 'supabase');
      const finalPageCount = item.type === 'image' && images.length > 0 ? images.length : (item.page_count || 1);

      return {
        id: item.id,
        title: item.title,
        className: item.class_name,
        subject: item.subject,
        type: item.type,
        fileName: item.file_name,
        filePath: item.file_path,
        publicUrl: fileUrl,
        fileUrl: fileUrl,
        textContent: item.text_content,
        pageCount: finalPageCount,
        size: item.size_bytes || 0,
        chapters: item.type === 'image' ? [] : chaps,
        images: images,
        isFolder: item.type === 'image' && images.length > 1,
        provider,
        storageType: provider,
        createdAt: item.created_at ? new Date(item.created_at).getTime() : Date.now(),
        updatedAt: item.updated_at ? new Date(item.updated_at).getTime() : Date.now(),
      };
    });
  } catch (err) {
    console.error('Error fetching global sources from Supabase:', err);
    return [];
  }
}

/**
 * Fetch full file or blob content of a source from cloud URL or Supabase storage
 * @param {Object} source - Metadata object of the source
 * @returns {Promise<File|Blob|string|null>}
 */
export async function getSourceContent(source) {
  if (!source) return null;

  if (source.type === 'text') {
    return source.textContent || '';
  }

  const supabase = getSupabase();
  const targetUrl = source.fileUrl || source.publicUrl;

  // 1. Fetch via Public Cloud URL (UploadThing CDN or Supabase Public URL)
  if (targetUrl) {
    try {
      const res = await fetch(targetUrl);
      if (res.ok) {
        const blob = await res.blob();
        return new File([blob], source.fileName || `${source.title}.${source.type === 'pdf' ? 'pdf' : 'jpg'}`, {
          type: source.type === 'pdf' ? 'application/pdf' : blob.type || 'image/jpeg',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch from public URL, trying Supabase storage download:', err);
    }
  }

  // 2. Direct Supabase Storage download if bucket path is provided
  if (supabase && source.filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(source.filePath);

      if (!error && data) {
        return new File([data], source.fileName || `${source.title}.${source.type === 'pdf' ? 'pdf' : 'jpg'}`, {
          type: source.type === 'pdf' ? 'application/pdf' : data.type || 'image/jpeg',
        });
      }
    } catch (err) {
      console.error('Failed to download source from Supabase storage:', err);
    }
  }

  return null;
}

/**
 * Update a source/book title globally in Supabase
 */
export async function updateSourceTitle(id, newTitle) {
  const safeTitle = (newTitle || '').trim();
  if (!safeTitle) return false;

  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('exam_sources')
      .update({ title: safeTitle, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    // Also update books table if present
    try {
      await supabase.from('books').update({ title: safeTitle }).eq('id', id);
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('Supabase updateSourceTitle failed:', err);
    return false;
  }
}

/**
 * Update a source/book chapters list globally in Supabase
 * @param {string} id - Source ID
 * @param {Array<{ id: string, title: string, startPage: number, endPage: number }>} chapters
 */
export async function updateSourceChapters(id, chapters) {
  const safeChapters = Array.isArray(chapters) ? chapters : [];
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('exam_sources')
      .update({ chapters: safeChapters, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Supabase updateSourceChapters failed:', err);
    return false;
  }
}

/**
 * Delete a source/book globally by ID
 */
export async function deleteSource(id, sourceInfo = null) {
  const supabase = getSupabase();
  if (!supabase) return false;

  try {
    // If hosted in Supabase Storage and file path is provided, delete file from bucket
    if (sourceInfo?.provider === 'supabase' && sourceInfo?.filePath) {
      try {
        await supabase.storage.from(STORAGE_BUCKET).remove([sourceInfo.filePath]);
      } catch (stErr) {
        console.warn('Storage file deletion note:', stErr);
      }
    }

    // Delete record from database
    await supabase.from('exam_sources').delete().eq('id', id);

    try {
      await supabase.from('books').delete().eq('id', id);
    } catch (_) {}

    return true;
  } catch (err) {
    console.error('Supabase deleteSource failed:', err);
    return false;
  }
}
