import { coreApiClient } from '@halo-dev/api-client';

export async function getCategoryNamesByDisplayNames(displayNames?: string[]): Promise<string[]> {
  if (!displayNames || displayNames.length === 0) return [];

  const { data } = await coreApiClient.content.category.listCategory();

  const notExistDisplayNames = displayNames.filter(
    (name) => !data.items.find((item) => item.spec.displayName === name)
  );

  const newCategories = await Promise.all(
    notExistDisplayNames.map((name, index) =>
      coreApiClient.content.category.createCategory({
        category: {
          spec: {
            displayName: name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            description: '',
            cover: '',
            template: '',
            priority: data.items.length + index,
            children: [],
          },
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Category',
          metadata: { name: '', generateName: 'category-' },
        },
      })
    )
  );

  const existNames = data.items
    .filter((item) => displayNames.includes(item.spec.displayName))
    .map((item) => item.metadata.name);

  return [...existNames, ...newCategories.map((item) => item.data.metadata.name)];
}
