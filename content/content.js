/**
 * Twitter 增强插件 - 内容脚本
 * 负责在 Twitter 页面上注入 UI 组件并处理用户交互
 */

(function() {
  'use strict';

  // 插件配置
  const CONFIG = {
    buttonClassName: 'super-copy-btn',
    tweetSelector: '[data-testid="tweet"]',
    observerConfig: {
      childList: true,
      subtree: true,
      attributes: false
    },
    debounceDelay: 200, // 优化防抖延迟
    maxRetries: 3,
    // 性能优化配置
    batchProcessingSize: 10, // 批量处理推文数量
    intersectionThreshold: 0.1, // 交叉观察器阈值
    cacheTimeout: 300000, // 缓存超时时间 (5分钟)
    maxCacheSize: 200 // 最大缓存数量
  };

  // 全局状态
  let isInitialized = false;
  let observer = null;
  let intersectionObserver = null;
  let debounceTimer = null;
  let performanceManager = null;
  let errorManager = null;
  let uiManager = null;
  let settings = {
    format: 'html',
    includeMedia: true,
    includeMetrics: false,
    includeAuthor: false,  // 默认不包含作者信息，只复制内容
    includeTimestamp: false,  // 默认不包含时间戳，只复制内容
    buttonPosition: 'bottom-right',
    autoDetect: true
  };

  /**
   * 性能管理器 - 优化DOM操作和内存管理
   */
  class PerformanceManager {
    constructor() {
      this.processedTweets = new Set();
      this.tweetCache = new Map();
      this.cleanupTimers = new Map();
      this.batchQueue = [];
      this.isProcessing = false;
      this.lastCleanup = Date.now();
    }

    // 检查推文是否已处理
    isProcessed(tweetElement) {
      const tweetId = this.getTweetId(tweetElement);
      return this.processedTweets.has(tweetId);
    }

    // 标记推文为已处理
    markProcessed(tweetElement) {
      const tweetId = this.getTweetId(tweetElement);
      this.processedTweets.add(tweetId);
      
      // 设置清理定时器
      this.setCleanupTimer(tweetId);
    }

    // 获取推文ID（性能优化版本）
    getTweetId(tweetElement) {
      // 尝试使用缓存的ID
      if (tweetElement._superCopyId) {
        return tweetElement._superCopyId;
      }

      // 尝试从多个可能的位置获取ID
      const urlElement = tweetElement.querySelector('a[href*="/status/"]');
      if (urlElement && urlElement.href) {
        const match = urlElement.href.match(/\/status\/(\d+)/);
        if (match) {
          tweetElement._superCopyId = match[1];
          return match[1];
        }
      }

      // 降级方案：使用元素特征生成ID
      const textContent = tweetElement.querySelector('[data-testid="tweetText"]')?.textContent;
      const timestamp = tweetElement.querySelector('time')?.getAttribute('datetime');
      const id = `fallback_${this.hashCode(textContent || '')}_${timestamp || Date.now()}`;
      
      tweetElement._superCopyId = id;
      return id;
    }

    // 简单哈希函数
    hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
      }
      return Math.abs(hash).toString(36);
    }

    // 添加推文到批处理队列
    addToBatch(tweetElement) {
      if (!this.isProcessed(tweetElement)) {
        this.batchQueue.push(tweetElement);
        this.scheduleBatchProcessing();
      }
    }

    // 调度批处理
    scheduleBatchProcessing() {
      if (this.isProcessing || this.batchQueue.length === 0) {
        return;
      }

      // 使用requestIdleCallback进行性能优化
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => this.processBatch(), { timeout: 1000 });
      } else {
        setTimeout(() => this.processBatch(), 0);
      }
    }

    // 处理批次
    async processBatch() {
      if (this.isProcessing) return;
      
      this.isProcessing = true;
      const batch = this.batchQueue.splice(0, CONFIG.batchProcessingSize);
      
      try {
        for (const tweetElement of batch) {
          if (document.contains(tweetElement)) {
            await this.processSingleTweet(tweetElement);
          }
        }
      } catch (error) {
        console.warn('批处理推文失败:', error);
      } finally {
        this.isProcessing = false;
        
        // 如果还有待处理的推文，继续处理
        if (this.batchQueue.length > 0) {
          this.scheduleBatchProcessing();
        }
      }
    }

    // 处理单个推文
    async processSingleTweet(tweetElement) {
      try {
        const success = injectCopyButton(tweetElement);
        if (success) {
          this.markProcessed(tweetElement);
        }
      } catch (error) {
        if (errorManager) {
          errorManager.recordError('dom', error, {
            operation: 'processSingleTweet',
            tweetId: this.getTweetId(tweetElement)
          });
        } else {
          console.warn('处理推文失败:', error);
        }
      }
    }

    // 设置清理定时器
    setCleanupTimer(tweetId) {
      if (this.cleanupTimers.has(tweetId)) {
        clearTimeout(this.cleanupTimers.get(tweetId));
      }

      const timer = setTimeout(() => {
        this.processedTweets.delete(tweetId);
        this.cleanupTimers.delete(tweetId);
      }, CONFIG.cacheTimeout);

      this.cleanupTimers.set(tweetId, timer);
    }

    // 定期清理
    performCleanup() {
      const now = Date.now();
      
      // 每5分钟执行一次清理
      if (now - this.lastCleanup < CONFIG.cacheTimeout) {
        return;
      }

      // 清理过大的缓存
      if (this.processedTweets.size > CONFIG.maxCacheSize) {
        const toDelete = Array.from(this.processedTweets).slice(0, this.processedTweets.size - CONFIG.maxCacheSize);
        toDelete.forEach(id => {
          this.processedTweets.delete(id);
          if (this.cleanupTimers.has(id)) {
            clearTimeout(this.cleanupTimers.get(id));
            this.cleanupTimers.delete(id);
          }
        });
      }

      this.lastCleanup = now;
    }

    // 销毁方法
    destroy() {
      this.cleanupTimers.forEach(timer => clearTimeout(timer));
      this.cleanupTimers.clear();
      this.processedTweets.clear();
      this.tweetCache.clear();
      this.batchQueue = [];
    }
  }

  /**
   * 错误管理器 - 统一错误处理和用户反馈
   */
  class ErrorManager {
    constructor() {
      this.errorCounts = new Map();
      this.lastErrorTime = new Map();
      this.maxErrorsPerType = 5;
      this.errorCooldown = 60000; // 1分钟冷却期
      this.debugMode = false;
    }

    // 记录错误
    recordError(errorType, error, context = {}) {
      const now = Date.now();
      const key = `${errorType}_${error.message}`;
      
      // 检查是否在冷却期
      if (this.isInCooldown(key, now)) {
        return false;
      }

      // 更新错误计数
      const count = this.errorCounts.get(key) || 0;
      this.errorCounts.set(key, count + 1);
      this.lastErrorTime.set(key, now);

      // 如果错误次数过多，触发降级模式
      if (count >= this.maxErrorsPerType) {
        this.triggerFallback(errorType, context);
        return false;
      }

      // 记录错误日志
      this.logError(errorType, error, context, count + 1);
      
      // 显示用户友好的错误提示
      this.showUserError(errorType, error, context);
      
      return true;
    }

    // 检查是否在冷却期
    isInCooldown(key, now) {
      const lastTime = this.lastErrorTime.get(key);
      return lastTime && (now - lastTime) < this.errorCooldown;
    }

    // 记录详细日志
    logError(errorType, error, context, count) {
      const logData = {
        type: errorType,
        message: error.message,
        stack: error.stack,
        context,
        count,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      if (this.debugMode) {
        console.group(`🔴 插件错误 [${errorType}]`);
        console.error('错误详情:', error);
        console.info('上下文:', context);
        console.info('发生次数:', count);
        console.groupEnd();
      } else {
        console.warn(`插件错误 [${errorType}]:`, error.message);
      }

      // 发送错误到后台脚本（用于统计）
      try {
        chrome.runtime.sendMessage({
          action: 'reportError',
          errorData: logData
        });
      } catch (e) {
        // 忽略发送错误
      }
    }

    // 显示用户友好的错误提示
    showUserError(errorType, error, context) {
      let userMessage = '';
      let actionButton = null;

      switch (errorType) {
        case 'clipboard':
          userMessage = t('error_clipboard_permission');
          actionButton = {
            text: t('error_learn_more'),
            action: () => this.showClipboardHelp()
          };
          break;
        
        case 'parse':
          userMessage = t('error_parse_failed');
          actionButton = {
            text: t('error_refresh_page'),
            action: () => window.location.reload()
          };
          break;
        
        case 'network':
          userMessage = t('error_network');
          break;
        
        case 'dom':
          userMessage = t('error_dom_structure');
          break;
        
        default:
          userMessage = t('error_unknown');
      }

      this.showErrorNotification(userMessage, actionButton);
    }

    // 显示错误通知
    showErrorNotification(message, actionButton = null) {
      const notification = document.createElement('div');
      notification.className = 'super-copy-error-notification';
      
      notification.innerHTML = `
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <div class="error-message">${message}</div>
          ${actionButton ? `<button class="error-action-btn">${actionButton.text}</button>` : ''}
          <button class="error-close-btn">×</button>
        </div>
      `;

      // 添加样式
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        color: '#991b1b',
        padding: '12px 16px',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '10000',
        maxWidth: '350px',
        fontSize: '14px'
      });

      // 内容样式
      const style = document.createElement('style');
      style.textContent = `
        .error-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .error-icon {
          font-size: 16px;
          flex-shrink: 0;
        }
        .error-message {
          flex: 1;
          line-height: 1.4;
        }
        .error-action-btn {
          background: #dc2626;
          color: white;
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          margin-left: 8px;
        }
        .error-close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #991b1b;
          margin-left: 8px;
          padding: 0;
          line-height: 1;
        }
      `;
      
      document.head.appendChild(style);
      document.body.appendChild(notification);

      // 绑定事件
      if (actionButton) {
        notification.querySelector('.error-action-btn').addEventListener('click', actionButton.action);
      }
      
      notification.querySelector('.error-close-btn').addEventListener('click', () => {
        document.body.removeChild(notification);
        document.head.removeChild(style);
      });

      // 自动消失
      setTimeout(() => {
        if (notification.parentNode) {
          document.body.removeChild(notification);
          document.head.removeChild(style);
        }
      }, 8000);
    }

    // 触发降级模式
    triggerFallback(errorType, context) {
      console.warn(`🔄 触发降级模式: ${errorType}`);
      
      switch (errorType) {
        case 'clipboard':
          // 降级到简单的文本复制
          this.enableFallbackClipboard();
          break;
        
        case 'parse':
          // 降级到基础解析
          this.enableFallbackParser();
          break;
        
        case 'dom':
          // 降级到简单的DOM操作
          this.enableFallbackDOM();
          break;
      }
    }

    // 剪贴板降级模式
    enableFallbackClipboard() {
      // 禁用现代剪贴板API，只使用execCommand
      if (window.ClipboardManager) {
        window.ClipboardManager.isModernAPISupported = false;
        console.log('📎 已切换到剪贴板降级模式');
      }
    }

    // 解析器降级模式
    enableFallbackParser() {
      // 使用更简单的解析逻辑
      console.log('🔍 已切换到解析器降级模式');
    }

    // DOM操作降级模式  
    enableFallbackDOM() {
      // 停用高级DOM功能
      if (intersectionObserver) {
        intersectionObserver.disconnect();
        intersectionObserver = null;
        console.log('👀 已禁用交叉观察器');
      }
    }

    // 显示剪贴板帮助
    showClipboardHelp() {
      alert(t('clipboard_help_content'));
    }

    // 清理过期错误记录
    cleanup() {
      const now = Date.now();
      for (const [key, time] of this.lastErrorTime.entries()) {
        if (now - time > this.errorCooldown * 2) {
          this.errorCounts.delete(key);
          this.lastErrorTime.delete(key);
        }
      }
    }

    // 启用调试模式
    enableDebugMode() {
      this.debugMode = true;
      console.log('🐛 错误管理器调试模式已启用');
    }
  }

  /**
   * UI管理器 - 用户体验优化和可访问性
   */
  class UIManager {
    constructor() {
      this.animationQueue = [];
      this.isAnimating = false;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      
      // 监听主题变化
      this.setupThemeListeners();
    }

    // 设置主题监听器
    setupThemeListeners() {
      window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
        this.reducedMotion = e.matches;
        this.updateAnimationSettings();
      });

      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        this.darkMode = e.matches;
        this.updateTheme();
      });

      window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
        this.highContrast = e.matches;
        this.updateContrast();
      });
    }

    // 创建优化的按钮元素
    createOptimizedButton(isThread = false) {
      const button = document.createElement('button');
      const buttonId = `super-copy-btn-${Math.random().toString(36).substr(2, 9)}`;
      
      button.className = `${CONFIG.buttonClassName} r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr`;
      button.id = buttonId;
      button.type = 'button';
      
      // 无障碍属性 (国际化)
      if (isThread) {
        button.setAttribute('aria-label', t('copy_thread_aria'));
        button.setAttribute('title', t('copy_thread_aria'));
        button.classList.add('thread-copy-btn');
        button.setAttribute('data-thread', 'true');
      } else {
        button.setAttribute('aria-label', t('copy_tweet_aria'));
        button.setAttribute('title', t('copy_tweet'));
        button.setAttribute('data-thread', 'false');
      }

      // 键盘导航支持
      button.setAttribute('tabindex', '0');
      button.setAttribute('role', 'button');
      
      // 根据用户偏好设置图标
      const iconPath = this.getIconPath(isThread);
      
      button.innerHTML = `
        <div class="css-1dbjc4n r-xoduu5" aria-hidden="true">
          <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
            <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
              ${iconPath}
            </svg>
          </div>
        </div>
      `;

      // 添加键盘事件处理
      this.setupKeyboardNavigation(button);
      
      return button;
    }

    // 获取图标路径
    getIconPath(isThread) {
      if (isThread) {
        return `<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.11 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" fill="currentColor" opacity="0.7"/>
               <path d="M16 1H8c-1.1 0-2 .9-2 2v14h2V3h8V1zm3 4H11c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H11V7h8v14z" fill="currentColor"/>
               <circle cx="20" cy="4" r="3" fill="#1DA1F2" opacity="0.8"/>`;
      } else {
        return `<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>`;
      }
    }

    // 设置键盘导航
    setupKeyboardNavigation(button) {
      button.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.stopPropagation();
          button.click();
        }
      });

      // 焦点管理
      button.addEventListener('focus', () => {
        this.showFocusRing(button);
      });

      button.addEventListener('blur', () => {
        this.hideFocusRing(button);
      });
    }

    // 显示焦点环
    showFocusRing(button) {
      if (!this.reducedMotion) {
        button.style.outline = '2px solid #3b82f6';
        button.style.outlineOffset = '2px';
      } else {
        button.style.outline = '3px solid #3b82f6';
      }
    }

    // 隐藏焦点环
    hideFocusRing(button) {
      button.style.outline = '';
      button.style.outlineOffset = '';
    }

    // 优化的悬停效果
    setupOptimizedHoverEffects(button, isThread = false) {
      const hoverColor = this.darkMode ? 'rgb(59, 130, 246)' : 'rgb(29, 155, 240)';
      const hoverBg = isThread ? 'rgba(29, 155, 240, 0.15)' : 'rgba(29, 155, 240, 0.1)';

      // 使用事件委托优化性能
      button.addEventListener('mouseenter', () => {
        this.animateButtonHover(button, true, hoverColor, hoverBg, isThread);
      });

      button.addEventListener('mouseleave', () => {
        this.animateButtonHover(button, false, hoverColor, hoverBg, isThread);
      });

      // 触摸设备支持
      button.addEventListener('touchstart', () => {
        this.animateButtonHover(button, true, hoverColor, hoverBg, isThread);
      }, { passive: true });

      button.addEventListener('touchend', () => {
        setTimeout(() => {
          this.animateButtonHover(button, false, hoverColor, hoverBg, isThread);
        }, 150);
      }, { passive: true });
    }

    // 动画化按钮悬停效果
    animateButtonHover(button, isHover, hoverColor, hoverBg, isThread) {
      if (this.reducedMotion) {
        // 简化动画用于减少动作偏好
        if (isHover) {
          button.style.backgroundColor = hoverBg;
          button.style.color = hoverColor;
        } else {
          button.style.backgroundColor = '';
          button.style.color = '';
        }
        return;
      }

      // 完整动画效果
      const animation = {
        button,
        isHover,
        hoverColor,
        hoverBg,
        isThread
      };

      this.queueAnimation(animation);
    }

    // 动画队列管理
    queueAnimation(animation) {
      this.animationQueue.push(animation);
      if (!this.isAnimating) {
        this.processAnimationQueue();
      }
    }

    // 处理动画队列
    async processAnimationQueue() {
      this.isAnimating = true;

      while (this.animationQueue.length > 0) {
        const animation = this.animationQueue.shift();
        await this.executeAnimation(animation);
      }

      this.isAnimating = false;
    }

    // 执行单个动画
    async executeAnimation(animation) {
      const { button, isHover, hoverColor, hoverBg, isThread } = animation;

      return new Promise(resolve => {
        if (isHover) {
          button.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
          button.style.backgroundColor = hoverBg;
          button.style.color = hoverColor;
          
          if (isThread) {
            button.style.transform = 'scale(1.08)';
            button.style.boxShadow = '0 2px 8px rgba(29, 155, 240, 0.3)';
          } else {
            button.style.transform = 'scale(1.05)';
          }
        } else {
          button.style.backgroundColor = '';
          button.style.color = '';
          button.style.transform = '';
          button.style.boxShadow = '';
        }

        setTimeout(resolve, this.reducedMotion ? 0 : 200);
      });
    }

    // 显示优化的加载状态
    showOptimizedLoading(button, isLoading) {
      const svg = button.querySelector('svg');
      
      if (isLoading) {
        button.style.opacity = '0.6';
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('aria-label', t('copying'));
        
        if (!this.reducedMotion && svg) {
          svg.style.animation = 'spin 1s linear infinite';
        }
      } else {
        button.style.opacity = '';
        button.removeAttribute('aria-busy');
        button.setAttribute('aria-label', button.dataset.thread === 'true' ? 
          t('copy_thread_aria') : t('copy_tweet_aria'));
        
        if (svg) {
          svg.style.animation = '';
        }
      }
    }

    // 显示增强的成功状态
    showEnhancedSuccess(button, isThread = false, threadLength = 0) {
      const originalHTML = button.innerHTML;
      const originalLabel = button.getAttribute('aria-label');
      
      let successMessage = t('copy_success');
      if (isThread && threadLength > 0) {
        successMessage = t('thread_copied_success', { count: threadLength });
      }

      // 更新无障碍标签
      button.setAttribute('aria-label', successMessage);
      
      // 成功图标
      const successIcon = `
        <div class="css-1dbjc4n r-xoduu5">
          <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
            <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#10b981"/>
              ${isThread && threadLength > 0 ? `
                <circle cx="20" cy="4" r="3" fill="#10b981"/>
                <text x="20" y="6" text-anchor="middle" fill="white" font-size="4" font-weight="bold">${Math.min(threadLength, 99)}</text>
              ` : ''}
            </svg>
          </div>
        </div>
      `;

      button.innerHTML = successIcon;

      // 视觉反馈
      if (!this.reducedMotion) {
        button.style.background = 'rgba(16, 185, 129, 0.1)';
        button.style.transform = 'scale(1.1)';
      }

      // 恢复原始状态
      const duration = isThread ? 2000 : 1500;
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.setAttribute('aria-label', originalLabel);
        button.style.background = '';
        button.style.transform = '';
      }, duration);
    }

    // 更新动画设置
    updateAnimationSettings() {
      // 更新现有按钮的动画设置
      const buttons = document.querySelectorAll(`.${CONFIG.buttonClassName}`);
      buttons.forEach(button => {
        if (this.reducedMotion) {
          button.style.transition = 'none';
        } else {
          button.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
        }
      });
    }

    // 更新主题
    updateTheme() {
      // 这里可以添加主题相关的更新逻辑
      console.log(`🎨 主题已更新: ${this.darkMode ? '深色' : '浅色'}`);
    }

    // 更新对比度
    updateContrast() {
      // 这里可以添加高对比度相关的更新逻辑
      console.log(`🔆 对比度已更新: ${this.highContrast ? '高对比度' : '普通'}`);
    }

    // 创建可访问的通知
    createAccessibleNotification(message, type = 'info', duration = 3000) {
      const notification = document.createElement('div');
      notification.setAttribute('role', 'alert');
      notification.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
      notification.className = `super-copy-notification ${type}`;
      
      notification.textContent = message;
      
      // 样式
      Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 16px',
        backgroundColor: type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6',
        color: 'white',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateY(-10px)',
        transition: this.reducedMotion ? 'none' : 'all 0.3s ease'
      });

      document.body.appendChild(notification);

      // 显示动画
      requestAnimationFrame(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
      });

      // 自动移除
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, this.reducedMotion ? 0 : 300);
      }, duration);

      return notification;
    }
  }

  /**
   * 主初始化函数
   */
  function initializeSuperCopy() {
    if (isInitialized) return;

    console.log('🚀 Twitter 超级复制插件启动');
    
    // 加载设置
    loadSettings();
    
    // 初始化性能管理器
    performanceManager = new PerformanceManager();
    
    // 初始化错误管理器
    errorManager = new ErrorManager();
    
    // 初始化UI管理器
    uiManager = new UIManager();
    
    // 全局错误处理
    window.addEventListener('error', (event) => {
      if (errorManager) {
        errorManager.recordError('global', event.error, {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        });
      }
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      if (errorManager) {
        errorManager.recordError('promise', new Error(event.reason), {
          reason: event.reason
        });
      }
    });
    
    // 等待必要的工具类加载完成
    waitForDependencies()
      .then(() => {
        // 初始化UI
        injectUI();
        
        // 启动DOM监听器
        startDOMObserver();
        
        // 启动交叉观察器
        startIntersectionObserver();
        
        // 设置事件监听器
        setupEventListeners();
        
        // 启动性能监控
        startPerformanceMonitoring();
        
        isInitialized = true;
        console.log('✅ Twitter 超级复制插件初始化完成');
      })
      .catch(error => {
        console.error('❌ 插件初始化失败:', error);
        // 延迟重试
        setTimeout(() => {
          isInitialized = false;
          cleanup();
          initializeSuperCopy();
        }, 2000);
      });
  }

  /**
   * 清理资源
   */
  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    
    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
    
    if (performanceManager) {
      performanceManager.destroy();
      performanceManager = null;
    }
    
    if (errorManager) {
      errorManager.cleanup();
      errorManager = null;
    }
    
    if (uiManager) {
      // UI管理器通常不需要特殊清理
      uiManager = null;
    }
    
    clearTimeout(debounceTimer);
  }

  /**
   * 等待依赖模块加载完成
   */
  async function waitForDependencies(maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      if (window.TweetParser && window.ContentFormatter && window.ClipboardManager) {
        return Promise.resolve();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('依赖模块加载超时');
  }

  /**
   * 注入所有推文的UI按钮（优化版本）
   */
  function injectUI() {
    if (!performanceManager) return;

    const tweets = document.querySelectorAll(CONFIG.tweetSelector);
    
    // 批量处理推文
    tweets.forEach(tweet => {
      performanceManager.addToBatch(tweet);
    });

    console.log(`📎 排队处理 ${tweets.length} 个推文`);
  }

  /**
   * 启动交叉观察器 - 只处理可见的推文
   */
  function startIntersectionObserver() {
    if (!window.IntersectionObserver || intersectionObserver) {
      return;
    }

    intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && performanceManager) {
          const tweet = entry.target;
          if (!performanceManager.isProcessed(tweet)) {
            performanceManager.addToBatch(tweet);
          }
        }
      });
    }, {
      threshold: CONFIG.intersectionThreshold,
      rootMargin: '100px' // 提前100px开始处理
    });

    // 观察现有推文
    const existingTweets = document.querySelectorAll(CONFIG.tweetSelector);
    existingTweets.forEach(tweet => {
      intersectionObserver.observe(tweet);
    });

    console.log('👀 交叉观察器已启动');
  }

  /**
   * 启动性能监控
   */
  function startPerformanceMonitoring() {
    // 定期清理缓存
    setInterval(() => {
      if (performanceManager) {
        performanceManager.performCleanup();
      }
    }, 60000); // 每分钟清理一次

    // 页面可见性变化时的处理
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // 页面隐藏时，暂停处理
        if (performanceManager) {
          performanceManager.isProcessing = false;
        }
      } else {
        // 页面显示时，重新扫描
        setTimeout(injectUI, 500);
      }
    });

    console.log('📊 性能监控已启动');
  }

  /**
   * 为单个推文注入复制按钮
   */
  function injectCopyButton(tweetElement) {
    try {
      // 检查是否已经有按钮
      if (tweetElement.querySelector(`.${CONFIG.buttonClassName}`)) {
        return false;
      }

      // 查找合适的插入位置
      const insertTarget = findInsertionPoint(tweetElement);
      if (!insertTarget) {
        return false;
      }

      // 解析推文数据以检查线程信息
      const tweetData = window.TweetParser ? window.TweetParser.extractTweetData(tweetElement) : null;
      const isThread = tweetData?.thread?.isThread || false;

      // 创建复制按钮
      const copyButton = createCopyButton(isThread);
      
      // 插入按钮
      insertCopyButton(insertTarget, copyButton, tweetElement, isThread);
      
      // 如果是线程，添加线程指示器
      if (isThread && tweetData.thread) {
        addThreadIndicator(tweetElement, tweetData.thread);
      }
      
      return true;

    } catch (error) {
      console.warn('注入复制按钮失败:', error);
      return false;
    }
  }

  /**
   * 查找按钮插入位置
   */
  function findInsertionPoint(tweetElement) {
    // 尝试多个可能的插入位置
    const selectors = [
      '[data-testid="like"]',
      '[data-testid="retweet"]', 
      '[data-testid="reply"]',
      '[role="group"]',
      '.r-1re7ezh', // Twitter的工具栏类名
      '.css-1dbjc4n.r-18u37iz' // 备选工具栏
    ];

    for (const selector of selectors) {
      const element = tweetElement.querySelector(selector);
      if (element) {
        // 找到最近的父级工具栏容器
        return element.closest('[role="group"]') || element.parentElement;
      }
    }

    return null;
  }

  /**
   * 创建复制按钮元素 (优化版本)
   */
  function createCopyButton(isThread = false) {
    // 如果有UI管理器，使用优化版本
    if (uiManager) {
      return uiManager.createOptimizedButton(isThread);
    }
    
    // 降级到基础版本
    const button = document.createElement('button');
    button.className = `${CONFIG.buttonClassName} r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr`;
    
    if (isThread) {
      button.setAttribute('aria-label', t('copy_thread'));
      button.setAttribute('title', t('copy_thread_aria'));
      button.classList.add('thread-copy-btn');
    } else {
      button.setAttribute('aria-label', t('copy_tweet'));
      button.setAttribute('title', t('copy_tweet'));
    }
    
    button.type = 'button';

    // 根据是否为线程使用不同的图标
    const iconPath = isThread ? 
      // 线程图标（多个文档堆叠）
      `<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 2 2h12c1.11 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" fill="currentColor" opacity="0.7"/>
       <path d="M16 1H8c-1.1 0-2 .9-2 2v14h2V3h8V1zm3 4H11c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H11V7h8v14z" fill="currentColor"/>
       <circle cx="20" cy="4" r="3" fill="#1DA1F2" opacity="0.8"/>` :
      // 普通复制图标
      `<path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>`;

    // 按钮内容
    button.innerHTML = `
      <div class="css-1dbjc4n r-xoduu5">
        <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
          <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
            ${iconPath}
          </svg>
        </div>
      </div>
    `;

    return button;
  }

  /**
   * 插入复制按钮到适当位置
   */
  function insertCopyButton(container, button, tweetElement, isThread = false) {
    // 创建按钮容器以匹配Twitter的样式结构
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'css-1dbjc4n r-18u37iz r-1h0z5md';
    buttonContainer.appendChild(button);

    // 添加点击事件
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      await handleCopyClick(tweetElement, button, isThread);
    });

    // 添加悬停效果
    setupButtonHoverEffects(button, isThread);

    // 插入到容器
    container.appendChild(buttonContainer);
  }

  /**
   * 添加线程指示器
   */
  function addThreadIndicator(tweetElement, threadInfo) {
    try {
      // 避免重复添加
      if (tweetElement.querySelector('.thread-indicator')) {
        return;
      }

      const indicator = document.createElement('div');
      indicator.className = 'thread-indicator';
      
      // 根据线程位置显示不同的指示器
      const position = threadInfo.position > 0 ? threadInfo.position : '?';
      const total = threadInfo.total > 0 ? threadInfo.total : '?';
      
      indicator.innerHTML = `
        <div class="thread-badge">
          <span class="thread-emoji">🧵</span>
          <span class="thread-position">${position}/${total}</span>
        </div>
      `;

      // 添加样式
      const style = `
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 1;
        pointer-events: none;
        opacity: 0.8;
      `;
      
      indicator.setAttribute('style', style);

      // 插入到推文元素
      const tweetContent = tweetElement.querySelector('[data-testid="tweetText"]')?.parentElement;
      if (tweetContent && tweetContent.style.position !== 'relative') {
        tweetContent.style.position = 'relative';
        tweetContent.appendChild(indicator);
      }
      
    } catch (error) {
      console.warn('添加线程指示器失败:', error);
    }
  }

  /**
   * 设置按钮悬停效果 (优化版本)
   */
  function setupButtonHoverEffects(button, isThread = false) {
    // 如果有UI管理器，使用优化版本
    if (uiManager) {
      uiManager.setupOptimizedHoverEffects(button, isThread);
      return;
    }

    // 降级到基础版本
    const hoverColor = isThread ? 'rgb(29, 155, 240)' : 'rgb(29, 155, 240)';
    const hoverBg = isThread ? 'rgba(29, 155, 240, 0.15)' : 'rgba(29, 155, 240, 0.1)';

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = hoverBg;
      button.style.color = hoverColor;
      
      if (isThread) {
        button.style.transform = 'scale(1.08)';
        button.style.boxShadow = '0 2px 8px rgba(29, 155, 240, 0.3)';
      } else {
        button.style.transform = 'scale(1.05)';
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = '';
      button.style.color = '';
      button.style.transform = '';
      button.style.boxShadow = '';
    });
  }

  /**
   * 处理复制按钮点击
   */
  async function handleCopyClick(tweetElement, buttonElement, isThread = false) {
    try {
      // 显示加载状态
      showButtonLoading(buttonElement, true);

      // 执行复制操作
      const copyOptions = {
        format: settings.format,
        includeMedia: settings.includeMedia,
        includeMetrics: settings.includeMetrics,
        includeAuthor: settings.includeAuthor,
        includeTimestamp: settings.includeTimestamp,
        showNotification: true,
        isThread: isThread
      };

      const result = await window.ClipboardManager.copyTweet(tweetElement, copyOptions);

      // 显示结果反馈
      if (result.success) {
        if (result.threadLength && result.threadLength > 1) {
          // 线程复制成功 (使用UI管理器优化版本)
          if (uiManager) {
            uiManager.showEnhancedSuccess(buttonElement, true, result.threadLength);
          } else {
            showButtonThreadSuccess(buttonElement, result.threadLength);
          }
        } else {
          // 普通复制成功 (使用UI管理器优化版本)
          if (uiManager) {
            uiManager.showEnhancedSuccess(buttonElement, false);
          } else {
            showButtonSuccess(buttonElement);
          }
        }
      } else {
        showButtonError(buttonElement);
        console.error('复制失败:', result.error);
      }

    } catch (error) {
      showButtonError(buttonElement);
      
      if (errorManager) {
        errorManager.recordError('clipboard', error, {
          operation: 'handleCopyClick',
          format: settings.format,
          isThread: isThread
        });
      } else {
        console.error('复制操作异常:', error);
      }
    } finally {
      // 恢复按钮状态
      setTimeout(() => {
        showButtonLoading(buttonElement, false);
      }, 2000);
    }
  }

  /**
   * 显示按钮加载状态 (优化版本)
   */
  function showButtonLoading(button, isLoading) {
    // 如果有UI管理器，使用优化版本
    if (uiManager) {
      uiManager.showOptimizedLoading(button, isLoading);
      return;
    }

    // 降级版本
    const svg = button.querySelector('svg');
    if (isLoading) {
      button.style.opacity = '0.6';
      if (svg) svg.style.animation = 'spin 1s linear infinite';
    } else {
      button.style.opacity = '';
      if (svg) svg.style.animation = '';
    }
  }

  /**
   * 显示按钮成功状态
   */
  function showButtonSuccess(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <div class="css-1dbjc4n r-xoduu5">
        <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
          <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#10b981"/>
          </svg>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 1500);
  }

  /**
   * 显示线程复制成功状态
   */
  function showButtonThreadSuccess(button, threadLength) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <div class="css-1dbjc4n r-xoduu5">
        <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
          <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#10b981"/>
            <circle cx="20" cy="4" r="3" fill="#10b981"/>
            <text x="20" y="6" text-anchor="middle" fill="white" font-size="4" font-weight="bold">${threadLength}</text>
          </svg>
        </div>
      </div>
    `;
    
    // 添加一个特殊的动画效果
    button.style.background = 'rgba(16, 185, 129, 0.1)';
    button.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.style.background = '';
      button.style.transform = '';
    }, 2000); // 线程复制显示时间稍长
  }

  /**
   * 显示按钮错误状态
   */
  function showButtonError(button) {
    const originalHTML = button.innerHTML;
    button.innerHTML = `
      <div class="css-1dbjc4n r-xoduu5">
        <div class="css-1dbjc4n r-1niwhzg r-sdzlij r-1p0dtai r-xoduu5 r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-13qz1uu">
          <svg viewBox="0 0 24 24" class="r-4qtqp9 r-yyyyoo r-1xvli5t r-dnmrzs r-bnwqim r-1plcrui r-lrvibr r-1hdv0qi" style="width: 18.75px; height: 18.75px;">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="#ef4444"/>
          </svg>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      button.innerHTML = originalHTML;
    }, 1500);
  }

  /**
   * 启动DOM变化监听器（优化版本）
   */
  function startDOMObserver() {
    if (observer) {
      observer.disconnect();
    }

    observer = new MutationObserver((mutations) => {
      const newTweets = [];

      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // 直接检查新推文并添加到观察器
              if (node.matches && node.matches(CONFIG.tweetSelector)) {
                newTweets.push(node);
              } else if (node.querySelector) {
                const tweets = node.querySelectorAll(CONFIG.tweetSelector);
                newTweets.push(...tweets);
              }
            }
          });
        }
      });

      if (newTweets.length > 0) {
        handleNewTweets(newTweets);
      }
    });

    observer.observe(document.body, CONFIG.observerConfig);
    console.log('👀 DOM 监听器已启动（优化版本）');
  }

  /**
   * 处理新发现的推文
   */
  function handleNewTweets(tweets) {
    // 添加到交叉观察器
    if (intersectionObserver) {
      tweets.forEach(tweet => {
        intersectionObserver.observe(tweet);
      });
    }

    // 防抖处理批量添加
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (performanceManager) {
        tweets.forEach(tweet => {
          performanceManager.addToBatch(tweet);
        });
      }
    }, CONFIG.debounceDelay);
  }

  /**
   * 设置全局事件监听器
   */
  function setupEventListeners() {
    // 键盘快捷键支持
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+C 或 Cmd+Shift+C
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') {
        event.preventDefault();
        handleShortcutCopy();
      }
    });

    // 页面可见性变化时重新初始化
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && isInitialized) {
        setTimeout(injectUI, 500);
      }
    });
  }

  /**
   * 处理快捷键复制
   */
  async function handleShortcutCopy() {
    try {
      // 查找当前焦点的推文或第一个可见推文
      const focusedTweet = findFocusedTweet();
      if (focusedTweet) {
        await window.ClipboardManager.copyTweet(focusedTweet, {
          format: settings.format,
          includeMedia: settings.includeMedia,
          includeMetrics: settings.includeMetrics,
          includeAuthor: settings.includeAuthor,
          includeTimestamp: settings.includeTimestamp,
          showNotification: true
        });
      }
    } catch (error) {
      console.error('快捷键复制失败:', error);
    }
  }

  /**
   * 查找当前焦点的推文
   */
  function findFocusedTweet() {
    // 尝试找到当前活跃的推文
    const tweets = document.querySelectorAll(CONFIG.tweetSelector);
    
    // 首先尝试找到鼠标悬停的推文
    for (const tweet of tweets) {
      if (tweet.matches(':hover')) {
        return tweet;
      }
    }

    // 然后找到屏幕中央的推文
    const viewportHeight = window.innerHeight;
    const centerY = viewportHeight / 2;
    
    for (const tweet of tweets) {
      const rect = tweet.getBoundingClientRect();
      if (rect.top <= centerY && rect.bottom >= centerY) {
        return tweet;
      }
    }

    // 最后返回第一个可见推文
    return tweets[0] || null;
  }

  /**
   * 加载插件设置
   */
  function loadSettings() {
    try {
      const saved = localStorage.getItem('superCopySettings');
      if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('加载设置失败:', error);
    }
  }

  /**
   * 保存插件设置
   */
  function saveSettings() {
    try {
      localStorage.setItem('superCopySettings', JSON.stringify(settings));
    } catch (error) {
      console.warn('保存设置失败:', error);
    }
  }

  /**
   * 监听来自popup的消息
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'updateSettings':
        settings = { ...settings, ...request.settings };
        saveSettings();
        sendResponse({ success: true });
        break;
        
      case 'localeChanged':
        // 处理语言变更
        if (window.I18nManager && request.locale) {
          window.I18nManager.setLocale(request.locale).then(() => {
            console.log('🌍 内容脚本语言已更新为:', request.locale);
          });
        }
        sendResponse({ success: true });
        break;
        
      case 'getSettings':
        sendResponse({ settings });
        break;
        
      case 'copyCurrentTweet':
        handleShortcutCopy()
          .then(() => sendResponse({ success: true }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // 异步响应
        
      default:
        sendResponse({ success: false, error: 'Unknown action' });
    }
  });

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSuperCopy);
  } else {
    // DOM已经加载完成，立即初始化
    setTimeout(initializeSuperCopy, 100);
  }

  // 添加旋转动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

})(); 