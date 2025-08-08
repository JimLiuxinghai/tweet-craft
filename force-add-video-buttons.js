// 强制为所有包含视频的推文添加下载按钮
// 在浏览器控制台中运行此脚本

console.log('🚀 开始强制添加视频下载按钮...');

function createDownloadButton() {
  const button = document.createElement('div');
  button.className = 'tweet-craft-video-download-btn';
  button.setAttribute('role', 'button');
  button.setAttribute('tabindex', '0');
  button.setAttribute('aria-label', '下载视频');
  button.setAttribute('title', '下载视频');
  
  button.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" style="display: block;">
      <path d="M12 16L7 11h3V3h4v8h3l-5 5z"/>
      <path d="M5 20v-2h14v2H5z"/>
    </svg>
  `;

  // 基本样式
  Object.assign(button.style, {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'transparent',
    position: 'relative',
    color: 'rgb(113, 118, 123)'
  });

  // 悬停效果
  button.addEventListener('mouseenter', () => {
    button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
    button.style.color = 'rgb(29, 155, 240)';
  });
  
  button.addEventListener('mouseleave', () => {
    button.style.backgroundColor = 'transparent';
    button.style.color = 'rgb(113, 118, 123)';
  });

  // 点击事件
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    alert('视频下载功能已触发！\n（这是测试按钮，实际功能需要完整的扩展环境）');
  });

  return button;
}

function forceAddVideoButtons() {
  let addedCount = 0;
  
  // 查找所有包含视频的推文
  const tweets = document.querySelectorAll('[data-testid="tweet"], article[role="article"]');
  
  tweets.forEach((tweet, index) => {
    // 检查是否包含视频
    const hasVideo = tweet.querySelector('[data-testid="previewInterstitial"], [data-testid="playButton"], video');
    
    if (hasVideo) {
      console.log(`📹 推文 ${index + 1} 包含视频`);
      
      // 查找操作栏
      const roleGroups = tweet.querySelectorAll('[role="group"]');
      let actionBar = null;
      
      // 找到包含最多互动按钮的组
      let maxButtons = 0;
      roleGroups.forEach(group => {
        const buttons = group.querySelectorAll('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"], [data-testid="bookmark"]');
        if (buttons.length > maxButtons) {
          maxButtons = buttons.length;
          actionBar = group;
        }
      });
      
      if (actionBar && maxButtons >= 3) {
        // 检查是否已有下载按钮
        const existingBtn = actionBar.querySelector('.tweet-craft-video-download-btn');
        
        if (!existingBtn) {
          // 创建并添加下载按钮
          const downloadBtn = createDownloadButton();
          
          // 创建包装容器以匹配其他按钮的结构
          const wrapper = document.createElement('div');
          wrapper.className = 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0';
          wrapper.appendChild(downloadBtn);
          
          // 插入到操作栏
          actionBar.appendChild(wrapper);
          
          addedCount++;
          console.log(`✅ 已为推文 ${index + 1} 添加下载按钮`);
        } else {
          console.log(`⏭️ 推文 ${index + 1} 已有下载按钮`);
        }
      } else {
        console.log(`❌ 推文 ${index + 1} 未找到有效操作栏`);
      }
    }
  });
  
  console.log(`🎉 完成！共为 ${addedCount} 个视频推文添加了下载按钮`);
  return addedCount;
}

// 运行强制添加
const result = forceAddVideoButtons();

// 导出函数供重复调用
window.forceAddVideoButtons = forceAddVideoButtons;