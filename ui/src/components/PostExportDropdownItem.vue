<script lang="ts" setup>
import type { ExportType, ImageExportMode } from '@/class/contentExporter';
import type { ListedPost } from '@halo-dev/api-client';
import { Toast, VButton, VDropdownItem, VModal, VSpace } from '@halo-dev/components';
import { ref, useTemplateRef } from 'vue';

interface ExportForm {
  type: ExportType;
  includeImages: boolean;
  imageExportMode: ImageExportMode;
}

const exportTypeOptions: { label: string; value: ExportType }[] = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'PDF', value: 'pdf' },
];

const imageExportModeOptions: { label: string; value: ImageExportMode }[] = [
  { label: '文件', value: 'file' },
  { label: '内嵌', value: 'inline' },
];

const { post } = defineProps<{
  post: ListedPost;
}>();

const display = ref(false);

const modal = useTemplateRef<InstanceType<typeof VModal> | null>('modal');

const exporting = ref(false);

async function onSubmit(data: ExportForm) {
  const { ContentExporter } = await import('@/class/contentExporter');
  try {
    exporting.value = true;
    await ContentExporter.export(
      post.post,
      data.type,
      data.includeImages,
      data.imageExportMode
    );
    modal.value?.close();
    Toast.success('导出成功');
  } catch (error) {
    console.error(error);
    Toast.error('导出失败，请重试');
  } finally {
    exporting.value = false;
  }
}
</script>
<template>
  <VDropdownItem @click="display = true">导出</VDropdownItem>
  <VModal
    :centered="false"
    title="导出"
    mount-to-body
    ref="modal"
    v-if="display"
    @close="display = false"
  >
    <FormKit
      type="form"
      name="post-export-form"
      id="post-export-form"
      @submit="onSubmit"
      #default="{ value }"
    >
      <FormKit label="导出格式" type="select" name="type" :options="exportTypeOptions" />
      <FormKit v-if="value.type !== 'pdf'" label="包含图片" type="checkbox" name="includeImages" />
      <FormKit
        v-if="value.type !== 'pdf' && value.includeImages"
        type="select"
        label="图片导出方式"
        name="imageExportMode"
        :options="imageExportModeOptions"
        :help="
          value.imageExportMode === 'file'
            ? '导出为文件时，图片会以附件的形式导出，与文章压缩在一起'
            : '导出为内嵌时，图片会以 Base64 的形式嵌入到导出文件中'
        "
      ></FormKit>
    </FormKit>
    <template #footer>
      <VSpace>
        <!-- @vue-ignore -->
        <VButton type="secondary" @click="$formkit.submit('post-export-form')" :loading="exporting">
          导出
        </VButton>
        <VButton @click="modal?.close()">取消</VButton>
      </VSpace>
    </template>
  </VModal>
</template>
