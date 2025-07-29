# 媒体内容提取测试指南

## 🎯 新的媒体提取功能

基于提供的 `extractMedia` 方法，现在插件可以提取和处理多种类型的媒体内容：

### 📷 支持的媒体类型
- **图片**: Twitter/X 上传的图片 (pbs.twimg.com)
- **视频**: 推文中的视频内容
- **链接**: 外部链接 (t.co, twitter.com, x.com)

## 🧪 测试步骤

### 1. 准备测试推文
找到包含不同媒体类型的推文：
- 纯文本推文
- 包含图片的推文
- 包含视频的推文
- 包含外部链接的推文
- 包含多种媒体的推文

### 2. 查看媒体提取日志
打开开发者工具，复制推文时观察：

```
Extracting tweet data from element...
Extracting media content...
Found 2 images
Found 1 videos  
Found 3 links
Media extraction complete: {images: 2, videos: 1, links: 3}
Extracted tweet data: {
  author: "用户名",
  contentLength: 156,
  mediaCount: {
    images: 2,
    videos: 1, 
    links: 3
  },
  url: "https://twitter.com/..."
}
```

### 3. 验证复制内容

#### HTML格式复制应包含：
```html
<div style="margin: 12px 0;">
  <!-- 图片链接 -->
  <div style="margin: 8px 0;">
    <a href="..." style="...">📷 查看图片 1</a>
  </div>
  <div style="margin: 8px 0;">
    <a href="..." style="...">📷 查看图片 2</a>
  </div>
  
  <!-- 视频链接 -->
  <div style="margin: 8px 0;">
    <a href="..." style="...">🎥 查看视频 1</a>
  </div>
  
  <!-- 外部链接 -->
  <div style="margin: 8px 0;">
    <a href="..." style="...">🔗 链接文本</a>
  </div>
</div>
```

#### Markdown格式复制应包含：
```markdown
**媒体:**
![图片 1](https://pbs.twimg.com/media/...)
![图片 2](https://pbs.twimg.com/media/...)
[🎥 视频 1](https://video.twimg.com/...)
[链接文本](https://t.co/...)
```

#### 纯文本格式复制应包含：
```
媒体内容:
图片 1: https://pbs.twimg.com/media/...
图片 2: https://pbs.twimg.com/media/...
视频 1: https://video.twimg.com/...
链接 1: 链接文本 - https://t.co/...
```

## 🔍 测试用例

### 测试用例1: 纯图片推文
- **预期**: `Found X images, Found 0 videos, Found 0 links`
- **验证**: 复制内容包含所有图片链接

### 测试用例2: 包含视频的推文
- **预期**: `Found 0 images, Found 1 videos, Found 0 links`
- **验证**: 复制内容包含视频链接

### 测试用例3: 包含外部链接的推文
- **预期**: `Found 0 images, Found 0 videos, Found X links`
- **验证**: 复制内容包含外部链接

### 测试用例4: 混合媒体推文
- **预期**: 各种媒体类型都被正确识别
- **验证**: 复制内容按类型分组显示

### 测试用例5: 无媒体推文
- **预期**: `Found 0 images, Found 0 videos, Found 0 links`
- **验证**: 复制内容不包含媒体部分

## ✅ 成功标志

1. **媒体检测**: 控制台显示正确的媒体数量
2. **内容格式**: 不同格式正确包含媒体信息
3. **链接有效**: 媒体链接可以正常访问
4. **图标正确**: 图片📷、视频🎥、链接🔗图标正确显示

## ❌ 常见问题

### 问题1: 媒体检测不准确
**现象**: `Found 0 images` 但推文明显有图片
**解决方案**: 检查选择器是否正确，Twitter可能更新了DOM结构

### 问题2: 外部链接过多
**现象**: 检测到过多不相关链接
**解决方案**: 检查链接过滤逻辑，确保排除推文本身链接

### 问题3: 视频检测失败
**现象**: 视频推文显示0个视频
**解决方案**: 检查视频选择器，Twitter视频可能使用不同结构

## 🎯 优势

### 更准确的媒体识别
- 使用专门的选择器定位不同媒体类型
- 提供详细的媒体信息（尺寸、时长等）
- 更好的错误处理和降级策略

### 更丰富的复制内容
- 支持多种媒体类型
- 不同格式有相应的媒体表示
- 保持链接的可访问性

### 更好的用户体验
- 清晰的媒体类型标识
- 有序的媒体内容组织
- 完整的推文信息保留

---

**新的媒体提取功能让复制的推文内容更加完整和丰富！** 🎉