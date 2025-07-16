import { coreApiClient } from '@halo-dev/api-client';

export async function getTagNamesByDisplayNames(displayNames?: string[]): Promise<string[]> {
  if (!displayNames || displayNames.length === 0) return [];
  const { data } = await coreApiClient.content.tag.listTag();

  const notExistDisplayNames = displayNames.filter(
    (name) => !data.items.find((item) => item.spec.displayName === name)
  );

  const promises = notExistDisplayNames.map((name) =>
    coreApiClient.content.tag.createTag({
      tag: {
        spec: {
          displayName: name,
          slug: name.toLowerCase().replace(/\s+/g, '-'),
          color: '#ffffff',
          cover: '',
        },
        apiVersion: 'content.halo.run/v1alpha1',
        kind: 'Tag',
        metadata: { name: '', generateName: 'tag-' },
      },
    })
  );

  const newTags = await Promise.all(promises);

  const existNames = data.items
    .filter((item) => displayNames.includes(item.spec.displayName))
    .map((item) => item.metadata.name);

  return [...existNames, ...newTags.map((item) => item.data.metadata.name)];
}
