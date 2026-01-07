import {
  consoleApiClient,
  type ContentWrapper,
  type Post,
  type PostRequest,
} from '@halo-dev/api-client';
import { Toast } from '@halo-dev/components';
import { utils } from '@halo-dev/ui-shared';
import { cloneDeep } from 'es-toolkit';
import { set } from 'es-toolkit/compat';

class PostCloner {
  static async clonePost(post: Post): Promise<void> {
    try {
      const originalContent = await this.fetchPostContent(post.metadata.name);

      const newPostData = this.prepareNewPostData(post, originalContent);

      await consoleApiClient.content.post.draftPost({
        postRequest: newPostData,
      });

      Toast.success('文章克隆成功，如果列表没有刷新，请手动刷新一次');
    } catch (error) {
      console.error('Failed to clone post', error);
      Toast.error('克隆文章失败');
    }
  }

  private static async fetchPostContent(postName: string): Promise<ContentWrapper> {
    const { data } = await consoleApiClient.content.post.fetchPostHeadContent({
      name: postName,
    });

    return data;
  }

  private static prepareNewPostData(originalPost: Post, content: ContentWrapper): PostRequest {
    const postToCreate = cloneDeep(originalPost);
    set(postToCreate, 'spec.baseSnapshot', '');
    set(postToCreate, 'spec.headSnapshot', '');
    set(postToCreate, 'spec.releaseSnapshot', '');
    set(postToCreate, 'spec.slug', `${originalPost.spec.slug}-${utils.id.uuid().split('-')[0]}`);
    set(postToCreate, 'spec.title', originalPost.spec.title + '（副本）');
    set(postToCreate, 'spec.publish', false);
    set(postToCreate, 'metadata', {
      name: utils.id.uuid(),
    });

    return {
      post: postToCreate,
      content: {
        content: content.content || '',
        raw: content.raw || '',
        rawType: content.rawType || '',
      },
    };
  }
}

export default PostCloner;
