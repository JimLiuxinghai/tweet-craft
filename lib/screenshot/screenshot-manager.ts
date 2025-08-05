// 高性能截图服务 - 使用snapdom实现一键截图功能
import { toSvg } from '@zumer/snapdom';
import { TweetData, ThreadData } from '../types';
import { i18nManager } from '../i18n';
import { createError, ErrorCategory } from '../utils/errorManager';

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
}

/**
 * 截图结果接口
 */
interface ScreenshotResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  format: string;
  quality: number;
}

/**
 * 截图管理器类（保持向后兼容）
 */
export class ScreenshotManager {
  private static instance: ScreenshotManager;

  public static getInstance(): ScreenshotManager {
  if (!ScreenshotManager.instance) {
      ScreenshotManager.instance = new ScreenshotManager();
    }
    return ScreenshotManager.instance;
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
   * 截图单个推文
   * @param tweetElement 推文DOM元素
   * @param options 截图选项
   * @returns 截图结果
   */
  async captureTweet(
    tweetElement: HTMLElement,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
 const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 预处理推文元素
      const processedElement = await this.preprocessTweetElement(tweetElement);
      
    // 生成截图
      const canvas = await html2canvas(processedElement, {
      backgroundColor: mergedOptions.backgroundColor,
        scale: mergedOptions.scale,
        useCORS: mergedOptions.useCORS,
        allowTaint: mergedOptions.allowTaint,
   width: mergedOptions.width,
        height: mergedOptions.height,
        onclone: (clonedDoc) => {
     // 清理克隆文档中的不必要元素
          this.cleanupClonedDocument(clonedDoc);
     }
      });

      // 转换为所需格式
      const result = await this.processCanvas(canvas, mergedOptions);
      
      // 清理临时元素
      if (mergedOptions.removeContainer && processedElement !== tweetElement) {
        processedElement.remove();
      }
      
      return result;

    } catch (error) {
    console.error('Failed to capture tweet:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Screenshot failed: ${errorMessage}`);
    }
  }

  /**
   * 截图推文线程
   * @param threadTweets 线程推文列表
   * @param options 截图选项
   * @returns 截图结果
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
      const canvas = await html2canvas(threadContainer, {
        backgroundColor: mergedOptions.backgroundColor,
        scale: mergedOptions.scale,
        useCORS: mergedOptions.useCORS,
        allowTaint: mergedOptions.allowTaint,
 width: mergedOptions.width,
        onclone: (clonedDoc) => {
          this.cleanupClonedDocument(clonedDoc);
        }
      });

      // 转换为所需格式
      const result = await this.processCanvas(canvas, mergedOptions);
      
 // 清理临时容器
      if (mergedOptions.removeContainer) {
   threadContainer.remove();
   }
      
      return result;
      
    } catch (error) {
    console.error('Failed to capture thread:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
   throw new Error(`Thread screenshot failed: ${errorMessage}`);
    }
  }

  /**
   * 截图自定义HTML内容
   * @param htmlContent HTML内容字符串
   * @param options 截图选项
   * @returns 截图结果
   */
  async captureHTML(
    htmlContent: string,
    options: ScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
 const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // 创建临时容器
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = htmlContent;
      tempContainer.style.cssText = `
   position: absolute;
        left: -9999px;
 top: -9999px;
      width: 580px;
        padding: 20px;
        background: #ffffff;
      border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #0f1419;
        line-height: 1.4;
      `;
      
      document.body.appendChild(tempContainer);
    
      // 生成截图
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: mergedOptions.backgroundColor,
        scale: mergedOptions.scale,
     useCORS: mergedOptions.useCORS,
        allowTaint: mergedOptions.allowTaint,
        width: mergedOptions.width,
        height: mergedOptions.height
      });

      // 转换为所需格式
   const result = await this.processCanvas(canvas, mergedOptions);
      
    // 清理临时容器
      if (mergedOptions.removeContainer) {
   tempContainer.remove();
      }
   
      return result;
      
    } catch (error) {
      console.error('Failed to capture HTML:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`HTML screenshot failed: ${errorMessage}`);
    }
  }

  /**
   * 预处理推文元素
   * @param tweetElement 原始推文元素
   * @returns 处理后的元素
   */
  private async preprocessTweetElement(tweetElement: HTMLElement): Promise<HTMLElement> {
    // 克隆元素以避免修改原始DOM
    const clonedElement = tweetElement.cloneNode(true) as HTMLElement;
    
    // 设置样式以确保正确渲染
    clonedElement.style.cssText = `
      position: absolute;
    left: -9999px;
      top: -9999px;
      width: 580px;
      background: #ffffff;
      border-radius: 12px;
   border: 1px solid #e1e8ed;
      overflow: hidden;
    `;
    
    // 添加到文档中进行渲染
  document.body.appendChild(clonedElement);
    
    // 等待图片加载
    await this.waitForImages(clonedElement);
    
    // 移除不必要的元素
    this.removeUnwantedElements(clonedElement);
    
    return clonedElement;
  }

  /**
   * 创建线程容器
   * @param threadTweets 线程推文列表
   * @returns 线程容器元素
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
    
    // 添加推文
    for (let i = 0; i < threadTweets.length; i++) {
      const tweetClone = threadTweets[i].cloneNode(true) as HTMLElement;
      
      // 设置推文样式
      tweetClone.style.cssText = `
        margin-bottom: 20px;
        padding: 15px;
   border: 1px solid #e1e8ed;
        border-radius: 8px;
      background: #ffffff;
  position: relative;
      `;
      
      // 添加线程序号
      const threadNumber = document.createElement('div');
      threadNumber.style.cssText = `
        position: absolute;
  top: -10px;
        left: 10px;
     background: #1d9bf0;
        color: white;
        padding: 2px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
      `;
      threadNumber.textContent = `${i + 1}`;
      tweetClone.appendChild(threadNumber);
      
      // 移除不必要的元素
    this.removeUnwantedElements(tweetClone);
    
   container.appendChild(tweetClone);
    }
    
    document.body.appendChild(container);
    
    // 等待所有图片加载
    await this.waitForImages(container);
    
    return container;
  }

  /**
   * 处理Canvas转换为所需格式
   * @param canvas Canvas元素
   * @param options 截图选项
   * @returns 截图结果
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
* 清理克隆文档中的不必要元素
   * @param clonedDoc 克隆的文档
 */
  private cleanupClonedDocument(clonedDoc: Document): void {
    // 移除脚本标签
    const scripts = clonedDoc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 移除动画元素
    const animations = clonedDoc.querySelectorAll('[class*="animate"]');
    animations.forEach(el => el.remove());
    
    // 移除悬停效果
    const hoverElements = clonedDoc.querySelectorAll('[class*="hover"]');
    hoverElements.forEach(el => {
      el.classList.remove(...Array.from(el.classList).filter(cls => cls.includes('hover')));
    });
  }

  /**
   * 移除不必要的元素
   * @param element 要清理的元素
   */
  private removeUnwantedElements(element: HTMLElement): void {
  // 移除按钮和交互元素
    const buttons = element.querySelectorAll('button, [role="button"]');
  buttons.forEach(btn => btn.remove());
    
    // 移除菜单和下拉列表
    const menus = element.querySelectorAll('[role="menu"], [aria-haspopup="true"]');
    menus.forEach(menu => menu.remove());
    
  // 移除广告
    const ads = element.querySelectorAll('[data-testid*="ad"], [class*="promoted"]');
    ads.forEach(ad => ad.remove());
    
    // 移除工具提示
    const tooltips = element.querySelectorAll('[role="tooltip"], [class*="tooltip"]');
    tooltips.forEach(tooltip => tooltip.remove());
  }

  /**
   * 等待图片加载完成
   * @param element 包含图片的元素
   */
  private async waitForImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const promises = Array.from(images).map(img => {
   return new Promise<void>((resolve) => {
        if (img.complete) {
   resolve();
      } else {
     img.onload = () => resolve();
      img.onerror = () => resolve(); // 即使加载失败也继续
          // 设置超时避免无限等待
       setTimeout(() => resolve(), 3000);
     }
      });
    });
    
 await Promise.all(promises);
  }

  /**
   * 下载截图
   * @param result 截图结果
   * @param filename 文件名
   */
  async downloadScreenshot(result: ScreenshotResult, filename: string): Promise<void> {
    try {
      // 创建下载链接
  const link = document.createElement('a');
      link.download = filename;
 link.href = result.dataUrl;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
  document.body.removeChild(link);
      
  } catch (error) {
      console.error('Failed to download screenshot:', error);
   const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Download failed: ${errorMessage}`);
    }
  }

  /**
   * 复制截图到剪贴板
   * @param result 截图结果
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
      throw new Error(`Copy failed: ${errorMessage}`);
    }
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
export const screenshotManager = new ScreenshotManager();