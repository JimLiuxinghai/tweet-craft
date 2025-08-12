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
      this.config = { ...this.config, ...config };
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
      const redirectURL = chrome.identity.getRedirectURL();
      const clientId = await this.getClientId();
      const authUrl = this.generateAuthUrl(clientId, redirectURL);

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      if (!responseUrl) {
        return {
          success: false,
          error: 'Authentication was cancelled'
        };
      }

      const code = this.extractAuthCode(responseUrl);
      if (!code) {
        return {
          success: false,
          error: 'Failed to extract authorization code'
        };
      }

      const clientSecret = await this.getClientSecret();
      const authResult = await notionClient.authenticate(code, redirectURL, clientId, clientSecret);

      if (authResult.success) {
        this.config = {
          accessToken: authResult.data.access_token,
          workspaceName: authResult.data.workspace_name,
          workspaceId: authResult.data.workspace_id
        };

        await this.saveConfig(this.config);
        notionClient.setConfig(this.config);
      }

      return authResult;
    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  async disconnect(): Promise<void> {
    await this.clearConfig();
  }

  private generateAuthUrl(clientId: string, redirectUri: string): string {
    const scopes = ['read', 'write'];
    return `https://api.notion.com/v1/oauth/authorize?` +
           `client_id=${clientId}&` +
           `response_type=code&` +
           `owner=user&` +
           `redirect_uri=${encodeURIComponent(redirectUri)}&` +
           `scope=${scopes.join(',')}`;
  }

  private extractAuthCode(responseUrl: string): string | null {
    try {
      const url = new URL(responseUrl);
      return url.searchParams.get('code');
    } catch (error) {
      console.error('Error extracting auth code:', error);
      return null;
    }
  }

  private async getClientId(): Promise<string> {
    // For public integration, users need to create their own Notion integration
    // This will be handled through the settings UI where users can input their own credentials
    const result = await chrome.storage.sync.get(['notion_client_id']);
    if (result.notion_client_id) {
      return result.notion_client_id;
    }
    throw new Error('请在 Notion 设置中配置 Client ID');
  }

  private async getClientSecret(): Promise<string> {
    // For public integration, users need to create their own Notion integration
    // This will be handled through the settings UI where users can input their own credentials
    const result = await chrome.storage.sync.get(['notion_client_secret']);
    if (result.notion_client_secret) {
      return result.notion_client_secret;
    }
    throw new Error('请在 Notion 设置中配置 Client Secret');
  }

  getCurrentConfig(): NotionConfig | null {
    return this.config;
  }
}

export const notionAuthManager = NotionAuthManager.getInstance();