import TurndownService, {
  type FilterFunction,
  type Options,
  type ReplacementFunction,
} from 'turndown';
// @ts-ignore
import { strikethrough, tables, taskListItems } from '@joplin/turndown-plugin-gfm';

function languageCodeBlock(turndownService: TurndownService) {
  turndownService.addRule('languageCodeBlock', {
    filter: function (node: HTMLElement, _options: Options) {
      if (node.nodeName !== 'PRE' || !node.firstChild) return false;

      const codeNode = node.firstChild as HTMLElement;
      return (
        codeNode.nodeName === 'CODE' &&
        codeNode.className &&
        codeNode.className.startsWith('language-')
      );
    } as FilterFunction,
    replacement: function (content: string, node: HTMLElement, options: Options) {
      const codeNode = node.firstChild as HTMLElement;
      const className = codeNode.className || '';
      const language = className.replace('language-', '');

      return (
        '\n\n' +
        options.fence +
        language +
        '\n' +
        codeNode.textContent +
        '\n' +
        options.fence +
        '\n\n'
      );
    } as ReplacementFunction,
  });
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

turndownService.use(strikethrough);
turndownService.use(tables);
turndownService.use(taskListItems);
turndownService.use(languageCodeBlock);

export default turndownService;
