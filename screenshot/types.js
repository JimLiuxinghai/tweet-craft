/**
 * 截图功能核心类型定义
 * Core type definitions for screenshot functionality
 */

/**
 * 截图配置类型
 * @typedef {Object} ScreenshotConfig
 */
const ScreenshotConfig = {
  // 尺寸设置
  dimensions: {
    width: 600,
    height: 'auto',
    aspectRatio: null, // '1:1', '16:9', '9:16'
    scale: 2 // 高清倍数
  },
  
  // 样式设置
  style: {
    theme: 'light', // 'light', 'dark', 'high-contrast', 'custom'
    backgroundColor: '#ffffff',
    textColor: '#000000',
    accentColor: '#1da1f2',
    fontFamily: 'system-ui',
    fontSize: 16,
    lineHeight: 1.5,
    borderRadius: 12,
    padding: 20,
    shadow: true
  },
  
  // 内容设置
  content: {
    includeAuthor: true,
    includeTimestamp: true,
    includeMedia: true,
    includeMetrics: false,
    includeUrl: false,
    showBranding: true,
    watermark: null
  },
  
  // 导出设置
  export: {
    format: 'png', // 'png', 'jpg', 'webp'
    quality: 0.9,
    filename: 'auto', // 'auto', 'custom'
    filenameTemplate: '{author}_{date}_{id}'
  }
};

/**
 * 主题配置类型
 * @typedef {Object} ThemeConfig
 */
const ThemeConfig = {
  name: 'light',
  displayName: '浅色主题',
  colors: {
    background: '#ffffff',
    surface: '#f8f9fa',
    primary: '#1da1f2',
    secondary: '#657786',
    text: '#14171a',
    textSecondary: '#657786',
    border: '#e1e8ed',
    accent: '#1da1f2'
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: {
      small: 14,
      medium: 16,
      large: 18,
      xlarge: 20
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700
    },
    lineHeight: 1.5
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xlarge: 16
  },
  shadows: {
    small: '0 1px 3px rgba(0, 0, 0, 0.1)',
    medium: '0 4px 12px rgba(0, 0, 0, 0.15)',
    large: '0 8px 24px rgba(0, 0, 0, 0.2)'
  }
};

/**
 * 错误类型定义
 */
const ScreenshotErrors = {
  RENDER_FAILED: 'RENDER_FAILED',
  CANVAS_NOT_SUPPORTED: 'CANVAS_NOT_SUPPORTED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  INVALID_DIMENSIONS: 'INVALID_DIMENSIONS',
  MEDIA_LOAD_FAILED: 'MEDIA_LOAD_FAILED',
  THEME_NOT_FOUND: 'THEME_NOT_FOUND',
  BATCH_PROCESSING_FAILED: 'BATCH_PROCESSING_FAILED'
};

/**
 * 推文数据类型
 * @typedef {Object} TweetData
 */
const TweetDataType = {
  id: '',
  author: {
    name: '',
    username: '',
    avatar: '',
    verified: false
  },
  content: {
    text: '',
    html: '',
    media: [],
    links: [],
    mentions: [],
    hashtags: []
  },
  metadata: {
    timestamp: '',
    metrics: {
      likes: 0,
      retweets: 0,
      replies: 0,
      views: 0
    },
    isRetweet: false,
    isReply: false,
    originalTweet: null
  },
  thread: {
    isThread: false,
    position: 0,
    total: 0,
    threadId: ''
  }
};

// 导出类型定义
if (typeof window !== 'undefined') {
  window.ScreenshotTypes = {
    ScreenshotConfig,
    ThemeConfig,
    ScreenshotErrors,
    TweetDataType
  };
}