import JSZip from 'jszip';

export function downloadContent(content: string, filename: string, extension: string) {
  const blob = new Blob([content], {
    type: 'text/plain;charset=utf-8',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.${extension}`;
  link.click();
}

/**
 * Download content and images as a zip file
 *
 * @param content - The main content file
 * @param filename - The filename for the main content
 * @param extension - The file extension for the main content
 * @param images - Array of image objects with blob and filename, and optional path
 */
export async function downloadContentWithImages(
  content: string,
  filename: string,
  extension: string,
  images: Array<{ blob: Blob; filename: string; path?: string }>
) {
  const zip = new JSZip();

  zip.file(`${filename}.${extension}`, content);

  if (images.length > 0) {
    for (const image of images) {
      if (image.path) {
        const normalizedPath = image.path.startsWith('/') ? image.path.slice(1) : image.path;
        zip.file(normalizedPath, image.blob);
      } else {
        const uploadFolder = zip.folder('upload');
        uploadFolder?.file(image.filename, image.blob);
      }
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = window.URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.zip`;
  link.click();

  window.URL.revokeObjectURL(url);
}
