import { axiosInstance } from '@halo-dev/api-client';
import { ContentSnippetV1alpha1Api } from './generated';

export const contentSnippetApiClient = {
  contentSnippet: new ContentSnippetV1alpha1Api(undefined, '', axiosInstance),
};

export type { ContentSnippet, ContentSnippetList, ContentSnippetSpec } from './generated';
