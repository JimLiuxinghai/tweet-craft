import { notionClient, NotionConfig, AuthResult } from './index';

export class NotionAuthManager {
  private static instance: NotionAuthManager;
  private config: NotionConfig | null = null;
  private readonly STORAGE_KEYS = {
    ACCESS_TOKEN: 'notion_access_token',
    DATABASE_ID: 'notion_database_id',
    WORKSPACE_NAME: 'notion_workspace_name',
    WORKSPACE_ID: 'notion_workspace_id'
  };

  private constructor() {}

  static getInstance(): NotionAuthManager {
    if (!NotionAuthManager.instance) {
      NotionAuthManager.instance = new NotionAuthManager();
    }
    return NotionAuthManager.instance;
  }

  async loadConfig(): Promise<NotionConfig | null> {
    try {
      const result = await chrome.storage.sync.get([
        this.STORAGE_KEYS.ACCESS_TOKEN,
        this.STORAGE_KEYS.DATABASE_ID,
        this.STORAGE_KEYS.WORKSPACE_NAME,
        this.STORAGE_KEYS.WORKSPACE_ID
      ]);

      if (result[this.STORAGE_KEYS.ACCESS_TOKEN]) {
        this.config = {
          accessToken: result[this.STORAGE_KEYS.ACCESS_TOKEN],
          databaseId: result[this.STORAGE_KEYS.DATABASE_ID],
          workspaceName: result[this.STORAGE_KEYS.WORKSPACE_NAME],
          workspaceId: result[this.STORAGE_KEYS.WORKSPACE_ID]
        };

        notionClient.setConfig(this.config);
        return this.config;
      }

      return null;
    } catch (error) {
      console.error('Error loading Notion config:', error);
      return null;
    }
  }

  async saveConfig(config: Partial<NotionConfig>): Promise<void> {
    const updateData: any = {};

    if (config.accessToken) {
      updateData[this.STORAGE_KEYS.ACCESS_TOKEN] = config.accessToken;
    }
    if (config.databaseId !== undefined) {
      updateData[this.STORAGE_KEYS.DATABASE_ID] = config.databaseId;
    }
    if (config.workspaceName) {
      updateData[this.STORAGE_KEYS.WORKSPACE_NAME] = config.workspaceName;
    }
    if (config.workspaceId) {
      updateData[this.STORAGE_KEYS.WORKSPACE_ID] = config.workspaceId;
    }

    await chrome.storage.sync.set(updateData);

    if (this.config) {
      this.config = { ...this.config, ...config } as NotionConfig;
    } else {
      const currentConfig = await this.loadConfig();
      if (currentConfig) {
        this.config = { ...currentConfig, ...config } as NotionConfig;
      }
    }

    if (this.config?.accessToken) {
      notionClient.setConfig(this.config);
    }
  }

  async clearConfig(): Promise<void> {
    await chrome.storage.sync.remove([
      this.STORAGE_KEYS.ACCESS_TOKEN,
      this.STORAGE_KEYS.DATABASE_ID,
      this.STORAGE_KEYS.WORKSPACE_NAME,
      this.STORAGE_KEYS.WORKSPACE_ID
    ]);

    this.config = null;
    notionClient.clearConfig();
  }

  async isConnected(): Promise<boolean> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.accessToken) {
      return false;
    }

    return notionClient.validateToken();
  }

  async authenticate(): Promise<AuthResult> {
    try {
      console.log('Starting Notion authentication...');
      const integrationToken = await this.getIntegrationToken();
      console.log('Integration token retrieved, length:', integrationToken.length);
      
      // 验证token格式
      if (!integrationToken.startsWith('secret_') && !integrationToken.startsWith('ntn_')) {
        throw new Error('Integration Token 格式错误，应该以 "secret_" 或 "ntn_" 开头');
      }
      
      this.config = {
        accessToken: integrationToken,
        workspaceName: 'My Workspace',
        workspaceId: 'workspace'
      };

      // 先设置配置，再验证
      notionClient.setConfig(this.config);
      console.log('Config set, validating token...');
      
      const isValid = await notionClient.validateToken();
      
      if (isValid) {
        // 验证成功后保存配置
        await this.saveConfig(this.config);
        console.log('Authentication successful');
        
        return {
          success: true,
          data: {
            access_token: integrationToken,
            workspace_name: 'My Workspace',
            workspace_id: 'workspace'
          }
        };
      } else {
        // 验证失败，清除配置
        this.config = null;
        notionClient.clearConfig();
        
        return {
          success: false,
          error: 'Token验证失败，请检查您的Integration Token是否正确，并确保已将集成添加到相关页面'
        };
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // 清除无效配置
      this.config = null;
      notionClient.clearConfig();
      
      let errorMessage = 'Authentication failed';
      if (error.message) {
        errorMessage = error.message;
      } else if (error.status === 401) {
        errorMessage = 'Integration Token 无效或已过期';
      } else if (error.status === 403) {
        errorMessage = '权限不足，请确保集成已被添加到目标页面';
      } else if (error.code === 'NETWORK_ERROR') {
        errorMessage = '网络连接失败，请检查网络设置';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  async disconnect(): Promise<void> {
    await this.clearConfig();
  }

  private async getIntegrationToken(): Promise<string> {
    try {
      const result = await chrome.storage.sync.get(['notion_integration_token']);
      console.log('Storage result for integration token:', result);
      
      const token = result.notion_integration_token;
      if (!token) {
        throw new Error('请在 Notion 设置中配置 Integration Token');
      }
      
      // 基本格式验证
      if (typeof token !== 'string' || token.trim().length === 0) {
        throw new Error('Integration Token 不能为空');
      }
      
      const trimmedToken = token.trim();
      if (!trimmedToken.startsWith('secret_') && !trimmedToken.startsWith('ntn_')) {
        throw new Error('Integration Token 格式错误，应该以 "secret_" 或 "ntn_" 开头');
      }
      
      if (trimmedToken.length < 50) {
        throw new Error('Integration Token 长度不正确，请检查是否完整');
      }
      
      console.log('Valid integration token found, length:', trimmedToken.length);
      return trimmedToken;
    } catch (error) {
      console.error('Failed to get integration token:', error);
      throw error;
    }
  }

  getCurrentConfig(): NotionConfig | null {
    return this.config;
  }
}

export const notionAuthManager = NotionAuthManager.getInstance();