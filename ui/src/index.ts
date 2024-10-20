import { consoleApiClient, type ListedPost } from '@halo-dev/api-client';
import { Dialog, VDropdownDivider, VDropdownItem } from '@halo-dev/components';
import { definePlugin } from '@halo-dev/console-shared';
import { markRaw } from 'vue';
import { ContentExporter } from './class/contentExporter';
import PostContentCopier from './class/postContentCopier';
import { PostOperations } from './class/postOperations';
import ConverterEditor from './components/ConverterEditor.vue';
import PostCloneDropdownItem from './components/PostCloneDropdownItem.vue';

export default definePlugin({
  components: {},
  routes: [],
  extensionPoints: {
    'editor:create': async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const name = urlParams.get('name');

      if (!name) {
        return [];
      }

      const { data: content } = await consoleApiClient.content.post.fetchPostHeadContent(
        {
          name: name,
        },
        { mute: true }
      );

      return [
        {
          name: 'content-converter',
          displayName: '内容格式转换器',
          logo: '/plugins/content-tools/assets/icon.svg',
          component: ConverterEditor,
          rawType: content.rawType || 'html',
        },
      ];
    },
    // @ts-expect-error don't important
    // Needs upstream to fix this issue
    'post:list-item:operation:create': (post: ListedPost) => {
      return [
        {
          priority: 21,
          component: markRaw(VDropdownDivider),
        },
        {
          priority: 22,
          component: markRaw(VDropdownItem),
          label: '转换',
          visible: true,
          children: [
            {
              priority: 0,
              component: markRaw(VDropdownItem),
              label: '转换为富文本格式',
              visible: true,
              action: async (post: ListedPost) => {
                Dialog.warning({
                  title: '转换为富文本格式',
                  description:
                    '将 Markdown 转换为富文本格式并不能保证完全兼容，建议转换之后检查内容是否完整，如果有问题，可以在版本历史中找到之前的版本。',
                  onConfirm: async () => {
                    await PostOperations.convertContent(post.post, 'html');
                  },
                });
              },
            },
            {
              priority: 1,
              component: markRaw(VDropdownItem),
              label: '转换为 Markdown 格式',
              visible: true,
              action: async (post: ListedPost) => {
                Dialog.warning({
                  title: '转换为 Markdown 格式',
                  description:
                    '将富文本格式转换为 Markdown 格式并不能保证完全兼容，建议转换之后检查内容是否完整，如果有问题，可以在版本历史中找到之前的版本。',
                  onConfirm: async () => {
                    PostOperations.convertContent(post.post, 'markdown');
                  },
                });
              },
            },
          ],
        },
        {
          priority: 23,
          component: markRaw(VDropdownItem),
          label: '导出',
          visible: true,
          children: [
            {
              priority: 0,
              component: markRaw(VDropdownItem),
              label: '以原格式导出',
              visible: true,
              action: (post: ListedPost) => {
                ContentExporter.export(post.post, 'original');
              },
            },
            {
              priority: 1,
              component: markRaw(VDropdownItem),
              label: '转换为 Markdown 并导出',
              visible: true,
              action: (post: ListedPost) => {
                ContentExporter.export(post.post, 'markdown');
              },
            },
            {
              priority: 2,
              component: markRaw(VDropdownItem),
              label: '转换为 PDF 并导出',
              visible: true,
              action: (post: ListedPost) => {
                ContentExporter.exportToPdf(post.post);
              },
            },
          ],
        },
        {
          priority: 24,
          component: markRaw(VDropdownItem),
          label: '复制文章内容',
          visible: true,
          permissions: ['system:posts:view'],
          children: [
            {
              priority: 0,
              component: markRaw(VDropdownItem),
              label: '以原格式复制',
              visible: true,
              action: async (post: ListedPost) => {
                await PostContentCopier.copyPostContent(post.post, {
                  convertToMarkdown: false,
                });
              },
            },
            {
              priority: 1,
              component: markRaw(VDropdownItem),
              label: '转换为 Markdown 并复制',
              visible: true,
              action: async (post: ListedPost) => {
                await PostContentCopier.copyPostContent(post.post, {
                  convertToMarkdown: true,
                });
              },
            },
          ],
        },
        {
          priority: 25,
          component: markRaw(PostCloneDropdownItem),
          props: {
            post: post,
          },
        },
      ];
    },
  },
});
