// Twitter 推文解析器

import type { TweetData, MediaItem, ThreadData, ParsedTweetElement, QuotedTweetData } from '../types';
import { TWITTER_SELECTORS, TWITTER_PATTERNS } from '../utils/constants';
import { getTextContent, getAttribute, query, queryAll, closest } from '../utils/dom';
import { parseTwitterDate } from '../utils/date';
import { extractTweetId, extractUsername, buildTweetUrl } from '../utils/url';
import { validateTweetData } from '../utils/validation';
import { performanceMonitor, tweetCache } from '../utils/performance';
import { EnhancedMediaExtractor } from './enhanced-media-extractor';

/**
 * Twitter 推文解析器类
 */
export class TweetParser {
  private static instance: TweetParser;
  
  public static getInstance(): TweetParser {
    if (!TweetParser.instance) {
      TweetParser.instance = new TweetParser();
    }
    return TweetParser.instance;
  }

  /**
   * 解析推文元素
   */
  async parseTweet(tweetElement: HTMLElement): Promise<TweetData | null> {
    performanceMonitor.startMeasure('parse-tweet');
    
    try {
      // 检查缓存
      const tweetId = this.extractTweetIdFromElement(tweetElement);
      if (tweetId) {
        const cached = tweetCache.get(tweetId);
        if (cached) {
          performanceMonitor.endMeasure('parse-tweet');
          return cached;
        }
      }

      // 解析推文数据
      const tweetData = await this.parseTweetData(tweetElement);
      
      if (tweetData && validateTweetData(tweetData)) {
        // 缓存结果
        tweetCache.set(tweetData.id, tweetData);
        
        performanceMonitor.endMeasure('parse-tweet');
   return tweetData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to parse tweet:', error);
      performanceMonitor.endMeasure('parse-tweet');
      return null;
    }
  }

  /**
   * 解析推文数据的核心逻辑
   */
  private async parseTweetData(tweetElement: HTMLElement): Promise<TweetData | null> {
    // 基本验证
    if (!this.isTweetElement(tweetElement)) {
      return null;
    }

    // 提取各个组件
    const id = this.extractTweetIdFromElement(tweetElement);
    const author = this.extractAuthorInfo(tweetElement);
    const content = this.extractTweetContent(tweetElement);
    const timestamp = this.extractTimestamp(tweetElement);
    const metrics = this.extractMetrics(tweetElement);
  const media = EnhancedMediaExtractor.extractMediaItems(tweetElement);
    const url = this.buildTweetUrl(author?.username || '', id || '');
    const threadInfo = this.detectThreadInfo(tweetElement);
    const quotedTweet = this.extractQuotedTweet(tweetElement);

    // 验证必要字段
    if (!id || !author || !author.username || !author.displayName) {
      console.warn('Missing required tweet data fields');
      return null;
    }

  const tweetData: TweetData = {
      id: id,
   author: author,
      content: content,
    timestamp: timestamp,
      metrics: metrics,
      media: media,
      isThread: threadInfo.isThread,
    threadPosition: threadInfo.position,
      threadId: threadInfo.threadId,
    url: url,
   quotedTweet: quotedTweet || undefined
 };

    return tweetData;
  }

/**
   * 检查元素是否为推文元素
   */
  private isTweetElement(element: HTMLElement): boolean {
    return element.matches(TWITTER_SELECTORS.TWEET_CONTAINER) || 
           element.matches(TWITTER_SELECTORS.TWEET_ARTICLE) ||
       element.closest(TWITTER_SELECTORS.TWEET_CONTAINER) !== null;
  }

  /**
   * 从元素中提取推文ID
   */
  private extractTweetIdFromElement(tweetElement: HTMLElement): string | null {
    // 方法1: 从链接中提取
    const linkElements = queryAll(tweetElement, 'a[href*="/status/"]');
    for (const link of linkElements) {
      const href = getAttribute(link, 'href');
 const tweetId = extractTweetId(href);
      if (tweetId) return tweetId;
}

    // 方法2: 从父元素的链接中提取
    const parentLink = closest(tweetElement, 'a[href*="/status/"]');
    if (parentLink) {
      const href = getAttribute(parentLink, 'href');
      const tweetId = extractTweetId(href);
  if (tweetId) return tweetId;
    }

    // 方法3: 从当前URL提取（如果在推文详情页）
    if (window.location.pathname.includes('/status/')) {
      return extractTweetId(window.location.href);
    }

    // 方法4: 从data属性中提取（如果有的话）
    const dataId = getAttribute(tweetElement, 'data-tweet-id');
    if (dataId) return dataId;

    return null;
  }

  /**
   * 提取作者信息
   */
  private extractAuthorInfo(tweetElement: HTMLElement): {
    username: string;
    displayName: string;
    avatar?: string;
  } | null {
    console.log('Extracting author info from tweet element:', tweetElement);
    
    // 多种方法提取显示名
    let displayName = this.extractDisplayNameMultiple(tweetElement);
    
    // 多种方法提取用户名
    let username = this.extractUsernameMultiple(tweetElement);

    // 提取头像
    const avatarElement = query(tweetElement, TWITTER_SELECTORS.TWEET_AVATAR);
    const avatar = avatarElement ? getAttribute(avatarElement, 'src') : undefined;

    console.log('Extracted author info - Display name:', displayName, 'Username:', username);

    if (!displayName || !username) {
      console.warn('Missing author information, attempting fallback methods');
 
      // 尝试从链接中提取用户名
      const userLink = query(tweetElement, TWITTER_SELECTORS.USER_PROFILE_LINK);
      if (userLink) {
        const href = getAttribute(userLink, 'href');
    const extractedUsername = extractUsername(href);
  if (extractedUsername && !username) {
    username = extractedUsername;
          console.log('Extracted username from link:', username);
        }
      }

      // 如果仍然缺少显示名，尝试从所有span元素中查找
      if (!displayName) {
        displayName = this.extractDisplayNameFallback(tweetElement);
      }

      // 如果仍然缺少用户名，尝试从URL路径中提取
      if (!username) {
        username = this.extractUsernameFromURL();
      }
    }

    const result = displayName && username ? {
      username: username,
 displayName: displayName,
      avatar: avatar
    } : null;

    console.log('Final author info result:', result);
    return result;
  }

  /**
   * 使用多种选择器提取显示名
   */
  private extractDisplayNameMultiple(tweetElement: HTMLElement): string {
    const selectors = [
    TWITTER_SELECTORS.USER_DISPLAY_NAME,
      '[data-testid="User-Name"] span:not([dir]):not([style*="color"])',
      '[data-testid="User-Name"] a span:first-child',
      '[data-testid="User-Name"] div:first-child span',
      '[data-testid="User-Name"] > div > div > a > div > div > span > span',
      '[data-testid="User-Name"] span[style*="color: rgb(15, 20, 25)"]'
    ];

    for (const selector of selectors) {
      try {
        const element = query(tweetElement, selector);
        const text = getTextContent(element);
        if (text && text.trim() && !text.startsWith('@') && !text.includes('·') && !text.match(/^\d+[smhd]$/)) {
          console.log(`Found display name with selector "${selector}": "${text}"`);
        return text.trim();
      }
      } catch (error) {
        console.warn(`Error with selector "${selector}":`, error);
      }
    }

    return '';
  }

  /**
   * 使用多种选择器提取用户名
   */
  private extractUsernameMultiple(tweetElement: HTMLElement): string {
    const selectors = [
      TWITTER_SELECTORS.USER_HANDLE,
      '[data-testid="User-Name"] span[dir="ltr"]',
      '[data-testid="User-Name"] span[style*="color: rgb(83, 100, 113)"]',
      '[data-testid="User-Name"] div:last-child span',
      '[data-testid="User-Name"] > div > div > div > a > div > span',
 'a[href*="/"] span[dir="ltr"]'
    ];

    for (const selector of selectors) {
      try {
        const element = query(tweetElement, selector);
   let text = getTextContent(element);
        if (text && text.trim()) {
          // 清理用户名（移除@符号）
          text = text.replace(/^@/, '').trim();
          
          // 验证这是一个有效的用户名格式
    if (text && /^[a-zA-Z0-9_]+$/.test(text) && text.length > 0) {
  console.log(`Found username with selector "${selector}": "${text}"`);
            return text;
    }
    }
      } catch (error) {
      console.warn(`Error with selector "${selector}":`, error);
      }
    }

 return '';
  }

  /**
   * 备用显示名提取方法
   */
  private extractDisplayNameFallback(tweetElement: HTMLElement): string {
    // 尝试从所有span元素中找到可能的显示名
    const allSpans = queryAll(tweetElement, 'span');
    
    for (const span of allSpans) {
      const text = getTextContent(span);
      if (text && text.trim()) {
        const trimmedText = text.trim();
        // 排除明显不是显示名的文本
     if (!trimmedText.startsWith('@') && 
    !trimmedText.includes('·') && 
     !trimmedText.match(/^\d+[smhd]$/) &&
  !trimmedText.match(/^\d+$/) &&
      trimmedText.length > 1 &&
   trimmedText.length < 50) {
 console.log('Found display name via fallback method:', trimmedText);
          return trimmedText;
        }
      }
    }

    return '';
  }

  /**
   * 从URL路径中提取用户名
   */
  private extractUsernameFromURL(): string {
    const currentPath = window.location.pathname;
    const match = currentPath.match(/\/([a-zA-Z0-9_]+)(?:\/|$)/);
    
    if (match && match[1] && 
        match[1] !== 'home' && 
        match[1] !== 'explore' && 
        match[1] !== 'notifications' &&
   match[1] !== 'messages' &&
        match[1] !== 'bookmarks' &&
        match[1] !== 'lists' &&
        match[1] !== 'profile' &&
      match[1] !== 'settings') {
      console.log('Extracted username from URL path:', match[1]);
      return match[1];
    }

    return '';
  }

  /**
   * 提取推文内容
   */
  private extractTweetContent(tweetElement: HTMLElement): string {
    const contentElement = query(tweetElement, TWITTER_SELECTORS.TWEET_TEXT);
    
if (!contentElement) {
      return '';
    }

    // 获取文本内容，保留换行
 let content = (contentElement as HTMLElement).innerText || contentElement.textContent || '';
    
    // 处理链接和标签
    content = this.processContentLinks(contentElement, content);
    
 return content.trim();
  }

  /**
   * 处理内容中的链接
 */
  private processContentLinks(contentElement: Element, originalText: string): string {
    let processedText = originalText;
    
    // 处理链接
    const links = queryAll(contentElement, 'a');
    for (const link of links) {
      const href = getAttribute(link, 'href');
      const linkText = getTextContent(link);
      
      // 如果是短链接，保留原始文本
      if (href.includes('t.co/')) {
        continue;
   }
      
      // 如果是完整URL，可以选择保留或替换
      if (href.startsWith('http') && linkText !== href) {
        processedText = processedText.replace(linkText, href);
      }
    }
    
  return processedText;
  }

  /**
   * 提取时间戳
   */
  private extractTimestamp(tweetElement: HTMLElement): Date {
    const timeElement = query(tweetElement, TWITTER_SELECTORS.TIMESTAMP);
    
    if (timeElement) {
      // 优先使用datetime属性
    const datetime = getAttribute(timeElement, 'datetime');
      if (datetime) {
        const parsedDate = new Date(datetime);
  if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
    }
      
      // 使用title属性
      const title = getAttribute(timeElement, 'title');
      if (title) {
        const parsedDate = parseTwitterDate(title);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
    }
      }
      
  // 使用显示文本
      const timeText = getTextContent(timeElement);
if (timeText) {
        return parseTwitterDate(timeText);
      }
    }
    
    return new Date(); // 默认返回当前时间
  }

  /**
   * 提取互动数据
   */
  private extractMetrics(tweetElement: HTMLElement): {
    likes: number;
    retweets: number;
replies: number;
  } {
    const metrics = {
      likes: 0,
      retweets: 0,
      replies: 0
    };

    // 提取点赞数
    const likeElement = query(tweetElement, TWITTER_SELECTORS.TWEET_LIKES);
    if (likeElement) {
      metrics.likes = this.parseMetricNumber(getTextContent(likeElement));
    }

    // 提取转发数
    const retweetElement = query(tweetElement, TWITTER_SELECTORS.TWEET_RETWEETS);
    if (retweetElement) {
      metrics.retweets = this.parseMetricNumber(getTextContent(retweetElement));
}

    // 提取回复数
    const replyElement = query(tweetElement, TWITTER_SELECTORS.TWEET_REPLIES);
    if (replyElement) {
      metrics.replies = this.parseMetricNumber(getTextContent(replyElement));
    }

    return metrics;
  }

  /**
   * 解析数字格式的指标（支持K, M, B等单位）
   */
  private parseMetricNumber(text: string): number {
    if (!text) return 0;
    
    const cleanText = text.replace(/,/g, '').trim();
    const match = cleanText.match(/^(\d+\.?\d*)([KMB]?)$/i);
    
    if (!match) return 0;
  
  const number = parseFloat(match[1]);
    const unit = match[2]?.toUpperCase();
    
    switch (unit) {
      case 'K': return Math.round(number * 1000);
      case 'M': return Math.round(number * 1000000);
      case 'B': return Math.round(number * 1000000000);
      default: return Math.round(number);
    }
  }

  /**
   * 提取媒体项目
   */
  private extractMediaItems(tweetElement: HTMLElement): MediaItem[] {
    const mediaItems: MediaItem[] = [];

    // 提取图片
    const images = queryAll(tweetElement, TWITTER_SELECTORS.TWEET_IMAGES);
    for (const img of images) {
      const src = getAttribute(img, 'src');
    const alt = getAttribute(img, 'alt');
      
      if (src && !src.includes('profile_images')) { // 排除头像
        mediaItems.push({
          type: 'image',
          url: src,
          alt: alt || undefined
   });
      }
  }

    // 提取视频
    const videos = queryAll(tweetElement, TWITTER_SELECTORS.TWEET_VIDEOS);
    for (const video of videos) {
      const src = getAttribute(video, 'src');
      const poster = getAttribute(video, 'poster');
      
      if (src) {
mediaItems.push({
          type: 'video',
   url: src,
          previewUrl: poster || undefined
        });
      }
    }

    // 提取GIF
    const gifs = queryAll(tweetElement, TWITTER_SELECTORS.TWEET_GIFS);
  for (const gif of gifs) {
 const videoElement = query(gif, 'video');
  if (videoElement) {
        const src = getAttribute(videoElement, 'src');
        const poster = getAttribute(videoElement, 'poster');
  
        if (src) {
          mediaItems.push({
 type: 'gif',
       url: src,
            previewUrl: poster || undefined
     });
        }
      }
    }

    return mediaItems;
  }

  /**
   * 检测线程信息
   */
  private detectThreadInfo(tweetElement: HTMLElement): {
    isThread: boolean;
    position?: number;
    threadId?: string;
  } {
    // 检查是否有线程连接线
    const hasThreadLine = query(tweetElement, TWITTER_SELECTORS.THREAD_LINE) !== null;
    
    // 检查是否有"显示此线程"链接
    const hasShowThreadLink = query(tweetElement, TWITTER_SELECTORS.THREAD_CONNECTOR) !== null;
  
    // 检查推文内容是否包含线程标识
    const content = this.extractTweetContent(tweetElement);
    const hasThreadMarker = TWITTER_PATTERNS.THREAD_MARKER.test(content);
    
    // 检查数字编号模式（如 1/5）
    const numberMatch = content.match(TWITTER_PATTERNS.THREAD_NUMBER);
    
    const isThread = hasThreadLine || hasShowThreadLink || hasThreadMarker || Boolean(numberMatch);
  
    let position: number | undefined;
    let threadId: string | undefined;
    
    if (numberMatch) {
      position = parseInt(numberMatch[1]);
      // 线程ID可以使用第一条推文的ID或者作者+时间的组合
      threadId = this.generateThreadId(tweetElement);
    }
    
    return {
 isThread,
      position,
      threadId
 };
  }

  /**
   * 生成线程ID
   */
  private generateThreadId(tweetElement: HTMLElement): string {
    const author = this.extractAuthorInfo(tweetElement);
    const timestamp = this.extractTimestamp(tweetElement);
    
    if (author) {
      // 使用用户名和时间戳生成线程ID
      const dateStr = timestamp.toISOString().split('T')[0];
      return `${author.username}_${dateStr}`;
    }
    
    return Date.now().toString();
  }

  /**
   * 构建推文URL
   */
  private buildTweetUrl(username: string, tweetId: string): string {
    if (!username || !tweetId) {
      return window.location.href;
    }
    
    return buildTweetUrl(username, tweetId);
  }

  /**
   * 批量解析推文
   */
  async parseTweets(tweetElements: HTMLElement[]): Promise<TweetData[]> {
    const results: TweetData[] = [];
    
    for (const element of tweetElements) {
      try {
        const tweetData = await this.parseTweet(element);
        if (tweetData) {
       results.push(tweetData);
     }
   } catch (error) {
 console.warn('Failed to parse tweet element:', error);
   continue;
      }
    }
    
    return results;
  }

  /**
   * 查找页面上的所有推文元素
   */
  findTweetElements(): HTMLElement[] {
  const tweets: HTMLElement[] = [];
    
    // 查找推文容器
    const containers = queryAll(document, TWITTER_SELECTORS.TWEET_CONTAINER);
    for (const container of containers) {
      if (this.isTweetElement(container as HTMLElement)) {
        tweets.push(container as HTMLElement);
      }
    }
    
    // 查找推文文章元素
    const articles = queryAll(document, TWITTER_SELECTORS.TWEET_ARTICLE);
    for (const article of articles) {
      if (!tweets.includes(article as HTMLElement)) {
        tweets.push(article as HTMLElement);
      }
    }
    
    return tweets;
  }

  /**
   * 查找特定推文元素
   */
  findTweetElementById(tweetId: string): HTMLElement | null {
    const allTweets = this.findTweetElements();
    
    for (const tweet of allTweets) {
      const extractedId = this.extractTweetIdFromElement(tweet);
      if (extractedId === tweetId) {
        return tweet;
      }
    }
    
    return null;
  }

  /**
   * 查找当前页面的主推文
   */
  findMainTweet(): HTMLElement | null {
    // 如果在推文详情页，查找主推文
    if (window.location.pathname.includes('/status/')) {
      const tweets = this.findTweetElements();
      
  // 主推文通常是第一个或最大的推文元素
      return tweets.length > 0 ? tweets[0] : null;
    }
    
    return null;
  }

  /**
   * 提取引用推文信息
   */
  private extractQuotedTweet(tweetElement: HTMLElement): QuotedTweetData | null {
    console.log('🔍 检查推文中是否包含引用推文');
    
    // 使用多种选择器尝试找到引用推文容器
    const quotedTweetContainer = this.findQuotedTweetContainer(tweetElement);
    if (!quotedTweetContainer) {
      console.log('未找到引用推文容器');
      return null;
    }

    console.log('✅ 找到引用推文容器，开始解析引用推文内容');

 try {
      // 提取引用推文的基本信息
    const quotedId = this.extractQuotedTweetId(quotedTweetContainer);
const quotedAuthor = this.extractQuotedTweetAuthor(quotedTweetContainer);
   const quotedContent = this.extractQuotedTweetContent(quotedTweetContainer);
      const quotedTimestamp = this.extractQuotedTweetTimestamp(quotedTweetContainer);
      const quotedMedia = this.extractQuotedTweetMedia(quotedTweetContainer);
      const quotedUrl = this.buildQuotedTweetUrl(quotedAuthor?.username || '', quotedId || '');

      // 验证必要字段
      if (!quotedAuthor || !quotedAuthor.username || !quotedContent) {
        console.warn('引用推文缺少必要信息');
 return null;
      }

      const quotedTweet: QuotedTweetData = {
        id: quotedId || '',
        author: quotedAuthor,
   content: quotedContent,
        timestamp: quotedTimestamp,
        media: quotedMedia,
        url: quotedUrl
      };

      console.log('✅ 成功解析引用推文:', quotedTweet);
      return quotedTweet;

    } catch (error) {
      console.error('解析引用推文时出错:', error);
      return null;
  }
  }

  /**
   * 查找引用推文容器
   */
  private findQuotedTweetContainer(tweetElement: HTMLElement): HTMLElement | null {
    // 尝试多种选择器查找引用推文容器
    const selectors = [
      TWITTER_SELECTORS.QUOTE_TWEET_CONTAINER,
    '[role="link"][tabindex="0"][aria-labelledby]',
   '[data-testid="quoteTweet"]',
'.r-1loqt21[role="link"]', // Twitter的引用推文样式类
 'div[role="link"][tabindex="0"] > div > div[data-testid="tweetText"]', // 通过内部文本元素反向查找
 'article[data-testid="tweet"] > div > div > div > div[role="link"][tabindex="0"]' // 详细路径
    ];

    for (const selector of selectors) {
      try {
        const element = query(tweetElement, selector);
        if (element && this.isValidQuotedTweetContainer(element as HTMLElement)) {
  console.log(`找到引用推文容器，使用选择器: ${selector}`);
        return element as HTMLElement;
        }
      } catch (error) {
        console.warn(`选择器 "${selector}" 查找失败:`, error);
      }
    }

    return null;
  }

  /**
   * 验证是否为有效的引用推文容器
   */
  private isValidQuotedTweetContainer(element: HTMLElement): boolean {
    // 检查是否包含推文文本
    const hasText = query(element, '[data-testid="tweetText"]') !== null;
    // 检查是否包含用户信息
    const hasUser = query(element, '[data-testid="User-Name"]') !== null;
    // 检查是否为链接元素
    const isLink = element.getAttribute('role') === 'link';
    
  return hasText && hasUser && isLink;
  }

  /**
   * 提取引用推文ID
   */
  private extractQuotedTweetId(container: HTMLElement): string | null {
    // 从链接href中提取ID
    const href = getAttribute(container, 'href');
    if (href) {
      const tweetId = extractTweetId(href);
      if (tweetId) return tweetId;
    }

    // 尝试从内部链接中提取
    const linkElements = queryAll(container, 'a[href*="/status/"]');
    for (const link of linkElements) {
      const linkHref = getAttribute(link, 'href');
      const tweetId = extractTweetId(linkHref);
   if (tweetId) return tweetId;
    }

    return null;
  }

  /**
   * 提取引用推文作者信息
   */
  private extractQuotedTweetAuthor(container: HTMLElement): { username: string; displayName: string; avatar?: string } | null {
    const userNameElement = query(container, TWITTER_SELECTORS.QUOTE_TWEET_AUTHOR || '[data-testid="User-Name"]');
    if (!userNameElement) {
      console.warn('未找到引用推文作者信息元素');
      return null;
    }

    // 提取显示名
    const displayNameElement = query(userNameElement, 'span:not([dir]):not([style*="color"])');
    const displayName = getTextContent(displayNameElement);

    // 提取用户名
    const usernameElement = query(userNameElement, 'span[dir="ltr"], span[style*="color: rgb(83, 100, 113)"]');
  let username = getTextContent(usernameElement);
    if (username && username.startsWith('@')) {
      username = username.substring(1);
    }

    // 提取头像（如果有的话）
    const avatarElement = query(container, 'img[src*="profile_images"]');
    const avatar = avatarElement ? getAttribute(avatarElement, 'src') : undefined;

    if (!displayName || !username) {
      console.warn('引用推文作者信息不完整', { displayName, username });
      return null;
    }

    return {
      username,
   displayName,
      avatar
    };
  }

  /**
   * 提取引用推文内容
   */
  private extractQuotedTweetContent(container: HTMLElement): string {
    const contentElement = query(container, TWITTER_SELECTORS.QUOTE_TWEET_CONTENT || '[data-testid="tweetText"]');
    if (!contentElement) {
      console.warn('未找到引用推文内容元素');
      return '';
    }

  let content = (contentElement as HTMLElement).innerText || contentElement.textContent || '';
    
    // 处理链接和标签
    content = this.processContentLinks(contentElement, content);
    
    return content.trim();
  }

  /**
   * 提取引用推文时间戳
   */
  private extractQuotedTweetTimestamp(container: HTMLElement): Date | undefined {
    const timeElement = query(container, 'time[datetime], time');
    
    if (timeElement) {
      // 优先使用datetime属性
      const datetime = getAttribute(timeElement, 'datetime');
      if (datetime) {
        const parsedDate = new Date(datetime);
        if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
      }
      
      // 使用title属性
      const title = getAttribute(timeElement, 'title');
      if (title) {
        const parsedDate = parseTwitterDate(title);
      if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
    }
      }
      
      // 使用显示文本
      const timeText = getTextContent(timeElement);
      if (timeText) {
        return parseTwitterDate(timeText);
      }
    }
    
    return undefined;
  }

  /**
   * 提取引用推文媒体内容
   */
  private extractQuotedTweetMedia(container: HTMLElement): MediaItem[] | undefined {
    const mediaItems: MediaItem[] = [];

    // 提取图片
    const images = queryAll(container, 'img:not([src*="profile_images"])');
    for (const img of images) {
   const src = getAttribute(img, 'src');
      const alt = getAttribute(img, 'alt');
      
      if (src && src.includes('pbs.twimg.com/media')) {
 mediaItems.push({
          type: 'image',
       url: src,
    alt: alt || undefined
        });
    }
    }

    // 提取视频
    const videos = queryAll(container, 'video');
    for (const video of videos) {
      const src = getAttribute(video, 'src');
      const poster = getAttribute(video, 'poster');
      
      if (src) {
        mediaItems.push({
     type: 'video',
          url: src,
          previewUrl: poster || undefined
        });
      }
    }

    return mediaItems.length > 0 ? mediaItems : undefined;
  }

  /**
   * 构建引用推文URL
   */
  private buildQuotedTweetUrl(username: string, tweetId: string): string {
    if (!username || !tweetId) {
    return '';
    }
    
    return buildTweetUrl(username, tweetId);
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    tweetCache.clear();
  }
}

// 导出单例实例
export const tweetParser = TweetParser.getInstance();