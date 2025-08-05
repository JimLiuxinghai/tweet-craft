// Twitter 操作栏修复 - 解决复制按钮不显示的问题

import { query, queryAll, createElement } from '../utils/dom';

/**
 * Twitter操作栏修复器
 */
export class TwitterActionsBarFix {
  
  /**
   * 增强的操作栏查找方法 - 专门针对新的Twitter DOM结构
   */
  static findActionsBar(tweetElement: HTMLElement): HTMLElement | null {
    console.log('🔍 开始查找推文操作栏 (增强版)...');
    console.log('  推文元素:', tweetElement);
    
    // 基于用户提供的HTML结构，更新选择器策略
    const strategies = [
      // 策略1: 直接查找包含 aria-label 和 views 的 role="group" 元素
      () => {
        console.log('  🎯 策略1: 查找包含views的role="group"元素');
        const groups = queryAll(tweetElement, 'div[role="group"]');
        for (const group of groups) {
   const ariaLabel = group.getAttribute('aria-label');
       if (ariaLabel && ariaLabel.includes('views')) {
     console.log('    ✅ 找到包含views的group:', ariaLabel);
  this.debugActionsBar(group as HTMLElement);
            return group as HTMLElement;
      }
        }
        return null;
      },

      // 策略2: 通过查找操作按钮向上查找父级group
      () => {
        console.log('  🎯 策略2: 通过操作按钮查找父级group');
        const actionButtons = [
  '[data-testid="reply"]',
          '[data-testid="retweet"]',
          '[data-testid="like"]',
          '[data-testid="bookmark"]'
        ];

    for (const buttonSelector of actionButtons) {
       const button = query(tweetElement, buttonSelector);
          if (button) {
      console.log(`    ✅ 找到操作按钮: ${buttonSelector}`);
     
    // 向上查找最近的 role="group" 父元素
      let current = button.parentElement;
   while (current && current !== tweetElement) {
              if (current.getAttribute('role') === 'group') {
            console.log('    ✅ 找到父级group容器');
     this.debugActionsBar(current);
      return current;
  }
         current = current.parentElement;
        }
   }
        }
  return null;
      },

      // 策略3: 查找包含特定CSS类的操作栏
      () => {
        console.log('  🎯 策略3: 通过CSS类查找操作栏');
        const cssSelectors = [
     '.css-175oi2r.r-1kbdv8c.r-18u37iz.r-1wtj0ep.r-1ye8kvj.r-1s2bzr4',
  '.css-175oi2r[role="group"]',
     'div[role="group"].css-175oi2r'
   ];

        for (const selector of cssSelectors) {
          try {
       const element = query(tweetElement, selector) as HTMLElement;
    if (element) {
     // 验证是否包含操作按钮
           const hasButtons = element.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
      if (hasButtons) {
    console.log(`    ✅ 通过CSS类找到操作栏: ${selector}`);
 this.debugActionsBar(element);
return element;
      }
   }
          } catch (error) {
        console.warn(`    ⚠️ CSS选择器失败: ${selector}`, error);
          }
}
        return null;
      },

      // 策略4: 暴力查找 - 遍历所有role="group"元素
      () => {
        console.log('  🎯 策略4: 遍历所有role="group"元素');
        const allGroups = queryAll(tweetElement, '[role="group"]');
 console.log(`    找到 ${allGroups.length} 个group元素`);

   for (let i = 0; i < allGroups.length; i++) {
          const group = allGroups[i] as HTMLElement;
    console.log(`    检查group ${i + 1}:`, group);
          
 // 检查是否包含操作按钮
          const buttonSelectors = ['[data-testid="reply"]', '[data-testid="retweet"]', '[data-testid="like"]', '[data-testid="bookmark"]'];
    const buttonCount = buttonSelectors.reduce((count, selector) => {
     return count + (group.querySelector(selector) ? 1 : 0);
}, 0);

          console.log(`      包含操作按钮数量: ${buttonCount}`);

          if (buttonCount >= 2) { // 至少包含2个操作按钮才认为是操作栏
 console.log('    ✅ 找到有效的操作栏');
       this.debugActionsBar(group);
    return group;
          }
   }
     return null;
      }
    ];

    // 依次尝试各种策略
    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]();
        if (result) {
      console.log(`✅ 策略 ${i + 1} 成功找到操作栏`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ 策略 ${i + 1} 失败:`, error);
      }
    }

    console.warn('❌ 所有策略都失败，未找到操作栏');
    return null;
  }

  /**
   * 调试操作栏信息
 */
  private static debugActionsBar(actionsBar: HTMLElement): void {
    console.log('📊 操作栏详细信息:');
    console.log('  - 元素:', actionsBar);
    console.log('  - 标签名:', actionsBar.tagName);
    console.log('  - role属性:', actionsBar.getAttribute('role'));
    console.log('  - aria-label:', actionsBar.getAttribute('aria-label'));
    console.log('- id属性:', actionsBar.getAttribute('id'));
    console.log('  - 类名:', actionsBar.className);
  console.log('  - 子元素数量:', actionsBar.children.length);
    
    // 检查操作按钮
    const buttonTypes = [
      { testid: 'reply', name: '回复' },
      { testid: 'retweet', name: '转推' },
      { testid: 'like', name: '点赞' },
      { testid: 'bookmark', name: '书签' }
    ];

    console.log('  - 包含的操作按钮:');
    buttonTypes.forEach((buttonType, index) => {
      const button = actionsBar.querySelector(`[data-testid="${buttonType.testid}"]`);
      if (button) {
    console.log(`    ${index + 1}. ${buttonType.name} (${buttonType.testid}) ✅`);
      } else {
  console.log(`    ${index + 1}. ${buttonType.name} (${buttonType.testid}) ❌`);
      }
    });

    // 检查是否已经有复制按钮
    const existingCopyButton = actionsBar.querySelector('.tsc-copy-button');
    if (existingCopyButton) {
   console.log('  ⚠️ 已存在复制按钮');
    } else {
      console.log('  ✅ 可以添加复制按钮');
    }
  }

  /**
   * 创建操作按钮容器（模仿Twitter的样式）
   */
  static createActionButtonContainer(): HTMLElement {
    const container = createElement('div', {
      className: 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0'
    });
    return container;
  }

  /**
   * 将复制按钮插入到操作栏中
   */
  static insertCopyButton(actionsBar: HTMLElement, copyButton: HTMLElement): boolean {
  try {
 console.log('📌 开始插入复制按钮到操作栏');
      
      // 检查是否已经存在复制按钮
      if (actionsBar.querySelector('.tsc-copy-button')) {
  console.log('  ⚠️ 复制按钮已存在，跳过插入');
     return true;
      }

   // 创建按钮容器，模仿Twitter的结构
      const buttonContainer = this.createActionButtonContainer();
      buttonContainer.appendChild(copyButton);

      // 查找合适的插入位置（在书签按钮之后，或在最后）
      const bookmarkButton = actionsBar.querySelector('[data-testid="bookmark"]');
      if (bookmarkButton && bookmarkButton.parentElement) {
  // 在书签按钮后插入
   const bookmarkContainer = bookmarkButton.parentElement;
     bookmarkContainer.parentNode?.insertBefore(buttonContainer, bookmarkContainer.nextSibling);
     console.log('  ✅ 已在书签按钮后插入复制按钮');
      } else {
        // 在操作栏末尾插入
 actionsBar.appendChild(buttonContainer);
        console.log('  ✅ 已在操作栏末尾插入复制按钮');
      }

      return true;
    } catch (error) {
      console.error('❌ 插入复制按钮失败:', error);
  return false;
    }
  }

  /**
   * 创建备用操作栏（如果找不到现有的）
   */
  static createFallbackActionsBar(tweetElement: HTMLElement): HTMLElement | null {
    try {
      console.log('🔧 创建备用操作栏');

      // 查找推文内容区域
      const tweetContent = query(tweetElement, '[data-testid="tweetText"]') ||
            query(tweetElement, '.tweet-text') ||
  query(tweetElement, '[lang]');

      if (!tweetContent) {
   console.warn('  ❌ 未找到推文内容区域，无法创建备用操作栏');
        return null;
      }

      // 创建操作栏容器
      const actionsBar = createElement('div', {
        className: 'css-175oi2r r-1kbdv8c r-18u37iz r-1wtj0ep r-1ye8kvj r-1s2bzr4 tsc-fallback-actions-bar',
     role: 'group',
        'aria-label': 'Tweet actions'
      });

      // 插入到推文内容之后
      const insertTarget = tweetContent.parentElement || tweetElement;
      insertTarget.appendChild(actionsBar);

      console.log('  ✅ 成功创建备用操作栏');
      return actionsBar;
    } catch (error) {
    console.error('❌ 创建备用操作栏失败:', error);
      return null;
    }
  }

  /**
* 测试方法：在控制台中验证操作栏查找功能
 */
  static testActionsBarFinding(): void {
    console.log('🧪 测试操作栏查找功能');
    
    // 查找页面上的所有推文
    const tweets = queryAll(document, '[data-testid="tweet"], article[data-testid="tweet"]');
    console.log(`找到 ${tweets.length} 个推文元素`);

    tweets.forEach((tweet, index) => {
      console.log(`\n--- 测试推文 ${index + 1} ---`);
    const actionsBar = this.findActionsBar(tweet as HTMLElement);
      if (actionsBar) {
        console.log(`✅ 推文 ${index + 1} 找到操作栏`);
} else {
     console.log(`❌ 推文 ${index + 1} 未找到操作栏`);
      }
    });
  }
}