export interface NotionError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

export class NotionErrorHandler {
  private static instance: NotionErrorHandler;
  private errorCallbacks: Array<(error: NotionError) => void> = [];

  static getInstance(): NotionErrorHandler {
    if (!NotionErrorHandler.instance) {
      NotionErrorHandler.instance = new NotionErrorHandler();
    }
    return NotionErrorHandler.instance;
  }

  onError(callback: (error: NotionError) => void) {
    this.errorCallbacks.push(callback);
  }

  removeErrorCallback(callback: (error: NotionError) => void) {
    const index = this.errorCallbacks.indexOf(callback);
    if (index > -1) {
      this.errorCallbacks.splice(index, 1);
    }
  }

  handleError(error: any, context?: string): NotionError {
    const notionError: NotionError = {
      code: this.extractErrorCode(error),
      message: this.extractErrorMessage(error),
      details: error,
      timestamp: Date.now()
    };

    console.error(`[Notion Error]${context ? ` [${context}]` : ''}:`, notionError);

    // 通知所有错误监听器
    this.errorCallbacks.forEach(callback => {
      try {
        callback(notionError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });

    return notionError;
  }

  private extractErrorCode(error: any): string {
    if (error.code) return error.code;
    if (error.status) return `HTTP_${error.status}`;
    if (error.name) return error.name;
    return 'UNKNOWN_ERROR';
  }

  private extractErrorMessage(error: any): string {
    if (error.message) return error.message;
    if (error.error) return error.error;
    if (error.error_description) return error.error_description;
    if (typeof error === 'string') return error;
    return 'An unknown error occurred';
  }

  isNetworkError(error: NotionError): boolean {
    return error.code.includes('NETWORK') || 
           error.code.includes('FETCH') || 
           error.code.startsWith('HTTP_5');
  }

  isAuthError(error: NotionError): boolean {
    return error.code.includes('UNAUTHORIZED') || 
           error.code.includes('FORBIDDEN') || 
           error.code === 'HTTP_401' ||
           error.code === 'HTTP_403';
  }

  isRateLimitError(error: NotionError): boolean {
    return error.code.includes('RATE_LIMIT') || 
           error.code === 'HTTP_429';
  }

  isValidationError(error: NotionError): boolean {
    return error.code.includes('VALIDATION') || 
           error.code === 'HTTP_400';
  }

  getUserFriendlyMessage(error: NotionError): string {
    if (this.isAuthError(error)) {
      if (error.code === 'HTTP_401') {
        return 'Integration Token 无效或已过期，请重新配置';
      } else if (error.code === 'HTTP_403') {
        return '权限不足，请确保您的集成已被添加到目标页面或数据库';
      }
      return '认证失败，请重新连接 Notion 账户';
    }

    if (this.isRateLimitError(error)) {
      return '请求过于频繁，请稍后再试';
    }

    if (this.isNetworkError(error)) {
      return '网络连接失败，请检查网络设置';
    }

    if (this.isValidationError(error)) {
      if (error.message.includes('Integration Token')) {
        return error.message; // 直接返回token相关的详细错误信息
      }
      return '数据格式错误，请检查输入信息';
    }

    // 处理特定的Notion API错误
    if (error.code === 'HTTP_404') {
      return '资源不存在，请检查页面或数据库ID是否正确';
    }

    return error.message || '操作失败，请稍后重试';
  }

  shouldRetry(error: NotionError): boolean {
    return this.isNetworkError(error) || this.isRateLimitError(error);
  }

  getRetryDelay(error: NotionError, attempt: number): number {
    if (this.isRateLimitError(error)) {
      // 指数退避，最长 60 秒
      return Math.min(1000 * Math.pow(2, attempt), 60000);
    }

    if (this.isNetworkError(error)) {
      // 网络错误使用较短延迟
      return Math.min(1000 * Math.pow(1.5, attempt), 30000);
    }

    return 1000;
  }
}

export const notionErrorHandler = NotionErrorHandler.getInstance();

// 重试装饰器
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries: number = 3,
  context?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: NotionError | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = notionErrorHandler.handleError(error, context);
        
        if (attempt === maxRetries || !notionErrorHandler.shouldRetry(lastError)) {
          throw lastError;
        }

        const delay = notionErrorHandler.getRetryDelay(lastError, attempt);
        console.log(`Retrying after ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }) as T;
}

// 错误边界装饰器
export function withErrorBoundary<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  fallbackValue: any = null,
  context?: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T> | typeof fallbackValue> => {
    try {
      return await fn(...args);
    } catch (error) {
      notionErrorHandler.handleError(error, context);
      return fallbackValue;
    }
  }) as T;
}