import { ContentTypes } from '@/constants';
import { downloadContent } from '@/utils';
import { consoleApiClient, type Post } from '@halo-dev/api-client';
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
}
