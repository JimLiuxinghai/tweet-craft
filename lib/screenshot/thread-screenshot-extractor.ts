// 线程截图提取器 - 专门处理推文线程的截图
import { screenshotManager } from './screenshot-manager';
import { threadParser } from '../parsers';
import { TweetData } from '../types';

/**
 * 线程截图提取器类
 */
export class ThreadScreenshotExtractor {
/**
   * 从线程元素截图
   * @param threadElements 线程元素列表
   * @param options 截图选项
   * @returns 截图结果
   */
  async extractFromElements(
    threadElements: HTMLElement[],
    options: any = {}
  ): Promise<any> {
    try {
      // 解析线程数据
      const threadData = await this.parseThreadData(threadElements);
      
      // 创建增强的线程容器
      const enhancedContainer = await this.createEnhancedThreadContainer(threadElements, threadData);
      
 // 生成截图
      const result = await screenshotManager.captureThread(threadElements, {
        ...options,
        removeContainer: true
   });
      
      return {
      ...result,
     threadData,
      tweetCount: threadElements.length,
   timestamp: new Date(),
        metadata: {
        authorCount: threadData.authors.length,
          totalContent: threadData.tweets.map(t => t.content).join(' ').length,
  timeSpan: this.calculateTimeSpan(threadData.tweets),
          topics: this.extractTopics(threadData.tweets)
        }
      };
      
    } catch (error) {
  console.error('Failed to extract thread screenshot:', error);
  throw new Error(`Thread screenshot extraction failed: ${error.message}`);
    }
  }

  /**
   * 从线程数据生成截图
   * @param threadData 线程数据
   * @param options 截图选项
   * @returns 截图结果
   */
  async generateFromData(
    threadData: { tweets: TweetData[], authors: any[] },
    options: any = {}
  ): Promise<any> {
    try {
      // 生成线程HTML
      const threadHtml = this.generateThreadHtml(threadData);
      
      // 生成截图
const result = await screenshotManager.captureHTML(threadHtml, {
        ...options,
        width: 650,
        removeContainer: true
      });
  
      return {
      ...result,
  threadData,
        tweetCount: threadData.tweets.length,
        timestamp: new Date(),
        metadata: {
authorCount: threadData.authors.length,
      totalContent: threadData.tweets.map(t => t.content).join(' ').length,
     timeSpan: this.calculateTimeSpan(threadData.tweets),
          topics: this.extractTopics(threadData.tweets)
      }
      };
      
    } catch (error) {
      console.error('Failed to generate thread screenshot from data:', error);
      throw new Error(`Thread data screenshot generation failed: ${error.message}`);
    }
  }

  /**
   * 自动检测并截图当前页面的线程
   * @param options 截图选项
   * @returns 截图结果
 */
  async autoDetectAndCapture(options: any = {}): Promise<any> {
    try {
      // 使用线程解析器检测线程
      const threadData = await threadParser.detectAndParseThread();
      
   if (!threadData || threadData.tweets.length < 2) {
     throw new Error('No thread detected on current page');
  }
      
      return await this.generateFromData(threadData, options);
      
    } catch (error) {
   console.error('Failed to auto-detect and capture thread:', error);
      throw new Error(`Auto thread capture failed: ${error.message}`);
    }
  }

  /**
   * 批量处理多个线程截图
   * @param threads 线程列表
   * @param options 截图选项
   * @returns 截图结果列表
   */
  async batchExtract(
    threads: HTMLElement[][],
    options: any = {}
  ): Promise<any[]> {
    const results = [];
    
    for (let i = 0; i < threads.length; i++) {
      try {
        const result = await this.extractFromElements(threads[i], {
  ...options,
    filename: `thread_${i + 1}.png`
        });
   results.push(result);
      } catch (error) {
  console.warn(`Failed to extract screenshot from thread ${i + 1}:`, error);
        results.push({
          error: error.message,
    threadIndex: i,
       tweetCount: threads[i].length
        });
      }
  }
    
    return results;
  }

  /**
   * 解析线程数据
   * @param threadElements 线程元素列表
   * @returns 线程数据
   */
  private async parseThreadData(threadElements: HTMLElement[]): Promise<{tweets: TweetData[], authors: any[]}> {
    const tweets = [];
    const authorSet = new Set();
    const authors = [];
    
    for (const element of threadElements) {
      try {
        const tweetData = await threadParser.parseSingleTweet(element);
        tweets.push(tweetData);
        
        if (!authorSet.has(tweetData.author.username)) {
          authorSet.add(tweetData.author.username);
 authors.push(tweetData.author);
        }
 } catch (error) {
 console.warn('Failed to parse tweet in thread:', error);
      }
    }
    
    return { tweets, authors };
}

  /**
   * 创建增强的线程容器
   * @param threadElements 线程元素列表
   * @param threadData 线程数据
   * @returns 增强后的容器
   */
  private async createEnhancedThreadContainer(
    threadElements: HTMLElement[],
  threadData: {tweets: TweetData[], authors: any[]}
  ): Promise<HTMLElement> {
    const container = document.createElement('div');
    container.style.cssText = `
      width: 650px;
   max-width: 650px;
      background: #ffffff;
      padding: 24px;
      border-radius: 16px;
      border: 2px solid #1d9bf0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      position: relative;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
    `;
    
// 添加线程标题
    const header = this.createThreadHeader(threadData);
    container.appendChild(header);
    
    // 添加线程连接线
    const connector = document.createElement('div');
    connector.style.cssText = `
  position: absolute;
      left: 48px;
      top: 120px;
      bottom: 80px;
      width: 2px;
      background: linear-gradient(to bottom, #1d9bf0, #1d9bf0aa);
      z-index: 1;
    `;
    container.appendChild(connector);
    
    // 添加每个推文
    threadData.tweets.forEach((tweet, index) => {
    const tweetElement = this.createEnhancedTweetElement(tweet, index, threadData.tweets.length);
      container.appendChild(tweetElement);
    });
    
    // 添加底部信息
    const footer = this.createThreadFooter(threadData);
    container.appendChild(footer);
    
    return container;
  }

  /**
   * 创建线程标题
   * @param threadData 线程数据
   * @returns 标题元素
   */
  private createThreadHeader(threadData: {tweets: TweetData[], authors: any[]}): HTMLElement {
 const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #e1e8ed;
    `;
    
    const titleSection = document.createElement('div');
    titleSection.innerHTML = `
 <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
        <div style="background: #1d9bf0; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          🧵 Thread
        </div>
        <div style="color: #657786; font-size: 14px;">
          ${threadData.tweets.length} tweets
    </div>
      </div>
      <div style="color: #0f1419; font-size: 18px; font-weight: 600;">
        by @${threadData.tweets[0].author.username}
      </div>
    `;
    
    const timeInfo = document.createElement('div');
    timeInfo.style.cssText = `
    text-align: right;
      font-size: 12px;
      color: #657786;
    `;
    
    const timeSpan = this.calculateTimeSpan(threadData.tweets);
    timeInfo.innerHTML = `
      <div>Started: ${threadData.tweets[0].timestamp.toLocaleDateString()}</div>
      <div>Duration: ${timeSpan}</div>
 <div>Captured: ${new Date().toLocaleString()}</div>
    `;
    
    header.appendChild(titleSection);
    header.appendChild(timeInfo);
    
    return header;
  }

  /**
   * 创建增强的推文元素
   * @param tweet 推文数据
   * @param index 索引
   * @param total 总数
   * @returns 推文元素
   */
  private createEnhancedTweetElement(tweet: TweetData, index: number, total: number): HTMLElement {
    const tweetDiv = document.createElement('div');
    tweetDiv.style.cssText = `
    position: relative;
      margin-bottom: 20px;
      background: #ffffff;
    border: 1px solid #e1e8ed;
   border-radius: 12px;
      padding: 16px;
      margin-left: 24px;
      z-index: 2;
    `;
    
    // 推文序号
    const sequenceNumber = document.createElement('div');
    sequenceNumber.style.cssText = `
      position: absolute;
      left: -36px;
      top: 16px;
      width: 24px;
      height: 24px;
      background: #1d9bf0;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 600;
  border: 2px solid #ffffff;
    `;
    sequenceNumber.textContent = (index + 1).toString();
    tweetDiv.appendChild(sequenceNumber);
  
    // 推文内容
    const content = document.createElement('div');
    content.style.cssText = `
      color: #0f1419;
      font-size: 15px;
      line-height: 1.5;
      margin-bottom: 12px;
   white-space: pre-wrap;
    `;
    content.textContent = tweet.content;
    
    // 媒体内容
    const mediaHtml = this.generateMediaHtml(tweet.media);
    if (mediaHtml) {
      const mediaDiv = document.createElement('div');
      mediaDiv.innerHTML = mediaHtml;
      mediaDiv.style.marginBottom = '12px';
      tweetDiv.appendChild(mediaDiv);
    }
    
    // 推文元信息
    const meta = document.createElement('div');
    meta.style.cssText = `
    display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      color: #657786;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #f1f3f4;
    `;
    
    const timeStr = tweet.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const metricsStr = tweet.metrics ? 
 `💬 ${tweet.metrics.replies} 🔄 ${tweet.metrics.retweets} ❤️ ${tweet.metrics.likes}` : '';
    
    meta.innerHTML = `
      <span>${timeStr}</span>
      <span>${metricsStr}</span>
    `;
    
tweetDiv.appendChild(content);
    tweetDiv.appendChild(meta);
    
    return tweetDiv;
  }

  /**
   * 创建线程底部信息
   * @param threadData 线程数据
   * @returns 底部元素
   */
  private createThreadFooter(threadData: {tweets: TweetData[], authors: any[]}): HTMLElement {
    const footer = document.createElement('div');
    footer.style.cssText = `
      margin-top: 20px;
      padding-top: 16px;
  border-top: 2px solid #e1e8ed;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #657786;
  `;
    
    const stats = document.createElement('div');
  const totalChars = threadData.tweets.reduce((sum, tweet) => sum + tweet.content.length, 0);
    const totalMetrics = threadData.tweets.reduce((sum, tweet) => {
      const metrics = tweet.metrics;
      return {
        replies: sum.replies + (metrics?.replies || 0),
        retweets: sum.retweets + (metrics?.retweets || 0),
        likes: sum.likes + (metrics?.likes || 0)
    };
    }, {replies: 0, retweets: 0, likes: 0});
    
    stats.innerHTML = `
      <div>Total: ${totalChars} characters</div>
      <div>💬 ${totalMetrics.replies} 🔄 ${totalMetrics.retweets} ❤️ ${totalMetrics.likes}</div>
    `;
    
    const watermark = document.createElement('div');
    watermark.textContent = 'via Tweet Craft Extension';
    watermark.style.opacity = '0.7';
    
    footer.appendChild(stats);
    footer.appendChild(watermark);
    
    return footer;
  }

  /**
   * 生成线程HTML
   * @param threadData 线程数据
   * @returns HTML字符串
   */
  private generateThreadHtml(threadData: {tweets: TweetData[], authors: any[]}): string {
    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
      day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
    minute: '2-digit'
      }).format(date);
  };
    
const timeSpan = this.calculateTimeSpan(threadData.tweets);
    
    const tweetsHtml = threadData.tweets.map((tweet, index) => {
      const mediaHtml = this.generateMediaHtml(tweet.media);
      const metricsHtml = tweet.metrics ? 
 `<div style="margin-top: 8px; font-size: 12px; color: #657786;">💬 ${tweet.metrics.replies} 🔄 ${tweet.metrics.retweets} ❤️ ${tweet.metrics.likes}</div>` : '';
      
      return `
    <div style="position: relative; margin-bottom: 20px; background: #ffffff; border: 1px solid #e1e8ed; border-radius: 12px; padding: 16px; margin-left: 24px;">
          <div style="position: absolute; left: -36px; top: 16px; width: 24px; height: 24px; background: #1d9bf0; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; border: 2px solid #ffffff;">
    ${index + 1}
          </div>
          <div style="color: #0f1419; font-size: 15px; line-height: 1.5; margin-bottom: 12px; white-space: pre-wrap;">
            ${tweet.content}
          </div>
      ${mediaHtml}
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #657786; margin-top: 12px; padding-top: 8px; border-top: 1px solid #f1f3f4;">
            <span>${formatDate(tweet.timestamp)}</span>
     <span>${metricsHtml}</span>
          </div>
        </div>
      `;
    }).join('');
    
    return `
      <div style="width: 650px; background: #ffffff; padding: 24px; border-radius: 16px; border: 2px solid #1d9bf0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; position: relative; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);">
  <!-- Header -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e1e8ed;">
          <div>
       <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <div style="background: #1d9bf0; color: white; padding: 8px 12px; border-radius: 8px; font-weight: 600; font-size: 16px;">
      🧵 Thread
        </div>
        <div style="color: #657786; font-size: 14px;">
    ${threadData.tweets.length} tweets
       </div>
        </div>
      <div style="color: #0f1419; font-size: 18px; font-weight: 600;">
              by @${threadData.tweets[0].author.username}
    </div>
          </div>
          <div style="text-align: right; font-size: 12px; color: #657786;">
            <div>Started: ${threadData.tweets[0].timestamp.toLocaleDateString()}</div>
            <div>Duration: ${timeSpan}</div>
            <div>Captured: ${new Date().toLocaleString()}</div>
        </div>
        </div>
     
        <!-- Thread Connector -->
        <div style="position: absolute; left: 48px; top: 120px; bottom: 80px; width: 2px; background: linear-gradient(to bottom, #1d9bf0, #1d9bf0aa);"></div>
        
     <!-- Tweets -->
        ${tweetsHtml}
        
        <!-- Footer -->
   <div style="margin-top: 20px; padding-top: 16px; border-top: 2px solid #e1e8ed; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #657786;">
    <div>
            <div>Total: ${threadData.tweets.reduce((sum, tweet) => sum + tweet.content.length, 0)} characters</div>
      <div>💬 ${threadData.tweets.reduce((sum, tweet) => sum + (tweet.metrics?.replies || 0), 0)} 🔄 ${threadData.tweets.reduce((sum, tweet) => sum + (tweet.metrics?.retweets || 0), 0)} ❤️ ${threadData.tweets.reduce((sum, tweet) => sum + (tweet.metrics?.likes || 0), 0)}</div>
          </div>
       <div style="opacity: 0.7;">via Tweet Craft Extension</div>
        </div>
      </div>
    `;
  }

  /**
   * 生成媒体HTML
   * @param media 媒体数据
 * @returns HTML字符串
   */
  private generateMediaHtml(media?: any[]): string {
    if (!media || media.length === 0) return '';
    
    return media.map(item => {
      if (item.type === 'image') {
        return `<img src="${item.url}" alt="${item.alt || ''}" style="max-width: 100%; border-radius: 8px; margin: 8px 0;">`;
      } else if (item.type === 'video') {
        return `<div style="background: #000; border-radius: 8px; padding: 20px; text-align: center; margin: 8px 0; color: white;">📹 Video</div>`;
      }
      return '';
    }).join('');
  }

  /**
 * 计算时间跨度
   * @param tweets 推文列表
   * @returns 时间跨度字符串
*/
  private calculateTimeSpan(tweets: TweetData[]): string {
    if (tweets.length < 2) return 'Single tweet';
  
    const start = tweets[0].timestamp.getTime();
    const end = tweets[tweets.length - 1].timestamp.getTime();
    const diffMs = Math.abs(end - start);
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) return `${diffDays} days`;
    if (diffHours > 0) return `${diffHours} hours`;
    if (diffMinutes > 0) return `${diffMinutes} minutes`;
    return 'Less than a minute';
  }

  /**
   * 提取主题标签
   * @param tweets 推文列表
   * @returns 主题标签列表
   */
  private extractTopics(tweets: TweetData[]): string[] {
    const topics = new Set<string>();
    
    tweets.forEach(tweet => {
      // 提取话题标签
      const hashtags = tweet.content.match(/#\w+/g);
      hashtags?.forEach(tag => topics.add(tag));
      
      // 提取提及
      const mentions = tweet.content.match(/@\w+/g);
      mentions?.forEach(mention => topics.add(mention));
    });
    
    return Array.from(topics).slice(0, 10); // 限制数量
  }
}

// 创建单例实例
export const threadScreenshotExtractor = new ThreadScreenshotExtractor();