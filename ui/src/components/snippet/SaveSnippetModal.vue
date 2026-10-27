<script setup lang="ts">
import { contentSnippetApiClient } from '@/api';
import { getSnippetTextPreview } from '@/utils/snippet';
import { Toast, VButton, VModal } from '@halo-dev/components';
import { utils } from '@halo-dev/ui-shared';
import { computed, shallowRef } from 'vue';

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
const form = shallowRef<{ submit(): void }>();
const contentPreview = computed(() => getSnippetTextPreview(props.content, 140));

async function handleSubmit(data: SaveSnippetForm) {
  if (saving.value) {
    return;
  }

  saving.value = true;

  try {
    await contentSnippetApiClient.contentSnippet.createContentSnippet({
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

    Toast.success('已保存为内容片段');
    emit('close');
  } catch (error) {
    console.error('Failed to save content snippet from selection', error);
    Toast.error('保存内容片段失败，请重试');
  } finally {
    saving.value = false;
  }
}
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
        type="text"
        name="displayName"
        label="片段名称"
        placeholder="输入一个容易识别的名称"
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
        validation="length:0,500"
        :validation-messages="{
          length: '片段描述不能超过 500 个字符',
        }"
        :maxlength="500"
        rows="3"
      />
    </FormKit>

    <p class=":uno: mt-3 text-xs leading-5 text-gray-500">
      仅保存选中内容的当前快照，不会删除或替换文章中的原内容。
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
          :disabled="saving"
          @click="form?.submit()"
        >
          保存片段
        </VButton>
      </div>
    </template>
  </VModal>
</template>
