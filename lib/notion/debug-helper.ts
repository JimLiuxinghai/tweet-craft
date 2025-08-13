/**
 * Notion 调试助手
 * 用于诊断连接问题和提供详细的错误信息
 */

import { notionClient, notionAuthManager } from './index';

export interface DiagnosticResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export class NotionDebugHelper {
  private static instance: NotionDebugHelper;

  static getInstance(): NotionDebugHelper {
    if (!NotionDebugHelper.instance) {
      NotionDebugHelper.instance = new NotionDebugHelper();
    }
    return NotionDebugHelper.instance;
  }

  /**
   * 运行完整的诊断流程
   */
  async runDiagnostics(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];

    // 1. 检查存储中的 token
    results.push(await this.checkStoredToken());

    // 2. 检查配置加载
    results.push(await this.checkConfigLoading());

    // 3. 测试网络连接
    results.push(await this.checkNetworkConnection());

    // 4. 验证 token 格式
    results.push(await this.checkTokenFormat());

    // 5. 测试 API 调用
    results.push(await this.checkApiCall());

    // 6. 检查权限
    results.push(await this.checkPermissions());

    return results;
  }

  private async checkStoredToken(): Promise<DiagnosticResult> {
    try {
      const result = await chrome.storage.sync.get(['notion_integration_token']);
      const token = result.notion_integration_token;

      if (!token) {
        return {
          step: '存储检查',
          success: false,
          message: '未找到存储的 Integration Token',
          details: { hasToken: false }
        };
      }

      return {
        step: '存储检查',
        success: true,
        message: `找到 Integration Token，长度: ${token.length}`,
        details: { 
          hasToken: true, 
          tokenLength: token.length,
          startsWithSecret: token.startsWith('secret_')
        }
      };
    } catch (error) {
      return {
        step: '存储检查',
        success: false,
        message: '读取存储失败: ' + error,
        details: { error }
      };
    }
  }

  private async checkConfigLoading(): Promise<DiagnosticResult> {
    try {
      const config = await notionAuthManager.loadConfig();
      
      if (!config) {
        return {
          step: '配置加载',
          success: false,
          message: '无法加载 Notion 配置',
          details: { config: null }
        };
      }

      return {
        step: '配置加载',
        success: true,
        message: '配置加载成功',
        details: { 
          hasAccessToken: !!config.accessToken,
          hasDatabaseId: !!config.databaseId,
          workspaceName: config.workspaceName
        }
      };
    } catch (error) {
      return {
        step: '配置加载',
        success: false,
        message: '配置加载失败: ' + error,
        details: { error }
      };
    }
  }

  private async checkNetworkConnection(): Promise<DiagnosticResult> {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        method: 'HEAD'
      });

      return {
        step: '网络连接',
        success: true,
        message: `网络连接正常，状态码: ${response.status}`,
        details: { status: response.status, ok: response.ok }
      };
    } catch (error: any) {
      return {
        step: '网络连接',
        success: false,
        message: '网络连接失败: ' + error.message,
        details: { error: error.message }
      };
    }
  }

  private async checkTokenFormat(): Promise<DiagnosticResult> {
    try {
      const result = await chrome.storage.sync.get(['notion_integration_token']);
      const token = result.notion_integration_token;

      if (!token) {
        return {
          step: 'Token 格式',
          success: false,
          message: 'Token 不存在',
          details: {}
        };
      }

      const checks = {
        isString: typeof token === 'string',
        notEmpty: token.trim().length > 0,
        startsWithSecret: token.startsWith('secret_'),
        hasCorrectLength: token.length >= 50,
        noWhitespace: token === token.trim()
      };

      const allValid = Object.values(checks).every(Boolean);

      return {
        step: 'Token 格式',
        success: allValid,
        message: allValid ? 'Token 格式正确' : 'Token 格式有问题',
        details: checks
      };
    } catch (error) {
      return {
        step: 'Token 格式',
        success: false,
        message: '检查 Token 格式失败: ' + error,
        details: { error }
      };
    }
  }

  private async checkApiCall(): Promise<DiagnosticResult> {
    try {
      const isValid = await notionClient.validateToken();
      
      if (isValid) {
        const user = await notionClient.getCurrentUser();
        return {
          step: 'API 调用',
          success: true,
          message: 'API 调用成功',
          details: { 
            userId: user.id,
            userName: user.name,
            userType: user.type
          }
        };
      } else {
        return {
          step: 'API 调用',
          success: false,
          message: 'Token 验证失败',
          details: { validated: false }
        };
      }
    } catch (error: any) {
      return {
        step: 'API 调用',
        success: false,
        message: 'API 调用失败: ' + (error.message || error),
        details: { 
          error: error.message || error,
          status: error.status,
          code: error.code
        }
      };
    }
  }

  private async checkPermissions(): Promise<DiagnosticResult> {
    try {
      const pages = await notionClient.getUserPages();
      
      return {
        step: '权限检查',
        success: true,
        message: `可访问 ${pages.length} 个页面`,
        details: { 
          pageCount: pages.length,
          pages: pages.slice(0, 3).map(p => ({ id: p.id, title: p.title }))
        }
      };
    } catch (error: any) {
      return {
        step: '权限检查',
        success: false,
        message: '权限检查失败: ' + (error.message || error),
        details: { 
          error: error.message || error,
          status: error.status,
          code: error.code
        }
      };
    }
  }

  /**
   * 生成诊断报告
   */
  generateReport(results: DiagnosticResult[]): string {
    const timestamp = new Date().toISOString();
    let report = `Notion 连接诊断报告\n`;
    report += `生成时间: ${timestamp}\n`;
    report += `${'='.repeat(50)}\n\n`;

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    report += `总体状态: ${successCount}/${totalCount} 项检查通过\n\n`;

    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      report += `${index + 1}. ${status} ${result.step}\n`;
      report += `   ${result.message}\n`;
      
      if (result.details && Object.keys(result.details).length > 0) {
        report += `   详细信息: ${JSON.stringify(result.details, null, 2)}\n`;
      }
      report += '\n';
    });

    // 添加建议
    const failedResults = results.filter(r => !r.success);
    if (failedResults.length > 0) {
      report += '建议解决方案:\n';
      report += '-'.repeat(20) + '\n';
      
      failedResults.forEach(result => {
        report += `• ${result.step}: ${this.getSuggestion(result)}\n`;
      });
    }

    return report;
  }

  private getSuggestion(result: DiagnosticResult): string {
    switch (result.step) {
      case '存储检查':
        return '请在扩展设置中输入有效的 Integration Token';
      case '配置加载':
        return '请重新连接 Notion 账户';
      case '网络连接':
        return '请检查网络连接，确认可以访问 notion.so';
      case 'Token 格式':
        return '请检查 Token 格式，确保以 secret_ 开头且完整无误';
      case 'API 调用':
        if (result.details?.status === 401) {
          return '请检查 Integration Token 是否有效';
        } else if (result.details?.status === 403) {
          return '请确保集成已被添加到相关页面';
        }
        return '请检查 Token 和网络连接';
      case '权限检查':
        return '请确保集成已被添加到至少一个页面';
      default:
        return '请查看详细错误信息并联系技术支持';
    }
  }
}

export const notionDebugHelper = NotionDebugHelper.getInstance();

