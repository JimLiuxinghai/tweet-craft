// 增强的截图服务 - 支持渐变背景和复制功能选项复用
import { ScreenshotService, ScreenshotOptions, ScreenshotResult } from './ScreenshotService';
import { FormatOptions } from '../types';
import { getSettings } from '../utils/storage';
import { i18nManager } from '../i18n';
import { getGradientPresets, getGradientByName, getRandomGradient, type GradientPreset } from './gradient-presets';

/**
 * 增强的截图选项接口，集成了复制功能的选项
 */
export interface EnhancedScreenshotOptions extends ScreenshotOptions {
  useContentOptions?: boolean;
  formatOptions?: FormatOptions;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    direction?: string;
    colors: string[];
  };
  includeMetrics?: boolean;
}

/**
 * 增强的截图服务类
 * 在原有截图功能基础上添加渐变背景和复制功能选项复用
 */
export class EnhancedScreenshotService extends ScreenshotService {
  private static enhancedInstance: EnhancedScreenshotService;

  public static getInstance(): EnhancedScreenshotService {
    if (!EnhancedScreenshotService.enhancedInstance) {
      EnhancedScreenshotService.enhancedInstance = new EnhancedScreenshotService();
    }
    return EnhancedScreenshotService.enhancedInstance;
  }

  /**
   * 增强的截图方法，支持渐变背景和内容选项复用
   */
  public async enhancedCapture(
    element: HTMLElement,
    options: EnhancedScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    // 1. 应用格式选项到截图选项
    const finalOptions = await this.mergeWithContentOptions(options);

    // 2. 创建包装容器以应用渐变背景
    const wrappedElement = await this.wrapElementWithGradientBackground(element, finalOptions);
    
    // 3. 预处理：应用主题（如果需要）
    const originalClasses = element.className;
    if (finalOptions.theme && finalOptions.theme !== 'auto') {
      element.classList.add(`theme-${finalOptions.theme}`);
    }

    try {
      // 4. 使用 html2canvas-pro 生成截图
      const canvas = await this.performScreenshot(wrappedElement, finalOptions);

      // 5. 恢复元素的原始状态
      if (finalOptions.theme && finalOptions.theme !== 'auto') {
   element.className = originalClasses;
      }

   // 6. 清理临时容器
      if (wrappedElement !== element) {
  wrappedElement.remove();
      }

      // 7. 处理Canvas并导出结果
  const result = await this.processCanvasEnhanced(canvas, finalOptions);

      return result;
    } catch (error) {
  // 清理资源
      if (finalOptions.theme && finalOptions.theme !== 'auto') {
        element.className = originalClasses;
      }
      if (wrappedElement !== element) {
        wrappedElement.remove();
      }

      console.error('Enhanced screenshot capture failed:', error);
 throw new Error(
        (i18nManager.t('screenshot_failed') || 'Screenshot failed') + ': ' + error
      );
  }
  }

  /**
   * 创建带渐变背景的包装元素
*/
  private async wrapElementWithGradientBackground(element: HTMLElement, options: EnhancedScreenshotOptions): Promise<HTMLElement> {
    // 如果没有指定背景，返回原始元素
    if (!options.backgroundColor && !options.backgroundGradient) {
      return element;
    }

    // 获取原始元素的尺寸
    const originalRect = element.getBoundingClientRect();
    
    // 防止尺寸为零的情况，设置合理的默认值
    const elementWidth = Math.max(originalRect.width, 600);  // 最小600px宽度
    const elementHeight = Math.max(originalRect.height, 200); // 最小200px高度

 // 创建包装容器
 const wrapper = document.createElement('div');
    wrapper.style.cssText = `
    position: absolute;
      left: -9999px;
top: -9999px;
  padding: 32px;
 border-radius: 16px;
 display: inline-block;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  width: ${elementWidth + 64}px;
      max-width: ${elementWidth + 64}px;
      min-width: ${elementWidth + 64}px;
      box-sizing: border-box;
    `;

    // 设置背景
    if (options.backgroundGradient) {
 const { type, direction, colors } = options.backgroundGradient;
      const gradientDirection = direction || (type === 'linear' ? 'to right' : 'circle');
      const colorStops = colors.join(', ');
      wrapper.style.background = `${type}-gradient(${gradientDirection}, ${colorStops})`;
    } else if (options.backgroundColor) {
      wrapper.style.backgroundColor = options.backgroundColor;
    }

    // 克隆元素并添加到包装器
    const clonedElement = element.cloneNode(true) as HTMLElement;
      clonedElement.style.cssText = `
      background: white;
      border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
   overflow: hidden;
      width: ${elementWidth}px;
      max-width: ${elementWidth}px;
      box-sizing: border-box;
    `;

    wrapper.appendChild(clonedElement);
    document.body.appendChild(wrapper);

    // 等待图片加载
    await this.waitForImagesEnhanced(wrapper);

 return wrapper;
  }

  /**
   * 合并内容选项到截图选项
   */
  private async mergeWithContentOptions(options: EnhancedScreenshotOptions): Promise<EnhancedScreenshotOptions> {
    // 如果不使用内容选项，直接返回
    if (!options.useContentOptions) {
      return options;
    }

 try {
      // 获取当前的扩展设置
      const settings = await getSettings();
      
 // 从设置中获取格式选项，或使用提供的格式选项
    const formatOptions = options.formatOptions || {
        format: settings.format,
        includeAuthor: settings.includeAuthor,
        includeTimestamp: settings.includeTimestamp,
        includeMetrics: settings.includeMetrics,
        includeMedia: settings.includeMedia,
        includeLink: settings.includeLink
 };

      // 应用格式选项到截图选项
      const mergedOptions: EnhancedScreenshotOptions = {
        ...options,
        // 如果内容选项包含metrics，则显示metrics
        includeMetrics: formatOptions.includeMetrics,
        // 根据设置主题
        theme: settings.theme || options.theme,
        // 如果使用截图背景设置
backgroundColor: options.backgroundColor || settings.screenshotOptions?.backgroundColor,
        backgroundGradient: options.backgroundGradient || settings.screenshotOptions?.backgroundGradient
    };

      return mergedOptions;
 } catch (error) {
 console.warn('Failed to merge content options:', error);
      return options;
    }
  }

  /**
   * 执行截图操作
   */
  private async performScreenshot(element: HTMLElement, options: EnhancedScreenshotOptions): Promise<HTMLCanvasElement> {
    const html2canvas = await this.loadHtml2Canvas();
    
    return html2canvas(element, {
      width: options.width,
      height: options.height,
      scale: options.scale,
      backgroundColor: 'transparent', // 使用透明背景让包装容器背景显示
      useCORS: options.useCORS,
      allowTaint: options.allowTaint
  });
  }

  /**
   * 动态加载 html2canvas
   */
  private async loadHtml2Canvas(): Promise<any> {
    // 如果已经加载，直接返回
    if (typeof window !== 'undefined' && (window as any).html2canvas) {
      return (window as any).html2canvas;
    }

    // 动态导入 html2canvas
    try {
      const html2canvasModule = await import('html2canvas-pro');
      return html2canvasModule.default || html2canvasModule;
    } catch (error) {
      console.error('Failed to load html2canvas:', error);
    throw new Error('Failed to load screenshot library');
    }
  }

  /**
   * 等待图片加载完成
   */
  private async waitForImagesEnhanced(element: HTMLElement): Promise<void> {
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
   * 展开线程中所有推文的长内容
   */
  private async expandAllTweetsInThread(threadTweets: HTMLElement[]): Promise<void> {
    try {
  // 并行展开所有推文内容
    const expandPromises = threadTweets.map(async (tweetElement, index) => {
   try {
          await this.expandTweetContentForScreenshot(tweetElement);
  console.log(`Expanded tweet ${index + 1}/${threadTweets.length}`);
      } catch (error) {
     console.warn(`Failed to expand tweet ${index + 1}:`, error);
   // 即使单个推文展开失败，也继续处理其他推文
        }
  });
      
   await Promise.all(expandPromises);
      
 // 等待所有内容渲染完成
      await new Promise(resolve => setTimeout(resolve, 500));
  
  } catch (error) {
      console.warn('Failed to expand tweets in thread:', error);
      // 即使展开失败也继续截图
 }
  }

  /**
   * 查找主推文的Show more按钮，排除引用推文内的按钮（用于截图）
   */
  private findMainTweetShowMoreButtonForScreenshot(tweetElement: HTMLElement): HTMLElement | null {
    // 查找所有的Show more按钮
    const allShowMoreButtons = tweetElement.querySelectorAll('[data-testid="tweet-text-show-more-link"], a[data-testid="tweet-text-show-more-link"], button[data-testid="tweet-text-show-more-link"]');
    
    if (allShowMoreButtons.length === 0) {
      return null;
 }
    
 // 如果只有一个按钮，直接返回
   if (allShowMoreButtons.length === 1) {
      return allShowMoreButtons[0] as HTMLElement;
    }
    
    // 如果有多个按钮，需要区分主推文和引用推文的按钮
for (const button of allShowMoreButtons) {
   const buttonElement = button as HTMLElement;
  
      // 检查按钮是否在引用推文容器内
      const quoteTweetContainer = this.findAncestor(buttonElement, '[role="link"][tabindex="0"]');
      
      // 如果按钮不在引用推文容器内，则认为是主推文的按钮
      if (!quoteTweetContainer) {
     return buttonElement;
      }
   
      // 额外检查：如果按钮的父级链中没有引用推文的特征元素，则是主推文按钮
 const hasQuoteIndicator = this.findAncestor(buttonElement, '[aria-labelledby*="Quote"]');
      if (!hasQuoteIndicator) {
    return buttonElement;
      }
    }
    
    // 如果都无法确定，返回第一个（通常是主推文的）
 return allShowMoreButtons[0] as HTMLElement;
  }

  /**
   * 查找主推文的Show less按钮，排除引用推文内的按钮（用于截图）
   */
  private findMainTweetShowLessButtonForScreenshot(tweetElement: HTMLElement): HTMLElement | null {
    // 查找所有的Show less按钮
    const allShowLessButtons = tweetElement.querySelectorAll('[data-testid="tweet-text-show-less-link"], a[data-testid="tweet-text-show-less-link"], button[data-testid="tweet-text-show-less-link"]');
    
    if (allShowLessButtons.length === 0) {
      return null;
    }
    
 // 如果只有一个按钮，直接返回
    if (allShowLessButtons.length === 1) {
return allShowLessButtons[0] as HTMLElement;
    }
  
    // 如果有多个按钮，需要区分主推文和引用推文的按钮
    for (const button of allShowLessButtons) {
      const buttonElement = button as HTMLElement;
      
      // 检查按钮是否在引用推文容器内
      const quoteTweetContainer = this.findAncestor(buttonElement, '[role="link"][tabindex="0"]');
      
      // 如果按钮不在引用推文容器内，则认为是主推文的按钮
      if (!quoteTweetContainer) {
   return buttonElement;
      }
      
// 额外检查：如果按钮的父级链中没有引用推文的特征元素，则是主推文按钮
      const hasQuoteIndicator = this.findAncestor(buttonElement, '[aria-labelledby*="Quote"]');
  if (!hasQuoteIndicator) {
     return buttonElement;
      }
  }
  
    // 如果都无法确定，返回第一个（通常是主推文的）
    return allShowLessButtons[0] as HTMLElement;
  }

  /**
   * 查找祖先元素（类似closest函数）
 */
  private findAncestor(element: HTMLElement, selector: string): HTMLElement | null {
    let current = element.parentElement;
    while (current) {
      if (current.matches && current.matches(selector)) {
     return current;
      }
  current = current.parentElement;
 }
return null;
  }

  /**
   * 为截图展开推文内容（复制自主类的expandTweetContent方法）
 */
  private async expandTweetContentForScreenshot(tweetElement: HTMLElement): Promise<void> {
    try {
  // 查找主推文级别的Show more按钮（排除引用推文内的按钮）
  const showMoreButton = this.findMainTweetShowMoreButtonForScreenshot(tweetElement);
      if (!showMoreButton) {
    // 没有Show more按钮，内容已经完整显示
   return;
      }

      // 检查按钮是否可见且可点击
   if (!showMoreButton.offsetParent || showMoreButton.style.display === 'none') {
return;
   }

      // 安全点击Show more按钮 - 阻止默认的链接跳转行为
  const clickEvent = new MouseEvent('click', {
  view: window,
        bubbles: true,
  cancelable: true
      });
   
  // 添加事件监听器来阻止默认行为
  const preventNavigation = (e: Event) => {
  e.preventDefault();
   e.stopPropagation();
      };
      
   showMoreButton.addEventListener('click', preventNavigation, { once: true });
   showMoreButton.dispatchEvent(clickEvent);
  
   // 清理事件监听器（防止意外情况）
      setTimeout(() => {
 showMoreButton.removeEventListener('click', preventNavigation);
      }, 100);
      
      // 等待内容展开，并验证是否成功展开
  let attempts = 0;
      const maxAttempts = 10;
      
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
  
        // 检查Show more按钮是否已消失或变成Show less
      const currentButton = this.findMainTweetShowMoreButtonForScreenshot(tweetElement);
        const showLessButton = this.findMainTweetShowLessButtonForScreenshot(tweetElement);
   
        if (!currentButton || showLessButton) {
      console.log('Long tweet content expanded successfully for screenshot');
  return;
}
        
        attempts++;
      }
      
      console.warn('Tweet expansion for screenshot may not have completed, but continuing...');
      
   } catch (error) {
 console.warn('Failed to expand tweet content for screenshot:', error);
  // 即使展开失败，也继续处理，可能会截到部分内容
    }
  }

  /**
   * 处理Canvas转换为所需格式
   */
  private async processCanvasEnhanced(canvas: HTMLCanvasElement, options: EnhancedScreenshotOptions): Promise<ScreenshotResult> {
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
   * 截图单个推文（覆盖父类方法）
   */
  async captureTweet(
    tweetElement: HTMLElement,
    options: EnhancedScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    return this.enhancedCapture(tweetElement, {
      ...options,
      useContentOptions: options.useContentOptions ?? true
    });
  }

  /**
   * 截图推文线程（覆盖父类方法）
   */
  async captureThread(
    threadTweets: HTMLElement[],
    options: EnhancedScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const mergedOptions = { 
      ...options, 
      useContentOptions: options.useContentOptions ?? true 
    };
    
    try {
 // 首先展开所有线程中的长推文内容
      await this.expandAllTweetsInThread(threadTweets);
      
  // 创建线程容器
const threadContainer = await this.createEnhancedThreadContainer(threadTweets, mergedOptions);
      
 // 生成截图
      const result = await this.enhancedCapture(threadContainer, mergedOptions);
   
      // 清理临时容器
      if (mergedOptions.removeContainer !== false) {
   threadContainer.remove();
 }
      
      return result;
    } catch (error) {
      console.error('Failed to capture thread:', error);
  throw new Error(
      (i18nManager.t('thread_screenshot_failed') || 'Thread screenshot failed') + ': ' + error
      );
    }
  }

  /**
   * 创建增强的线程容器
   */
  private async createEnhancedThreadContainer(threadTweets: HTMLElement[], options: EnhancedScreenshotOptions): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.cssText = `
      position: absolute;
  left: -9999px;
      top: -9999px;
      width: 600px;
  background: transparent;
      padding: 24px;
      border-radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
    `;
    
    // 添加线程标题（如果需要显示metrics等信息）
    if (options.includeMetrics) {
      const threadHeader = document.createElement('div');
      threadHeader.style.cssText = `
        font-size: 20px;
font-weight: 700;
        color: #0f1419;
      margin-bottom: 24px;
     text-align: center;
        padding-bottom: 16px;
        border-bottom: 2px solid #1d9bf0;
      `;
      threadHeader.textContent = `🧵 Thread (${threadTweets.length} tweets)`;
      container.appendChild(threadHeader);
    }
    
    // 添加推文
    for (let i = 0; i < threadTweets.length; i++) {
      const tweetClone = threadTweets[i].cloneNode(true) as HTMLElement;
      
   // 设置推文样式
      tweetClone.style.cssText = `
        margin-bottom: 20px;
        padding: 20px;
  border: 1px solid #e1e8ed;
        border-radius: 12px;
        background: white;
        position: relative;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    `;
      
      // 添加线程序号
      const threadNumber = document.createElement('div');
      threadNumber.style.cssText = `
        position: absolute;
        top: -12px;
        left: 16px;
        background: linear-gradient(45deg, #1d9bf0, #0d8bd9);
        color: white;
      padding: 4px 12px;
      border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(29, 155, 240, 0.3);
`;
      threadNumber.textContent = `${i + 1}`;
      tweetClone.appendChild(threadNumber);
   
  container.appendChild(tweetClone);
    }
    
    document.body.appendChild(container);
    
    // 等待所有图片加载
    await this.waitForImagesEnhanced(container);
    
    return container;
  }

  /**
   * 获取预设的渐变背景
   */
  static getPresetGradients(): Array<{
    name: string;
    gradient: {
      type: 'linear' | 'radial';
      direction?: string;
      colors: string[];
    };
  }> {
    return [
      {
        name: 'Twitter Blue',
      gradient: {
          type: 'linear',
      direction: 'to right',
          colors: ['#1DA1F2', '#0d8bd9']
    }
      },
      {
        name: 'Sunset',
        gradient: {
     type: 'linear',
      direction: 'to right',
          colors: ['#FF6B6B', '#FFE66D', '#FF8E53']
        }
      },
      {
 name: 'Ocean',
        gradient: {
          type: 'linear',
      direction: 'to bottom right',
          colors: ['#667eea', '#764ba2']
     }
      },
      {
   name: 'Purple Dream',
        gradient: {
          type: 'linear',
          direction: 'to right',
          colors: ['#a8edea', '#fed6e3']
        }
      },
      {
    name: 'Nature',
        gradient: {
  type: 'linear',
    direction: 'to bottom',
   colors: ['#56ab2f', '#a8e6cf']
        }
      },
   {
        name: 'Night Sky',
     gradient: {
       type: 'radial',
    direction: 'circle',
          colors: ['#2c3e50', '#4a6741', '#34495e']
     }
      },
      {
  name: 'Warm Gradient',
        gradient: {
          type: 'linear',
          direction: 'to bottom right',
     colors: ['#f093fb', '#f5576c']
        }
      },
      {
        name: 'Cool Blue',
        gradient: {
          type: 'linear',
          direction: 'to right',
          colors: ['#4facfe', '#00f2fe']
        }
      }
  ];
}

  /**
   * 根据名称获取渐变预设
   */
  static getGradientByName(name: string): GradientPreset | undefined {
    return getGradientByName(name);
  }

  /**
   * 获取随机渐变预设
   */
  static getRandomGradient(): GradientPreset {
    return getRandomGradient();
  }

  /**
   * 使用预设渐变截图
   */
  async captureWithGradient(
    element: HTMLElement,
    gradientName: string,
    options: EnhancedScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const gradient = getGradientByName(gradientName);
    if (!gradient) {
      throw new Error(`Gradient preset "${gradientName}" not found`);
    }

    return this.enhancedCapture(element, {
      ...options,
      backgroundGradient: gradient.gradient
    });
  }

  /**
   * 使用随机渐变截图
   */
  async captureWithRandomGradient(
    element: HTMLElement,
    options: EnhancedScreenshotOptions = {}
  ): Promise<ScreenshotResult> {
    const gradient = getRandomGradient();
    
    return this.enhancedCapture(element, {
      ...options,
      backgroundGradient: gradient.gradient
    });
  }
}

// 导出增强的截图服务实例
export const enhancedScreenshotService = EnhancedScreenshotService.getInstance();