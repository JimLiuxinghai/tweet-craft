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

interface DownloadInfo {
  downloadId: number;
  tweetData: TweetData;
  videoInfo: VideoInfo;
  startTime: number;
  filename: string;
}

export class VideoDownloadManager {
  private pendingDownloads: Map<number, DownloadInfo> = new Map();
  private networkRequests: Map<number, { url: string; timestamp: number }> = new Map();
  private downloadHistory: DownloadInfo[] = [];
  private maxHistorySize = 50;
  private progressUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init() {
    console.log('VideoDownloadManager initialized');
    
    // 监听消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 监听下载状态变化
    chrome.downloads.onChanged.addListener(this.handleDownloadChanged.bind(this));
    
    // 监听网络请求
    this.setupNetworkInterception();
    
    // 清理过期的网络请求记录
    setInterval(() => this.cleanupNetworkRequests(), 60000); // 每分钟清理一次
  }

  private setupNetworkInterception() {
    try {
      // 监听视频相关的网络请求
      chrome.webRequest.onBeforeRequest.addListener(
        this.interceptVideoRequests.bind(this),
        {
          urls: [
            "*://*.video.twimg.com/*",
            "*://*.twimg.com/ext_tw_video/*",
            "*://*.twimg.com/tweet_video/*",
            "*://*.twimg.com/amplify_video/*",
            "*://video.twimg.com/*"
          ]
        },
        ["requestBody"]
      );

      // 同时监听响应头，获取更多信息
      chrome.webRequest.onHeadersReceived.addListener(
        this.interceptVideoResponses.bind(this),
        {
          urls: [
            "*://*.video.twimg.com/*",
            "*://*.twimg.com/ext_tw_video/*",
            "*://*.twimg.com/tweet_video/*",
            "*://*.twimg.com/amplify_video/*",
            "*://video.twimg.com/*"
          ]
        },
        ["responseHeaders"]
      );

      console.log('✅ Network interception setup complete');
    } catch (error) {
      console.warn('Network request interception not available:', error);
    }
  }

  private interceptVideoRequests(details: chrome.webRequest.WebRequestBodyDetails) {
    const url = details.url;
    console.log('🌐 Intercepted video request:', url);
    
    // 记录所有视频相关的URL，不仅仅是.mp4
    if (this.isVideoUrl(url)) {
      console.log('✅ Valid video URL detected:', url);
      
      // 存储到对应的标签页
      if (!this.networkRequests.has(details.tabId)) {
        this.networkRequests.set(details.tabId, { url: url, timestamp: Date.now() });
      } else {
        // 如果已有URL，比较并保留更好的那个
        const existing = this.networkRequests.get(details.tabId);
        if (this.isHigherQualityUrl(url, existing!.url)) {
          this.networkRequests.set(details.tabId, { url: url, timestamp: Date.now() });
        }
      }
    }
  }

  private interceptVideoResponses(details: chrome.webRequest.WebResponseHeadersDetails) {
    const url = details.url;
    
    // 检查响应头中的内容类型
    const contentType = details.responseHeaders?.find(
      header => header.name.toLowerCase() === 'content-type'
    )?.value;
    
    if (contentType && contentType.includes('video/')) {
      console.log('🎬 Video response detected:', url, 'Type:', contentType);
      
      this.networkRequests.set(details.tabId, {
        url: url,
        timestamp: Date.now()
      });
    }
  }

  private isVideoUrl(url: string): boolean {
    // 检查URL是否是有效的视频URL
    const videoExtensions = ['.mp4', '.m3u8', '.ts', '.webm', '.mov'];
    const videoPatterns = [
      '/vid/',           // Twitter视频路径
      '/amplify_video/', // Twitter Amplify视频
      '/ext_tw_video/',  // Twitter外部视频
      '/tweet_video/'    // Twitter推文视频
    ];
    
    // 检查文件扩展名
    if (videoExtensions.some(ext => url.includes(ext))) {
      return true;
    }
    
    // 检查路径模式
    if (videoPatterns.some(pattern => url.includes(pattern))) {
      return true;
    }
    
    // 检查是否是video.twimg.com域名下的资源
    if (url.includes('video.twimg.com') && !url.includes('thumb')) {
      return true;
    }
    
    return false;
  }

  private isHigherQualityUrl(newUrl: string, existingUrl: string): boolean {
    // 简单的质量比较逻辑
    const getQualityScore = (url: string): number => {
      if (url.includes('1280x720') || url.includes('720p')) return 3;
      if (url.includes('640x480') || url.includes('480p')) return 2;
      if (url.includes('320x240') || url.includes('240p')) return 1;
      if (url.includes('.mp4')) return 2; // MP4通常比m3u8质量更稳定
      return 1;
    };
    
    return getQualityScore(newUrl) > getQualityScore(existingUrl);
  }

  private handleMessage(message: any, sender: chrome.runtime.MessageSender, sendResponse: (response: any) => void) {
    console.log('VideoDownloadManager received message:', message.type);

    switch (message.type) {
      case 'DOWNLOAD_VIDEO':
        this.processVideoDownload(message.data)
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 保持消息通道开放
        
      case 'GET_VIDEO_URLS':
        this.getVideoUrlsForTweet(message.tweetId, sender.tab?.id)
          .then(urls => sendResponse(urls))
          .catch(error => {
            console.error('Error getting video URLs:', error);
            sendResponse([]);
          });
        return true;
        
      case 'GET_DOWNLOAD_HISTORY':
        sendResponse(this.downloadHistory);
        return false;
        
      case 'CLEAR_DOWNLOAD_HISTORY':
        this.clearDownloadHistory();
        sendResponse({ success: true });
        return false;
    }

    return false;
  }

  private async processVideoDownload(data: { urls: VideoInfo[]; tweetData: TweetData }) {
    const { urls, tweetData } = data;
    
    if (!urls || urls.length === 0) {
      throw new Error('No video URLs provided');
    }

    // 选择最佳质量的视频
    const bestVideo = this.selectBestQuality(urls);
    
    // 检查是否是特殊的twitter-video协议
    if (bestVideo.url.startsWith('twitter-video://')) {
      console.log('🔧 Processing special twitter-video protocol:', bestVideo.url);
      const processedVideo = await this.resolveTwitterVideoUrl(bestVideo, tweetData);
      if (processedVideo) {
        await this.downloadVideo(processedVideo, tweetData);
      } else {
        throw new Error('无法解析视频链接，请尝试先播放视频再下载');
      }
    } else {
      try {
        await this.downloadVideo(bestVideo, tweetData);
      } catch (error) {
        console.error('Failed to download video:', error);
        throw error;
      }
    }
  }

  private async resolveTwitterVideoUrl(videoInfo: VideoInfo, tweetData: TweetData): Promise<VideoInfo | null> {
    const videoId = videoInfo.url.replace('twitter-video://', '');
    console.log('🔍 Resolving video ID:', videoId);

    // 方法1: 尝试从当前标签页的网络请求中获取
    const tabs = await chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
    for (const tab of tabs) {
      if (tab.id && this.networkRequests.has(tab.id)) {
        const networkUrl = this.networkRequests.get(tab.id)!.url;
        if (networkUrl.includes(videoId)) {
          console.log('✅ Found matching network URL:', networkUrl);
          return {
            ...videoInfo,
            url: networkUrl
          };
        }
      }
    }

    // 方法2: 构造可能的视频URL并验证
    const possibleUrls = [
      `https://video.twimg.com/ext_tw_video/${videoId}/pu/vid/avc1/1280x720/`,
      `https://video.twimg.com/ext_tw_video/${videoId}/pu/vid/avc1/720x720/`,
      `https://video.twimg.com/ext_tw_video/${videoId}/pu/vid/avc1/480x480/`,
      `https://video.twimg.com/ext_tw_video/${videoId}/pu/pl/playlist.m3u8`
    ];

    for (const url of possibleUrls) {
      try {
        // 尝试HEAD请求验证URL是否有效
        const response = await fetch(url, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ Found valid video URL:', url);
          return {
            ...videoInfo,
            url: url
          };
        }
      } catch (error) {
        console.log('❌ URL not accessible:', url);
      }
    }

    // 方法3: 返回一个提示用户的特殊URL
    console.warn('⚠️ Could not resolve video URL automatically');
    return null;
  }

  private selectBestQuality(videos: VideoInfo[]): VideoInfo {
    // 按带宽和分辨率排序，选择最高质量
    const sorted = videos.sort((a, b) => {
      // 优先按带宽排序
      if (a.bandwidth && b.bandwidth) {
        return b.bandwidth - a.bandwidth;
      }
      
      // 按分辨率排序
      if (a.resolution && b.resolution) {
        const aPixels = parseInt(a.resolution.split('x')[0]) * parseInt(a.resolution.split('x')[1]);
        const bPixels = parseInt(b.resolution.split('x')[0]) * parseInt(b.resolution.split('x')[1]);
        return bPixels - aPixels;
      }
      
      return 0;
    });

    return sorted[0];
  }

  private async downloadVideo(videoInfo: VideoInfo, tweetData: TweetData) {
    const filename = this.generateFilename(tweetData, videoInfo);
    
    try {
      // 使用Chrome Downloads API
      const downloadId = await chrome.downloads.download({
        url: videoInfo.url,
        filename: filename,
        saveAs: false,
        conflictAction: 'uniquify'
      });

      if (!downloadId) {
        throw new Error('Failed to start download');
      }

      const downloadInfo: DownloadInfo = {
        downloadId,
        tweetData,
        videoInfo,
        startTime: Date.now(),
        filename
      };

      // 存储下载信息
      this.pendingDownloads.set(downloadId, downloadInfo);
      
      // 添加到历史记录
      this.addToHistory(downloadInfo);
      
      // 通知内容脚本开始下载
      this.notifyDownloadStarted(downloadId, filename);
      
      console.log('Download started:', downloadId, filename);
      
    } catch (error) {
      console.error('Download failed:', error);
      this.showErrorNotification('视频下载失败: ' + error.message);
      throw error;
    }
  }

  private generateFilename(tweetData: TweetData, videoInfo: VideoInfo): string {
    const date = new Date().toISOString().slice(0, 10);
    const username = (tweetData.username || 'unknown').replace(/[^a-zA-Z0-9]/g, '_');
    const tweetId = tweetData.id || 'unknown';
    const quality = videoInfo.quality || 'auto';
    const timestamp = Date.now();
    
    // 创建文件夹结构
    return `twitter-videos/${username}_${tweetId}_${quality}_${date}_${timestamp}.mp4`;
  }

  private handleDownloadChanged(delta: chrome.downloads.DownloadDelta) {
    const downloadId = delta.id;
    const downloadInfo = this.pendingDownloads.get(downloadId);
    
    if (!downloadInfo) return;

    // 更新进度
    if (delta.bytesReceived !== undefined && delta.totalBytes !== undefined) {
      this.updateDownloadProgress(downloadId, downloadInfo, delta.bytesReceived.current, delta.totalBytes.current);
    }

    if (delta.state?.current === 'complete') {
      this.onDownloadComplete(downloadId, downloadInfo);
    } else if (delta.state?.current === 'interrupted') {
      this.onDownloadError(downloadId, downloadInfo, delta.error?.current);
    }
  }

  private updateDownloadProgress(downloadId: number, downloadInfo: DownloadInfo, bytesReceived: number, totalBytes: number) {
    if (totalBytes <= 0) return;

    const progress = (bytesReceived / totalBytes) * 100;
    const currentTime = Date.now();
    const elapsedTime = (currentTime - downloadInfo.startTime) / 1000; // 秒
    
    let speed = 0;
    let remainingTime = 0;
    
    if (elapsedTime > 0) {
      speed = bytesReceived / elapsedTime; // bytes per second
      if (speed > 0) {
        remainingTime = (totalBytes - bytesReceived) / speed; // 秒
      }
    }

    // 通知内容脚本更新进度
    this.notifyProgressUpdate(downloadId, {
      progress,
      speed,
      remainingTime,
      bytesReceived,
      totalBytes
    });
  }

  private notifyProgressUpdate(downloadId: number, progressData: {
    progress: number;
    speed: number;
    remainingTime: number;
    bytesReceived: number;
    totalBytes: number;
  }) {
    // 向所有Twitter标签页发送进度更新
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'DOWNLOAD_PROGRESS_UPDATE',
            downloadId,
            progressData
          }).catch(() => {
            // 忽略错误，可能页面未加载内容脚本
          });
        }
      });
    });
  }

  private onDownloadComplete(downloadId: number, downloadInfo: DownloadInfo) {
    console.log('Download completed:', downloadInfo.filename);
    
    // 从待处理列表中移除
    this.pendingDownloads.delete(downloadId);
    
    // 更新历史记录状态
    const historyItem = this.downloadHistory.find(item => item.downloadId === downloadId);
    if (historyItem) {
      // 这里可以添加完成时间等额外信息
    }
    
    // 通知内容脚本下载完成
    this.notifyDownloadComplete(downloadId);
    
    // 显示成功通知
    this.showSuccessNotification(
      `视频下载完成: ${downloadInfo.tweetData.username ? '@' + downloadInfo.tweetData.username : '用户'}`
    );
  }

  private notifyDownloadComplete(downloadId: number) {
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'DOWNLOAD_COMPLETED',
            downloadId
          }).catch(() => {
            // 忽略错误
          });
        }
      });
    });
  }

  private onDownloadError(downloadId: number, downloadInfo: DownloadInfo, error?: string) {
    console.error('Download failed:', downloadInfo.filename, error);
    
    // 从待处理列表中移除
    this.pendingDownloads.delete(downloadId);
    
    // 更新历史记录状态
    const historyItem = this.downloadHistory.find(item => item.downloadId === downloadId);
    if (historyItem) {
      // 这里可以添加错误信息
    }
    
    // 通知内容脚本下载错误
    this.notifyDownloadError(downloadId, error);
    
    // 显示错误通知
    this.showErrorNotification('视频下载失败' + (error ? ': ' + error : ''));
  }

  private notifyDownloadError(downloadId: number, error?: string) {
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'DOWNLOAD_ERROR',
            downloadId,
            error
          }).catch(() => {
            // 忽略错误
          });
        }
      });
    });
  }

  private async getVideoUrlsForTweet(tweetId: string, tabId?: number): Promise<VideoInfo[]> {
    if (!tabId) return [];
    
    // 从拦截的网络请求中获取视频URL
    const networkData = this.networkRequests.get(tabId);
    
    if (networkData) {
      try {
        return await this.parseTwitterVideoUrl(networkData.url);
      } catch (error) {
        console.error('Error parsing video URL:', error);
      }
    }

    return [];
  }

  private async parseTwitterVideoUrl(url: string): Promise<VideoInfo[]> {
    try {
      if (url.includes('.m3u8')) {
        return await this.parseM3U8Playlist(url);
      } else if (url.includes('.mp4')) {
        return [{
          quality: 'auto',
          url: url,
          type: 'video/mp4'
        }];
      }
    } catch (error) {
      console.error('Error parsing video URL:', error);
    }
    
    return [];
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
            url: new URL(line, m3u8Url).href,
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

  private addToHistory(downloadInfo: DownloadInfo) {
    this.downloadHistory.unshift(downloadInfo);
    
    // 限制历史记录大小
    if (this.downloadHistory.length > this.maxHistorySize) {
      this.downloadHistory = this.downloadHistory.slice(0, this.maxHistorySize);
    }
    
    // 保存到存储
    this.saveHistoryToStorage();
  }

  private clearDownloadHistory() {
    this.downloadHistory = [];
    this.saveHistoryToStorage();
  }

  private async saveHistoryToStorage() {
    try {
      await chrome.storage.local.set({
        'videoDownloadHistory': this.downloadHistory
      });
    } catch (error) {
      console.error('Error saving download history:', error);
    }
  }

  private async loadHistoryFromStorage() {
    try {
      const result = await chrome.storage.local.get('videoDownloadHistory');
      this.downloadHistory = result.videoDownloadHistory || [];
    } catch (error) {
      console.error('Error loading download history:', error);
    }
  }

  private cleanupNetworkRequests() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5分钟
    
    for (const [tabId, request] of this.networkRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        this.networkRequests.delete(tabId);
      }
    }
  }

  private showSuccessNotification(message: string) {
    this.showNotification('Twitter视频下载完成', message, 'success');
  }

  private showErrorNotification(message: string) {
    this.showNotification('下载错误', message, 'error');
  }

  private showNotification(title: string, message: string, type: 'success' | 'error' = 'success') {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icon/icon.png',
        title: title,
        message: message
      });
    } catch (error) {
      console.warn('Failed to show notification:', error);
    }
  }

  // 公共方法
  public getDownloadHistory(): DownloadInfo[] {
    return [...this.downloadHistory];
  }

  public getPendingDownloads(): DownloadInfo[] {
    return Array.from(this.pendingDownloads.values());
  }

  private notifyDownloadStarted(downloadId: number, filename: string) {
    chrome.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] }, (tabs) => {
      tabs.forEach(tab => {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, {
            type: 'DOWNLOAD_STARTED',
            downloadId,
            filename
          }).catch(() => {
            // 忽略错误
          });
        }
      });
    });
  }

  public clearAllDownloads() {
    this.pendingDownloads.clear();
    this.clearDownloadHistory();
  }
}

// 导出供其他模块使用
export default VideoDownloadManager;