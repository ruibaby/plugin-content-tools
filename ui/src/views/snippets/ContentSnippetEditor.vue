<script setup lang="ts">
import { contentSnippetApiClient, type ContentSnippet } from '@/api';
import { consoleApiClient } from '@halo-dev/api-client';
import { IconSave, Toast, VButton, VCard, VLoading, VPageHeader } from '@halo-dev/components';
import { ExtensionsKit, RichTextEditor, VueEditor } from '@halo-dev/richtext-editor';
import { utils } from '@halo-dev/ui-shared';
import { isAxiosError, type AxiosRequestConfig } from 'axios';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import MingcuteCopy2Line from '~icons/mingcute/copy-2-line';

const route = useRoute();
const router = useRouter();

const name = computed(() => route.params.name as string | undefined);
const isEdit = computed(() => !!name.value);

const loading = ref(false);
const saving = ref(false);
const form = ref({
  displayName: '',
  description: '',
});

const initialContent = ref('');
const snippet = shallowRef<ContentSnippet>();

const editor = shallowRef<VueEditor>();
const titleInputRef = ref<HTMLInputElement>();

const canManageAttachments = computed(() => utils.permission.has(['system:attachments:manage']));

const upload = canManageAttachments.value ? handleUpload : undefined;
async function handleUpload(fileOrUrl: File | string, options?: AxiosRequestConfig) {
  if (!canManageAttachments.value) {
    return;
  }

  const { data } = await consoleApiClient.storage.attachment.uploadAttachmentForConsole(
    typeof fileOrUrl === 'string' ? { url: fileOrUrl } : { file: fileOrUrl },
    options
  );

  return data;
}

async function handleMatchAttachmentPermalinks(urls: string[]) {
  if (!canManageAttachments.value) {
    return [];
  }

  const { data } = await consoleApiClient.storage.attachment.matchAttachmentPermalinksForConsole({
    attachmentPermalinkMatchRequest: {
      urls,
    },
  });

  return (data.items || []).map((item) => ({
    url: item.url || '',
    matched: item.matched || false,
  }));
}

async function fetchSnippet() {
  if (!name.value) {
    return;
  }

  loading.value = true;

  try {
    const { data } = await contentSnippetApiClient.contentSnippet.getContentSnippet({
      name: name.value,
    });
    snippet.value = data;
    form.value.displayName = data.spec.displayName;
    form.value.description = data.spec.description || '';
    initialContent.value = data.spec.content;
  } catch (error) {
    console.error('Failed to fetch content snippet', error);
    Toast.error('加载内容片段失败');
    router.push({ name: 'ContentSnippets' });
  } finally {
    loading.value = false;
  }
}

function handleBack() {
  router.push({ name: 'ContentSnippets' });
}

async function handleSave() {
  const displayName = form.value.displayName.trim();

  if (!displayName) {
    Toast.warning('请输入片段名称');
    titleInputRef.value?.focus();
    return;
  }

  const currentSnippet = snippet.value;

  if (name.value && !currentSnippet) {
    Toast.error('内容片段尚未加载完成，请刷新后重试');
    return;
  }

  const content = editor.value?.getHTML() || '';

  if (!editor.value || editor.value.isEmpty) {
    Toast.warning('请输入片段内容');
    return;
  }

  saving.value = true;

  try {
    const spec = {
      displayName,
      description: form.value.description.trim() || undefined,
      content,
    };

    if (name.value && currentSnippet) {
      await contentSnippetApiClient.contentSnippet.updateContentSnippet({
        name: name.value,
        contentSnippet: {
          ...currentSnippet,
          spec,
        },
      });
    } else {
      await contentSnippetApiClient.contentSnippet.createContentSnippet({
        contentSnippet: {
          apiVersion: 'content-tools.halo.run/v1alpha1',
          kind: 'ContentSnippet',
          metadata: {
            name: utils.id.uuid(),
          },
          spec,
        },
      });
    }

    Toast.success('保存成功');
    router.push({ name: 'ContentSnippets' });
  } catch (error) {
    console.error('Failed to save content snippet', error);
    if (isAxiosError(error) && error.response?.status === 409) {
      Toast.error('内容片段已被其他窗口修改，请刷新页面后重试');
    } else {
      Toast.error('保存内容片段失败');
    }
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await fetchSnippet();

  editor.value = new VueEditor({
    content: initialContent.value,
    extensions: [
      ExtensionsKit.configure({
        image: {
          uploadImage: upload,
        },
        gallery: {
          uploadImage: upload,
        },
        video: {
          uploadVideo: upload,
        },
        audio: {
          uploadAudio: upload,
        },
        upload: {
          upload,
          matchAttachmentPermalinks: handleMatchAttachmentPermalinks,
        },
        placeholder: {
          placeholder: '输入片段内容',
        },
      }),
    ],
    parseOptions: {
      preserveWhitespace: true,
    },
  });

  nextTick(() => {
    if (!isEdit.value) {
      titleInputRef.value?.focus();
    }
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <VPageHeader :title="isEdit ? '编辑内容片段' : '新建内容片段'">
    <template #icon>
      <MingcuteCopy2Line />
    </template>
    <template #actions>
      <VButton @click="handleBack">返回</VButton>
      <VButton type="secondary" :loading="saving" :disabled="loading" @click="handleSave">
        <template #icon>
          <IconSave />
        </template>
        保存
      </VButton>
    </template>
  </VPageHeader>

  <div class=":uno: m-0 md:m-4">
    <VCard :body-class="['!p-0']">
      <section class=":uno: px-4 py-5 sm:px-6" aria-labelledby="snippet-basic-info">
        <h2 id="snippet-basic-info" class=":uno: text-sm font-medium text-gray-900">基本信息</h2>
        <div class=":uno: mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label for="snippet-name" class=":uno: mb-2 block text-sm font-medium text-gray-700">
              片段名称
            </label>
            <div
              class=":uno: flex h-9 items-center rounded-base border border-gray-300 bg-white px-3 transition-all focus-within:border-primary focus-within:shadow-sm"
            >
              <input
                id="snippet-name"
                ref="titleInputRef"
                v-model="form.displayName"
                type="text"
                maxlength="100"
                placeholder="输入一个容易识别的名称"
                class=":uno: h-full w-full border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div>
            <label
              for="snippet-description"
              class=":uno: mb-2 block text-sm font-medium text-gray-700"
            >
              片段描述
              <span class=":uno: ml-1 font-normal text-gray-500">（可选）</span>
            </label>
            <div
              class=":uno: flex h-9 items-center rounded-base border border-gray-300 bg-white px-3 transition-all focus-within:border-primary focus-within:shadow-sm"
            >
              <input
                id="snippet-description"
                v-model="form.description"
                type="text"
                maxlength="500"
                placeholder="说明片段的用途，方便搜索和识别"
                class=":uno: h-full w-full border-none bg-transparent p-0 text-sm text-gray-900 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="snippet-content">
        <div
          class=":uno: flex flex-col gap-1 border-y border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6"
        >
          <h2 id="snippet-content" class=":uno: text-sm font-medium text-gray-900">片段内容</h2>
          <p class=":uno: text-xs text-gray-500">保存后可在工具栏或斜杠命令中插入</p>
        </div>
        <div class=":uno: h-[calc(100dvh-22rem)] min-h-[400px]">
          <VLoading v-if="loading" />
          <RichTextEditor v-else-if="editor" :editor="editor" locale="zh-CN" />
        </div>
      </section>
    </VCard>
  </div>
</template>
