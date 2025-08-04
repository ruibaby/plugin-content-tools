import TurndownService from 'turndown';
// @ts-ignore
import { gfm } from '@joplin/turndown-plugin-gfm';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
});

turndownService.use(gfm);

export default turndownService;
