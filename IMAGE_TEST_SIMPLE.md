# 图片复制功能测试

## 🧪 快速测试步骤

### 1. 安装扩展
```bash
npm run build
# 在Chrome中加载 .output/chrome-mv3 目录
```

### 2. 配置设置
- 点击扩展图标
- 选择"富文本格式 (带样式)"
- 勾选"媒体内容"
- 点击"保存设置"

### 3. 测试复制
1. 打开 [Twitter](https://twitter.com)
2. 找到包含图片的推文
3. 打开浏览器开发者工具 (F12)
4. 点击推文的复制按钮 📋
5. 观察控制台输出

### 4. 验证粘贴
- 打开Word或记事本
- 按 Ctrl+V 粘贴
- 检查是否显示图片

## 🔍 预期的控制台输出

### 正常情况：
```
Twitter Super Copy - Content Script Loaded
Found 3 new tweets to add copy buttons
Tweet has 2 images: ["https://pbs.twimg.com/media/...", "https://pbs.twimg.com/media/..."]
Copying tweet with data: {hasImages: true, imageCount: 2, format: "html", includeMedia: true}
Starting rich text copy with data: {...}
Formatting HTML with embedded images...
Processing 2 images for HTML embedding
Starting to download 2 images as base64
Processing image 1/2: https://pbs.twimg.com/media/...
Converted image URL: https://pbs.twimg.com/media/...?format=jpg&name=medium
Fetching image from: https://pbs.twimg.com/media/...?format=jpg&name=medium
Image fetch response: 200 OK Content-Type: image/jpeg
Image blob created: 45678 bytes, type: image/jpeg
Converting image to PNG format...
Image dimensions: 1200 x 800
Successfully converted to PNG: 234567 bytes
Image 1 converted to PNG base64, length: 312756
...
Base64 download complete. Successfully processed: 2 out of 2 images
Successfully embedded 2 images in HTML
Attempting to copy with images...
Downloading first image: https://pbs.twimg.com/media/...?format=jpg&name=medium
Image downloaded successfully: 45678 bytes, type: image/jpeg
Converting image to PNG format...
Image converted to PNG: 234567 bytes
Clipboard data prepared: ["text/html", "text/plain", "image/png"]
Successfully copied with images!
```

### 异常情况：
```
Image fetch response: 403 Forbidden Content-Type: text/html
Image download failed or empty, falling back to HTML only
Converting image to PNG format...
Error loading image for conversion: Error: ...
Image conversion to PNG failed, falling back to HTML only
Failed to copy with images: NotAllowedError: ...
Copying HTML only...
Successfully copied HTML content!
```

## ❌ 常见问题

### 问题1: 找不到图片
**控制台显示**: `Tweet has 0 images`
**解决方案**: 确保推文确实包含图片，检查选择器是否正确

### 问题2: 图片下载失败
**控制台显示**: `Image fetch response: 403 Forbidden`
**解决方案**: Twitter可能限制了图片访问，这是正常现象

### 问题3: 复制失败
**控制台显示**: `Failed to copy as rich text`
**解决方案**: 检查剪贴板权限，尝试刷新页面

## ✅ 成功标志

1. **控制台显示**: `Successfully copied with images!` 或 `Successfully copied HTML content!`
2. **通知显示**: "已复制！(含图片)" 或 "已复制！"
3. **粘贴测试**: 在Word中能看到格式化内容和图片

## 🐛 如果仍然失败

1. **检查网络**: 确保能访问Twitter
2. **检查权限**: 确保扩展有必要权限
3. **尝试不同推文**: 有些推文的图片可能有访问限制
4. **查看完整日志**: 复制所有控制台输出用于调试

---

**通过详细的控制台日志，我们可以准确定位问题所在！** 🔧