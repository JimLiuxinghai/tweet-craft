// 调试视频检测的脚本
// 在浏览器控制台中运行此脚本来调试视频检测问题

console.log('🔍 开始调试视频检测...');

// 1. 检查是否存在视频元素
function checkVideoElements() {
  console.log('\n📹 检查视频元素:');
  
  const selectors = [
    'video[src*="video.twimg.com"]',
    'video[src*="twimg.com"]',
    '[data-testid="videoComponent"] video',
    '[data-testid="tweetPhoto"] video',
    '[data-testid="previewInterstitial"]',
    '[data-testid="videoComponent"]',
    '[data-testid="playButton"]',
    'div[style*="ext_tw_video_thumb"]',
    'img[src*="ext_tw_video_thumb"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      console.log(`✅ 找到 ${elements.length} 个元素: ${selector}`);
      elements.forEach((el, index) => {
        console.log(`  - 元素 ${index + 1}:`, el);
      });
    } else {
      console.log(`❌ 未找到元素: ${selector}`);
    }
  });
}

// 2. 检查推文容器
function checkTweetContainers() {
  console.log('\n📝 检查推文容器:');
  
  const selectors = [
    '[data-testid="tweet"]',
    'article[role="article"]',
    'article[data-testid="tweet"]'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length} 个`);
    
    elements.forEach((el, index) => {
      const hasVideo = el.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
      if (hasVideo) {
        console.log(`  - 推文 ${index + 1} 包含视频:`, el);
      }
    });
  });
}

// 3. 检查操作栏
function checkActionBars() {
  console.log('\n🎛️ 检查操作栏:');
  
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  
  tweets.forEach((tweet, index) => {
    console.log(`\n推文 ${index + 1}:`);
    
    // 检查是否有视频
    const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    console.log(`  包含视频: ${hasVideo ? '✅' : '❌'}`);
    
    if (hasVideo) {
      // 查找操作栏
      const roleGroups = tweet.querySelectorAll('[role="group"]');
      console.log(`  找到 ${roleGroups.length} 个 role="group" 元素`);
      
      roleGroups.forEach((group, groupIndex) => {
        const buttons = group.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"]');
        console.log(`    组 ${groupIndex + 1}: ${buttons.length} 个互动按钮`);
        
        if (buttons.length >= 3) {
          console.log(`    ✅ 这可能是操作栏:`, group);
          
          // 检查是否已有下载按钮
          const hasDownloadBtn = group.querySelector('.tweet-craft-video-download-btn');
          console.log(`    下载按钮存在: ${hasDownloadBtn ? '✅' : '❌'}`);
        }
      });
    }
  });
}

// 4. 检查扩展是否加载
function checkExtensionLoaded() {
  console.log('\n🔌 检查扩展状态:');
  
  // 检查是否有扩展的样式或元素
  const extensionElements = document.querySelectorAll('.tsc-copy-button, .tsc-screenshot-button, .tweet-craft-video-download-btn');
  console.log(`扩展按钮数量: ${extensionElements.length}`);
  
  // 检查是否有扩展的样式表
  const styleSheets = Array.from(document.styleSheets).filter(sheet => {
    try {
      return sheet.href && sheet.href.includes('extension');
    } catch (e) {
      return false;
    }
  });
  console.log(`扩展样式表数量: ${styleSheets.length}`);
}

// 5. 模拟视频检测过程
function simulateVideoDetection() {
  console.log('\n🎯 模拟视频检测过程:');
  
  // 查找视频元素
  const videoElements = document.querySelectorAll('[data-testid="previewInterstitial"], [data-testid="playButton"]');
  
  videoElements.forEach((videoEl, index) => {
    console.log(`\n处理视频元素 ${index + 1}:`, videoEl);
    
    // 查找推文容器
    let tweetContainer = videoEl.closest('[data-testid="tweet"]') || 
                        videoEl.closest('article[role="article"]');
    
    if (tweetContainer) {
      console.log('  ✅ 找到推文容器:', tweetContainer);
      
      // 查找操作栏
      const actionBars = tweetContainer.querySelectorAll('[role="group"]');
      let validActionBar = null;
      
      actionBars.forEach(bar => {
        const buttons = bar.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
        if (buttons.length >= 3) {
          validActionBar = bar;
        }
      });
      
      if (validActionBar) {
        console.log('  ✅ 找到有效操作栏:', validActionBar);
        
        // 检查是否已有下载按钮
        const existingBtn = validActionBar.querySelector('.tweet-craft-video-download-btn');
        if (existingBtn) {
          console.log('  ⚠️ 下载按钮已存在');
        } else {
          console.log('  ❌ 下载按钮不存在，应该添加');
        }
      } else {
        console.log('  ❌ 未找到有效操作栏');
      }
    } else {
      console.log('  ❌ 未找到推文容器');
    }
  });
}

// 运行所有检查
function runAllChecks() {
  checkVideoElements();
  checkTweetContainers();
  checkActionBars();
  checkExtensionLoaded();
  simulateVideoDetection();
  
  console.log('\n🎉 调试完成！');
}

// 自动运行
runAllChecks();

// 导出函数供手动调用
window.debugVideoDetection = {
  checkVideoElements,
  checkTweetContainers,
  checkActionBars,
  checkExtensionLoaded,
  simulateVideoDetection,
  runAllChecks
};