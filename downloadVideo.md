# Twitter视频下载功能技术方案

## 1. 功能概述

为tweet-craft Chrome插件新增Twitter/X视频下载功能，支持：
- 一键下载Twitter视频（MP4格式）
- 支持GIF动图下载
- 多种视频质量选择
- 批量下载支持
- 下载进度显示

## 2. 技术架构

### 2.1 核心技术栈
- **Manifest V3** - Chrome Extension API
- **Content Script** - DOM操作和视频检测
- **Background Script** - 下载管理和API调用
- **Popup UI** - 用户交互界面
- **Chrome Downloads API** - 文件下载管理

### 2.2 架构设计
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Content Script │    │  Background      │    │   Popup UI      │
│                 │    │  Service Worker  │    │                 │
│ • 视频检测      │◄──►│                  │◄──►│ • 下载按钮     │
│ • DOM注入       │    │ • 视频解析       │    │ • 质量选择     │
│ • 用户交互      │    │ • 下载管理       │    │ • 进度显示     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Chrome APIs                              │
│  • chrome.downloads  • chrome.storage  • chrome.tabs       │
└─────────────────────────────────────────────────────────────┘
```

## 3. 实现方案

### 3.1 Manifest V3 配置

```json
{
  "manifest_version": 3,
  "permissions": [
    "downloads",
    "storage",
    "activeTab",
    "scripting"
  ],
  "host_permissions": [
    "https://*.x.com/*",
    "https://*.twitter.com/*",
    "https://*.twimg.com/*",
    "https://*.video.twimg.com/*"
  ],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["https://*.x.com/*", "https://*.twitter.com/*"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ]
}
```

### 3.2 视频检测和解析

#### Content Script (content.js)
```javascript
class TwitterVideoDetector {
  constructor() {
    this.videoElements = new Set();
    this.observer = null;
    this.init();
  }

  init() {
    // 监听DOM变化
    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // 初始检测
    this.detectVideos();
  }

  handleMutation(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            this.detectVideosInNode(node);
          }
        });
      }
    });
  }

  detectVideos() {
    // 检测视频元素
    const videoSelectors = [
      'video',
      '[data-testid="videoComponent"]',
      '[data-testid="tweetPhoto"] video',
      '.css-1dbjc4n video'
    ];

    videoSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(video => {
        this.processVideoElement(video);
      });
    });
  }

  processVideoElement(videoElement) {
    if (this.videoElements.has(videoElement)) return;
    
    this.videoElements.add(videoElement);
    this.addDownloadButton(videoElement);
  }

  addDownloadButton(videoElement) {
    const tweetContainer = videoElement.closest('[data-testid="tweet"]');
    if (!tweetContainer) return;

    // 创建下载按钮
    const downloadBtn = this.createDownloadButton();
    
    // 找到推文操作栏
    const actionBar = tweetContainer.querySelector('[role="group"]');
    if (actionBar) {
      actionBar.appendChild(downloadBtn);
    }

    // 绑定点击事件
    downloadBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleVideoDownload(videoElement, tweetContainer);
    });
  }

  createDownloadButton() {
    const button = document.createElement('div');
    button.className = 'tweet-craft-download-btn';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path d="M12 16L7 11h3V3h4v8h3l-5 5z"/>
        <path d="M5 20v-2h14v2H5z"/>
      </svg>
    `;
    return button;
  }

  async handleVideoDownload(videoElement, tweetContainer) {
    try {
      // 提取推文信息
      const tweetData = this.extractTweetData(tweetContainer);
      
      // 获取视频URL
      const videoUrls = await this.extractVideoUrls(videoElement, tweetData);
      
      // 发送到background script
      chrome.runtime.sendMessage({
        action: 'downloadVideo',
        data: {
          urls: videoUrls,
          tweetData: tweetData
        }
      });
    } catch (error) {
      console.error('视频下载失败:', error);
    }
  }

  extractTweetData(container) {
    const tweetLink = container.querySelector('a[href*="/status/"]');
    const username = container.querySelector('[data-testid="User-Names"] span')?.textContent;
    const tweetId = tweetLink?.href.match(/\/status\/(\d+)/)?.[1];
    
    return {
      id: tweetId,
      username: username,
      url: tweetLink?.href,
      timestamp: Date.now()
    };
  }

  async extractVideoUrls(videoElement, tweetData) {
    // 方法1: 从video元素的src获取
    const directSrc = videoElement.src || videoElement.currentSrc;
    if (directSrc && directSrc.includes('video.twimg.com')) {
      return await this.parseVideoVariants(directSrc);
    }

    // 方法2: 从网络请求中截取
    return await this.interceptNetworkRequests(tweetData.id);
  }

  async parseVideoVariants(videoUrl) {
    // Twitter视频通常有多个质量版本
    // 需要解析m3u8播放列表或直接获取mp4链接
    try {
      const response = await fetch(videoUrl);
      const videoData = await response.blob();
      
      return [{
        quality: 'auto',
        url: videoUrl,
        size: videoData.size,
        type: 'video/mp4'
      }];
    } catch (error) {
      console.error('解析视频变体失败:', error);
      return [];
    }
  }

  async interceptNetworkRequests(tweetId) {
    // 通过background script拦截网络请求获取视频URL
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        action: 'getVideoUrls',
        tweetId: tweetId
      }, resolve);
    });
  }
}

// 初始化
new TwitterVideoDetector();
```

### 3.3 后台服务处理

#### Background Script (background.js)
```javascript
class VideoDownloadManager {
  constructor() {
    this.pendingDownloads = new Map();
    this.networkRequests = new Map();
    this.init();
  }

  init() {
    // 监听消息
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    
    // 监听网络请求
    this.setupNetworkInterception();
  }

  setupNetworkInterception() {
    // 拦截视频相关的网络请求
    chrome.webRequest.onBeforeRequest.addListener(
      this.interceptVideoRequests.bind(this),
      {
        urls: [
          "*://*.video.twimg.com/*",
          "*://*.twimg.com/ext_tw_video/*",
          "*://*.twimg.com/tweet_video/*"
        ]
      },
      ["requestBody"]
    );
  }

  interceptVideoRequests(details) {
    // 存储视频URL信息
    const url = details.url;
    if (url.includes('.mp4') || url.includes('.m3u8')) {
      this.networkRequests.set(details.tabId, {
        url: url,
        timestamp: Date.now()
      });
    }
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'downloadVideo':
        await this.processVideoDownload(message.data);
        break;
      
      case 'getVideoUrls':
        const urls = await this.getVideoUrlsForTweet(message.tweetId, sender.tab.id);
        sendResponse(urls);
        break;
    }
  }

  async processVideoDownload(data) {
    const { urls, tweetData } = data;
    
    for (const videoUrl of urls) {
      await this.downloadVideo(videoUrl, tweetData);
    }
  }

  async downloadVideo(videoInfo, tweetData) {
    const filename = this.generateFilename(tweetData, videoInfo);
    
    try {
      // 使用Chrome Downloads API
      const downloadId = await chrome.downloads.download({
        url: videoInfo.url,
        filename: filename,
        saveAs: false
      });

      // 存储下载信息
      this.pendingDownloads.set(downloadId, {
        tweetData: tweetData,
        videoInfo: videoInfo,
        startTime: Date.now()
      });

      // 监听下载状态
      this.monitorDownload(downloadId);
      
    } catch (error) {
      console.error('下载失败:', error);
      this.showError('下载失败: ' + error.message);
    }
  }

  generateFilename(tweetData, videoInfo) {
    const date = new Date().toISOString().slice(0, 10);
    const username = tweetData.username || 'unknown';
    const quality = videoInfo.quality || 'auto';
    
    return `twitter-videos/${username}_${tweetData.id}_${quality}_${date}.mp4`;
  }

  monitorDownload(downloadId) {
    chrome.downloads.onChanged.addListener((delta) => {
      if (delta.id === downloadId) {
        const downloadInfo = this.pendingDownloads.get(downloadId);
        
        if (delta.state?.current === 'complete') {
          this.onDownloadComplete(downloadId, downloadInfo);
        } else if (delta.state?.current === 'interrupted') {
          this.onDownloadError(downloadId, downloadInfo);
        }
      }
    });
  }

  onDownloadComplete(downloadId, downloadInfo) {
    console.log('下载完成:', downloadInfo.tweetData.id);
    this.pendingDownloads.delete(downloadId);
    
    // 显示成功通知
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Twitter视频下载完成',
      message: `已下载来自 @${downloadInfo.tweetData.username} 的视频`
    });
  }

  onDownloadError(downloadId, downloadInfo) {
    console.error('下载失败:', downloadInfo.tweetData.id);
    this.pendingDownloads.delete(downloadId);
    
    this.showError('视频下载失败');
  }

  showError(message) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '下载错误',
      message: message
    });
  }

  async getVideoUrlsForTweet(tweetId, tabId) {
    // 从拦截的网络请求中获取视频URL
    const networkData = this.networkRequests.get(tabId);
    
    if (networkData) {
      return await this.parseTwitterVideoUrl(networkData.url);
    }

    return [];
  }

  async parseTwitterVideoUrl(url) {
    try {
      // 解析Twitter视频URL，获取不同质量版本
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
      console.error('解析视频URL失败:', error);
    }
    
    return [];
  }

  async parseM3U8Playlist(m3u8Url) {
    try {
      const response = await fetch(m3u8Url);
      const playlist = await response.text();
      
      // 解析M3U8播放列表，提取不同质量的视频
      const variants = [];
      const lines = playlist.split('\n');
      
      let currentQuality = null;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('#EXT-X-STREAM-INF:')) {
          const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
          const resolutionMatch = line.match(/RESOLUTION=(\d+x\d+)/);
          
          currentQuality = {
            bandwidth: bandwidthMatch ? parseInt(bandwidthMatch[1]) : 0,
            resolution: resolutionMatch ? resolutionMatch[1] : 'unknown'
          };
        } else if (line && !line.startsWith('#') && currentQuality) {
          variants.push({
            quality: currentQuality.resolution,
            url: new URL(line, m3u8Url).href,
            bandwidth: currentQuality.bandwidth,
            type: 'video/mp4'
          });
          currentQuality = null;
        }
      }
      
      return variants;
    } catch (error) {
      console.error('解析M3U8失败:', error);
      return [];
    }
  }
}

// 初始化下载管理器
new VideoDownloadManager();
```

### 3.4 用户界面

#### Popup HTML (popup.html)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { width: 300px; padding: 20px; }
    .download-section { margin-bottom: 20px; }
    .quality-selector { margin: 10px 0; }
    .download-btn { 
      background: #1d9bf0; 
      color: white; 
      border: none; 
      padding: 10px 20px; 
      border-radius: 6px;
      cursor: pointer;
    }
    .download-history { 
      max-height: 200px; 
      overflow-y: auto; 
    }
  </style>
</head>
<body>
  <div class="download-section">
    <h3>Twitter视频下载</h3>
    <div id="current-video">
      <p>在Twitter页面发现视频时，点击下载按钮即可保存</p>
    </div>
  </div>
  
  <div class="download-section">
    <h3>下载设置</h3>
    <div class="quality-selector">
      <label>
        <input type="radio" name="quality" value="highest" checked>
        最高质量
      </label>
      <label>
        <input type="radio" name="quality" value="medium">
        中等质量
      </label>
      <label>
        <input type="radio" name="quality" value="lowest">
        最低质量
      </label>
    </div>
    
    <label>
      <input type="checkbox" id="auto-download">
      自动下载检测到的视频
    </label>
  </div>
  
  <div class="download-section">
    <h3>下载历史</h3>
    <div id="download-history" class="download-history">
      <!-- 下载记录 -->
    </div>
  </div>
  
  <script src="popup.js"></script>
</body>
</html>
```

## 4. 关键技术点

### 4.1 视频URL提取
1. **DOM监听**: 使用MutationObserver监听视频元素加载
2. **网络拦截**: 拦截video.twimg.com的请求获取真实视频URL
3. **M3U8解析**: 解析HLS播放列表获取多质量版本

### 4.2 跨域处理
- 在manifest.json中配置host_permissions
- 使用chrome.webRequest API拦截请求
- 处理CORS限制

### 4.3 下载管理
- 使用chrome.downloads API进行文件下载
- 实现下载进度监控和错误处理
- 支持自定义文件命名和存储路径

### 4.4 性能优化
- 防抖处理避免重复检测
- 使用WeakMap存储DOM元素引用
- 及时清理事件监听器

## 5. 安全考虑

1. **权限最小化**: 只申请必要的permissions
2. **URL验证**: 验证下载URL的合法性
3. **文件类型检查**: 限制下载文件类型
4. **用户确认**: 重要操作需要用户确认

## 6. 测试方案

### 6.1 功能测试
- 视频检测准确性
- 多种视频格式支持
- 下载功能稳定性
- UI交互正确性

### 6.2 兼容性测试
- 不同Chrome版本
- 不同Twitter/X界面版本
- 各种视频类型（普通视频、GIF、直播等）

## 7. 部署发布

1. **打包**: 使用webpack或类似工具打包
2. **测试**: 在Chrome开发者模式下测试
3. **审核**: 提交Chrome Web Store审核
4. **监控**: 发布后监控用户反馈和错误日志

## 8. 后续优化

1. **批量下载**: 支持选中多个视频批量下载
2. **格式转换**: 支持下载为不同格式（WebM、GIF等）
3. **云端同步**: 下载记录云端同步
4. **快捷键**: 添加键盘快捷键支持
5. **主题定制**: 支持UI主题定制