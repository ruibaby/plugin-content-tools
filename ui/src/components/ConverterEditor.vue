<script setup lang="ts">
import ConverterManager, { type ConversionOption } from '@/class/converterManager';
import {
  consoleApiClient,
  coreApiClient,
  type ContentWrapper,
  type Post,
} from '@halo-dev/api-client';
import { Dialog, Toast } from '@halo-dev/components';
import { useRouteQuery } from '@vueuse/router';
import { onMounted, ref } from 'vue';

const converterManager = ConverterManager.getInstance();

const converterOptions = ref<ConversionOption[]>([]);
const name = useRouteQuery<string | undefined>('name');

const post = ref<Post | undefined>();
const content = ref<ContentWrapper | undefined>();

onMounted(async () => {
  if (!name.value) {
    Toast.warning('当前没有创建文章，不能使用转换功能');
    return;
  }

  const { data: currentPost } = await coreApiClient.content.post.getPost({
    name: name.value,
  });

  post.value = currentPost;

  const { data: latestContent } = await consoleApiClient.content.post.fetchPostHeadContent({
    name: name.value,
  });

  content.value = latestContent;

  if (!content.value.rawType) {
    Toast.success('当前文章内容或者类型不存在');
    return;
  }

  converterOptions.value = converterManager.getConverterOptions(content.value.rawType);
});

async function handleConvert(option: ConversionOption) {
  Dialog.warning({
    title: option.label,
    description:
      '转换格式并不能保证完全兼容，建议转换之后检查内容是否完整，如果有问题，可以在版本历史中找到之前的版本。',
    onConfirm: async () => {
      if (!post.value) {
        return;
      }

      const { PostOperations } = await import('@/class/postOperations');

      await PostOperations.convertContent(post.value, option.toType);

      localStorage.removeItem('editor-provider-name');

      Toast.success('转换完成');

      setTimeout(() => {
        window.location.reload();
      }, 200);
    },
  });
}
</script>
<template>
  <div class=":uno: bg-white">
    <div class=":uno: size-full flex flex-col items-center pt-20">
      <div>
        <h2 class=":uno: text-2xl font-medium">内容格式转换器</h2>
        <p class=":uno: mt-4 text-sm text-gray-600">请选择你要转换的格式：</p>
        <ul class=":uno: mt-4 space-y-2">
          <li v-for="option in converterOptions" :key="option.toType + option.fromType">
            <button
              class=":uno: hover:border-primary w-96 border rounded-md p-2 text-sm text-gray-600 transition-all hover:text-gray-900"
              @click="handleConvert(option)"
            >
              {{ option.label }}
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
