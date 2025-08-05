# Twitter 超级复制插件 - 设计方案

## 1. 项目目标

基于 WXT 框架开发一个功能强大的 Twitter/X.com 浏览器扩展，提供增强的推文复制功能，包括：
- 一键复制推文内容（多种格式）
- 智能线程检测与复制
- 推文截图功能
- 多语言支持
- 丰富的配置选项

## 2. 技术架构设计

### 2.1 WXT 框架适配

将 `system.md` 中描述的传统扩展架构适配到 WXT 框架：

```
entrypoints/
├── background.ts       # 后台服务层
├── content.ts          # 内容脚本入口
└── popup/            # 用户界面层
    ├── index.html
    ├── main.ts
    └── style.css

lib/          # 核心功能库
├── i18n/              # 国际化层
├── utils/       # 工具函数层
├── screenshot/      # 截图功能层
└── types/             # TypeScript 类型定义

components/            # UI 组件
├── popup/# 弹窗组件
└── content/           # 内容脚本组件
```

### 2.2 核心模块设计

#### 2.2.1 推文解析器 (TweetParser)
```typescript
interface TweetData {
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
  url: string;
}
```

#### 2.2.2 内容格式化器 (ContentFormatter)
```typescript
interface FormatOptions {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMetrics: boolean;
  includeMedia: boolean;
  includeLink: boolean;
}

class ContentFormatter {
  formatTweet(tweet: TweetData, options: FormatOptions): string;
  formatThread(tweets: TweetData[], options: FormatOptions): string;
}
```

#### 2.2.3 剪贴板管理器 (ClipboardManager)
```typescript
class ClipboardManager {
  async copyToClipboard(content: string, format: 'html' | 'text'): Promise<void>;
  async copyAsHTML(htmlContent: string, textFallback: string): Promise<void>;
  saveToHistory(content: string, format: string): void;
  getHistory(): CopyHistoryItem[];
}
```

#### 2.2.4 截图管理器 (ScreenshotManager)
```typescript
interface ScreenshotOptions {
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  theme: 'light' | 'dark' | 'auto';
  includeMetrics: boolean;
  customWidth?: number;
}

class ScreenshotManager {
  async captureTweet(tweetElement: HTMLElement, options: ScreenshotOptions): Promise<Blob>;
  async captureThread(threadElements: HTMLElement[], options: ScreenshotOptions): Promise<Blob>;
}
```

## 3. 功能模块详细设计

### 3.1 用户界面 (Popup)

#### 3.1.1 界面布局
```
┌─────────────────────────────────────┐
│      Twitter 超级复制           │
├─────────────────────────────────────┤
│  [复制当前推文] [查看复制历史]        │
├─────────────────────────────────────┤
│ 格式设置:        │
│  ○ HTML  ○ Markdown  ○ 纯文本      │
├─────────────────────────────────────┤
│ 内容选项:  │
│  ☑ 包含作者信息  ☑ 包含时间戳       │
│  ☑ 包含互动数据  ☑ 包含媒体信息  │
├─────────────────────────────────────┤
│ 快捷键: Ctrl+Shift+C        │
├─────────────────────────────────────┤
│ 语言: [中文 ▼]           │
└─────────────────────────────────────┘
```

#### 3.1.2 核心组件
- **QuickActions**: 快速操作按钮组
- **FormatSelector**: 格式选择器
- **ContentOptions**: 内容选项配置
- **CopyHistory**: 复制历史记录
- **LanguageSelector**: 语言选择器

### 3.2 内容脚本 (Content Script)

#### 3.2.1 功能模块
```typescript
class TwitterContentScript {
  private tweetParser: TweetParser;
  private uiManager: UIManager;
  private performanceManager: PerformanceManager;
  private errorManager: ErrorManager;

  initialize(): void;
  injectCopyButtons(): void;
  handleCopyClick(tweetElement: HTMLElement): void;
  detectAndHandleThread(tweetElement: HTMLElement): void;
  setupKeyboardShortcuts(): void;
}
```

#### 3.2.2 UI 注入策略
1. **推文检测**: 使用 MutationObserver 监听推文加载
2. **按钮注入**: 在推文操作栏添加复制按钮
3. **线程标识**: 为线程推文添加特殊标识
4. **性能优化**: 批量处理、防抖、虚拟滚动

### 3.3 后台脚本 (Background)

#### 3.3.1 核心功能
```typescript
class BackgroundService {
  setupContextMenus(): void;
  handleMessage(message: any, sender: any): Promise<any>;
  manageSettings(): void;
  scheduleCleanup(): void;
}
```

#### 3.3.2 右键菜单
```
复制推文 ├── 复制为 HTML 格式
        ├── 复制为 Markdown 格式
        └── 复制为纯文本格式
```

## 4. 国际化设计

### 4.1 支持语言
- 中文 (zh-CN)
- English (en)
- 日本語 (ja)
- 한국어 (ko)
- Español (es)
- Français (fr)

### 4.2 国际化实现
```typescript
interface LocaleData {
  [key: string]: string;
}

class I18nManager {
  private currentLocale: string;
  private localeData: Record<string, LocaleData>;
  
  t(key: string, params?: Record<string, any>): string;
  setLocale(locale: string): void;
  detectLocale(): string;
}
```

## 5. 性能优化策略

### 5.1 DOM 操作优化
- **批量处理**: 每次处理 10 个推文
- **IntersectionObserver**: 只处理可见推文
- **RequestAnimationFrame**: 优化动画性能
- **防抖处理**: 延迟 200ms 处理新推文

### 5.2 内存管理
- **LRU 缓存**: 最多缓存 200 个推文数据
- **定时清理**: 每 5 分钟清理过期缓存
- **弱引用**: 避免内存泄漏

### 5.3 错误处理
- **多级降级**: 剪贴板 API 降级策略
- **错误冷却**: 避免重复错误报告
- **用户反馈**: 提供友好的错误提示

## 6. 截图功能设计

### 6.1 技术方案
- **HTML2Canvas**: 核心截图库
- **Canvas 优化**: 高质量渲染
- **主题适配**: 支持浅色/深色主题
- **自定义样式**: 可配置的截图样式

### 6.2 截图模式
- **单推文截图**: 生成单条推文的精美截图
- **线程截图**: 生成完整线程的长截图
- **批量截图**: 支持多条推文批量截图

## 7. 数据存储设计

### 7.1 存储结构
```typescript
interface ExtensionSettings {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMetrics: boolean;
  includeMedia: boolean;
  language: string;
  theme: 'light' | 'dark' | 'auto';
}

interface CopyHistoryItem {
  id: string;
  content: string;
  format: string;
  timestamp: Date;
  tweetUrl: string;
  preview: string;
}
```

### 7.2 存储管理
- **Chrome Storage API**: 设置同步存储
- **本地存储**: 复制历史记录
- **容量控制**: 最多保存 50 条历史记录
- **数据压缩**: 优化存储空间

## 8. 安全性考虑

### 8.1 权限最小化
- 仅申请必要的浏览器权限
- 限制在 Twitter/X.com 域名运行
- 本地处理所有敏感数据

### 8.2 内容安全
- **XSS 防护**: HTML 内容转义
- **CORS 处理**: 安全的外部资源加载
- **CSP 兼容**: 符合内容安全策略

## 9. 开发计划

### Phase 1: 基础架构 (MVP)
1. 项目结构搭建
2. 基础推文解析
3. 简单复制功能
4. 基本 UI 界面

### Phase 2: 核心功能
1. 多格式输出
2. 线程检测与复制
3. 配置管理
4. 国际化支持

### Phase 3: 高级功能
1. 截图功能
2. 性能优化
3. 错误处理
4. 用户体验优化

### Phase 4: 完善与优化
1. 全面测试
2. 性能调优
3. 用户反馈处理
4. 发布准备

## 10. 质量保证

### 10.1 代码质量
- TypeScript 严格模式
- ESLint + Prettier 规范
- 详细的代码注释
- 模块化设计

### 10.2 测试策略
- 单元测试覆盖核心功能
- 集成测试验证用户流程
- 手动测试确保用户体验
- 跨浏览器兼容性测试

### 10.3 性能监控
- 内存使用监控
- 响应时间统计
- 错误率追踪
- 用户反馈收集

这个设计方案基于 WXT 框架的特点，将 system.md 中描述的复杂功能进行了现代化改造，确保代码的可维护性和扩展性。