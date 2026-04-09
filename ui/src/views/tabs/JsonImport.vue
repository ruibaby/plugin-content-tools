<script lang="ts" setup>
import { extractImageReferencesFromContent, isImageFile } from '@/utils/image';
import { consoleApiClient, type Attachment, type PostRequest } from '@halo-dev/api-client';
import {
  VAlert,
  VButton,
  VEntity,
  VEntityContainer,
  VEntityField,
  VSpace,
} from '@halo-dev/components';
import { utils } from '@halo-dev/ui-shared';
import { useSessionStorage } from '@vueuse/core';
import JSZip from 'jszip';
import { computed, reactive, ref } from 'vue';
import { useQueue } from 'vue-reactive-queue';
import MingcuteCheckCircleFill from '~icons/mingcute/check-circle-fill';
import MingcuteCloseCircleLine from '~icons/mingcute/close-circle-line';
import MingcuteDocumentLine from '~icons/mingcute/document-line';
import MingcuteLoading3Fill from '~icons/mingcute/loading-3-fill';
import MingcuteTimeLine from '~icons/mingcute/time-line';

interface ImageSource {
  file: File;
  path: string;
}

interface ImportBundle {
  postRequest: PostRequest;
  imageSources: ImageSource[];
}

const fileInput = ref<HTMLInputElement | null>(null);
const imageInput = ref<HTMLInputElement | null>(null);
const publishAfterImport = ref(true);
const imageFiles = reactive<File[]>([]);

const { tasks, add, stats, clear, resume, retry, pause } = useQueue<File>({
  concurrency: 3,
  immediate: false,
  onFinished() {
    pause();
  },
});

const isBusy = computed(() => {
  return stats.value.running > 0;
});

function isJsonFile(file: File): boolean {
  return file.type === 'application/json' || file.name.toLowerCase().endsWith('.json');
}

function isZipFile(file: File): boolean {
  return (
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed' ||
    file.name.toLowerCase().endsWith('.zip')
  );
}

function onFilesSelected(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (!isJsonFile(file) && !isZipFile(file)) {
      continue;
    }

    const isDuplicate = tasks.value.some(
      (item) => item.meta?.name === file.name && item.meta?.size === file.size
    );

    if (!isDuplicate) {
      add(async () => await processItem(file), file);
    }
  }

  if (fileInput.value) {
    fileInput.value.value = '';
  }
}

function onImageFolderSelected(event: Event) {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  imageFiles.length = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (isImageFile(file)) {
      imageFiles.push(file);
    }
  }

  if (imageInput.value) {
    imageInput.value.value = '';
  }
}

async function processItem(file: File): Promise<void> {
  const bundle = await readImportBundle(file);
  const imageSources = [...bundle.imageSources, ...getSelectedImageSources()];
  const postRequest = await processPostRequestImages(bundle.postRequest, imageSources);

  await createPost(postRequest);
}

async function readImportBundle(file: File): Promise<ImportBundle> {
  if (isJsonFile(file)) {
    const raw = await file.text();
    return {
      postRequest: parsePostRequest(raw),
      imageSources: [],
    };
  }

  if (isZipFile(file)) {
    return await readZipImportBundle(file);
  }

  throw new Error('仅支持导入 JSON 或 ZIP 文件');
}

async function readZipImportBundle(file: File): Promise<ImportBundle> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const entries = Object.values(zip.files).filter((entry) => !entry.dir);
  const jsonEntries = entries.filter((entry) => entry.name.toLowerCase().endsWith('.json'));

  if (jsonEntries.length === 0) {
    throw new Error('ZIP 中未找到 JSON 文件');
  }

  if (jsonEntries.length > 1) {
    throw new Error('ZIP 中包含多个 JSON 文件，暂不支持');
  }

  const postRequest = parsePostRequest(await jsonEntries[0].async('string'));
  const imageSources: ImageSource[] = [];

  for (const entry of entries) {
    const filename = entry.name.split('/').pop() || entry.name;
    const zipFile = new File([], filename);

    if (!isImageFile(zipFile)) {
      continue;
    }

    const blob = await entry.async('blob');
    imageSources.push({
      file: new File([blob], filename, { type: blob.type || undefined }),
      path: entry.name,
    });
  }

  return {
    postRequest,
    imageSources,
  };
}

function parsePostRequest(raw: string): PostRequest {
  const parsed = JSON.parse(raw) as PostRequest;

  if (
    !parsed ||
    typeof parsed !== 'object' ||
    !parsed.post ||
    typeof parsed.post !== 'object' ||
    !parsed.content ||
    typeof parsed.content !== 'object'
  ) {
    throw new Error('JSON 格式不正确，无法解析为 PostRequest');
  }

  return parsed;
}

function getSelectedImageSources(): ImageSource[] {
  return imageFiles.map((file) => {
    const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;

    return {
      file,
      path: webkitRelativePath || file.name,
    };
  });
}

async function processPostRequestImages(
  postRequest: PostRequest,
  imageSources: ImageSource[]
): Promise<PostRequest> {
  if (imageSources.length === 0) {
    return postRequest;
  }

  const uploadCache = new Map<string, Promise<Attachment>>();
  const rawType = postRequest.content.rawType?.toLowerCase();

  if (postRequest.content.raw && rawType === 'markdown') {
    postRequest.content.raw = await processMarkdownImages(
      postRequest.content.raw,
      imageSources,
      uploadCache
    );
  }

  if (postRequest.content.raw && rawType === 'html') {
    postRequest.content.raw = await processHtmlImages(
      postRequest.content.raw,
      imageSources,
      uploadCache
    );
  }

  if (postRequest.content.content) {
    postRequest.content.content = await processHtmlImages(
      postRequest.content.content,
      imageSources,
      uploadCache
    );
  }

  const cover = postRequest.post.spec.cover;
  if (cover) {
    const attachment = await resolveAttachment(cover, imageSources, uploadCache);
    if (attachment?.status?.permalink) {
      postRequest.post.spec.cover = attachment.status.permalink;
    }
  }

  return postRequest;
}

async function processMarkdownImages(
  markdownContent: string,
  imageSources: ImageSource[],
  uploadCache: Map<string, Promise<Attachment>>
): Promise<string> {
  const imageReferences = extractImageReferencesFromContent(markdownContent, 'markdown');
  let processedContent = markdownContent;

  for (const imagePath of imageReferences) {
    const attachment = await resolveAttachment(imagePath, imageSources, uploadCache);
    if (!attachment?.status?.permalink) {
      continue;
    }

    const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`!\\[([^\\]]*)\\]\\(${escapedImagePath}\\)`, 'g');
    processedContent = processedContent.replace(regex, `![$1](${attachment.status.permalink})`);
  }

  return processedContent;
}

async function processHtmlImages(
  htmlContent: string,
  imageSources: ImageSource[],
  uploadCache: Map<string, Promise<Attachment>>
): Promise<string> {
  const imageReferences = extractImageReferencesFromContent(htmlContent, 'html');
  let processedContent = htmlContent;

  for (const imagePath of imageReferences) {
    const attachment = await resolveAttachment(imagePath, imageSources, uploadCache);
    if (!attachment?.status?.permalink) {
      continue;
    }

    const escapedImagePath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`src=["']${escapedImagePath}["']`, 'g');
    processedContent = processedContent.replace(regex, `src="${attachment.status.permalink}"`);
  }

  return processedContent;
}

async function resolveAttachment(
  imagePath: string,
  imageSources: ImageSource[],
  uploadCache: Map<string, Promise<Attachment>>
): Promise<Attachment | undefined> {
  const imageSource = findMatchingImageSource(imagePath, imageSources);
  if (!imageSource) {
    return undefined;
  }

  const cacheKey = `${imageSource.path}:${imageSource.file.size}`;
  if (!uploadCache.has(cacheKey)) {
    uploadCache.set(cacheKey, uploadImageFile(imageSource.file));
  }

  return await uploadCache.get(cacheKey);
}

function findMatchingImageSource(imagePath: string, imageSources: ImageSource[]): ImageSource | undefined {
  const normalizedImagePath = normalizePath(imagePath);
  const imageFileName = normalizedImagePath.split('/').pop() || normalizedImagePath;

  return imageSources.find((imageSource) => {
    const normalizedSourcePath = normalizePath(imageSource.path || imageSource.file.name);
    const sourceFileName = imageSource.file.name;

    return (
      normalizedSourcePath === normalizedImagePath ||
      normalizedSourcePath.endsWith(normalizedImagePath) ||
      normalizedImagePath.endsWith(normalizedSourcePath) ||
      sourceFileName === imageFileName ||
      normalizedSourcePath.endsWith(`/${imageFileName}`) ||
      imageFileName.endsWith(sourceFileName)
    );
  });
}

function normalizePath(path: string): string {
  let normalizedPath = path;

  try {
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) {
      normalizedPath = new URL(normalizedPath).pathname;
    }
  } catch {
    normalizedPath = path;
  }

  return decodeURIComponent(normalizedPath)
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/')
    .replace(/^\.?\//, '')
    .replace(/^\/+/, '');
}

async function uploadImageFile(imageFile: File): Promise<Attachment> {
  const imageBuffer = await imageFile.arrayBuffer();
  const { data } = await consoleApiClient.storage.attachment.uploadAttachmentForConsole({
    file: new File([imageBuffer], imageFile.name, { type: imageFile.type }),
  });

  return data;
}

function preparePostRequestForImport(postRequest: PostRequest): PostRequest {
  postRequest.post.metadata = {
    name: utils.id.uuid(),
  };

  postRequest.post.spec.publish = false;
  postRequest.post.spec.publishTime = undefined;
  postRequest.post.spec.owner = '';
  postRequest.post.spec.pinned = false;
  postRequest.post.spec.template = '';

  postRequest.post.spec.baseSnapshot = '';
  postRequest.post.spec.headSnapshot = '';
  postRequest.post.spec.releaseSnapshot = '';
  // TODO: Support categories and tags
  postRequest.post.spec.categories = [];
  postRequest.post.spec.tags = [];
  postRequest.post.status = {}

  return postRequest;
}

async function createPost(postRequest: PostRequest) {
  const importedPostRequest = preparePostRequestForImport(postRequest);
  const { data } = await consoleApiClient.content.post.draftPost({
    postRequest: importedPostRequest,
  });

  if (publishAfterImport.value) {
    await consoleApiClient.content.post.publishPost({
      name: data.metadata.name,
    });
  }
}

function handleRetryAll() {
  if (isBusy.value) return;

  tasks.value
    .filter((item) => item.status === 'rejected')
    .forEach((item) => {
      retry(item.id);
    });
}

function handleClearImages() {
  imageFiles.length = 0;
}

const showAlert = useSessionStorage('plugin:content-tools:json-import-alert', true);
</script>
<template>
  <div>
    <div v-if="showAlert" class=":uno: mb-5 w-full lg:w-1/2">
      <VAlert title="提示" @close="showAlert = false">
        <template #description>
          <ul class=":uno: ml-2 list-disc list-inside space-y-1">
            <li>仅支持通过此插件导出的 JSON 格式文章，也支持导入包含 JSON 和图片的 ZIP 文件。</li>
            <li>如果 ZIP 已经提前解压，可以额外选择图片文件夹作为图片来源。</li>
            <li>
              图片会上传到管理端附件配置中的存储策略，请提前在
              <a class=":uno: text-gray-900 hover:text-gray-600" href="/console/settings?tab=attachment"
                >附件配置</a
              >
              中设置。
            </li>
          </ul>
        </template>
      </VAlert>
    </div>
    <VSpace>
      <VButton :disabled="isBusy" @click="fileInput?.click()">选择 JSON 或 ZIP 文件</VButton>
      <VButton :disabled="isBusy" @click="imageInput?.click()">选择图片文件夹</VButton>
      <VButton v-if="tasks.length > 0" :disabled="isBusy" @click="clear"> 清空文件 </VButton>
      <VButton v-if="imageFiles.length > 0" :disabled="isBusy" @click="handleClearImages">
        清空图片
      </VButton>

      <input
        ref="fileInput"
        type="file"
        accept=".json,.zip,application/json,application/zip"
        multiple
        style="display: none"
        @change="onFilesSelected"
      />
      <input
        ref="imageInput"
        type="file"
        webkitdirectory
        style="display: none"
        @change="onImageFolderSelected"
      />
    </VSpace>

    <div class=":uno: mt-5">
      <FormKit
        v-model="publishAfterImport"
        type="checkbox"
        label="导入后发布文章"
        :disabled="isBusy"
        help="取消选择时，导入的文章将保存为草稿"
      ></FormKit>
    </div>

    <div v-if="tasks.length > 0" class=":uno: mt-5 space-y-4">
      <div class=":uno: flex items-center justify-between">
        <div class=":uno: h-7 flex items-center gap-3 text-sm text-gray-600">
          <span>
            总计: <b class=":uno: text-gray-900">{{ tasks.length }}</b>
          </span>
          <span>
            待处理:
            <b class=":uno: text-gray-900">{{ stats.pending }}</b>
          </span>
          <span>
            处理中:
            <b class=":uno: text-gray-900">{{ stats.running }}</b>
          </span>
          <span>
            成功: <b class=":uno: text-gray-900">{{ stats.completed }}</b>
          </span>
          <span>
            失败:
            <b :class="{ ':uno: !text-red-500': stats.failed > 0 }" class=":uno: text-gray-900">
              {{ stats.failed }}
            </b>
          </span>
          <span v-if="imageFiles.length > 0" class=":uno: text-blue-600">
            图片: <b>{{ imageFiles.length }}</b>
          </span>
        </div>
        <VSpace>
          <VButton v-if="stats.failed > 0" :disabled="isBusy" size="sm" @click="handleRetryAll">
            重试所有
          </VButton>
          <VButton
            type="secondary"
            :loading="isBusy"
            :disabled="stats.pending === 0"
            @click="resume"
          >
            开始导入
          </VButton>
        </VSpace>
      </div>

      <div class=":uno: rounded-base overflow-hidden border">
        <VEntityContainer>
          <VEntity v-for="task in tasks" :key="task.id">
            <template #start>
              <VEntityField>
                <template #description>
                  <div class=":uno: flex items-center gap-2">
                    <MingcuteDocumentLine class=":uno: text-blue-500" />
                    <span class=":uno: text-sm text-gray-900">
                      {{ task.meta?.name }}
                    </span>
                  </div>
                </template>
              </VEntityField>
            </template>
            <template #end>
              <VEntityField>
                <template #description>
                  <MingcuteLoading3Fill
                    v-if="task.status === 'running'"
                    class=":uno: animate-spin"
                  />
                  <MingcuteCheckCircleFill
                    v-else-if="task.status === 'fulfilled'"
                    class=":uno: text-green-500"
                  />
                  <div
                    v-else-if="task.status === 'rejected'"
                    class=":uno: inline-flex items-center gap-2"
                  >
                    <MingcuteCloseCircleLine v-tooltip="task.error?.toString()" class=":uno: text-red-500" />
                    <VButton size="sm" :disabled="isBusy" @click="retry(task.id)"> 重试 </VButton>
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
      请选择要导入的 JSON 或 ZIP 文件
    </div>
  </div>
</template>
