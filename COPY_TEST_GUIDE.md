# 复制功能测试指南

## 🧪 测试步骤

### 1. 重新加载扩展
- 在Chrome扩展管理页面点击"重新加载"
- 或者重新构建并安装：`npm run build`

### 2. 配置设置
- 点击扩展图标
- 选择"富文本格式 (带样式)"
- 勾选"媒体内容"
- 点击"保存设置"

### 3. 测试复制
1. 打开 [Twitter](https://twitter.com) 或 [X.com](https://x.com)
2. 找到任意推文（有图片或无图片都可以）
3. **打开开发者工具 (F12)**
4. 点击推文右下角的复制按钮 📋
5. 观察控制台输出

## 🔍 预期的控制台输出

### 基础复制流程：
```
=== STARTING TWEET COPY ===
Tweet data: {
  author: "用户名",
  content: "推文内容...",
  hasImages: true,
  imageCount: 2,
  videoCount: 0,
  linkCount: 1,
  imageUrls: ["https://pbs.twimg.com/media/...", "https://pbs.twimg.com/media/..."],
  format: "html",
  includeMedia: true
}
Using HTML format copy...
Starting rich text copy with data: {...}
Generated text content length: 156
Formatting basic HTML content...
Basic HTML formatted, length: 1234
Basic content copied successfully
Attempting enhanced copy with images...
Starting enhanced copy with images...
Formatting HTML with embedded images...
Processing 2 images for HTML embedding
...
=== TWEET COPY COMPLETED SUCCESSFULLY ===
```

### 如果没有媒体内容：
```
=== STARTING TWEET COPY ===
Tweet data: {
  hasImages: false,
  imageCount: 0,
  videoCount: 0,
  linkCount: 0,
  imageUrls: [],
  ...
}
Basic content copied successfully
=== TWEET COPY COMPLETED SUCCESSFULLY ===
```

### 如果有多种媒体类型：
```
Extracting media content...
Found 2 images
Found 1 videos
Found 3 links
Media extraction complete: {images: 2, videos: 1, links: 3}
```

## ✅ 验证复制结果

### 1. 检查通知
- 应该看到"已复制！"或"已复制！(含图片)"通知

### 2. 测试粘贴
- 打开记事本或Word
- 按 Ctrl+V 粘贴
- 应该看到格式化的推文内容

### 3. 检查内容
- 文本内容应该完整
- 如果有图片，应该看到图片链接或实际图片

## ❌ 故障排除

### 问题1: 没有控制台输出
**解决方案**: 
- 确保扩展已重新加载
- 刷新Twitter页面
- 检查扩展是否正确安装

### 问题2: 复制按钮不出现
**解决方案**:
- 检查控制台是否有"Found X new tweets to add copy buttons"
- 刷新页面重新加载content script

### 问题3: 复制失败
**控制台显示**: `=== TWEET COPY FAILED ===`
**解决方案**:
- 查看具体错误信息
- 检查剪贴板权限
- 尝试不同的推文

### 问题4: 图片处理失败
**控制台显示**: 图片下载或转换错误
**解决方案**:
- 这是正常现象，基础文本复制应该仍然成功
- 检查网络连接
- 尝试其他推文

## 🎯 成功标志

1. **控制台显示**: `=== TWEET COPY COMPLETED SUCCESSFULLY ===`
2. **通知显示**: "已复制！"消息
3. **粘贴测试**: 能在其他应用中粘贴内容

## 📝 测试报告

请测试以下场景并报告结果：

- [ ] 纯文本推文复制
- [ ] 包含图片的推文复制
- [ ] 长推文复制
- [ ] 包含链接的推文复制
- [ ] 不同格式选择（HTML/Markdown/纯文本）

---

**通过详细的日志，我们可以准确定位任何问题！** 🔧