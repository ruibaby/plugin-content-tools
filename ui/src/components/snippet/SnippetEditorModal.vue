<script setup lang="ts">
import type { ContentSnippet } from '@/api';
import { contentSnippetApiClient } from '@/api';
import { consoleApiClient } from '@halo-dev/api-client';
import { Toast, VButton, VLoading, VModal } from '@halo-dev/components';
import { ExtensionsKit, RichTextEditor, VueEditor } from '@halo-dev/richtext-editor';
import { utils } from '@halo-dev/ui-shared';
import type { AxiosRequestConfig } from 'axios';
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue';

interface SnippetEditorForm {
  displayName: string;
  description?: string;
}

const props = defineProps<{
  snippet?: ContentSnippet;
}>();

const emit = defineEmits<{
  close: [];
  saved: [snippet: ContentSnippet];
}>();

const isEdit = computed(() => !!props.snippet);
const saving = shallowRef(false);
const form = shallowRef<{ submit(): void }>();
const editor = shallowRef<VueEditor>();

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

async function handleSubmit(data: SnippetEditorForm) {
  if (saving.value) {
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
      displayName: data.displayName.trim(),
      description: data.description?.trim() || undefined,
      content,
    };
    let saved: ContentSnippet;

    if (props.snippet) {
      const name = props.snippet.metadata.name;
      const { data: existing } = await contentSnippetApiClient.contentSnippet.getContentSnippet({
        name,
      });
      const { data } = await contentSnippetApiClient.contentSnippet.updateContentSnippet({
        name,
        contentSnippet: {
          ...existing,
          spec,
        },
      });
      saved = data;
    } else {
      const { data } = await contentSnippetApiClient.contentSnippet.createContentSnippet({
        contentSnippet: {
          apiVersion: 'content-tools.halo.run/v1alpha1',
          kind: 'ContentSnippet',
          metadata: {
            name: utils.id.uuid(),
          },
          spec,
        },
      });
      saved = data;
    }

    Toast.success(isEdit.value ? '内容片段已更新' : '内容片段已创建');
    emit('saved', saved);
  } catch (error) {
    console.error('Failed to save content snippet from picker', error);
    Toast.error('保存内容片段失败，请重试');
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  editor.value = new VueEditor({
    content: props.snippet?.spec.content || '',
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': '片段内容',
        'aria-multiline': 'true',
      },
    },
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
});

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<template>
  <VModal
    :title="isEdit ? '编辑内容片段' : '新建内容片段'"
    :aria-label="isEdit ? '编辑内容片段' : '新建内容片段'"
    :width="960"
    height="720px"
    :body-class="['!p-0', 'flex', 'min-h-0', 'flex-col']"
    mount-to-body
    @close="emit('close')"
  >
    <div class=":uno: flex min-h-0 flex-1 flex-col">
      <div class=":uno: shrink-0 p-4">
        <FormKit
          type="form"
          name="content-snippet-editor-form"
          :actions="false"
          :disabled="saving"
          @node="form = $event"
          @submit="handleSubmit"
        >
          <div class=":uno: grid grid-cols-1 gap-4 sm:grid-cols-2 [&>.formkit-outer]:!py-0">
            <FormKit
              type="text"
              name="displayName"
              label="片段名称"
              placeholder="输入一个容易识别的名称"
              :value="snippet?.spec.displayName || ''"
              validation="required:trim|length:1,100"
              :validation-messages="{
                required: '请输入片段名称',
                length: '片段名称不能超过 100 个字符',
              }"
              :maxlength="100"
            />
            <FormKit
              type="textarea"
              name="description"
              label="片段描述（可选）"
              placeholder="说明片段的用途，方便搜索和识别"
              :value="snippet?.spec.description || ''"
              validation="length:0,500"
              :validation-messages="{
                length: '片段描述不能超过 500 个字符',
              }"
              :maxlength="500"
              rows="2"
            />
          </div>
        </FormKit>
      </div>

      <section class=":uno: flex min-h-0 flex-1 flex-col border-t border-gray-100">
        <div class=":uno: flex shrink-0 items-center justify-between gap-3 bg-gray-50 px-4 py-2.5">
          <h3 class=":uno: text-sm font-medium text-gray-900">片段内容</h3>
          <p class=":uno: hidden text-xs text-gray-500 sm:block">保存后可在当前列表中直接插入</p>
        </div>
        <div class=":uno: min-h-0 flex-1">
          <RichTextEditor v-if="editor" :editor="editor" locale="zh-CN" />
          <VLoading v-else />
        </div>
      </section>
    </div>

    <template #footer>
      <div class=":uno: flex justify-end gap-2">
        <VButton :disabled="saving" @click="emit('close')">取消</VButton>
        <VButton
          type="secondary"
          :loading="saving"
          :disabled="saving || !editor"
          @click="form?.submit()"
        >
          保存片段
        </VButton>
      </div>
    </template>
  </VModal>
</template>
