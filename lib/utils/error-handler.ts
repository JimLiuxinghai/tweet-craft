// 多级错误处理系统 - API降级和错误分类
import { i18nManager } from '../i18n';

/**
 * 错误级别枚举
 */
export enum ErrorLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
  FATAL = 'fatal'
}

/**
 * 错误类型枚举
 */
export enum ErrorType {
  NETWORK = 'network',
  PARSING = 'parsing',
  FORMATTING = 'formatting',
  CLIPBOARD = 'clipboard',
  STORAGE = 'storage',
  PERMISSION = 'permission',
  DOM = 'dom',
  UNKNOWN = 'unknown',
  VALIDATION = 'validation',
  TIMEOUT = 'timeout',
  MEMORY = 'memory',
  SCREENSHOT = 'screenshot'
}

/**
 * 错误处理策略枚举
 */
export enum ErrorStrategy {
  IGNORE = 'ignore',
  LOG = 'log',
  RETRY = 'retry',
  FALLBACK = 'fallback',
  NOTIFY = 'notify',
  THROW = 'throw'
}

/**
 * 扩展错误类
 */
export class ExtensionError extends Error {
  public readonly level: ErrorLevel;
  public readonly type: ErrorType;
  public readonly timestamp: Date;
  public readonly context?: any;
  public readonly stack?: string;
  public readonly userMessage?: string;
  public readonly suggestion?: string;
  public readonly recoverable: boolean;
  public readonly metadata: Record<string, any>;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    level: ErrorLevel = ErrorLevel.ERROR,
    options: {
      context?: any;
      userMessage?: string;
      suggestion?: string;
recoverable?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ) {
    super(message);
    this.name = 'ExtensionError';
    this.type = type;
  this.level = level;
    this.timestamp = new Date();
    this.context = options.context;
    this.userMessage = options.userMessage;
    this.suggestion = options.suggestion;
    this.recoverable = options.recoverable !== false;
    this.metadata = options.metadata || {};
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ExtensionError);
    }
}

  /**
 * 创建错误的JSON表示
   */
  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      level: this.level,
      timestamp: this.timestamp.toISOString(),
    context: this.context,
    userMessage: this.userMessage,
      suggestion: this.suggestion,
   recoverable: this.recoverable,
      metadata: this.metadata,
      stack: this.stack
    };
  }
}

/**
 * 错误处理规则接口
 */
interface ErrorRule {
  type?: ErrorType;
  level?: ErrorLevel;
  message?: RegExp;
  strategy: ErrorStrategy;
  maxRetries?: number;
  retryDelay?: number;
fallback?: () => any;
  notification?: boolean;
}

/**
 * 错误统计接口
 */
interface ErrorStats {
  total: number;
  byType: Record<ErrorType, number>;
  byLevel: Record<ErrorLevel, number>;
  recentErrors: ExtensionError[];
  lastError: ExtensionError | null;
  errorRate: number;
  startTime: Date;
}

/**
 * 降级策略接口
 */
interface FallbackStrategy {
  name: string;
  condition: (error: ExtensionError) => boolean;
  handler: (error: ExtensionError, originalFn: Function, ...args: any[]) => Promise<any>;
  priority: number;
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
  private rules: ErrorRule[] = [];
  private stats: ErrorStats = {
    total: 0,
    byType: Object.values(ErrorType).reduce((acc, type) => ({ ...acc, [type]: 0 }), {} as Record<ErrorType, number>),
byLevel: Object.values(ErrorLevel).reduce((acc, level) => ({ ...acc, [level]: 0 }), {} as Record<ErrorLevel, number>),
    recentErrors: [],
    lastError: null,
    errorRate: 0,
    startTime: new Date()
  };
  private fallbackStrategies: FallbackStrategy[] = [];
  private listeners: Array<(error: ExtensionError) => void> = [];
  private cooldownMap = new Map<string, number>();

  constructor() {
    this.initializeDefaultRules();
    this.initializeFallbackStrategies();
  }

  /**
   * 处理错误
   * @param error 错误对象
   * @param context 上下文信息
   * @returns 处理结果
   */
  async handle(error: Error | ExtensionError, context?: any): Promise<{
    success: boolean;
    result?: any;
    error?: ExtensionError;
  }> {
    const extensionError = this.normalizeError(error, context);
    
    // 更新统计
    this.updateStats(extensionError);
    
    // 通知监听器
  this.notifyListeners(extensionError);
    
    // 检查冷却期
    if (this.isInCooldown(extensionError)) {
      console.log(`Error ${extensionError.type} is in cooldown, skipping`);
return { success: false, error: extensionError };
    }

    // 查找匹配的规则
    const rule = this.findMatchingRule(extensionError);
    if (!rule) {
      return { success: false, error: extensionError };
    }

    // 执行处理策略
    return await this.executeStrategy(extensionError, rule);
}

  /**
   * 添加错误处理规则
   */
  addRule(rule: ErrorRule): void {
  this.rules.push(rule);
  }

  /**
 * 添加降级策略
   */
  addFallbackStrategy(strategy: FallbackStrategy): void {
    this.fallbackStrategies.push(strategy);
    // 按优先级排序
 this.fallbackStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * 显示成功消息
   * @param messageKey 消息key
   * @param params 参数
   */
  showSuccess(messageKey: string, params?: Record<string, any>): void {
    try {
      errorNotificationManager.showSuccess(messageKey, params);
  } catch (error) {
      console.log(`Success: ${i18nManager.t(messageKey, params)}`);
    }
  }

  /**
   * 显示警告消息
   * @param messageKey 消息key
   * @param params 参数
   */
  showWarning(messageKey: string, params?: Record<string, any>): void {
    try {
      errorNotificationManager.showWarning(messageKey, params);
    } catch (error) {
      console.warn(`Warning: ${i18nManager.t(messageKey, params)}`);
  }
  }

  /**
   * 添加错误监听器
   */
  addListener(listener: (error: ExtensionError) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除错误监听器
   */
  removeListener(listener: (error: ExtensionError) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 包装函数以提供错误处理和降级
   */
  withFallback<T extends (...args: any[]) => Promise<any>>(
    originalFn: T,
    options: {
      name?: string;
      retries?: number;
      retryDelay?: number;
      fallbackValue?: any;
    } = {}
  ): T {
    return (async (...args: any[]) => {
      const { retries = 2, retryDelay = 1000, fallbackValue = null } = options;
      
      for (let attempt = 0; attempt <= retries; attempt++) {
      try {
          return await originalFn(...args);
        } catch (error) {
          const extensionError = this.normalizeError(error);

          // 最后一次尝试，执行降级策略
          if (attempt === retries) {
    for (const strategy of this.fallbackStrategies) {
         if (strategy.condition(extensionError)) {
   try {
   return await strategy.handler(extensionError, originalFn, ...args);
     } catch (fallbackError) {
      console.warn(`Fallback strategy ${strategy.name} failed:`, fallbackError);
           }
         }
            }
       
         // 所有降级策略都失败，返回默认值或抛出错误
          if (fallbackValue !== null) {
  return fallbackValue;
    }
            throw extensionError;
          }
          
          // 重试前等待
 if (retryDelay > 0) {
await this.sleep(retryDelay * (attempt + 1));
   }
 }
      }
      
   return fallbackValue;
    }) as T;
  }

  /**
   * 获取错误统计
   */
  getStats(): ErrorStats {
    const now = new Date();
    const timeDiff = now.getTime() - this.stats.startTime.getTime();
    const hours = timeDiff / (1000 * 60 * 60);
    
    return {
      ...this.stats,
      errorRate: hours > 0 ? this.stats.total / hours : 0
 };
  }

  /**
   * 清理错误统计
   */
  clearStats(): void {
    this.stats = {
      total: 0,
      byType: Object.values(ErrorType).reduce((acc, type) => ({ ...acc, [type]: 0 }), {} as Record<ErrorType, number>),
      byLevel: Object.values(ErrorLevel).reduce((acc, level) => ({ ...acc, [level]: 0 }), {} as Record<ErrorLevel, number>),
      recentErrors: [],
      lastError: null,
      errorRate: 0,
 startTime: new Date()
    };
  }

  // 私有方法

  /**
   * 初始化默认规则
   */
  private initializeDefaultRules(): void {
    // 网络错误重试
    this.addRule({
      type: ErrorType.NETWORK,
      strategy: ErrorStrategy.RETRY,
      maxRetries: 3,
      retryDelay: 1000
    });

  // 解析错误降级
    this.addRule({
      type: ErrorType.PARSING,
      strategy: ErrorStrategy.FALLBACK,
  notification: true
    });

    // 权限错误通知
    this.addRule({
      type: ErrorType.PERMISSION,
      strategy: ErrorStrategy.NOTIFY,
      notification: true
    });

    // 内存错误立即处理
    this.addRule({
      type: ErrorType.MEMORY,
      level: ErrorLevel.CRITICAL,
      strategy: ErrorStrategy.NOTIFY,
      notification: true
    });

    // 调试信息仅记录
    this.addRule({
      level: ErrorLevel.DEBUG,
    strategy: ErrorStrategy.LOG
    });

    // 致命错误抛出
    this.addRule({
      level: ErrorLevel.FATAL,
      strategy: ErrorStrategy.THROW
    });
  }

  /**
   * 初始化降级策略
   */
  private initializeFallbackStrategies(): void {
    // 剪贴板API降级
    this.addFallbackStrategy({
      name: 'clipboard-fallback',
      condition: (error) => error.type === ErrorType.CLIPBOARD,
      handler: async (error, originalFn, ...args) => {
        console.log('Using clipboard fallback strategy');
        // 尝试使用传统的 document.execCommand
        if (args[0] && typeof args[0] === 'string') {
          const textArea = document.createElement('textarea');
          textArea.value = args[0];
    document.body.appendChild(textArea);
          textArea.select();
          const success = document.execCommand('copy');
          document.body.removeChild(textArea);
   
    if (success) {
        return { success: true, method: 'execCommand' };
       }
        }
        throw new ExtensionError('All clipboard methods failed', ErrorType.CLIPBOARD);
    },
      priority: 10
    });

    // DOM查询降级
    this.addFallbackStrategy({
      name: 'dom-fallback',
      condition: (error) => error.type === ErrorType.DOM,
      handler: async (error, originalFn, ...args) => {
        console.log('Using DOM query fallback strategy');
        // 尝试更宽松的选择器
        if (args[0] && typeof args[0] === 'string') {
          const selector = args[0];
          // 尝试多种降级选择器
   const fallbackSelectors = [
    selector.replace(/\[data-testid="([^"]+)"\]/, '[class*="$1"]'),
         selector.replace(/article/, 'div'),
            selector.split(' ')[0], // 仅使用第一个选择器
'*' // 最后的降级
          ];
       
          for (const fallbackSelector of fallbackSelectors) {
  try {
   const elements = document.querySelectorAll(fallbackSelector);
    if (elements.length > 0) {
                return elements;
              }
        } catch (e) {
    continue;
            }
    }
        }
   throw new ExtensionError('All DOM query methods failed', ErrorType.DOM);
      },
      priority: 8
    });

    // 格式化降级
    this.addFallbackStrategy({
      name: 'formatting-fallback',
      condition: (error) => error.type === ErrorType.FORMATTING,
      handler: async (error, originalFn, ...args) => {
    console.log('Using formatting fallback strategy');
        // 返回原始文本
        if (args[0] && args[0].content) {
          return args[0].content;
        }
   return 'Content unavailable due to formatting error';
   },
      priority: 5
    });
  }

  /**
   * 标准化错误对象
   */
  private normalizeError(error: Error | ExtensionError, context?: any): ExtensionError {
  if (error instanceof ExtensionError) {
      return error;
    }

    // 根据错误消息推断类型
    let type = ErrorType.UNKNOWN;
    let level = ErrorLevel.ERROR;
    let userMessage: string | undefined;
    let suggestion: string | undefined;

    if (error.name === 'NetworkError' || error.message.includes('fetch')) {
      type = ErrorType.NETWORK;
      userMessage = i18nManager.t('error.network');
suggestion = i18nManager.t('suggestion.check_connection');
 } else if (error.message.includes('permission')) {
      type = ErrorType.PERMISSION;
    level = ErrorLevel.WARNING;
    userMessage = i18nManager.t('error.permission');
      suggestion = i18nManager.t('suggestion.grant_permission');
    } else if (error.message.includes('clipboard')) {
      type = ErrorType.CLIPBOARD;
      userMessage = i18nManager.t('error.clipboard');
      suggestion = i18nManager.t('suggestion.try_manual_copy');
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      type = ErrorType.PARSING;
      userMessage = i18nManager.t('error.parsing');
      suggestion = i18nManager.t('suggestion.refresh_page');
    } else if (error.message.includes('timeout')) {
      type = ErrorType.TIMEOUT;
      userMessage = i18nManager.t('error.timeout');
    suggestion = i18nManager.t('suggestion.try_again');
    } else if (error.message.includes('memory') || error.message.includes('heap')) {
  type = ErrorType.MEMORY;
 level = ErrorLevel.CRITICAL;
      userMessage = i18nManager.t('error.memory');
      suggestion = i18nManager.t('suggestion.close_tabs');
    }

    return new ExtensionError(
      error.message,
      type,
      level,
      {
        context,
        userMessage,
        suggestion,
        metadata: {
          originalName: error.name,
        originalStack: error.stack
        }
      }
    );
  }

  /**
   * 更新错误统计
   */
  private updateStats(error: ExtensionError): void {
    this.stats.total++;
    this.stats.byType[error.type]++;
    this.stats.byLevel[error.level]++;
    this.stats.lastError = error;
    
    // 保持最近错误列表
    this.stats.recentErrors.unshift(error);
    if (this.stats.recentErrors.length > 100) {
      this.stats.recentErrors = this.stats.recentErrors.slice(0, 100);
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(error: ExtensionError): void {
    for (const listener of this.listeners) {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
 }
    }
  }

  /**
   * 检查是否在冷却期
   */
  private isInCooldown(error: ExtensionError): boolean {
    const key = `${error.type}_${error.message.substring(0, 50)}`;
  const lastTime = this.cooldownMap.get(key);
    const now = Date.now();
    
    if (lastTime && now - lastTime < 5000) { // 5秒冷却
      return true;
    }
    
    this.cooldownMap.set(key, now);
    return false;
  }

  /**
   * 查找匹配的规则
   */
  private findMatchingRule(error: ExtensionError): ErrorRule | null {
    for (const rule of this.rules) {
      if (rule.type && rule.type !== error.type) continue;
  if (rule.level && rule.level !== error.level) continue;
      if (rule.message && !rule.message.test(error.message)) continue;
      
      return rule;
  }
    return null;
  }

  /**
   * 执行处理策略
   */
  private async executeStrategy(
    error: ExtensionError,
    rule: ErrorRule
  ): Promise<{ success: boolean; result?: any; error?: ExtensionError }> {
    try {
 switch (rule.strategy) {
        case ErrorStrategy.IGNORE:
          return { success: true };
          
        case ErrorStrategy.LOG:
      this.logError(error);
        return { success: true };
          
   case ErrorStrategy.RETRY:
      // 重试逻辑已在 withFallback 中实现
return { success: false, error };
          
        case ErrorStrategy.FALLBACK:
          if (rule.fallback) {
       const result = await rule.fallback();
            return { success: true, result };
   }
          return { success: false, error };
          
        case ErrorStrategy.NOTIFY:
    this.notifyUser(error);
          return { success: false, error };
          
        case ErrorStrategy.THROW:
          throw error;
          
        default:
   return { success: false, error };
      }
    } catch (strategyError) {
      console.error('Error in strategy execution:', strategyError);
      return { success: false, error };
    }
  }

  /**
   * 记录错误
   */
  private logError(error: ExtensionError): void {
    const logFn = this.getLogFunction(error.level);
    logFn(`[${error.type}] ${error.message}`, error.context);
  }

  /**
   * 获取日志函数
   */
  private getLogFunction(level: ErrorLevel): (...args: any[]) => void {
    switch (level) {
      case ErrorLevel.DEBUG:
        return console.debug;
      case ErrorLevel.INFO:
return console.info;
      case ErrorLevel.WARNING:
      return console.warn;
    case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
      case ErrorLevel.FATAL:
        return console.error;
      default:
    return console.log;
    }
  }

  /**
   * 通知用户
   */
  private notifyUser(error: ExtensionError): void {
    try {
      // 使用错误通知管理器显示用户友好的通知
      errorNotificationManager.showError(error);
    } catch (notificationError) {
      // 如果通知系统失败，回退到控制台输出
  console.warn(`User notification: ${error.userMessage || error.message}`);
      if (error.suggestion) {
        console.info(`Suggestion: ${error.suggestion}`);
      }
    }
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建单例实例
export const errorHandler = new ErrorHandler();

// 全局错误处理
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorHandler.handle(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    errorHandler.handle(event.reason);
    event.preventDefault();
  });
}