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
