// Twitter/X 相关常量定义

export const TWITTER_DOMAINS = [
  'twitter.com',
  'x.com'
] as const;

export const DEFAULT_SETTINGS = {
  format: 'html' as const,
  includeAuthor: true,
  includeTimestamp: true,
  includeMetrics: false,
  includeMedia: true,
  includeLink: true,
  language: 'en',
  theme: 'auto' as const,
  enableKeyboardShortcuts: true,
  enableContextMenu: true,
  enableThreadDetection: true,
};

export const TWITTER_SELECTORS = {
  // 推文容器选择器
  TWEET_CONTAINER: '[data-testid="tweet"], article[data-testid="tweet"], [data-testid="cellInnerDiv"] article',
  TWEET_ARTICLE: 'article[data-testid="tweet"]',
  TWEET_DETAIL_CONTAINER: '[data-testid="tweetDetail"] article, article[role="article"]',
  MAIN_TWEET_CONTAINER: '[data-testid="tweet"]:not([data-testid="tweet"] [data-testid="tweet"])',
  
  // 推文内容选择器
  TWEET_TEXT: '[data-testid="tweetText"], [lang] > span, .css-901oao.r-18jsvk2.r-37j5jr.r-a023e6, [data-testid="tweet"] [lang][dir]',
  TWEET_TIME: 'time',
  TWEET_AUTHOR: '[data-testid="User-Name"]',
  TWEET_USERNAME: '[data-testid="User-Username"]',
  TWEET_AVATAR: '[data-testid="Tweet-User-Avatar"] img',
  
  // 推文互动数据
  TWEET_REPLIES: '[data-testid="reply"]',
  TWEET_RETWEETS: '[data-testid="retweet"]',
  TWEET_LIKES: '[data-testid="like"]',
  TWEET_VIEWS: '[data-testid="app-text-transition-container"]',
  
  // 媒体内容
  TWEET_IMAGES: '[data-testid="tweetPhoto"] img',
  TWEET_VIDEOS: '[data-testid="videoPlayer"] video',
  TWEET_GIFS: '[data-testid="gifPlayer"]',
  TWEET_CARDS: '[data-testid="card.wrapper"]',
  
  // 线程相关
  THREAD_CONNECTOR: '[data-testid="tweet"] [aria-label*="Show this thread"]',
  THREAD_LINE: '[data-testid="tweet"] div[style*="background-color"]',
  
  // 引用推文相关
  QUOTE_TWEET_INDICATOR: 'span[aria-label*="Quote"], [data-testid="quoteTweet"]',
  QUOTE_TWEET_CONTAINER: '[role="link"][tabindex="0"][aria-labelledby]',
  QUOTE_TWEET_CONTENT: '[role="link"][tabindex="0"] [data-testid="tweetText"]',
  QUOTE_TWEET_AUTHOR: '[role="link"][tabindex="0"] [data-testid="User-Name"]',
  
  // 推文操作栏 - 更新以适配最新的Twitter DOM结构
  TWEET_ACTIONS: '[role="group"]',
  TWEET_ACTIONS_BAR: '[data-testid="tweet"] [role="group"], [data-testid="tweet"] > div > div:last-child > div > div[role="group"], [aria-label*="bookmarks"][aria-label*="views"][role="group"], [role="group"][aria-label*="Replies"][aria-label*="views"], div[role="group"]:has([data-testid="reply"], [data-testid="retweet"], [data-testid="like"]), div[role="group"][aria-label*="views"]',
  
  // 用户信息
  USER_PROFILE_LINK: '[data-testid="User-Name"] a[role="link"]',
  USER_DISPLAY_NAME: '[data-testid="User-Name"] span span, [data-testid="User-Name"] a span span, [data-testid="User-Names"] > div > div span, [data-testid="UserAvatar-Container-"] + div a span, [data-testid="User-Name"] div div a div div span span',
  USER_HANDLE: '[data-testid="User-Name"] span[dir], [data-testid="User-Username"] span, [data-testid="User-Names"] span[dir], [data-testid="UserAvatar-Container-"] + div span[dir], [data-testid="User-Name"] div div div a div span',
  
  // 时间戳
  TIMESTAMP: 'time[datetime], time, [data-testid="Tweet-Timestamp"] time, [data-testid="tweet"] time',
  
  // 推文链接
  TWEET_LINK: 'a[href*="/status/"]',
  
  // 推文状态
  PROMOTED_TWEET: '[data-testid="tweet"] [data-testid="promotedIndicator"]',
  PINNED_TWEET: '[data-testid="tweet"] [data-testid="pin"]',
  
  // 内容展开 - 更新以匹配实际的DOM结构
  SHOW_MORE_BUTTON: '[data-testid="tweet-text-show-more-link"], a[data-testid="tweet-text-show-more-link"], button[data-testid="tweet-text-show-more-link"]',
  SHOW_LESS_BUTTON: '[data-testid="tweet-text-show-less-link"], a[data-testid="tweet-text-show-less-link"], button[data-testid="tweet-text-show-less-link"]'
} as const;

export const TWITTER_PATTERNS = {
  // URL 模式
  TWEET_URL: /https?:\/\/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/,
  USER_URL: /https?:\/\/(?:twitter\.com|x\.com)\/(\w+)/,
  
  // 推文 ID 提取
TWEET_ID: /\/status\/(\d+)/,
  
  // 用户名模式
  USERNAME: /@(\w+)/,
  
  // 话题标签
  HASHTAG: /#(\w+)/g,
  
  // 线程编号模式
  THREAD_NUMBER: /(\d+)\/(\d+)$/,
  THREAD_MARKER: /(thread|🧵|⬇️)/i,
  
  // 时间格式
  RELATIVE_TIME: /(now|\d+[smhd]|\d+\s*(second|minute|hour|day)s?\s*ago)/i,
  ISO_DATE: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
  
  // 互动数据格式
  METRIC_NUMBER: /[\d,\.KMB]+/,
  
  // 媒体 URL 模式
  TWITTER_IMAGE: /pbs\.twimg\.com\/media/,
  TWITTER_VIDEO: /video\.twimg\.com/
} as const;

export const TWITTER_CLASSES = {
  // 主题相关类名
  DARK_THEME: 'r-aqfbo4',
  LIGHT_THEME: 'r-1kqtdi0',
  
  // 布局相关
  TWEET_CONTAINER: 'css-1dbjc4n',
  TWEET_CONTENT: 'css-901oao',
  
  // 文本样式
  PRIMARY_TEXT: 'r-37j5jr',
  SECONDARY_TEXT: 'r-a023e6',
  
  // 交互状态
  HOVER_STATE: 'r-1loqt21',
  ACTIVE_STATE: 'r-1otgn73',
  
  // 媒体样式
  MEDIA_CONTAINER: 'r-1p0dtai',
  IMAGE_CONTAINER: 'r-1mlwlqe'
} as const;

export const EXTENSION_CONFIG = {
  // 扩展基本信息
  NAME: 'Twitter Super Copy',
  VERSION: '1.0.0',
  DESCRIPTION: 'Enhanced copy functionality for Twitter/X.com',
  
  // 存储键名
  STORAGE_KEYS: {
    SETTINGS: 'tsc_settings',
    HISTORY: 'tsc_history',
    CACHE: 'tsc_cache',
  I18N: 'tsc_i18n',
    PERFORMANCE: 'tsc_performance'
  },
  
  // 缓存配置
  CACHE: {
    MAX_ITEMS: 200,
    EXPIRE_TIME: 5 * 60 * 1000, // 5分钟
    CLEANUP_INTERVAL: 60 * 1000 // 1分钟清理一次
  },
  
  // 性能配置
  PERFORMANCE: {
    BATCH_SIZE: 10,
    DEBOUNCE_TIME: 200,
    THROTTLE_TIME: 100,
    MAX_PARSE_TIME: 5000,
    DEBUG_MODE: true // 开启调试模式
  },
  
  // UI 配置
  UI: {
    POPUP_WIDTH: 360,
    POPUP_HEIGHT: 600,
    ANIMATION_DURATION: 200,
    TOAST_DURATION: 3000
  },
  
  // 快捷键
  SHORTCUTS: {
    COPY_TWEET: 'Ctrl+Shift+C',
    COPY_THREAD: 'Ctrl+Shift+T',
    OPEN_POPUP: 'Ctrl+Shift+P'
  }
} as const;

export const ERROR_MESSAGES = {
  // 剪贴板错误
  CLIPBOARD_NOT_SUPPORTED: 'clipboard_not_supported',
  CLIPBOARD_PERMISSION_DENIED: 'clipboard_permission_denied',
  CLIPBOARD_WRITE_FAILED: 'clipboard_write_failed',
  
  // 解析错误
  TWEET_NOT_FOUND: 'tweet_not_found',
  TWEET_PARSE_FAILED: 'tweet_parse_failed',
  THREAD_PARSE_FAILED: 'thread_parse_failed',
  
  // 网络错误
  NETWORK_ERROR: 'network_error',
  TIMEOUT_ERROR: 'timeout_error',
  
  // DOM 错误
  ELEMENT_NOT_FOUND: 'element_not_found',
  INVALID_ELEMENT: 'invalid_element',
  
  // 权限错误
  PERMISSION_DENIED: 'permission_denied',
  SECURITY_ERROR: 'security_error',
  
  // 通用错误
  UNKNOWN_ERROR: 'unknown_error',
  OPERATION_FAILED: 'operation_failed'
} as const;

export const SUCCESS_MESSAGES = {
  TWEET_COPIED: 'tweet_copied',
  THREAD_COPIED: 'thread_copied',
  SCREENSHOT_SAVED: 'screenshot_saved',
  SETTINGS_SAVED: 'settings_saved',
  HISTORY_CLEARED: 'history_cleared'
} as const;

export const API_ENDPOINTS = {
  // 如果需要后端服务，这里定义API端点
  BASE_URL: 'https://api.example.com',
  HEALTH_CHECK: '/health',
  ANALYTICS: '/analytics'
} as const;

export const REGEX_PATTERNS = {
  // 常用正则表达式
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  URL: /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/,
  WHITESPACE: /\s+/g,
  HTML_TAGS: /<[^>]*>/g,
  UNICODE_EMOJI: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
} as const;

export const FILE_EXTENSIONS = {
  IMAGE: {
    PNG: '.png',
    JPG: '.jpg',
    JPEG: '.jpeg',
    WEBP: '.webp',
    GIF: '.gif'
  },
  DOCUMENT: {
    HTML: '.html',
    MD: '.md',
    TXT: '.txt',
    JSON: '.json'
  }
} as const;

export const MIME_TYPES = {
  IMAGE: {
    PNG: 'image/png',
    JPG: 'image/jpeg',
    WEBP: 'image/webp',
    GIF: 'image/gif'
  },
  TEXT: {
    HTML: 'text/html',
    PLAIN: 'text/plain',
    MARKDOWN: 'text/markdown',
    JSON: 'application/json'
  }
} as const;