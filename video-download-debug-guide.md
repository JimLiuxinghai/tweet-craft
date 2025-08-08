# Twitter视频下载按钮调试指南

## 🔍 问题诊断步骤

### 1. 基础检查

在浏览器控制台中运行以下命令来检查基本状态：

```javascript
// 检查扩展是否加载
console.log('Extension loaded:', !!window.tweetCraftVideoDetector);

// 检查视频检测器状态
if (window.tweetCraftVideoDetector) {
  console.log('Detection stats:', window.tweetCraftVideoDetector.getDetectionStats());
}
```

### 2. 运行调试脚本

复制并运行 `debug-video-detection.js` 中的代码：

```javascript
// 运行完整的调试检查
window.debugVideoDetection.runAllChecks();
```

### 3. 强制添加按钮

如果检测失败，可以强制添加按钮：

```javascript
// 方法1: 使用扩展的强制检测
if (window.tweetCraftVideoDetector) {
  const added = window.tweetCraftVideoDetector.forceDetectAllVideos();
  console.log(`Added ${added} download buttons`);
}

// 方法2: 使用独立的强制脚本
window.forceAddVideoButtons();
```

## 🛠️ 常见问题及解决方案

### 问题1: 视频检测不到

**症状**: 页面有视频但检测器找不到

**解决方案**:
```javascript
// 检查视频元素
document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"], video').length;

// 手动触发检测
if (window.tweetCraftVideoDetector) {
  window.tweetCraftVideoDetector.detectVideos();
}
```

### 问题2: 找不到操作栏

**症状**: 检测到视频但无法找到操作栏添加按钮

**解决方案**:
```javascript
// 检查操作栏
document.querySelectorAll('[role="group"]').forEach((group, index) => {
  const buttons = group.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
  console.log(`Group ${index}: ${buttons.length} buttons`, group);
});
```

### 问题3: 按钮重复添加

**症状**: 同一个推文有多个下载按钮

**解决方案**:
```javascript
// 清理重复按钮
document.querySelectorAll('.tweet-craft-video-download-btn').forEach((btn, index) => {
  if (index > 0 && btn.parentElement?.parentElement === 
      document.querySelectorAll('.tweet-craft-video-download-btn')[0].parentElement?.parentElement) {
    btn.parentElement?.remove();
  }
});
```

### 问题4: 扩展未加载

**症状**: `window.tweetCraftVideoDetector` 未定义

**解决方案**:
1. 检查扩展是否已安装并启用
2. 刷新页面
3. 检查控制台是否有错误信息

## 🔧 手动修复脚本

### 完整的手动修复脚本

```javascript
function manualVideoButtonFix() {
  console.log('🔧 Starting manual video button fix...');
  
  let fixed = 0;
  
  // 查找所有推文
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  
  tweets.forEach((tweet, index) => {
    // 检查是否有视频
    const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    
    if (hasVideo) {
      // 查找操作栏
      const actionBars = tweet.querySelectorAll('[role="group"]');
      let bestActionBar = null;
      let maxButtons = 0;
      
      actionBars.forEach(bar => {
        const buttons = bar.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
        if (buttons.length > maxButtons) {
          maxButtons = buttons.length;
          bestActionBar = bar;
        }
      });
      
      if (bestActionBar && maxButtons >= 3) {
        // 检查是否已有下载按钮
        if (!bestActionBar.querySelector('.tweet-craft-video-download-btn')) {
          // 创建下载按钮
          const button = document.createElement('div');
          button.className = 'tweet-craft-video-download-btn';
          button.innerHTML = `
            <svg viewBox="0 0 24 24" width="18" height="18" style="color: rgb(113, 118, 123);">
              <path d="M12 16L7 11h3V3h4v8h3l-5 5z" fill="currentColor"/>
              <path d="M5 20v-2h14v2H5z" fill="currentColor"/>
            </svg>
          `;
          
          Object.assign(button.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          });
          
          button.addEventListener('click', () => {
            alert('视频下载功能触发！');
          });
          
          // 创建包装器
          const wrapper = document.createElement('div');
          wrapper.className = 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0';
          wrapper.appendChild(button);
          
          bestActionBar.appendChild(wrapper);
          fixed++;
          
          console.log(`✅ Fixed tweet ${index + 1}`);
        }
      }
    }
  });
  
  console.log(`🎉 Manual fix complete! Fixed ${fixed} tweets`);
  return fixed;
}

// 运行修复
manualVideoButtonFix();
```

## 📊 监控和维护

### 定期检查脚本

```javascript
function monitorVideoButtons() {
  setInterval(() => {
    const stats = {
      tweets: document.querySelectorAll('[data-testid="tweet"]').length,
      videos: document.querySelectorAll('[data-testid="previewInterstitial"]').length,
      buttons: document.querySelectorAll('.tweet-craft-video-download-btn').length
    };
    
    console.log('📊 Video button stats:', stats);
    
    // 如果视频数量大于按钮数量，触发修复
    if (stats.videos > stats.buttons) {
      console.log('🚨 Missing video buttons detected, running fix...');
      manualVideoButtonFix();
    }
  }, 10000); // 每10秒检查一次
}

// 启动监控
monitorVideoButtons();
```

## 🎯 最佳实践

1. **优先使用扩展的内置方法**
2. **在修复前先运行诊断**
3. **避免重复添加按钮**
4. **定期清理和重新检测**
5. **保存调试日志以便分析**

## 🆘 紧急修复

如果所有方法都失败，使用这个紧急修复脚本：

```javascript
// 紧急修复 - 强制为所有视频添加按钮
document.querySelectorAll('[data-testid="previewInterstitial"]').forEach(video => {
  const tweet = video.closest('[data-testid="tweet"], article');
  if (tweet) {
    const actionBar = tweet.querySelector('[role="group"]');
    if (actionBar && !actionBar.querySelector('.emergency-download-btn')) {
      const btn = document.createElement('button');
      btn.className = 'emergency-download-btn';
      btn.textContent = '📥';
      btn.style.cssText = 'margin-left: 10px; padding: 5px; border: none; background: #1d9bf0; color: white; border-radius: 50%; cursor: pointer;';
      btn.onclick = () => alert('Emergency download triggered!');
      actionBar.appendChild(btn);
    }
  }
});
```

这个指南应该能帮助诊断和解决视频下载按钮不显示的问题。