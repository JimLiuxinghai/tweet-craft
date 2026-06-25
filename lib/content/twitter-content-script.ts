// 主要的 Twitter 内容脚本类

import type { ExtensionSettings, TweetData, ThreadData, FormatOptions } from '../types';
import { tweetParser, threadParser } from '../parsers';
import { clipboardManager } from '../clipboard';
import { getSettings } from '../utils/storage';
import { initializeI18n, i18nManager } from '../i18n';
import { createPerformantObserver, BatchProcessor } from '../utils/performance';
import { addStyleSheet, createElement, debounce, closest } from '../utils/dom';
import { TWITTER_SELECTORS, EXTENSION_CONFIG } from '../utils/constants';
import { TwitterActionsBarFixEnhanced } from './twitter-actions-bar-fix-enhanced';
import { TwitterDebugHelper } from './debug-helper';
import { SettingsDebugFix } from './settings-debug-fix';
import { TwitterActionButtons } from './action-buttons';
import { NotionButtonManager } from '../notion/button-manager';
import TwitterVideoService from '../services/twitter-video-service';

export class TwitterContentScript {
  private isInitialized: boolean = false;
  private mutationObserver?: MutationObserver;
  private tweetProcessor?: BatchProcessor<HTMLElement>;
  private processedTweets: Set<string> = new Set();
  private currentSettings: ExtensionSettings | null = null;
  private styleSheetId = 'twitter-super-copy-styles';
  private notionButtonManager?: NotionButtonManager;
  private videoService: TwitterVideoService;

  constructor() {
    console.log('TwitterContentScript instance created');
    this.videoService = new TwitterVideoService();
  }

  /**
   * 初始化内容脚本
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
  console.warn('TwitterContentScript already initialized');
      return;
    }

    console.log('Initializing TwitterContentScript...');
    
    // 检查是否在正确的域名下
    if (!this.isTwitterDomain()) {
      console.warn('Not on Twitter/X domain, skipping initialization');
      return;
    }

    try {
    // 初始化国际化系统
 await initializeI18n();
  
      // 加载设置
      await this.loadSettings();
      
      // 初始化各个子系统
      this.setupBatchProcessor();
      this.injectStyles();
      this.setupObservers();
      this.setupEventListeners();
      this.setupMessageListeners();
      
            
      // 初始化 Notion 按钮管理器
      this.initializeNotionButtonManager();
      
    // 立即处理已存在的推文，参考tweet-craft的实现
      await this.processExistingTweetsImmediate();
  
  // 如果是详情页，也处理详情页内容
    if (window.location.pathname.includes('/status/')) {
   this.processDetailPageTweets();
      }
      
      // 添加定时检查，确保没有遗漏的推文
  this.startPeriodicCheck();
   
      this.isInitialized = true;
      console.log('TwitterContentScript initialized successfully');
      
    } catch (error) {
      console.error('Failed to initialize TwitterContentScript:', error);
  }
  }

  /**
   * 检查是否在 Twitter/X 域名下
   */
  private isTwitterDomain(): boolean {
    const hostname = window.location.hostname;
    return hostname === 'twitter.com' || hostname === 'x.com';
  }

  /**
   * 加载用户设置
   */
  private async loadSettings(): Promise<void> {
    try {
      // 使用调试工具加载设置
      this.currentSettings = await SettingsDebugFix.debugSettingsLoad();
      console.log('✅ Settings loaded with debug info:', this.currentSettings);
 } catch (error) {
      console.error('❌ Failed to load settings:', error);
    }
  }

  /**
   * 设置批处理器
   */
  private setupBatchProcessor(): void {
    this.tweetProcessor = new BatchProcessor<HTMLElement>(
      EXTENSION_CONFIG.PERFORMANCE.BATCH_SIZE,
   async (tweetElements: HTMLElement[]) => {
  await this.processTweetBatch(tweetElements);
      },
      (processed, total) => {
        console.log(`Processed ${processed}/${total} tweets`);
      }
    );
  }

  /**
   * 设置 DOM 观察器
   */
  private setupObservers(): void {
    // 定义观察器选项
    const observerOptions: MutationObserverInit = {
      childList: true,
      subtree: true,
    attributes: true, // 启用属性观察
      attributeFilter: ['class', 'data-testid', 'style', 'aria-expanded'], // 观察相关属性
      attributeOldValue: false,
  characterData: false,
      characterDataOldValue: false
    };

    // 创建高性能的观察器
    this.mutationObserver = createPerformantObserver(
      debounce(this.handleDOMChanges.bind(this), EXTENSION_CONFIG.PERFORMANCE.DEBOUNCE_TIME),
      observerOptions
    );

    // 开始观察
    this.mutationObserver.observe(document.body, observerOptions);
    console.log('DOM observers set up');
  }

  /**
   * 处理 DOM 变化
   */
  private handleDOMChanges(mutations: MutationRecord[]): void {
    const newTweetElements: HTMLElement[] = [];

    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
  
         // 跳过明显不相关的元素
  if (this.shouldSkipElement(element)) {
      continue;
          }
  
          // 检查是否是推文元素
  const tweetElements = this.findTweetElementsEnhanced(element);
  newTweetElements.push(...tweetElements);
 }
      }
    }

    if (newTweetElements.length > 0) {
      this.tweetProcessor?.addItems(newTweetElements);
    }
  }

  /**
   * 检查是否应该跳过某个元素的处理
   */
  private shouldSkipElement(element: HTMLElement): boolean {
    // 跳过我们自己的扩展元素
 if (element.classList.contains('tsc-copy-button') || 
    element.classList.contains('tsc-toast') ||
  element.classList.contains('tsc-dialog') ||
     element.querySelector('.tsc-copy-button, .tsc-toast, .tsc-dialog')) {
  return true;
    }
    
    // 跳过明显不包含推文的容器
  const tagName = element.tagName.toLowerCase();
 if (['script', 'style', 'link', 'meta', 'head', 'title'].includes(tagName)) {
      return true;
    }
    
  // 跳过很小的元素（可能不是推文）
 if (element.offsetHeight < 50 && element.offsetWidth < 100) {
      return true;
    }
    
    return false;
  }

  /**
   * 查找推文元素
   */
  private findTweetElements(container: HTMLElement): HTMLElement[] {
    const tweets: HTMLElement[] = [];
    const foundElements = new Set<HTMLElement>();
    
    // 检查容器本身是否是推文
    const rootTweet = this.normalizeTweetElement(container);
    if (rootTweet && this.isTweetElement(rootTweet)) {
      tweets.push(rootTweet);
      foundElements.add(rootTweet);
    }
    
    // 查找子推文元素
    const tweetSelectors = [
      TWITTER_SELECTORS.TWEET_CONTAINER,
      TWITTER_SELECTORS.TWEET_ARTICLE,
      TWITTER_SELECTORS.TWEET_DETAIL_CONTAINER,
      TWITTER_SELECTORS.MAIN_TWEET_CONTAINER
    ];
    
    for (const selector of tweetSelectors) {
      const elements = container.querySelectorAll(selector);
      for (const element of elements) {
        const tweetElement = this.normalizeTweetElement(element as HTMLElement);
        if (tweetElement && !foundElements.has(tweetElement) && this.isTweetElement(tweetElement)) {
 tweets.push(tweetElement);
foundElements.add(tweetElement);
        }
      }
    }
    
  return tweets;
  }

  /**
   * 将宽容器或推文内部子节点归一为真实的推文根节点。
   * X 首页初始化时 document.body 也包含用户名/正文/操作按钮，不能把它当成推文本体。
   */
  private normalizeTweetElement(element: HTMLElement | null): HTMLElement | null {
    if (!element || element === document.body || element === document.documentElement) {
      return null;
    }

    const article = (element.matches(TWITTER_SELECTORS.TWEET_ARTICLE)
      ? element
      : closest(element, TWITTER_SELECTORS.TWEET_ARTICLE)) as HTMLElement | null;
    if (article) {
      return article;
    }

    const detailArticle = (element.matches(TWITTER_SELECTORS.TWEET_DETAIL_CONTAINER)
      ? element
      : closest(element, TWITTER_SELECTORS.TWEET_DETAIL_CONTAINER)) as HTMLElement | null;
    if (detailArticle && detailArticle !== document.body && detailArticle !== document.documentElement) {
      return detailArticle;
    }

    const dataTweet = (element.matches('[data-testid="tweet"]')
      ? element
      : closest(element, '[data-testid="tweet"]')) as HTMLElement | null;
    if (dataTweet && dataTweet !== document.body && dataTweet !== document.documentElement) {
      return dataTweet;
    }

    return null;
  }

  /**
   * 检查元素是否为推文
   */
  private isTweetElement(element: HTMLElement): boolean {
     // 排除已处理的元素、正在处理的元素和无效元素
    if (!element || element === document.body || element === document.documentElement) {
      return false;
    }

    // 1. 基于关键元素的检测（更全面的选择器）
    const hasUserName = element.querySelector('[data-testid="User-Name"], [data-testid="User-Names"]');
    const hasTweetText = element.querySelector('[data-testid="tweetText"]');
    const hasActionButtons = element.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
    const hasTimestamp = element.querySelector('time, [data-testid="Time"]');
    
    // 如果包含这些关键元素，很可能是推文
    if (hasUserName && (hasTweetText || hasActionButtons || hasTimestamp)) {
      console.log('Detected tweet element by content structure');
    return true;
    }
    
    // 检查是否是标准推文容器
    const isStandardTweet = element.matches(TWITTER_SELECTORS.TWEET_CONTAINER) || 
     element.matches(TWITTER_SELECTORS.TWEET_ARTICLE);
    
    if (isStandardTweet) {
      console.log('Detected tweet element by standard selectors');
      return true;
    }
    
    // 检查是否是article元素且包含推文内容
    if (element.tagName === 'ARTICLE') {
      const articleHasTweetContent = element.querySelector('[data-testid="tweetText"], [data-testid="User-Name"]');
      if (articleHasTweetContent) {
        console.log('Detected tweet element as article with tweet content');
   return true;
      }
    }
 
    // 检查是否包含引用推文的结构
    const hasQuoteIndicator = element.querySelector(TWITTER_SELECTORS.QUOTE_TWEET_INDICATOR);
    const hasQuoteContainer = element.querySelector(TWITTER_SELECTORS.QUOTE_TWEET_CONTAINER);
    
    if (hasQuoteIndicator && hasQuoteContainer) {
      console.log('Detected tweet element by quote structure');
      return true;
    }

    // 5. 检查是否包含推文链接（作为额外验证）
    const hasTweetLink = element.querySelector('a[href*="/status/"]');
    if (hasTweetLink && (hasUserName || hasActionButtons)) {
      console.log('Detected tweet element by tweet link and basic elements');
    return true;
    }

    // 6. 检查是否是置顶推文或推广推文
    const isPinnedOrPromoted = element.querySelector('[data-testid="pin"], [data-testid="promotedIndicator"]');
    if (isPinnedOrPromoted && hasUserName) {
      console.log('Detected tweet element as pinned or promoted tweet');
      return true;
    }

    // 7. 检查是否是线程推文
 const hasThreadConnector = element.querySelector('[aria-label*="Show this thread"], [data-testid="tweet"] div[style*="background-color"]');
  if (hasThreadConnector && hasUserName) {
      console.log('Detected tweet element as thread tweet');
      return true;
    }
 
    return false;
  }

  /**
   * 增强的查找推文元素方法
   */
  private findTweetElementsEnhanced(container: HTMLElement): HTMLElement[] {
    const tweets: HTMLElement[] = [];
    const foundElements = new Set<HTMLElement>();
    
    // 查找所有可能的推文元素
    const allSelectors = [
      TWITTER_SELECTORS.TWEET_CONTAINER,
      TWITTER_SELECTORS.TWEET_ARTICLE,
      TWITTER_SELECTORS.TWEET_DETAIL_CONTAINER,
      TWITTER_SELECTORS.MAIN_TWEET_CONTAINER,
      // 补充选择器处理边缘情况
      'article[role="article"]',
  '[data-testid="tweetDetail"]',
    ];
    
    // 检查容器本身
    const rootTweet = this.normalizeTweetElement(container);
    if (rootTweet && this.isTweetElement(rootTweet)) {
      tweets.push(rootTweet);
     foundElements.add(rootTweet);
    }
    
    // 查找子元素
    for (const selector of allSelectors) {
      try {
        const elements = container.querySelectorAll(selector);
     for (const element of elements) {
          const tweetElement = this.normalizeTweetElement(element as HTMLElement);
        if (tweetElement && !foundElements.has(tweetElement) && this.isTweetElement(tweetElement)) {
 tweets.push(tweetElement);
foundElements.add(tweetElement);
          }
        }
     } catch (error) {
    // 忽略选择器错误，继续尝试其他选择器
     }
    }
    
    return tweets;
  }

  /**
   * 处理推文批次
   */
  private async processTweetBatch(tweetElements: HTMLElement[]): Promise<void> {
    for (const element of tweetElements) {
      try {
        // 避免重复处理
        const elementId = this.getElementId(element);
      if (this.processedTweets.has(elementId)) {
       continue;
      }

        await this.processTweetElement(element);
   this.processedTweets.add(elementId);
        
  } catch (error) {
      console.warn('Failed to process tweet element:', error);
}
    }
}

  /**
   * 获取元素的唯一标识
   */
  private getElementId(element: HTMLElement): string {
    // 尝试从推文链接中提取ID
    const linkElement = element.querySelector('a[href*="/status/"]');
    if (linkElement) {
      const href = linkElement.getAttribute('href');
      if (href) {
        const match = href.match(/\/status\/(\d+)/);
        if (match) return match[1];
}
  }
    
    // 方法2: 尝试从用户名和推文内容生成较稳定的ID
   const userNameElement = element.querySelector('[data-testid="User-Name"]');
    const tweetTextElement = element.querySelector('[data-testid="tweetText"]');
   const timeElement = element.querySelector('time');
    
    if (userNameElement && tweetTextElement) {
      const username = userNameElement.textContent?.trim() || '';
  const tweetText = tweetTextElement.textContent?.substring(0, 50) || '';
 const timestamp = timeElement?.getAttribute('datetime') || '';
      
      if (username && tweetText) {
        const combined = `${username}_${tweetText}_${timestamp}`.replace(/\s+/g, '_');
 return `content-${this.hashCode(combined)}`;
      }
  }
    
    // 方法3: 使用DOM路径作为备用ID（不太稳定但可用）
    const domPath = this.getDOMPath(element);
   return `path-${this.hashCode(domPath)}`;
  }

  /**
   * 查找推文的操作栏
   */
  private findActionsBar(element: HTMLElement): HTMLElement | null {
    // 基于提供的HTML结构，先尝试查找特定的操作栏
    const specificSelectors = [
      '[aria-label*="bookmarks"][aria-label*="views"][role="group"]',
   '[aria-label*="Replies"][aria-label*="views"][role="group"]',
  '[role="group"][aria-label*="bookmarks"]',
      '[role="group"][aria-label*="views"]'
    ];
    
    for (const selector of specificSelectors) {
      const actionsBar = element.querySelector(selector) as HTMLElement;
      if (actionsBar) {
     console.log('Found actions bar with selector:', selector);
      return actionsBar;
  }
    }
    
    // 标准推文操作栏
    let actionsBar = element.querySelector(TWITTER_SELECTORS.TWEET_ACTIONS_BAR) as HTMLElement;
    
  if (actionsBar) {
return actionsBar;
    }
    
    // 对于引用推文，操作栏可能在不同位置，尝试多个选择器
    const alternativeSelectors = [
      // 尝试查找任何 role="group" 的元素
      '[role="group"]',
      // 尝试查找包含互动按钮的容器
      '[data-testid="reply"]',
      '[data-testid="retweet"]',
      '[data-testid="like"]'
    ];
    
    for (const selector of alternativeSelectors) {
      const foundElement = element.querySelector(selector) as HTMLElement;
      if (foundElement) {
  // 如果找到了互动按钮，找它的父容器（应该是操作栏）
        if (selector.startsWith('[data-testid=')) {
    const parentGroup = foundElement.closest('[role="group"]') as HTMLElement;
  if (parentGroup) {
            return parentGroup;
          }
    // 或者直接使用按钮的父元素
          return foundElement.parentElement as HTMLElement;
} else {
        return foundElement;
 }
      }
    }
    
    return null;
  }

  /**
   * 验证操作栏是否有效
   */
  private validateActionsBar(element: HTMLElement): boolean {
    if (!element) return false;
    
    // 检查是否包含至少一个互动按钮
    const hasInteractionButton = element.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [aria-label*="Reply"], [aria-label*="Repost"], [aria-label*="Like"]');
 if (hasInteractionButton) {
      return true;
    }
    
    // 检查是否有足够的子元素（通常操作栏有多个按钮）
    if (element.children.length >= 2) {
    // 检查子元素是否看起来像按钮
      let buttonLikeElements = 0;
      for (const child of element.children) {
        const childElement = child as HTMLElement;
        if (childElement.tagName === 'BUTTON' || 
            childElement.getAttribute('role') === 'button' ||
            childElement.querySelector('svg') ||
  childElement.style.cursor === 'pointer') {
          buttonLikeElements++;
        }
      }
      if (buttonLikeElements >= 2) {
      return true;
      }
 }
    
    return false;
  }

  /**
   * 增强的操作栏查找方法
   */
  private findActionsBarEnhanced(element: HTMLElement): HTMLElement | null {
    // 尝试多个可能的插入位置，参考tweet-craft项目的成功实现
    const selectors = [
      '[data-testid="like"]',
      '[data-testid="retweet"]', 
      '[data-testid="reply"]',
   '[role="group"]',
      '.r-1re7ezh', // Twitter的工具栏类名
      '.css-1dbjc4n.r-18u37iz' // 备选工具栏
    ];

  for (const selector of selectors) {
      const foundElement = element.querySelector(selector);
      if (foundElement) {
  // 找到最近的父级工具栏容器
        const parentGroup = foundElement.closest('[role="group"]') as HTMLElement;
        if (parentGroup) {
       console.log('Found actions bar through selector:', selector);
          return parentGroup;
        }
    // 使用父元素作为插入点
        if (foundElement.parentElement) {
 console.log('Found parent element through selector:', selector);
          return foundElement.parentElement as HTMLElement;
    }
      }
    }

    console.warn('No actions bar found for tweet element');
    return null;
  }
  /**
   * 创建自定义的操作栏容器（备用方案）
   */
  private createFallbackActionsBar(element: HTMLElement): HTMLElement | null {
    try {
      // 查找推文内容的底部位置
      const tweetText = element.querySelector('[data-testid="tweetText"]');
      const userInfo = element.querySelector('[data-testid="User-Name"]');
      const timestamp = element.querySelector('time');
      
      // 找到插入点：推文内容的底部或用户信息的底部
      let insertPoint = tweetText || userInfo || timestamp;
      if (!insertPoint) {
   // 如果找不到明确的插入点，使用推文元素的底部
        insertPoint = element;
      }
      
    // 创建自定义操作栏容器
      const customActionsBar = createElement('div', {
        className: 'tsc-custom-actions-bar',
      style: 'display: flex; align-items: center; margin-top: 12px; padding: 0 16px;'
      });
      
   // 尝试将容器插入到合适的位置
      if (insertPoint === element) {
 // 如果插入点是推文元素本身，添加到末尾
  element.appendChild(customActionsBar);
      } else {
    // 在插入点之后插入
        insertPoint.parentNode?.insertBefore(customActionsBar, insertPoint.nextSibling);
  }
      
      console.log('Created fallback actions bar for tweet');
   return customActionsBar;
      
    } catch (error) {
   console.error('Failed to create fallback actions bar:', error);
return null;
    }
  }

  /**
   * 立即处理单个推文元素 - 无重试机制的快速版本
   */
  private async processTweetElementImmediate(element: HTMLElement): Promise<void> {
    const normalizedElement = this.normalizeTweetElement(element);
    if (!normalizedElement) {
      return;
    }
    element = normalizedElement;

    // 检查是否已经被处理过
    if (element.classList.contains('tsc-processed') || element.classList.contains('tsc-processing')) {
      return;
    }

    // 检查是否已经有操作按钮
    const existingButton = element.querySelector('.tsc-copy-button, .tsc-screenshot-button, .tsc-notion-button');
    if (existingButton) {
      element.classList.add('tsc-processed');
      return;
    }

    try {
      // 立即标记为处理中
      element.classList.add('tsc-processing');

      // 查找推文操作栏 - 现在也使用fallback机制
      let actionsBar = TwitterActionsBarFixEnhanced.findActionsBar(element);
      if (!actionsBar) {
        console.log('❌ Initial actions bar search failed in immediate processing, trying fallback');
        actionsBar = TwitterActionsBarFixEnhanced.createFallbackActionsBar(element);
        if (!actionsBar) {
          console.error('❌ Even fallback actions bar creation failed in immediate processing');
          element.classList.remove('tsc-processing');
          return;
        }
      }

      // 创建复制按钮、截图按钮和Notion按钮
      const copyButton = TwitterActionButtons.createCopyButton(element, (el, btn) => this.handleCopyClick(el, btn));
      const screenshotButton = TwitterActionButtons.createScreenshotButton(element, (el, btn) => this.handleScreenshotClick(el, btn));
      const notionButton = TwitterActionButtons.createNotionButton(element, (el, btn) => this.handleNotionClick(el, btn));
      
      // 检查是否有视频，如果有就创建视频下载按钮
      let videoDownloadButton: HTMLElement | undefined;
      if (this.hasVideo(element)) {
        videoDownloadButton = TwitterActionButtons.createVideoDownloadButton(element, (el, btn) => this.handleVideoDownloadClick(el, btn));
      }
      
      const insertSuccess = TwitterActionButtons.insertActionButtons(actionsBar, copyButton, screenshotButton, videoDownloadButton, notionButton);
      
   if (insertSuccess) {
        element.classList.remove('tsc-processing');
     element.classList.add('tsc-processed');
        
        // 标记为已处理
        const elementId = this.getElementId(element);
        this.processedTweets.add(elementId);
  } else {
        element.classList.remove('tsc-processing');
 }
    } catch (error) {
      element.classList.remove('tsc-processing');
      console.warn('Failed to process tweet element immediately:', error);
    }
  }

  /**
   * 处理单个推文元素
   */
  private async processTweetElement(element: HTMLElement): Promise<void> {
    const normalizedElement = this.normalizeTweetElement(element);
    if (!normalizedElement) {
      console.log('Skipping non-tweet element:', element);
      return;
    }
    element = normalizedElement;

    console.log('Processing tweet element:', element);
    
       // 首先检查元素是否已经被处理过
    if (element.classList.contains('tsc-processed')) {
      console.log('Element already processed, skipping');
      return;
    }
 
    // 检查是否已经有操作按钮 - 更严格的检查
    const existingButton = element.querySelector('.tsc-copy-button, .tsc-screenshot-button, .tsc-notion-button');
    if (existingButton) {
      console.log('Action buttons already exist, marking as processed');
      element.classList.add('tsc-processed');
      return;
    }

    // 立即标记为处理中，防止重复处理
    element.classList.add('tsc-processing');

    // 添加重试机制
    let attempts = 0;
    const maxAttempts = 3;
    
  while (attempts < maxAttempts) {
  try {
      // 查找推文操作栏 - 使用增强版查找器
        let actionsBar = TwitterActionsBarFixEnhanced.findActionsBar(element);
        if (!actionsBar) {
          attempts++;
          if (attempts < maxAttempts) {
            // 等待DOM更新后重试
       await new Promise(resolve => setTimeout(resolve, 200));
        continue;
 }
           // 所有重试都失败后，尝试创建备用操作栏
 console.log('❌ All retries failed, trying fallback actions bar');
          console.log('🔍 分析失败的推文元素结构:');
          TwitterDebugHelper.analyzeTweetElement(element);
   actionsBar = TwitterActionsBarFixEnhanced.createFallbackActionsBar(element);
      if (!actionsBar) {
              console.error('❌ Even fallback actions bar creation failed, giving up');
            element.classList.remove('tsc-processing');
    return; // 最终失败，放弃
   }
  }

  // 再次检查操作栏中是否已经有复制按钮
        if (actionsBar.querySelector('.tsc-copy-button')) {
          console.log('Copy button already exists in actions bar, skipping');
 element.classList.remove('tsc-processing');
   element.classList.add('tsc-processed');
     return;
        }

// 创建复制按钮、截图按钮和Notion按钮
      const copyButton = TwitterActionButtons.createCopyButton(element, (el, btn) => this.handleCopyClick(el, btn));
      const screenshotButton = TwitterActionButtons.createScreenshotButton(element, (el, btn) => this.handleScreenshotClick(el, btn));
      const notionButton = TwitterActionButtons.createNotionButton(element, (el, btn) => this.handleNotionClick(el, btn));
      
      // 检查是否有视频，如果有就创建视频下载按钮
      let videoDownloadButton: HTMLElement | undefined;
      if (this.hasVideo(element)) {
        videoDownloadButton = TwitterActionButtons.createVideoDownloadButton(element, (el, btn) => this.handleVideoDownloadClick(el, btn));
      }
     
   // 插入按钮 - 使用新的四按钮插入方法
   const insertSuccess = TwitterActionButtons.insertActionButtons(actionsBar, copyButton, screenshotButton, videoDownloadButton, notionButton);
   if (!insertSuccess) {
  console.error('Failed to insert copy button into actions bar');
          element.classList.remove('tsc-processing');
      return;
        }

      // 标记推文已处理，避免重复处理
        element.classList.remove('tsc-processing');
    element.classList.add('tsc-processed');

  console.log('Successfully added copy button to tweet element');
     // 成功添加，跳出循环
     break;
      } catch (error) {
        console.warn('Failed to process tweet element, retrying...', error);
        attempts++;
          if (attempts >= maxAttempts) {
       console.error('Failed to add copy button after all retries', error);
  element.classList.remove('tsc-processing');
    return;
      }
   await new Promise(resolve => setTimeout(resolve, 200));
    }
    }

    // 检查是否为线程并添加线程标识
try {
      const threadInfo = await threadParser.detectThreadFromTweet(element);
      if (threadInfo.isPartOfThread) {
     this.addThreadIndicator(element, threadInfo);
    }
    } catch (error) {
      console.warn('Failed to detect thread info:', error);
    }
  }

  // 截图按钮功能已移动到TwitterActionButtons类

  /**
   * 创建复制按钮
   */
  private createCopyButton(tweetElement: HTMLElement): HTMLElement {
    const button = createElement('button', {
      className: 'tsc-copy-button',
      'data-testid': 'tsc-copy',
      'aria-label': i18nManager.t('copy_tweet'),
  title: i18nManager.t('copy_tweet')
    });

    // 添加图标
    const icon = createElement('div', {
      className: 'tsc-copy-icon',
      innerHTML: this.getCopyIconSVG()
    });

    button.appendChild(icon);

    // 添加点击事件
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleCopyClick(tweetElement, button);
    });

    return button;
  }

  /**
   * 获取复制图标 SVG (使用Lucide Copy图标)
   */
  private getCopyIconSVG(): string {
    // 复制图标已移动到TwitterActionButtons类
    return '';
  }

  /**
   * 获取成功图标 SVG
   */
  private getSuccessIconSVG(): string {
    return `
      <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/>
      </svg>
   `;
  }

  /**
 * 获取错误图标 SVG
   */
  private getErrorIconSVG(): string {
  return `
      <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
</svg>
    `;
  }

  /**
   * 处理复制按钮点击
   */
  private async handleCopyClick(tweetElement: HTMLElement, button: HTMLElement): Promise<void> {
    try {
      // 显示加载状态
      TwitterActionButtons.setButtonLoading(button, true);

      // 检查是否为线程
      const threadInfo = await threadParser.detectThreadFromTweet(tweetElement);
      
      if (threadInfo.isPartOfThread && threadInfo.threadData && threadInfo.threadData.tweets.length > 1) {
        // 显示线程复制选择对话框
        this.showThreadCopyDialog(tweetElement, threadInfo.threadData, button);
      } else {
        // 直接复制单条推文
        await this.copySingleTweet(tweetElement);
        TwitterActionButtons.setButtonSuccess(button);
      }
      
    } catch (error) {
      console.error('Failed to copy tweet:', error);
      TwitterActionButtons.setButtonError(button);
    } finally {
   TwitterActionButtons.setButtonLoading(button, false);
    }
  }

  /**
   * 处理截图按钮点击
   */
  private async handleScreenshotClick(tweetElement: HTMLElement, button: HTMLElement): Promise<void> {
  try {
// 显示加载状态
   TwitterActionButtons.setButtonLoading(button, true);

      // 首先展开长推文内容（与复制功能保持一致）
      await this.expandTweetContent(tweetElement);

      // 动态导入增强的截图服务
   const { enhancedScreenshotService } = await import('../screenshot/EnhancedScreenshotService');

      // 为第一条推文增加额外的等待时间，确保DOM完全稳定
      const isFirstTweet = this.isFirstTweetInList(tweetElement);
      const waitTime = isFirstTweet ? 800 : 300; // 第一条推文等待800ms，其他300ms
      
      console.log(`Screenshot wait time: ${waitTime}ms (first tweet: ${isFirstTweet})`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      
      // 验证推文元素状态
      console.log('Tweet element validation:', {
        isConnected: tweetElement.isConnected,
        tagName: tweetElement.tagName,
        className: tweetElement.className,
        rect: tweetElement.getBoundingClientRect(),
        offsetParent: !!tweetElement.offsetParent,
        style: tweetElement.style.display
      });
      
      if (!tweetElement.isConnected) {
        throw new Error('Tweet element is no longer in DOM');
      }
      
      // 更温和的可见性检查
      const rect = tweetElement.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        console.warn('Tweet element has no dimensions, but proceeding with screenshot attempt');
      }
      
// 执行截图操作
 const result = await enhancedScreenshotService.captureWithRandomGradient(tweetElement, {
        format: 'png',
   quality: 0.9,
        theme: 'auto',
        useContentOptions: true
      });

   // 复制到剪贴板
      await enhancedScreenshotService.copyScreenshotToClipboard(result);
      
      // 显示成功反馈
      this.showToast(i18nManager.t('screenshot_copied') || 'Screenshot copied successfully!', 'success');
      
   TwitterActionButtons.setButtonSuccess(button);
      
    } catch (error) {
      console.error('Failed to take screenshot:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        tweetElement: {
          isConnected: tweetElement?.isConnected,
          rect: tweetElement?.getBoundingClientRect(),
          className: tweetElement?.className
        }
      });
      TwitterActionButtons.setButtonError(button);
    } finally {
      TwitterActionButtons.setButtonLoading(button, false);
    }
  }

  /**
   * 检查是否为列表中的第一条推文
   */
  private isFirstTweetInList(tweetElement: HTMLElement): boolean {
    try {
      // 获取当前页面所有推文元素
      const allTweets = this.findTweetElementsEnhanced(document.body);
      
      if (allTweets.length === 0) return false;
      
      // 检查当前推文是否是第一个可见的推文
      const firstTweet = allTweets[0];
      return firstTweet === tweetElement;
      
    } catch (error) {
      console.warn('Failed to determine if first tweet:', error);
      return false;
    }
  }

  /**
   * 处理Notion按钮点击
   */
  private async handleNotionClick(tweetElement: HTMLElement, button: HTMLElement): Promise<void> {
    try {
      // 显示加载状态
      TwitterActionButtons.setButtonLoading(button, true);

      // 确保推文内容已经展开，包含 "Show more" 部分
      await this.expandTweetContent(tweetElement);

      // 动态导入Notion相关模块
      const { TweetExtractor } = await import('../notion/tweet-extractor');
      
      // 提取推文数据
      const tweetData = TweetExtractor.extractTweetData(tweetElement);
      if (!tweetData) {
        throw new Error('无法提取推文数据');
      }

      // 自动生成标签
      const autoTags = TweetExtractor.generateTagsFromContent(tweetData.content);
      tweetData.tags = autoTags;

      // 发送到background script检查是否已存在
      const existsResponse = await browser.runtime.sendMessage({
        type: 'NOTION_CHECK_EXISTS',
        url: tweetData.url
      });

      if (existsResponse && existsResponse.exists) {
        this.showToast(i18nManager.t('notion_already_exists') || 'Tweet already exists in Notion', 'info');
        TwitterActionButtons.setButtonSuccess(button);
        return;
      }

      const { TweetClassifier } = await import('../ai/tweet-classifier');
      const classification = await TweetClassifier.classify(tweetData);
      tweetData.category = classification.category;
      console.log(`Tweet classified as ${classification.category} via ${classification.source}`);

      // 发送到background script保存
      const result = await browser.runtime.sendMessage({
        type: 'NOTION_SAVE_TWEET',
        data: tweetData
      });

      if (result && result.success) {
        TwitterActionButtons.setButtonSuccess(button);
        this.showToast(i18nManager.t('notion_save_success') || 'Tweet saved to Notion!', 'success');
      } else {
        throw new Error(result?.error || 'Failed to save to Notion');
      }

    } catch (error) {
      console.error('Failed to save to Notion:', error);
      TwitterActionButtons.setButtonError(button);
      this.showToast(i18nManager.t('notion_save_failed') || 'Failed to save to Notion', 'error');
    } finally {
      TwitterActionButtons.setButtonLoading(button, false);
    }
  }

  /**
   * 查找主推文的Show more按钮，排除引用推文内的按钮
   */
  private findMainTweetShowMoreButton(tweetElement: HTMLElement): HTMLElement | null {
    // 查找所有的Show more按钮
    const allShowMoreButtons = tweetElement.querySelectorAll(TWITTER_SELECTORS.SHOW_MORE_BUTTON);
    
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
      const quoteTweetContainer = closest(buttonElement, '[role="link"][tabindex="0"]');
      
      // 如果按钮不在引用推文容器内，则认为是主推文的按钮
      if (!quoteTweetContainer) {
    return buttonElement;
      }
      
      // 额外检查：如果按钮的父级链中没有引用推文的特征元素，则是主推文按钮
      const hasQuoteIndicator = closest(buttonElement, '[aria-labelledby*="Quote"]');
      if (!hasQuoteIndicator) {
        return buttonElement;
    }
    }
    
    // 如果都无法确定，返回第一个（通常是主推文的）
    return allShowMoreButtons[0] as HTMLElement;
  }

  /**
* 查找主推文的Show less按钮，排除引用推文内的按钮
   */
  private findMainTweetShowLessButton(tweetElement: HTMLElement): HTMLElement | null {
    // 查找所有的Show less按钮
    const allShowLessButtons = tweetElement.querySelectorAll(TWITTER_SELECTORS.SHOW_LESS_BUTTON);
    
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
      const quoteTweetContainer = closest(buttonElement, '[role="link"][tabindex="0"]');
      
      // 如果按钮不在引用推文容器内，则认为是主推文的按钮
   if (!quoteTweetContainer) {
    return buttonElement;
      }
      
  // 额外检查：如果按钮的父级链中没有引用推文的特征元素，则是主推文按钮
    const hasQuoteIndicator = closest(buttonElement, '[aria-labelledby*="Quote"]');
    if (!hasQuoteIndicator) {
        return buttonElement;
      }
    }
    
    // 如果都无法确定，返回第一个（通常是主推文的）
    return allShowLessButtons[0] as HTMLElement;
  }

  /**
 * 展开推文内容（点击Show more按钮）
   * 注意：只展开主推文的内容，不展开被引用推文的内容
   */
  private async expandTweetContent(tweetElement: HTMLElement): Promise<void> {
    try {
          // 查找主推文级别的Show more按钮（排除引用推文内的按钮）
 const showMoreButton = this.findMainTweetShowMoreButton(tweetElement);
      if (!showMoreButton) {
        // 没有Show more按钮，内容已经完整显示
      return;
      }

      // 检查按钮是否可见且可点击
  if (!showMoreButton.offsetParent || showMoreButton.style.display === 'none') {
   return;
      }

      const initialText = this.getTweetTextSnapshot(tweetElement);

      // 安全点击Show more按钮 - 阻止默认的链接跳转行为
      const isLink = showMoreButton.tagName.toLowerCase() === 'a';
      
      // 添加事件监听器来阻止默认行为
      const preventNavigation = (e: Event) => {
        if (isLink) {
          e.preventDefault();
        }
      };
      
      if (isLink) {
        showMoreButton.addEventListener('click', preventNavigation, { once: true });
      }
      showMoreButton.click();
      
      // 清理事件监听器（防止意外情况）
  setTimeout(() => {
        showMoreButton.removeEventListener('click', preventNavigation);
      }, 100);
      
      // 等待内容展开，并验证是否成功展开
      let attempts = 0;
      const maxAttempts = 20;
      
      while (attempts < maxAttempts) {
   await new Promise(resolve => setTimeout(resolve, 100));
  
      // 检查Show more按钮是否已消失或变成Show less
     const currentButton = this.findMainTweetShowMoreButton(tweetElement);
   const showLessButton = this.findMainTweetShowLessButton(tweetElement);
      const currentText = this.getTweetTextSnapshot(tweetElement);
        
        if (!currentButton || showLessButton || currentText.length > initialText.length) {
       console.log('Long tweet content expanded successfully');
          return;
    }
        
 attempts++;
      }
      
      console.warn('Tweet expansion may not have completed, but continuing...');
      
    } catch (error) {
      console.warn('Failed to expand tweet content:', error);
      // 即使展开失败，也继续处理，可能会复制到部分内容
    }
  }

  /**
   * 获取推文内容快照，用于检测展开变化
   */
  private getTweetTextSnapshot(tweetElement: HTMLElement): string {
    const textNodes = Array.from(tweetElement.querySelectorAll('[data-testid="tweetText"]')) as HTMLElement[];
    if (textNodes.length === 0) {
      return tweetElement.textContent?.trim() || '';
    }

    return textNodes
      .map(node => node.innerText || node.textContent || '')
      .join('\n')
      .trim();
  }

  /**
   * 复制单条推文
   */
  private async copySingleTweet(tweetElement: HTMLElement): Promise<void> {
    // 首先尝试展开长推文内容
    await this.expandTweetContent(tweetElement);
    
    const tweetData = await tweetParser.parseTweet(tweetElement);
    if (!tweetData) {
      console.error('Failed to parse tweet data, attempting simple text copy as fallback');
    // 尝试简单的文本复制作为备用方案
      await this.copyTweetAsSimpleText(tweetElement);
      return;
    }

        // 使用调试工具创建格式选项
    const options = SettingsDebugFix.createFormatOptions(this.currentSettings);

    await clipboardManager.copyTweet(tweetData, options);
  }

  /**
   * 简单文本复制作为备用方案
   */
  private async copyTweetAsSimpleText(tweetElement: HTMLElement): Promise<void> {
    try {
      const textContent = tweetElement.textContent?.trim() || '';
 if (textContent) {
        await navigator.clipboard.writeText(textContent);
        console.log('Tweet copied as simple text:', textContent.substring(0, 100) + '...');
      } else {
  throw new Error('No text content found in tweet element');
   }
    } catch (error) {
  console.error('Failed to copy tweet as simple text:', error);
      throw new Error('Failed to copy tweet data');
    }
  }

  /**
   * 显示线程复制选择对话框
   */
  private showThreadCopyDialog(tweetElement: HTMLElement, threadData: ThreadData, button: HTMLElement): void {
    const dialog = this.createThreadDialog(threadData, async (choice: 'single' | 'thread' | 'from-here') => {
      try {
 this.setButtonLoading(button, true);

      switch (choice) {
          case 'single':
      await this.copySingleTweet(tweetElement);
          break;
          case 'thread':
  await this.copyFullThread(threadData);
    break;
               case 'from-here':
         const currentTweet = await tweetParser.parseTweet(tweetElement);
    const position = threadData.tweets.findIndex(tweet => tweet.id === currentTweet?.id) + 1;
   const partialThread = await threadParser.parseThreadFromPosition(tweetElement, position);
       if (partialThread) {
        await this.copyFullThread(partialThread);
            }
break;
  }

        TwitterActionButtons.setButtonSuccess(button);
      this.removeDialog(dialog);
        
      } catch (error) {
 console.error('Failed to copy thread:', error);
        TwitterActionButtons.setButtonError(button);
      } finally {
     TwitterActionButtons.setButtonLoading(button, false);
      }
    });

    document.body.appendChild(dialog);
  }

  /**
   * 创建线程复制对话框
   */
  private createThreadDialog(threadData: ThreadData, onChoice: (choice: 'single' | 'thread' | 'from-here') => void): HTMLElement {
 const dialog = createElement('div', {
      className: 'tsc-thread-dialog',
      innerHTML: `
        <div class="tsc-dialog-backdrop"></div>
        <div class="tsc-dialog-content">
          <div class="tsc-dialog-header">
      <h3>${i18nManager.t('thread.detected')}</h3>
          <button class="tsc-dialog-close" aria-label="${i18nManager.t('close')}">×</button>
 </div>
<div class="tsc-dialog-body">
        <p>${i18nManager.t('thread.count', { count: threadData.tweets.length })}</p>
            <div class="tsc-dialog-buttons">
         <button class="tsc-dialog-button" data-choice="single">
        ${i18nManager.t('thread.copy_single')}
              </button>
 <button class="tsc-dialog-button" data-choice="thread">
                ${i18nManager.t('thread.copy_thread')}
              </button>
  <button class="tsc-dialog-button" data-choice="from-here">
       ${i18nManager.t('thread.copy_from_here')}
      </button>
            </div>
  </div>
        </div>
      `
    });

    // 添加事件监听器
    dialog.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('tsc-dialog-backdrop') || target.classList.contains('tsc-dialog-close')) {
        this.removeDialog(dialog);
      } else if (target.classList.contains('tsc-dialog-button')) {
    const choice = target.dataset.choice as 'single' | 'thread' | 'from-here';
        onChoice(choice);
  }
    });

    return dialog;
  }

  /**
   * 复制完整线程
   */
  private async copyFullThread(threadData: ThreadData): Promise<void> {
    const options: FormatOptions = {
      format: this.currentSettings?.format || 'html',
      includeAuthor: this.currentSettings?.includeAuthor === true,
    includeTimestamp: this.currentSettings?.includeTimestamp !== false,
      includeMetrics: this.currentSettings?.includeMetrics === true,
    includeMedia: this.currentSettings?.includeMedia !== false,
      includeLink: this.currentSettings?.includeLink !== false
    };

    await clipboardManager.copyThread(threadData, options);
  }

  /**
   * 移除对话框
 */
  private removeDialog(dialog: HTMLElement): void {
    if (dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  }

  /**
   * 添加线程指示器
   */
  private addThreadIndicator(element: HTMLElement, threadInfo: any): void {
    if (element.querySelector('.tsc-thread-indicator')) {
      return;
    }

    const indicator = createElement('div', {
      className: 'tsc-thread-indicator',
      title: i18nManager.t('thread.detected'),
      innerHTML: '🧵'
    });

    const header = element.querySelector(TWITTER_SELECTORS.TWEET_AUTHOR);
    if (header) {
 header.appendChild(indicator);
    }
  }

  /**
   * 设置按钮加载状态
   */
  private setButtonLoading(button: HTMLElement, loading: boolean): void {
    if (loading) {
      button.classList.add('tsc-loading');
      button.setAttribute('disabled', 'true');
    } else {
      button.classList.remove('tsc-loading');
   button.removeAttribute('disabled');
    }
  }

  /**
   * 设置按钮成功状态
   */
  private setButtonSuccess(button: HTMLElement): void {
  // 移除其他状态
    button.classList.remove('tsc-loading', 'tsc-error');
    button.classList.add('tsc-success');
    
    // 更新图标为成功图标
  const icon = button.querySelector('.tsc-copy-icon');
    if (icon) {
      const originalIcon = icon.innerHTML;
      icon.innerHTML = this.getSuccessIconSVG();
      
      // 恢复原始图标
      setTimeout(() => {
     icon.innerHTML = originalIcon;
    }, 2000);
    }
    
// 显示成功提示
    this.showToast(i18nManager.t('tweet_copied') || 'Tweet copied successfully!', 'success');
    
    // 移除成功状态
    setTimeout(() => {
      button.classList.remove('tsc-success');
    }, 2000);
  }

  /**
 * 设置按钮错误状态
   */
  private setButtonError(button: HTMLElement): void {
    // 移除其他状态
    button.classList.remove('tsc-loading', 'tsc-success');
    button.classList.add('tsc-error');
    
  // 更新图标为错误图标
    const icon = button.querySelector('.tsc-copy-icon');
  if (icon) {
    const originalIcon = icon.innerHTML;
    icon.innerHTML = this.getErrorIconSVG();
      
      // 恢复原始图标
      setTimeout(() => {
   icon.innerHTML = originalIcon;
      }, 2000);
   }
    
     // 显示错误提示
 this.showToast(i18nManager.t('copy_failed') || 'Copy failed. Please try again.', 'error');
    
 // 移除错误状态
  setTimeout(() => {
   button.classList.remove('tsc-error');
  }, 2000);
  }

  /**
   * 显示Toast通知
   */
  private showToast(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // 移除已存在的toast
    const existingToast = document.querySelector('.tsc-toast');
    if (existingToast) {
   existingToast.remove();
    }

    // 创建toast元素
    const toast = createElement('div', {
 className: `tsc-toast tsc-toast-${type}`,
      innerHTML: `
      <div class="tsc-toast-content">
      <div class="tsc-toast-icon">${this.getToastIcon(type)}</div>
     <div class="tsc-toast-message">${message}</div>
        </div>
      `
    });

    // 添加到页面
    document.body.appendChild(toast);

    // 显示动画
    requestAnimationFrame(() => {
      toast.classList.add('tsc-toast-show');
    });

    // 自动隐藏
    setTimeout(() => {
      toast.classList.remove('tsc-toast-show');
      toast.classList.add('tsc-toast-hide');
      
    setTimeout(() => {
        if (toast.parentNode) {
     toast.parentNode.removeChild(toast);
   }
    }, 300); // 等待隐藏动画完成
    }, 3000);
  }

  /**
 * 获取Toast图标
   */
  private getToastIcon(type: 'success' | 'error' | 'info'): string {
    switch (type) {
      case 'success':
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
       <path d="M9 11l3 3L22 4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/>
   </svg>`;
      case 'error':
   return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6L6 18"/><path d="M6 6l12 12"/>
          </svg>`;
      case 'info':
      default:
   return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
     <circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>
        </svg>`;
    }
  }

  /**
   * 注入样式
   */
  private injectStyles(): void {
    const css = `
      .tsc-copy-button {
        display: inline-flex;
   align-items: center;
        justify-content: center;
 width: 34.75px;
        height: 34.75px;
        border-radius: 9999px;
        border: none;
     background: transparent;
        cursor: pointer;
     color: rgb(83, 100, 113);
        transition: all 0.2s ease;
        margin-left: 12px;
      }
      
      .tsc-copy-button:hover {
        background-color: rgba(29, 155, 240, 0.1);
        color: rgb(29, 155, 240);
      }
      
   .tsc-copy-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
  }
      
      .tsc-copy-button.tsc-loading .tsc-copy-icon {
    animation: tsc-spin 1s linear infinite;
      }
      
          .tsc-copy-button.tsc-success {
        color: rgb(0, 186, 124);
     background-color: rgba(0, 186, 124, 0.1);
        transform: scale(1.05);
   }
      
      .tsc-copy-button.tsc-error {
      color: rgb(244, 33, 46);
     background-color: rgba(244, 33, 46, 0.1);
        transform: scale(1.05);
  }

 /* 截图按钮样式 */
      .tsc-screenshot-button {
        display: inline-flex;
     align-items: center;
 justify-content: center;
        width: 34.75px;
   height: 34.75px;
    border-radius: 9999px;
        border: none;
     background: transparent;
        cursor: pointer;
    color: rgb(83, 100, 113);
     transition: all 0.2s ease;
 margin-left: 12px;
      }
      
      .tsc-screenshot-button:hover {
        background-color: rgba(255, 122, 0, 0.1);
   color: rgb(255, 122, 0);
  }
     
  .tsc-screenshot-button:disabled {
      opacity: 0.5;
  cursor: not-allowed;
    }
  
      .tsc-screenshot-button.tsc-loading .tsc-screenshot-icon {
        animation: tsc-spin 1s linear infinite;
      }
   
      .tsc-screenshot-button.tsc-success {
        color: rgb(0, 186, 124);
    background-color: rgba(0, 186, 124, 0.1);
     transform: scale(1.05);
    }
  
      .tsc-screenshot-button.tsc-error {
        color: rgb(244, 33, 46);
        background-color: rgba(244, 33, 46, 0.1);
        transform: scale(1.05);
   }
      
      /* 通用操作图标样式 */
      .tsc-action-icon {
        display: flex;
      align-items: center;
        justify-content: center;
        width: 18px;
  height: 18px;
   }
      
    .tsc-action-icon svg {
    width: 100%;
  height: 100%;
      stroke: currentColor;
      }
      
      /* Notion按钮样式 */
      .tsc-notion-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34.75px;
        height: 34.75px;
        border-radius: 9999px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: rgb(83, 100, 113);
        transition: all 0.2s ease;
        margin-left: 12px;
      }
      
      .tsc-notion-button:hover {
        background-color: rgba(55, 53, 47, 0.1);
        color: rgb(55, 53, 47);
      }
      
      .tsc-notion-button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .tsc-notion-button.tsc-loading .tsc-notion-icon {
        animation: tsc-spin 1s linear infinite;
      }
      
      .tsc-notion-button.tsc-success {
        color: rgb(0, 186, 124);
        background-color: rgba(0, 186, 124, 0.1);
        transform: scale(1.05);
      }
      
      .tsc-notion-button.tsc-error {
        color: rgb(244, 33, 46);
        background-color: rgba(244, 33, 46, 0.1);
        transform: scale(1.05);
      }

      /* 强制移除SVG填充，覆盖Twitter的默认样式 */
      .tsc-action-icon svg,
   .tsc-action-icon svg *,
      .tsc-copy-icon svg,
      .tsc-copy-icon svg *,
      .tsc-screenshot-icon svg,
      .tsc-screenshot-icon svg *,
      .tsc-notion-icon svg {
        fill: none !important;
      }
      
      /* Notion图标需要填充 */
      .tsc-notion-icon svg {
        fill: currentColor !important;
      }
      
  /* 防止处理中的推文被重复处理 */
      .tsc-processing {
        opacity: 0.8;
      }
      
  @keyframes tsc-spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .tsc-thread-indicator {
        font-size: 12px;
        margin-left: 4px;
        opacity: 0.7;
      }
      
      .tsc-thread-dialog {
    position: fixed;
        top: 0;
   left: 0;
        right: 0;
    bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
justify-content: center;
    }
      
    .tsc-dialog-backdrop {
        position: absolute;
top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
}
      
      .tsc-dialog-content {
   position: relative;
        background: white;
     border-radius: 16px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      }
    
      .tsc-dialog-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
  padding: 20px;
        border-bottom: 1px solid rgb(239, 243, 244);
      }
      
      .tsc-dialog-header h3 {
        margin: 0;
        font-size: 20px;
        font-weight: 700;
      }
      
      .tsc-dialog-close {
      background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 4px;
      }
    
      .tsc-dialog-body {
        padding: 20px;
      }
      
      .tsc-dialog-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
margin-top: 20px;
      }
      
      .tsc-dialog-button {
        padding: 12px 16px;
        border: 1px solid rgb(207, 217, 222);
    border-radius: 8px;
    background: white;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .tsc-dialog-button:hover {
        background: rgb(247, 249, 249);
      }
      
      /* Dark mode support */
      [data-theme="dark"] .tsc-dialog-content,
      html.dark .tsc-dialog-content {
        background: rgb(21, 32, 43);
     color: white;
      }
  
      [data-theme="dark"] .tsc-dialog-header,
      html.dark .tsc-dialog-header {
        border-bottom-color: rgb(47, 51, 54);
      }
      
      [data-theme="dark"] .tsc-dialog-button,
  html.dark .tsc-dialog-button {
        background: rgb(21, 32, 43);
        border-color: rgb(47, 51, 54);
     color: white;
      }
      
      [data-theme="dark"] .tsc-dialog-button:hover,
      html.dark .tsc-dialog-button:hover {
      background: rgb(47, 51, 54);
      }
      
 /* Toast 通知样式 */
      .tsc-toast {
        position: fixed;
        top: 20px;
     right: 20px;
    z-index: 10001;
        background: white;
 border-radius: 8px;
   box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        padding: 12px 16px;
        max-width: 320px;
        transform: translateX(400px);
        transition: all 0.3s ease;
        opacity: 0;
      }
      
      .tsc-toast.tsc-toast-show {
        transform: translateX(0);
      opacity: 1;
  }
      
  .tsc-toast.tsc-toast-hide {
    transform: translateX(400px);
        opacity: 0;
    }
      
      .tsc-toast-content {
        display: flex;
     align-items: center;
        gap: 8px;
      }
    
      .tsc-toast-icon {
 flex-shrink: 0;
        display: flex;
   align-items: center;
      }
   
      .tsc-toast-message {
  font-size: 14px;
        font-weight: 500;
  line-height: 1.4;
      }
      
   .tsc-toast-success {
        border-left: 4px solid #10b981;
      }
 
      .tsc-toast-success .tsc-toast-icon {
        color: #10b981;
      }
  
 .tsc-toast-error {
     border-left: 4px solid #ef4444;
  }
      
      .tsc-toast-error .tsc-toast-icon {
        color: #ef4444;
      }
   
      .tsc-toast-info {
        border-left: 4px solid #3b82f6;
      }
      
      .tsc-toast-info .tsc-toast-icon {
        color: #3b82f6;
      }
      
      /* Dark mode support for toast */
      [data-theme="dark"] .tsc-toast,
      html.dark .tsc-toast {
 background: rgb(21, 32, 43);
        color: white;
    }

      /* 自定义操作栏样式 */
    .tsc-custom-actions-bar {
    display: flex;
        align-items: center;
   margin-top: 12px;
        padding: 0 16px;
   min-height: 32px;
      border-top: 1px solid rgb(239, 243, 244);
 }
     
      [data-theme="dark"] .tsc-custom-actions-bar,
      html.dark .tsc-custom-actions-bar {
  border-top-color: rgb(47, 51, 54);
   }

 /* 截图按钮样式 */
      .tsc-screenshot-button {
     display: inline-flex;
   align-items: center;
    justify-content: center;
   width: 34.75px;
     height: 34.75px;
        border-radius: 9999px;
   border: none;
      background: transparent;
        cursor: pointer;
   color: rgb(83, 100, 113);
     transition: all 0.2s ease;
        margin-left: 12px;
      }
      
     .tsc-screenshot-button:hover {
        background-color: rgba(29, 155, 240, 0.1);
        color: rgb(29, 155, 240);
  }
      
   .tsc-screenshot-button:disabled {
        opacity: 0.5;
     cursor: not-allowed;
      }
      
      .tsc-screenshot-button.tsc-loading .tsc-screenshot-icon {
  animation: tsc-spin 1s linear infinite;
      }
      
      .tsc-screenshot-button.tsc-success {
   color: rgb(0, 186, 124);
     background-color: rgba(0, 186, 124, 0.1);
     transform: scale(1.05);
      }
      
      .tsc-screenshot-button.tsc-error {
   color: rgb(244, 33, 46);
     background-color: rgba(244, 33, 46, 0.1);
        transform: scale(1.05);
     }

   /* 截图对话框样式 */
      .tsc-screenshot-dialog {
   position: fixed;
        top: 0;
 left: 0;
right: 0;
bottom: 0;
   z-index: 10000;
   display: flex;
     align-items: center;
        justify-content: center;
    }

      .tsc-option-group {
margin-bottom: 16px;
      }

   .tsc-option-group label {
    display: block;
        font-weight: 600;
    margin-bottom: 8px;
    color: #0f1419;
      }

 .tsc-format-select {
   width: 100%;
     padding: 8px 12px;
        border: 1px solid #cfd9de;
        border-radius: 8px;
background: white;
   }

      .tsc-quality-slider {
        width: 70%;
margin-right: 12px;
      }

    .tsc-quality-value {
font-weight: 600;
     color: #536471;
      }
      
      /* 视频下载按钮样式 */
      .tweet-craft-video-download-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34.75px;
        height: 34.75px;
        border-radius: 9999px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: rgb(83, 100, 113);
        transition: all 0.2s ease;
        margin-left: 12px;
        position: relative;
      }
      
      .tweet-craft-video-download-btn:hover {
        background-color: rgba(34, 197, 94, 0.1);
        color: rgb(34, 197, 94);
        transform: scale(1.05);
      }
      
      .tweet-craft-video-download-btn:active {
        transform: scale(0.95);
      }
      
      .tweet-craft-video-download-btn:focus {
        outline: 2px solid rgb(34, 197, 94);
        outline-offset: 2px;
      }
      
      /* 视频下载按钮中的图标 */
      .tweet-craft-video-download-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      
      /* 通知样式 */
      .tweet-craft-notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.3s ease;
      }
      
      .tweet-craft-notification-info {
        background-color: rgb(59, 130, 246);
        color: white;
      }
      
      .tweet-craft-notification-error {
        background-color: rgb(239, 68, 68);
        color: white;
      }
      
      .tweet-craft-notification-success {
        background-color: rgb(34, 197, 94);
        color: white;
      }
    `;

    addStyleSheet(css, this.styleSheetId);
    console.log('Styles injected');
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听快捷键
 document.addEventListener('keydown', this.handleKeyDown.bind(this));
    
    // 监听页面变化（SPA导航）
    window.addEventListener('popstate', this.handleNavigationChange.bind(this));
    
    console.log('Event listeners set up');
  }

  /**
   * 处理键盘事件
 */
  private handleKeyDown(event: KeyboardEvent): void {
    // Ctrl+Shift+C 或 Cmd+Shift+C
    if (event.key === 'C' && event.shiftKey && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.handleShortcutCopy();
    }
  }

  /**
   * 处理快捷键复制
   */
  private async handleShortcutCopy(): Promise<void> {
    try {
      // 查找当前焦点推文或最近的推文
      const focusedTweet = this.findFocusedTweet();
      if (focusedTweet) {
        await this.copySingleTweet(focusedTweet);
}
    } catch (error) {
      console.error('Failed to copy via shortcut:', error);
    }
  }

  /**
   * 查找当前焦点的推文
   */
  private findFocusedTweet(): HTMLElement | null {
    // 尝试查找有焦点的推文
    const activeElement = document.activeElement;
    if (activeElement) {
      const tweet = closest(activeElement, TWITTER_SELECTORS.TWEET_CONTAINER);
      if (tweet) return tweet as HTMLElement;
    }

    // 查找视口中心的推文
    const tweets = tweetParser.findTweetElements();
    const viewportCenter = window.innerHeight / 2;
    
    let closestTweet: HTMLElement | null = null;
    let closestDistance = Infinity;

    for (const tweet of tweets) {
  const rect = tweet.getBoundingClientRect();
      const tweetCenter = rect.top + rect.height / 2;
      const distance = Math.abs(tweetCenter - viewportCenter);
      
      if (distance < closestDistance && rect.top >= 0 && rect.bottom <= window.innerHeight) {
        closestDistance = distance;
        closestTweet = tweet;
      }
 }

    return closestTweet;
  }

  /**
   * 处理页面导航变化
   */
  private handleNavigationChange(): void {
    // 清理处理过的推文集合，重新处理页面内容
    this.processedTweets.clear();
    
    // 延迟处理，等待新内容加载
    setTimeout(() => {
      this.processExistingTweets();
    }, 1000);
  }

  /**
   * 立即处理页面上已存在的推文 - 优化版本
   */
  private async processExistingTweetsImmediate(): Promise<void> {
    console.log('🚀 Starting immediate tweet processing');
    
    // 首先清理页面上可能已经存在的重复按钮
    this.cleanupDuplicateButtons();
    
    // 等待DOM稳定
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // 使用增强的查找方法
    const existingTweets = this.findTweetElementsEnhanced(document.body);
    console.log(`📊 Found ${existingTweets.length} existing tweets for immediate processing`);
    
 // 分批立即处理，不使用队列
    for (let i = 0; i < existingTweets.length; i += 5) {
      const batch = existingTweets.slice(i, i + 5);
      await Promise.all(batch.map(tweet => this.processTweetElement(tweet)));
      
      // 小延迟避免阻塞UI
      if (i + 5 < existingTweets.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    console.log('✅ Immediate tweet processing completed');
  }

  /**
   * 处理页面上已存在的推文（旧方法，保持兼容性）
   */
  private processExistingTweets(): void {
   // 首先清理页面上可能已经存在的重复按钮
 this.cleanupDuplicateButtons();
    
    // 使用增强的查找方法
    const existingTweets = this.findTweetElementsEnhanced(document.body);
    if (existingTweets.length > 0) {
      this.tweetProcessor?.addItems(existingTweets);
    }
  }

  /**
   * 清理页面上重复的复制按钮
   */
  private cleanupDuplicateButtons(): void {
    try {
      console.log('Starting cleanup of existing action buttons');
      this.processedTweets.clear();
      
     // 初始化时移除旧按钮，避免旧事件闭包继续引用错误的推文元素。
      const allButtons = document.querySelectorAll(
        '.tsc-copy-button, .tsc-screenshot-button, .tsc-video-download-button, .tsc-notion-button'
      );
      console.log(`Found ${allButtons.length} existing action buttons`);
      
   let removedCount = 0;
  
      allButtons.forEach((button, index) => {
        const wrapper = button.parentElement;
        if (wrapper && wrapper.children.length === 1 && wrapper.classList.contains('css-175oi2r')) {
          console.log(`Removing action button wrapper ${index}`);
          wrapper.remove();
        } else {
          console.log(`Removing action button ${index}`);
          button.remove();
        }
        removedCount++;
      });
      
     // 清理嵌套在其他复制按钮内的按钮
  const nestedButtons = document.querySelectorAll('.tsc-action-button .tsc-action-button');
      nestedButtons.forEach((nestedButton, index) => {
 console.log(`Removing nested action button ${index}`);
        nestedButton.remove();
     removedCount++;
      });

      this.resetTweetProcessingState();
      
      console.log(`Cleanup complete. Removed ${removedCount} existing/nested buttons`);
    
    } catch (error) {
      console.error('Error during button cleanup:', error);
    }
  }

  /**
   * 清理旧内容脚本留下的处理标记。
   * 扩展重载后页面 DOM 可能保留 class，但事件闭包已经不是当前脚本实例。
   */
  private resetTweetProcessingState(): void {
    const candidates = document.querySelectorAll(
      'article[data-testid="tweet"], [data-testid="tweet"], article[role="article"]'
    );
    const resetTweets = new Set<HTMLElement>();

    candidates.forEach(candidate => {
      const tweetElement = this.normalizeTweetElement(candidate as HTMLElement);
      if (tweetElement) {
        resetTweets.add(tweetElement);
      }
    });

    resetTweets.forEach(tweetElement => {
      tweetElement.classList.remove('tsc-processed', 'tsc-processing');
    });
  }

  /**
   * 重新处理缺失的复制按钮 - 优化版本
   */
  private reprocessMissingButtons(): void {
    const allTweets = this.findTweetElementsEnhanced(document.body);
const missingButtons: HTMLElement[] = [];
    
    for (const tweet of allTweets) {
      // 检查是否缺少复制按钮且未被处理
   if (!tweet.querySelector('.tsc-copy-button') && 
          !tweet.classList.contains('tsc-processed') && 
          !tweet.classList.contains('tsc-processing')) {
  const elementId = this.getElementId(tweet);
        if (!this.processedTweets.has(elementId)) {
          missingButtons.push(tweet);
        }
      }
    }
    
    // 如果有遗漏的推文，立即处理它们
    if (missingButtons.length > 0) {
      console.log(`🔧 Found ${missingButtons.length} tweets missing copy buttons, processing with retry`);
  missingButtons.forEach(tweet => {
        this.processTweetElement(tweet);
      });
    }
  }

  /**
   * 处理详情页的推文
   */
private processDetailPageTweets(): void {
    // 详情页有不同的DOM结构，需要特殊处理
const detailSelectors = [
     '[data-testid="tweetDetail"]',
      '[data-testid="tweetDetail"] article',
      'article[role="article"]',
 'main article'
    ];
    
    for (const selector of detailSelectors) {
      try {
    const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const tweetElement = element as HTMLElement;
          const elementId = this.getElementId(tweetElement);
          
   if (!this.processedTweets.has(elementId) && this.isTweetElement(tweetElement)) {
     this.processTweetElement(tweetElement);
            this.processedTweets.add(elementId);
   }
        }
 } catch (error) {
        console.warn(`Error processing detail page with selector ${selector}:`, error);
      }
    }
  }

  /**
   * 启动定期检查，确保没有遗漏的推文
   */
  private startPeriodicCheck(): void {
  // 每3秒检查一次是否有新的推文需要处理
    setInterval(() => {
      if (!this.isInitialized) return;
  
      try {
      this.reprocessMissingButtons();
      } catch (error) {
        console.warn('Error during periodic check:', error);
      }
    }, 3000);
    
    console.log('📅 Periodic check started (every 3 seconds)');
  }

  /**
   * 设置消息监听器
   */
  private setupMessageListeners(): void {
    browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
        switch (message.type) {
          case 'EXECUTE_COPY_TWEET':
        const focusedTweet = this.findFocusedTweet();
            if (focusedTweet) {
    await this.copySingleTweet(focusedTweet);
sendResponse({ success: true });
            } else {
          sendResponse({ success: false, error: 'No tweet found' });
            }
            break;

          case 'SETTINGS_UPDATED':
            await this.loadSettings();
   sendResponse({ success: true });
            break;

          default:
            sendResponse({ success: false, error: 'Unknown message type' });
     }
      } catch (error) {
const errorMessage = error instanceof Error ? error.message : String(error);
    sendResponse({ success: false, error: errorMessage });
      }
    });
  }

  
  /**
   * 初始化 Notion 按钮管理器
   */
  private initializeNotionButtonManager(): void {
    try {
      this.notionButtonManager = new NotionButtonManager();
      console.log('✅ Notion button manager initialized successfully');
      
      // 在开发环境中暴露调试接口
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        (window as any).notionButtonManager = this.notionButtonManager;
        console.log('🔧 Notion button manager exposed as window.notionButtonManager');
      }
      
    } catch (error) {
      console.error('❌ Failed to initialize Notion button manager:', error);
    }
  }

  /**
   * 生成简单的哈希码
   */
  private hashCode(str: string): string {
    let hash = 0;
    if (str.length === 0) return hash.toString();
    
 for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
   hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * 获取元素的DOM路径
 */
  private getDOMPath(element: HTMLElement): string {
    const path: string[] = [];
    let current: Element | null = element;
    
    while (current && current !== document.body && path.length < 10) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
      } else if (current.className) {
          const classNames = typeof current.className === 'string' 
          ? current.className 
      : String(current.className);
        const classes = classNames.split(' ').slice(0, 2).join('.');
      if (classes) selector += `.${classes}`;
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  /**
   * 检查推文是否包含视频
   */
  private hasVideo(element: HTMLElement): boolean {
    // 查找视频元素的各种选择器
    const videoSelectors = [
      'video',
      '[data-testid="videoPlayer"]',
      '[data-testid="previewInterstitial"]',
      '[aria-label*="Video"]',
      '[aria-label*="video"]',
      '.r-1w513bd', // Twitter 视频播放器的类名
      '[role="presentation"] video',
      'div[style*="background-image"]', // 视频缩略图
    ];

    for (const selector of videoSelectors) {
      try {
        const found = element.querySelector(selector);
        if (found) {
          // 对于背景图片，额外检查是否包含播放相关的元素
          if (selector === 'div[style*="background-image"]') {
            const hasPlayButton = found.querySelector('[aria-label*="play"]') || 
                                 found.querySelector('[data-testid="playButton"]') ||
                                 found.textContent?.toLowerCase().includes('play');
            if (hasPlayButton) {
              console.log('Video found with selector:', selector);
              return true;
            }
          } else {
            console.log('Video found with selector:', selector);
            return true;
          }
        }
      } catch (error) {
        console.warn('Invalid video selector:', selector, error);
        continue;
      }
    }

    // 检查Twitter特有的视频容器
    const twitterVideoContainers = [
      '[data-testid="videoComponent"]',
      '[data-testid="tweet-video"]',
      '[data-testid="media-video"]',
      '.css-1dbjc4n[data-testid] video', // Twitter的视频容器
    ];

    for (const containerSelector of twitterVideoContainers) {
      try {
        if (element.querySelector(containerSelector)) {
          console.log('Video found in Twitter container:', containerSelector);
          return true;
        }
      } catch (error) {
        console.warn('Invalid container selector:', containerSelector, error);
        continue;
      }
    }

    // 检查是否有视频相关的媒体卡片
    const mediaCards = element.querySelectorAll('[data-testid="card.layoutLarge.media"], [data-testid="card.layoutSmall.media"]');
    for (const card of mediaCards) {
      const cardElement = card as HTMLElement;
      // 检查媒体卡片是否包含视频指示器
      if (cardElement.querySelector('video') || 
          cardElement.querySelector('[aria-label*="video"]') ||
          cardElement.querySelector('[data-testid*="video"]')) {
        console.log('Video detected in media card');
        return true;
      }
    }

    // 检查是否有视频播放器的特征元素
    const videoIndicators = [
      '[aria-label*="Play video"]',
      '[aria-label*="播放视频"]',
      '[data-testid*="VideoPlayer"]',
      'svg[aria-label*="Play"]',
      '.PlayIcon', // 可能的播放图标类名
    ];

    for (const indicator of videoIndicators) {
      try {
        if (element.querySelector(indicator)) {
          console.log('Video indicator found:', indicator);
          return true;
        }
      } catch (error) {
        console.warn('Invalid indicator selector:', indicator, error);
        continue;
      }
    }

    return false;
  }

  /**
   * 处理视频下载按钮点击
   */
  private async handleVideoDownloadClick(element: HTMLElement, button: HTMLElement): Promise<void> {
    try {
      console.log('Video download button clicked for element:', element);
      
      // 设置按钮为加载状态
      TwitterActionButtons.setButtonLoading(button, true);
      
      // 获取推文URL
      const tweetUrl = this.getTweetUrl(element);
      if (!tweetUrl) {
        throw new Error('Cannot find tweet URL');
      }

      console.log('Tweet URL for video download:', tweetUrl);

      // 使用视频服务处理下载
      const result = await this.videoService.downloadVideoViaService(tweetUrl);
      
      if (result.success) {
        // 显示成功状态
        TwitterActionButtons.setButtonSuccess(button);
        this.showToast('视频下载服务已打开，请在新标签页中下载视频', 'success');
      } else {
        throw new Error(result.error || 'Video download failed');
      }
      
    } catch (error) {
      console.error('Video download failed:', error);
      TwitterActionButtons.setButtonError(button);
      this.showToast(
        error instanceof Error ? error.message : '视频下载失败，请稍后重试',
        'error'
      );
    } finally {
      // 清除加载状态
      TwitterActionButtons.setButtonLoading(button, false);
    }
  }

  /**
   * 获取推文URL
   */
  private getTweetUrl(element: HTMLElement): string | null {
    // 查找推文链接
    const timeElement = element.querySelector('time');
    if (timeElement && timeElement.parentElement) {
      const linkElement = timeElement.parentElement as HTMLAnchorElement;
      if (linkElement.href) {
        return linkElement.href;
      }
    }

    // 备用方法：查找任何推文状态链接
    const statusLink = element.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
    if (statusLink && statusLink.href) {
      return statusLink.href;
    }

    // 最后的备用方法：从当前页面URL构造
    const currentUrl = window.location.href;
    if (currentUrl.includes('/status/')) {
      return currentUrl;
    }

    return null;
  }

  /**
   * 清理资源
   */
  destroy(): void {
    if (!this.isInitialized) return;
    
    // 停止观察器
    this.mutationObserver?.disconnect();
    
    // 清理批处理器
    this.tweetProcessor?.clear();
    
    // 清理剪贴板管理器
clipboardManager.cleanup();
    
    // 清理 Notion 按钮管理器
    this.notionButtonManager?.destroy();
    
    // 移除样式
    const styleSheet = document.getElementById(this.styleSheetId);
    if (styleSheet) {
   styleSheet.remove();
    }
 
    // 清理状态
    this.processedTweets.clear();
    this.isInitialized = false;
    
    console.log('TwitterContentScript destroyed');
  }
}
