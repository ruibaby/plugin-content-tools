<script setup lang="ts">
import type { ContentSnippet } from '@/api';
import { contentSnippetApiClient } from '@/api';
import { getSnippetTextPreview, insertContentSnippet } from '@/utils/snippet';
import { setSnippetCommandSnippets } from '@/utils/snippetCommand';
import { createSnippetSearchEntries, findSnippetSearchEntries } from '@/utils/snippetSearch';
import {
  Dialog,
  IconAddCircle,
  IconArrowRight,
  IconSearch,
  Toast,
  VButton,
  VEmpty,
  VLoading,
  VModal,
} from '@halo-dev/components';
import type { Editor, Range } from '@halo-dev/richtext-editor';
import { computed, nextTick, onMounted, ref, shallowRef, type PropType } from 'vue';
import MingcuteCopy2Line from '~icons/mingcute/copy-2-line';
import MingcuteDelete2Line from '~icons/mingcute/delete-2-line';
import MingcuteEdit2Line from '~icons/mingcute/edit-2-line';
import SnippetEditorModal from './SnippetEditorModal.vue';

const props = defineProps({
  editor: {
    type: Object as PropType<Editor>,
    required: true,
  },
  range: {
    type: Object as PropType<Range>,
    required: false,
    default: undefined,
  },
  initialKeyword: {
    type: String,
    required: false,
    default: '',
  },
});

const emit = defineEmits<{
  (event: 'close'): void;
}>();

const visible = ref(false);
const loading = ref(true);
const snippets = ref<ContentSnippet[]>([]);
const keyword = ref(props.initialKeyword);
const searchInputRef = ref<HTMLInputElement>();
const snippetEditorVisible = shallowRef(false);
const activeSnippet = shallowRef<ContentSnippet>();
const searchEntries = computed(() => createSnippetSearchEntries(snippets.value));

const filteredSnippets = computed(() => {
  const value = keyword.value.trim();

  if (!value) {
    return snippets.value;
  }

  const nameMatches = new Set(
    findSnippetSearchEntries(searchEntries.value, value).map((entry) => entry.snippet.metadata.name)
  );
  const descriptionQuery = value.toLocaleLowerCase();

  return snippets.value.filter((snippet) => {
    return (
      nameMatches.has(snippet.metadata.name) ||
      snippet.spec.description?.toLocaleLowerCase().includes(descriptionQuery)
    );
  });
});

async function fetchSnippets() {
  loading.value = true;

  try {
    const { data } = await contentSnippetApiClient.contentSnippet.listContentSnippet({
      sort: ['metadata.creationTimestamp,desc'],
    });
    snippets.value = data.items;
    setSnippetCommandSnippets(data.items);
  } catch (error) {
    console.error('Failed to fetch content snippets', error);
    Toast.error('加载内容片段失败');
  } finally {
    loading.value = false;
  }
}

function handleCreate() {
  activeSnippet.value = undefined;
  snippetEditorVisible.value = true;
}

function handleEdit(snippet: ContentSnippet) {
  activeSnippet.value = snippet;
  snippetEditorVisible.value = true;
}

function closeSnippetEditor() {
  snippetEditorVisible.value = false;
  activeSnippet.value = undefined;
  nextTick(() => searchInputRef.value?.focus());
}

function handleSaved(saved: ContentSnippet) {
  const isNew = !activeSnippet.value;
  const exists = snippets.value.some((item) => item.metadata.name === saved.metadata.name);

  if (exists) {
    snippets.value = snippets.value.map((item) =>
      item.metadata.name === saved.metadata.name ? saved : item
    );
  } else {
    snippets.value = [saved, ...snippets.value];
  }

  setSnippetCommandSnippets(snippets.value);

  if (isNew) {
    keyword.value = '';
  }

  closeSnippetEditor();
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
        setSnippetCommandSnippets(snippets.value);
      } catch (error) {
        console.error('Failed to delete content snippet', error);
        Toast.error('删除内容片段失败');
      }
    },
  });
}

function handleSelect(snippet: ContentSnippet) {
  const inserted = insertContentSnippet(props.editor, snippet, props.range);

  if (!inserted) {
    Toast.error('插入内容片段失败');
    return;
  }

  emit('close');
}

onMounted(() => {
  visible.value = true;
  fetchSnippets();
  nextTick(() => searchInputRef.value?.focus());
});
</script>

<template>
  <VModal
    v-model:visible="visible"
    title="插入内容片段"
    aria-label="插入内容片段"
    :width="640"
    @close="emit('close')"
  >
    <div class=":uno: space-y-3">
      <div class=":uno: flex gap-2">
        <div
          class=":uno: flex h-10 min-w-0 flex-1 items-center gap-2 rounded-base border border-gray-300 bg-white px-3 transition-all focus-within:border-primary focus-within:shadow-sm"
        >
          <IconSearch class=":uno: size-4 shrink-0 text-gray-400" />
          <input
            ref="searchInputRef"
            v-model="keyword"
            type="text"
            aria-label="搜索内容片段"
            placeholder="搜索名称或描述"
            class=":uno: h-full min-w-0 flex-1 border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
        </div>
        <VButton type="secondary" class=":uno: h-10 shrink-0" @click="handleCreate">
          <template #icon>
            <IconAddCircle />
          </template>
          新建片段
        </VButton>
      </div>

      <div v-if="!loading && snippets.length" class=":uno: flex items-center justify-between px-1">
        <span class=":uno: text-xs text-gray-500">
          {{ keyword ? `${filteredSnippets.length} 个匹配结果` : `共 ${snippets.length} 个片段` }}
        </span>
        <span class=":uno: hidden text-xs text-gray-500 sm:inline">选择后插入到当前位置</span>
      </div>

      <div v-if="loading" class=":uno: min-h-[180px]">
        <VLoading />
      </div>

      <VEmpty
        v-else-if="!filteredSnippets.length"
        :title="keyword ? '没有匹配的内容片段' : '暂无内容片段'"
        :message="keyword ? '试试其他关键词，或清除当前搜索' : '新建后即可插入到当前文章'"
      >
        <template #actions>
          <VButton v-if="keyword" @click="keyword = ''">清除搜索</VButton>
          <VButton v-else type="secondary" @click="handleCreate">新建片段</VButton>
        </template>
      </VEmpty>

      <div v-else class=":uno: max-h-[48vh] space-y-2 overflow-y-auto pr-1">
        <div
          v-for="snippet in filteredSnippets"
          :key="snippet.metadata.name"
          class=":uno: group flex items-stretch rounded-base border border-gray-200 bg-white transition-all focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary hover:bg-primary/5"
        >
          <button
            type="button"
            class=":uno: flex min-w-0 flex-1 items-center gap-3 p-3 text-left focus-visible:outline-none"
            @click="handleSelect(snippet)"
          >
            <span
              class=":uno: flex size-9 shrink-0 items-center justify-center rounded-base bg-gray-100 text-gray-500 transition-colors group-focus-within:bg-primary/10 group-focus-within:text-primary group-hover:bg-primary/10 group-hover:text-primary"
            >
              <MingcuteCopy2Line class=":uno: size-4" />
            </span>
            <span class=":uno: min-w-0 flex-1">
              <span class=":uno: block truncate text-sm font-medium text-gray-900">
                {{ snippet.spec.displayName }}
              </span>
              <span
                v-if="snippet.spec.description"
                class=":uno: mt-0.5 block truncate text-xs leading-5 text-gray-500"
                :title="snippet.spec.description"
              >
                {{ snippet.spec.description }}
              </span>
              <span class=":uno: line-clamp-2 block text-xs leading-5 text-gray-500">
                <span class=":uno: font-medium text-gray-500">摘要：</span>
                {{ getSnippetTextPreview(snippet.spec.content, 100) || '暂无内容摘要' }}
              </span>
            </span>
            <IconArrowRight
              class=":uno: hidden size-4 shrink-0 text-gray-400 transition-all group-focus-within:text-primary group-hover:translate-x-0.5 group-hover:text-primary sm:block"
            />
          </button>
          <div class=":uno: flex shrink-0 items-center gap-1 border-l border-gray-100 px-2">
            <button
              type="button"
              class=":uno: flex size-8 items-center justify-center rounded-base text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              :aria-label="`编辑「${snippet.spec.displayName}」`"
              :title="`编辑「${snippet.spec.displayName}」`"
              @click="handleEdit(snippet)"
            >
              <MingcuteEdit2Line class=":uno: size-4" />
            </button>
            <button
              type="button"
              class=":uno: flex size-8 items-center justify-center rounded-base text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
              :aria-label="`删除「${snippet.spec.displayName}」`"
              :title="`删除「${snippet.spec.displayName}」`"
              @click="handleDelete(snippet)"
            >
              <MingcuteDelete2Line class=":uno: size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class=":uno: flex w-full items-center justify-between gap-3 text-xs text-gray-500">
        <span>插入的是片段当前内容，后续修改不会同步到已插入的文章</span>
        <span class=":uno: hidden shrink-0 items-center gap-1.5 sm:flex">
          <kbd class=":uno: rounded-base border border-gray-300 bg-gray-50 px-1.5 py-0.5 text-xs">
            Esc
          </kbd>
          关闭
        </span>
      </div>
    </template>
  </VModal>

  <SnippetEditorModal
    v-if="snippetEditorVisible"
    :snippet="activeSnippet"
    @close="closeSnippetEditor"
    @saved="handleSaved"
  />
</template>
