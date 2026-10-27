import { openSnippetPicker } from '@/components/snippet/openSnippetPicker';
import SaveSnippetBubbleItem from '@/components/snippet/SaveSnippetBubbleItem.vue';
import {
  Extension,
  TEXT_BUBBLE_MENU_KEY,
  ToolboxItem,
  type Editor,
  type ExtensionOptions,
  type Range,
} from '@halo-dev/richtext-editor';
import { markRaw } from 'vue';
import MingcuteCopy2Line from '~icons/mingcute/copy-2-line';

export const ContentSnippetExtension = Extension.create<ExtensionOptions>({
  name: 'contentSnippet',

  addOptions() {
    return {
      ...this.parent?.(),
      getCommandMenuItems() {
        return {
          priority: 75,
          icon: markRaw(MingcuteCopy2Line),
          title: '内容片段',
          keywords: ['snippet', 'pianduan', 'neirongpianduan', 'fragment'],
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            void openSnippetPicker(editor, range);
          },
        };
      },
      getBubbleMenu() {
        return {
          extendsKey: TEXT_BUBBLE_MENU_KEY,
          items: [
            {
              key: 'save-content-snippet',
              priority: 150,
              component: markRaw(SaveSnippetBubbleItem),
            },
          ],
        };
      },
      getToolboxItems({ editor }: { editor: Editor }) {
        return {
          priority: 45,
          component: markRaw(ToolboxItem),
          props: {
            editor,
            icon: markRaw(MingcuteCopy2Line),
            title: '内容片段',
            description: '插入可复用的内容片段',
            action: () => {
              void openSnippetPicker(editor);
            },
          },
        };
      },
    };
  },
});
