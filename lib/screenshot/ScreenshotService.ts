// 高性能截图服务 - 使用html2canvas-pro实现一键截图功能
import html2canvas from 'html2canvas-pro';
import { TweetData, ThreadData } from '../types';
import { i18nManager } from '../i18n';

/**
 * 截图选项接口
 */
export interface ScreenshotOptions {
  width?: number;
  height?: number;
  scale?: number;
  backgroundColor?: string;
  useCORS?: boolean;
allowTaint?: boolean;
  removeContainer?: boolean;
  format?: 'png' | 'jpeg' | 'webp';
  quality?: number;
  theme?: 'light' | 'dark' | 'auto';
  fileName?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    direction?: string;
    colors: string[];
  };
  useContentOptions?: boolean;
}

/**
 * 截图结果接口
 */
export interface ScreenshotResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  format: string;
  quality: number;
}

/**
 * 高性能截图服务类 - 基于html2canvas-pro
 */
export class ScreenshotService {
  private static instance: ScreenshotService;

  public static getInstance(): ScreenshotService {
    if (!ScreenshotService.instance) {
    ScreenshotService.instance = new ScreenshotService();
    }
    return ScreenshotService.instance;
  }

  private defaultOptions: ScreenshotOptions = {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
    allowTaint: false,
    removeContainer: true,
  format: 'png',
    quality: 0.9,
    theme: 'auto'
  };

  /**
 * 核心截图方法
   * @param element 要截图的HTML元素
 * @param options 截图选项
   * @returns 返回包含Blob和DataURL的对象
   */
  public async capture(
 element: HTMLElement,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
    // 1. 预处理：应用主题（如果需要）
      const originalClasses = element.className;
      if (mergedOptions.theme && mergedOptions.theme !== 'auto') {
 element.classList.add(`theme-${mergedOptions.theme}`);
      }

 // 2. 使用 html2canvas-pro 生成截图
      const canvas = await html2canvas(element, {
   width: mergedOptions.width,
   height: mergedOptions.height,
        scale: mergedOptions.scale,
        backgroundColor: mergedOptions.backgroundColor,
        useCORS: mergedOptions.useCORS,
        allowTaint: mergedOptions.allowTaint
      });

      // 恢复元素的原始状态
      if (mergedOptions.theme && mergedOptions.theme !== 'auto') {
        element.className = originalClasses;
   }

      // 3. 处理Canvas并导出结果
 const result = await this.processCanvas(canvas, mergedOptions);

    return result;
    } catch (error) {
   console.error('ScreenshotService capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        (i18nManager.t('screenshot_failed') || 'Screenshot failed') + ': ' + errorMessage
      );
    }
  }

  /**
   * 处理Canvas转换为所需格式
   */
  private async processCanvas(canvas: HTMLCanvasElement, options: ScreenshotOptions): Promise<ScreenshotResult> {
    const format = options.format || 'png';
    const quality = options.quality || 0.9;
  
    // 生成DataURL
    const dataUrl = canvas.toDataURL(`image/${format}`, quality);
    
 // 转换为Blob
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
   resolve(blob!);
      }, `image/${format}`, quality);
    });
    
  return {
      canvas,
      dataUrl,
      blob,
      width: canvas.width,
      height: canvas.height,
      format,
      quality
    };
  }

  /**
   * 截图推文线程
   */
  async captureThread(
    threadTweets: HTMLElement[],
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 创建线程容器
      const threadContainer = await this.createThreadContainer(threadTweets);
      
   // 生成截图
      const result = await this.capture(threadContainer, mergedOptions);
      
      // 清理临时容器
      if (mergedOptions.removeContainer) {
        threadContainer.remove();
    }
      
   return result;
    } catch (error) {
      console.error('Failed to capture thread:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
        (i18nManager.t('thread_screenshot_failed') || 'Thread screenshot failed') + ': ' + errorMessage
      );
    }
  }

  /**
   * 创建线程容器
   */
  private async createThreadContainer(threadTweets: HTMLElement[]): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
      left: -9999px;
      top: -9999px;
      width: 580px;
      background: #ffffff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
    
    // 添加线程标题
    const threadHeader = document.createElement('div');
    threadHeader.style.cssText = `
      font-size: 18px;
    font-weight: 600;
      color: #0f1419;
      margin-bottom: 20px;
 text-align: center;
      border-bottom: 2px solid #1d9bf0;
   padding-bottom: 10px;
    `;
    threadHeader.textContent = `Thread (${threadTweets.length} tweets)`;
    container.appendChild(threadHeader);
    
    document.body.appendChild(container);
    return container;
  }

  /**
   * 下载截图
*/
  async downloadScreenshot(result: ScreenshotResult, filename?: string): Promise<void> {
    try {
      const finalFilename = filename || `twitter-screenshot-${Date.now()}.${result.format}`;
      
      // 创建下载链接
      const link = document.createElement('a');
    link.download = finalFilename;
link.href = result.dataUrl;
 
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to download screenshot:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
 (i18nManager.t('download_failed') || 'Download failed') + ': ' + errorMessage
      );
    }
  }

  /**
   * 复制截图到剪贴板
   */
  async copyScreenshotToClipboard(result: ScreenshotResult): Promise<void> {
    try {
      if (navigator.clipboard && navigator.clipboard.write) {
        // 使用现代 Clipboard API
        const clipboardItem = new ClipboardItem({
          [`image/${result.format}`]: result.blob
        });
        
        await navigator.clipboard.write([clipboardItem]);
      } else {
        // 降级方案：复制DataURL
    const textArea = document.createElement('textarea');
   textArea.value = result.dataUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (error) {
      console.error('Failed to copy screenshot:', error);
 const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(
      (i18nManager.t('copy_failed') || 'Copy failed') + ': ' + errorMessage
      );
    }
  }

  /**
   * 截图单个推文（向后兼容）
   */
  async captureTweet(
    tweetElement: HTMLElement,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    return this.capture(tweetElement, options);
  }

  /**
   * 获取截图能力信息
   */
  getCapabilities(): {
    html2canvas: boolean;
    clipboard: boolean;
    download: boolean;
    formats: string[];
  } {
    return {
      html2canvas: typeof html2canvas === 'function',
      clipboard: !!(navigator.clipboard && navigator.clipboard.write),
      download: true,
      formats: ['png', 'jpeg', 'webp']
    };
  }
}

// 创建单例实例
export const screenshotService = ScreenshotService.getInstance();