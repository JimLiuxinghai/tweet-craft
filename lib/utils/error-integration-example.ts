// 错误通知系统集成示例

import { errorHandler, ExtensionError, ErrorType, ErrorLevel } from './error-handler';
import { showError, showSuccess, showWarning } from './error-notification';

/**
 * 使用示例：Twitter内容解析器中的错误处理
 */
export class TweetParserWithErrorHandling {
  async parseTweet(element: Element): Promise<any> {
    try {
      // 模拟推文解析逻辑
      if (!element) {
 throw new ExtensionError(
          'Tweet element not found',
          ErrorType.DOM,
      ErrorLevel.ERROR,
          {
            userMessage: 'Unable to find tweet content',
        suggestion: 'Please refresh the page and try again',
   recoverable: true
     }
     );
      }

      // 执行解析...
      const tweetData = await this.extractTweetData(element);
      
      // 显示成功消息
      errorHandler.showSuccess('success.tweet_copied', { 
   content: tweetData.text?.substring(0, 50) + '...' 
      });
      
      return tweetData;
    } catch (error) {
  // 使用错误处理器处理错误
  const result = await errorHandler.handle(error, { 
     operation: 'parseTweet',
        element: element?.tagName 
      });
      
      if (!result.success) {
        throw result.error;
      }
      
      return result.result;
    }
  }

  private async extractTweetData(element: Element): Promise<any> {
    // 模拟数据提取逻辑
    return {
      text: element.textContent || '',
      author: 'Example User',
    timestamp: new Date().toISOString()
    };
  }
}

/**
 * 使用示例：剪贴板操作中的错误处理
 */
export class ClipboardManagerWithErrorHandling {
  async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    
      // 显示成功消息
      showSuccess('success.tweet_copied');
    } catch (error) {
      // 创建详细的错误信息
      let extensionError: ExtensionError;
      
      if (error instanceof DOMException) {
        if (error.name === 'NotAllowedError') {
          extensionError = new ExtensionError(
    'Clipboard permission denied',
            ErrorType.PERMISSION,
            ErrorLevel.WARNING,
            {
    userMessage: 'Clipboard access was denied',
     suggestion: 'Please allow clipboard permission in your browser settings',
          recoverable: true,
              metadata: { 
  operation: 'clipboard.writeText',
         textLength: text.length 
       }
            }
     );
     } else {
      extensionError = new ExtensionError(
    'Clipboard operation failed',
   ErrorType.CLIPBOARD,
            ErrorLevel.ERROR,
            {
        userMessage: 'Failed to copy to clipboard',
            suggestion: 'Try selecting and copying the text manually',
        recoverable: true,
         metadata: { 
     domException: error.name,
 textLength: text.length 
              }
    }
          );
        }
      } else {
        extensionError = new ExtensionError(
          error.message || 'Unknown clipboard error',
       ErrorType.CLIPBOARD,
          ErrorLevel.ERROR,
          {
            userMessage: 'An unexpected error occurred while copying',
      suggestion: 'Please try again or copy manually',
     recoverable: true
          }
     );
      }
   
      // 处理错误并可能显示给用户
      await errorHandler.handle(extensionError);
    }
  }
}

/**
 * 使用示例：网络请求中的错误处理
 */
export class NetworkManagerWithErrorHandling {
  async fetchTweetData(url: string): Promise<any> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new ExtensionError(
          `HTTP ${response.status}: ${response.statusText}`,
          ErrorType.NETWORK,
          ErrorLevel.ERROR,
       {
        userMessage: 'Failed to load tweet data',
            suggestion: 'Please check your internet connection and try again',
       recoverable: true,
   metadata: {
   status: response.status,
       statusText: response.statusText,
         url: url
            }
  }
      );
      }
      
      return await response.json();
    } catch (error) {
  if (error instanceof ExtensionError) {
        throw error;
      }
      
      // 网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ExtensionError(
        'Network connection failed',
    ErrorType.NETWORK,
     ErrorLevel.ERROR,
          {
userMessage: 'Unable to connect to Twitter',
      suggestion: 'Please check your internet connection and try again',
     recoverable: true,
    metadata: {
       originalError: error.message,
 url: url
         }
          }
        );
    }
      
      // 其他未知错误
      throw new ExtensionError(
        error.message || 'Unknown network error',
        ErrorType.NETWORK,
        ErrorLevel.ERROR,
{
  userMessage: 'An unexpected error occurred',
        suggestion: 'Please try again later',
recoverable: true,
   metadata: {
    originalError: error.toString(),
            url: url
          }
        }
  );
    }
  }
}

/**
 * 全局错误处理示例
 */
export function setupGlobalErrorHandling(): void {
  // 监听未捕获的错误
  window.addEventListener('error', (event) => {
    const extensionError = new ExtensionError(
      event.error?.message || event.message,
      ErrorType.UNKNOWN,
      ErrorLevel.ERROR,
    {
        userMessage: 'An unexpected error occurred',
        suggestion: 'Please refresh the page and try again',
        recoverable: true,
        metadata: {
          filename: event.filename,
   lineno: event.lineno,
    colno: event.colno,
       stack: event.error?.stack
        }
      }
    );
    
    errorHandler.handle(extensionError);
  });

  // 监听未捕获的Promise拒绝
  window.addEventListener('unhandledrejection', (event) => {
    const extensionError = new ExtensionError(
      event.reason?.message || String(event.reason),
 ErrorType.UNKNOWN,
      ErrorLevel.ERROR,
 {
      userMessage: 'An unexpected error occurred',
        suggestion: 'Please try again',
        recoverable: true,
        metadata: {
          reason: String(event.reason),
       stack: event.reason?.stack
        }
      }
    );
    
    errorHandler.handle(extensionError);
    event.preventDefault(); // 阻止默认的错误输出
  });

  // 设置错误恢复监听器
  window.addEventListener('error-retry', ((event: CustomEvent) => {
    const error = event.detail.error as ExtensionError;
    console.log(`Retrying operation for error: ${error.message}`);

    // 这里可以实现具体的重试逻辑
    // 例如重新执行失败的操作
  }) as EventListener);
}

/**
 * 批量操作错误处理示例
 */
export class BatchOperationWithErrorHandling {
  async processMultipleTweets(elements: Element[]): Promise<any[]> {
    const results: any[] = [];
  const errors: ExtensionError[] = [];
    
    for (let i = 0; i < elements.length; i++) {
      try {
        const parser = new TweetParserWithErrorHandling();
        const result = await parser.parseTweet(elements[i]);
        results.push(result);
      } catch (error) {
        const extensionError = error instanceof ExtensionError ? error : 
          new ExtensionError(
   error.message || 'Tweet processing failed',
   ErrorType.PARSING,
       ErrorLevel.WARNING,
            {
userMessage: `Failed to process tweet ${i + 1}`,
       suggestion: 'Some tweets may have been skipped',
   recoverable: true,
   metadata: { tweetIndex: i }
  }
          );
        
        errors.push(extensionError);
      }
    }
    
    // 如果有错误但也有成功的结果
    if (errors.length > 0 && results.length > 0) {
  showWarning('Some tweets could not be processed', {
        processed: results.length,
        failed: errors.length,
        total: elements.length
      });
    } else if (errors.length > 0 && results.length === 0) {
      showError(new ExtensionError(
        'All tweets failed to process',
  ErrorType.PARSING,
        ErrorLevel.ERROR,
{
       userMessage: 'Unable to process any tweets',
          suggestion: 'Please refresh the page and try again',
        recoverable: true
    }
      ));
    } else {
      showSuccess('success.operation_completed', {
        count: results.length
  });
    }
    
    return results;
  }
}