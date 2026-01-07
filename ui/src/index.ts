import { consoleApiClient, type ListedPost } from '@halo-dev/api-client';
import { Dialog, VDropdownDivider, VDropdownItem, VLoading } from '@halo-dev/components';
import { definePlugin } from '@halo-dev/ui-shared';
import 'uno.css';
import { defineAsyncComponent, h, markRaw, type Ref } from 'vue';
import MingcuteFileImportLine from '~icons/mingcute/file-import-line';

export default definePlugin({
  components: {},
  routes: [
    {
      parentName: 'ToolsRoot',
      route: {
        path: 'post-import',
        name: 'PostImport',
        component: () => import('./views/PostImport.vue'),
        meta: {
          title: '文章导入',
          description: '导入文章到 Halo',
          searchable: true,
          permissions: ['*'],
          menu: {
            name: '文章导入',
            icon: markRaw(MingcuteFileImportLine),
            priority: 0,
          },
        },
      },
    },
  ],
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
          component: defineAsyncComponent({
            loader: () => import('./components/ConverterEditor.vue'),
            loadingComponent: VLoading,
          }),
          rawType: content.rawType || 'html',
        },
      ];
    },
    // @ts-expect-error don't important
    'post:list-item:operation:create': (post: Ref<ListedPost>) => {
      return [
        {
          priority: 21,
          component: markRaw(VDropdownDivider),
          permissions: ['*'],
        },
        {
          priority: 22,
          component: markRaw(VDropdownItem),
          label: '转换',
          visible: true,
          permissions: ['*'],
          children: [
            {
              priority: 0,
              component: markRaw(VDropdownItem),
              label: '转换为富文本格式',
              action: async (post: ListedPost) => {
                Dialog.warning({
                  title: '转换为富文本格式',
                  description:
                    '将 Markdown 转换为富文本格式并不能保证完全兼容，建议转换之后检查内容是否完整，如果有问题，可以在版本历史中找到之前的版本。',
                  onConfirm: async () => {
                    const { PostOperations } = await import('./class/postOperations');
                    await PostOperations.convertContent(post.post, 'html');
                  },
                });
              },
            },
            {
              priority: 1,
              component: markRaw(VDropdownItem),
              label: '转换为 Markdown 格式',
              action: async (post: ListedPost) => {
                Dialog.warning({
                  title: '转换为 Markdown 格式',
                  description:
                    '将富文本格式转换为 Markdown 格式并不能保证完全兼容，建议转换之后检查内容是否完整，如果有问题，可以在版本历史中找到之前的版本。',
                  onConfirm: async () => {
                    const { PostOperations } = await import('./class/postOperations');
                    await PostOperations.convertContent(post.post, 'markdown');
                  },
                });
              },
            },
          ],
        },
        {
          priority: 23,
          component: defineAsyncComponent({
            loader: () => import('./components/PostExportDropdownItem.vue'),
            loadingComponent: h(VDropdownItem, { disabled: true }, '加载中'),
          }),
          permissions: ['*'],
          props: {
            post: post,
          },
        },
        {
          priority: 24,
          component: markRaw(VDropdownItem),
          label: '复制文章内容',
          visible: true,
          permissions: ['*'],
          children: [
            {
              priority: 0,
              component: markRaw(VDropdownItem),
              label: '以原格式复制',
              visible: true,
              action: async (post: ListedPost) => {
                const { default: PostContentCopier } = await import('./class/postContentCopier');
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
                const { default: PostContentCopier } = await import('./class/postContentCopier');
                await PostContentCopier.copyPostContent(post.post, {
                  convertToMarkdown: true,
                });
              },
            },
          ],
        },
        {
          priority: 25,
          permissions: ['*'],
          component: defineAsyncComponent({
            loader: () => import('./components/PostCloneDropdownItem.vue'),
            loadingComponent: h(VDropdownItem, { disabled: true }, '加载中'),
          }),
          props: {
            post: post,
          },
        },
      ];
    },
  },
});
