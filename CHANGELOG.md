# Changelog

All notable changes to this project will be documented in this file.

## [1.0.2] - 2025-01-14

### 🔧 Fixed
- **Notion 保存失败问题**: 修复了推文保存到 Notion 时的各种错误
  - 增强了错误处理和日志记录
  - 改进了配置验证逻辑
  - 添加了详细的错误信息提示
  - 修复了背景脚本中的配置重载逻辑

### ✨ Added
- **视频下载按钮**: 实现了完整的视频下载功能
  - 添加了 `createVideoDownloadButton` 方法
  - 实现了智能视频检测逻辑
  - 集成了 TwitterVideoService 服务
  - 支持多种视频下载服务 (TweetDown, SaveTweet, TwitterVideoDownloader)
  - 只在包含视频的推文上显示下载按钮

### 🚀 Improved
- 优化了按钮插入逻辑，支持多个操作按钮
- 增强了错误处理和用户反馈
- 添加了详细的调试日志
- 改进了代码结构和模块化

### 🔐 Security
- 添加了视频下载服务的主机权限
- 添加了 webRequest 权限以支持网络拦截功能

## [1.0.1] - 2025-01-13

### 🔧 Fixed
- 修复了 Notion 集成的基础问题
- 改进了错误处理机制

## [1.0.0] - 2025-01-12

### 🎉 Initial Release
- Twitter/X 推文复制功能
- 多格式支持 (HTML, Markdown, 纯文本)
- 线程检测和复制
- 截图功能
- Notion 集成
- 多语言支持 (6种语言)
- 性能优化和内存管理