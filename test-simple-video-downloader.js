// 测试简化视频下载器的脚本
// 在Twitter页面的浏览器控制台中运行

console.log('🧪 测试简化视频下载器...');

// 1. 检查下载器状态
function checkDownloaderStatus() {
  console.log('\n📊 检查下载器状态:');
  
  if (window.simpleVideoDownloader) {
    console.log('✅ 简化视频下载器已加载');
    
    try {
      const stats = window.simpleVideoDownloader.getStats();
      console.log('📈 统计信息:', stats);
      
      if (stats.videosFound > 0 && stats.downloadButtons === 0) {
        console.log('⚠️ 发现视频但没有下载按钮，尝试强制检测');
        const added = window.simpleVideoDownloader.forceDetectAll();
        console.log(`✅ 强制添加了 ${added} 个下载按钮`);
      }
      
    } catch (error) {
      console.error('❌ 获取统计信息失败:', error);
    }
  } else {
    console.log('❌ 简化视频下载器未加载');
    console.log('💡 检查是否有原始的视频检测器');
    
    if (window.tweetCraftVideoDetector) {
      console.log('✅ 原始视频检测器已加载');
    } else {
      console.log('❌ 没有找到任何视频检测器');
    }
  }
}

// 2. 检查页面视频情况
function analyzePageVideos() {
  console.log('\n🎬 分析页面视频:');
  
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  const videos = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
  const downloadButtons = document.querySelectorAll('.simple-video-download-btn');
  
  console.log(`推文数量: ${tweets.length}`);
  console.log(`视频数量: ${videos.length}`);
  console.log(`下载按钮数量: ${downloadButtons.length}`);
  
  // 分析每个包含视频的推文
  let videoTweetCount = 0;
  tweets.forEach((tweet, index) => {
    const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    const hasDownloadBtn = tweet.querySelector('.simple-video-download-btn');
    
    if (hasVideo) {
      videoTweetCount++;
      console.log(`\n推文 ${index + 1} (包含视频):`);
      console.log('  有下载按钮:', hasDownloadBtn ? '✅' : '❌');
      
      // 获取推文URL
      const tweetLink = tweet.querySelector('a[href*="/status/"]');
      if (tweetLink) {
        console.log('  推文URL:', tweetLink.href);
      }
      
      // 检查操作栏
      const actionBar = tweet.querySelector('[role="group"]');
      console.log('  有操作栏:', actionBar ? '✅' : '❌');
    }
  });
  
  console.log(`\n📊 总结: ${videoTweetCount} 个推文包含视频`);
}

// 3. 测试视频服务
async function testVideoService() {
  console.log('\n🌐 测试视频服务:');
  
  try {
    // 动态导入服务
    const { TwitterVideoService } = await import('./lib/services/twitter-video-service.js');
    const videoService = new TwitterVideoService('zh-CN');
    
    console.log('✅ 视频服务模块加载成功');
    
    // 测试服务可用性
    const availableService = await videoService.getAvailableService();
    if (availableService) {
      console.log('✅ 找到可用服务:', availableService.name);
      console.log('  服务URL:', availableService.baseUrl);
      console.log('  支持语言:', availableService.supportedLanguages);
    } else {
      console.log('❌ 没有可用的视频服务');
    }
    
    // 测试URL验证
    const testUrls = [
      'https://twitter.com/user/status/1234567890',
      'https://x.com/user/status/1234567890',
      'https://example.com/invalid',
      window.location.href
    ];
    
    console.log('\n🔍 测试URL验证:');
    testUrls.forEach(url => {
      const isValid = videoService.isValidTweetUrl(url);
      console.log(`  ${url}: ${isValid ? '✅' : '❌'}`);
    });
    
  } catch (error) {
    console.error('❌ 视频服务测试失败:', error);
  }
}

// 4. 模拟下载测试
function simulateDownload() {
  console.log('\n📥 模拟下载测试:');
  
  const downloadButtons = document.querySelectorAll('.simple-video-download-btn');
  
  if (downloadButtons.length === 0) {
    console.log('❌ 未找到下载按钮');
    console.log('💡 尝试强制检测');
    
    if (window.simpleVideoDownloader) {
      const added = window.simpleVideoDownloader.forceDetectAll();
      console.log(`✅ 强制添加了 ${added} 个下载按钮`);
    }
    return;
  }
  
  console.log(`找到 ${downloadButtons.length} 个下载按钮`);
  
  // 为第一个按钮添加测试点击事件
  const firstButton = downloadButtons[0];
  if (firstButton) {
    console.log('🎯 为第一个按钮添加测试点击事件');
    
    const originalClick = firstButton.onclick;
    
    firstButton.onclick = function(e) {
      console.log('\n🎬 测试点击下载按钮');
      
      // 获取对应的推文
      const tweet = firstButton.closest('[data-testid="tweet"], article[role="article"]');
      if (tweet) {
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
          console.log('  推文URL:', tweetLink.href);
        }
      }
      
      // 调用原始点击处理（但阻止实际下载）
      if (originalClick) {
        console.log('  调用原始点击处理...');
        // 暂时阻止实际下载以避免打开新标签页
        e.preventDefault();
        e.stopPropagation();
        console.log('  测试完成（已阻止实际下载）');
      }
    };
    
    console.log('✅ 测试点击事件已设置');
    console.log('💡 点击第一个下载按钮查看测试结果');
  }
}

// 5. 检查网络连接
async function checkNetworkConnectivity() {
  console.log('\n🌐 检查网络连接:');
  
  const testUrls = [
    'https://tweetdown.pages.dev',
    'https://savetweet.net',
    'https://twittervideodownloader.com'
  ];
  
  for (const url of testUrls) {
    try {
      const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
      console.log(`✅ ${url}: 可访问`);
    } catch (error) {
      console.log(`❌ ${url}: 不可访问 (${error.message})`);
    }
  }
}

// 6. 综合测试
async function runComprehensiveTest() {
  console.log('🚀 开始综合测试...\n');
  
  checkDownloaderStatus();
  analyzePageVideos();
  await testVideoService();
  simulateDownload();
  await checkNetworkConnectivity();
  
  console.log('\n🎉 测试完成！');
  console.log('\n💡 使用说明:');
  console.log('1. 如果没有下载按钮，运行: window.simpleVideoDownloader.forceDetectAll()');
  console.log('2. 查看统计信息: window.simpleVideoDownloader.getStats()');
  console.log('3. 点击下载按钮测试功能');
}

// 7. 手动修复函数
function manualFix() {
  console.log('🔧 手动修复视频下载按钮...');
  
  if (window.simpleVideoDownloader) {
    const added = window.simpleVideoDownloader.forceDetectAll();
    console.log(`✅ 添加了 ${added} 个下载按钮`);
    return added;
  }
  
  // 如果没有下载器，尝试手动添加按钮
  console.log('⚠️ 下载器未加载，尝试手动添加按钮');
  
  let added = 0;
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  
  tweets.forEach(tweet => {
    const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    const actionBar = tweet.querySelector('[role="group"]');
    
    if (hasVideo && actionBar && !actionBar.querySelector('.manual-download-btn')) {
      const button = document.createElement('div');
      button.className = 'manual-download-btn';
      button.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34.75px;
          height: 34.75px;
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 0.2s ease;
        ">
          <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="rgb(113, 118, 123)">
            <path d="M12 16L7 11h3V3h4v8h3l-5 5z"/>
            <path d="M5 20v-2h14v2H5z"/>
          </svg>
        </div>
      `;
      
      button.addEventListener('click', () => {
        const tweetLink = tweet.querySelector('a[href*="/status/"]');
        if (tweetLink) {
          const url = `https://tweetdown.pages.dev/zh-CN?tweet=${encodeURIComponent(tweetLink.href)}`;
          window.open(url, '_blank');
        }
      });
      
      actionBar.appendChild(button);
      added++;
    }
  });
  
  console.log(`✅ 手动添加了 ${added} 个下载按钮`);
  return added;
}

// 导出测试函数
window.simpleVideoTest = {
  runComprehensiveTest,
  checkDownloaderStatus,
  analyzePageVideos,
  testVideoService,
  simulateDownload,
  checkNetworkConnectivity,
  manualFix
};

// 自动运行综合测试
runComprehensiveTest();

console.log('\n🎯 测试脚本加载完成！');
console.log('💡 可以使用 window.simpleVideoTest.* 调用各个测试函数');
console.log('💡 快速修复: window.simpleVideoTest.manualFix()');