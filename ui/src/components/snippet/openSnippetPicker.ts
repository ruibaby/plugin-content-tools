import { VueEditor, type Editor, type Range } from '@halo-dev/richtext-editor';
import { h, render } from 'vue';

let pickerContainer: HTMLDivElement | undefined;
let requestId = 0;

export function closeSnippetPicker() {
  if (pickerContainer) {
    render(null, pickerContainer);
    pickerContainer.remove();
    pickerContainer = undefined;
  }
}

export async function openSnippetPicker(editor: Editor, range?: Range, initialKeyword = '') {
  closeSnippetPicker();

  const currentRequestId = ++requestId;

  try {
    const { default: SnippetPickerModal } = await import('./SnippetPickerModal.vue');

    if (currentRequestId !== requestId) {
      return;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const vnode = h(SnippetPickerModal, {
      editor,
      range,
      initialKeyword,
      onClose: closeSnippetPicker,
    });

    if (editor instanceof VueEditor) {
      vnode.appContext = editor.appContext;
    }

    pickerContainer = container;
    render(vnode, container);
  } catch (error) {
    console.error('Failed to open content snippet picker', error);
  }
}
