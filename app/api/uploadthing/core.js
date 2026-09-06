import { createUploadthing } from "uploadthing/next";

const f = createUploadthing();

/**
 * FileRouter for UploadThing
 * Defines upload endpoints and permission / validation rules
 */
export const ourFileRouter = {
  // General media uploader for PDFs and Images up to 64MB
  mediaUploader: f({
    pdf: { maxFileSize: "64MB", maxFileCount: 1 },
    image: { maxFileSize: "16MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      // You can add auth / session checks here if needed
      return { uploadedAt: new Date().toISOString() };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload completed successfully:", file.name, file.url);
      return {
        url: file.ufsUrl || file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),

  // Dedicated PDF uploader for large textbooks and question papers (up to 64MB)
  pdfUploader: f({
    pdf: { maxFileSize: "64MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      return { uploadedAt: new Date().toISOString() };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("PDF Upload completed:", file.name, file.url);
      return {
        url: file.ufsUrl || file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),

  // Image uploader for diagrams, question clips, and screenshots
  imageUploader: f({
    image: { maxFileSize: "16MB", maxFileCount: 4 },
  })
    .middleware(async () => {
      return { uploadedAt: new Date().toISOString() };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Image Upload completed:", file.name, file.url);
      return {
        url: file.ufsUrl || file.url,
        key: file.key,
        name: file.name,
        size: file.size,
      };
    }),
};
