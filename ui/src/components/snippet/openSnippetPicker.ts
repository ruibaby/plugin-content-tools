import type { Editor, Range } from '@halo-dev/richtext-editor';
import { createApp, h, type App } from 'vue';

let pickerApp: App | undefined;
let pickerContainer: HTMLDivElement | undefined;
let requestId = 0;

export function closeSnippetPicker() {
  pickerApp?.unmount();
  pickerContainer?.remove();
  pickerApp = undefined;
  pickerContainer = undefined;
}

export async function openSnippetPicker(editor: Editor, range?: Range) {
  closeSnippetPicker();

  const currentRequestId = ++requestId;

  try {
    const { default: SnippetPickerModal } = await import('./SnippetPickerModal.vue');

    if (currentRequestId !== requestId) {
      return;
    }

    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      render: () =>
        h(SnippetPickerModal, {
          editor,
          range,
          onClose: closeSnippetPicker,
        }),
    });

    pickerApp = app;
    pickerContainer = container;
    app.mount(container);
  } catch (error) {
    console.error('Failed to open content snippet picker', error);
  }
}
