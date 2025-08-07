// 测试视频下载修复的脚本
// 在Twitter页面的浏览器控制台中运行

console.log('🧪 测试视频下载修复...');

// 1. 检查当前页面的视频情况
function analyzeCurrentPage() {
  console.log('\n📊 分析当前页面:');
  
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  const videos = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
  const downloadButtons = document.querySelectorAll('.tweet-craft-video-download-btn');
  
  console.log(`推文数量: ${tweets.length}`);
  console.log(`视频数量: ${videos.length}`);
  console.log(`下载按钮数量: ${downloadButtons.length}`);
  
  // 分析每个视频
  videos.forEach((video, index) => {
    console.log(`\n视频 ${index + 1}:`);
    console.log('  元素:', video);
    
    // 查找对应的推文
    const tweet = video.closest('[data-testid="tweet"], article[role="article"]');
    if (tweet) {
      const tweetLink = tweet.querySelector('a[href*="/status/"]');
      const tweetId = tweetLink?.href.match(/\/status\/(\d+)/)?.[1];
      console.log('  推文ID:', tweetId);
      
      // 检查是否有下载按钮
      const hasDownloadBtn = tweet.querySelector('.tweet-craft-video-download-btn');
      console.log('  有下载按钮:', hasDownloadBtn ? '✅' : '❌');
      
      // 检查缩略图
      const thumbnail = video.querySelector('img[src*="ext_tw_video_thumb"]');
      if (thumbnail) {
        console.log('  缩略图URL:', thumbnail.src);
        const videoIdMatch = thumbnail.src.match(/ext_tw_video_thumb\/(\d+)/);
        if (videoIdMatch) {
          console.log('  视频ID:', videoIdMatch[1]);
        }
      }
    }
  });
}

// 2. 测试视频URL提取
function testVideoUrlExtraction() {
  console.log('\n🔍 测试视频URL提取:');
  
  if (!window.tweetCraftVideoDetector) {
    console.log('❌ 视频检测器未加载');
    return;
  }
  
  const videos = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"]');
  
  videos.forEach(async (video, index) => {
    console.log(`\n测试视频 ${index + 1}:`);
    
    const tweet = video.closest('[data-testid="tweet"], article[role="article"]');
    if (tweet) {
      try {
        // 模拟提取过程
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        const tweetId = tweetLink?.href.match(/\/status\/(\d+)/)?.[1];
        const username = tweet.querySelector('[data-testid="User-Names"] span')?.textContent;
        
        const tweetData = {
          id: tweetId,
          username: username,
          url: tweetLink?.href,
          timestamp: Date.now()
        };
        
        console.log('  推文数据:', tweetData);
        
        // 检查缩略图
        const thumbnail = video.querySelector('img[src*="ext_tw_video_thumb"]');
        if (thumbnail) {
          const videoIdMatch = thumbnail.src.match(/ext_tw_video_thumb\/(\d+)/);
          if (videoIdMatch) {
            const videoId = videoIdMatch[1];
            console.log('  提取的视频ID:', videoId);
            console.log('  特殊协议URL:', `twitter-video://${videoId}`);
          }
        }
        
      } catch (error) {
        console.error('  提取失败:', error);
      }
    }
  });
}

// 3. 测试网络拦截
function testNetworkInterception() {
  console.log('\n🌐 测试网络拦截:');
  
  // 监听所有网络请求
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest;
  
  const capturedRequests = [];
  
  // 拦截fetch
  window.fetch = async function(...args) {
    const url = args[0];
    if (typeof url === 'string' && (
      url.includes('video.twimg.com') || 
      url.includes('.mp4') || 
      url.includes('.m3u8') ||
      url.includes('ext_tw_video')
    )) {
      console.log('📹 Fetch请求:', url);
      capturedRequests.push({ type: 'fetch', url });
    }
    return originalFetch.apply(this, args);
  };
  
  // 拦截XMLHttpRequest
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    if (typeof url === 'string' && (
      url.includes('video.twimg.com') || 
      url.includes('.mp4') || 
      url.includes('.m3u8') ||
      url.includes('ext_tw_video')
    )) {
      console.log('📹 XHR请求:', url);
      capturedRequests.push({ type: 'xhr', url });
    }
    return originalOpen.call(this, method, url, ...args);
  };
  
  console.log('✅ 网络拦截已设置');
  console.log('💡 播放视频以查看拦截结果');
  
  // 10秒后显示结果并恢复
  setTimeout(() => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    
    console.log('\n📋 拦截到的请求:');
    if (capturedRequests.length === 0) {
      console.log('❌ 未拦截到任何视频请求');
      console.log('💡 尝试播放视频或滚动页面');
    } else {
      capturedRequests.forEach((req, index) => {
        console.log(`${index + 1}. [${req.type.toUpperCase()}] ${req.url}`);
      });
    }
  }, 10000);
}

// 4. 模拟下载测试
function simulateDownload() {
  console.log('\n📥 模拟下载测试:');
  
  const downloadButtons = document.querySelectorAll('.tweet-craft-video-download-btn');
  
  if (downloadButtons.length === 0) {
    console.log('❌ 未找到下载按钮');
    console.log('💡 运行强制添加按钮脚本');
    return;
  }
  
  console.log(`找到 ${downloadButtons.length} 个下载按钮`);
  
  // 为每个按钮添加测试点击事件
  downloadButtons.forEach((btn, index) => {
    const originalClick = btn.onclick;
    
    btn.onclick = function(e) {
      console.log(`\n🎯 测试点击下载按钮 ${index + 1}`);
      
      // 调用原始点击处理
      if (originalClick) {
        try {
          originalClick.call(this, e);
        } catch (error) {
          console.error('  下载处理出错:', error);
        }
      }
      
      // 阻止默认行为以避免实际下载
      e.preventDefault();
      e.stopPropagation();
      
      console.log('  测试完成（已阻止实际下载）');
    };
  });
  
  console.log('✅ 下载按钮已设置测试模式');
  console.log('💡 点击下载按钮查看测试结果');
}

// 5. 检查错误处理
function checkErrorHandling() {
  console.log('\n🚨 检查错误处理:');
  
  // 检查是否有错误通知
  const notifications = document.querySelectorAll('.tweet-craft-notification, .video-extraction-help');
  console.log(`当前通知数量: ${notifications.length}`);
  
  notifications.forEach((notification, index) => {
    console.log(`通知 ${index + 1}:`, notification.textContent);
  });
  
  // 检查控制台错误
  const originalError = console.error;
  const errors = [];
  
  console.error = function(...args) {
    if (args[0] && args[0].includes && args[0].includes('video')) {
      errors.push(args.join(' '));
    }
    return originalError.apply(this, args);
  };
  
  setTimeout(() => {
    console.error = originalError;
    if (errors.length > 0) {
      console.log('\n发现的视频相关错误:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    } else {
      console.log('✅ 未发现视频相关错误');
    }
  }, 5000);
}

// 6. 综合测试
function runComprehensiveTest() {
  console.log('🚀 开始综合测试...\n');
  
  analyzeCurrentPage();
  testVideoUrlExtraction();
  testNetworkInterception();
  simulateDownload();
  checkErrorHandling();
  
  console.log('\n🎉 测试脚本运行完成！');
  console.log('💡 观察控制台输出和页面行为');
  console.log('💡 尝试播放视频和点击下载按钮');
}

// 导出测试函数
window.videoDownloadTest = {
  runComprehensiveTest,
  analyzeCurrentPage,
  testVideoUrlExtraction,
  testNetworkInterception,
  simulateDownload,
  checkErrorHandling
};

// 自动运行综合测试
runComprehensiveTest();