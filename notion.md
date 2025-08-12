# 推文推送到Notion数据库技术方案

## 1. 功能概述

为tweet-craft Chrome插件新增推文推送到Notion功能，替代Twitter原生书签功能：
- 一键将推文保存到Notion数据库
- 自动提取推文内容、作者、时间、链接等信息
- 支持自定义标签和分类
- 提供Notion数据库的强大管理和搜索能力
- 支持批量操作和同步状态

## 2. 技术架构

### 2.1 核心技术栈
- **Chrome Extension API** - Manifest V3
- **Notion API** - v2022-06-28 版本
- **OAuth 2.0** - Notion集成认证
- **Chrome Storage API** - 配置和缓存管理
- **React/Vue.js** - 设置界面（基于现有框架）

### 2.2 架构设计
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Content Script │    │  Background      │    │   Settings UI   │
│                 │    │  Service Worker  │    │                 │
│ • 推文检测      │◄──►│                  │◄──►│ • Notion配置    │
│ • 保存按钮      │    │ • Notion API     │    │ • 数据库设置    │
│ • 数据提取      │    │ • 认证管理       │    │ • 标签管理      │
└─────────────────┘    │ • 数据同步       │    └─────────────────┘
         │              └──────────────────┘             │
         ▼                        │                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    外部服务                                 │
│  • Notion API  • Chrome Storage  • OAuth Provider          │
└─────────────────────────────────────────────────────────────┘
```

## 3. Notion数据库结构设计

### 3.1 推文数据库Schema
```javascript
const TWEET_DATABASE_PROPERTIES = {
  // 基本信息
  "标题": {
    "type": "title"
  },
  "内容": {
    "type": "rich_text"
  },
  "作者": {
    "type": "rich_text"
  },
  "作者用户名": {
    "type": "rich_text"
  },
  "推文链接": {
    "type": "url"
  },
  "发布时间": {
    "type": "date"
  },
  "保存时间": {
    "type": "created_time"
  },
  
  // 分类和标签
  "标签": {
    "type": "multi_select",
    "multi_select": {
      "options": [
        {"name": "技术", "color": "blue"},
        {"name": "资讯", "color": "green"},
        {"name": "灵感", "color": "yellow"},
        {"name": "学习", "color": "purple"},
        {"name": "工作", "color": "red"}
      ]
    }
  },
  "类型": {
    "type": "select",
    "select": {
      "options": [
        {"name": "原创推文", "color": "blue"},
        {"name": "转推", "color": "green"},
        {"name": "引用推文", "color": "yellow"},
        {"name": "回复", "color": "gray"}
      ]
    }
  },
  "优先级": {
    "type": "select",
    "select": {
      "options": [
        {"name": "高", "color": "red"},
        {"name": "中", "color": "yellow"},
        {"name": "低", "color": "gray"}
      ]
    }
  },
  
  // 媒体内容
  "包含图片": {
    "type": "checkbox"
  },
  "包含视频": {
    "type": "checkbox"
  },
  "包含链接": {
    "type": "checkbox"
  },
  "媒体文件": {
    "type": "files"
  },
  
  // 统计信息
  "点赞数": {
    "type": "number"
  },
  "转推数": {
    "type": "number"
  },
  "回复数": {
    "type": "number"
  },
  
  // 状态管理
  "已读": {
    "type": "checkbox"
  },
  "收藏": {
    "type": "checkbox"
  },
  "状态": {
    "type": "select",
    "select": {
      "options": [
        {"name": "待阅读", "color": "yellow"},
        {"name": "已阅读", "color": "green"},
        {"name": "已归档", "color": "gray"}
      ]
    }
  }
};
```

## 4. 实现方案

### 4.1 Manifest V3 配置更新

```json
{
  "manifest_version": 3,
  "permissions": [
    "storage",
    "activeTab",
    "scripting",
    "identity"
  ],
  "host_permissions": [
    "https://*.x.com/*",
    "https://*.twitter.com/*",
    "https://api.notion.com/*"
  ],
  "oauth2": {
    "client_id": "YOUR_NOTION_CLIENT_ID",
    "scopes": ["read", "write"]
  },
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "options_page": "options.html"
}
```

### 4.2 Notion API集成

#### Background Script - Notion服务
```javascript
class NotionService {
  constructor() {
    this.apiUrl = 'https://api.notion.com/v1';
    this.version = '2022-06-28';
    this.accessToken = null;
    this.databaseId = null;
    this.init();
  }

  async init() {
    // 从storage获取配置
    const config = await chrome.storage.sync.get(['notionToken', 'databaseId']);
    this.accessToken = config.notionToken;
    this.databaseId = config.databaseId;
  }

  // OAuth认证流程
  async authenticate() {
    try {
      const redirectURL = chrome.identity.getRedirectURL();
      const authUrl = `https://api.notion.com/v1/oauth/authorize?` +
        `client_id=${CLIENT_ID}&` +
        `response_type=code&` +
        `owner=user&` +
        `redirect_uri=${encodeURIComponent(redirectURL)}`;

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true
      });

      // 提取授权码
      const code = new URL(responseUrl).searchParams.get('code');
      
      // 交换access token
      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`
        },
        body: JSON.stringify({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectURL
        })
      });

      const tokenData = await tokenResponse.json();
      this.accessToken = tokenData.access_token;

      // 保存到storage
      await chrome.storage.sync.set({
        notionToken: this.accessToken,
        notionWorkspace: tokenData.workspace
      });

      return tokenData;
    } catch (error) {
      console.error('Notion认证失败:', error);
      throw error;
    }
  }

  // 创建推文数据库
  async createTweetDatabase(parentPageId, title = "Tweet Collection") {
    if (!this.accessToken) {
      throw new Error('未认证Notion账户');
    }

    const payload = {
      parent: { page_id: parentPageId },
      title: [
        {
          type: "text",
          text: { content: title }
        }
      ],
      properties: TWEET_DATABASE_PROPERTIES
    };

    const response = await fetch(`${this.apiUrl}/databases`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.version
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`创建数据库失败: ${response.statusText}`);
    }

    const database = await response.json();
    this.databaseId = database.id;

    // 保存数据库ID
    await chrome.storage.sync.set({
      databaseId: this.databaseId
    });

    return database;
  }

  // 保存推文到Notion
  async saveTweetToNotion(tweetData) {
    if (!this.accessToken || !this.databaseId) {
      throw new Error('Notion未配置或未认证');
    }

    const pageData = this.formatTweetForNotion(tweetData);

    const response = await fetch(`${this.apiUrl}/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.version
      },
      body: JSON.stringify({
        parent: { database_id: this.databaseId },
        properties: pageData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`保存失败: ${errorData.message}`);
    }

    return await response.json();
  }

  // 格式化推文数据为Notion格式
  formatTweetForNotion(tweetData) {
    const {
      content,
      author,
      username,
      url,
      publishTime,
      type,
      media,
      stats,
      tags = []
    } = tweetData;

    return {
      "标题": {
        "title": [
          {
            "type": "text",
            "text": {
              "content": content.slice(0, 100) + (content.length > 100 ? '...' : '')
            }
          }
        ]
      },
      "内容": {
        "rich_text": [
          {
            "type": "text",
            "text": { "content": content }
          }
        ]
      },
      "作者": {
        "rich_text": [
          {
            "type": "text",
            "text": { "content": author }
          }
        ]
      },
      "作者用户名": {
        "rich_text": [
          {
            "type": "text",
            "text": { "content": username }
          }
        ]
      },
      "推文链接": {
        "url": url
      },
      "发布时间": {
        "date": {
          "start": publishTime
        }
      },
      "类型": {
        "select": {
          "name": type || "原创推文"
        }
      },
      "标签": {
        "multi_select": tags.map(tag => ({ "name": tag }))
      },
      "包含图片": {
        "checkbox": media.hasImages || false
      },
      "包含视频": {
        "checkbox": media.hasVideo || false
      },
      "包含链接": {
        "checkbox": media.hasLinks || false
      },
      "点赞数": {
        "number": stats.likes || 0
      },
      "转推数": {
        "number": stats.retweets || 0
      },
      "回复数": {
        "number": stats.replies || 0
      },
      "状态": {
        "select": {
          "name": "待阅读"
        }
      }
    };
  }

  // 检查推文是否已存在
  async checkTweetExists(tweetUrl) {
    if (!this.accessToken || !this.databaseId) {
      return false;
    }

    const response = await fetch(`${this.apiUrl}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.version
      },
      body: JSON.stringify({
        filter: {
          property: "推文链接",
          url: {
            equals: tweetUrl
          }
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      return data.results.length > 0;
    }

    return false;
  }

  // 获取数据库统计
  async getDatabaseStats() {
    if (!this.accessToken || !this.databaseId) {
      return null;
    }

    const response = await fetch(`${this.apiUrl}/databases/${this.databaseId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': this.version
      },
      body: JSON.stringify({
        page_size: 1
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        total: data.results.length,
        hasMore: data.has_more
      };
    }

    return null;
  }
}

// 初始化Notion服务
const notionService = new NotionService();
```

### 4.3 Content Script增强

#### 推文数据提取和UI集成
```javascript
class TweetToNotionHandler {
  constructor() {
    this.existingTweets = new Set();
    this.init();
  }

  init() {
    // 监听DOM变化
    this.observer = new MutationObserver(this.handleMutation.bind(this));
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // 初始处理
    this.processExistingTweets();
  }

  handleMutation(mutations) {
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            this.processNewTweets(node);
          }
        });
      }
    });
  }

  processExistingTweets() {
    document.querySelectorAll('[data-testid="tweet"]').forEach(tweet => {
      this.addNotionButton(tweet);
    });
  }

  processNewTweets(container) {
    container.querySelectorAll('[data-testid="tweet"]').forEach(tweet => {
      if (!this.existingTweets.has(tweet)) {
        this.addNotionButton(tweet);
      }
    });
  }

  addNotionButton(tweetElement) {
    if (this.existingTweets.has(tweetElement)) return;
    this.existingTweets.add(tweetElement);

    // 找到操作栏
    const actionBar = tweetElement.querySelector('[role="group"]');
    if (!actionBar) return;

    // 创建Notion保存按钮
    const notionButton = this.createNotionButton();
    actionBar.appendChild(notionButton);

    // 绑定点击事件
    notionButton.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      await this.handleSaveTweet(tweetElement, notionButton);
    });
  }

  createNotionButton() {
    const button = document.createElement('div');
    button.className = 'tweet-craft-notion-btn';
    button.innerHTML = `
      <div class="notion-btn-content">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4.459 4.208c.746-.24 1.352-.17 2.355-.137l10.58.285c1.504.034 2.57.137 3.64 1.09 1.07.952 1.07 1.904 1.07 3.355v7.344c0 2.367 0 3.73-1.07 4.682-1.07.952-2.136 1.055-3.64 1.09l-10.58.285c-1.003.033-1.609.103-2.355-.137C3.117 21.85 2.5 20.967 2.5 19.344V4.656c0-1.623.617-2.506 1.959-2.448zm1.582 3.368v8.704c0 .205.171.376.376.376h11.167c.205 0 .376-.171.376-.376V7.576c0-.205-.171-.376-.376-.376H6.417c-.205 0-.376.171-.376.376z"/>
        </svg>
        <span>保存到Notion</span>
      </div>
    `;
    
    // 添加样式
    button.style.cssText = `
      display: inline-flex;
      align-items: center;
      padding: 8px 16px;
      margin-left: 8px;
      border-radius: 20px;
      background: #f7f7f7;
      border: 1px solid #e1e8ed;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 13px;
      color: #536471;
    `;

    // 悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.background = '#e8f5e8';
      button.style.borderColor = '#1d9bf0';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#f7f7f7';
      button.style.borderColor = '#e1e8ed';
    });

    return button;
  }

  async handleSaveTweet(tweetElement, button) {
    try {
      // 显示加载状态
      this.setButtonLoading(button, true);

      // 提取推文数据
      const tweetData = await this.extractTweetData(tweetElement);

      // 检查是否已存在
      const exists = await this.checkIfExists(tweetData.url);
      if (exists) {
        this.showNotification('推文已存在于Notion中', 'warning');
        return;
      }

      // 发送到background script
      const result = await chrome.runtime.sendMessage({
        action: 'saveTweetToNotion',
        data: tweetData
      });

      if (result.success) {
        this.setButtonSaved(button);
        this.showNotification('推文已保存到Notion', 'success');
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('保存推文失败:', error);
      this.showNotification('保存失败: ' + error.message, 'error');
    } finally {
      this.setButtonLoading(button, false);
    }
  }

  async extractTweetData(tweetElement) {
    // 提取推文URL
    const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
    const url = tweetLink ? tweetLink.href : window.location.href;
    const tweetId = url.match(/\/status\/(\d+)/)?.[1];

    // 提取作者信息
    const authorElement = tweetElement.querySelector('[data-testid="User-Names"]');
    const author = authorElement?.querySelector('span')?.textContent || '';
    const usernameElement = authorElement?.querySelector('a');
    const username = usernameElement?.href.split('/').pop() || '';

    // 提取推文内容
    const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
    const content = contentElement?.textContent || '';

    // 提取发布时间
    const timeElement = tweetElement.querySelector('time');
    const publishTime = timeElement?.getAttribute('datetime') || new Date().toISOString();

    // 检测媒体内容
    const hasImages = tweetElement.querySelectorAll('[data-testid="tweetPhoto"]').length > 0;
    const hasVideo = tweetElement.querySelector('video') !== null;
    const hasLinks = tweetElement.querySelectorAll('a[href^="http"]').length > 0;

    // 提取统计数据
    const stats = this.extractTweetStats(tweetElement);

    // 确定推文类型
    const type = this.determineTweetType(tweetElement);

    return {
      id: tweetId,
      url: url,
      content: content,
      author: author,
      username: username,
      publishTime: publishTime,
      type: type,
      media: {
        hasImages: hasImages,
        hasVideo: hasVideo,
        hasLinks: hasLinks
      },
      stats: stats,
      savedAt: new Date().toISOString()
    };
  }

  extractTweetStats(tweetElement) {
    const stats = { likes: 0, retweets: 0, replies: 0 };
    
    // 提取统计数据的选择器可能会变化，需要根据实际情况调整
    const likeButton = tweetElement.querySelector('[data-testid="like"]');
    const retweetButton = tweetElement.querySelector('[data-testid="retweet"]');
    const replyButton = tweetElement.querySelector('[data-testid="reply"]');

    if (likeButton) {
      const likeText = likeButton.getAttribute('aria-label') || '';
      const likeMatch = likeText.match(/(\d+)/);
      stats.likes = likeMatch ? parseInt(likeMatch[1]) : 0;
    }

    if (retweetButton) {
      const retweetText = retweetButton.getAttribute('aria-label') || '';
      const retweetMatch = retweetText.match(/(\d+)/);
      stats.retweets = retweetMatch ? parseInt(retweetMatch[1]) : 0;
    }

    if (replyButton) {
      const replyText = replyButton.getAttribute('aria-label') || '';
      const replyMatch = replyText.match(/(\d+)/);
      stats.replies = replyMatch ? parseInt(replyMatch[1]) : 0;
    }

    return stats;
  }

  determineTweetType(tweetElement) {
    // 判断推文类型
    if (tweetElement.querySelector('[data-testid="socialContext"]')) {
      return "转推";
    } else if (tweetElement.querySelector('[data-testid="tweet"] [data-testid="tweet"]')) {
      return "引用推文";
    } else if (window.location.pathname.includes('/status/') && 
               tweetElement.closest('[data-testid="tweet"]') !== tweetElement) {
      return "回复";
    }
    
    return "原创推文";
  }

  async checkIfExists(url) {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'checkTweetExists',
        url: url
      });
      return result.exists;
    } catch (error) {
      console.error('检查推文是否存在失败:', error);
      return false;
    }
  }

  setButtonLoading(button, loading) {
    const content = button.querySelector('.notion-btn-content');
    if (loading) {
      content.innerHTML = `
        <div class="spinner"></div>
        <span>保存中...</span>
      `;
      button.style.pointerEvents = 'none';
    } else {
      content.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4.459 4.208c.746-.24 1.352-.17 2.355-.137l10.58.285c1.504.034 2.57.137 3.64 1.09 1.07.952 1.07 1.904 1.07 3.355v7.344c0 2.367 0 3.73-1.07 4.682-1.07.952-2.136 1.055-3.64 1.09l-10.58.285c-1.003.033-1.609.103-2.355-.137C3.117 21.85 2.5 20.967 2.5 19.344V4.656c0-1.623.617-2.506 1.959-2.448zm1.582 3.368v8.704c0 .205.171.376.376.376h11.167c.205 0 .376-.171.376-.376V7.576c0-.205-.171-.376-.376-.376H6.417c-.205 0-.376.171-.376.376z"/>
        </svg>
        <span>保存到Notion</span>
      `;
      button.style.pointerEvents = 'auto';
    }
  }

  setButtonSaved(button) {
    const content = button.querySelector('.notion-btn-content');
    content.innerHTML = `
      <svg viewBox="0 0 24 24" width="18" height="18" fill="#00d564">
        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
      </svg>
      <span style="color: #00d564;">已保存</span>
    `;
    button.style.borderColor = '#00d564';
    button.style.background = '#f0f9f0';
  }

  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `tweet-craft-notification ${type}`;
    notification.textContent = message;
    
    // 样式
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      ${type === 'success' ? 'background: #00d564; color: white;' : ''}
      ${type === 'error' ? 'background: #f91880; color: white;' : ''}
      ${type === 'warning' ? 'background: #ff9500; color: white;' : ''}
      ${type === 'info' ? 'background: #1d9bf0; color: white;' : ''}
    `;

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// 初始化
new TweetToNotionHandler();
```

### 4.4 设置界面

#### Options Page (options.html)
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Tweet Craft - Notion设置</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      margin: 0;
      padding: 20px;
      background: #fafafa;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      color: #333;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #f0f0f0;
    }
    .form-group {
      margin-bottom: 20px;
    }
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
      color: #555;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-primary {
      background: #1d9bf0;
      color: white;
    }
    .btn-primary:hover {
      background: #1a8cd8;
    }
    .btn-success {
      background: #00d564;
      color: white;
    }
    .btn-danger {
      background: #f91880;
      color: white;
    }
    .status {
      padding: 12px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .status-success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .status-error {
      background: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    .database-preview {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .stat-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .stat-number {
      font-size: 24px;
      font-weight: bold;
      color: #1d9bf0;
    }
    .stat-label {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Tweet Craft - Notion集成设置</h1>
    
    <!-- 连接状态 -->
    <div class="section">
      <h2>连接状态</h2>
      <div id="connection-status"></div>
      <div class="form-group">
        <button id="auth-btn" class="btn btn-primary">连接Notion账户</button>
        <button id="disconnect-btn" class="btn btn-danger" style="display:none; margin-left:10px;">断开连接</button>
      </div>
    </div>

    <!-- 数据库设置 -->
    <div class="section" id="database-section" style="display:none;">
      <h2>数据库设置</h2>
      <div class="form-group">
        <label for="parent-page">父页面 (可选)</label>
        <select id="parent-page">
          <option value="">选择父页面...</option>
        </select>
      </div>
      <div class="form-group">
        <label for="database-name">数据库名称</label>
        <input type="text" id="database-name" placeholder="Tweet Collection" value="Tweet Collection">
      </div>
      <button id="create-database-btn" class="btn btn-success">创建数据库</button>
      
      <div id="database-preview" class="database-preview" style="display:none;">
        <h3>当前数据库</h3>
        <p><strong>名称:</strong> <span id="current-database-name"></span></p>
        <p><strong>ID:</strong> <span id="current-database-id"></span></p>
        <button id="change-database-btn" class="btn btn-primary">更换数据库</button>
      </div>
    </div>

    <!-- 保存设置 -->
    <div class="section" id="save-settings-section" style="display:none;">
      <h2>保存设置</h2>
      <div class="form-group">
        <label>
          <input type="checkbox" id="auto-tags"> 自动添加标签
        </label>
      </div>
      <div class="form-group">
        <label for="default-tags">默认标签 (逗号分隔)</label>
        <input type="text" id="default-tags" placeholder="技术,学习,资讯">
      </div>
      <div class="form-group">
        <label for="save-media">媒体处理</label>
        <select id="save-media">
          <option value="reference">仅保存引用</option>
          <option value="download">下载到Notion</option>
        </select>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="check-duplicates" checked> 检查重复推文
        </label>
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="section" id="stats-section" style="display:none;">
      <h2>统计信息</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-number" id="total-saved">0</div>
          <div class="stat-label">已保存推文</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="this-month">0</div>
          <div class="stat-label">本月保存</div>
        </div>
        <div class="stat-card">
          <div class="stat-number" id="unread-count">0</div>
          <div class="stat-label">未读推文</div>
        </div>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="section" id="advanced-section" style="display:none;">
      <h2>高级设置</h2>
      <div class="form-group">
        <label for="sync-interval">同步间隔 (分钟)</label>
        <select id="sync-interval">
          <option value="0">禁用自动同步</option>
          <option value="5">5分钟</option>
          <option value="15">15分钟</option>
          <option value="30">30分钟</option>
          <option value="60">1小时</option>
        </select>
      </div>
      <div class="form-group">
        <button id="export-settings-btn" class="btn">导出设置</button>
        <button id="import-settings-btn" class="btn">导入设置</button>
      </div>
    </div>
  </div>

#### Options JavaScript (options.js)
```javascript
class NotionOptionsManager {
  constructor() {
    this.init();
  }

  async init() {
    // 加载当前设置
    await this.loadSettings();
    
    // 绑定事件监听器
    this.bindEventListeners();
    
    // 检查连接状态
    await this.checkConnectionStatus();
  }

  bindEventListeners() {
    // 认证按钮
    document.getElementById('auth-btn').addEventListener('click', () => {
      this.authenticateNotion();
    });

    // 断开连接按钮
    document.getElementById('disconnect-btn').addEventListener('click', () => {
      this.disconnectNotion();
    });

    // 创建数据库按钮
    document.getElementById('create-database-btn').addEventListener('click', () => {
      this.createDatabase();
    });

    // 更换数据库按钮
    document.getElementById('change-database-btn').addEventListener('click', () => {
      this.changeDatabase();
    });

    // 设置变更监听
    ['auto-tags', 'default-tags', 'save-media', 'check-duplicates', 'sync-interval'].forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', () => this.saveSettings());
    });

    // 导入导出
    document.getElementById('export-settings-btn').addEventListener('click', () => {
      this.exportSettings();
    });
    
    document.getElementById('import-settings-btn').addEventListener('click', () => {
      this.importSettings();
    });
  }

  async loadSettings() {
    const settings = await chrome.storage.sync.get([
      'notionToken',
      'databaseId',
      'databaseName',
      'autoTags',
      'defaultTags',
      'saveMedia',
      'checkDuplicates',
      'syncInterval'
    ]);

    // 填充表单
    if (settings.autoTags) {
      document.getElementById('auto-tags').checked = true;
    }
    if (settings.defaultTags) {
      document.getElementById('default-tags').value = settings.defaultTags;
    }
    if (settings.saveMedia) {
      document.getElementById('save-media').value = settings.saveMedia;
    }
    if (settings.checkDuplicates !== false) {
      document.getElementById('check-duplicates').checked = true;
    }
    if (settings.syncInterval) {
      document.getElementById('sync-interval').value = settings.syncInterval;
    }

    // 显示数据库信息
    if (settings.databaseId && settings.databaseName) {
      document.getElementById('current-database-name').textContent = settings.databaseName;
      document.getElementById('current-database-id').textContent = settings.databaseId;
      document.getElementById('database-preview').style.display = 'block';
    }
  }

  async saveSettings() {
    const settings = {
      autoTags: document.getElementById('auto-tags').checked,
      defaultTags: document.getElementById('default-tags').value,
      saveMedia: document.getElementById('save-media').value,
      checkDuplicates: document.getElementById('check-duplicates').checked,
      syncInterval: parseInt(document.getElementById('sync-interval').value)
    };

    await chrome.storage.sync.set(settings);
    this.showStatus('设置已保存', 'success');
  }

  async checkConnectionStatus() {
    const { notionToken, databaseId } = await chrome.storage.sync.get(['notionToken', 'databaseId']);
    
    if (notionToken) {
      // 验证token是否有效
      const isValid = await this.validateToken(notionToken);
      
      if (isValid) {
        this.showConnectedStatus();
        document.getElementById('database-section').style.display = 'block';
        document.getElementById('save-settings-section').style.display = 'block';
        document.getElementById('advanced-section').style.display = 'block';
        
        if (databaseId) {
          document.getElementById('stats-section').style.display = 'block';
          await this.loadStats();
        }
      } else {
        this.showDisconnectedStatus('Token已过期，请重新连接');
      }
    } else {
      this.showDisconnectedStatus();
    }
  }

  async validateToken(token) {
    try {
      const response = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28'
        }
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  showConnectedStatus() {
    document.getElementById('connection-status').innerHTML = `
      <div class="status status-success">
        ✅ 已连接到Notion账户
      </div>
    `;
    document.getElementById('auth-btn').style.display = 'none';
    document.getElementById('disconnect-btn').style.display = 'inline-block';
  }

  showDisconnectedStatus(message = '未连接到Notion账户') {
    document.getElementById('connection-status').innerHTML = `
      <div class="status status-error">
        ❌ ${message}
      </div>
    `;
    document.getElementById('auth-btn').style.display = 'inline-block';
    document.getElementById('disconnect-btn').style.display = 'none';
    document.getElementById('database-section').style.display = 'none';
    document.getElementById('save-settings-section').style.display = 'none';
    document.getElementById('stats-section').style.display = 'none';
    document.getElementById('advanced-section').style.display = 'none';
  }

  async authenticateNotion() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'authenticateNotion'
      });

      if (result.success) {
        this.showStatus('认证成功！', 'success');
        await this.checkConnectionStatus();
        await this.loadPages();
      } else {
        this.showStatus('认证失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showStatus('认证失败: ' + error.message, 'error');
    }
  }

  async disconnectNotion() {
    if (confirm('确定要断开Notion连接吗？这将清除所有设置。')) {
      await chrome.storage.sync.clear();
      this.showStatus('已断开连接', 'success');
      await this.checkConnectionStatus();
    }
  }

  async loadPages() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getNotionPages'
      });

      if (result.success) {
        const select = document.getElementById('parent-page');
        select.innerHTML = '<option value="">选择父页面...</option>';
        
        result.pages.forEach(page => {
          const option = document.createElement('option');
          option.value = page.id;
          option.textContent = page.title;
          select.appendChild(option);
        });
      }
    } catch (error) {
      console.error('加载页面失败:', error);
    }
  }

  async createDatabase() {
    const parentPageId = document.getElementById('parent-page').value;
    const databaseName = document.getElementById('database-name').value || 'Tweet Collection';

    if (!parentPageId) {
      this.showStatus('请选择一个父页面', 'error');
      return;
    }

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'createTweetDatabase',
        parentPageId: parentPageId,
        title: databaseName
      });

      if (result.success) {
        this.showStatus('数据库创建成功！', 'success');
        
        // 更新显示
        document.getElementById('current-database-name').textContent = databaseName;
        document.getElementById('current-database-id').textContent = result.database.id;
        document.getElementById('database-preview').style.display = 'block';
        document.getElementById('stats-section').style.display = 'block';
        
        await this.loadStats();
      } else {
        this.showStatus('创建数据库失败: ' + result.error, 'error');
      }
    } catch (error) {
      this.showStatus('创建数据库失败: ' + error.message, 'error');
    }
  }

  async changeDatabase() {
    // 实现数据库选择逻辑
    const newDatabaseId = prompt('请输入新的数据库ID:');
    if (newDatabaseId) {
      await chrome.storage.sync.set({ databaseId: newDatabaseId });
      this.showStatus('数据库已更换', 'success');
      location.reload();
    }
  }

  async loadStats() {
    try {
      const result = await chrome.runtime.sendMessage({
        action: 'getDatabaseStats'
      });

      if (result.success) {
        document.getElementById('total-saved').textContent = result.stats.total || 0;
        document.getElementById('this-month').textContent = result.stats.thisMonth || 0;
        document.getElementById('unread-count').textContent = result.stats.unread || 0;
      }
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }

  exportSettings() {
    chrome.storage.sync.get(null, (settings) => {
      const dataStr = JSON.stringify(settings, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = 'tweet-craft-notion-settings.json';
      link.click();
    });
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const settings = JSON.parse(event.target.result);
          chrome.storage.sync.set(settings, () => {
            this.showStatus('设置导入成功', 'success');
            location.reload();
          });
        } catch (error) {
          this.showStatus('导入失败: 无效的文件格式', 'error');
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  }

  showStatus(message, type) {
    // 创建状态消息显示逻辑
    const statusDiv = document.createElement('div');
    statusDiv.className = `status status-${type}`;
    statusDiv.textContent = message;
    
    // 找到合适的位置插入
    const container = document.querySelector('.container');
    container.insertBefore(statusDiv, container.firstChild);
    
    // 3秒后移除
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv);
      }
    }, 3000);
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  new NotionOptionsManager();
});
```

### 4.5 Background Script消息处理增强

```javascript
// 在现有Background Script基础上添加消息处理
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.action) {
    case 'saveTweetToNotion':
      try {
        const result = await notionService.saveTweetToNotion(message.data);
        sendResponse({ success: true, data: result });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'checkTweetExists':
      try {
        const exists = await notionService.checkTweetExists(message.url);
        sendResponse({ exists: exists });
      } catch (error) {
        sendResponse({ exists: false });
      }
      break;

    case 'authenticateNotion':
      try {
        const authData = await notionService.authenticate();
        sendResponse({ success: true, data: authData });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'createTweetDatabase':
      try {
        const database = await notionService.createTweetDatabase(
          message.parentPageId,
          message.title
        );
        sendResponse({ success: true, database: database });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'getDatabaseStats':
      try {
        const stats = await notionService.getDatabaseStats();
        sendResponse({ success: true, stats: stats });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;

    case 'getNotionPages':
      try {
        const pages = await notionService.getUserPages();
        sendResponse({ success: true, pages: pages });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
      break;
  }
  
  return true; // 保持消息通道开放以支持异步响应
});
```

## 5. 部署和使用流程

### 5.1 初始设置流程
1. **安装扩展** - 用户安装tweet-craft扩展
2. **Notion认证** - 在设置页面连接Notion账户
3. **创建数据库** - 选择父页面，创建推文收集数据库
4. **配置选项** - 设置默认标签、保存偏好等

### 5.2 日常使用流程
1. **浏览Twitter** - 在Twitter/X上正常浏览
2. **发现推文** - 看到想保存的推文
3. **一键保存** - 点击推文下方的"保存到Notion"按钮
4. **自动同步** - 推文信息自动保存到Notion数据库
5. **Notion管理** - 在Notion中查看、编辑、分类推文

## 6. 技术优势

### 6.1 相比Twitter书签的优势
- **强大搜索**: Notion的全文搜索和筛选功能
- **灵活分类**: 多维度标签和属性分类
- **内容增强**: 可在Notion中添加笔记和评论
- **数据导出**: 可导出为多种格式
- **团队协作**: 可共享数据库进行协作

### 6.2 技术特点
- **实时同步**: 即时保存，无需等待
- **数据完整性**: 保存完整的推文元数据
- **错误处理**: 完善的异常处理和用户提示
- **性能优化**: 智能缓存和去重机制

## 7. 后续优化计划

1. **批量操作**: 支持选择多条推文批量保存
2. **智能标签**: AI自动生成标签建议
3. **同步优化**: 双向同步，支持在Notion中标记已读状态
4. **模板定制**: 允许用户自定义数据库结构
5. **统计分析**: 提供保存习惯和内容分析

---

这个技术方案将Twitter书签功能完全升级到Notion平台，充分利用Notion的数据库能力，为用户提供更强大的推文管理和组织功能。