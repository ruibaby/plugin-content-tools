import {
  consoleApiClient,
  coreApiClient,
  type Post,
} from "@halo-dev/api-client";
import { Toast } from "@halo-dev/components";
import { ConverterFactory } from "./converterFactory";

export class PostOperations {
  static async convertContent(post: Post, toType: string): Promise<void> {
    const { data: content } =
      await consoleApiClient.content.post.fetchPostHeadContent({
        name: post.metadata.name,
      });

    if (!content.rawType) {
      Toast.warning("原始类型未定义");
      return;
    }

    if (content.rawType.toLowerCase() === toType) {
      Toast.warning(`当前文档已经是 ${toType} 格式，已忽略转换`);
      return;
    }

    const converter = ConverterFactory.getConverter(
      content.rawType.toLowerCase(),
      toType,
    );

    const convertedContent = converter.convert(post, content);

    await this.updatePostContent(post, toType, convertedContent);

    Toast.success("转换完成");
  }

  private static async updatePostContent(
    post: Post,
    rawType: string,
    content: string,
  ): Promise<void> {
    const inProgress = post.status?.inProgress;

    await consoleApiClient.content.post.updatePostContent({
      name: post.metadata.name,
      content: {
        rawType,
        raw: content,
        content,
      },
    });

    await coreApiClient.content.post.patchPost({
      name: post.metadata.name,
      jsonPatchInner: [
        {
          op: "remove",
          path: "/metadata/annotations/content.halo.run~1preferred-editor",
        },
      ],
    });

    if (!inProgress) {
      await consoleApiClient.content.post.publishPost({
        name: post.metadata.name,
      });
    }
  }
}
