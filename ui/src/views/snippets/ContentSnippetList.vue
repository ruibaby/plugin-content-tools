<script setup lang="ts">
import type { ContentSnippet } from '@/api';
import { contentSnippetApiClient } from '@/api';
import { getSnippetTextPreview } from '@/utils/snippet';
import {
  Dialog,
  IconAddCircle,
  IconRefreshLine,
  IconSearch,
  Toast,
  VButton,
  VCard,
  VDropdownItem,
  VEmpty,
  VEntity,
  VEntityContainer,
  VEntityField,
  VLoading,
  VPageHeader,
} from '@halo-dev/components';
import { utils } from '@halo-dev/ui-shared';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import MingcuteCopy2Line from '~icons/mingcute/copy-2-line';

const router = useRouter();

const loading = ref(true);
const snippets = ref<ContentSnippet[]>([]);
const keyword = ref('');

const filteredSnippets = computed(() => {
  const value = keyword.value.trim().toLowerCase();

  if (!value) {
    return snippets.value;
  }

  return snippets.value.filter((snippet) => {
    return [snippet.spec.displayName, snippet.spec.description]
      .filter((item): item is string => !!item)
      .some((item) => item.toLowerCase().includes(value));
  });
});

async function fetchSnippets() {
  loading.value = true;

  try {
    const { data } = await contentSnippetApiClient.contentSnippet.listContentSnippet({
      sort: ['metadata.creationTimestamp,desc'],
    });
    snippets.value = data.items;
  } catch (error) {
    console.error('Failed to fetch content snippets', error);
    Toast.error('加载内容片段失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  router.push({ name: 'ContentSnippetCreate' });
}

function handleEdit(snippet: ContentSnippet) {
  router.push({
    name: 'ContentSnippetEdit',
    params: { name: snippet.metadata.name },
  });
}

function handleDelete(snippet: ContentSnippet) {
  Dialog.warning({
    title: '删除内容片段',
    description: `确定要删除「${snippet.spec.displayName}」吗？删除后无法恢复，已插入文章中的内容不会受到影响。`,
    confirmType: 'danger',
    confirmText: '删除',
    cancelText: '取消',
    onConfirm: async () => {
      try {
        await contentSnippetApiClient.contentSnippet.deleteContentSnippet({
          name: snippet.metadata.name,
        });
        Toast.success('删除成功');
        snippets.value = snippets.value.filter(
          (item) => item.metadata.name !== snippet.metadata.name
        );
      } catch (error) {
        console.error('Failed to delete content snippet', error);
        Toast.error('删除内容片段失败');
      }
    },
  });
}

onMounted(fetchSnippets);
</script>

<template>
  <VPageHeader title="内容片段">
    <template #icon>
      <MingcuteCopy2Line />
    </template>
    <template #actions>
      <VButton type="primary" @click="handleCreate">
        <template #icon>
          <IconAddCircle />
        </template>
        新建片段
      </VButton>
    </template>
  </VPageHeader>

  <div class=":uno: m-0 md:m-4">
    <VCard :body-class="['!p-0']">
      <template #header>
        <div class=":uno: w-full bg-gray-50 px-4 py-4">
          <div class=":uno: flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 class=":uno: text-base font-medium text-gray-900">全部片段</h2>
              <p class=":uno: mt-1 text-xs text-gray-500">
                {{
                  keyword ? `${filteredSnippets.length} 个匹配结果` : `共 ${snippets.length} 个片段`
                }}
              </p>
            </div>
            <div class=":uno: flex items-center gap-2">
              <div
                class=":uno: flex h-9 min-w-0 flex-1 items-center gap-2 rounded-base border border-gray-300 bg-white px-3 transition-all focus-within:border-primary focus-within:shadow-sm lg:w-72 lg:flex-none"
              >
                <IconSearch class=":uno: size-4 shrink-0 text-gray-400" />
                <input
                  v-model="keyword"
                  type="text"
                  aria-label="搜索内容片段"
                  placeholder="搜索名称或描述"
                  class=":uno: h-full min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
              </div>
              <VButton :loading="loading" class=":uno: shrink-0" @click="fetchSnippets">
                <template #icon>
                  <IconRefreshLine />
                </template>
                刷新
              </VButton>
            </div>
          </div>
        </div>
      </template>

      <VLoading v-if="loading" />

      <VEmpty
        v-else-if="!filteredSnippets.length"
        :title="keyword ? '没有匹配的内容片段' : '暂无内容片段'"
        :message="
          keyword
            ? '试试其他关键词，或清除当前搜索'
            : '创建后，可在默认编辑器的工具栏或斜杠命令中快速插入'
        "
      >
        <template #actions>
          <VButton v-if="keyword" @click="keyword = ''">清除搜索</VButton>
          <VButton v-else type="primary" @click="handleCreate">新建片段</VButton>
        </template>
      </VEmpty>

      <VEntityContainer v-else>
        <VEntity v-for="snippet in filteredSnippets" :key="snippet.metadata.name">
          <template #start>
            <div class=":uno: flex min-w-0 items-center gap-3">
              <div
                class=":uno: flex size-9 shrink-0 items-center justify-center rounded-base bg-gray-100 text-gray-500 transition-colors group-hover:bg-primary/10 group-hover:text-primary"
              >
                <MingcuteCopy2Line class=":uno: size-4" />
              </div>
              <VEntityField
                class=":uno: min-w-0 max-w-[calc(100vw-11rem)] sm:max-w-xs xl:max-w-xl"
                :title="snippet.spec.displayName"
                :route="{
                  name: 'ContentSnippetEdit',
                  params: { name: snippet.metadata.name },
                }"
              >
                <template #description>
                  <div class=":uno: flex min-w-0 flex-col gap-0.5 whitespace-normal">
                    <span
                      v-if="snippet.spec.description"
                      class=":uno: truncate text-xs text-gray-500"
                      :title="snippet.spec.description"
                    >
                      {{ snippet.spec.description }}
                    </span>
                    <span
                      class=":uno: truncate text-xs text-gray-500"
                      :title="getSnippetTextPreview(snippet.spec.content)"
                    >
                      {{ getSnippetTextPreview(snippet.spec.content) || '暂无内容预览' }}
                    </span>
                  </div>
                </template>
              </VEntityField>
            </div>
          </template>
          <template #end>
            <span
              v-if="snippet.metadata.creationTimestamp"
              class=":uno: hidden whitespace-nowrap text-xs text-gray-500 md:inline"
            >
              创建于 {{ utils.date.format(snippet.metadata.creationTimestamp, 'YYYY-MM-DD') }}
            </span>
          </template>
          <template #dropdownItems>
            <VDropdownItem @click="handleEdit(snippet)">编辑</VDropdownItem>
            <VDropdownItem type="danger" @click="handleDelete(snippet)">删除</VDropdownItem>
          </template>
        </VEntity>
      </VEntityContainer>
    </VCard>
  </div>
</template>
