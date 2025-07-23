/**
 * 剪贴板操作管理器
 * 处理各种格式内容的复制功能，支持现代API和降级方案
 */

class ClipboardManager {
  constructor() {
    this.isModernAPISupported = this.checkModernAPISupport();
    this.copyHistory = [];
    this.maxHistorySize = 50;
  }

  /**
   * 检查是否支持现代剪贴板API
   */
  checkModernAPISupport() {
    return (
      typeof navigator !== 'undefined' &&
      navigator.clipboard &&
      typeof ClipboardItem !== 'undefined' &&
      window.isSecureContext
    );
  }

  /**
   * 主要的复制方法
   * @param {Object} content - 包含html和text格式的内容对象
   * @param {Object} options - 复制选项
   * @returns {Promise<Object>} 复制结果
   */
  async copyToClipboard(content, options = {}) {
    const { 
      format = 'html',
      showNotification = true,
      saveToHistory = true 
    } = options;

    try {
      let result;
      
      if (this.isModernAPISupported) {
        result = await this.copyWithModernAPI(content, format);
      } else {
        result = await this.copyWithFallback(content, format);
      }

      // 保存到历史记录
      if (saveToHistory && result.success) {
        this.addToHistory(content, format);
      }

      // 显示通知
      if (showNotification && result.success) {
        this.showSuccessNotification();
      } else if (showNotification && !result.success) {
        this.showErrorNotification(result.error);
      }

      return result;

    } catch (error) {
      console.error('复制操作失败:', error);
      return { 
        success: false, 
        error: error.message,
        method: 'unknown'
      };
    }
  }

  /**
   * 使用现代剪贴板API复制
   */
  async copyWithModernAPI(content, format) {
    try {
      const clipboardItems = [];
      
      if (format === 'html' && content.html) {
        // 创建包含HTML和文本的剪贴板项
        clipboardItems.push(new ClipboardItem({
          'text/html': new Blob([content.html], { type: 'text/html' }),
          'text/plain': new Blob([content.text || content.html], { type: 'text/plain' })
        }));
      } else {
        // 仅复制文本
        clipboardItems.push(new ClipboardItem({
          'text/plain': new Blob([content.text || content.html], { type: 'text/plain' })
        }));
      }

      await navigator.clipboard.write(clipboardItems);
      
      return { 
        success: true, 
        method: 'modern-api',
        format: format
      };

    } catch (error) {
      console.warn('现代API复制失败，尝试降级方案:', error);
      return await this.copyWithFallback(content, format);
    }
  }

  /**
   * 降级复制方案
   */
  async copyWithFallback(content, format) {
    try {
      // 尝试使用navigator.clipboard.writeText
      if (navigator.clipboard && navigator.clipboard.writeText) {
        const textContent = content.text || this.stripHTML(content.html);
        await navigator.clipboard.writeText(textContent);
        
        return { 
          success: true, 
          method: 'writeText-api',
          format: 'text'
        };
      }

      // 最后的降级方案：使用传统的execCommand
      return this.copyWithExecCommand(content, format);

    } catch (error) {
      console.warn('降级API复制失败，使用execCommand:', error);
      return this.copyWithExecCommand(content, format);
    }
  }

  /**
   * 使用execCommand复制（最后降级方案）
   */
  copyWithExecCommand(content, format) {
    try {
      // 创建临时元素
      const tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.left = '-9999px';
      tempElement.style.top = '-9999px';
      tempElement.style.opacity = '0';
      tempElement.style.pointerEvents = 'none';

      // 根据格式设置内容
      if (format === 'html' && content.html) {
        tempElement.innerHTML = content.html;
      } else {
        tempElement.textContent = content.text || this.stripHTML(content.html);
      }

      document.body.appendChild(tempElement);

      // 选择内容
      const range = document.createRange();
      range.selectNodeContents(tempElement);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);

      // 执行复制命令
      const success = document.execCommand('copy');
      
      // 清理
      selection.removeAllRanges();
      document.body.removeChild(tempElement);

      if (success) {
        return { 
          success: true, 
          method: 'execCommand',
          format: format
        };
      } else {
        throw new Error('execCommand返回false');
      }

    } catch (error) {
      return { 
        success: false, 
        error: `execCommand复制失败: ${error.message}`,
        method: 'execCommand'
      };
    }
  }

  /**
   * 一键复制推文
   * @param {Element} tweetElement - 推文DOM元素
   * @param {Object} options - 复制选项
   */
  async copyTweet(tweetElement, options = {}) {
    try {
      // 解析推文数据（在复制时展开长推文）
      const tweetData = await window.TweetParser.extractTweetDataForCopy(tweetElement);
      
      // 检查是否是线程，并询问用户是否复制整个线程
      if (tweetData.thread && tweetData.thread.isThread && options.askForThread !== false) {
        const shouldCopyThread = await this.askUserForThreadCopy(tweetData);
        if (shouldCopyThread) {
          return await this.copyTweetThread(tweetElement, options);
        }
      }
      
      // 格式化内容
      const formattedContent = window.ContentFormatter.generateCopyContent(tweetData, options);
      
      // 复制到剪贴板
      return await this.copyToClipboard(formattedContent, options);

    } catch (error) {
      console.error('复制推文失败:', error);
      return { 
        success: false, 
        error: error.message,
        method: 'copyTweet'
      };
    }
  }

  /**
   * 复制推文线程
   * @param {Element} startTweetElement - 线程起始推文元素
   * @param {Object} options - 复制选项
   */
  async copyTweetThread(startTweetElement, options = {}) {
    try {
      // 查找线程中的所有推文
      const threadElements = window.TweetParser.findThreadTweets(startTweetElement);
      
      if (threadElements.length <= 1) {
        // 如果只有一条推文，按普通推文处理
        return await this.copyTweet(startTweetElement, { ...options, askForThread: false });
      }

      // 解析所有线程推文数据（在复制时展开长推文）
      const threadData = await Promise.all(
        threadElements.map(element => window.TweetParser.extractTweetDataForCopy(element))
      );

      // 格式化线程内容
      const formattedContent = window.ContentFormatter.formatThread(threadData, options);
      
      // 复制到剪贴板
      const result = await this.copyToClipboard(formattedContent, {
        ...options,
        showNotification: true
      });

      if (result.success) {
        // 更新成功通知
        this.showNotification(t('thread_copied_success', { count: threadData.length }), 'success');
      }

      return {
        ...result,
        threadLength: threadData.length,
        method: 'copyTweetThread'
      };

    } catch (error) {
      console.error('复制推文线程失败:', error);
      return { 
        success: false, 
        error: error.message,
        method: 'copyTweetThread'
      };
    }
  }

  /**
   * 询问用户是否复制整个线程
   * @param {Object} tweetData - 推文数据
   * @returns {Promise<boolean>} 用户选择
   */
  async askUserForThreadCopy(tweetData) {
    return new Promise((resolve) => {
      // 创建询问弹窗
      const modal = document.createElement('div');
      modal.className = 'thread-copy-modal';
      modal.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal-content">
          <h3>${t('thread_detected')}</h3>
          <p>${t('thread_position_info', { position: tweetData.thread.position })}</p>
          <p>${t('thread_copy_question')}</p>
          <div class="modal-buttons">
            <button class="btn-thread">${t('copy_entire_thread')}</button>
            <button class="btn-single">${t('copy_this_only')}</button>
            <button class="btn-cancel">${t('cancel')}</button>
          </div>
        </div>
      `;

      // 添加样式
      const style = document.createElement('style');
      style.textContent = `
        .thread-copy-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(4px);
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          padding: 24px;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }
        .modal-content h3 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 18px;
        }
        .modal-content p {
          margin: 8px 0;
          color: #6b7280;
          line-height: 1.5;
        }
        .modal-buttons {
          display: flex;
          gap: 8px;
          margin-top: 20px;
        }
        .modal-buttons button {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-thread {
          background: #3b82f6;
          color: white;
        }
        .btn-thread:hover {
          background: #2563eb;
        }
        .btn-single {
          background: #e5e7eb;
          color: #374151;
        }
        .btn-single:hover {
          background: #d1d5db;
        }
        .btn-cancel {
          background: #f3f4f6;
          color: #6b7280;
        }
        .btn-cancel:hover {
          background: #e5e7eb;
        }
      `;

      document.head.appendChild(style);
      document.body.appendChild(modal);

      // 绑定事件
      const cleanup = () => {
        document.body.removeChild(modal);
        document.head.removeChild(style);
      };

      modal.querySelector('.btn-thread').addEventListener('click', () => {
        cleanup();
        resolve(true);
      });

      modal.querySelector('.btn-single').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      modal.querySelector('.btn-cancel').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      modal.querySelector('.modal-backdrop').addEventListener('click', () => {
        cleanup();
        resolve(false);
      });

      // 3秒后自动选择复制整个线程
      setTimeout(() => {
        if (document.body.contains(modal)) {
          cleanup();
          resolve(true);
        }
      }, 3000);
    });
  }

  /**
   * 批量复制推文
   * @param {Array} tweetElements - 推文元素数组
   * @param {Object} options - 复制选项
   */
  async copyMultipleTweets(tweetElements, options = {}) {
    const { 
      separator = '\n\n---\n\n',
      format = 'html'
    } = options;

    try {
      const results = [];
      let combinedHTML = '';
      let combinedText = '';

      for (const element of tweetElements) {
        const tweetData = await window.TweetParser.extractTweetDataForCopy(element);
        const formatted = window.ContentFormatter.generateCopyContent(tweetData, options);
        
        results.push({ success: true, data: tweetData });
        
        if (combinedHTML) combinedHTML += separator;
        if (combinedText) combinedText += separator;
        
        combinedHTML += formatted.html;
        combinedText += formatted.text;
      }

      const combinedContent = {
        html: combinedHTML,
        text: combinedText
      };

      const copyResult = await this.copyToClipboard(combinedContent, {
        ...options,
        showNotification: true
      });

      return {
        ...copyResult,
        count: results.length,
        items: results
      };

    } catch (error) {
      console.error('批量复制失败:', error);
      return { 
        success: false, 
        error: error.message,
        method: 'copyMultipleTweets'
      };
    }
  }

  /**
   * 显示成功通知
   */
  showSuccessNotification() {
    this.showNotification('✅ 复制成功！', 'success');
  }

  /**
   * 显示错误通知
   */
  showErrorNotification(error) {
    this.showNotification(`❌ 复制失败: ${error}`, 'error');
  }

  /**
   * 显示通知
   */
  showNotification(message, type = 'info') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `super-copy-notification ${type}`;
    notification.textContent = message;
    
    // 设置样式
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
      transition: 'all 0.3s ease'
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
      }, 300);
    }, 3000);
  }

  /**
   * 添加到复制历史
   */
  addToHistory(content, format) {
    const historyItem = {
      content,
      format,
      timestamp: Date.now(),
      id: `copy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.copyHistory.unshift(historyItem);

    // 限制历史记录大小
    if (this.copyHistory.length > this.maxHistorySize) {
      this.copyHistory = this.copyHistory.slice(0, this.maxHistorySize);
    }

    // 保存到本地存储
    try {
      localStorage.setItem('superCopyHistory', JSON.stringify(this.copyHistory));
    } catch (error) {
      console.warn('保存复制历史失败:', error);
    }
  }

  /**
   * 获取复制历史
   */
  getCopyHistory() {
    try {
      const saved = localStorage.getItem('superCopyHistory');
      if (saved) {
        this.copyHistory = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('读取复制历史失败:', error);
    }
    return this.copyHistory;
  }

  /**
   * 清空复制历史
   */
  clearHistory() {
    this.copyHistory = [];
    try {
      localStorage.removeItem('superCopyHistory');
    } catch (error) {
      console.warn('清空复制历史失败:', error);
    }
  }

  /**
   * 去除HTML标签
   */
  stripHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  /**
   * 获取剪贴板支持信息
   */
  getSupportInfo() {
    return {
      modernAPI: this.isModernAPISupported,
      writeText: !!(navigator.clipboard && navigator.clipboard.writeText),
      execCommand: !!document.execCommand,
      secureContext: window.isSecureContext
    };
  }
}

// 导出全局实例
window.ClipboardManager = window.ClipboardManager || new ClipboardManager(); 