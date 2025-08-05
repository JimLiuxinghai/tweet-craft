// 测试复制按钮修复 - 验证操作栏识别和按钮插入功能

import { TwitterActionsBarFix } from './content/twitter-actions-bar-fix';
import { queryAll } from './utils/dom';

/**
 * 复制按钮修复测试器
 */
export class CopyButtonFixTester {
  
  /**
   * 测试操作栏查找功能
   */
  static testActionBarDetection(): void {
console.log('🧪 开始测试操作栏查找功能...\n');
    
    // 查找页面上的所有推文元素
    const tweetSelectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]',
      'article[role="article"]',
      'div[data-testid="tweet"]'
 ];
    
    let allTweets: Element[] = [];
    for (const selector of tweetSelectors) {
      const tweets = queryAll(document, selector);
 allTweets = [...allTweets, ...tweets];
    }
    
    // 去重
    const uniqueTweets = Array.from(new Set(allTweets));
console.log(`📊 找到 ${uniqueTweets.length} 个推文元素`);
    
    let successCount = 0;
    let failureCount = 0;
    
    uniqueTweets.forEach((tweet, index) => {
      console.log(`\n--- 测试推文 ${index + 1} ---`);
      const actionsBar = TwitterActionsBarFix.findActionsBar(tweet as HTMLElement);
  
      if (actionsBar) {
    console.log(`✅ 推文 ${index + 1}: 成功找到操作栏`);
     successCount++;
      } else {
      console.log(`❌ 推文 ${index + 1}: 未找到操作栏`);
        failureCount++;
        
        // 调试信息：显示推文结构
        console.log('   推文HTML结构:');
        console.log('   ', tweet.outerHTML.substring(0, 200) + '...');
      }
    });
    
    console.log('\n📈 测试结果统计:');
    console.log(`  成功: ${successCount} / ${uniqueTweets.length}`);
    console.log(`  失败: ${failureCount} / ${uniqueTweets.length}`);
    console.log(`  成功率: ${uniqueTweets.length > 0 ? Math.round((successCount / uniqueTweets.length) * 100) : 0}%`);
  }

  /**
   * 测试特定HTML结构的操作栏识别
   */
  static testSpecificStructure(): void {
    console.log('\n🧪 测试特定HTML结构的操作栏识别...\n');
    
    // 创建测试用的推文HTML结构（基于用户提供的HTML）
    const testTweetHtml = `
      <div data-testid="tweet" class="test-tweet">
 <div class="tweet-content">
          <div data-testid="tweetText">这是一条测试推文</div>
        </div>
   <div aria-label="181 views" role="group" class="css-175oi2r r-1kbdv8c r-18u37iz r-1wtj0ep r-1ye8kvj r-1s2bzr4">
       <div class="css-175oi2r r-18u37iz r-1h0z5md r-13awgt0">
            <button data-testid="reply" type="button">Reply</button>
    </div>
       <div class="css-175oi2r r-18u37iz r-1h0z5md r-13awgt0">
    <button data-testid="retweet" type="button">Retweet</button>
       </div>
          <div class="css-175oi2r r-18u37iz r-1h0z5md r-13awgt0">
     <button data-testid="like" type="button">Like</button>
    </div>
   <div class="css-175oi2r r-18u37iz r-1h0z5md r-1wron08">
            <button data-testid="bookmark" type="button">Bookmark</button>
          </div>
        </div>
      </div>
  `;
    
    // 创建临时DOM元素
  const tempContainer = document.createElement('div');
 tempContainer.innerHTML = testTweetHtml;
 const testTweet = tempContainer.querySelector('[data-testid="tweet"]') as HTMLElement;
    
    if (testTweet) {
      console.log('🎯 测试推文结构:');
      console.log('  ', testTweetHtml);
      
      const actionsBar = TwitterActionsBarFix.findActionsBar(testTweet);
   
 if (actionsBar) {
  console.log('✅ 成功识别测试推文的操作栏');
     console.log('   操作栏元素:', actionsBar);
        console.log('   aria-label:', actionsBar.getAttribute('aria-label'));
 console.log('   包含的按钮:');
        
      const buttons = ['reply', 'retweet', 'like', 'bookmark'];
   buttons.forEach(buttonType => {
     const button = actionsBar.querySelector(`[data-testid="${buttonType}"]`);
    console.log(` ${buttonType}: ${button ? '✅' : '❌'}`);
 });
      } else {
   console.log('❌ 未能识别测试推文的操作栏');
      }
    }
  }

  /**
   * 测试复制按钮插入功能
   */
  static testCopyButtonInsertion(): void {
    console.log('\n🧪 测试复制按钮插入功能...\n');
    
    // 查找第一个有操作栏的推文
    const tweets = queryAll(document, '[data-testid="tweet"], article[data-testid="tweet"]');
    
    for (const tweet of tweets) {
      const actionsBar = TwitterActionsBarFix.findActionsBar(tweet as HTMLElement);
      
      if (actionsBar) {
    console.log('🎯 找到测试推文，尝试插入复制按钮...');
 
   // 检查是否已经有复制按钮
        const existingButton = actionsBar.querySelector('.tsc-copy-button');
        if (existingButton) {
          console.log('  ⚠️ 已存在复制按钮，跳过插入测试');
        return;
 }
        
        // 创建测试用的复制按钮
    const testCopyButton = document.createElement('button');
    testCopyButton.className = 'tsc-copy-button test-copy-button';
  testCopyButton.textContent = '📋 Copy';
        testCopyButton.style.cssText = `
          background: #1d9bf0;
          color: white;
          border: none;
          padding: 8px 12px;
    border-radius: 20px;
      cursor: pointer;
          font-size: 14px;
        `;
        
        // 尝试插入按钮
 const insertSuccess = TwitterActionsBarFix.insertCopyButton(actionsBar, testCopyButton);
        
      if (insertSuccess) {
 console.log('✅ 成功插入测试复制按钮');
   console.log('   位置: 操作栏末尾');
        
          // 5秒后移除测试按钮
          setTimeout(() => {
       if (testCopyButton.parentElement) {
      testCopyButton.parentElement.removeChild(testCopyButton);
              console.log('🧹 已移除测试复制按钮');
            }
          }, 5000);
        } else {
        console.log('❌ 插入测试复制按钮失败');
   }
        
        break; // 只测试第一个推文
      }
    }
  }

  /**
   * 运行所有测试
   */
  static runAllTests(): void {
    console.log('🚀 开始运行复制按钮修复测试套件...\n');
    console.log('=' + '='.repeat(60));
    
    try {
   this.testActionBarDetection();
   this.testSpecificStructure();
      this.testCopyButtonInsertion();
      
      console.log('\n' + '=' + '='.repeat(60));
      console.log('🎉 复制按钮修复测试完成！');
      console.log('\n📋 修复摘要:');
  console.log('  ✅ 更新了操作栏识别逻辑，支持 role="group" 元素');
      console.log('  ✅ 添加了多策略查找方法，提高成功率');
   console.log('  ✅ 改进了按钮插入逻辑，模仿Twitter原生样式');
      console.log('  ✅ 提供了详细的调试信息和错误处理');
      
    } catch (error) {
console.error('❌ 测试过程中出现错误:', error);
    }
  }

  /**
   * 手动调试方法 - 在控制台中使用
   */
  static debugCurrentPage(): void {
    console.log('🔧 调试当前页面的推文操作栏...');
    
    // 显示页面上所有的role="group"元素
    const allGroups = queryAll(document, '[role="group"]');
    console.log(`页面上共有 ${allGroups.length} 个 role="group" 元素:`);
    
    allGroups.forEach((group, index) => {
      const ariaLabel = group.getAttribute('aria-label');
      const id = group.getAttribute('id');
      const hasButtons = group.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
      
      console.log(`  ${index + 1}. ${group.tagName}`, {
        'aria-label': ariaLabel,
  'id': id,
        'hasActionButtons': !!hasButtons,
     'element': group
      });
    });
    
    // 运行操作栏检测
    console.log('\n开始运行操作栏检测...');
 this.testActionBarDetection();
  }
}

// 在浏览器环境中自动运行测试
if (typeof window !== 'undefined') {
  // 等待页面加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        CopyButtonFixTester.runAllTests();
    }, 2000);
  });
  } else {
    setTimeout(() => {
      CopyButtonFixTester.runAllTests();
 }, 2000);
  }
  
  // 将测试器暴露到全局，方便手动调试
  (window as any).CopyButtonFixTester = CopyButtonFixTester;
}