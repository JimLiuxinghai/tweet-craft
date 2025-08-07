// 测试视频URL提取的脚本
// 在Twitter页面的浏览器控制台中运行

console.log('🧪 开始测试视频URL提取...');

// 1. 检查网络请求拦截
function testNetworkInterception() {
  console.log('\n🌐 测试网络请求拦截:');
  
  // 监听fetch请求
  const originalFetch = window.fetch;
  const capturedUrls = [];
  
  window.fetch = async function(...args) {
    const url = args[0];
    if (typeof url === 'string') {
      if (url.includes('video.twimg.com') || url.includes('.mp4') || url.includes('.m3u8')) {
        console.log('📹 捕获到视频URL:', url);
        capturedUrls.push(url);
      }
    }
    return originalFetch.apply(this, args);
  };
  
  console.log('✅ 网络拦截已设置，播放视频以捕获URL');
  
  // 5秒后恢复并显示结果
  setTimeout(() => {
    window.fetch = originalFetch;
    console.log('📋 捕获到的视频URLs:', capturedUrls);
  }, 5000);
}

// 2. 检查视频元素
function checkVideoElements() {
  console.log('\n🎬 检查页面中的视频元素:');
  
  const videoElements = document.querySelectorAll('video');
  console.log(`找到 ${videoElements.length} 个video元素`);
  
  videoElements.forEach((video, index) => {
    console.log(`Video ${index + 1}:`);
    console.log('  - src:', video.src);
    console.log('  - currentSrc:', video.currentSrc);
    console.log('  - poster:', video.poster);
    
    // 检查是否是有效的视频URL
    const src = video.src || video.currentSrc;
    if (src) {
      const isValid = !src.includes('twitter.com') && !src.includes('x.com') && 
                     (src.includes('video.twimg.com') || src.includes('.mp4') || src.includes('.webm'));
      console.log('  - 有效视频URL:', isValid ? '✅' : '❌');
    }
  });
}

// 3. 检查视频预览元素
function checkVideoPreviewElements() {
  console.log('\n🖼️ 检查视频预览元素:');
  
  const previewElements = document.querySelectorAll('[data-testid="previewInterstitial"]');
  console.log(`找到 ${previewElements.length} 个视频预览元素`);
  
  previewElements.forEach((preview, index) => {
    console.log(`Preview ${index + 1}:`);
    
    // 检查缩略图
    const img = preview.querySelector('img');
    if (img && img.src.includes('ext_tw_video_thumb')) {
      console.log('  - 缩略图URL:', img.src);
      
      // 尝试提取视频ID
      const match = img.src.match(/ext_tw_video_thumb\/(\d+)/);
      if (match) {
        console.log('  - 视频ID:', match[1]);
        
        // 构造可能的视频URL
        const possibleVideoUrl = `https://video.twimg.com/ext_tw_video/${match[1]}/pu/vid/`;
        console.log('  - 可能的视频URL前缀:', possibleVideoUrl);
      }
    }
    
    // 检查背景图片
    const bgElement = preview.querySelector('[style*="background-image"]');
    if (bgElement) {
      const style = bgElement.style.backgroundImage;
      console.log('  - 背景图片:', style);
    }
  });
}

// 4. 模拟视频下载URL验证
function validateVideoUrls(urls) {
  console.log('\n✅ 验证视频URLs:');
  
  urls.forEach((url, index) => {
    console.log(`URL ${index + 1}: ${url}`);
    
    // 检查是否是有效的视频URL
    const isTwitterPage = url.includes('twitter.com/') || url.includes('x.com/');
    const isVideoFile = url.includes('.mp4') || url.includes('.webm') || url.includes('.m3u8');
    const isVideoServer = url.includes('video.twimg.com');
    
    console.log('  - 是Twitter页面:', isTwitterPage ? '❌' : '✅');
    console.log('  - 是视频文件:', isVideoFile ? '✅' : '❌');
    console.log('  - 是视频服务器:', isVideoServer ? '✅' : '❌');
    
    const isValid = !isTwitterPage && (isVideoFile || isVideoServer);
    console.log('  - 总体有效性:', isValid ? '✅ 有效' : '❌ 无效');
    
    if (!isValid) {
      console.warn('  ⚠️ 这个URL会导致下载HTML文件而不是视频文件！');
    }
  });
}

// 5. 测试下载功能
function testDownloadFunction() {
  console.log('\n📥 测试下载功能:');
  
  // 查找下载按钮
  const downloadButtons = document.querySelectorAll('.tweet-craft-video-download-btn, .test-download-btn');
  console.log(`找到 ${downloadButtons.length} 个下载按钮`);
  
  if (downloadButtons.length > 0) {
    console.log('✅ 可以点击下载按钮进行测试');
    console.log('💡 建议：点击按钮后检查下载的文件类型');
  } else {
    console.log('❌ 未找到下载按钮');
    console.log('💡 建议：运行强制添加按钮脚本');
  }
}

// 6. 检查扩展状态
function checkExtensionStatus() {
  console.log('\n🔌 检查扩展状态:');
  
  if (window.tweetCraftVideoDetector) {
    console.log('✅ 视频检测器已加载');
    
    try {
      const stats = window.tweetCraftVideoDetector.getDetectionStats();
      console.log('📊 检测统计:', stats);
    } catch (error) {
      console.log('❌ 获取统计信息失败:', error);
    }
  } else {
    console.log('❌ 视频检测器未加载');
  }
}

// 运行所有测试
function runAllTests() {
  checkExtensionStatus();
  checkVideoElements();
  checkVideoPreviewElements();
  testDownloadFunction();
  
  // 测试一些常见的无效URL
  console.log('\n🧪 测试URL验证:');
  const testUrls = [
    'https://twitter.com/i/status/1234567890',  // 无效：Twitter页面
    'https://x.com/user/status/1234567890',     // 无效：X页面
    'https://video.twimg.com/ext_tw_video/123/pu/vid/avc1/1280x720/test.mp4', // 有效：视频文件
    'https://pbs.twimg.com/ext_tw_video_thumb/123/pu/img/test.jpg', // 无效：缩略图
    'https://video.twimg.com/ext_tw_video/123/pu/pl/test.m3u8' // 有效：播放列表
  ];
  
  validateVideoUrls(testUrls);
  
  console.log('\n🎯 开始网络拦截测试（播放视频以查看结果）:');
  testNetworkInterception();
}

// 自动运行测试
runAllTests();

// 导出测试函数
window.videoUrlTest = {
  runAllTests,
  checkVideoElements,
  checkVideoPreviewElements,
  validateVideoUrls,
  testDownloadFunction,
  testNetworkInterception,
  checkExtensionStatus
};

console.log('\n🎉 测试脚本加载完成！');
console.log('💡 可以使用 window.videoUrlTest.* 调用各个测试函数');
console.log('💡 播放视频后检查网络拦截结果');