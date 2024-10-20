import { convertPostContentToHTML, convertPostContentToMarkdown } from '@/utils/markdown';
import type { ContentWrapper, Post } from '@halo-dev/api-client';

export abstract class ContentConverter {
  abstract convert(post: Post, content: ContentWrapper): string;
}

export class MarkdownToHtmlConverter extends ContentConverter {
  convert(_: Post, content: ContentWrapper): string {
    return convertPostContentToHTML(content);
  }
}

export class HtmlToMarkdownConverter extends ContentConverter {
  convert(post: Post, content: ContentWrapper): string {
    return convertPostContentToMarkdown(post, content, false);
  }
}
