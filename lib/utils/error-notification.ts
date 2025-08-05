// 用户友好的错误通知系统
import { i18nManager } from '../i18n';
import { ExtensionError, ErrorLevel, ErrorType } from './error-handler';

/**
 * 错误通知配置接口
 */
interface NotificationConfig {
  title?: string;
  message: string;
  suggestion?: string;
  severity: ErrorLevel;
  type: ErrorType;
  duration?: number;
  actions?: NotificationAction[];
  dismissible?: boolean;
  persistent?: boolean;
}

/**
 * 通知操作接口
 */
interface NotificationAction {
  id: string;
  label: string;
  handler: () => void | Promise<void>;
primary?: boolean;
}

/**
 * 通知样式配置
 */
interface NotificationStyle {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  icon: string;
}

/**
 * 错误通知管理器
 */
export class ErrorNotificationManager {
  private notifications: Map<string, HTMLElement> = new Map();
  private container: HTMLElement | null = null;
  private notificationId = 0;

  constructor() {
    this.initializeContainer();
    this.setupStyles();
  }

  /**
   * 显示错误通知
   * @param error 错误对象
   * @param config 可选的配置覆盖
   */
  showError(error: ExtensionError, config: Partial<NotificationConfig> = {}): string {
  const notificationConfig = this.buildNotificationConfig(error, config);
    return this.showNotification(notificationConfig);
  }

  /**
   * 显示成功通知
   * @param message 成功消息key
   * @param params 参数
   */
  showSuccess(message: string, params?: Record<string, any>): string {
    const config: NotificationConfig = {
    message: i18nManager.t(message, params),
      severity: ErrorLevel.INFO,
      type: ErrorType.UNKNOWN,
      duration: 3000,
      dismissible: true
    };
    return this.showNotification(config);
  }

  /**
   * 显示警告通知
   * @param message 警告消息key
   * @param params 参数
   */
  showWarning(message: string, params?: Record<string, any>): string {
    const config: NotificationConfig = {
      message: i18nManager.t(message, params),
      severity: ErrorLevel.WARNING,
      type: ErrorType.UNKNOWN,
      duration: 5000,
      dismissible: true
  };
    return this.showNotification(config);
  }

  /**
   * 隐藏通知
   * @param notificationId 通知ID
   */
  hide(notificationId: string): void {
  const notification = this.notifications.get(notificationId);
    if (notification) {
      this.removeNotification(notification, notificationId);
    }
  }

  /**
   * 清除所有通知
   */
  clearAll(): void {
    for (const [id, notification] of this.notifications) {
      this.removeNotification(notification, id);
    }
  }

  /**
   * 构建通知配置
   */
  private buildNotificationConfig(
    error: ExtensionError, 
    override: Partial<NotificationConfig>
  ): NotificationConfig {
    const baseConfig: NotificationConfig = {
  title: this.getErrorTitle(error),
      message: error.userMessage || i18nManager.t(`error.${error.type}`) || error.message,
      suggestion: error.suggestion || this.getErrorSuggestion(error),
      severity: error.level,
    type: error.type,
      duration: this.getDefaultDuration(error.level),
      dismissible: true,
      persistent: error.level === ErrorLevel.CRITICAL || error.level === ErrorLevel.FATAL,
      actions: this.getDefaultActions(error)
    };

    return { ...baseConfig, ...override };
  }

  /**
   * 获取错误标题
   */
  private getErrorTitle(error: ExtensionError): string {
    const severityKey = `severity.${error.level}`;
    return i18nManager.t(severityKey);
  }

  /**
   * 获取错误建议
   */
  private getErrorSuggestion(error: ExtensionError): string {
    // 根据错误类型提供建议
    const suggestionMap: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: 'suggestion.check_connection',
      [ErrorType.PERMISSION]: 'suggestion.grant_permission',
      [ErrorType.CLIPBOARD]: 'suggestion.try_manual_copy',
      [ErrorType.PARSING]: 'suggestion.refresh_page',
      [ErrorType.TIMEOUT]: 'suggestion.try_again',
      [ErrorType.MEMORY]: 'suggestion.close_tabs',
      [ErrorType.DOM]: 'suggestion.refresh_page',
    [ErrorType.STORAGE]: 'suggestion.clear_cache',
      [ErrorType.SCREENSHOT]: 'suggestion.update_browser',
      [ErrorType.FORMATTING]: 'suggestion.try_again',
      [ErrorType.VALIDATION]: 'suggestion.refresh_page',
      [ErrorType.UNKNOWN]: 'suggestion.contact_support'
    };

    const suggestionKey = suggestionMap[error.type];
    return suggestionKey ? i18nManager.t(suggestionKey) : '';
  }

  /**
   * 获取默认持续时间
   */
  private getDefaultDuration(level: ErrorLevel): number {
    const durationMap: Record<ErrorLevel, number> = {
      [ErrorLevel.DEBUG]: 2000,
      [ErrorLevel.INFO]: 3000,
      [ErrorLevel.WARNING]: 5000,
      [ErrorLevel.ERROR]: 8000,
      [ErrorLevel.CRITICAL]: 0, // 持久显示
      [ErrorLevel.FATAL]: 0 // 持久显示
    };

    return durationMap[level] || 5000;
  }

  /**
   * 获取默认操作
   */
  private getDefaultActions(error: ExtensionError): NotificationAction[] {
    const actions: NotificationAction[] = [];

    // 重试操作
    if (error.recoverable) {
      actions.push({
        id: 'retry',
  label: i18nManager.t('retry'),
     handler: () => {
          // 触发重试逻辑
          window.dispatchEvent(new CustomEvent('error-retry', { detail: { error } }));
  },
        primary: true
  });
    }

    // 复制错误详情
    actions.push({
      id: 'copy-details',
      label: i18nManager.t('action.copy_error'),
handler: () => this.copyErrorDetails(error)
    });

    // 报告问题
    actions.push({
   id: 'report',
      label: i18nManager.t('action.report'),
      handler: () => this.reportError(error)
    });

    return actions;
  }

  /**
   * 显示通知
   */
  private showNotification(config: NotificationConfig): string {
    const id = `notification-${++this.notificationId}`;
    const notification = this.createNotificationElement(id, config);
    
 if (this.container) {
      this.container.appendChild(notification);
    this.notifications.set(id, notification);

      // 动画效果
    requestAnimationFrame(() => {
        notification.classList.add('show');
   });

  // 自动隐藏
      if (config.duration && config.duration > 0 && !config.persistent) {
 setTimeout(() => {
     this.hide(id);
        }, config.duration);
      }
 }

    return id;
  }

  /**
 * 创建通知元素
   */
  private createNotificationElement(id: string, config: NotificationConfig): HTMLElement {
    const notification = document.createElement('div');
    notification.className = `tsc-notification tsc-notification-${config.severity}`;
    notification.id = id;

    const style = this.getNotificationStyle(config.severity);
    
    notification.innerHTML = `
      <div class="tsc-notification-content">
        <div class="tsc-notification-header">
          <span class="tsc-notification-icon">${style.icon}</span>
 ${config.title ? `<span class="tsc-notification-title">${config.title}</span>` : ''}
          ${config.dismissible ? '<button class="tsc-notification-close">×</button>' : ''}
        </div>
        <div class="tsc-notification-body">
          <div class="tsc-notification-message">${config.message}</div>
        ${config.suggestion ? `<div class="tsc-notification-suggestion">${config.suggestion}</div>` : ''}
      </div>
        ${config.actions && config.actions.length > 0 ? this.createActionsHTML(config.actions) : ''}
      </div>
    `;

    // 设置样式
    notification.style.cssText = `
    background-color: ${style.backgroundColor};
  color: ${style.textColor};
      border-left: 4px solid ${style.borderColor};
    `;

    // 绑定事件
    this.bindNotificationEvents(notification, id, config);

    return notification;
  }

  /**
   * 创建操作按钮HTML
   */
  private createActionsHTML(actions: NotificationAction[]): string {
    const actionsHTML = actions.map(action => 
      `<button class="tsc-notification-action ${action.primary ? 'primary' : ''}" data-action="${action.id}">
        ${action.label}
      </button>`
    ).join('');

    return `<div class="tsc-notification-actions">${actionsHTML}</div>`;
  }

  /**
   * 绑定通知事件
   */
  private bindNotificationEvents(
    notification: HTMLElement, 
    id: string, 
    config: NotificationConfig
  ): void {
    // 关闭按钮
    const closeBtn = notification.querySelector('.tsc-notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hide(id);
      });
    }

    // 操作按钮
    const actionBtns = notification.querySelectorAll('.tsc-notification-action');
    actionBtns.forEach(btn => {
      const actionId = btn.getAttribute('data-action');
      const action = config.actions?.find(a => a.id === actionId);
      if (action) {
 btn.addEventListener('click', async () => {
      try {
            await action.handler();
            // 执行操作后隐藏通知（除非是持久通知）
            if (!config.persistent) {
   this.hide(id);
     }
       } catch (error) {
       console.error('Error executing notification action:', error);
        }
        });
   }
    });

    // 点击外部区域关闭（如果可关闭）
  if (config.dismissible) {
      notification.addEventListener('click', (e) => {
        if (e.target === notification) {
 this.hide(id);
        }
  });
    }
  }

  /**
   * 获取通知样式
   */
  private getNotificationStyle(severity: ErrorLevel): NotificationStyle {
    const styles: Record<ErrorLevel, NotificationStyle> = {
      [ErrorLevel.DEBUG]: {
     backgroundColor: '#f8f9fa',
        textColor: '#6c757d',
  borderColor: '#6c757d',
   icon: '🐛'
      },
      [ErrorLevel.INFO]: {
        backgroundColor: '#d1ecf1',
        textColor: '#0c5460',
borderColor: '#17a2b8',
     icon: 'ℹ️'
  },
  [ErrorLevel.WARNING]: {
        backgroundColor: '#fff3cd',
     textColor: '#856404',
        borderColor: '#ffc107',
        icon: '⚠️'
      },
      [ErrorLevel.ERROR]: {
     backgroundColor: '#f8d7da',
        textColor: '#721c24',
  borderColor: '#dc3545',
        icon: '❌'
      },
      [ErrorLevel.CRITICAL]: {
     backgroundColor: '#f5c6cb',
        textColor: '#721c24',
        borderColor: '#dc3545',
     icon: '🚨'
      },
   [ErrorLevel.FATAL]: {
        backgroundColor: '#721c24',
   textColor: '#ffffff',
        borderColor: '#dc3545',
     icon: '💥'
      }
    };

    return styles[severity] || styles[ErrorLevel.ERROR];
  }

  /**
   * 移除通知
   */
  private removeNotification(notification: HTMLElement, id: string): void {
    notification.classList.add('hide');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.notifications.delete(id);
    }, 300);
  }

  /**
   * 初始化容器
   */
  private initializeContainer(): void {
    // 查找现有容器
 this.container = document.querySelector('#tsc-notification-container');
 
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'tsc-notification-container';
      this.container.className = 'tsc-notification-container';
      document.body.appendChild(this.container);
    }
  }

  /**
   * 设置样式
   */
  private setupStyles(): void {
    if (document.querySelector('#tsc-notification-styles')) return;

    const style = document.createElement('style');
    style.id = 'tsc-notification-styles';
    style.textContent = `
      .tsc-notification-container {
      position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        pointer-events: none;
      }

      .tsc-notification {
        min-width: 320px;
max-width: 500px;
        margin-bottom: 10px;
  border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        opacity: 0;
   transform: translateX(100%);
    transition: all 0.3s ease-in-out;
 pointer-events: auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
        line-height: 1.4;
      }

      .tsc-notification.show {
        opacity: 1;
   transform: translateX(0);
      }

      .tsc-notification.hide {
        opacity: 0;
        transform: translateX(100%);
      }

      .tsc-notification-content {
        padding: 16px;
      }

      .tsc-notification-header {
        display: flex;
      align-items: center;
justify-content: space-between;
        margin-bottom: 8px;
      }

      .tsc-notification-icon {
     font-size: 16px;
        margin-right: 8px;
   }

      .tsc-notification-title {
        font-weight: 600;
   flex: 1;
   }

      .tsc-notification-close {
     background: none;
      border: none;
        font-size: 18px;
      cursor: pointer;
        padding: 0;
        margin-left: 8px;
     opacity: 0.6;
        transition: opacity 0.2s;
      }

      .tsc-notification-close:hover {
   opacity: 1;
      }

      .tsc-notification-message {
    font-weight: 500;
        margin-bottom: 4px;
      }

      .tsc-notification-suggestion {
        font-size: 12px;
        opacity: 0.8;
        font-style: italic;
      }

      .tsc-notification-actions {
   margin-top: 12px;
        display: flex;
      gap: 8px;
    justify-content: flex-end;
      }

      .tsc-notification-action {
        padding: 6px 12px;
        border: 1px solid currentColor;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
    }

      .tsc-notification-action:hover {
     background: currentColor;
        color: white;
      }

    .tsc-notification-action.primary {
        background: currentColor;
      color: white;
      }

      .tsc-notification-action.primary:hover {
        opacity: 0.8;
      }
    `;

document.head.appendChild(style);
  }

  /**
   * 复制错误详情
   */
  private async copyErrorDetails(error: ExtensionError): Promise<void> {
    const details = {
      message: error.message,
  type: error.type,
      level: error.level,
      timestamp: error.timestamp.toISOString(),
      context: error.context,
      stack: error.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(details, null, 2));
      this.showSuccess('success.operation_completed');
    } catch (clipboardError) {
    console.error('Failed to copy error details:', clipboardError);
    }
  }

  /**
   * 报告错误
   */
  private reportError(error: ExtensionError): void {
    const issueUrl = `https://github.com/your-repo/issues/new?template=bug_report.md&title=${encodeURIComponent(`Error: ${error.message}`)}&body=${encodeURIComponent(`
**Error Details:**
- Type: ${error.type}
- Level: ${error.level}
- Message: ${error.message}
- Timestamp: ${error.timestamp.toISOString()}
- User Agent: ${navigator.userAgent}
- URL: ${window.location.href}

**Context:**
${JSON.stringify(error.context, null, 2)}

**Stack Trace:**
${error.stack || 'Not available'}
    `)}`;

    window.open(issueUrl, '_blank');
  }
}

// 创建全局实例
export const errorNotificationManager = new ErrorNotificationManager();

// 便捷函数
export function showError(error: ExtensionError, config?: Partial<NotificationConfig>): string {
  return errorNotificationManager.showError(error, config);
}

export function showSuccess(message: string, params?: Record<string, any>): string {
  return errorNotificationManager.showSuccess(message, params);
}

export function showWarning(message: string, params?: Record<string, any>): string {
  return errorNotificationManager.showWarning(message, params);
}

export function hideNotification(id: string): void {
  errorNotificationManager.hide(id);
}

export function clearAllNotifications(): void {
  errorNotificationManager.clearAll();
}