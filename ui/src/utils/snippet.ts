import type { ContentSnippet } from '@/api';
import type { Editor, Range } from '@halo-dev/richtext-editor';

export function getSnippetTextPreview(html: string, maxLength = 120) {
  const element = document.createElement('div');
  element.innerHTML = html;
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}…`;
}

export function insertContentSnippet(editor: Editor, snippet: ContentSnippet, range?: Range) {
  const { selection } = editor.state;
  const position = range ?? { from: selection.from, to: selection.to };
  const from = position.from;

  if (!editor.chain().focus().insertContentAt(position, snippet.spec.content).run()) {
    return false;
  }

  const to = editor.state.selection.from;

  if (to > from) {
    editor.chain().focus().setTextSelection({ from, to }).run();
  }

  return true;
}
