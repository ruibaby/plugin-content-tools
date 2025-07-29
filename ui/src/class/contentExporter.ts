import { downloadContent, downloadContentWithImages } from '@/utils';
import { processHTMLLinks } from '@/utils/content';
import { downloadImageAsBlob, extractImageReferencesFromContent } from '@/utils/image';
import { consoleApiClient, type Post } from '@halo-dev/api-client';
import { Toast } from '@halo-dev/components';
import { ConverterFactory } from './converterFactory';

export type ExportType = 'markdown' | 'html' | 'pdf';
export type ImageExportMode = 'file' | 'inline';

const ExtensionMap: Record<ExportType, string> = {
  markdown: 'md',
  html: 'html',
  pdf: 'pdf',
};

export class ContentExporter {
  static async export(
    post: Post,
    exportType: ExportType,
    includeImages: boolean,
    imageExportMode: ImageExportMode
  ): Promise<void> {
    if (exportType === 'pdf') {
      await this.exportToPdf(post);
      return;
    }

    const { data: content } = await consoleApiClient.content.post.fetchPostHeadContent({
      name: post.metadata.name,
    });

    let exportContent: string;

    if (exportType === 'html') {
      exportContent = content.content || '';
    } else if (exportType === 'markdown') {
      if (content.rawType?.toLowerCase() === 'html') {
        const converter = ConverterFactory.getConverter('html', 'markdown');
        exportContent = converter.convert(post, content);
      } else {
        exportContent = content.raw || '';
      }
    } else {
      throw new Error('Unsupported export type');
    }

    const fileExtension = ExtensionMap[exportType];

    if (!includeImages) {
      downloadContent(exportContent, post.spec.title, ExtensionMap[exportType]);
      return;
    }

    if (imageExportMode === 'file') {
      await this.exportWithImages(post, exportContent, exportType, fileExtension);
      return;
    }

    if (imageExportMode === 'inline') {
      await this.exportWithInlineImages(post, exportContent, exportType, fileExtension);
      return;
    }
  }

  private static async exportWithInlineImages(
    post: Post,
    content: string,
    contentType: ExportType,
    fileExtension: string
  ): Promise<void> {
    const imageReferences = extractImageReferencesFromContent(content, contentType);

    if (imageReferences.length === 0) {
      downloadContent(content, post.spec.title, fileExtension);
      return;
    }

    let processedContent = content;

    for (const imagePath of imageReferences) {
      try {
        let absoluteImageUrl: string;

        if (imagePath.startsWith('/')) {
          absoluteImageUrl = `${location.origin}${imagePath}`;
        } else if (!imagePath.startsWith('http')) {
          absoluteImageUrl = `${location.origin}/${imagePath}`;
        } else {
          absoluteImageUrl = imagePath;
        }

        const imageBlob = await downloadImageAsBlob(absoluteImageUrl);
        const base64Data = await this.blobToBase64(imageBlob);
        const mimeType = imageBlob.type;
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        if (contentType === 'markdown') {
          const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedImagePath}\\)`, 'g');
          processedContent = processedContent.replace(regex, `![$1](${dataUrl})`);
        } else if (contentType === 'html') {
          const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`src=["']${escapedImagePath}["']`, 'g');
          processedContent = processedContent.replace(regex, `src="${dataUrl}"`);
        }
      } catch (error) {
        console.warn(`Failed to inline image ${imagePath}:`, error);
      }
    }

    downloadContent(processedContent, post.spec.title, fileExtension);
  }

  private static blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        } else {
          reject(new Error('Failed to convert blob to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  static async exportToPdf(post: Post): Promise<void> {
    try {
      const { data: content } = await consoleApiClient.content.post.fetchPostHeadContent({
        name: post.metadata.name,
      });

      let htmlContent = content.rawType?.toLowerCase() === 'html' ? content.content : content.raw;

      if (content.rawType?.toLowerCase() === 'markdown') {
        const converter = ConverterFactory.getConverter('markdown', 'html');
        htmlContent = converter.convert(post, content);
      }

      htmlContent = processHTMLLinks(htmlContent || '');

      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.top = '-9999px';
      document.body.appendChild(iframe);

      iframe.contentDocument?.write(`
        <html>
          <head>
            <title>${post.spec.title}</title>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; padding: 20px; }
                h1 { page-break-before: always; }
              }
            </style>
          </head>
          <body>
            <h1>${post.spec.title}</h1>
            ${htmlContent}
          </body>
        </html>
      `);

      iframe.contentDocument?.close();

      await this.waitForImages(iframe);

      iframe.contentWindow?.print();

      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    } catch (error) {
      console.error('Failed to generate pdf file: ', error);
      Toast.error('PDF 导出失败');
    }
  }

  private static async exportWithImages(
    post: Post,
    content: string,
    contentType: ExportType,
    fileExtension: string
  ): Promise<void> {
    const imageReferences = extractImageReferencesFromContent(content, contentType);

    if (imageReferences.length === 0) {
      downloadContent(content, post.spec.title, fileExtension);
      return;
    }

    const images: Array<{ blob: Blob; filename: string; path?: string }> = [];

    for (const imagePath of imageReferences) {
      try {
        let absoluteImageUrl: string;

        if (imagePath.startsWith('/')) {
          absoluteImageUrl = `${location.origin}${imagePath}`;
        } else if (!imagePath.startsWith('http')) {
          absoluteImageUrl = `${location.origin}/${imagePath}`;
        } else {
          absoluteImageUrl = imagePath;
        }

        const imageBlob = await downloadImageAsBlob(absoluteImageUrl);

        const encodedFileName = imagePath.split('/').pop() || `image_${images.length + 1}.png`;
        const fileName = decodeURIComponent(encodedFileName);

        const decodedPath = decodeURIComponent(imagePath);

        images.push({
          blob: imageBlob,
          filename: fileName,
          path: decodedPath,
        });
      } catch (error) {
        console.warn(`Failed to download image ${imagePath}:`, error);
      }
    }

    await downloadContentWithImages(content, post.spec.title, fileExtension, images);
  }

  private static waitForImages(iframe: HTMLIFrameElement): Promise<void> {
    return new Promise((resolve) => {
      const images = iframe.contentDocument?.images;
      if (!images || images.length === 0) {
        resolve();
        return;
      }

      let loadedCount = 0;
      const totalCount = images.length;

      const checkComplete = () => {
        if (loadedCount === totalCount) {
          resolve();
        }
      };

      const placeholderImage =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

      Array.from(images).forEach((img) => {
        if (img.complete) {
          loadedCount++;
          checkComplete();
        } else {
          img.onload = () => {
            loadedCount++;
            checkComplete();
          };
          img.onerror = () => {
            loadedCount++;
            img.src = placeholderImage;
            img.alt = '图片加载失败';
            img.style.border = '1px solid #ccc';
            img.style.padding = '5px';
            checkComplete();
          };
        }
      });

      setTimeout(() => {
        Array.from(images).forEach((img) => {
          if (!img.complete) {
            img.src = placeholderImage;
            img.alt = '图片加载超时';
            img.style.border = '1px solid #ccc';
            img.style.padding = '5px';
          }
        });
        resolve();
      }, 5000);
    });
  }
}
