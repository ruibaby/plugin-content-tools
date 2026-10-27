import { openSnippetPicker } from '@/components/snippet/openSnippetPicker';
import SaveSnippetBubbleItem from '@/components/snippet/SaveSnippetBubbleItem.vue';
import { insertContentSnippet } from '@/utils/snippet';
import {
  findSnippetCommandMatches,
  isSnippetPickerKeyword,
  refreshSnippetCommandSnippets,
  snippetCommandKeywords,
} from '@/utils/snippetCommand';
import { Toast } from '@halo-dev/components';
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

function getCommandQuery(editor: Editor, range: Range) {
  const text = editor.state.doc.textBetween(range.from, range.to).trim();
  return text.startsWith('/') || text.startsWith('、') ? text.slice(1).trim() : text;
}

async function handleCommand(editor: Editor, range: Range) {
  const query = getCommandQuery(editor, range);

  if (!query || isSnippetPickerKeyword(query)) {
    await openSnippetPicker(editor, range);
    return;
  }

  try {
    const docBefore = editor.state.doc;
    const matches = await findSnippetCommandMatches(query);

    if (editor.state.doc !== docBefore) {
      Toast.warning('文档已变化，请重新输入 / 插入内容片段');
      return;
    }

    if (matches.length === 1) {
      if (!insertContentSnippet(editor, matches[0].snippet, range)) {
        Toast.error('插入内容片段失败');
      }
      return;
    }

    await openSnippetPicker(editor, range, matches.length ? query : '');
  } catch (error) {
    console.error('Failed to resolve content snippet command', error);
    Toast.error('加载内容片段失败');
  }
}

export const ContentSnippetExtension = Extension.create<ExtensionOptions>({
  name: 'contentSnippet',

  onCreate() {
    void refreshSnippetCommandSnippets().catch((error) => {
      console.error('Failed to initialize content snippet commands', error);
    });
  },

  addOptions() {
    return {
      ...this.parent?.(),
      getCommandMenuItems() {
        return {
          priority: 75,
          icon: markRaw(MingcuteCopy2Line),
          title: '内容片段',
          keywords: snippetCommandKeywords,
          command: ({ editor, range }: { editor: Editor; range: Range }) => {
            void handleCommand(editor, range);
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
