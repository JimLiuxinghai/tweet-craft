// Twitter 操作栏修复 - 增强版，解决复制按钮不显示的问题

import { query, queryAll, createElement } from '../utils/dom';

/**
 * Twitter操作栏修复器 - 增强版
 */
export class TwitterActionsBarFixEnhanced {
  
  /**
   * 增强的操作栏查找方法 - 专门针对最新的Twitter DOM结构
   */
  static findActionsBar(tweetElement: HTMLElement): HTMLElement | null {
  console.log('🔍 开始查找推文操作栏 (增强版v2)...');
    console.log('  推文元素:', tweetElement);
    
    // 增强的查找策略，基于最新Twitter DOM结构优化
    const strategies = [
      
      // 策略1: 查找包含多个操作按钮的 role="group" 容器
      () => {
        console.log('  🎯 策略1: 查找包含操作按钮的role="group"元素');
        const groups = queryAll(tweetElement, 'div[role="group"]');
        console.log(`    找到 ${groups.length} 个group元素`);

        for (let i = 0; i < groups.length; i++) {
          const group = groups[i] as HTMLElement;
 
          // 检查是否包含常见的操作按钮
          const buttonSelectors = [
            '[data-testid="reply"]',
  '[data-testid="retweet"]', 
            '[data-testid="like"]',
  '[data-testid="bookmark"]',
     '[aria-label*="Reply"]',
 '[aria-label*="Repost"]',
         '[aria-label*="Like"]',
          '[aria-label*="Bookmark"]'
          ];

          let buttonCount = 0;
          for (const selector of buttonSelectors) {
      if (group.querySelector(selector)) {
       buttonCount++;
            }
          }
    
          console.log(`    Group ${i + 1} 包含操作按钮数量: ${buttonCount}`);
        
          if (buttonCount >= 2) {
      console.log(`    ✅ 策略1成功: 找到包含${buttonCount}个按钮的操作栏`);
this.debugActionsBar(group);
         return group;
     }
   }
        return null;
      },

      // 策略2: 基于aria-label查找 (专门适配新版Twitter)
  () => {
        console.log('  🎯 策略2: 通过aria-label特征查找');
        const groups = queryAll(tweetElement, 'div[role="group"]');
        
        for (const group of groups) {
    const ariaLabel = group.getAttribute('aria-label');
        if (ariaLabel) {
    // 检查是否包含典型的推文统计信息
            const hasViews = ariaLabel.includes('views') || ariaLabel.includes('Views');
const hasReplies = ariaLabel.includes('repl') || ariaLabel.includes('Repl');
        const hasRetweets = ariaLabel.includes('repost') || ariaLabel.includes('Repost');
            const hasLikes = ariaLabel.includes('like') || ariaLabel.includes('Like');
     const hasBookmarks = ariaLabel.includes('bookmark') || ariaLabel.includes('Bookmark');
     
  if ((hasViews || hasReplies || hasRetweets || hasLikes || hasBookmarks) && 
             (hasReplies || hasRetweets || hasLikes)) {
    console.log('    ✅ 策略2成功: 通过aria-label找到操作栏:', ariaLabel);
    this.debugActionsBar(group as HTMLElement);
      return group as HTMLElement;
  }
          }
        }
        return null;
      },

    // 策略3: 通过单个操作按钮向上查找父级容器
      () => {
        console.log('  🎯 策略3: 通过操作按钮查找父级group');
        const actionButtons = [
        '[data-testid="reply"]',
          '[data-testid="retweet"]',
          '[data-testid="like"]',
   '[data-testid="bookmark"]'
        ];

      for (const buttonSelector of actionButtons) {
          const button = query(tweetElement, buttonSelector);
       if (button) {
          console.log(`    找到操作按钮: ${buttonSelector}`);
            
            // 向上查找最近的 role="group" 父元素
            let current = button.parentElement;
            while (current && current !== tweetElement) {
              if (current.getAttribute('role') === 'group') {
 // 验证这个group确实包含多个操作按钮
           const buttonCount = actionButtons.reduce((count, sel) => {
 return count + (current!.querySelector(sel) ? 1 : 0);
   }, 0);

                if (buttonCount >= 2) {
  console.log('    ✅ 策略3成功: 找到包含多个按钮的父级group容器');
this.debugActionsBar(current);
  return current;
    }
      }
        current = current.parentElement;
   }
  }
        }
    return null;
      },

      // 策略4: 基于CSS类特征查找
      () => {
        console.log('  🎯 策略4: 通过CSS类特征查找');
        
     // Twitter 操作栏常见的CSS类模式
        const cssSelectors = [
   '[role="group"][class*="r-18u37iz"]',  // 常见的Twitter flex容器类
          '[role="group"][class*="r-1kbdv8c"]', // 另一个常见类
          '.css-175oi2r[role="group"]',          // 基础容器类
          'div[role="group"].css-175oi2r'
      ];

   for (const selector of cssSelectors) {
try {
       const elements = queryAll(tweetElement, selector);
    for (const element of elements) {
     // 验证是否包含操作按钮
      const hasButtons = element.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
   if (hasButtons) {
       console.log(`    ✅ 策略4成功: 通过CSS类找到操作栏: ${selector}`);
    this.debugActionsBar(element as HTMLElement);
    return element as HTMLElement;
  }
            }
          } catch (error) {
       console.warn(`    ⚠️ CSS选择器失败: ${selector}`, error);
     }
   }
     return null;
    },

      // 策略5: 基于DOM结构位置查找 (作为最后的备选)
      () => {
        console.log('  🎯 策略5: 基于DOM结构位置查找');
      
        // 查找推文文本，然后向下寻找操作栏
        const tweetText = query(tweetElement, '[data-testid="tweetText"]');
        if (tweetText) {
          console.log('    找到推文文本，开始向下查找操作栏');
      
// 从推文文本开始，向下查找可能的操作栏
          let current = tweetText.parentElement;
  while (current && current !== tweetElement.parentElement) {
            // 查找当前容器的兄弟元素
 if (current.nextElementSibling) {
      const nextSibling = current.nextElementSibling;
      const actionBar = query(nextSibling, '[role="group"]');
     if (actionBar) {
        const hasActionButtons = actionBar.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
             if (hasActionButtons) {
         console.log('  ✅ 策略5成功: 基于DOM位置找到操作栏');
           this.debugActionsBar(actionBar as HTMLElement);
    return actionBar as HTMLElement;
        }
     }
            }
 current = current.parentElement;
      }
      }

        return null;
      },

      // 策略6: 通过文本特征查找 (最宽松的策略)
      () => {
     console.log('  🎯 策略6: 通过文本内容特征查找');
 const groups = queryAll(tweetElement, 'div[role="group"]');
        
        for (const group of groups) {
const textContent = group.textContent || '';
          // 查找包含数字的元素，可能是互动统计
          const hasNumbers = /\d/.test(textContent);
          const hasInteractionText = /(repl|repost|like|bookmark|view)/i.test(textContent);
          
          if (hasNumbers && hasInteractionText) {
            // 进一步验证是否包含按钮元素
            const buttonElements = group.querySelectorAll('button, [role="button"], [tabindex="0"]');
        if (buttonElements.length >= 3) {
     console.log(' ✅ 策略6成功: 通过文本特征找到操作栏');
   this.debugActionsBar(group as HTMLElement);
 return group as HTMLElement;
            }
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
    console.log('  - id属性:', actionsBar.getAttribute('id'));
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