export { NotionClient } from './client';
export { NotionButtonManager } from './button-manager';
export { TweetExtractor } from './tweet-extractor';
export { notionAuthManager } from './auth';
export { notionErrorHandler, withRetry, withErrorBoundary } from './error-handler';
export * from './types';

import { NotionClient } from './client';

export const notionClient = new NotionClient();

export function createNotionClient(config?: import('./types').NotionConfig) {
  return new NotionClient(config);
}