# Twitter 超级复制插件

一个功能强大的Chrome/Edge浏览器插件，为Twitter/X.com提供增强的复制功能，支持一键复制带格式的推文内容。

## ✨ 主要特性

### 🎯 核心功能
- **一键复制推文** - 点击推文旁的复制按钮或使用快捷键
- **纯净内容复制** - 默认只复制推文内容，不含用户名等额外信息
- **智能线程复制** - 自动检测推文线程，一键复制完整线程内容
- **多种格式支持** - HTML、Markdown、纯文本格式
- **灵活配置选项** - 可选择包含作者、时间、媒体等信息
- **智能内容解析** - 准确提取和格式化推文各种元素

### 🎨 用户体验
- **现代化UI设计** - 无缝集成到Twitter界面
- **多语言界面** - 支持6种语言（中、英、日、韩、西、法）
- **深色模式适配** - 自动适应系统主题
- **响应式设计** - 支持各种屏幕尺寸
- **实时反馈** - 复制状态动画和通知提示

### ⚙️ 个性化设置
- **格式选择** - HTML、Markdown、纯文本
- **语言选择** - 自动检测或手动选择界面语言
- **内容配置** - 可选择包含媒体、互动数据等
- **复制历史** - 查看和管理复制记录
- **快捷键支持** - Ctrl+Shift+C 快速复制

## 🚀 安装方法

### 开发者模式安装（当前）
1. 下载或克隆此项目到本地
2. 打开Chrome浏览器，进入 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择项目根目录
6. 插件安装完成！

### 商店安装（即将上线）
- Chrome Web Store: 即将发布
- Edge Add-ons: 即将发布

## 📖 使用指南

### 基本操作

#### 1. 复制单个推文
- **方法一**: 点击推文右下角的复制按钮 📋
- **方法二**: 使用快捷键 `Ctrl + Shift + C`
- **方法三**: 右键点击推文区域，选择"复制推文"

#### 2. 复制推文线程 🧵
- **智能识别**: 插件自动识别推文线程（数字编号、自回复等）
- **视觉指示**: 线程推文显示特殊的🧵图标和位置指示器
- **选择复制**: 点击线程推文的复制按钮，选择：
  - "复制整个线程" - 获取完整的格式化线程内容
  - "只复制这条" - 仅复制当前推文
- **格式化输出**: 线程包含标题、编号、分隔符和统计信息

#### 3. 设置复制格式
1. 点击浏览器工具栏的插件图标
2. 在弹窗中选择所需的复制格式：
   - **HTML格式**: 保留样式和链接，适合富文本编辑器
   - **Markdown格式**: 适合笔记应用和文档编辑
   - **纯文本格式**: 仅包含文字内容

#### 4. 语言设置 🌍
1. 点击浏览器工具栏的插件图标
2. 在设置面板底部找到"语言"选项
3. 可以选择：
   - **自动检测** - 根据浏览器语言自动选择
   - **English** - 英语界面
   - **简体中文** - 中文界面
   - **日本語** - 日语界面
   - **한국어** - 韩语界面
   - **Español** - 西班牙语界面
   - **Français** - 法语界面

#### 5. 自定义复制内容
在设置面板中可以选择包含：
- ✅ 媒体信息（图片、视频链接）
- ✅ 互动数据（点赞、转发、回复数）
- ✅ 作者信息
- ✅ 发布时间

#### 6. 查看复制历史
1. 点击插件图标打开设置面板
2. 点击"复制历史"按钮
3. 可以重新复制历史记录或清空历史

### 高级功能

#### 快捷键操作
- `Ctrl + Shift + C` (Windows/Linux)
- `Cmd + Shift + C` (Mac)

#### 右键菜单
在Twitter页面右键点击可以看到：
- 复制为HTML格式
- 复制为Markdown格式  
- 复制为纯文本

## 🎨 输出示例

### 线程复制格式
```html
<div class="tweet-thread">
  <div class="thread-header">
    <h3>🧵 用户名 (@username) 的推文线程 (共 3 条)</h3>
  </div>
  
  <div class="thread-number">1/3</div>
  <div class="tweet-copy">
    <div class="tweet-header">
      <strong>用户名</strong>
      <span>@username</span>
      <span>2024/01/01 12:00</span>
    </div>
    <div class="tweet-content">这是线程的第一条推文...</div>
  </div>
  
  <div class="thread-separator"></div>
  <div class="thread-number">2/3</div>
  <div class="tweet-copy">
    <div class="tweet-content">这是线程的第二条推文...</div>
  </div>
  
  <div class="thread-summary">📊 线程总结: 3 条推文</div>
</div>
```

### 单条推文 - HTML格式
```html
<div class="tweet-copy">
  <div class="tweet-header">
    <strong>用户名</strong>
    <span>@username</span>
    <span>2024/01/01 12:00</span>
  </div>
  <div class="tweet-content">这是推文内容...</div>
  <div class="tweet-link">
    <a href="https://twitter.com/username/status/123">查看原推文</a>
  </div>
</div>
```

### Markdown格式
```markdown
**用户名** (@username)
*2024/01/01 12:00*

这是推文内容...

[查看原推文](https://twitter.com/username/status/123)
```

### 纯文本格式
```
用户名 (@username)
2024/01/01 12:00

这是推文内容...

原推文: https://twitter.com/username/status/123
```

## 🔧 技术架构

### 项目结构
```
twitter-enhancer/
├── manifest.json          # 插件配置
├── popup/                 # 弹窗界面
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/               # 内容脚本
│   ├── content.js
│   └── content.css
├── background/            # 后台脚本
│   └── background.js
├── utils/                 # 工具模块
│   ├── parser.js          # 推文解析器
│   ├── formatter.js       # 格式化工具
│   └── clipboard.js       # 剪贴板操作
└── assets/               # 资源文件
    └── icons/
```

### 核心技术
- **Manifest V3** - 最新的Chrome扩展标准
- **Vanilla JavaScript** - 无框架依赖，性能优化
- **CSS3** - 现代样式和动画
- **Chrome Extensions API** - 剪贴板、存储、消息传递

## 🛠️ 开发计划

### Phase 1 (MVP) ✅ 已完成
- [x] 基础插件架构
- [x] 推文内容解析
- [x] HTML格式复制
- [x] UI按钮注入
- [x] 弹窗界面
- [x] 设置管理

### Phase 2 (增强功能) ✅ 已完成
- [x] Markdown格式支持
- [x] **推文线程智能复制** 🧵
  - [x] 自动线程检测（数字模式、自回复、连续性）
  - [x] 视觉化线程指示器
  - [x] 用户友好的选择界面
  - [x] 完整线程格式化
  - [x] 特殊视觉反馈
- [x] 复制历史管理
- [x] 多格式输出优化
- [ ] 图片媒体处理增强
- [ ] 批量操作功能

### Phase 3 (完善优化)
- [ ] 性能优化
- [ ] 错误处理完善
- [ ] 用户体验优化
- [ ] 国际化支持

## 🔐 隐私与安全

- **本地处理**: 所有数据处理在本地进行，不上传服务器
- **最小权限**: 仅申请必要的浏览器权限
- **开源透明**: 代码完全开源，欢迎审查
- **无追踪**: 不收集任何用户数据

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 开发环境设置
1. 克隆项目：`git clone [项目地址]`
2. 在Chrome中加载扩展进行测试
3. 修改代码后重新加载扩展

### 提交规范
- 使用清晰的提交信息
- 遵循现有代码风格
- 添加适当的注释

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 📞 支持与反馈

- **问题反馈**: 请在GitHub Issues中提交
- **功能建议**: 欢迎提出新的功能想法
- **使用帮助**: 查看本文档或在Issues中询问

---

**让复制推文变得简单而优雅！** ✨
