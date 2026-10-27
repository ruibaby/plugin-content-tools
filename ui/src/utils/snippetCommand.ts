import { contentSnippetApiClient, type ContentSnippet } from '@/api';
import type { SnippetSearchEntry } from './snippetSearch';

const pickerKeywords = ['snippet', 'pianduan', 'neirongpianduan', 'fragment', '内容片段', '片段'];

// Halo 2.26 retains the registered item and reads its keywords again for every query.
export const snippetCommandKeywords = [...pickerKeywords];

let entries: SnippetSearchEntry[] = [];
let loaded = false;
let revision = 0;
let pending: Promise<SnippetSearchEntry[]> | undefined;

function updateEntries(snippetsPromise: Promise<ContentSnippet[]>) {
  const currentRevision = ++revision;
  const task = (async () => {
    const [snippets, { createSnippetSearchEntries }] = await Promise.all([
      snippetsPromise,
      import('./snippetSearch'),
    ]);

    if (currentRevision === revision) {
      entries = createSnippetSearchEntries(snippets);
      loaded = true;
      snippetCommandKeywords.splice(
        0,
        snippetCommandKeywords.length,
        ...pickerKeywords,
        ...entries.flatMap((entry) => entry.keywords)
      );
    }

    return entries;
  })();

  pending = task;
  const clearPending = () => {
    if (pending === task) {
      pending = undefined;
    }
  };
  void task.then(clearPending, clearPending);
  return task;
}

export function setSnippetCommandSnippets(snippets: ContentSnippet[]) {
  void updateEntries(Promise.resolve(snippets)).catch((error) => {
    console.error('Failed to index content snippet commands', error);
  });
}

export function refreshSnippetCommandSnippets() {
  const request = contentSnippetApiClient.contentSnippet
    .listContentSnippet({
      sort: ['metadata.creationTimestamp,desc'],
    })
    .then(({ data }) => data.items);
  return updateEntries(request);
}

function getEntries() {
  if (pending) {
    return pending;
  }

  return loaded ? Promise.resolve(entries) : refreshSnippetCommandSnippets();
}

export async function findSnippetCommandMatches(query: string) {
  const [currentEntries, { findSnippetSearchEntries, normalizeSnippetKeyword }] = await Promise.all(
    [getEntries(), import('./snippetSearch')]
  );
  const normalizedQuery = normalizeSnippetKeyword(query);
  const exactMatches = currentEntries.filter((entry) => entry.normalizedName === normalizedQuery);
  return exactMatches.length ? exactMatches : findSnippetSearchEntries(currentEntries, query);
}

export function isSnippetPickerKeyword(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase().replace(/\s+/g, '');
  return pickerKeywords.some(
    (keyword) => keyword.toLocaleLowerCase().replace(/\s+/g, '') === normalizedQuery
  );
}
