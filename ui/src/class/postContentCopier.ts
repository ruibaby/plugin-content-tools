import { processHTMLLinks, processMarkdownLinks } from '@/utils/content';
import { copyHtmlAsRichText, copyText } from '@/utils/copy';
import { convertPostContentToMarkdown } from '@/utils/markdown';
import { consoleApiClient, type ContentWrapper, type Post } from '@halo-dev/api-client';
import { Toast } from '@halo-dev/components';

interface CopyOptions {
  convertToMarkdown: boolean;
}

class PostContentCopier {
  static async copyPostContent(post: Post, options: CopyOptions): Promise<void> {
    try {
      const { convertToMarkdown } = options;
      const postContent = await this.fetchPostContent(post.metadata.name);

      this.handleContentCopy(post, postContent, convertToMarkdown);
    } catch (error) {
      console.error('Failed to copy post content', error);
      Toast.error('复制文章内容失败');
    }
  }

  private static handleContentCopy(
    post: Post,
    postContent: ContentWrapper,
    convertToMarkdown: boolean
  ) {
    const { rawType, raw } = postContent;
    const lowerCaseRawType = rawType?.toLowerCase();

    switch (lowerCaseRawType) {
      case 'html':
        this.handleHtmlContent(post, postContent, convertToMarkdown);
        break;
      case 'markdown':
        this.handleMarkdownContent(raw);
        break;
      default:
        throw new Error(`Unsupported raw type: ${rawType}`);
    }
  }

  private static handleHtmlContent(
    post: Post,
    postContent: ContentWrapper,
    convertToMarkdown: boolean
  ) {
    if (!convertToMarkdown) {
      this.copyAsRichText(postContent.content);
    } else {
      const markdown = convertPostContentToMarkdown(post, postContent);
      this.copyAsMarkdown(markdown);
    }
  }
  private static handleMarkdownContent(raw: string | undefined): void {
    this.copyAsMarkdown(raw || '');
  }

  private static copyAsRichText(content: string | undefined) {
    if (!content) {
      throw new Error('No content to copy');
    }
    copyHtmlAsRichText(processHTMLLinks(content));
    Toast.success('文章内容已复制为富文本格式');
  }

  private static copyAsMarkdown(markdown: string) {
    copyText(processMarkdownLinks(markdown));
    Toast.success('文章内容已复制为 Markdown 文本');
  }

  private static async fetchPostContent(name: string): Promise<ContentWrapper> {
    const { data } = await consoleApiClient.content.post.fetchPostHeadContent({
      name,
    });
    return data;
  }
}

export default PostContentCopier;
