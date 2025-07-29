const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif'];

export function isImageFile(file: File): boolean {
  return (
    SUPPORTED_IMAGE_TYPES.includes(file.type) ||
    SUPPORTED_IMAGE_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext))
  );
}


/**
 * Extract image references from markdown content
 *
 * @param markdownContent - The markdown content to extract image references from
 * @returns An array of image references
 */
export function extractImageReferences(markdownContent: string): string[] {
  const imageRegex = /!\[.*?\]\((.*?)\)/g;
  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(markdownContent)) !== null) {
    const imagePath = match[1];
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
      images.push(imagePath);
    }
  }

  return images;
}

/**
 * Extract image references from HTML content
 *
 * @param htmlContent - The HTML content to extract image references from
 * @returns An array of image references
 */
export function extractHTMLImageReferences(htmlContent: string): string[] {
  const imageRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  const images: string[] = [];
  let match;

  while ((match = imageRegex.exec(htmlContent)) !== null) {
    const imagePath = match[1];
    if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://') && !imagePath.startsWith('data:')) {
      images.push(imagePath);
    }
  }

  return images;
}

/**
 * Extract all image references from content based on content type
 *
 * @param content - The content to extract images from
 * @param contentType - The type of content ('markdown' or 'html')
 * @returns An array of image references
 */
export function extractImageReferencesFromContent(content: string, contentType: string): string[] {
  if (contentType.toLowerCase() === 'html') {
    return extractHTMLImageReferences(content);
  } else if (contentType.toLowerCase() === 'markdown') {
    return extractImageReferences(content);
  }
  return [];
}

/**
 * Download image from URL and return as blob
 *
 * @param imageUrl - The URL of the image to download
 * @returns Promise<Blob> - The image blob
 */
export async function downloadImageAsBlob(imageUrl: string): Promise<Blob> {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.statusText}`);
  }
  return response.blob();
}

/**
 * Get file extension from image URL
 *
 * @param imageUrl - The image URL
 * @returns The file extension (e.g., 'png', 'jpg')
 */
export function getImageFileExtension(imageUrl: string): string {
  const url = new URL(imageUrl, window.location.origin);
  const pathname = url.pathname;
  const extension = pathname.split('.').pop()?.toLowerCase();

  if (extension && SUPPORTED_IMAGE_EXTENSIONS.some(ext => ext.slice(1) === extension)) {
    return extension;
  }

  return 'png';
}
