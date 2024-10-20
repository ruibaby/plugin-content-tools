import { consoleApiClient, coreApiClient, type Post } from '@halo-dev/api-client';
import { Toast } from '@halo-dev/components';
import { AxiosError } from 'axios';
import { ConverterFactory } from './converterFactory';

export class PostOperations {
  static async convertContent(post: Post, toType: string): Promise<void> {
    const { data: content } = await consoleApiClient.content.post.fetchPostHeadContent({
      name: post.metadata.name,
    });

    if (!content.rawType) {
      Toast.warning('原始类型未定义');
      return;
    }

    if (content.rawType.toLowerCase() === toType) {
      Toast.warning(`当前文档已经是 ${toType} 格式，已忽略转换`);
      return;
    }

    const converter = ConverterFactory.getConverter(content.rawType.toLowerCase(), toType);

    const convertedRawContent = converter.convert(post, content);

    try {
      await this.updatePostContent(post, toType, convertedRawContent, content.content || '');
      Toast.success('转换完成');
    } catch (error) {
      if (error instanceof AxiosError) {
        Toast.error(error.response?.data.detail || '转换失败，请重试');
      }
    }
  }

  private static async updatePostContent(
    post: Post,
    rawType: string,
    raw: string,
    content: string
  ): Promise<void> {
    const published = post.spec.publish;

    await consoleApiClient.content.post.updatePostContent({
      name: post.metadata.name,
      content: {
        rawType,
        raw: raw,
        content: content,
      },
    });

    let attempt = 0;
    const maxRetries = 3;
    const retryDelay = 1000;
    let success = false;

    while (attempt < maxRetries && !success) {
      try {
        await coreApiClient.content.post.patchPost(
          {
            name: post.metadata.name,
            jsonPatchInner: [
              {
                op: 'add',
                path: '/metadata/annotations/content.halo.run~1preferred-editor',
                value: '',
              },
            ],
          },
          { mute: true }
        );
        success = true;
      } catch (error) {
        attempt++;
        if (attempt < maxRetries) {
          console.log(`Optimistic lock error encountered. Retrying ${attempt}/${maxRetries}...`);
          await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retrying
        } else {
          throw error;
        }
      }
    }

    await consoleApiClient.content.post.publishPost({
      name: post.metadata.name,
    });

    if (!published) {
      await consoleApiClient.content.post.unpublishPost({
        name: post.metadata.name,
      });
    }
  }
}
