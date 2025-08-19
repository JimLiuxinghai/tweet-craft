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
  SyncResult
} from './types';
import { notionErrorHandler, withRetry, withErrorBoundary } from './error-handler';

export class NotionClient {
  private readonly apiUrl = 'https://api.notion.com/v1';
  private readonly version = '2022-06-28';
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
        page_size: 50
      })
    });
    return response.results;
  }

  async createDatabase(parentPageId: string, title: string = 'Tweet Collection'): Promise<NotionDatabase> {
    const properties = {
      '标题': {
        title: {}
      },
      '内容': {
        rich_text: {}
      },
      '作者': {
        rich_text: {}
      },
      '作者用户名': {
        rich_text: {}
      },
      '推文链接': {
        url: {}
      },
      '发布时间': {
        date: {}
      },
      '保存时间': {
        created_time: {}
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
      '类型': {
        select: {
          options: [
            { name: '原创推文', color: 'blue' },
            { name: '转推', color: 'green' },
            { name: '引用推文', color: 'yellow' },
            { name: '回复', color: 'gray' }
          ]
        }
      },
      '优先级': {
        select: {
          options: [
            { name: '高', color: 'red' },
            { name: '中', color: 'yellow' },
            { name: '低', color: 'gray' }
          ]
        }
      },
      '包含图片': {
        checkbox: {}
      },
      '包含视频': {
        checkbox: {}
      },
      '包含链接': {
        checkbox: {}
      },
      '点赞数': {
        number: {}
      },
      '转推数': {
        number: {}
      },
      '回复数': {
        number: {}
      },
      '已读': {
        checkbox: {}
      },
      '收藏': {
        checkbox: {}
      },
      '状态': {
        select: {
          options: [
            { name: '待阅读', color: 'yellow' },
            { name: '已阅读', color: 'green' },
            { name: '已归档', color: 'gray' }
          ]
        }
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
      const pageData = this.formatTweetForNotion(tweetData);
      
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
    const { content, author, username, url, publishTime, type, media, stats, tags = [], category } = tweetData;

    return {
      '标题': {
        title: [
          {
            type: 'text',
            text: {
              content: content.slice(0, 100) + (content.length > 100 ? '...' : '')
            }
          }
        ]
      },
      '内容': {
        rich_text: [
          {
            type: 'text',
            text: { content }
          }
        ]
      },
      '作者': {
        rich_text: [
          {
            type: 'text',
            text: { content: author }
          }
        ]
      },
      '作者用户名': {
        rich_text: [
          {
            type: 'text',
            text: { content: username }
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
      '类型': {
        select: {
          name: type
        }
      },
      '标签': {
        multi_select: tags.map(tag => ({ name: tag }))
      },
      '包含图片': {
        checkbox: media.hasImages || false
      },
      '包含视频': {
        checkbox: media.hasVideo || false
      },
      '包含链接': {
        checkbox: media.hasLinks || false
      },
      '点赞数': {
        number: stats.likes || 0
      },
      '转推数': {
        number: stats.retweets || 0
      },
      '回复数': {
        number: stats.replies || 0
      },
      '状态': {
        select: {
          name: '待阅读'
        }
      },
      '已读': {
        checkbox: false
      },
      '收藏': {
        checkbox: false
      },
      '优先级': {
        select: {
          name: '中'
        }
      },
      '分类': {
        select: {
          name: category || '其他'
        }
      }
    };
  }

  async getDatabaseStats(databaseId: string): Promise<{ total: number; thisMonth: number; unread: number }> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const [totalResponse, thisMonthResponse, unreadResponse] = await Promise.all([
        this.queryDatabase(databaseId, { page_size: 1 }),
        this.queryDatabase(databaseId, {
          filter: {
            property: '保存时间',
            created_time: {
              on_or_after: startOfMonth.toISOString()
            }
          },
          page_size: 1
        }),
        this.queryDatabase(databaseId, {
          filter: {
            property: '已读',
            checkbox: {
              equals: false
            }
          },
          page_size: 1
        })
      ]);

      return {
        total: totalResponse.results.length,
        thisMonth: thisMonthResponse.results.length,
        unread: unreadResponse.results.length
      };
    } catch (error) {
      console.error('Error getting database stats:', error);
      return { total: 0, thisMonth: 0, unread: 0 };
    }
  }

  async getUserPages(): Promise<Array<{ id: string; title: string; url: string }>> {
    try {
      const pages = await this.searchPages('');
      return pages.map(page => ({
        id: page.id,
        title: page.properties.title?.title?.[0]?.plain_text || 'Untitled',
        url: page.url
      }));
    } catch (error) {
      console.error('Error getting user pages:', error);
      return [];
    }
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