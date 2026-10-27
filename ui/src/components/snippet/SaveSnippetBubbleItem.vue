<script setup lang="ts">
import { Toast } from '@halo-dev/components';
import {
  BubbleItem,
  getHTMLFromFragment,
  type BubbleItemComponentProps,
} from '@halo-dev/richtext-editor';
import { defineAsyncComponent, shallowRef } from 'vue';
import MingcuteSave2Line from '~icons/mingcute/save-2-line';

const SaveSnippetModal = defineAsyncComponent(() => import('./SaveSnippetModal.vue'));

const { editor } = defineProps<BubbleItemComponentProps>();

const snippetContent = shallowRef<string>();

function handleOpen() {
  const { selection } = editor.state;

  if (selection.empty || !editor.state.doc.textBetween(selection.from, selection.to).trim()) {
    Toast.warning('请先选择要保存的内容');
    return;
  }

  snippetContent.value = getHTMLFromFragment(selection.content().content, editor.schema);
}
</script>

<template>
  <BubbleItem :editor="editor" :icon="MingcuteSave2Line" title="保存为片段" :action="handleOpen" />
  <SaveSnippetModal
    v-if="snippetContent"
    :content="snippetContent"
    @close="snippetContent = undefined"
  />
</template>
