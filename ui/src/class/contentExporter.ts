import { ContentTypes } from '@/constants';
import { downloadContent } from '@/utils';
import { processHTMLLinks } from '@/utils/content';
import { consoleApiClient, type Post } from '@halo-dev/api-client';
import { Toast } from '@halo-dev/components';
import { ConverterFactory } from './converterFactory';

type ExportType = 'original' | 'markdown';

export class ContentExporter {
  static async export(post: Post, exportType: ExportType): Promise<void> {
    const { data: content } = await consoleApiClient.content.post.fetchPostHeadContent({
      name: post.metadata.name,
    });

    let exportContent: string;
    let fileExtension: string;

    if (exportType === 'original') {
      exportContent = content.raw || '';
      fileExtension =
        ContentTypes.find((type) => type.type === content.rawType?.toLowerCase())?.extension || '';
    } else if (exportType === 'markdown') {
      if (content.rawType?.toLowerCase() === 'html') {
        const converter = ConverterFactory.getConverter('html', 'markdown');
        exportContent = converter.convert(post, content);
      } else {
        exportContent = content.raw || '';
      }
      fileExtension = 'md';
    } else {
      throw new Error('Unsupported export type');
    }

    downloadContent(exportContent, post.spec.title, fileExtension);
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
