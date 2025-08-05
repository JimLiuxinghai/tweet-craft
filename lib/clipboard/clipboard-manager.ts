// 剪贴板管理器 - 支持多级 API 降级策略

import type { 
  ClipboardCapability, 
  TweetData, 
  ThreadData, 
  FormatOptions, 
  ErrorInfo 
} from '../types';
import { contentFormatter } from '../formatters';
import { i18nManager } from '../i18n';
import { MIME_TYPES, ERROR_MESSAGES } from '../utils/constants';

/**
 * 剪贴板管理器类
 */
export class ClipboardManager {
  private static instance: ClipboardManager;
  private capabilities: ClipboardCapability | null = null;
  private lastCopyTime: number = 0;
  private copyQueue: Array<{ content: string; format: 'html' | 'markdown' | 'text'; resolve: Function; reject: Function }> = [];
  private isProcessingQueue: boolean = false;

  private constructor() {
    this.detectCapabilities();
  }

  public static getInstance(): ClipboardManager {
    if (!ClipboardManager.instance) {
      ClipboardManager.instance = new ClipboardManager();
    }
    return ClipboardManager.instance;
  }

  /**
   * 检测浏览器的剪贴板能力
   */
  private async detectCapabilities(): Promise<void> {
    this.capabilities = {
      writeText: false,
    writeHTML: false,
      writeImage: false
    };

    try {
      // 检测现代 Clipboard API
           if (navigator.clipboard && typeof navigator.clipboard.write === 'function') {
        this.capabilities.writeHTML = true;
        this.capabilities.writeText = true;
        
    // 检测图片写入能力
        try {
          const testBlob = new Blob([''], { type: 'image/png' });
       const clipboardItem = new ClipboardItem({ 'image/png': testBlob });
          // 注意：这里不实际写入，只是测试支持性
       this.capabilities.writeImage = true;
      } catch (error) {
    console.warn('Image clipboard not supported:', error);
}
      } else if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        // 只支持文本
        this.capabilities.writeText = true;
      }

      // 检测传统 execCommand 支持
      if (document.queryCommandSupported && document.queryCommandSupported('copy')) {
        if (!this.capabilities.writeText) {
          this.capabilities.writeText = true;
        }
    }
  } catch (error) {
      console.warn('Failed to detect clipboard capabilities:', error);
  }
  }

  /**
   * 复制推文到剪贴板
   */
  async copyTweet(tweet: TweetData, options: FormatOptions): Promise<void> {
 
    try {
      // 验证媒体信息
      this.validateMediaInformation(tweet, options);
  
      const formattedContent = contentFormatter.formatTweet(tweet, options);
      console.log('🔍 复制推文 - 格式化后内容长度:', formattedContent.length);
      console.log('🔍 复制推文 - 内容预览:', formattedContent.substring(0, 200) + '...');
      
      await this.copyToClipboard(formattedContent, options.format);
    

      
      // 发送成功通知
      this.notifySuccess('success.tweet_copied');
      
    } catch (error) {
      this.handleCopyError(error as Error, 'tweet');
    throw error;
    }
  }

  /**
   * 复制线程到剪贴板
   */
  async copyThread(thread: ThreadData, options: FormatOptions): Promise<void> {
    
    try {
      // 验证线程中的媒体信息
      this.validateThreadMediaInformation(thread, options);
   
 const formattedContent = contentFormatter.formatThread(thread, options);
 console.log('🔍 复制线程 - 格式化后内容长度:', formattedContent.length);
    console.log('🔍 复制线程 - 内容预览:', formattedContent.substring(0, 200) + '...');
   
      await this.copyToClipboard(formattedContent, options.format);
      
              
      
      // 发送成功通知
      this.notifySuccess('success.thread_copied', { count: thread.tweets.length });

    } catch (error) {
      this.handleCopyError(error as Error, 'thread');
      throw error;
    }
  }

  /**
   * 核心剪贴板写入方法 - 多级降级策略
   */
  private async copyToClipboard(content: string, format: 'html' | 'markdown' | 'text'): Promise<void> {
    // 防止频繁复制
    const now = Date.now();
    if (now - this.lastCopyTime < 100) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.lastCopyTime = now;

    // 加入队列处理，避免并发问题
    return new Promise((resolve, reject) => {
      this.copyQueue.push({ content, format, resolve, reject });
      this.processCopyQueue();
    });
  }

  /**
   * 处理复制队列
   */
  private async processCopyQueue(): Promise<void> {
    if (this.isProcessingQueue || this.copyQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.copyQueue.length > 0) {
        const task = this.copyQueue.shift()!;
  
      try {
          await this.executeCopy(task.content, task.format);
    task.resolve();
        } catch (error) {
          task.reject(error);
        }

        // 短暂延迟避免API限制
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
* 执行实际的复制操作
   */
  private async executeCopy(content: string, format: 'html' | 'markdown' | 'text'): Promise<void> {
    const errors: Error[] = [];

    // 方法1: 尝试现代 Clipboard API (支持 HTML + 文本)
    if (this.capabilities?.writeHTML && format === 'html') {
  try {
     await this.copyWithModernAPI(content, format);
      return;
      } catch (error) {
        console.warn('Modern clipboard API failed:', error);
        errors.push(error as Error);
      }
    }

    // 方法2: 尝试 writeText API
    if (this.capabilities?.writeText) {
      try {
        await this.copyWithWriteTextAPI(content);
    return;
      } catch (error) {
  console.warn('WriteText API failed:', error);
  errors.push(error as Error);
   }
  }

    // 方法3: 降级到 execCommand
    try {
      await this.copyWithExecCommand(content);
      return;
    } catch (error) {
      console.warn('ExecCommand failed:', error);
      errors.push(error as Error);
    }

    // 如果所有方法都失败，抛出错误
    throw new Error(`All clipboard methods failed: ${errors.map(e => e.message).join(', ')}`);
  }

  /**
   * 使用现代 Clipboard API 复制 (支持 HTML)
   */
  private async copyWithModernAPI(content: string, format: 'html' | 'markdown' | 'text'): Promise<void> {
    const items: Record<string, Blob> = {};

  if (format === 'html') {
      // 创建 HTML 和纯文本版本
      items[MIME_TYPES.TEXT.HTML] = new Blob([content], { type: MIME_TYPES.TEXT.HTML });
      
      // 提取纯文本作为降级
      const plainText = this.stripHTML(content);
      items[MIME_TYPES.TEXT.PLAIN] = new Blob([plainText], { type: MIME_TYPES.TEXT.PLAIN });
    } else {
      // Markdown 和纯文本都作为纯文本处理
      items[MIME_TYPES.TEXT.PLAIN] = new Blob([content], { type: MIME_TYPES.TEXT.PLAIN });
    }

    const clipboardItem = new ClipboardItem(items);
    await navigator.clipboard.write([clipboardItem]);
  }

  /**
   * 使用 writeText API 复制
   */
  private async copyWithWriteTextAPI(content: string): Promise<void> {
    // 如果是 HTML，提取纯文本
    const textContent = content.includes('<') ? this.stripHTML(content) : content;
    await navigator.clipboard.writeText(textContent);
  }

  /**
   * 使用传统 execCommand 复制
   */
  private async copyWithExecCommand(content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 创建临时文本域
        const textArea = document.createElement('textarea');
        textArea.style.position = 'fixed';
  textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
 textArea.style.opacity = '0';
        textArea.value = content.includes('<') ? this.stripHTML(content) : content;
        
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

     // 尝试复制
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);

        if (successful) {
          resolve();
     } else {
          reject(new Error('execCommand copy failed'));
    }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 从 HTML 中提取纯文本
   */
  private stripHTML(html: string): string {
    // 创建临时 DOM 元素来安全地提取文本
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // 处理换行
const brs = tempDiv.querySelectorAll('br');
    brs.forEach(br => br.replaceWith('\n'));
    
    const hrs = tempDiv.querySelectorAll('hr');
    hrs.forEach(hr => hr.replaceWith('\n---\n'));

    return tempDiv.textContent || tempDiv.innerText || '';
  }




  /**
   * 复制自定义内容
   */
  async copyCustomContent(content: string, format: 'html' | 'markdown' | 'text' = 'text'): Promise<void> {
    try {
      await this.copyToClipboard(content, format);
      this.notifySuccess('success.content_copied');
    } catch (error) {
      this.handleCopyError(error as Error, 'custom');
      throw error;
    }
  }

/**
   * 检查剪贴板权限
   */
  async checkPermissions(): Promise<{ granted: boolean; canRequest: boolean }> {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
        return {
          granted: permission.state === 'granted',
        canRequest: permission.state === 'prompt'
  };
      }
    } catch (error) {
console.warn('Failed to check clipboard permissions:', error);
  }

    // 降级检测
    return {
   granted: this.capabilities?.writeText || false,
      canRequest: false
    };
  }

  /**
   * 请求剪贴板权限
*/
  async requestPermissions(): Promise<boolean> {
    try {
      // 尝试执行一个简单的复制操作来触发权限请求
      await navigator.clipboard.writeText('');
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        return false;
  }
      throw error;
    }
  }

  /**
   * 获取剪贴板能力信息
   */
  getCapabilities(): ClipboardCapability {
    return { ...this.capabilities } as ClipboardCapability;
  }

  /**
   * 处理复制错误
   */
  private handleCopyError(error: Error, context: string): void {
    let errorType: string;
    let errorMessage: string;

    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
        errorType = 'permission';
        errorMessage = ERROR_MESSAGES.CLIPBOARD_PERMISSION_DENIED;
       break;
      case 'NotSupportedError':
          errorType = 'support';
   errorMessage = ERROR_MESSAGES.CLIPBOARD_NOT_SUPPORTED;
   break;
default:
     errorType = 'write';
          errorMessage = ERROR_MESSAGES.CLIPBOARD_WRITE_FAILED;
 }
    } else {
      errorType = 'unknown';
 errorMessage = ERROR_MESSAGES.CLIPBOARD_WRITE_FAILED;
    }

    const errorInfo: ErrorInfo = {
  type: 'clipboard',
      message: errorMessage,
      code: error.name,
      details: { context, originalError: error.message },
      timestamp: new Date()
    };

    this.notifyError(errorInfo);
  }

  /**
   * 发送成功通知
   */
  private notifySuccess(messageKey: string, params?: Record<string, any>): void {
    const message = i18nManager.t(messageKey, params);
    
  // 发送消息给其他组件
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({
        type: 'COPY_SUCCESS',
        message: message,
        timestamp: Date.now()
      }).catch(() => {
        // 忽略错误
      });
    }

    // 显示浏览器通知（如果需要的话）
    this.showNotification(message, 'success');
  }

  /**
   * 发送错误通知
   */
  private notifyError(errorInfo: ErrorInfo): void {
    const message = i18nManager.t(errorInfo.message);
    
    // 发送消息给其他组件
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({
     type: 'COPY_ERROR',
  error: errorInfo,
   message: message,
        timestamp: Date.now()
    }).catch(() => {
        // 忽略错误
    });
    }

    // 显示浏览器通知
    this.showNotification(message, 'error');
  }

  /**
   * 显示通知
   */
  private showNotification(message: string, type: 'success' | 'error'): void {
    // 可以集成浏览器通知或自定义通知系统
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // 如果在内容脚本环境中，可以显示页面内通知
    if (typeof document !== 'undefined') {
   this.showPageNotification(message, type);
    }
  }

  /**
   * 显示页面内通知
   */
  private showPageNotification(message: string, type: 'success' | 'error'): void {
    // 创建简单的页面通知
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
 padding: 12px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
opacity: 0;
      transition: opacity 0.3s ease;
    `;

    document.body.appendChild(notification);

    // 显示动画
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // 自动隐藏
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
   if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
        }
    }, 300);
    }, 3000);
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.copyQueue = [];
    this.isProcessingQueue = false;
  }


  /**
   * 测试剪贴板功能
   */
  async testClipboard(): Promise<{
    writeText: boolean;
    writeHTML: boolean;
    permissions: { granted: boolean; canRequest: boolean };
  }> {
    const results = {
      writeText: false,
      writeHTML: false,
      permissions: await this.checkPermissions()
    };

    // 测试文本复制
    try {
      await this.copyWithWriteTextAPI('test');
      results.writeText = true;
    } catch (error) {
      console.warn('Text clipboard test failed:', error);
 }

    // 测试 HTML 复制
    try {
      await this.copyWithModernAPI('<p>test</p>', 'html');
      results.writeHTML = true;
    } catch (error) {
      console.warn('HTML clipboard test failed:', error);
    }

    return results;
  }

  /**
   * 验证媒体信息
   */
  private validateMediaInformation(tweet: TweetData, options: FormatOptions): void {
    console.log('🔍 验证媒体信息...');
    console.log('  推文ID:', tweet.id);
    console.log('  媒体项目数量:', tweet.media.length);
    console.log('  includeMedia选项:', options.includeMedia);
    
    if (tweet.media.length > 0) {
      console.log('  📸 媒体详情:');
      tweet.media.forEach((media, index) => {
    console.log(`    ${index + 1}. 类型: ${media.type}, URL: ${media.url}`);
        if (media.alt) {
        console.log(`    描述: ${media.alt}`);
        }
      });
   
      if (!options.includeMedia) {
        console.warn('  ⚠️ 注意：推文包含媒体但 includeMedia 选项为 false，媒体将不会被包含在复制内容中');
      } else {
   console.log('✅ includeMedia 选项已启用，媒体将被包含在复制内容中');
      }
    } else {
      console.log('  ℹ️ 推文不包含媒体内容');
    }
  }

/**
   * 验证线程媒体信息
   */
  private validateThreadMediaInformation(thread: ThreadData, options: FormatOptions): void {
 console.log('🔍 验证线程媒体信息...');
    console.log('  线程长度:', thread.tweets.length);
  console.log('  includeMedia选项:', options.includeMedia);
    
  let totalMediaCount = 0;
    thread.tweets.forEach((tweet, index) => {
    if (tweet.media.length > 0) {
 totalMediaCount += tweet.media.length;
    console.log(`  推文 ${index + 1} 包含 ${tweet.media.length} 个媒体项目:`);
        tweet.media.forEach((media, mediaIndex) => {
          console.log(`    ${mediaIndex + 1}. 类型: ${media.type}, URL: ${media.url}`);
        });
}
});
    
    console.log(`📊 线程总媒体数量: ${totalMediaCount}`);
    
    if (totalMediaCount > 0) {
   if (!options.includeMedia) {
     console.warn('  ⚠️ 注意：线程包含媒体但 includeMedia 选项为 false，媒体将不会被包含在复制内容中');
   } else {
     console.log('✅ includeMedia 选项已启用，所有媒体将被包含在复制内容中');
      }
    } else {
      console.log('  ℹ️ 线程不包含媒体内容');
    }
  }
}

// 导出单例实例
export const clipboardManager = ClipboardManager.getInstance();