// Debug helper for Twitter DOM inspection

import { query, queryAll } from '../utils/dom';

/**
 * Twitter DOM 调试助手
 */
export class TwitterDebugHelper {
  
  /**
   * 分析推文元素的DOM结构
   */
  static analyzeTweetElement(tweetElement: HTMLElement): void {
    console.group('🔍 推文元素DOM分析');
    console.log('推文元素:', tweetElement);
    console.log('标签名:', tweetElement.tagName);
    console.log('类名:', tweetElement.className);
    console.log('data-testid:', tweetElement.getAttribute('data-testid'));
    console.log('子元素数量:', tweetElement.children.length);
    
    // 分析role="group"元素
    const groups = queryAll(tweetElement, '[role="group"]');
    console.log(`\n📊 找到 ${groups.length} 个 role="group" 元素:`);
    
    groups.forEach((group, index) => {
      console.log(`\n--- Group ${index + 1} ---`);
      console.log('元素:', group);
   console.log('类名:', group.className);
      console.log('aria-label:', group.getAttribute('aria-label'));
      console.log('子元素数量:', group.children.length);
      
      // 检查是否包含操作按钮
 const buttonTypes = [
        'reply', 'retweet', 'like', 'bookmark'
  ];
 
   const buttonsFound: string[] = [];
      buttonTypes.forEach(type => {
        if (group.querySelector(`[data-testid="${type}"]`)) {
          buttonsFound.push(type);
        }
      });
      
    console.log('包含按钮:', buttonsFound.join(', ') || '无');
      
      // 检查文本内容
   const textContent = (group.textContent || '').trim();
      if (textContent) {
   console.log('文本内容:', textContent.substring(0, 100));
      }
    });
    
    console.groupEnd();
  }
  
  /**
   * 检查页面上所有推文的操作栏
   */
  static checkAllTweets(): void {
    console.group('🔍 检查页面上所有推文');
    
    const tweets = queryAll(document, '[data-testid="tweet"], article[data-testid="tweet"]');
    console.log(`找到 ${tweets.length} 个推文`);
    
    tweets.forEach((tweet, index) => {
      console.log(`\n--- 推文 ${index + 1} ---`);
      this.analyzeTweetElement(tweet as HTMLElement);
    });
    
    console.groupEnd();
  }
  
  /**
   * 监听DOM变化
   */
  static watchDOMChanges(): void {
    console.log('🔍 开始监听DOM变化...');
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
     mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              
        // 检查是否是推文元素
 if (element.matches('[data-testid="tweet"]') || 
       element.querySelector('[data-testid="tweet"]')) {
   console.log('🆕 发现新推文元素:', element);
         this.analyzeTweetElement(element);
   }
            }
  });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
 subtree: true
    });
    
    // 添加到全局作用域以便在控制台中停止
    (window as any).stopWatchingDOM = () => {
      observer.disconnect();
      console.log('🛑 停止监听DOM变化');
    };
  }
  
  /**
   * 导出当前页面的推文结构到控制台
   */
  static exportTweetStructure(): void {
    console.group('📤 导出推文结构');
    
    const tweets = queryAll(document, '[data-testid="tweet"], article[data-testid="tweet"]');
    const tweetData: any[] = [];
    
    tweets.forEach((tweet, index) => {
      const tweetElement = tweet as HTMLElement;
  const groups = queryAll(tweetElement, '[role="group"]');
      
   const tweetInfo = {
 index: index + 1,
        className: tweetElement.className,
      testId: tweetElement.getAttribute('data-testid'),
        groups: groups.map((group, groupIndex) => ({
 index: groupIndex + 1,
        className: group.className,
       ariaLabel: group.getAttribute('aria-label'),
          textContent: (group.textContent || '').substring(0, 100),
       buttons: ['reply', 'retweet', 'like', 'bookmark'].filter(type => 
      group.querySelector(`[data-testid="${type}"]`)
          )
        }))
      };
      
  tweetData.push(tweetInfo);
    });
 
    console.log('推文结构数据:', JSON.stringify(tweetData, null, 2));
    console.groupEnd();
    
    return tweetData;
  }
  
  /**
   * 测试操作栏查找功能
   */
  static testActionsBarFinding(): void {
    console.group('🧪 测试操作栏查找');
 
    const tweets = queryAll(document, '[data-testid="tweet"], article[data-testid="tweet"]');
    
    tweets.forEach((tweet, index) => {
      console.log(`\n--- 测试推文 ${index + 1} ---`);
      
      const tweetElement = tweet as HTMLElement;
      
      // 尝试不同的查找策略
      const strategies = [
        () => queryAll(tweetElement, '[role="group"]').find(g => 
          (g.getAttribute('aria-label') || '').includes('views')
        ),
        () => {
          const button = tweetElement.querySelector('[data-testid="reply"]');
          if (button) {
  let current = button.parentElement;
      while (current && current !== tweetElement) {
       if (current.getAttribute('role') === 'group') {
                return current;
        }
   current = current.parentElement;
            }
      }
    return null;
      },
     () => queryAll(tweetElement, '[role="group"]').find(g => {
    const buttons = ['reply', 'retweet', 'like'].filter(type =>
            g.querySelector(`[data-testid="${type}"]`)
          );
    return buttons.length >= 2;
        })
   ];
      
      strategies.forEach((strategy, strategyIndex) => {
        try {
          const result = strategy();
          console.log(`策略 ${strategyIndex + 1}:`, result ? '✅ 成功' : '❌ 失败');
        } catch (error) {
     console.log(`策略 ${strategyIndex + 1}: ❌ 错误:`, error);
        }
      });
    });
    
    console.groupEnd();
  }
}

// 添加到全局作用域以便在控制台中使用
if (typeof window !== 'undefined') {
  (window as any).TwitterDebugHelper = TwitterDebugHelper;
}