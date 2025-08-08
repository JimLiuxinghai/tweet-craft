/**
 * 简化的视频下载器 - 基于TwitDloader的方法
 * 专注于简单可靠的视频下载功能
 */

import { i18nManager } from '../i18n';
import { TwitterVideoService } from '../services/twitter-video-service';

export class SimpleVideoDownloader {
  private videoService: TwitterVideoService;
  private processedTweets: Set<string> = new Set();
  private observer: MutationObserver | null = null;

  constructor() {
    this.videoService = new TwitterVideoService(this.getCurrentLanguage());
    this.init();
  }

  private init() {
    console.log('🎬 SimpleVideoDownloader initialized');
    
    // 监听DOM变化
    this.observer = new MutationObserver(this.handleDOMChanges.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 初始检测
    this.detectAndAddButtons();
    
    // 监听URL变化
    this.setupURLChangeListener();
    
    // 定期检查
    setInterval(() => {
      this.detectAndAddButtons();
    }, 2000);
  }

  private handleDOMChanges(mutations: MutationRecord[]) {
    let shouldCheck = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            const element = node as Element;
            // 检查是否是推文或视频相关元素
            if (this.isRelevantElement(element)) {
              shouldCheck = true;
            }
          }
        });
      }
    });

    if (shouldCheck) {
      // 延迟检测，避免频繁操作
      setTimeout(() => this.detectAndAddButtons(), 500);
    }
  }

  private isRelevantElement(element: Element): boolean {
    return element.matches('[data-testid="tweet"], article[role="article"]') ||
           element.querySelector('[data-testid="tweet"], article[role="article"]') !== null ||
           element.matches('[data-testid="previewInterstitial"], [data-testid="playButton"]') ||
           element.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"]') !== null;
  }

  private setupURLChangeListener() {
    let lastUrl = location.href;
    
    const checkUrlChange = () => {
      const currentUrl = location.href;
      if (currentUrl !== lastUrl) {
        lastUrl = currentUrl;
        console.log('🔄 URL changed, detecting videos');
        setTimeout(() => this.detectAndAddButtons(), 1000);
      }
    };
    
    setInterval(checkUrlChange, 1000);
  }

  private detectAndAddButtons() {
    try {
      // 查找所有包含视频的推文
      const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
      
      tweets.forEach(tweet => {
        this.processVideoTweet(tweet as HTMLElement);
      });
      
    } catch (error) {
      console.error('Error detecting videos:', error);
    }
  }

  private processVideoTweet(tweet: HTMLElement) {
    try {
      // 检查是否包含视频
      const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
      
      if (!hasVideo) {
        return;
      }

      // 获取推文ID以避免重复处理
      const tweetId = this.extractTweetId(tweet);
      if (!tweetId || this.processedTweets.has(tweetId)) {
        return;
      }

      // 查找操作栏
      const actionBar = tweet.querySelector('[role="group"]');
      if (!actionBar) {
        return;
      }

      // 检查是否已有下载按钮
      if (actionBar.querySelector('.simple-video-download-btn')) {
        this.processedTweets.add(tweetId);
        return;
      }

      // 创建并添加下载按钮
      const downloadButton = this.createDownloadButton(tweet);
      if (downloadButton) {
        actionBar.appendChild(downloadButton);
        this.processedTweets.add(tweetId);
        console.log('✅ Added video download button to tweet:', tweetId);
      }

    } catch (error) {
      console.error('Error processing video tweet:', error);
    }
  }

  private extractTweetId(tweet: HTMLElement): string | null {
    try {
      const tweetLink = tweet.querySelector('a[href*="/status/"]');
      if (tweetLink) {
        const match = tweetLink.getAttribute('href')?.match(/\/status\/(\d+)/);
        return match ? match[1] : null;
      }
      return null;
    } catch {
      return null;
    }
  }

  private createDownloadButton(tweet: HTMLElement): HTMLElement | null {
    try {
      const button = document.createElement('div');
      button.className = 'simple-video-download-btn';
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-label', '下载视频');
      button.setAttribute('title', '下载视频');
      
      // 使用简单的下载图标
      button.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34.75px;
          height: 34.75px;
          border-radius: 50%;
          transition: background-color 0.2s ease;
          cursor: pointer;
        ">
          <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="currentColor" style="color: rgb(113, 118, 123);">
            <path d="M12 16L7 11h3V3h4v8h3l-5 5z"/>
            <path d="M5 20v-2h14v2H5z"/>
          </svg>
        </div>
      `;

      // 添加悬停效果
      const iconContainer = button.firstElementChild as HTMLElement;
      
      button.addEventListener('mouseenter', () => {
        iconContainer.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
        const svg = iconContainer.querySelector('svg') as SVGElement;
        if (svg) svg.style.color = 'rgb(29, 155, 240)';
      });
      
      button.addEventListener('mouseleave', () => {
        iconContainer.style.backgroundColor = 'transparent';
        const svg = iconContainer.querySelector('svg') as SVGElement;
        if (svg) svg.style.color = 'rgb(113, 118, 123)';
      });

      // 添加点击事件
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleDownloadClick(tweet);
      });

      return button;

    } catch (error) {
      console.error('Error creating download button:', error);
      return null;
    }
  }

  private async handleDownloadClick(tweet: HTMLElement) {
    try {
      console.log('🎬 Download button clicked');
      
      // 获取推文URL
      const tweetUrl = this.getTweetUrl(tweet);
      
      if (!tweetUrl) {
        this.showNotification('无法获取推文链接', 'error');
        return;
      }

      if (!this.videoService.isValidTweetUrl(tweetUrl)) {
        this.showNotification('无效的推文链接', 'error');
        return;
      }

      console.log('📝 Tweet URL:', tweetUrl);

      // 直接使用在线服务下载（最可靠的方法）
      this.showNotification('正在打开视频下载服务...', 'info');
      
      const result = await this.videoService.downloadVideoViaService(tweetUrl);
      
      if (result.success) {
        this.showNotification('已在新标签页中打开视频下载服务', 'success');
      } else {
        this.showNotification(result.error || '打开下载服务失败', 'error');
      }

    } catch (error) {
      console.error('Download failed:', error);
      this.showNotification('下载失败，请重试', 'error');
    }
  }

  private getTweetUrl(tweet: HTMLElement): string | null {
    try {
      // 方法1: 从推文链接获取
      const tweetLink = tweet.querySelector('a[href*="/status/"]') as HTMLAnchorElement;
      if (tweetLink && tweetLink.href) {
        return tweetLink.href;
      }

      // 方法2: 从当前页面URL获取（如果在推文详情页）
      const currentUrl = window.location.href;
      if (currentUrl.includes('/status/')) {
        return currentUrl;
      }

      return null;
    } catch {
      return null;
    }
  }

  private showNotification(message: string, type: 'info' | 'success' | 'error' = 'info') {
    // 创建简单的通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    // 设置颜色
    switch (type) {
      case 'success':
        notification.style.backgroundColor = '#00ba7c';
        break;
      case 'error':
        notification.style.backgroundColor = '#f91880';
        break;
      default:
        notification.style.backgroundColor = '#1d9bf0';
    }

    notification.textContent = message;
    document.body.appendChild(notification);

    // 显示动画
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // 自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, type === 'error' ? 5000 : 3000);
  }

  private getCurrentLanguage(): string {
    try {
      return i18nManager?.getCurrentLocale() || 'en';
    } catch {
      return 'en';
    }
  }

  public destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    
    this.processedTweets.clear();
    
    // 移除所有下载按钮
    document.querySelectorAll('.simple-video-download-btn').forEach(btn => {
      btn.remove();
    });
  }

  // 公共方法：强制检测所有视频
  public forceDetectAll(): number {
    console.log('🔧 Force detecting all videos...');
    this.processedTweets.clear();
    this.detectAndAddButtons();
    
    const buttons = document.querySelectorAll('.simple-video-download-btn');
    console.log(`✅ Added ${buttons.length} video download buttons`);
    return buttons.length;
  }

  // 公共方法：获取统计信息
  public getStats() {
    const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
    const videosFound = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    const downloadButtons = document.querySelectorAll('.simple-video-download-btn');
    
    return {
      totalTweets: tweets.length,
      videosFound: videosFound.length,
      downloadButtons: downloadButtons.length,
      processedTweets: this.processedTweets.size
    };
  }
}

export default SimpleVideoDownloader;