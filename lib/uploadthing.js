import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";

/**
 * Pre-configured React UI components and helpers for UploadThing
 */
export const UploadButton = generateUploadButton();
export const UploadDropzone = generateUploadDropzone();
export const { useUploadThing, uploadFiles } = generateReactHelpers();

/**
 * Programmatic Direct Client Upload using UploadThing
 * Can be used anywhere (forms, handlers, admin panels) to upload a file directly.
 * 
 * @param {File} file - The file object to upload
 * @param {'mediaUploader'|'pdfUploader'|'imageUploader'} [endpoint='mediaUploader'] - UploadThing route endpoint
 * @param {function(number):void} [onProgress] - Progress callback (0-100)
 * @returns {Promise<{ url: string, key: string, name: string, size: number }>}
 */
export async function uploadDirectToUploadThing(
  file,
  endpoint = "mediaUploader",
  onProgress = null
) {
  if (!file) throw new Error("No file provided for upload.");

  try {
    const response = await uploadFiles(endpoint, {
      files: [file],
      onUploadProgress: ({ progress }) => {
        if (onProgress && typeof onProgress === "function") {
          onProgress(Math.round(progress));
        }
      },
    });

    if (!response || response.length === 0) {
      throw new Error("Upload failed: No response received from UploadThing.");
    }

    const uploadedFile = response[0];
    const fileUrl = uploadedFile.ufsUrl || uploadedFile.url;

    return {
      url: fileUrl,
      key: uploadedFile.key,
      name: uploadedFile.name || file.name,
      size: uploadedFile.size || file.size,
    };
  } catch (err) {
    console.error("UploadThing direct upload error:", err);
    let detailedMsg = err.message || "UploadThing upload failed";
    if (err.cause) {
      const causeStr = typeof err.cause === 'string' ? err.cause : JSON.stringify(err.cause);
      detailedMsg = `${detailedMsg} - ${causeStr}`;
    }
    if (err.message && err.message.includes("FileSizeMismatch")) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      detailedMsg = `ফাইল সাইজ সীমা অতিক্রম করেছে (${sizeInMb}MB)। আপলোডথিং-এ নির্ধারিত সীমার চেয়ে ফাইলটি বড়।`;
    }
    throw new Error(detailedMsg);
  }
}

