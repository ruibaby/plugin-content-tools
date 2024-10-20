<script setup lang="ts">
import ConverterManager, { type ConversionOption } from '@/class/converterManager';
import { PostOperations } from '@/class/postOperations';
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
  <div class="bg-white">
    <div class="flex pt-20 items-center size-full flex-col">
      <div>
        <h2 class="text-2xl font-medium">内容格式转换器</h2>
        <p class="text-sm text-gray-600 mt-4">请选择你要转换的格式：</p>
        <ul class="mt-4 space-y-2">
          <li v-for="option in converterOptions" :key="option.toType + option.fromType">
            <button
              class="p-2 text-sm border hover:border-primary transition-all w-96 rounded-md text-gray-600 hover:text-gray-900"
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
