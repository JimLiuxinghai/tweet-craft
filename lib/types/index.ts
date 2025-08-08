// 核心类型定义文件

export interface TweetData {
  id: string;
  author: {
    username: string;
    displayName: string;
    avatar?: string;
  };
  content: string;
  timestamp: Date;
  metrics: {
    likes: number;
  retweets: number;
    replies: number;
  };
  media: MediaItem[];
  isThread: boolean;
  threadPosition?: number;
  threadId?: string;
  url: string;
  quotedTweet?: QuotedTweetData;
}

export interface QuotedTweetData {
  id: string;
  author: {
    username: string;
    displayName: string;
  avatar?: string;
  };
content: string;
  timestamp?: Date;
  media?: MediaItem[];
  url: string;
}

export interface MediaItem {
  type: 'image' | 'video' | 'gif';
  url: string;
  previewUrl?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export interface FormatOptions {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMetrics: boolean;
  includeMedia: boolean;
  includeLink: boolean;
}

export interface ExtensionSettings {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMetrics: boolean;
  includeMedia: boolean;
  includeLink: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
  enableKeyboardShortcuts: boolean;
  enableContextMenu: boolean;
  enableThreadDetection: boolean;
  screenshotOptions: {
    backgroundColor?: string;
    backgroundGradient?: {
      type: 'linear' | 'radial';
      direction?: string;
      colors: string[];
    };
    useContentOptions: boolean;
  };
  videoDownloadSettings?: {
    autoDownload: boolean;
    defaultQuality: 'highest' | 'medium' | 'lowest' | 'ask';
    showProgress: boolean;
    notifications: boolean;
    customPath?: string;
    filenameTemplate?: string;
  };
}


export interface ScreenshotOptions {
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  theme: 'light' | 'dark' | 'auto';
  includeMetrics: boolean;
  customWidth?: number;
  customHeight?: number;
  scale: number;
  backgroundColor?: string;
  backgroundGradient?: {
    type: 'linear' | 'radial';
    direction?: string;
    colors: string[];
  };
  useContentOptions?: boolean;
}

export interface ThreadData {
  id: string;
  tweets: TweetData[];
  totalCount: number;
  author: {
    username: string;
    displayName: string;
  };
  createdAt: Date;
  isComplete: boolean;
}

export interface ParsedTweetElement {
  element: HTMLElement;
  data: TweetData;
  isProcessed: boolean;
  lastUpdated: Date;
}

export interface ClipboardCapability {
  writeText: boolean;
  writeHTML: boolean;
  writeImage: boolean;
}

export interface LocaleData {
  [key: string]: string;
}

export interface I18nConfig {
  defaultLocale: string;
  supportedLocales: string[];
  fallbackLocale: string;
}

export interface ErrorInfo {
  type: 'clipboard' | 'parser' | 'network' | 'dom' | 'permission' | 'unknown';
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  url?: string;
}

export interface PerformanceMetrics {
  parseTime: number;
  formatTime: number;
  copyTime: number;
  totalTime: number;
  tweetCount: number;
  memoryUsage?: number;
}

// 消息通信接口
export interface MessageBase {
  type: string;
  id?: string;
  timestamp: Date;
}

export interface CopyTweetMessage extends MessageBase {
  type: 'COPY_TWEET';
  tweetId: string;
  format: 'html' | 'markdown' | 'text';
  options: FormatOptions;
}

export interface CopyThreadMessage extends MessageBase {
  type: 'COPY_THREAD';
  threadId: string;
  format: 'html' | 'markdown' | 'text';
  options: FormatOptions;
}

export interface SettingsUpdateMessage extends MessageBase {
  type: 'SETTINGS_UPDATE';
  settings: Partial<ExtensionSettings>;
}


export interface ErrorMessage extends MessageBase {
  type: 'ERROR';
  error: ErrorInfo;
}

export interface SuccessMessage extends MessageBase {
  type: 'SUCCESS';
  message: string;
  data?: any;
}

export type ExtensionMessage = 
  | CopyTweetMessage 
  | CopyThreadMessage 
  | SettingsUpdateMessage 
  | ErrorMessage 
  | SuccessMessage;

// 常量定义
export const DEFAULT_SETTINGS: ExtensionSettings = {
  format: 'html',
  includeAuthor: true,
  includeTimestamp: true,
  includeMetrics: false,
  includeMedia: true,
  includeLink: true,
  language: 'auto',
  theme: 'auto',
  enableKeyboardShortcuts: true,
  enableContextMenu: true,
  enableThreadDetection: true,
  screenshotOptions: {
    backgroundGradient: {
      type: 'linear',
      direction: 'to bottom right',
      colors: ['#667eea', '#764ba2']
    },
    useContentOptions: true
  },
  videoDownloadSettings: {
    autoDownload: false,
    defaultQuality: 'ask',
    showProgress: true,
    notifications: true
  }
};

export const SUPPORTED_LOCALES = ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr'];

export const TWITTER_DOMAINS = ['twitter.com', 'x.com'];

export const COPY_FORMATS = {
  HTML: 'html',
  MARKDOWN: 'markdown',
  TEXT: 'text'
} as const;

export const SCREENSHOT_FORMATS = {
  PNG: 'png',
  JPG: 'jpg',
  WEBP: 'webp'
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  AUTO: 'auto'
} as const;

export const ERROR_TYPES = {
  CLIPBOARD: 'clipboard',
  PARSER: 'parser',
  NETWORK: 'network',
  DOM: 'dom',
  PERMISSION: 'permission',
  UNKNOWN: 'unknown'
} as const;

export const MESSAGE_TYPES = {
  COPY_TWEET: 'COPY_TWEET',
  COPY_THREAD: 'COPY_THREAD',
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
} as const;

// 实用工具类型
export type ValueOf<T> = T[keyof T];
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = T & Partial<Pick<T, K>>;