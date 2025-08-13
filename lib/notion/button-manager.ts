import { TweetExtractor } from './tweet-extractor';
import { TweetData } from './types';
import { notionErrorHandler } from './error-handler';

export class NotionButtonManager {
  private existingTweets = new WeakSet<Element>();
  private observer: MutationObserver | null = null;
  private readonly buttonClass = 'tweet-craft-notion-btn';

  constructor() {
    // 延迟初始化以确保DOM完全加载
    setTimeout(() => {
      this.init();
    }, 1000);
  }

  private init() {
    this.startObserver();
    this.processExistingTweets();
  }

  private startObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.processNewTweets(node as Element);
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
    });
  }

  private processExistingTweets() {
    const tweetElements = TweetExtractor.findTweetElements();
    tweetElements.forEach(tweet => this.addNotionButton(tweet));
  }

  private processNewTweets(container: Element) {
    const tweetElements = TweetExtractor.findTweetElements();
    tweetElements.forEach(tweet => {
      if (!this.existingTweets.has(tweet) && container.contains(tweet)) {
        this.addNotionButton(tweet);
      }
    });
  }

  private addNotionButton(tweetElement: Element) {
    if (this.existingTweets.has(tweetElement)) return;
    
    // 确保元素仍然有效
    if (!document.contains(tweetElement)) return;
    
    this.existingTweets.add(tweetElement);

    const actionBar = this.findActionBar(tweetElement);
    if (!actionBar) {
      console.warn('Could not find action bar for tweet');
      return;
    }

    const button = this.createNotionButton();
    
    // 确保按钮可见且可点击
    button.style.position = 'relative';
    button.style.zIndex = '9999';
    
    // 使用更强的插入方式
    try {
      actionBar.insertBefore(button, actionBar.firstChild);
    } catch (error) {
      console.warn('Failed to insert button at beginning, using appendChild');
      actionBar.appendChild(button);
    }

    // 绑定点击事件 - 使用更强的阻止冒泡
    button.addEventListener('click', async (e) => {
      e.stopImmediatePropagation();
      e.stopPropagation();
      e.preventDefault();
      console.log('Notion button clicked');
      await this.handleSaveTweet(tweetElement, button);
    }, true); // 使用捕获阶段

    // 添加鼠标事件以确保按钮可交互
    button.addEventListener('mousedown', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);

    button.addEventListener('mouseup', (e) => {
      e.stopImmediatePropagation();
      e.preventDefault();
    }, true);

    console.log('Notion button added to tweet');
  }

  private findActionBar(tweetElement: Element): Element | null {
    // 尝试多种选择器找到操作栏
    const selectors = [
      '[role="group"]',
      '[data-testid="tweetActions"]',
      '.css-175oi2r.r-18u37iz.r-1w6e6rj.r-1udh08x.r-l4nmg1',
      '[aria-label="Tweet actions"]',
      '[data-testid="reply"]',
      '[data-testid="retweet"]',
      '[data-testid="like"]'
    ];

    for (const selector of selectors) {
      const actionBar = tweetElement.querySelector(selector);
      if (actionBar) {
        // 如果找到的是单个按钮，返回其父容器
        if (selector.startsWith('[data-testid="') && actionBar.parentElement) {
          const parentGroup = actionBar.parentElement.closest('[role="group"]');
          if (parentGroup) {
            return parentGroup;
          }
          return actionBar.parentElement;
        }
        return actionBar;
      }
    }

    // 如果找不到标准操作栏，尝试找到最后一个合适的容器
    const containers = tweetElement.querySelectorAll('div[role="group"]');
    if (containers.length > 0) {
      return containers[containers.length - 1];
    }

    // 最后尝试：找到任何包含互动按钮的容器
    const interactionContainer = tweetElement.querySelector('[data-testid="reply"], [data-testid="retweet"], [data-testid="like"]');
    if (interactionContainer && interactionContainer.parentElement) {
      return interactionContainer.parentElement;
    }

    return null;
  }

  private createNotionButton(): HTMLElement {
    const button = document.createElement('div');
    button.className = this.buttonClass;
    button.setAttribute('role', 'button');
    button.setAttribute('tabindex', '0');
    button.setAttribute('aria-label', '保存到Notion');
    
    button.innerHTML = `
      <div class="notion-btn-content">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4.459 4.208c.746-.24 1.352-.17 2.355-.137l10.58.285c1.504.034 2.57.137 3.64 1.09 1.07.952 1.07 1.904 1.07 3.355v7.344c0 2.367 0 3.73-1.07 4.682-1.07.952-2.136 1.055-3.64 1.09l-10.58.285c-1.003.033-1.609.103-2.355-.137C3.117 21.85 2.5 20.967 2.5 19.344V4.656c0-1.623.617-2.506 1.959-2.448zm1.582 3.368v8.704c0 .205.171.376.376.376h11.167c.205 0 .376-.171.376-.376V7.576c0-.205-.171-.376-.376-.376H6.417c-.205 0-.376.171-.376.376z"/>
        </svg>
        <span>保存到Notion</span>
      </div>
    `;

    // 添加样式
    this.addStyles();

    // 确保按钮可点击
    button.style.cursor = 'pointer';
    button.style.pointerEvents = 'auto';
    button.style.userSelect = 'none';
    button.style.webkitUserSelect = 'none';

    return button;
  }

  private addStyles() {
    if (document.getElementById('notion-btn-styles')) return;

    const style = document.createElement('style');
    style.id = 'notion-btn-styles';
    style.textContent = `
      .${this.buttonClass} {
        display: inline-flex !important;
        align-items: center !important;
        padding: 8px 16px !important;
        margin: 0 4px !important;
        border-radius: 20px !important;
        background: #f7f7f7 !important;
        border: 1px solid #e1e8ed !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
        font-size: 13px !important;
        color: #536471 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-weight: 500 !important;
        text-decoration: none !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
        position: relative !important;
        z-index: 9999 !important;
        pointer-events: auto !important;
        opacity: 1 !important;
        visibility: visible !important;
      }

      .${this.buttonClass}:hover {
        background: #e8f5e8;
        border-color: #00d564;
        color: #00d564;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 213, 100, 0.2);
      }

      .${this.buttonClass}:active {
        transform: translateY(0);
        box-shadow: 0 1px 4px rgba(0, 213, 100, 0.2);
      }

      .${this.buttonClass}.loading {
        pointer-events: none;
        opacity: 0.7;
      }

      .${this.buttonClass}.saved {
        background: #f0f9f0;
        border-color: #00d564;
        color: #00d564;
      }

      .notion-btn-content {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .${this.buttonClass}.loading .notion-btn-content {
        opacity: 0.8;
      }

      .${this.buttonClass} .spinner {
        width: 14px;
        height: 14px;
        border: 2px solid #f3f3f3;
        border-top: 2px solid #00d564;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      ${this.buttonClass} svg {
        flex-shrink: 0;
      }

      /* 深色主题适配 */
      @media (prefers-color-scheme: dark) {
        .${this.buttonClass} {
          background: #1f1f1f;
          border-color: #333;
          color: #e1e8ed;
        }

        .${this.buttonClass}:hover {
          background: #2a2a2a;
          border-color: #00d564;
          color: #00d564;
        }

        .${this.buttonClass}.saved {
          background: #1a2a1a;
          border-color: #00d564;
          color: #00d564;
        }
      }

      /* 响应式设计 */
      @media (max-width: 768px) {
        .${this.buttonClass} {
          padding: 6px 12px;
          font-size: 12px;
        }

        .${this.buttonClass} svg {
          width: 16px;
          height: 16px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  private async handleSaveTweet(tweetElement: Element, button: HTMLElement) {
    try {
      // 提取推文数据
      const tweetData = TweetExtractor.extractTweetData(tweetElement);
      if (!tweetData) {
        throw new Error('无法提取推文数据');
      }

      // 检查是否已存在
      const exists = await this.checkTweetExists(tweetData.url);
      if (exists) {
        this.showNotification('推文已存在于Notion中', 'warning');
        this.setButtonSaved(button);
        return;
      }

      // 显示分类选择器
      const selectedCategory = await this.showCategorySelector();
      if (!selectedCategory) {
        return; // 用户取消了选择
      }

      // 显示加载状态
      this.setButtonLoading(button, true);

      // 自动生成标签
      const autoTags = TweetExtractor.generateTagsFromContent(tweetData.content);
      tweetData.tags = autoTags;
      tweetData.category = selectedCategory;

      // 发送到background script保存
      const result = await this.saveTweetToNotion(tweetData);

      if (result.success) {
        this.setButtonSaved(button);
        this.showNotification('推文已保存到Notion', 'success');
      } else {
        throw new Error(result.error || '保存失败');
      }

    } catch (error) {
      this.showError(error, 'NotionButtonManager.handleSaveTweet');
      this.setButtonLoading(button, false);
    }
  }

  private setButtonLoading(button: HTMLElement, loading: boolean) {
    if (loading) {
      button.classList.add('loading');
      const content = button.querySelector('.notion-btn-content');
      if (content) {
        content.innerHTML = `
          <div class="spinner"></div>
          <span>保存中...</span>
        `;
      }
    } else {
      button.classList.remove('loading');
      this.resetButtonContent(button);
    }
  }

  private setButtonSaved(button: HTMLElement) {
    button.classList.remove('loading');
    button.classList.add('saved');
    const content = button.querySelector('.notion-btn-content');
    if (content) {
      content.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="#00d564">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        <span>已保存</span>
      `;
    }

    // 3秒后恢复原状
    setTimeout(() => {
      if (button.isConnected) {
        button.classList.remove('saved');
        this.resetButtonContent(button);
      }
    }, 3000);
  }

  private resetButtonContent(button: HTMLElement) {
    const content = button.querySelector('.notion-btn-content');
    if (content) {
      content.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
          <path d="M4.459 4.208c.746-.24 1.352-.17 2.355-.137l10.58.285c1.504.034 2.57.137 3.64 1.09 1.07.952 1.07 1.904 1.07 3.355v7.344c0 2.367 0 3.73-1.07 4.682-1.07.952-2.136 1.055-3.64 1.09l-10.58.285c-1.003.033-1.609.103-2.355-.137C3.117 21.85 2.5 20.967 2.5 19.344V4.656c0-1.623.617-2.506 1.959-2.448zm1.582 3.368v8.704c0 .205.171.376.376.376h11.167c.205 0 .376-.171.376-.376V7.576c0-.205-.171-.376-.376-.376H6.417c-.205 0-.376.171-.376.376z"/>
        </svg>
        <span>保存到Notion</span>
      `;
    }
  }

  private async checkTweetExists(url: string): Promise<boolean> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'NOTION_CHECK_EXISTS',
        url: url
      });
      return response.exists || false;
    } catch (error) {
      this.showError(error, 'NotionButtonManager.checkTweetExists');
      return false;
    }
  }

  private async saveTweetToNotion(tweetData: TweetData): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'NOTION_SAVE_TWEET',
        data: tweetData
      });
      return response;
    } catch (error) {
      const notionError = notionErrorHandler.handleError(error, 'NotionButtonManager.saveTweetToNotion');
      return {
        success: false,
        error: notionErrorHandler.getUserFriendlyMessage(notionError)
      };
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    const notification = document.createElement('div');
    notification.className = `tweet-craft-notification ${type}`;
    notification.textContent = message;

    const style = document.createElement('style');
    if (!document.getElementById('notification-styles')) {
      style.id = 'notification-styles';
      style.textContent = `
        .tweet-craft-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10000;
          font-size: 14px;
          font-weight: 500;
          max-width: 300px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          transition: all 0.3s ease;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .tweet-craft-notification.success {
          background: #00d564;
          color: white;
        }

        .tweet-craft-notification.error {
          background: #f91880;
          color: white;
        }

        .tweet-craft-notification.warning {
          background: #ff9500;
          color: white;
        }

        .tweet-craft-notification.info {
          background: #1d9bf0;
          color: white;
        }

        .tweet-craft-notification.hide {
          opacity: 0;
          transform: translateX(100%);
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // 3秒后自动移除
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  private showError(error: any, context: string = '') {
    const notionError = notionErrorHandler.handleError(error, context);
    const userMessage = notionErrorHandler.getUserFriendlyMessage(notionError);
    this.showNotification(userMessage, 'error');
  }

  private async showCategorySelector(): Promise<string | null> {
    return new Promise((resolve) => {
      const categories = [
        { name: '技术', color: '#0066CC' },
        { name: '资讯', color: '#00AA55' },
        { name: '学习', color: '#8B5CF6' },
        { name: '工作', color: '#DC2626' },
        { name: '生活', color: '#F59E0B' },
        { name: '其他', color: '#6B7280' }
      ];

      // 创建模态对话框
      const modal = document.createElement('div');
      modal.className = 'tweet-craft-category-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 16px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
        animation: modalSlideIn 0.3s ease-out;
      `;

      // 添加动画样式
      if (!document.getElementById('category-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'category-modal-styles';
        style.textContent = `
          @keyframes modalSlideIn {
            from { 
              opacity: 0; 
              transform: translateY(-20px) scale(0.95); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0) scale(1); 
            }
          }
          
          .category-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
          }
        `;
        document.head.appendChild(style);
      }

      const title = document.createElement('h3');
      title.textContent = '选择分类';
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        text-align: center;
      `;

      const subtitle = document.createElement('p');
      subtitle.textContent = '为这条推文选择一个分类：';
      subtitle.style.cssText = `
        margin: 0 0 20px 0;
        color: #6b7280;
        font-size: 14px;
        text-align: center;
      `;

      const categoryGrid = document.createElement('div');
      categoryGrid.style.cssText = `
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
        margin-bottom: 20px;
      `;

      categories.forEach(category => {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';
        categoryItem.style.cssText = `
          padding: 12px 16px;
          border: 2px solid ${category.color}20;
          background: ${category.color}10;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
          font-weight: 500;
          color: ${category.color};
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 48px;
        `;
        
        categoryItem.textContent = category.name;
        
        categoryItem.addEventListener('click', () => {
          document.body.removeChild(modal);
          resolve(category.name);
        });
        
        categoryGrid.appendChild(categoryItem);
      });

      // 新建分类选项
      const newCategoryItem = document.createElement('div');
      newCategoryItem.className = 'category-item';
      newCategoryItem.style.cssText = `
        padding: 12px 16px;
        border: 2px dashed #d1d5db;
        background: #f9fafb;
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        text-align: center;
        font-weight: 500;
        color: #6b7280;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 48px;
        grid-column: span 2;
      `;
      
      newCategoryItem.innerHTML = '+ 新建分类';
      newCategoryItem.addEventListener('click', async () => {
        const customCategory = await this.showNewCategoryDialog();
        document.body.removeChild(modal);
        resolve(customCategory);
      });
      
      categoryGrid.appendChild(newCategoryItem);

      // 取消按钮
      const cancelButton = document.createElement('button');
      cancelButton.textContent = '取消';
      cancelButton.style.cssText = `
        width: 100%;
        padding: 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        color: #6b7280;
        transition: all 0.2s ease;
      `;
      
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#f9fafb';
        cancelButton.style.borderColor = '#9ca3af';
      });

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = 'white';
        cancelButton.style.borderColor = '#d1d5db';
      });

      dialog.appendChild(title);
      dialog.appendChild(subtitle);
      dialog.appendChild(categoryGrid);
      dialog.appendChild(cancelButton);
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      // 点击背景关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });

      // ESC键关闭
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          document.body.removeChild(modal);
          document.removeEventListener('keydown', handleEscape);
          resolve(null);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  private async showNewCategoryDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const modal = document.createElement('div');
      modal.className = 'tweet-craft-new-category-modal';
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10001;
        backdrop-filter: blur(4px);
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 16px;
        max-width: 350px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        animation: modalSlideIn 0.3s ease-out;
      `;

      const title = document.createElement('h3');
      title.textContent = '新建分类';
      title.style.cssText = `
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        text-align: center;
      `;

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = '输入分类名称...';
      input.style.cssText = `
        width: 100%;
        padding: 12px 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        box-sizing: border-box;
        margin-bottom: 20px;
        transition: border-color 0.2s ease;
      `;

      input.addEventListener('focus', () => {
        input.style.borderColor = '#3b82f6';
        input.style.outline = 'none';
      });

      input.addEventListener('blur', () => {
        input.style.borderColor = '#e5e7eb';
      });

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        gap: 12px;
      `;

      const confirmButton = document.createElement('button');
      confirmButton.textContent = '确认';
      confirmButton.style.cssText = `
        flex: 1;
        padding: 12px;
        border: none;
        background: #3b82f6;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s ease;
      `;

      const cancelButton = document.createElement('button');
      cancelButton.textContent = '取消';
      cancelButton.style.cssText = `
        flex: 1;
        padding: 12px;
        border: 1px solid #d1d5db;
        background: white;
        color: #6b7280;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      `;

      const handleConfirm = () => {
        const categoryName = input.value.trim();
        if (categoryName) {
          document.body.removeChild(modal);
          resolve(categoryName);
        } else {
          input.style.borderColor = '#ef4444';
          input.focus();
        }
      };

      const handleCancel = () => {
        document.body.removeChild(modal);
        resolve(null);
      };

      confirmButton.addEventListener('click', handleConfirm);
      cancelButton.addEventListener('click', handleCancel);

      // 回车确认
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          handleConfirm();
        } else if (e.key === 'Escape') {
          handleCancel();
        }
      });

      confirmButton.addEventListener('mouseenter', () => {
        confirmButton.style.background = '#2563eb';
      });

      confirmButton.addEventListener('mouseleave', () => {
        confirmButton.style.background = '#3b82f6';
      });

      cancelButton.addEventListener('mouseenter', () => {
        cancelButton.style.background = '#f9fafb';
        cancelButton.style.borderColor = '#9ca3af';
      });

      cancelButton.addEventListener('mouseleave', () => {
        cancelButton.style.background = 'white';
        cancelButton.style.borderColor = '#d1d5db';
      });

      buttonContainer.appendChild(confirmButton);
      buttonContainer.appendChild(cancelButton);
      
      dialog.appendChild(title);
      dialog.appendChild(input);
      dialog.appendChild(buttonContainer);
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      // 自动聚焦输入框
      setTimeout(() => input.focus(), 100);

      // 点击背景关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          handleCancel();
        }
      });
    });
  }

  destroy() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.existingTweets = new WeakSet();
  }
}