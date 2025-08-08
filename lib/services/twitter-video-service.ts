/**
 * Twitter视频服务 - 基于TwitDloader的方法
 * 使用外部API服务来处理视频下载，避免复杂的URL提取逻辑
 */

export interface VideoDownloadService {
  name: string;
  baseUrl: string;
  supportedLanguages: string[];
  isAvailable: () => Promise<boolean>;
}

export interface VideoDownloadResult {
  success: boolean;
  downloadUrl?: string;
  error?: string;
  qualities?: Array<{
    quality: string;
    url: string;
    size?: string;
  }>;
}

export class TwitterVideoService {
  private services: VideoDownloadService[] = [
    {
      name: 'TweetDown',
      baseUrl: 'https://tweetdown.pages.dev',
      supportedLanguages: ['en', 'zh-CN', 'ja', 'ko', 'es', 'fr', 'pt', 'ru', 'ar', 'fa'],
      isAvailable: async () => {
        try {
          const response = await fetch('https://tweetdown.pages.dev', { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'SaveTweet',
      baseUrl: 'https://savetweet.net',
      supportedLanguages: ['en'],
      isAvailable: async () => {
        try {
          const response = await fetch('https://savetweet.net', { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      }
    },
    {
      name: 'TwitterVideoDownloader',
      baseUrl: 'https://twittervideodownloader.com',
      supportedLanguages: ['en'],
      isAvailable: async () => {
        try {
          const response = await fetch('https://twittervideodownloader.com', { method: 'HEAD' });
          return response.ok;
        } catch {
          return false;
        }
      }
    }
  ];

  private currentLanguage: string = 'en';

  constructor(language: string = 'en') {
    this.currentLanguage = language;
  }

  /**
   * 获取可用的服务
   */
  async getAvailableService(): Promise<VideoDownloadService | null> {
    // 优先选择支持当前语言的服务
    const languageCompatibleServices = this.services.filter(service => 
      service.supportedLanguages.includes(this.currentLanguage)
    );

    // 测试服务可用性
    for (const service of languageCompatibleServices) {
      try {
        const isAvailable = await service.isAvailable();
        if (isAvailable) {
          console.log(`✅ Using video service: ${service.name}`);
          return service;
        }
      } catch (error) {
        console.warn(`❌ Service ${service.name} not available:`, error);
      }
    }

    // 如果没有语言兼容的服务，尝试其他服务
    for (const service of this.services) {
      if (!languageCompatibleServices.includes(service)) {
        try {
          const isAvailable = await service.isAvailable();
          if (isAvailable) {
            console.log(`✅ Using fallback video service: ${service.name}`);
            return service;
          }
        } catch (error) {
          console.warn(`❌ Fallback service ${service.name} not available:`, error);
        }
      }
    }

    return null;
  }

  /**
   * 使用外部服务下载视频
   */
  async downloadVideoViaService(tweetUrl: string): Promise<VideoDownloadResult> {
    const service = await this.getAvailableService();
    
    if (!service) {
      return {
        success: false,
        error: '所有视频下载服务都不可用，请稍后重试'
      };
    }

    try {
      // 构造服务URL
      const serviceUrl = this.buildServiceUrl(service, tweetUrl);
      
      console.log(`🌐 Opening video download service: ${serviceUrl}`);
      
      // 在新标签页中打开服务
      await this.openInNewTab(serviceUrl);
      
      return {
        success: true,
        downloadUrl: serviceUrl
      };
      
    } catch (error) {
      console.error('Failed to use video service:', error);
      return {
        success: false,
        error: `使用 ${service.name} 服务失败: ${error.message}`
      };
    }
  }

  /**
   * 构造服务URL
   */
  private buildServiceUrl(service: VideoDownloadService, tweetUrl: string): string {
    const encodedUrl = encodeURIComponent(tweetUrl);
    
    switch (service.name) {
      case 'TweetDown':
        // TweetDown支持语言参数
        const langCode = service.supportedLanguages.includes(this.currentLanguage) 
          ? this.currentLanguage 
          : 'en';
        return `${service.baseUrl}/${langCode}?tweet=${encodedUrl}`;
        
      case 'SaveTweet':
        return `${service.baseUrl}/download?url=${encodedUrl}`;
        
      case 'TwitterVideoDownloader':
        return `${service.baseUrl}/?url=${encodedUrl}`;
        
      default:
        return `${service.baseUrl}?url=${encodedUrl}`;
    }
  }

  /**
   * 在新标签页中打开URL
   */
  private async openInNewTab(url: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      // 在扩展环境中
      return new Promise((resolve, reject) => {
        chrome.tabs.create({ url }, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    } else {
      // 在普通网页环境中
      window.open(url, '_blank');
    }
  }

  /**
   * 直接下载视频（备用方法）
   */
  async downloadVideoDirect(tweetUrl: string): Promise<VideoDownloadResult> {
    try {
      // 尝试使用API获取视频信息
      const service = await this.getAvailableService();
      if (!service) {
        throw new Error('No available service');
      }

      // 这里可以实现直接API调用（如果服务提供API）
      // 目前大多数服务只提供网页界面，所以使用重定向方法
      
      return await this.downloadVideoViaService(tweetUrl);
      
    } catch (error) {
      console.error('Direct download failed:', error);
      return {
        success: false,
        error: `直接下载失败: ${error.message}`
      };
    }
  }

  /**
   * 获取视频信息（不下载）
   */
  async getVideoInfo(tweetUrl: string): Promise<VideoDownloadResult> {
    // 大多数外部服务不提供纯API，所以这里返回服务链接
    const service = await this.getAvailableService();
    
    if (!service) {
      return {
        success: false,
        error: '无法获取视频信息：服务不可用'
      };
    }

    return {
      success: true,
      downloadUrl: this.buildServiceUrl(service, tweetUrl),
      qualities: [
        {
          quality: '通过 ' + service.name + ' 服务下载',
          url: this.buildServiceUrl(service, tweetUrl)
        }
      ]
    };
  }

  /**
   * 设置语言
   */
  setLanguage(language: string): void {
    this.currentLanguage = language;
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLanguages(): string[] {
    const allLanguages = new Set<string>();
    this.services.forEach(service => {
      service.supportedLanguages.forEach(lang => allLanguages.add(lang));
    });
    return Array.from(allLanguages);
  }

  /**
   * 检查URL是否为有效的推文URL
   */
  isValidTweetUrl(url: string): boolean {
    const tweetUrlPattern = /https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/;
    return tweetUrlPattern.test(url);
  }

  /**
   * 从当前页面URL获取推文URL
   */
  getCurrentTweetUrl(): string | null {
    const currentUrl = window.location.href;
    
    if (this.isValidTweetUrl(currentUrl)) {
      return currentUrl;
    }
    
    // 尝试从页面中提取推文URL
    const tweetLinks = document.querySelectorAll('a[href*="/status/"]');
    for (const link of tweetLinks) {
      const href = (link as HTMLAnchorElement).href;
      if (this.isValidTweetUrl(href)) {
        return href;
      }
    }
    
    return null;
  }
}

export default TwitterVideoService;