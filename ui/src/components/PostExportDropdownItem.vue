<script lang="ts" setup>
import type { ExportType, ImageExportMode } from '@/class/contentExporter';
import type { ListedPost } from '@halo-dev/api-client';
import { Toast, VButton, VDropdownItem, VModal, VSpace } from '@halo-dev/components';
import { computed, ref, useTemplateRef } from 'vue';

interface ExportForm {
  type: ExportType;
  includeImages: boolean;
  imageExportMode?: ImageExportMode;
}

const exportTypeOptions: { label: string; value: ExportType }[] = [
  { label: 'Markdown', value: 'markdown' },
  { label: 'HTML', value: 'html' },
  { label: 'PDF', value: 'pdf' },
  { label: 'JSON', value: 'json' },
];

const imageExportModeOptions: { label: string; value: ImageExportMode }[] = [
  { label: '文件', value: 'file' },
  { label: '内嵌', value: 'inline' },
];

const { post } = defineProps<{
  post: ListedPost;
}>();

const display = ref(false);
const exportType = ref<ExportType>('markdown');
const imageExportMode = ref<ImageExportMode>('file');

const modal = useTemplateRef<InstanceType<typeof VModal> | null>('modal');

const exporting = ref(false);

async function onSubmit(data: ExportForm) {
  const { ContentExporter } = await import('@/class/contentExporter');
  try {
    exporting.value = true;
    const imageExportMode = data.type === 'json' ? 'file' : (data.imageExportMode ?? 'file');
    await ContentExporter.export(post.post, data.type, data.includeImages, imageExportMode);
    modal.value?.close();
    Toast.success('导出成功');
  } catch (error) {
    console.error(error);
    Toast.error('导出失败，请重试');
  } finally {
    exporting.value = false;
  }
}

const imageExportModeHelp = computed(() => {
  if (exportType.value === 'json') {
    return 'JSON 导出包含图片时仅支持文件模式，文章数据和图片会一起打包为 ZIP 文件';
  }
  return imageExportMode.value === 'file'
    ? '导出为文件时，图片会以附件的形式导出，与文章压缩在一起'
    : '导出为内嵌时，图片会以 Base64 的形式嵌入到导出文件中';
});

const exportTypeHelp = computed(() => {
  if (exportType.value === 'json') {
    return '导出之后可以在工具 -> 文章导入 -> JSON 导入选项卡中导入文章，也可以在另外的 Halo 站点中导入';
  }
});
</script>
<template>
  <VDropdownItem @click="display = true">导出</VDropdownItem>
  <VModal
    v-if="display"
    ref="modal"
    :centered="false"
    title="导出"
    mount-to-body
    @close="display = false"
  >
    <FormKit
      id="post-export-form"
      v-slot="{ value }"
      type="form"
      name="post-export-form"
      @submit="onSubmit"
    >
      <FormKit
        v-model="exportType"
        label="导出格式"
        type="select"
        name="type"
        :options="exportTypeOptions"
        :help="exportTypeHelp"
      />
      <FormKit v-if="value.type !== 'pdf'" label="包含图片" type="checkbox" name="includeImages" />
      <FormKit
        v-if="value.type !== 'pdf' && value.includeImages"
        type="select"
        label="图片导出方式"
        name="imageExportMode"
        :options="imageExportModeOptions"
        v-model="imageExportMode"
        :help="imageExportModeHelp"
        :disabled="exportType === 'json'"
      ></FormKit>
    </FormKit>
    <template #footer>
      <VSpace>
        <!-- @vue-ignore -->
        <VButton type="secondary" :loading="exporting" @click="$formkit.submit('post-export-form')">
          导出
        </VButton>
        <VButton @click="modal?.close()">取消</VButton>
      </VSpace>
    </template>
  </VModal>
</template>
