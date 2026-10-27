<script setup lang="ts">
import { contentSnippetApiClient, type ContentSnippet } from '@/api';
import { getSnippetTextPreview } from '@/utils/snippet';
import { setSnippetCommandSnippets } from '@/utils/snippetCommand';
import {
  createSnippetSearchEntries,
  findSnippetSearchEntries,
  normalizeSnippetKeyword,
} from '@/utils/snippetSearch';
import { Dialog, Toast, VButton, VModal } from '@halo-dev/components';
import { utils } from '@halo-dev/ui-shared';
import { computed, onMounted, shallowRef } from 'vue';

interface SaveSnippetForm {
  displayName: string;
  description?: string;
}

const props = defineProps<{
  content: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const saving = shallowRef(false);
const loadingSnippets = shallowRef(false);
const snippetsLoaded = shallowRef(false);
const snippets = shallowRef<ContentSnippet[]>([]);
const displayName = shallowRef('');
const form = shallowRef<{ submit(): void }>();
const contentPreview = computed(() => getSnippetTextPreview(props.content, 140));
const searchEntries = computed(() => createSnippetSearchEntries(snippets.value));
const matchingSnippets = computed(() => {
  if (!displayName.value.trim()) {
    return [];
  }

  return findSnippetSearchEntries(searchEntries.value, displayName.value)
    .slice(0, 5)
    .map((entry) => entry.snippet);
});

async function fetchSnippets() {
  loadingSnippets.value = true;

  try {
    const { data } = await contentSnippetApiClient.contentSnippet.listContentSnippet({
      sort: ['metadata.creationTimestamp,desc'],
    });
    snippets.value = data.items;
    snippetsLoaded.value = true;
  } catch (error) {
    console.error('Failed to load snippets for selection save', error);
    Toast.error('加载已有片段失败，仍可保存为新片段');
  } finally {
    loadingSnippets.value = false;
  }
}

function syncSavedSnippet(saved: ContentSnippet) {
  if (!snippetsLoaded.value) {
    return;
  }

  const exists = snippets.value.some((item) => item.metadata.name === saved.metadata.name);
  snippets.value = exists
    ? snippets.value.map((item) => (item.metadata.name === saved.metadata.name ? saved : item))
    : [saved, ...snippets.value];
  setSnippetCommandSnippets(snippets.value);
}

function requestReplace(snippet: ContentSnippet) {
  if (saving.value) {
    return;
  }

  Dialog.warning({
    title: '替换内容片段',
    description: `确定用当前选区替换「${snippet.spec.displayName}」吗？原名称和描述会保留，已插入文章中的内容不受影响。`,
    confirmText: '替换',
    cancelText: '取消',
    onConfirm: async () => {
      if (saving.value) {
        return;
      }

      saving.value = true;

      try {
        const name = snippet.metadata.name;
        const { data: existing } = await contentSnippetApiClient.contentSnippet.getContentSnippet({
          name,
        });
        const { data: saved } = await contentSnippetApiClient.contentSnippet.updateContentSnippet({
          name,
          contentSnippet: {
            ...existing,
            spec: {
              ...existing.spec,
              content: props.content,
            },
          },
        });

        syncSavedSnippet(saved);
        Toast.success('内容片段已替换');
        emit('close');
      } catch (error) {
        console.error('Failed to replace content snippet from selection', error);
        Toast.error('替换内容片段失败，请重试');
      } finally {
        saving.value = false;
      }
    },
  });
}

async function handleSubmit(data: SaveSnippetForm) {
  if (saving.value || loadingSnippets.value) {
    return;
  }

  const normalizedName = normalizeSnippetKeyword(data.displayName);
  const exactMatches = searchEntries.value.filter(
    (entry) => entry.normalizedName === normalizedName
  );

  if (exactMatches.length > 1) {
    Toast.warning('存在多个同名片段，请点击下方要替换的片段');
    return;
  }

  if (exactMatches.length === 1) {
    requestReplace(exactMatches[0].snippet);
    return;
  }

  saving.value = true;

  try {
    const { data: saved } = await contentSnippetApiClient.contentSnippet.createContentSnippet({
      contentSnippet: {
        apiVersion: 'content-tools.halo.run/v1alpha1',
        kind: 'ContentSnippet',
        metadata: {
          name: utils.id.uuid(),
        },
        spec: {
          displayName: data.displayName.trim(),
          description: data.description?.trim() || undefined,
          content: props.content,
        },
      },
    });

    syncSavedSnippet(saved);
    Toast.success('已保存为内容片段');
    emit('close');
  } catch (error) {
    console.error('Failed to save content snippet from selection', error);
    Toast.error('保存内容片段失败，请重试');
  } finally {
    saving.value = false;
  }
}

onMounted(fetchSnippets);
</script>

<template>
  <VModal
    title="保存为内容片段"
    aria-label="保存为内容片段"
    :width="560"
    mount-to-body
    @close="emit('close')"
  >
    <div class=":uno: mb-4 rounded-base border border-gray-100 bg-gray-50 px-3 py-2.5">
      <div class=":uno: text-xs font-medium text-gray-500">选中内容</div>
      <p class=":uno: mt-1 line-clamp-2 text-sm leading-6 text-gray-700">
        {{ contentPreview }}
      </p>
    </div>

    <FormKit
      type="form"
      name="save-content-snippet-form"
      :actions="false"
      :disabled="saving"
      @node="form = $event"
      @submit="handleSubmit"
    >
      <FormKit
        v-model="displayName"
        type="text"
        name="displayName"
        label="片段名称"
        placeholder="输入名称，支持中文、全拼或拼音首字母"
        validation="required:trim|length:1,100"
        :validation-messages="{
          required: '请输入片段名称',
          length: '片段名称不能超过 100 个字符',
        }"
        :maxlength="100"
      />

      <div
        v-if="displayName.trim() && (loadingSnippets || matchingSnippets.length)"
        class=":uno: mx-3 mb-3 overflow-hidden rounded-base border border-gray-200 bg-white"
      >
        <div
          class=":uno: border-b border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500"
        >
          替换已有片段
        </div>
        <p v-if="loadingSnippets" class=":uno: px-3 py-3 text-xs text-gray-500">
          正在加载已有片段…
        </p>
        <template v-else>
          <button
            v-for="snippet in matchingSnippets"
            :key="snippet.metadata.name"
            type="button"
            class=":uno: flex w-full items-center gap-3 border-b border-gray-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/20"
            :aria-label="`用当前选区替换「${snippet.spec.displayName}」`"
            @click="requestReplace(snippet)"
          >
            <span class=":uno: min-w-0 flex-1">
              <span class=":uno: block truncate text-sm font-medium text-gray-900">
                {{ snippet.spec.displayName }}
              </span>
              <span class=":uno: block truncate text-xs leading-5 text-gray-500">
                {{ snippet.spec.description || getSnippetTextPreview(snippet.spec.content, 60) }}
              </span>
            </span>
            <span class=":uno: shrink-0 text-xs font-medium text-gray-700">替换</span>
          </button>
        </template>
      </div>

      <FormKit
        type="textarea"
        name="description"
        label="片段描述（可选）"
        placeholder="说明片段的用途，方便搜索和识别"
        validation="length:0,500"
        :validation-messages="{
          length: '片段描述不能超过 500 个字符',
        }"
        :maxlength="500"
        rows="3"
      />
    </FormKit>

    <p class=":uno: mt-3 text-xs leading-5 text-gray-500">
      保存的是选中内容的当前快照，不会删除或替换文章中的原内容。
    </p>

    <template #footer>
      <div class=":uno: flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <VButton class=":uno: w-full sm:w-auto" :disabled="saving" @click="emit('close')">
          取消
        </VButton>
        <VButton
          class=":uno: w-full sm:w-auto"
          type="secondary"
          :loading="saving"
          :disabled="saving || loadingSnippets"
          @click="form?.submit()"
        >
          保存片段
        </VButton>
      </div>
    </template>
  </VModal>
</template>
