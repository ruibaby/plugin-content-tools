<script lang="ts" setup>
import { VCard, VLoading, VPageHeader, VTabbar } from '@halo-dev/components';
import { useLocalStorage } from '@vueuse/core';
import { defineAsyncComponent } from 'vue';
import MingcuteFileImportLine from '~icons/mingcute/file-import-line';

const tabs = [
  {
    id: 'markdown',
    label: 'Markdown 导入',
    component: defineAsyncComponent({
      loader: () => import('./tabs/MarkdownImport.vue'),
      loadingComponent: VLoading,
    }),
  },
  {
    id: 'word',
    label: 'Word（.docx） 导入',
    component: defineAsyncComponent({
      loader: () => import('./tabs/WordImport.vue'),
      loadingComponent: VLoading,
    }),
  },
];

const activeTab = useLocalStorage('plugin:content-tools:import-active-tab', 'markdown');
</script>
<template>
  <VPageHeader title="文章导入">
    <template #icon>
      <MingcuteFileImportLine />
    </template>
  </VPageHeader>
  <div class=":uno: m-2 md:m-4">
    <VCard>
      <template #header>
        <VTabbar
          v-model:active-id="activeTab"
          :items="tabs.map((item) => ({ id: item.id, label: item.label }))"
          class=":uno: w-full !rounded-none"
          type="outline"
        ></VTabbar>
      </template>
      <div class=":uno: bg-white">
        <template v-for="tab in tabs" :key="tab.id">
          <component :is="tab.component" v-if="activeTab === tab.id" />
        </template>
      </div>
    </VCard>
  </div>
</template>
