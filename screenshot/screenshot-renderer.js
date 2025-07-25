/**
 * 截图渲染器 - 基础渲染功能
 * Screenshot Renderer - Basic rendering functionality
 */

class ScreenshotRenderer {
  constructor() {
    this.canvas = null;
    this.context = null;
    this.templateCache = new Map();
    this.html2canvasWrapper = window.html2canvasWrapper;
    
    // 默认样式配置
    this.defaultStyleConfig = {
      theme: 'light',
      backgroundColor: '#ffffff',
      textColor: '#14171a',
      accentColor: '#1da1f2',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: 16,
      lineHeight: 1.5,
      borderRadius: 12,
      padding: 20,
      shadow: true,
      maxWidth: 600
    };
  }

  /**
   * 渲染单个推文
   * @param {Object} tweetData - 推文数据
   * @param {Object} styleConfig - 样式配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderTweet(tweetData, styleConfig = {}) {
    try {
      const mergedConfig = { ...this.defaultStyleConfig, ...styleConfig };
      
      // 创建推文HTML模板
      const htmlContent = this.createTweetTemplate(tweetData, mergedConfig);
      
      // 创建临时容器并渲染
      const tempContainer = this.createTempContainer(htmlContent, mergedConfig);
      document.body.appendChild(tempContainer);
      
      try {
        // 渲染到Canvas
        const canvas = await this.renderToCanvas(tempContainer, {
          width: mergedConfig.maxWidth,
          height: 'auto',
          scale: 2
        });
        
        return canvas;
      } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('推文渲染失败:', error);
      throw new Error(`推文渲染失败: ${error.message}`);
    }
  }

  /**
   * 渲染线程推文
   * @param {Object[]} threadData - 线程推文数据数组
   * @param {Object} styleConfig - 样式配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderThread(threadData, styleConfig = {}) {
    try {
      const mergedConfig = { ...this.defaultStyleConfig, ...styleConfig };
      
      // 创建线程HTML模板
      const htmlContent = this.createThreadTemplate(threadData, mergedConfig);
      
      // 创建临时容器并渲染
      const tempContainer = this.createTempContainer(htmlContent, mergedConfig);
      document.body.appendChild(tempContainer);
      
      try {
        // 渲染到Canvas
        const canvas = await this.renderToCanvas(tempContainer, {
          width: mergedConfig.maxWidth,
          height: 'auto',
          scale: 2
        });
        
        return canvas;
      } finally {
        // 清理临时容器
        document.body.removeChild(tempContainer);
      }
    } catch (error) {
      console.error('线程渲染失败:', error);
      throw new Error(`线程渲染失败: ${error.message}`);
    }
  }

  /**
   * 将HTML内容渲染到Canvas
   * @param {HTMLElement|string} htmlContent - HTML内容或元素
   * @param {Object} dimensions - 尺寸配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderToCanvas(htmlContent, dimensions = {}) {
    try {
      let targetElement;
      
      if (typeof htmlContent === 'string') {
        // 如果是字符串，创建临时元素
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        targetElement = tempDiv.firstElementChild;
      } else {
        targetElement = htmlContent;
      }
      
      if (!targetElement) {
        throw new Error('无效的HTML内容');
      }
      
      // 优化元素用于截图
      const optimizedElement = this.optimizeForScreenshot(targetElement);
      
      // 配置html2canvas选项
      const canvasOptions = {
        backgroundColor: dimensions.backgroundColor || '#ffffff',
        scale: dimensions.scale || 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: dimensions.width || optimizedElement.offsetWidth,
        height: dimensions.height === 'auto' ? null : dimensions.height,
        onclone: (clonedDoc, element) => {
          this.optimizeClonedDocument(clonedDoc, element);
        }
      };
      
      // 使用html2canvas渲染
      const canvas = await this.html2canvasWrapper.captureElement(optimizedElement, canvasOptions);
      
      return canvas;
    } catch (error) {
      console.error('Canvas渲染失败:', error);
      throw new Error(`Canvas渲染失败: ${error.message}`);
    }
  }

  /**
   * 创建推文模板
   * @param {Object} tweetData - 推文数据
   * @param {Object} styleConfig - 样式配置
   * @returns {string} HTML模板
   */
  createTweetTemplate(tweetData, styleConfig) {
    const cacheKey = `tweet_${tweetData.id}_${JSON.stringify(styleConfig)}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }
    
    const template = this.generateTweetHTML(tweetData, styleConfig);
    this.templateCache.set(cacheKey, template);
    
    return template;
  }

  /**
   * 创建线程模板
   * @param {Object[]} threadData - 线程推文数据数组
   * @param {Object} styleConfig - 样式配置
   * @returns {string} HTML模板
   */
  createThreadTemplate(threadData, styleConfig) {
    const threadId = threadData.map(t => t.id).join('_');
    const cacheKey = `thread_${threadId}_${JSON.stringify(styleConfig)}`;
    
    if (this.templateCache.has(cacheKey)) {
      return this.templateCache.get(cacheKey);
    }
    
    const template = this.generateThreadHTML(threadData, styleConfig);
    this.templateCache.set(cacheKey, template);
    
    return template;
  }

  /**
   * 生成推文HTML
   * @param {Object} tweetData - 推文数据
   * @param {Object} styleConfig - 样式配置
   * @returns {string} HTML字符串
   */
  generateTweetHTML(tweetData, styleConfig) {
    const styles = this.generateTweetStyles(styleConfig);
    const formattedDate = this.formatDate(tweetData.timestamp);
    
    return `
      <div class="screenshot-tweet" style="${styles.container}">
        <div class="tweet-header" style="${styles.header}">
          <div class="author-info" style="${styles.authorInfo}">
            <div class="author-name" style="${styles.authorName}">
              ${this.escapeHtml(tweetData.author.name)}
            </div>
            <div class="author-username" style="${styles.authorUsername}">
              @${this.escapeHtml(tweetData.author.username)}
            </div>
          </div>
          <div class="tweet-timestamp" style="${styles.timestamp}">
            ${formattedDate}
          </div>
        </div>
        
        <div class="tweet-content" style="${styles.content}">
          ${this.processContentForHTML(tweetData.content)}
        </div>
        
        ${this.renderMediaHTML(tweetData.media, styleConfig)}
        
        ${styleConfig.showBranding ? this.renderBrandingHTML(styleConfig) : ''}
      </div>
    `;
  }

  /**
   * 生成线程HTML
   * @param {Object[]} threadData - 线程推文数据数组
   * @param {Object} styleConfig - 样式配置
   * @returns {string} HTML字符串
   */
  generateThreadHTML(threadData, styleConfig) {
    const styles = this.generateTweetStyles(styleConfig);
    
    let threadHTML = `<div class="screenshot-thread" style="${styles.threadContainer}">`;
    
    // 线程标题
    if (threadData.length > 1) {
      const author = threadData[0].author;
      threadHTML += `
        <div class="thread-header" style="${styles.threadHeader}">
          🧵 ${this.escapeHtml(author.name)} 的推文线程 (${threadData.length} 条)
        </div>
      `;
    }
    
    // 渲染每条推文
    threadData.forEach((tweetData, index) => {
      if (index > 0) {
        threadHTML += `<div class="thread-connector" style="${styles.threadConnector}"></div>`;
      }
      
      threadHTML += `
        <div class="thread-tweet" style="${styles.threadTweet}">
          ${index > 0 ? `<div class="tweet-number" style="${styles.tweetNumber}">${index + 1}/${threadData.length}</div>` : ''}
          ${this.generateTweetHTML(tweetData, { ...styleConfig, showBranding: false })}
        </div>
      `;
    });
    
    threadHTML += `</div>`;
    
    return threadHTML;
  }

  /**
   * 生成推文样式
   * @param {Object} styleConfig - 样式配置
   * @returns {Object} 样式对象
   */
  generateTweetStyles(styleConfig) {
    const {
      backgroundColor,
      textColor,
      accentColor,
      fontFamily,
      fontSize,
      lineHeight,
      borderRadius,
      padding,
      shadow,
      maxWidth
    } = styleConfig;
    
    return {
      container: `
        background-color: ${backgroundColor};
        color: ${textColor};
        font-family: ${fontFamily};
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        border-radius: ${borderRadius}px;
        padding: ${padding}px;
        max-width: ${maxWidth}px;
        box-sizing: border-box;
        ${shadow ? `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);` : ''}
        border: 1px solid #e1e8ed;
      `,
      header: `
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;
      `,
      authorInfo: `
        display: flex;
        flex-direction: column;
        gap: 2px;
      `,
      authorName: `
        font-weight: 700;
        font-size: ${fontSize}px;
        color: ${textColor};
      `,
      authorUsername: `
        font-weight: 400;
        font-size: ${fontSize - 2}px;
        color: #657786;
      `,
      timestamp: `
        font-size: ${fontSize - 2}px;
        color: #657786;
        white-space: nowrap;
      `,
      content: `
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        color: ${textColor};
        margin-bottom: 12px;
        word-wrap: break-word;
      `,
      threadContainer: `
        background-color: ${backgroundColor};
        padding: ${padding}px;
        border-radius: ${borderRadius}px;
        ${shadow ? `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);` : ''}
      `,
      threadHeader: `
        font-weight: 700;
        font-size: ${fontSize + 2}px;
        color: ${textColor};
        margin-bottom: 16px;
        text-align: center;
      `,
      threadTweet: `
        position: relative;
        margin-bottom: 16px;
      `,
      threadConnector: `
        width: 2px;
        height: 16px;
        background-color: ${accentColor};
        margin: 0 auto 16px auto;
      `,
      tweetNumber: `
        position: absolute;
        top: -8px;
        right: 8px;
        background-color: ${accentColor};
        color: white;
        font-size: ${fontSize - 4}px;
        padding: 2px 6px;
        border-radius: 10px;
        font-weight: 500;
      `
    };
  }

  /**
   * 渲染媒体内容HTML
   * @param {Object} media - 媒体数据
   * @param {Object} styleConfig - 样式配置
   * @returns {string} 媒体HTML
   */
  renderMediaHTML(media, styleConfig) {
    if (!media || (!media.images?.length && !media.videos?.length && !media.links?.length)) {
      return '';
    }
    
    let mediaHTML = '<div class="tweet-media" style="margin-top: 12px;">';
    
    // 渲染图片（简化版本，后续任务会完善）
    if (media.images && media.images.length > 0) {
      mediaHTML += '<div class="media-placeholder" style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #666;">';
      mediaHTML += `📷 ${media.images.length} 张图片`;
      mediaHTML += '</div>';
    }
    
    // 渲染视频（简化版本，后续任务会完善）
    if (media.videos && media.videos.length > 0) {
      mediaHTML += '<div class="media-placeholder" style="background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; color: #666; margin-top: 8px;">';
      mediaHTML += `🎥 ${media.videos.length} 个视频`;
      mediaHTML += '</div>';
    }
    
    mediaHTML += '</div>';
    return mediaHTML;
  }

  /**
   * 渲染品牌标识HTML
   * @param {Object} styleConfig - 样式配置
   * @returns {string} 品牌HTML
   */
  renderBrandingHTML(styleConfig) {
    return `
      <div class="tweet-branding" style="
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e1e8ed;
        text-align: center;
        font-size: 12px;
        color: #657786;
      ">
        Generated by Twitter Enhancer
      </div>
    `;
  }

  /**
   * 优化元素用于截图
   * @param {HTMLElement} element - DOM元素
   * @returns {HTMLElement} 优化后的元素
   */
  optimizeForScreenshot(element) {
    // 创建元素副本
    const optimizedElement = element.cloneNode(true);
    
    // 确保元素可见
    optimizedElement.style.position = 'absolute';
    optimizedElement.style.top = '-9999px';
    optimizedElement.style.left = '-9999px';
    optimizedElement.style.visibility = 'visible';
    optimizedElement.style.opacity = '1';
    optimizedElement.style.display = 'block';
    
    // 修复字体渲染
    this.fixFontRendering(optimizedElement);
    
    // 修复颜色和背景
    this.fixColorRendering(optimizedElement);
    
    return optimizedElement;
  }

  /**
   * 修复字体渲染
   * @param {HTMLElement} element - 元素
   */
  fixFontRendering(element) {
    const allElements = [element, ...element.querySelectorAll('*')];
    
    allElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // 确保字体可见
      if (computedStyle.color === 'transparent') {
        el.style.color = '#000000';
      }
      
      // 确保字体族正确
      if (!el.style.fontFamily) {
        el.style.fontFamily = this.defaultStyleConfig.fontFamily;
      }
    });
  }

  /**
   * 修复颜色渲染
   * @param {HTMLElement} element - 元素
   */
  fixColorRendering(element) {
    const allElements = [element, ...element.querySelectorAll('*')];
    
    allElements.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      
      // 修复透明背景
      if (computedStyle.backgroundColor === 'rgba(0, 0, 0, 0)' || 
          computedStyle.backgroundColor === 'transparent') {
        if (el === element) {
          el.style.backgroundColor = this.defaultStyleConfig.backgroundColor;
        }
      }
    });
  }

  /**
   * 优化克隆的文档
   * @param {Document} clonedDoc - 克隆的文档
   * @param {HTMLElement} element - 目标元素
   */
  optimizeClonedDocument(clonedDoc, element) {
    // 添加字体样式
    const style = clonedDoc.createElement('style');
    style.textContent = `
      * {
        font-family: ${this.defaultStyleConfig.fontFamily} !important;
        -webkit-font-smoothing: antialiased !important;
        -moz-osx-font-smoothing: grayscale !important;
      }
    `;
    clonedDoc.head.appendChild(style);
  }

  /**
   * 创建临时容器
   * @param {string} htmlContent - HTML内容
   * @param {Object} styleConfig - 样式配置
   * @returns {HTMLElement} 临时容器元素
   */
  createTempContainer(htmlContent, styleConfig) {
    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    
    // 设置容器样式
    container.style.position = 'absolute';
    container.style.top = '-9999px';
    container.style.left = '-9999px';
    container.style.visibility = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    
    return container;
  }

  /**
   * 处理HTML格式的内容
   * @param {string} content - 原始内容
   * @returns {string} 处理后的HTML
   */
  processContentForHTML(content) {
    return this.escapeHtml(content)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #1da1f2; text-decoration: none;">$1</a>')
      .replace(/\n/g, '<br>');
  }

  /**
   * 格式化日期
   * @param {string} timestamp - 时间戳
   * @returns {string} 格式化后的日期
   */
  formatDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * HTML转义
   * @param {string} text - 原始文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 处理媒体内容（基础版本，后续任务会完善）
   * @param {Object} mediaData - 媒体数据
   * @returns {Promise<string>} 处理后的媒体HTML
   */
  async handleMediaContent(mediaData) {
    // 基础实现，返回占位符
    // 在任务3.2中会完善此功能
    if (!mediaData) return '';
    
    let mediaHTML = '';
    
    if (mediaData.images && mediaData.images.length > 0) {
      mediaHTML += `<div class="media-placeholder">📷 ${mediaData.images.length} 张图片</div>`;
    }
    
    if (mediaData.videos && mediaData.videos.length > 0) {
      mediaHTML += `<div class="media-placeholder">🎥 ${mediaData.videos.length} 个视频</div>`;
    }
    
    return mediaHTML;
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.templateCache.clear();
  }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.ScreenshotRenderer = ScreenshotRenderer;
}