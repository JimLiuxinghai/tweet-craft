// 错误恢复系统 - 自动错误恢复和用户引导

import { ExtensionError, ErrorType, ErrorLevel, errorHandler } from './error-handler';
import { errorNotificationManager } from './error-notification';
import { i18nManager } from '../i18n';

/**
 * 错误恢复策略接口
 */
interface RecoveryStrategy {
  id: string;
  name: string;
  canRecover: (error: ExtensionError) => boolean;
  recover: (error: ExtensionError, context?: any) => Promise<RecoveryResult>;
  priority: number;
}

/**
 * 恢复结果接口
 */
interface RecoveryResult {
  success: boolean;
  data?: any;
  message?: string;
  requiresUserAction?: boolean;
  nextAttemptDelay?: number;
}

/**
 * 错误恢复管理器
 */
export class ErrorRecoveryManager {
  private strategies: RecoveryStrategy[] = [];
  private recoveryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  private baseRetryDelay = 1000; // 1秒

  constructor() {
    this.initializeBuiltInStrategies();
  }

  /**
   * 注册恢复策略
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
 this.strategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 尝试从错误中恢复
   */
  async attemptRecovery(
    error: ExtensionError,
    context?: any
  ): Promise<RecoveryResult> {
    const errorKey = this.generateErrorKey(error);
    const attempts = this.recoveryAttempts.get(errorKey) || 0;

    // 检查是否超过最大重试次数
    if (attempts >= this.maxRetryAttempts) {
  return {
    success: false,
        message: i18nManager.t('error.max_retries_exceeded'),
      requiresUserAction: true
      };
    }

    // 增加重试计数
    this.recoveryAttempts.set(errorKey, attempts + 1);

    // 寻找合适的恢复策略
    const strategy = this.findRecoveryStrategy(error);
    if (!strategy) {
      return {
        success: false,
        message: i18nManager.t('error.no_recovery_strategy'),
   requiresUserAction: true
      };
    }

    try {
      console.log(`Attempting recovery with strategy: ${strategy.name}`);
      const result = await strategy.recover(error, context);

      if (result.success) {
    // 恢复成功，清除重试计数
        this.recoveryAttempts.delete(errorKey);
        this.showRecoverySuccess(strategy, error);
      } else if (result.nextAttemptDelay) {
        // 需要延迟重试
        setTimeout(() => {
          this.attemptRecovery(error, context);
      }, result.nextAttemptDelay);
      }

      return result;
    } catch (recoveryError) {
      console.error(`Recovery strategy ${strategy.name} failed:`, recoveryError);
      return {
        success: false,
        message: i18nManager.t('error.recovery_failed'),
    requiresUserAction: true
      };
    }
  }

  /**
   * 初始化内置恢复策略
   */
  private initializeBuiltInStrategies(): void {
    // 网络重试策略
    this.registerStrategy({
      id: 'network-retry',
      name: 'Network Retry',
      canRecover: (error) => error.type === ErrorType.NETWORK,
      recover: async (error) => {
        // 检查网络连接
        const isOnline = navigator.onLine;
        if (!isOnline) {
          return {
            success: false,
      message: i18nManager.t('error.network_offline'),
        requiresUserAction: true
          };
        }

        // 延迟重试
        await this.delay(this.baseRetryDelay * 2);
        
     return {
   success: true,
  message: i18nManager.t('success.network_recovered')
        };
    },
 priority: 10
    });

// 剪贴板权限恢复策略
    this.registerStrategy({
      id: 'clipboard-permission',
      name: 'Clipboard Permission Recovery',
      canRecover: (error) => 
        error.type === ErrorType.CLIPBOARD && 
  error.message.includes('permission'),
    recover: async (error, context) => {
        try {
          // 尝试请求剪贴板权限
     const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
        
  if (permission.state === 'granted') {
 return {
         success: true,
     message: i18nManager.t('success.permission_granted')
       };
 } else if (permission.state === 'prompt') {
   return {
            success: false,
              message: i18nManager.t('error.permission_prompt_required'),
     requiresUserAction: true
            };
     } else {
 return {
         success: false,
              message: i18nManager.t('error.permission_denied'),
           requiresUserAction: true
    };
}
     } catch (permissionError) {
 return {
   success: false,
    message: i18nManager.t('error.permission_check_failed'),
            requiresUserAction: true
      };
        }
      },
      priority: 8
    });

    // DOM元素重新查找策略
    this.registerStrategy({
      id: 'dom-refind',
      name: 'DOM Element Refind',
      canRecover: (error) => error.type === ErrorType.DOM,
      recover: async (error, context) => {
      // 等待一段时间让页面完全加载
  await this.delay(1000);

        // 尝试使用更通用的选择器
     const fallbackSelectors = [
          'article[data-testid="tweet"]',
          'div[data-testid="tweet"]',
            '[role="article"]'
        ];

    for (const selector of fallbackSelectors) {
  const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            return {
          success: true,
              data: elements,
              message: i18nManager.t('success.elements_found')
 };
      }
        }

  return {
    success: false,
          message: i18nManager.t('error.elements_still_not_found'),
 requiresUserAction: true
        };
  },
  priority: 6
    });

    // 存储清理策略
    this.registerStrategy({
      id: 'storage-cleanup',
      name: 'Storage Cleanup',
      canRecover: (error) => 
        error.type === ErrorType.STORAGE || 
        error.message.includes('quota'),
      recover: async (error) => {
        try {
  // 清理旧的缓存数据
     if (typeof browser !== 'undefined' && browser.storage) {
            const data = await browser.storage.local.get();
 const keys = Object.keys(data);
            
     // 删除超过7天的数据
  const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const keysToRemove = keys.filter(key => {
    const item = data[key];
  return item.timestamp && item.timestamp < cutoff;
         });

     if (keysToRemove.length > 0) {
    await browser.storage.local.remove(keysToRemove);
              return {
    success: true,
       message: i18nManager.t('success.storage_cleaned', {
           count: keysToRemove.length
            })
     };
         }
       }

          // 清理 localStorage
          if (typeof localStorage !== 'undefined') {
 const keysToRemove: string[] = [];
     for (let i = 0; i < localStorage.length; i++) {
           const key = localStorage.key(i);
          if (key && key.startsWith('tsc_')) {
     try {
           const item = JSON.parse(localStorage.getItem(key) || '{}');
      if (item.timestamp && item.timestamp < Date.now() - (7 * 24 * 60 * 60 * 1000)) {
     keysToRemove.push(key);
     }
                } catch (e) {
      // 删除无效的数据
             keysToRemove.push(key);
          }
         }
            }

            keysToRemove.forEach(key => localStorage.removeItem(key));
        
      if (keysToRemove.length > 0) {
   return {
       success: true,
             message: i18nManager.t('success.storage_cleaned', {
           count: keysToRemove.length
      })
        };
}
          }

          return {
            success: false,
            message: i18nManager.t('error.no_storage_to_clean'),
       requiresUserAction: true
          };
   } catch (cleanupError) {
       return {
   success: false,
      message: i18nManager.t('error.storage_cleanup_failed'),
      requiresUserAction: true
          };
     }
      },
      priority: 4
    });

    // 内存清理策略
  this.registerStrategy({
    id: 'memory-cleanup',
      name: 'Memory Cleanup',
      canRecover: (error) => 
        error.type === ErrorType.MEMORY || 
        error.level === ErrorLevel.CRITICAL,
      recover: async (error) => {
      // 强制垃圾回收（如果可用）
        if (typeof window !== 'undefined' && 'gc' in window) {
      try {
     (window as any).gc();
       } catch (e) {
          // gc 可能不可用
   }
        }

        // 清理可能的内存泄漏
   // 清除事件监听器引用
        const events = ['error', 'unhandledrejection', 'localeChanged'];
        events.forEach(eventName => {
          const oldListeners = (window as any)[`__tsc_${eventName}_listeners`] || [];
          oldListeners.forEach((listener: any) => {
       window.removeEventListener(eventName, listener);
 });
          (window as any)[`__tsc_${eventName}_listeners`] = [];
     });

        return {
          success: true,
     message: i18nManager.t('success.memory_cleaned')
        };
      },
      priority: 9
    });

    // 页面刷新策略（最后的手段）
    this.registerStrategy({
    id: 'page-refresh',
      name: 'Page Refresh',
    canRecover: (error) => 
        error.level === ErrorLevel.FATAL || 
        error.level === ErrorLevel.CRITICAL,
      recover: async (error) => {
        return {
   success: false,
   message: i18nManager.t('error.requires_page_refresh'),
          requiresUserAction: true
        };
      },
      priority: 1
    });
  }

  /**
   * 寻找恢复策略
   */
  private findRecoveryStrategy(error: ExtensionError): RecoveryStrategy | null {
    return this.strategies.find(strategy => strategy.canRecover(error)) || null;
  }

  /**
   * 生成错误键
   */
  private generateErrorKey(error: ExtensionError): string {
    return `${error.type}_${error.level}_${error.message.substring(0, 50)}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 显示恢复成功消息
   */
  private showRecoverySuccess(strategy: RecoveryStrategy, error: ExtensionError): void {
    errorNotificationManager.showSuccess('success.error_recovered', {
      strategy: strategy.name,
  errorType: error.type
    });
  }

  /**
   * 获取恢复统计
   */
  getRecoveryStats(): { 
    totalAttempts: number; 
    strategies: { id: string; name: string; }[] 
  } {
    return {
      totalAttempts: Array.from(this.recoveryAttempts.values()).reduce((a, b) => a + b, 0),
      strategies: this.strategies.map(s => ({ id: s.id, name: s.name }))
    };
  }

  /**
   * 清理恢复统计
   */
  clearRecoveryStats(): void {
  this.recoveryAttempts.clear();
  }
}

/**
 * 智能错误诊断器
 */
export class ErrorDiagnostic {
  /**
   * 诊断错误并提供详细的解决方案
   */
  static diagnose(error: ExtensionError): {
    diagnosis: string;
    solutions: string[];
    severity: 'low' | 'medium' | 'high';
    userFriendly: boolean;
  } {
    const solutions: string[] = [];
    let diagnosis = '';
    let severity: 'low' | 'medium' | 'high' = 'medium';
    let userFriendly = true;

    switch (error.type) {
      case ErrorType.NETWORK:
      diagnosis = i18nManager.t('diagnosis.network_issue');
        solutions.push(
          i18nManager.t('solution.check_internet'),
    i18nManager.t('solution.disable_vpn'),
        i18nManager.t('solution.check_firewall'),
          i18nManager.t('solution.try_different_network')
      );
        severity = error.message.includes('timeout') ? 'medium' : 'high';
      break;

      case ErrorType.CLIPBOARD:
    diagnosis = i18nManager.t('diagnosis.clipboard_issue');
        solutions.push(
          i18nManager.t('solution.enable_clipboard_permission'),
 i18nManager.t('solution.update_browser'),
          i18nManager.t('solution.try_different_browser'),
          i18nManager.t('solution.manual_copy')
        );
        severity = 'low';
        break;

      case ErrorType.DOM:
 diagnosis = i18nManager.t('diagnosis.page_structure_changed');
        solutions.push(
   i18nManager.t('solution.refresh_page'),
       i18nManager.t('solution.clear_browser_cache'),
          i18nManager.t('solution.disable_other_extensions'),
          i18nManager.t('solution.update_extension')
        );
        severity = 'medium';
   break;

      case ErrorType.MEMORY:
        diagnosis = i18nManager.t('diagnosis.memory_issue');
        solutions.push(
          i18nManager.t('solution.close_tabs'),
          i18nManager.t('solution.restart_browser'),
          i18nManager.t('solution.increase_memory'),
          i18nManager.t('solution.disable_extensions')
        );
        severity = 'high';
        break;

      case ErrorType.PERMISSION:
        diagnosis = i18nManager.t('diagnosis.permission_issue');
        solutions.push(
     i18nManager.t('solution.grant_permissions'),
          i18nManager.t('solution.check_site_settings'),
          i18nManager.t('solution.reset_permissions'),
          i18nManager.t('solution.allow_in_incognito')
        );
        severity = 'low';
        break;

      default:
 diagnosis = i18nManager.t('diagnosis.unknown_issue');
     solutions.push(
          i18nManager.t('solution.restart_browser'),
          i18nManager.t('solution.update_extension'),
 i18nManager.t('solution.contact_support')
        );
        severity = 'medium';
        userFriendly = false;
    }

    return { diagnosis, solutions, severity, userFriendly };
  }

  /**
   * 生成错误报告
 */
  static generateReport(error: ExtensionError): string {
    const diagnostic = this.diagnose(error);
    
    return `
## Error Diagnostic Report

**Error Type:** ${error.type}
**Severity:** ${error.level}
**Time:** ${error.timestamp.toISOString()}

**Diagnosis:** ${diagnostic.diagnosis}

**Recommended Solutions:**
${diagnostic.solutions.map((solution, index) => `${index + 1}. ${solution}`).join('\n')}

**Technical Details:**
- Message: ${error.message}
- Context: ${JSON.stringify(error.context, null, 2)}
- Recoverable: ${error.recoverable}
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}

${error.stack ? `**Stack Trace:**\n${error.stack}` : ''}
    `.trim();
  }
}

// 创建全局实例
export const errorRecoveryManager = new ErrorRecoveryManager();

// 集成到错误处理器
errorHandler.addListener((error: ExtensionError) => {
  // 对于可恢复的错误，尝试自动恢复
  if (error.recoverable && error.level !== ErrorLevel.FATAL) {
    setTimeout(async () => {
      try {
    const result = await errorRecoveryManager.attemptRecovery(error);
   if (result.success) {
          console.log(`Successfully recovered from error: ${error.message}`);
        }
      } catch (recoveryError) {
     console.error('Failed to recover from error:', recoveryError);
      }
    }, 1000); // 延迟1秒后尝试恢复
  }
});