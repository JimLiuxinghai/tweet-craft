import { i18nManager } from '../i18n';
import { VideoQualityDialog } from './video-quality-dialog';
import { DownloadProgressManager } from './download-progress-manager';

// Declare chrome API for TypeScript
declare global {
  interface Window {
    chrome: typeof chrome;
  }
}

interface VideoInfo {
  quality: string;
  url: string;
  size?: number;
  type: string;
  bandwidth?: number;
  resolution?: string;
}

interface TweetData {
  id: string | null;
  username: string | null;
  url: string | null;
  timestamp: number;
}

export class TwitterVideoDetector {
  private videoElements: Set<Element> = new Set();
  private observer: MutationObserver | null = null;
  private processedTweets: Set<string> = new Set();
  private debouncedDetect: (() => void) & { cancel: () => void };
  private qualityDialog: VideoQualityDialog;
  private progressManager: DownloadProgressManager;

  constructor() {
    this.debouncedDetect = this.debounce(this.detectVideos.bind(this), 200);
    this.qualityDialog = new VideoQualityDialog();
    this.progressManager = new DownloadProgressManager();
    this.init();
    
    // 在开发环境中暴露调试方法
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).tweetCraftVideoDetector = this;
      console.log('🔧 Video detector exposed as window.tweetCraftVideoDetector for debugging');
    }
  }

  private init() {
    console.log('🎬 TwitterVideoDetector initialized');
    
    // 监听DOM变化
    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'data-testid', 'style', 'class']
    });
    
    // 监听来自后台脚本的消息
    this.setupMessageListeners();
    
    // 多阶段初始检测
    this.performInitialDetection();
    
    // 监听页面变化事件
    this.setupPageChangeListeners();
    
    // 定期重新检测（更频繁）
    setInterval(() => {
      console.log('🔄 Periodic video detection check');
      this.detectVideos();
    }, 3000);
  }

  private performInitialDetection() {
    // 立即检测一次
    console.log('🚀 Immediate video detection');
    this.detectVideos();
    
    // DOM加载完成后再检测
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOMContentLoaded - detecting videos');
        setTimeout(() => this.detectVideos(), 500);
      });
    }
    
    // 页面完全加载后检测
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        console.log('🌐 Window loaded - detecting videos');
        setTimeout(() => this.detectVideos(), 1000);
      });
    }
    
    // 延迟检测（处理动态加载的内容）
    const delays = [500, 1000, 2000, 3000, 5000];
    delays.forEach(delay => {
      setTimeout(() => {
        console.log(`⏰ Delayed detection after ${delay}ms`);
        this.detectVideos();
      }, delay);
    });
  }

  private setupPageChangeListeners() {
    // 监听URL变化（SPA导航）
    let currentUrl = window.location.href;
    const checkUrlChange = () => {
      if (window.location.href !== currentUrl) {
        currentUrl = window.location.href;
        console.log('🔄 URL changed, detecting videos');
        setTimeout(() => this.detectVideos(), 1000);
      }
    };
    
    // 使用多种方式监听页面变化
    setInterval(checkUrlChange, 1000);
    
    // 监听popstate事件
    window.addEventListener('popstate', () => {
      console.log('⬅️ Popstate event, detecting videos');
      setTimeout(() => this.detectVideos(), 500);
    });
    
    // 监听pushstate和replacestate
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      console.log('➡️ PushState event, detecting videos');
      setTimeout(() => this.detectVideos(), 500);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      console.log('🔄 ReplaceState event, detecting videos');
      setTimeout(() => this.detectVideos(), 500);
    };
  }

  private setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'DOWNLOAD_STARTED':
          this.progressManager.showProgress(message.downloadId, message.filename);
          break;
          
        case 'DOWNLOAD_PROGRESS_UPDATE':
          this.progressManager.updateProgress(
            message.downloadId,
            message.progressData.progress,
            message.progressData.speed,
            message.progressData.remainingTime
          );
          break;
          
        case 'DOWNLOAD_COMPLETED':
          this.progressManager.markCompleted(message.downloadId);
          break;
          
        case 'DOWNLOAD_ERROR':
          this.progressManager.markError(message.downloadId, message.error);
          break;
      }
    });
  }

  private handleMutation(mutations: MutationRecord[]) {
    let hasVideoRelevantChanges = false;
    let hasNewTweets = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const element = node as Element;
            
            // 检查是否是视频相关元素
            if (this.isVideoRelevantElement(element)) {
              console.log('🎥 Video-relevant element added:', element);
              hasVideoRelevantChanges = true;
            }
            
            // 检查是否是新的推文
            if (this.isTweetElement(element)) {
              console.log('📝 New tweet element added:', element);
              hasNewTweets = true;
            }
            
            // 检查子元素中是否有视频或推文
            if (element.querySelector) {
              const hasVideoChild = element.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video, img[src*="ext_tw_video_thumb"]');
              const hasTweetChild = element.querySelector('[data-testid="tweet"], article[role="article"]');
              
              if (hasVideoChild) {
                console.log('🎬 Element with video child added:', element);
                hasVideoRelevantChanges = true;
              }
              
              if (hasTweetChild) {
                console.log('📄 Element with tweet child added:', element);
                hasNewTweets = true;
              }
            }
          }
        });
      } else if (mutation.type === 'attributes') {
        const element = mutation.target as Element;
        const attributeName = mutation.attributeName;
        
        // 监听关键属性变化
        if (attributeName === 'data-testid' || attributeName === 'src' || attributeName === 'style') {
          if (this.isVideoRelevantElement(element) || this.isTweetElement(element)) {
            console.log(`🔄 Relevant attribute ${attributeName} changed on:`, element);
            hasVideoRelevantChanges = true;
          }
        }
      }
    });

    if (hasVideoRelevantChanges || hasNewTweets) {
      console.log('🚨 Triggering video detection due to relevant changes');
      this.debouncedDetect();
    }
  }

  private isTweetElement(element: Element): boolean {
    if (!element) return false;
    
    // 检查是否是推文容器
    const testId = element.getAttribute('data-testid');
    if (testId === 'tweet') return true;
    
    if (element.tagName === 'ARTICLE' && element.getAttribute('role') === 'article') {
      return true;
    }
    
    // 检查是否包含推文的关键元素
    if (element.querySelector) {
      const hasUserName = element.querySelector('[data-testid="User-Name"], [data-testid="User-Names"]');
      const hasTweetText = element.querySelector('[data-testid="tweetText"]');
      const hasActionButtons = element.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
      
      return !!(hasUserName && (hasTweetText || hasActionButtons));
    }
    
    return false;
  }

  private isVideoRelevantElement(element: Element): boolean {
    // 检查是否是video标签
    if (element.tagName === 'VIDEO') {
      return true;
    }
    
    // 检查是否是视频相关的testid
    const testId = element.getAttribute('data-testid');
    if (testId && ['videoComponent', 'previewInterstitial', 'playButton', 'tweetPhoto'].includes(testId)) {
      return true;
    }
    
    // 检查是否包含视频元素
    if (element.querySelector('video') !== null) {
      return true;
    }
    
    // 检查是否包含视频预览元素
    if (element.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"]') !== null) {
      return true;
    }
    
    // 检查是否包含视频缩略图
    if (element.querySelector('img[src*="ext_tw_video_thumb"]') !== null) {
      return true;
    }
    
    // 检查是否在视频容器内
    if (element.closest('[data-testid="videoComponent"], [data-testid="previewInterstitial"]') !== null) {
      return true;
    }
    
    return false;
  }

  private detectVideos() {
    try {
      // 更全面的视频检测选择器
      const videoSelectors = [
        // 直接的video元素
        'video[src*="video.twimg.com"]',
        'video[src*="twimg.com"]',
        '[data-testid="videoComponent"] video',
        '[data-testid="tweetPhoto"] video',
        '[role="link"] video',
        'div[data-testid="tweet"] video',
        
        // 视频预览和播放按钮容器
        '[data-testid="previewInterstitial"]',
        '[data-testid="videoComponent"]',
        '[data-testid="playButton"]',
        
        // 包含视频缩略图的容器
        '[data-testid="tweetPhoto"]:has([data-testid="previewInterstitial"])',
        '[data-testid="tweetPhoto"]:has([data-testid="playButton"])',
        
        // 通过背景图片检测视频缩略图
        'div[style*="ext_tw_video_thumb"]',
        'img[src*="ext_tw_video_thumb"]'
      ];

      const gifSelectors = [
        'img[src*=".gif"]',
        'video[poster*=".gif"]',
        '[data-testid="tweetPhoto"] img[src*=".gif"]',
        '[data-testid="videoComponent"] img[src*=".gif"]'
      ];

      // 检测视频
      videoSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(element => {
            if (this.isVideoElement(element)) {
              this.processVideoElement(element);
            }
          });
        } catch (error) {
          console.warn(`Error with selector ${selector}:`, error);
        }
      });

      // 检测GIF动图
      gifSelectors.forEach(selector => {
        try {
          document.querySelectorAll(selector).forEach(gif => {
            if (this.isGifElement(gif)) {
              this.processVideoElement(gif);
            }
          });
        } catch (error) {
          console.warn(`Error with GIF selector ${selector}:`, error);
        }
      });
    } catch (error) {
      console.error('Error detecting videos:', error);
    }
  }

  private isVideoElement(element: Element): boolean {
    // 检查是否是video标签
    if (element.tagName === 'VIDEO') {
      return true;
    }
    
    // 检查是否是视频预览容器
    if (element.getAttribute('data-testid') === 'previewInterstitial') {
      return true;
    }
    
    // 检查是否是视频组件容器
    if (element.getAttribute('data-testid') === 'videoComponent') {
      return true;
    }
    
    // 检查是否包含播放按钮
    if (element.getAttribute('data-testid') === 'playButton' || 
        element.querySelector('[data-testid="playButton"]')) {
      return true;
    }
    
    // 检查是否包含视频缩略图
    if (element.querySelector('img[src*="ext_tw_video_thumb"]') ||
        element.style.backgroundImage?.includes('ext_tw_video_thumb')) {
      return true;
    }
    
    // 检查是否包含video元素
    if (element.querySelector('video')) {
      return true;
    }
    
    return false;
  }

  private isGifElement(element: Element): boolean {
    if (element.tagName === 'IMG') {
      const src = element.getAttribute('src');
      return src?.includes('.gif') || false;
    }
    if (element.tagName === 'VIDEO') {
      const poster = element.getAttribute('poster');
      return poster?.includes('.gif') || false;
    }
    return false;
  }

  private async processVideoElement(videoElement: Element) {
    if (this.videoElements.has(videoElement)) return;
    
    this.videoElements.add(videoElement);
    
    // 使用重试机制查找推文容器
    await this.processVideoElementWithRetry(videoElement, 3);
  }

  private async processVideoElementWithRetry(videoElement: Element, maxRetries: number = 3) {
    console.log('🎥 Processing video element:', videoElement);
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      console.log(`📝 Attempt ${attempt + 1}/${maxRetries} to process video`);
      
      // 找到推文容器
      const tweetContainer = this.findTweetContainer(videoElement);
      if (!tweetContainer) {
        console.warn(`❌ No tweet container found on attempt ${attempt + 1}`);
        if (attempt < maxRetries - 1) {
          // 等待DOM更新后重试
          await new Promise(resolve => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }
        console.error('❌ Failed to find tweet container after all retries');
        return;
      }

      console.log('✅ Found tweet container:', tweetContainer);

      // 检查是否已经处理过这个推文
      const tweetId = this.extractTweetId(tweetContainer);
      console.log('🆔 Tweet ID:', tweetId);
      
      if (tweetId && this.processedTweets.has(tweetId)) {
        console.log('⏭️ Tweet already processed, skipping');
        return;
      }
      
      if (tweetId) {
        this.processedTweets.add(tweetId);
      }

      // 尝试添加下载按钮
      const success = await this.addDownloadButtonWithRetry(tweetContainer, videoElement);
      if (success) {
        console.log('🎉 Successfully added download button for video');
        return;
      }
      
      // 如果添加按钮失败，继续重试
      if (attempt < maxRetries - 1) {
        console.warn(`⏳ Button addition failed, retrying in ${300 * (attempt + 1)}ms`);
        await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    
    console.error('❌ Failed to add download button after all retries');
  }

  private findTweetContainer(element: Element): Element | null {
    // 方法1: 通过标准的推文选择器
    const standardSelectors = [
      '[data-testid="tweet"]',
      'article[role="article"]',
      'article[data-testid="tweet"]'
    ];
    
    for (const selector of standardSelectors) {
      const container = element.closest(selector);
      if (container) {
        console.log(`Found tweet container via ${selector}`);
        return container;
      }
    }
    
    // 方法2: 通过包含用户信息的容器
    let current = element.parentElement;
    while (current) {
      // 检查是否包含用户名和推文内容的典型结构
      const hasUserName = current.querySelector('[data-testid="User-Name"], [data-testid="User-Names"]');
      const hasTweetText = current.querySelector('[data-testid="tweetText"]');
      const hasActionButtons = current.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
      
      if (hasUserName && (hasTweetText || hasActionButtons)) {
        console.log('Found tweet container via content structure');
        return current;
      }
      
      // 检查是否是article元素
      if (current.tagName === 'ARTICLE') {
        console.log('Found tweet container via article tag');
        return current;
      }
      
      current = current.parentElement;
    }
    
    // 方法3: 通过推文链接查找
    current = element.parentElement;
    while (current) {
      const tweetLink = current.querySelector('a[href*="/status/"]');
      if (tweetLink) {
        console.log('Found tweet container via status link');
        return current;
      }
      current = current.parentElement;
    }
    
    console.warn('Could not find tweet container for element:', element);
    return null;
  }

  private extractTweetId(container: Element): string | null {
    const link = container.querySelector('a[href*="/status/"]');
    if (!link) return null;
    
    const match = link.getAttribute('href')?.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  private async addDownloadButtonWithRetry(tweetContainer: Element, videoElement: Element, maxRetries: number = 3): Promise<boolean> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // 尝试多种方式找到操作栏
        const actionBar = this.findActionBarEnhanced(tweetContainer);
        if (!actionBar) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
            continue;
          }
          return false;
        }

        // 检查是否已经存在下载按钮
        if (actionBar.querySelector('.tweet-craft-video-download-btn')) {
          return true;
        }

        // 创建下载按钮
        const downloadBtn = this.createDownloadButton();
        
        // 插入到操作栏
        actionBar.appendChild(downloadBtn);

        // 绑定点击事件
        downloadBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleVideoDownload(videoElement, tweetContainer);
        });

        // 添加悬停效果
        downloadBtn.addEventListener('mouseenter', () => {
          downloadBtn.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        });
        
        downloadBtn.addEventListener('mouseleave', () => {
          downloadBtn.style.backgroundColor = 'transparent';
        });

        return true;

      } catch (error) {
        console.error(`Error adding download button (attempt ${attempt + 1}):`, error);
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }
    }
    
    return false;
  }

  private findActionBarEnhanced(tweetContainer: Element): HTMLElement | null {
    // 方法1: 直接查找包含所有互动按钮的role="group"
    const roleGroups = tweetContainer.querySelectorAll('[role="group"]');
    for (const group of roleGroups) {
      if (this.validateActionBar(group as HTMLElement)) {
        console.log('Found action bar via role="group"');
        return group as HTMLElement;
      }
    }

    // 方法2: 通过互动按钮查找父容器
    const interactionSelectors = [
      '[data-testid="reply"]',
      '[data-testid="retweet"]', 
      '[data-testid="like"]',
      '[data-testid="bookmark"]'
    ];

    for (const selector of interactionSelectors) {
      const button = tweetContainer.querySelector(selector);
      if (button) {
        // 向上查找包含多个互动按钮的容器
        let parent = button.parentElement;
        while (parent && parent !== tweetContainer) {
          if (this.validateActionBar(parent as HTMLElement)) {
            console.log(`Found action bar via ${selector} parent`);
            return parent as HTMLElement;
          }
          parent = parent.parentElement;
        }
      }
    }

    // 方法3: 通过aria-label查找（从HTML结构看，操作栏有特定的aria-label）
    const ariaLabelSelectors = [
      '[aria-label*="replies"][aria-label*="reposts"][aria-label*="likes"]',
      '[aria-label*="Replies"][aria-label*="reposts"][aria-label*="likes"]',
      '[aria-label*="bookmarks"][aria-label*="views"]'
    ];

    for (const selector of ariaLabelSelectors) {
      const element = tweetContainer.querySelector(selector);
      if (element && this.validateActionBar(element as HTMLElement)) {
        console.log(`Found action bar via aria-label: ${selector}`);
        return element as HTMLElement;
      }
    }

    // 方法4: 查找包含多个按钮的容器
    const allButtons = tweetContainer.querySelectorAll('button, [role="button"]');
    const buttonContainers = new Map<Element, number>();
    
    allButtons.forEach(button => {
      let parent = button.parentElement;
      while (parent && parent !== tweetContainer) {
        const count = buttonContainers.get(parent) || 0;
        buttonContainers.set(parent, count + 1);
        parent = parent.parentElement;
      }
    });

    // 找到包含最多按钮的容器
    let bestContainer: Element | null = null;
    let maxButtons = 0;
    
    buttonContainers.forEach((count, container) => {
      if (count >= 4 && count > maxButtons && this.validateActionBar(container as HTMLElement)) {
        bestContainer = container;
        maxButtons = count;
      }
    });

    if (bestContainer) {
      console.log('Found action bar via button count analysis');
      return bestContainer as HTMLElement;
    }

    console.warn('Could not find action bar for tweet');
    return null;
  }

  private validateActionBar(element: HTMLElement): boolean {
    if (!element) return false;
    
    // 检查是否包含标准的互动按钮
    const standardButtons = [
      '[data-testid="reply"]',
      '[data-testid="retweet"]', 
      '[data-testid="like"]',
      '[data-testid="bookmark"]'
    ];
    
    let foundButtons = 0;
    for (const selector of standardButtons) {
      if (element.querySelector(selector)) {
        foundButtons++;
      }
    }
    
    // 如果找到至少3个标准按钮，很可能是操作栏
    if (foundButtons >= 3) {
      console.log(`Validated action bar with ${foundButtons} standard buttons`);
      return true;
    }
    
    // 检查是否有role="group"且包含互动按钮
    if (element.getAttribute('role') === 'group') {
      const hasInteractionButton = element.querySelector(
        '[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], ' +
        '[aria-label*="Reply"], [aria-label*="Repost"], [aria-label*="Like"], ' +
        '[aria-label*="replies"], [aria-label*="reposts"], [aria-label*="likes"]'
      );
      
      if (hasInteractionButton) {
        console.log('Validated action bar via role="group" with interaction buttons');
        return true;
      }
    }
    
    // 检查aria-label是否包含互动信息
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const hasInteractionInfo = /\d+\s*(replies?|reposts?|likes?|bookmarks?|views?)/i.test(ariaLabel);
      if (hasInteractionInfo) {
        console.log('Validated action bar via aria-label with interaction info');
        return true;
      }
    }
    
    // 检查是否有足够的按钮类元素
    if (element.children.length >= 4) {
      let buttonLikeElements = 0;
      let svgElements = 0;
      
      for (const child of element.children) {
        const childElement = child as HTMLElement;
        
        // 检查是否是按钮
        if (childElement.tagName === 'BUTTON' || 
            childElement.getAttribute('role') === 'button' ||
            childElement.querySelector('button') ||
            childElement.querySelector('[role="button"]')) {
          buttonLikeElements++;
        }
        
        // 检查是否包含SVG图标
        if (childElement.querySelector('svg')) {
          svgElements++;
        }
      }
      
      // 如果有足够的按钮和图标，可能是操作栏
      if (buttonLikeElements >= 4 && svgElements >= 4) {
        console.log(`Validated action bar with ${buttonLikeElements} buttons and ${svgElements} icons`);
        return true;
      }
    }
    
    return false;
  }

  private createDownloadButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = 'tweet-craft-video-download-btn';
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', i18nManager.t('downloadVideo'));
    
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" style="display: block;">
        <path d="M12 16L7 11h3V3h4v8h3l-5 5z"/>
        <path d="M5 20v-2h14v2H5z"/>
      </svg>
    `;

    // 基本样式
    Object.assign(button.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      backgroundColor: 'transparent',
      position: 'relative'
    });

    return button;
  }

  private async handleVideoDownload(videoElement: Element, tweetContainer: Element) {
    try {
      console.log('🎬 Starting video download process...');
      
      const tweetData = this.extractTweetData(tweetContainer);
      
      // 获取推文URL
      const tweetUrl = tweetData.url || this.getCurrentTweetUrl();
      
      if (!tweetUrl) {
        this.showError('无法获取推文链接，请确保在推文页面上操作');
        return;
      }

      console.log('📝 Tweet URL:', tweetUrl);

      // 显示下载选项对话框
      this.showVideoDownloadDialog(tweetUrl, tweetData);

    } catch (error) {
      console.error('Video download failed:', error);
      this.showError(`下载失败：${error.message || '未知错误'}`);
    }
  }

  private getCurrentTweetUrl(): string | null {
    const currentUrl = window.location.href;
    
    // 检查当前URL是否是推文页面
    if (currentUrl.includes('/status/')) {
      return currentUrl;
    }
    
    return null;
  }

  private showVideoDownloadDialog(tweetUrl: string, tweetData: TweetData) {
    // 创建下载选项对话框
    const dialog = document.createElement('div');
    dialog.className = 'video-download-dialog';
    dialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1d1f23;
      color: #e7e9ea;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      max-width: 400px;
      text-align: center;
    `;

    dialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #1d9bf0;">视频下载选项</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.5; color: #71767b;">
        选择下载方式：
      </p>
      
      <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
        <button id="download-via-service" style="
          background: #1d9bf0;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">🌐 使用在线服务下载（推荐）</button>
        
        <button id="download-direct" style="
          background: #536471;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
        ">📥 直接下载（实验性）</button>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="dialog-close" style="
          background: transparent;
          color: #71767b;
          border: 1px solid #536471;
          padding: 8px 16px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
        ">取消</button>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 12px; color: #71767b;">
        在线服务更稳定可靠，支持多种视频质量选择
      </p>
    `;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 999998;
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(dialog);

    // 绑定事件
    const serviceButton = dialog.querySelector('#download-via-service');
    const directButton = dialog.querySelector('#download-direct');
    const closeButton = dialog.querySelector('#dialog-close');

    const closeDialog = () => {
      document.body.removeChild(overlay);
      document.body.removeChild(dialog);
    };

    if (serviceButton) {
      serviceButton.addEventListener('click', async () => {
        closeDialog();
        await this.downloadViaService(tweetUrl);
      });
    }

    if (directButton) {
      directButton.addEventListener('click', async () => {
        closeDialog();
        await this.downloadDirect(tweetUrl, tweetData);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', closeDialog);
    }

    overlay.addEventListener('click', closeDialog);
  }

  private async downloadViaService(tweetUrl: string) {
    try {
      this.showNotification('正在打开视频下载服务...', 'info');
      
      // 动态导入服务
      const { TwitterVideoService } = await import('../services/twitter-video-service');
      const videoService = new TwitterVideoService(this.getCurrentLanguage());
      
      const result = await videoService.downloadVideoViaService(tweetUrl);
      
      if (result.success) {
        this.showNotification('已在新标签页中打开视频下载服务', 'info');
      } else {
        this.showError(result.error || '打开下载服务失败');
      }
      
    } catch (error) {
      console.error('Service download failed:', error);
      this.showError('使用在线服务下载失败，请尝试直接下载');
    }
  }

  private async downloadDirect(tweetUrl: string, tweetData: TweetData) {
    try {
      this.showNotification('正在获取视频链接...', 'info');
      
      // 使用原有的直接下载逻辑
      const videoElement = document.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
      if (!videoElement) {
        this.showError('未找到视频元素');
        return;
      }

      const videoUrls = await this.extractVideoUrls(videoElement, tweetData);
      
      if (videoUrls.length === 0) {
        this.showError('无法获取视频链接，建议使用在线服务下载');
        return;
      }

      // 显示质量选择对话框
      const selectedVideo = await this.qualityDialog.show(videoUrls, tweetData);
      
      if (!selectedVideo) {
        return;
      }

      // 发送到background script
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_VIDEO',
        data: {
          urls: [selectedVideo],
          tweetData: tweetData
        }
      });

      this.showNotification('视频下载已开始', 'info');

    } catch (error) {
      console.error('Direct download failed:', error);
      this.showError('直接下载失败，建议使用在线服务下载');
    }
  }

  private getCurrentLanguage(): string {
    // 从i18n管理器获取当前语言
    try {
      return (window as any).i18nManager?.getCurrentLocale() || 'en';
    } catch {
      return 'en';
    }
  }

  private extractTweetData(container: Element): TweetData {
    const tweetLink = container.querySelector('a[href*="/status/"]');
    const usernameElement = container.querySelector('[data-testid="User-Names"] span');
    const username = usernameElement?.textContent?.trim() || 
                     container.querySelector('div[data-testid="User-Names"] span')?.textContent?.trim();
    const tweetId = this.extractTweetId(container);
    
    return {
      id: tweetId,
      username: username || 'unknown',
      url: tweetLink?.href || null,
      timestamp: Date.now()
    };
  }

  private async extractVideoUrls(videoElement: Element, tweetData: TweetData): Promise<VideoInfo[]> {
    const urls: VideoInfo[] = [];
    console.log('🔍 Extracting video URLs from element:', videoElement);

    // 方法1: 优先从网络请求获取真实的视频URL
    if (tweetData.id) {
      console.log('🌐 Trying to get URLs from network requests first');
      try {
        const networkUrls = await this.getVideoUrlsFromNetwork(tweetData.id);
        if (networkUrls.length > 0) {
          console.log('✅ Found video URLs from network:', networkUrls);
          urls.push(...networkUrls);
        }
      } catch (error) {
        console.error('Error getting video URLs from network:', error);
      }
    }

    // 方法2: 从video元素的src获取
    if (urls.length === 0 && videoElement.tagName === 'VIDEO') {
      const video = videoElement as HTMLVideoElement;
      const directSrc = video.src || video.currentSrc;
      
      if (directSrc && this.isValidVideoUrl(directSrc)) {
        console.log('📹 Found direct video src:', directSrc);
        try {
          const variants = await this.parseVideoVariants(directSrc);
          urls.push(...variants);
        } catch (error) {
          console.error('Error parsing video variants:', error);
          // 只有在URL确实是视频文件时才添加
          if (directSrc.includes('.mp4') || directSrc.includes('.webm')) {
            urls.push({
              quality: 'auto',
              url: directSrc,
              type: 'video/mp4'
            });
          }
        }
      }
    }

    // 方法3: 尝试触发视频加载以获取真实URL
    if (urls.length === 0) {
      console.log('🎬 Trying to trigger video loading to capture real URLs');
      const capturedUrls = await this.triggerVideoLoadAndCapture(videoElement);
      urls.push(...capturedUrls);
    }

    // 方法4: 作为最后手段，尝试从缩略图推断（但要验证）
    if (urls.length === 0) {
      console.log('🖼️ Trying to extract from thumbnail as last resort');
      const thumbnailUrls = this.extractThumbnailUrls(videoElement);
      for (const thumbnailUrl of thumbnailUrls) {
        console.log('🖼️ Found thumbnail URL:', thumbnailUrl);
        const videoId = this.extractVideoIdFromThumbnail(thumbnailUrl);
        if (videoId) {
          console.log('🆔 Extracted video ID:', videoId);
          // 提供一个特殊的URL，让后台处理
          urls.push({
            quality: 'auto',
            url: `twitter-video://${videoId}`, // 特殊协议，后台会处理
            type: 'video/mp4',
            videoId: videoId
          });
        }
      }
    }

    // 如果仍然没有找到，提供用户友好的错误处理
    if (urls.length === 0) {
      console.error('❌ Failed to extract any video URLs');
      console.error('❌ Video element:', videoElement);
      console.error('❌ Tweet data:', tweetData);
      
      // 提供一个备用方案：让用户手动触发
      this.showVideoExtractionHelp(videoElement, tweetData);
      throw new Error('无法自动获取视频链接。请尝试先播放视频，然后再点击下载按钮。');
    }

    console.log('📋 Final extracted URLs:', urls);
    return urls;
  }

  private isValidVideoUrl(url: string): boolean {
    // 检查URL是否是有效的视频URL
    if (!url) return false;
    
    // 允许特殊的twitter-video协议
    if (url.startsWith('twitter-video://')) {
      return true;
    }
    
    // 排除Twitter页面URL
    if (url.includes('twitter.com/') || url.includes('x.com/')) {
      return false;
    }
    
    // 检查是否是视频域名
    if (url.includes('video.twimg.com') || url.includes('twimg.com/ext_tw_video/')) {
      return true;
    }
    
    // 检查文件扩展名
    const videoExtensions = ['.mp4', '.webm', '.mov', '.m3u8'];
    return videoExtensions.some(ext => url.includes(ext));
  }

  private async triggerVideoLoadAndCapture(videoElement: Element): Promise<VideoInfo[]> {
    console.log('🎯 Attempting to trigger video load and capture URLs');
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.warn('⏰ Video load capture timeout');
        resolve([]);
      }, 3000);

      // 尝试触发视频播放以加载真实URL
      const playButton = videoElement.querySelector('[data-testid="playButton"]');
      if (playButton) {
        console.log('🎮 Found play button, attempting to trigger load');
        
        // 监听网络请求
        const originalFetch = window.fetch;
        const capturedUrls: VideoInfo[] = [];
        
        window.fetch = async function(...args) {
          const url = args[0] as string;
          if (url && (url.includes('video.twimg.com') || url.includes('.mp4') || url.includes('.m3u8'))) {
            console.log('🎬 Captured video URL via fetch:', url);
            capturedUrls.push({
              quality: 'auto',
              url: url,
              type: url.includes('.m3u8') ? 'application/x-mpegURL' : 'video/mp4'
            });
          }
          return originalFetch.apply(this, args);
        };
        
        // 模拟点击播放按钮（但不实际播放）
        const clickEvent = new MouseEvent('mouseenter', { bubbles: true });
        playButton.dispatchEvent(clickEvent);
        
        // 恢复原始fetch并返回结果
        setTimeout(() => {
          window.fetch = originalFetch;
          clearTimeout(timeout);
          resolve(capturedUrls);
        }, 1000);
      } else {
        clearTimeout(timeout);
        resolve([]);
      }
    });
  }

  private extractVideoIdFromThumbnail(thumbnailUrl: string): string | null {
    try {
      const match = thumbnailUrl.match(/ext_tw_video_thumb\/(\d+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error extracting video ID from thumbnail:', error);
      return null;
    }
  }

  private showVideoExtractionHelp(videoElement: Element, tweetData: TweetData): void {
    // 创建一个帮助提示
    const helpDialog = document.createElement('div');
    helpDialog.className = 'video-extraction-help';
    helpDialog.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #1d1f23;
      color: #e7e9ea;
      padding: 24px;
      border-radius: 16px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
      z-index: 999999;
      max-width: 400px;
      text-align: center;
    `;

    helpDialog.innerHTML = `
      <h3 style="margin: 0 0 16px 0; color: #1d9bf0;">需要您的帮助</h3>
      <p style="margin: 0 0 20px 0; line-height: 1.5;">
        无法自动获取视频链接。请按以下步骤操作：
      </p>
      <ol style="text-align: left; margin: 0 0 20px 0; padding-left: 20px;">
        <li>先点击播放按钮播放视频</li>
        <li>等待视频开始播放</li>
        <li>再次点击下载按钮</li>
      </ol>
      <div style="display: flex; gap: 12px; justify-content: center;">
        <button id="help-play-video" style="
          background: #1d9bf0;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
        ">播放视频</button>
        <button id="help-close" style="
          background: #536471;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 20px;
          cursor: pointer;
          font-weight: 600;
        ">关闭</button>
      </div>
    `;

    document.body.appendChild(helpDialog);

    // 绑定事件
    const playButton = helpDialog.querySelector('#help-play-video');
    const closeButton = helpDialog.querySelector('#help-close');

    if (playButton) {
      playButton.addEventListener('click', () => {
        // 尝试触发视频播放
        const videoPlayButton = videoElement.querySelector('[data-testid="playButton"]');
        if (videoPlayButton) {
          (videoPlayButton as HTMLElement).click();
        }
        document.body.removeChild(helpDialog);
      });
    }

    if (closeButton) {
      closeButton.addEventListener('click', () => {
        document.body.removeChild(helpDialog);
      });
    }

    // 5秒后自动关闭
    setTimeout(() => {
      if (helpDialog.parentNode) {
        document.body.removeChild(helpDialog);
      }
    }, 10000);
  }

  private extractThumbnailUrls(element: Element): string[] {
    const urls: string[] = [];
    
    // 从img元素获取
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      const src = img.src;
      if (src && src.includes('ext_tw_video_thumb')) {
        urls.push(src);
      }
    });
    
    // 从背景图片获取
    const elementsWithBg = element.querySelectorAll('*');
    elementsWithBg.forEach(el => {
      const style = (el as HTMLElement).style;
      if (style.backgroundImage) {
        const match = style.backgroundImage.match(/url\("?([^"]*ext_tw_video_thumb[^"]*)"?\)/);
        if (match) {
          urls.push(match[1]);
        }
      }
    });
    
    return urls;
  }

  private convertThumbnailToVideoUrl(thumbnailUrl: string): string | null {
    console.warn('⚠️ convertThumbnailToVideoUrl: Cannot reliably convert thumbnail to video URL');
    console.warn('⚠️ Thumbnail URL:', thumbnailUrl);
    console.warn('⚠️ This method needs access to Twitter\'s video manifest or API to get real video URLs');
    
    // 不要返回不完整的URL，这可能导致下载失败
    // 真实的视频URL需要通过以下方式获取：
    // 1. 拦截网络请求中的真实视频URL
    // 2. 解析Twitter的视频播放器配置
    // 3. 使用Twitter API
    
    return null;
  }

  private constructVideoUrlsFromTweetId(tweetId: string): VideoInfo[] {
    // 不要返回Twitter页面URL，这会导致下载HTML文件
    console.warn('⚠️ Cannot construct valid video URL from tweet ID alone:', tweetId);
    console.warn('⚠️ This method should not be used as it cannot provide real video URLs');
    
    // 返回空数组而不是无效的URL
    return [];
  }

  private async parseVideoVariants(videoUrl: string): Promise<VideoInfo[]> {
    try {
      if (videoUrl.includes('.m3u8')) {
        return await this.parseM3U8Playlist(videoUrl);
      } else if (videoUrl.includes('.mp4')) {
        const response = await fetch(videoUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        const size = contentLength ? parseInt(contentLength) : undefined;
        
        return [{
          quality: 'auto',
          url: videoUrl,
          size: size,
          type: 'video/mp4'
        }];
      }
    } catch (error) {
      console.error('Error parsing video variants:', error);
    }

    return [{
      quality: 'auto',
      url: videoUrl,
      type: 'video/mp4'
    }];
  }

  private async parseM3U8Playlist(m3u8Url: string): Promise<VideoInfo[]> {
    try {
      const response = await fetch(m3u8Url);
      const playlist = await response.text();
      
      const variants: VideoInfo[] = [];
      const lines = playlist.split('\n');
      
      let currentQuality: { bandwidth?: number; resolution?: string } | null = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
          const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
          
          currentQuality = {
            bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1]) : undefined,
            resolution: resolutionMatch ? resolutionMatch[1] : undefined
          };
        } else if (line && !line.startsWith('#') && currentQuality) {
          variants.push({
            quality: currentQuality.resolution || 'auto',
            url: new URL(line, m3u8Url).toString(),
            bandwidth: currentQuality.bandwidth,
            type: 'video/mp4'
          });
          currentQuality = null;
        }
      }
      
      return variants;
    } catch (error) {
      console.error('Error parsing M3U8 playlist:', error);
      return [];
    }
  }

  private async getVideoUrlsFromNetwork(tweetId: string): Promise<VideoInfo[]> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'GET_VIDEO_URLS',
        tweetId: tweetId
      }, (response) => {
        resolve(response || []);
      });
    });
  }

  private showError(message: string) {
    this.showNotification(message, 'error');
  }

  private showNotification(message: string, type: 'info' | 'error' = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `tweet-craft-notification tweet-craft-notification-${type}`;
    notification.textContent = message;
    
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      zIndex: '999999',
      backgroundColor: type === 'error' ? '#f87171' : '#60a5fa',
      color: 'white',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      transform: 'translateX(100%)',
      transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notification);

    // 动画显示
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    // 3秒后自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  private debounce(func: () => void, wait: number): (() => void) & { cancel: () => void } {
    let timeout: NodeJS.Timeout;
    
    const debounced = () => {
      clearTimeout(timeout);
      timeout = setTimeout(func, wait);
    };
    
    debounced.cancel = () => {
      clearTimeout(timeout);
    };
    
    return debounced;
  }

  /**
   * 强制检测所有视频并添加下载按钮（调试用）
   */
  public forceDetectAllVideos(): number {
    console.log('🔧 Force detecting all videos...');
    
    let addedCount = 0;
    const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
    
    tweets.forEach((tweet, index) => {
      // 检查是否包含视频
      const videoElements = tweet.querySelectorAll(
        '[data-testid="previewInterstitial"], [data-testid="playButton"], video, img[src*="ext_tw_video_thumb"]'
      );
      
      if (videoElements.length > 0) {
        console.log(`📹 Tweet ${index + 1} contains ${videoElements.length} video elements`);
        
        // 查找操作栏
        const roleGroups = tweet.querySelectorAll('[role="group"]');
        let actionBar: Element | null = null;
        let maxButtons = 0;
        
        roleGroups.forEach(group => {
          const buttons = group.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"]');
          if (buttons.length > maxButtons) {
            maxButtons = buttons.length;
            actionBar = group;
          }
        });
        
        if (actionBar && maxButtons >= 3) {
          // 检查是否已有下载按钮
          const existingBtn = actionBar.querySelector('.tweet-craft-video-download-btn');
          
          if (!existingBtn) {
            try {
              // 创建下载按钮
              const downloadBtn = this.createDownloadButton();
              
              // 创建包装容器
              const wrapper = document.createElement('div');
              wrapper.className = 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0';
              wrapper.appendChild(downloadBtn);
              
              // 添加点击事件
              downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.handleVideoDownload(videoElements[0], tweet);
              });
              
              // 插入到操作栏
              actionBar.appendChild(wrapper);
              
              addedCount++;
              console.log(`✅ Added download button to tweet ${index + 1}`);
            } catch (error) {
              console.error(`❌ Failed to add button to tweet ${index + 1}:`, error);
            }
          } else {
            console.log(`⏭️ Tweet ${index + 1} already has download button`);
          }
        } else {
          console.log(`❌ Tweet ${index + 1} has no valid action bar (found ${maxButtons} buttons)`);
        }
      }
    });
    
    console.log(`🎉 Force detection complete! Added ${addedCount} download buttons`);
    return addedCount;
  }

  /**
   * 获取检测统计信息
   */
  public getDetectionStats() {
    const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
    const videosFound = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    const downloadButtons = document.querySelectorAll('.tweet-craft-video-download-btn');
    
    return {
      totalTweets: tweets.length,
      videosFound: videosFound.length,
      downloadButtons: downloadButtons.length,
      processedTweets: this.processedTweets.size,
      videoElements: this.videoElements.size
    };
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.videoElements.clear();
    this.processedTweets.clear();
    this.debouncedDetect.cancel();
    this.progressManager.destroy();
  }
}

// 导出供其他模块使用
export default TwitterVideoDetector;