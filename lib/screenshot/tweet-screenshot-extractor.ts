// 推文截图提取器 - 专门处理Twitter/X推文的截图
import { screenshotManager } from './screenshot-manager';
import { tweetParser } from '../parsers';
import { TweetData } from '../types';

/**
 * 推文截图提取器类
 */
export class TweetScreenshotExtractor {
  /**
   * 从推文元素截图
   * @param tweetElement 推文DOM元素
   * @param options 截图选项
   * @returns 截图结果
   */
  async extractFromElement(
    tweetElement: HTMLElement,
    options: any = {}
  ): Promise<any> {
    try {
      // 获取推文数据
    const tweetData = await tweetParser.parseTweet(tweetElement);
      
      // 增强元素以便截图
      const enhancedElement = await this.enhanceTweetElement(tweetElement, tweetData);
      
      // 生成截图
      const result = await screenshotManager.captureTweet(enhancedElement, {
        ...options,
        removeContainer: true
 });
      
      return {
   ...result,
        tweetData,
 timestamp: new Date(),
        metadata: {
        author: tweetData.author,
          content: tweetData.content,
   tweetId: tweetData.tweetId,
        url: tweetData.url,
     timestamp: tweetData.timestamp
     }
      };
      
    } catch (error) {
      console.error('Failed to extract tweet screenshot:', error);
    throw new Error(`Tweet screenshot extraction failed: ${error.message}`);
    }
  }

  /**
   * 从推文URL截图
   * @param tweetUrl 推文URL
   * @param options 截图选项
   * @returns 截图结果
   */
  async extractFromUrl(
    tweetUrl: string,
    options: any = {}
  ): Promise<any> {
    try {
 // 查找页面中的推文元素
      const tweetElement = this.findTweetElementByUrl(tweetUrl);
      if (!tweetElement) {
     throw new Error('Tweet element not found on current page');
      }
      
   return await this.extractFromElement(tweetElement, options);
      
  } catch (error) {
      console.error('Failed to extract tweet screenshot from URL:', error);
      throw new Error(`URL screenshot extraction failed: ${error.message}`);
    }
  }

  /**
   * 从推文数据生成截图
   * @param tweetData 推文数据
   * @param options 截图选项
   * @returns 截图结果
   */
  async generateFromData(
    tweetData: TweetData,
    options: any = {}
): Promise<any> {
    try {
      // 生成推文HTML
      const tweetHtml = this.generateTweetHtml(tweetData);
    
      // 生成截图
      const result = await screenshotManager.captureHTML(tweetHtml, {
        ...options,
        removeContainer: true
});
      
      return {
   ...result,
        tweetData,
 timestamp: new Date(),
        metadata: {
  author: tweetData.author,
          content: tweetData.content,
          tweetId: tweetData.tweetId,
       url: tweetData.url,
          timestamp: tweetData.timestamp
}
  };
      
    } catch (error) {
    console.error('Failed to generate tweet screenshot from data:', error);
      throw new Error(`Data screenshot generation failed: ${error.message}`);
    }
  }

  /**
   * 批量处理推文截图
   * @param tweetElements 推文元素列表
* @param options 截图选项
   * @returns 截图结果列表
   */
  async batchExtract(
    tweetElements: HTMLElement[],
  options: any = {}
  ): Promise<any[]> {
    const results = [];
    
    for (const element of tweetElements) {
      try {
        const result = await this.extractFromElement(element, options);
    results.push(result);
      } catch (error) {
        console.warn('Failed to extract screenshot from element:', error);
 results.push({
       error: error.message,
     element: element.outerHTML.substring(0, 100) + '...'
        });
      }
    }
    
    return results;
  }

  /**
   * 增强推文元素以便截图
 * @param tweetElement 原始推文元素
   * @param tweetData 推文数据
   * @returns 增强后的元素
   */
  private async enhanceTweetElement(
    tweetElement: HTMLElement, 
    tweetData: TweetData
  ): Promise<HTMLElement> {
    // 克隆元素
    const enhanced = tweetElement.cloneNode(true) as HTMLElement;
    
    // 添加截图专用样式
    enhanced.style.cssText = `
      width: 580px;
      max-width: 580px;
      background: #ffffff;
      border: 1px solid #e1e8ed;
      border-radius: 12px;
      padding: 16px;
      margin: 0;
    position: relative;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.4;
      color: #0f1419;
    overflow: hidden;
    `;
    
    // 添加水印
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 12px;
      font-size: 10px;
      color: #657786;
      opacity: 0.7;
      font-weight: 500;
    `;
watermark.textContent = 'via Tweet Craft';
    enhanced.appendChild(watermark);
    
    // 添加时间戳
    const timestamp = document.createElement('div');
    timestamp.style.cssText = `
    position: absolute;
      top: 8px;
      right: 12px;
      font-size: 11px;
      color: #657786;
      background: rgba(255, 255, 255, 0.9);
    padding: 2px 6px;
      border-radius: 4px;
    `;
    timestamp.textContent = new Date().toLocaleString();
    enhanced.appendChild(timestamp);
    
    // 清理不必要的元素
    this.cleanupScreenshotElement(enhanced);
    
    return enhanced;
  }

  /**
* 根据URL查找推文元素
   * @param url 推文URL
   * @returns 推文元素
   */
  private findTweetElementByUrl(url: string): HTMLElement | null {
    // 从URL提取推文ID
    const tweetId = this.extractTweetIdFromUrl(url);
    if (!tweetId) return null;
    
    // 可能的选择器
    const selectors = [
      `article[data-testid="tweet"][data-tweet-id="${tweetId}"]`,
      `div[data-testid="tweet"][data-tweet-id="${tweetId}"]`,
      `[data-testid="tweet"]`,
      `article[role="article"]`
    ];
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        const href = element.querySelector('a[href*="status"]')?.getAttribute('href');
    if (href && href.includes(tweetId)) {
          return element as HTMLElement;
        }
      }
    }
    
    return null;
  }

  /**
   * 从URL提取推文ID
   * @param url 推文URL
   * @returns 推文ID
   */
  private extractTweetIdFromUrl(url: string): string | null {
    const match = url.match(/status\/(\d+)/);
  return match ? match[1] : null;
  }

  /**
   * 生成推文HTML
   * @param tweetData 推文数据
   * @returns HTML字符串
*/
  private generateTweetHtml(tweetData: TweetData): string {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
   hour: '2-digit',
    minute: '2-digit'
      }).format(date);
    };
    
    const mediaHtml = tweetData.media?.map(media => {
      if (media.type === 'image') {
        return `<img src="${media.url}" alt="${media.alt || ''}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;">`;
      } else if (media.type === 'video') {
        return `<div style="background: #000; border-radius: 8px; padding: 20px; text-align: center; margin: 8px 0; color: white;">📹 Video</div>`;
      }
      return '';
    }).join('') || '';
  
    const metricsHtml = tweetData.metrics ? `
      <div style="display: flex; gap: 20px; margin-top: 12px; font-size: 13px; color: #657786;">
        <span>💬 ${tweetData.metrics.replies}</span>
     <span>🔄 ${tweetData.metrics.retweets}</span>
        <span>❤️ ${tweetData.metrics.likes}</span>
        ${tweetData.metrics.bookmarks ? `<span>🔖 ${tweetData.metrics.bookmarks}</span>` : ''}
      </div>
 ` : '';
    
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #ffffff; padding: 20px; border-radius: 12px; border: 1px solid #e1e8ed; max-width: 580px;">
      <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px;">
<div style="width: 48px; height: 48px; background: #1d9bf0; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 18px;">
       ${tweetData.author.username.charAt(0).toUpperCase()}
          </div>
          <div style="flex: 1; min-width: 0;">
   <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
    <span style="font-weight: 600; color: #0f1419;">${tweetData.author.displayName}</span>
  <span style="color: #657786; font-size: 14px;">@${tweetData.author.username}</span>
            </div>
            <div style="color: #657786; font-size: 14px;">${formatDate(tweetData.timestamp)}</div>
          </div>
        </div>
   
        <div style="color: #0f1419; font-size: 16px; line-height: 1.5; margin-bottom: 12px; white-space: pre-wrap;">
  ${tweetData.content}
   </div>
        
        ${mediaHtml}
   ${metricsHtml}

        <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center;">
        <div style="font-size: 10px; color: #657786; opacity: 0.7;">via Tweet Craft</div>
      <div style="font-size: 11px; color: #657786;">${new Date().toLocaleString()}</div>
</div>
      </div>
    `;
  }

  /**
   * 清理截图元素
   * @param element 要清理的元素
   */
  private cleanupScreenshotElement(element: HTMLElement): void {
    // 移除交互元素
    const interactiveElements = element.querySelectorAll('button, [role="button"], [tabindex]');
    interactiveElements.forEach(el => el.remove());
    
    // 移除悬停效果
    const hoverElements = element.querySelectorAll('[class*="hover"]');
    hoverElements.forEach(el => {
      el.classList.remove(...Array.from(el.classList).filter(cls => cls.includes('hover')));
    });
    
    // 移除焦点效果
  const focusElements = element.querySelectorAll('[class*="focus"]');
    focusElements.forEach(el => {
      el.classList.remove(...Array.from(el.classList).filter(cls => cls.includes('focus')));
  });
  
    // 移除动画
  const animatedElements = element.querySelectorAll('[class*="animate"], [class*="transition"]');
    animatedElements.forEach(el => {
      el.style.animation = 'none';
    el.style.transition = 'none';
    });
  }
}

// 创建单例实例
export const tweetScreenshotExtractor = new TweetScreenshotExtractor();