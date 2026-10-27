import type { ContentSnippet } from '@/api';
import { pinyin } from 'pinyin-pro';

export interface SnippetSearchEntry {
  snippet: ContentSnippet;
  normalizedName: string;
  keywords: string[];
}

export function normalizeSnippetKeyword(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, '');
}

export function createSnippetSearchEntries(snippets: ContentSnippet[]): SnippetSearchEntry[] {
  return snippets.map((snippet) => {
    const displayName = snippet.spec.displayName;
    const fullPinyin = pinyin(displayName, {
      toneType: 'none',
      type: 'array',
      nonZh: 'consecutive',
    });
    const firstLetters = pinyin(displayName, {
      pattern: 'first',
      toneType: 'none',
      type: 'array',
      nonZh: 'consecutive',
    });
    const normalizedName = normalizeSnippetKeyword(displayName);
    const keywords = [
      ...new Set(
        [normalizedName, fullPinyin.join(''), firstLetters.join('')]
          .map(normalizeSnippetKeyword)
          .filter(Boolean)
      ),
    ];

    return {
      snippet,
      normalizedName,
      keywords,
    };
  });
}

export function findSnippetSearchEntries(entries: SnippetSearchEntry[], query: string) {
  const normalizedQuery = normalizeSnippetKeyword(query);

  if (!normalizedQuery) {
    return [];
  }

  return entries.filter((entry) =>
    entry.keywords.some((keyword) => keyword.includes(normalizedQuery))
  );
}
