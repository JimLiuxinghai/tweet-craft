# 图片复制调试指南

## 🐛 调试图片复制问题

### 问题现象
- 复制时显示"已复制！"但没有"(含图片)"
- 粘贴时只有文字，没有图片
- 图片显示为链接而非实际图片

### 调试步骤

#### 1. 检查图片检测
```javascript
// 在浏览器控制台运行以下代码
const tweets = document.querySelectorAll('[data-testid="tweet"]');
tweets.forEach((tweet, index) => {
  const images = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
  if (images.length > 0) {
    console.log(`Tweet ${index} has ${images.length} images:`);
    images.forEach(img => console.log('  -', img.src));
  }
});
```

#### 2. 检查扩展设置
```javascript
// 检查当前设置
browser.storage.sync.get('copySettings').then(result => {
  console.log('Current settings:', result.copySettings);
});
```

#### 3. 手动测试图片下载
```javascript
// 测试图片URL是否可访问
async function testImageUrl(url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    console.log('Image fetch result:', response.status, response.statusText);
    if (response.ok) {
      const blob = await response.blob();
      console.log('Image blob:', blob.size, 'bytes, type:', blob.type);
    }
  } catch (error) {
    console.error('Image fetch error:', error);
  }
}

// 使用示例
testImageUrl('https://pbs.twimg.com/media/YOUR_IMAGE_ID?format=jpg&name=large');
```

#### 4. 检查剪贴板权限
```javascript
// 检查剪贴板权限
navigator.permissions.query({name: 'clipboard-write'}).then(result => {
  console.log('Clipboard write permission:', result.state);
});
```

### 常见问题及解决方案

#### 问题1: 图片选择器不正确
**现象**: 控制台显示"Tweet has 0 images"但推文明显有图片

**解决方案**: 
1. 检查Twitter是否更新了DOM结构
2. 更新图片选择器：`[data-testid="tweetPhoto"] img`

#### 问题2: CORS错误
**现象**: 控制台显示CORS相关错误

**解决方案**:
1. 确保manifest.json中包含了正确的host_permissions
2. 检查图片URL是否正确

#### 问题3: 图片格式不支持
**现象**: 图片下载成功但剪贴板写入失败

**解决方案**:
1. 检查图片MIME类型
2. 确保使用正确的剪贴板格式

#### 问题4: 应用不支持富文本
**现象**: 粘贴时只显示纯文本

**解决方案**:
1. 尝试在Word或Outlook中测试
2. 使用"粘贴特殊格式"选项

### 测试用推文

以下是一些适合测试的推文类型：

1. **单张图片推文**: 包含一张图片的普通推文
2. **多张图片推文**: 包含2-4张图片的推文
3. **图文混合推文**: 既有文字又有图片的推文
4. **纯图片推文**: 只有图片没有文字的推文

### 预期行为

#### 正常情况下的控制台输出：
```
Twitter Super Copy - Content Script Loaded
Found 5 new tweets to add copy buttons
Tweet has 2 images: ["https://pbs.twimg.com/media/...", "https://pbs.twimg.com/media/..."]
Copying tweet with data: {hasImages: true, imageCount: 2, format: "html", includeMedia: true}
Downloading image: https://pbs.twimg.com/media/...?format=jpg&name=large
Image downloaded, size: 156789 type: image/jpeg
Image converted to base64, length: 209052
Total images downloaded: 2
```

#### 异常情况的处理：
```
Failed to download image: https://pbs.twimg.com/media/... Error: ...
Failed to copy with images, falling back to text only: Error: ...
```

### 手动验证步骤

1. **打开Twitter页面**
2. **打开开发者工具 (F12)**
3. **找到包含图片的推文**
4. **点击复制按钮**
5. **检查控制台输出**
6. **在Word中粘贴验证**

### 报告问题时请提供

1. **浏览器版本和操作系统**
2. **扩展版本**
3. **控制台错误信息**
4. **测试推文的URL**
5. **复制设置截图**

---

**通过这些调试步骤，我们可以快速定位图片复制问题的根本原因！** 🔍