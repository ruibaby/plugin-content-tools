<script lang="ts" setup>
import { randomUUID } from '@/utils/id';
import {
  consoleApiClient,
  ucApiClient,
  type Attachment,
  type PostRequest,
} from '@halo-dev/api-client';
import {
  VAlert,
  VButton,
  VEntity,
  VEntityContainer,
  VEntityField,
  VSpace,
} from '@halo-dev/components';
import { useSessionStorage } from '@vueuse/core';
import mammoth from 'mammoth';
import PQueue from 'p-queue';
import TurndownService from 'turndown';
import { computed, reactive, ref } from 'vue';
import MingcuteCheckCircleFill from '~icons/mingcute/check-circle-fill';
import MingcuteCloseCircleLine from '~icons/mingcute/close-circle-line';
import MingcuteDocumentLine from '~icons/mingcute/document-line';
import MingcuteLoading3Fill from '~icons/mingcute/loading-3-fill';
import MingcuteTimeLine from '~icons/mingcute/time-line';

const fileInput = ref<HTMLInputElement | null>(null);
const folderInput = ref<HTMLInputElement | null>(null);
const convertToMarkdown = ref(false);

interface ImportItem {
  id: string;
  file: File;
  filename: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

const importQueue = reactive<ImportItem[]>([]);
const queue = new PQueue({ concurrency: 3 });

const queueStats = computed(() => {
  const total = importQueue.length;
  const pending = importQueue.filter((item) => item.status === 'pending').length;
  const processing = importQueue.filter((item) => item.status === 'processing').length;
  const success = importQueue.filter((item) => item.status === 'success').length;
  const error = importQueue.filter((item) => item.status === 'error').length;

  return {
    total,
    pending,
    processing,
    success,
    error,
    queueSize: queue.size,
    queuePending: queue.pending,
  };
});

const isBusy = computed(() => {
  return queueStats.value.processing > 0;
});

function isWordFile(file: File): boolean {
  const wordTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
  ];
  return wordTypes.includes(file.type) || file.name.endsWith('.docx') || file.name.endsWith('.doc');
}

function onFilesSelected(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isWordFile(file)) {
      const isDuplicate = importQueue.some(
        (item) => item.file.name === file.name && item.file.size === file.size
      );

      if (!isDuplicate) {
        importQueue.push({
          id: randomUUID(),
          file,
          filename: file.name,
          status: 'pending',
        });
      }
    }
  }

  if (fileInput.value) fileInput.value.value = '';
}

function onFolderSelected(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  const existingFileNames = new Set(importQueue.map((item) => item.filename));

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!file.webkitRelativePath) continue;

    if (isWordFile(file)) {
      if (!existingFileNames.has(file.name)) {
        importQueue.push({
          id: randomUUID(),
          file,
          filename: file.name,
          status: 'pending',
        });
        existingFileNames.add(file.name);
      }
    }
  }

  if (folderInput.value) folderInput.value.value = '';
}

async function uploadImageBuffer(imageBuffer: ArrayBuffer, filename: string): Promise<Attachment> {
  try {
    const blob = new Blob([imageBuffer]);
    const file = new File([blob], filename, { type: 'image/png' });

    const { data } = await ucApiClient.storage.attachment.createAttachmentForPost({
      file: file,
      waitForPermalink: true,
    });

    return data;
  } catch (error) {
    console.error('Failed to upload image:', error);
    throw error;
  }
}

async function processWordDocument(file: File): Promise<{ html: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;

        const fileName = file.name.replace(/\.(docx?|DOC|DOCX)$/i, '');

        const options = {
          convertImage: mammoth.images.imgElement(async (image: any) => {
            try {
              const imageBuffer = await image.read();
              const filename = `${fileName}_${randomUUID()}.png`;
              const attachment = await uploadImageBuffer(imageBuffer, filename);
              return {
                src: attachment.status?.permalink || '',
              };
            } catch (error) {
              console.warn('Failed to upload image:', error);
              return { src: '' };
            }
          }),
        };

        const result = await mammoth.convertToHtml({ arrayBuffer }, options);

        resolve({
          html: result.value,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
}

async function processItem(item: ImportItem): Promise<void> {
  item.status = 'processing';

  try {
    const { html } = await processWordDocument(item.file);
    await createPost(item, html);
    item.status = 'success';
  } catch (error) {
    console.error('Failed to process item:', error);
    item.status = 'error';
    item.error = error instanceof Error ? error.message : String(error);
    throw error;
  }
}

async function handleStart() {
  if (isBusy.value) return;

  const pendingItems = importQueue.filter(
    (item) => item.status === 'pending' || item.status === 'error'
  );

  if (pendingItems.length === 0) return;

  const promises = pendingItems.map((item) => queue.add(() => processItem(item)));
  await Promise.allSettled(promises);
}

function handleRetryAll() {
  if (isBusy.value) return;

  importQueue
    .filter((item) => item.status === 'error')
    .forEach((item) => {
      item.status = 'pending';
      item.error = undefined;
    });

  handleStart();
}

function retryItem(item: ImportItem) {
  if (isBusy.value) return;

  item.status = 'pending';
  item.error = undefined;

  queue.add(() => processItem(item));
}

async function createPost(item: ImportItem, html: string) {
  const fileName = item.file.name.replace(/\.(docx?|DOC|DOCX)$/i, '');

  const postToCreate: PostRequest = {
    post: {
      spec: {
        title: fileName,
        slug: fileName.toLowerCase().replace(/\s+/g, '-'),
        template: '',
        cover: '',
        deleted: false,
        publish: false,
        publishTime: undefined,
        pinned: false,
        allowComment: true,
        visible: 'PUBLIC',
        priority: 0,
        excerpt: {
          autoGenerate: true,
          raw: '',
        },
        categories: [],
        tags: [],
        htmlMetas: [],
      },
      apiVersion: 'content.halo.run/v1alpha1',
      kind: 'Post',
      metadata: {
        name: randomUUID(),
        annotations: {},
      },
    },
    content: {
      raw: html,
      content: html,
      rawType: 'html',
    },
  };

  if (convertToMarkdown.value) {
    const turndownService = new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
    });
    const markdown = turndownService.turndown(html);
    postToCreate.content!.raw = markdown;
    postToCreate.content!.content = html;
    postToCreate.content!.rawType = 'markdown';
  }

  const { data } = await consoleApiClient.content.post.draftPost({
    postRequest: postToCreate,
  });

  await consoleApiClient.content.post.publishPost({
    name: data.metadata.name,
  });
}

function handleClear() {
  importQueue.length = 0;
}

const showAlert = useSessionStorage('plugin:content-tools:word-import-alert', true);
</script>
<template>
  <div>
    <div v-if="showAlert" class=":uno: w-full lg:w-1/2 mb-5">
      <VAlert title="提示" @close="showAlert = false">
        <template #description>
          <ul class=":uno: ml-2 list-disc list-inside space-y-1">
            <li>由于 Word 文件的复杂性，可能无法完美解析内容格式，建议导入之后自行调整。</li>
            <li>支持同时导入 Word 文件中的图片资源，其他资源暂不支持。</li>
            <li>图片会上传到与个人中心关联的存储策略，请提前在 <a class="text-gray-900 hover:text-gray-600" href="/console/settings?tab=user">用户设置</a> 中设置。</li>
          </ul>
        </template>
      </VAlert>
    </div>
    <VSpace>
      <VButton :disabled="isBusy" @click="fileInput?.click()">选择 Word 文档</VButton>
      <VButton :disabled="isBusy" @click="folderInput?.click()">选择 Word 文档文件夹</VButton>
      <VButton :disabled="isBusy" v-if="importQueue.length > 0" @click="handleClear">
        清空文件
      </VButton>

      <input
        ref="fileInput"
        type="file"
        accept=".doc,.docx"
        multiple
        style="display: none"
        @change="onFilesSelected"
      />
      <input
        ref="folderInput"
        type="file"
        directory
        webkitdirectory
        style="display: none"
        @change="onFolderSelected"
      />
    </VSpace>

    <div class=":uno: mt-5">
      <FormKit
        type="checkbox"
        label="转为 Markdown 格式"
        v-model="convertToMarkdown"
        :disabled="isBusy"
        help="可能出现格式不兼容的问题，建议谨慎使用"
      ></FormKit>
    </div>

    <div v-if="importQueue.length > 0" class=":uno: mt-5 space-y-4">
      <div class=":uno: flex items-center justify-between">
        <div class=":uno: h-7 flex items-center gap-3 text-sm text-gray-600">
          <span>
            总计: <b class=":uno: text-gray-900">{{ queueStats.total }}</b>
          </span>
          <span>
            待处理:
            <b class=":uno: text-gray-900">{{ queueStats.pending }}</b>
          </span>
          <span>
            处理中:
            <b class=":uno: text-gray-900">{{ queueStats.processing }}</b>
          </span>
          <span>
            成功: <b class=":uno: text-gray-900">{{ queueStats.success }}</b>
          </span>
          <span>
            失败:
            <b :class="{ ':uno: !text-red-500': queueStats.error > 0 }" class=":uno: text-gray-900">
              {{ queueStats.error }}
            </b>
          </span>
        </div>
        <VSpace>
          <VButton v-if="queueStats.error > 0" :disabled="isBusy" size="sm" @click="handleRetryAll">
            重试所有
          </VButton>
          <VButton
            type="secondary"
            :loading="isBusy"
            :disabled="queueStats.pending === 0"
            @click="handleStart"
          >
            开始导入
          </VButton>
        </VSpace>
      </div>

      <div class=":uno: rounded-base overflow-hidden border">
        <VEntityContainer>
          <VEntity v-for="item in importQueue" :key="item.id">
            <template #start>
              <VEntityField>
                <template #description>
                  <div class=":uno: flex items-center gap-2">
                    <MingcuteDocumentLine class=":uno: text-blue-500" />
                    <span class=":uno: text-sm text-gray-900">
                      {{ item.filename }}
                    </span>
                  </div>
                </template>
              </VEntityField>
            </template>
            <template #end>
              <VEntityField>
                <template #description>
                  <MingcuteLoading3Fill
                    v-if="item.status === 'processing'"
                    class=":uno: animate-spin"
                  />
                  <MingcuteCheckCircleFill
                    v-else-if="item.status === 'success'"
                    class=":uno: text-green-500"
                  />
                  <div
                    v-else-if="item.status === 'error'"
                    class=":uno: inline-flex items-center gap-2"
                  >
                    <MingcuteCloseCircleLine v-tooltip="item.error" class=":uno: text-red-500" />
                    <VButton size="sm" :disabled="isBusy" @click="retryItem(item)"> 重试 </VButton>
                  </div>
                  <MingcuteTimeLine v-else class=":uno: text-gray-500" />
                </template>
              </VEntityField>
            </template>
          </VEntity>
        </VEntityContainer>
      </div>
    </div>

    <div v-else class=":uno: h-64 flex items-center justify-center text-sm text-gray-600">
      请选择要导入的 Word 文档或文件夹
    </div>
  </div>
</template>
