import {
  NotionConfig,
  NotionDatabase,
  NotionPage,
  NotionUser,
  DatabaseQueryResponse,
  DatabaseQueryParameters,
  CreatePageParameters,
  TweetData,
  NotionError,
  AuthResult,
  SyncResult,
  MediaAsset
} from './types';
import { notionErrorHandler, withRetry, withErrorBoundary } from './error-handler';

export class NotionClient {
  private readonly apiUrl = 'https://api.notion.com/v1';
  private readonly version = '2025-09-03';
  private config: NotionConfig | null = null;

  constructor(config?: NotionConfig) {
    if (config) {
      this.config = config;
    }
  }

  setConfig(config: NotionConfig) {
    this.config = config;
  }

  getConfig(): NotionConfig | null {
    return this.config;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (!this.config?.accessToken) {
      throw new Error('Notion client not configured with access token');
    }

    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Notion-Version': this.version,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = {};
        }

        // 处理特定的Notion API错误
        const error: any = {
          code: errorData.code || `HTTP_${response.status}`,
          message: this.getErrorMessage(response.status, errorData),
          status: response.status,
          details: errorData
        };
        
        console.error('Notion API Error:', error);
        throw error;
      }

      return response.json();
    } catch (error) {
      // 处理网络错误
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw {
          code: 'NETWORK_ERROR',
          message: '网络连接失败，请检查网络设置',
          status: 0
        };
      }
      throw error;
    }
  }

  private getErrorMessage(status: number, errorData: any): string {
    const defaultMessage = errorData.message || `HTTP ${status}`;
    
    switch (status) {
      case 400:
        return '请求参数错误：' + defaultMessage;
      case 401:
        return 'Integration Token 无效或已过期，请检查您的 Token';
      case 403:
        return '权限不足：请确保您的集成已被添加到目标页面或数据库';
      case 404:
        return '资源不存在：请检查页面或数据库ID是否正确';
      case 429:
        return '请求过于频繁，请稍后再试';
      case 500:
      case 502:
      case 503:
        return 'Notion 服务暂时不可用，请稍后再试';
      default:
        return defaultMessage;
    }
  }

  // authenticate method removed - now using integration tokens directly

  async getCurrentUser(): Promise<NotionUser> {
    return this.request<NotionUser>('/users/me');
  }

  async searchPages(query: string = ''): Promise<NotionPage[]> {
    const response = await this.request<{ results: NotionPage[] }>('/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        filter: {
          property: 'object',
          value: 'page'
        },
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time'
        },
        page_size: 100
      })
    });
    return response.results;
  }

  private extractRichTextContent(textBlocks?: any[]): string {
    if (!Array.isArray(textBlocks) || textBlocks.length === 0) {
      return '';
    }

    return textBlocks
      .map(block => block?.plain_text || block?.text?.content || '')
      .join('')
      .trim();
  }

  private extractPageTitle(page: NotionPage): string {
    if (page?.properties) {
      const titleProperty = Object.values(page.properties).find((prop: any) => prop?.type === 'title');

      if (titleProperty?.title) {
        const titleText = this.extractRichTextContent(titleProperty.title);
        if (titleText) {
          return titleText;
        }
      }
    }

    if (page?.url) {
      const slug = page.url.split('/').pop();
      if (slug) {
        return decodeURIComponent(slug.replace(/-/g, ' '));
      }
    }

    return 'Untitled';
  }

  async createDatabase(parentPageId: string, title: string = 'Tweet Collection'): Promise<NotionDatabase> {
    const properties = {
      '标题': {
        title: {}
      },
      '保存时间': {
        created_time: {}
      },
      '内容': {
        rich_text: {}
      },
      '分类': {
        select: {
          options: [
            { name: '技术', color: 'blue' },
            { name: '资讯', color: 'green' },
            { name: '学习', color: 'purple' },
            { name: '工作', color: 'red' },
            { name: '生活', color: 'yellow' },
            { name: '其他', color: 'gray' }
          ]
        }
      },
      '发布时间': {
        date: {}
      },
      '推文链接': {
        url: {}
      },
      '标签': {
        multi_select: {
          options: [
            { name: '技术', color: 'blue' },
            { name: '资讯', color: 'green' },
            { name: '灵感', color: 'yellow' },
            { name: '学习', color: 'purple' },
            { name: '工作', color: 'red' }
          ]
        }
      },
      '媒体信息': {
        files: {}
      }
    };

    return this.request<NotionDatabase>('/databases', {
      method: 'POST',
      body: JSON.stringify({
        parent: { page_id: parentPageId },
        title: [
          {
            type: 'text',
            text: { content: title }
          }
        ],
        properties
      })
    });
  }

  async getDatabase(databaseId: string): Promise<NotionDatabase> {
    return this.request<NotionDatabase>(`/databases/${databaseId}`);
  }

  async queryDatabase(databaseId: string, params?: DatabaseQueryParameters): Promise<DatabaseQueryResponse> {
    return this.request<DatabaseQueryResponse>(`/databases/${databaseId}/query`, {
      method: 'POST',
      body: JSON.stringify(params || {})
    });
  }

  async checkTweetExists(databaseId: string, tweetUrl: string): Promise<boolean> {
    try {
      const response = await this.queryDatabase(databaseId, {
        filter: {
          property: '推文链接',
          url: {
            equals: tweetUrl
          }
        },
        page_size: 1
      });
      return response.results.length > 0;
    } catch (error) {
      console.error('Error checking tweet existence:', error);
      return false;
    }
  }

  async saveTweet(databaseId: string, tweetData: TweetData): Promise<SyncResult> {
    try {
      const mediaPropertyMap = await this.ensureMediaSupport(databaseId, tweetData.media?.assets || []);
      const pageData = this.formatTweetForNotion(tweetData, mediaPropertyMap);
      
      const page = await this.request<NotionPage>('/pages', {
        method: 'POST',
        body: JSON.stringify({
          parent: { database_id: databaseId },
          properties: pageData
        })
      });

      return {
        success: true,
        data: page
      };
    } catch (error) {
      return {
        success: false,
        error: (error as any).message || 'Failed to save tweet'
      };
    }
  }

  private formatTweetForNotion(tweetData: TweetData): CreatePageParameters['properties'] {
    const { content, author, username, url, publishTime, tags = [], category } = tweetData;

    const titleContent = content.slice(0, 100) + (content.length > 100 ? '...' : '');
    const richContent = `作者: ${author} (@${username})\n\n${content}`;

    const mediaAssets = media.assets || [];
    const mediaSummary = this.buildMediaSummary(mediaAssets);

    const properties: CreatePageParameters['properties'] = {
      '标题': {
        title: [
          {
            type: 'text',
            text: {
              content: titleContent
            }
          }
        ]
      },
      '内容': {
        rich_text: [
          {
            type: 'text',
            text: { content: richContent }
          }
        ]
      },
      '推文链接': {
        url: url
      },
      '发布时间': {
        date: {
          start: publishTime
        }
      },
      '分类': {
        select: {
          name: category || '其他'
        }
      },
      '标签': {
        multi_select: tags.map(tag => ({ name: tag }))
      },
      '媒体信息': {
        files: []
      }
    };

    if (mediaPropertyMap?.mediaFilesProperty) {
      properties[mediaPropertyMap.mediaFilesProperty] = {
        files: mediaAssets.map((asset, index) => ({
          name: `${asset.type}-${index + 1}`,
          type: 'external',
          external: {
            url: asset.url
          }
        }))
      };
    }

    if (mediaPropertyMap?.mediaSummaryProperty && mediaSummary) {
      properties[mediaPropertyMap.mediaSummaryProperty] = {
        rich_text: [
          {
            type: 'text',
            text: {
              content: mediaSummary
            }
          }
        ]
      };
    }

    return properties;
  }

  private buildMediaSummary(assets: MediaAsset[]): string {
    if (!assets.length) return '';

    const parts = assets.map((asset, index) => {
      const label = asset.type === 'gif' ? 'GIF' : asset.type.toUpperCase();
      const alt = asset.alt ? `（${asset.alt.slice(0, 40)}）` : '';
      return `${index + 1}. ${label} → ${asset.url}${alt}`;
    });

    return parts.join('\n');
  }

  private async ensureMediaSupport(
    databaseId: string,
    assets: MediaAsset[]
  ): Promise<{ mediaFilesProperty?: string; mediaSummaryProperty?: string }> {
    if (!assets.length) {
      // 仅返回已有的媒体属性（如果存在），避免不必要的 PATCH
      const database = await this.getDatabase(databaseId);
      return this.resolveMediaPropertyNames(database);
    }

    const database = await this.getDatabase(databaseId);
    const current = this.resolveMediaPropertyNames(database);

    const propertiesToAdd: Record<string, any> = {};

    if (!current.mediaFilesProperty) {
      propertiesToAdd['媒体文件'] = { files: {} };
      current.mediaFilesProperty = '媒体文件';
    }

    if (!current.mediaSummaryProperty) {
      propertiesToAdd['媒体摘要'] = { rich_text: {} };
      current.mediaSummaryProperty = '媒体摘要';
    }

    if (Object.keys(propertiesToAdd).length > 0) {
      await this.request<NotionDatabase>(`/databases/${databaseId}`, {
        method: 'PATCH',
        body: JSON.stringify({ properties: propertiesToAdd })
      });
    }

    return current;
  }

  private resolveMediaPropertyNames(database: NotionDatabase): {
    mediaFilesProperty?: string;
    mediaSummaryProperty?: string;
  } {
    const entries = Object.entries(database.properties || {});

    const filesProperty = entries.find(([, prop]) => prop?.type === 'files');
    const summaryProperty = database.properties['媒体摘要']?.type === 'rich_text'
      ? ['媒体摘要', database.properties['媒体摘要']]
      : entries.find(([name, prop]) => name.toLowerCase().includes('media') && prop?.type === 'rich_text');

    return {
      mediaFilesProperty: filesProperty ? filesProperty[0] : undefined,
      mediaSummaryProperty: summaryProperty ? summaryProperty[0] : undefined
    };
  }

  async getDatabaseStats(databaseId: string): Promise<{ total: number; thisMonth: number; unread: number }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [totalResponse, thisMonthResponse] = await Promise.all([
        this.queryDatabase(databaseId, { page_size: 1 }),
        this.queryDatabase(databaseId, {
          filter: {
            property: '保存时间',
            created_time: {
              on_or_after: startOfMonth.toISOString()
            }
          },
          page_size: 1
        })
      ]);

      return {
        total: totalResponse.results.length,
        thisMonth: thisMonthResponse.results.length,
        unread: 0
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { total: 0, thisMonth: 0, unread: 0 };
    }
  }

  async getUserPages(): Promise<Array<{ id: string; title: string; url: string }>> {
    try {
      const pages = await this.searchPages('');
      return pages
        .filter(page => page.parent?.type === 'workspace')
        .map(page => ({
          id: page.id,
          title: page.properties.title?.title?.[0]?.plain_text || 'Untitled',
          url: page.url
        }));
    } catch (error) {
      console.error('Error getting user pages:', error);
      return [];
    }
  }

  private extractDatabaseTitle(database: NotionDatabase): string {
    const titleText = this.extractRichTextContent(database?.title);
    return titleText || 'Untitled database';
  }

  async getUserDatabases(): Promise<Array<{ id: string; title: string; url: string }>> {
    try {
      const response = await this.request<{ results: NotionDatabase[] }>('/search', {
        method: 'POST',
        body: JSON.stringify({
          filter: {
            property: 'object',
            value: 'database'
          },
          sort: {
            direction: 'descending',
            timestamp: 'last_edited_time'
          },
          page_size: 100
        })
      });

      return response.results.map(database => ({
        id: database.id,
        title: this.extractDatabaseTitle(database),
        url: database.url
      }));
    } catch (error) {
      console.error('Error getting user databases:', error);
      return [];
    }
  }

  async getDatabaseInfo(databaseId: string): Promise<{ id: string; title: string; url: string }> {
    const database = await this.getDatabase(databaseId);
    return {
      id: database.id,
      title: this.extractDatabaseTitle(database),
      url: database.url
    };
  }

  async validateToken(): Promise<boolean> {
    try {
      console.log('Validating Notion token...');
      const user = await this.getCurrentUser();
      console.log('Token validation successful, user:', user);
      return true;
    } catch (error: any) {
      console.error('Token validation failed:', error);
      
      // 记录具体的错误信息以便调试
      if (error.status === 401) {
        console.error('Token is invalid or expired');
      } else if (error.status === 403) {
        console.error('Token lacks required permissions');
      } else if (error.code === 'NETWORK_ERROR') {
        console.error('Network error during token validation');
      }
      
      return false;
    }
  }

  clearConfig() {
    this.config = null;
  }
}
