/**
 * Twitter 内容格式化工具
 * 将解析后的推文数据转换为不同的输出格式
 */

class ContentFormatter {
  constructor() {
    this.dateFormatter = new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * 转换为HTML格式
   * @param {Object} tweetData - 推文数据
   * @param {Object} options - 格式化选项
   * @returns {string} HTML格式的推文内容
   */
  toHTML(tweetData, options = {}) {
    const {
      includeAuthor = true,
      includeTimestamp = true,
      includeMedia = true,
      includeMetrics = false,
      includeUrl = true,
      compact = false
    } = options;

    const formattedDate = this.formatDate(tweetData.timestamp);
    
    let html = '<div class="tweet-copy">';
    
    // 头部信息
    if (includeAuthor && !compact) {
      html += `
        <div class="tweet-header">
          <strong class="tweet-author">${this.escapeHtml(tweetData.author.name)}</strong>
          <span class="tweet-username">@${this.escapeHtml(tweetData.author.username)}</span>
          ${includeTimestamp ? `<span class="tweet-timestamp">${formattedDate}</span>` : ''}
        </div>
      `;
    }

    // 主要内容
    html += `<div class="tweet-content">${this.processContentForHTML(tweetData.content)}</div>`;

    // 媒体内容
    if (includeMedia && this.hasMedia(tweetData.media)) {
      html += this.renderMediaHTML(tweetData.media);
    }

    // 互动数据
    if (includeMetrics && this.hasMetrics(tweetData.metrics)) {
      html += this.renderMetricsHTML(tweetData.metrics);
    }

    // 推文链接
    if (includeUrl) {
      html += `
        <div class="tweet-link">
          <a href="${tweetData.url}" target="_blank" rel="noopener noreferrer">查看原推文</a>
        </div>
      `;
    }

    html += '</div>';
    return html;
  }

  /**
   * 转换为Markdown格式
   * @param {Object} tweetData - 推文数据
   * @param {Object} options - 格式化选项
   * @returns {string} Markdown格式的推文内容
   */
  toMarkdown(tweetData, options = {}) {
    const {
      includeAuthor = true,
      includeTimestamp = true,
      includeMedia = true,
      includeMetrics = false,
      includeUrl = true
    } = options;

    const formattedDate = this.formatDate(tweetData.timestamp);
    let markdown = '';

    // 头部信息
    if (includeAuthor) {
      markdown += `**${tweetData.author.name}** (@${tweetData.author.username})`;
      if (includeTimestamp) {
        markdown += `\n*${formattedDate}*`;
      }
      markdown += '\n\n';
    }

    // 主要内容
    markdown += `${this.processContentForMarkdown(tweetData.content)}\n\n`;

    // 媒体内容
    if (includeMedia && this.hasMedia(tweetData.media)) {
      markdown += this.renderMediaMarkdown(tweetData.media);
    }

    // 互动数据
    if (includeMetrics && this.hasMetrics(tweetData.metrics)) {
      markdown += this.renderMetricsMarkdown(tweetData.metrics);
    }

    // 推文链接
    if (includeUrl) {
      markdown += `[查看原推文](${tweetData.url})`;
    }

    return markdown.trim();
  }

  /**
   * 转换为纯文本格式
   * @param {Object} tweetData - 推文数据
   * @param {Object} options - 格式化选项
   * @returns {string} 纯文本格式的推文内容
   */
  toPlainText(tweetData, options = {}) {
    const {
      includeAuthor = true,
      includeTimestamp = true,
      includeMedia = false,
      includeMetrics = false,
      includeUrl = true
    } = options;

    const formattedDate = this.formatDate(tweetData.timestamp);
    let text = '';

    // 头部信息
    if (includeAuthor) {
      text += `${tweetData.author.name} (@${tweetData.author.username})`;
      if (includeTimestamp) {
        text += `\n${formattedDate}`;
      }
      text += '\n\n';
    }

    // 主要内容
    text += `${this.cleanTextContent(tweetData.content)}\n\n`;

    // 媒体信息（简化）
    if (includeMedia && this.hasMedia(tweetData.media)) {
      if (tweetData.media.images.length > 0) {
        text += `[包含 ${tweetData.media.images.length} 张图片]\n`;
      }
      if (tweetData.media.videos.length > 0) {
        text += `[包含 ${tweetData.media.videos.length} 个视频]\n`;
      }
      if (tweetData.media.links.length > 0) {
        text += `[包含链接: ${tweetData.media.links.map(l => l.url).join(', ')}]\n`;
      }
      text += '\n';
    }

    // 互动数据
    if (includeMetrics && this.hasMetrics(tweetData.metrics)) {
      const metrics = [];
      if (tweetData.metrics.likes > 0) metrics.push(`${tweetData.metrics.likes} 点赞`);
      if (tweetData.metrics.retweets > 0) metrics.push(`${tweetData.metrics.retweets} 转发`);
      if (tweetData.metrics.replies > 0) metrics.push(`${tweetData.metrics.replies} 回复`);
      
      if (metrics.length > 0) {
        text += `${metrics.join(' · ')}\n\n`;
      }
    }

    // 推文链接
    if (includeUrl) {
      text += `原推文: ${tweetData.url}`;
    }

    return text.trim();
  }

  /**
   * 处理HTML格式的内容
   */
  processContentForHTML(content) {
    // 转换Markdown链接为HTML链接
    return this.escapeHtml(content)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/g, '<br>');
  }

  /**
   * 处理Markdown格式的内容
   */
  processContentForMarkdown(content) {
    // 内容已经包含Markdown链接格式，直接返回
    return content;
  }

  /**
   * 清理纯文本内容
   */
  cleanTextContent(content) {
    // 移除Markdown链接格式，保留链接文本
    return content.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  }

  /**
   * 渲染媒体内容 - HTML格式
   */
  renderMediaHTML(media) {
    let html = '<div class="tweet-media">';

    // 图片
    if (media.images.length > 0) {
      html += '<div class="tweet-images">';
      media.images.forEach((img, index) => {
        html += `<img src="${img.src}" alt="${this.escapeHtml(img.alt)}" loading="lazy" data-index="${index}">`;
      });
      html += '</div>';
    }

    // 视频（显示为链接）
    if (media.videos.length > 0) {
      html += '<div class="tweet-videos">';
      media.videos.forEach((video, index) => {
        html += `<div class="video-placeholder" data-src="${video.src}">📹 视频 ${index + 1}</div>`;
      });
      html += '</div>';
    }

    // 外部链接
    if (media.links.length > 0) {
      html += '<div class="tweet-links">';
      media.links.forEach(link => {
        html += `<a href="${link.url}" target="_blank" rel="noopener noreferrer" class="external-link">🔗 ${this.escapeHtml(link.text)}</a>`;
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  /**
   * 渲染媒体内容 - Markdown格式
   */
  renderMediaMarkdown(media) {
    let markdown = '';

    // 图片
    if (media.images.length > 0) {
      markdown += '**图片:**\n';
      media.images.forEach((img, index) => {
        markdown += `![${img.alt || `图片${index + 1}`}](${img.src})\n`;
      });
      markdown += '\n';
    }

    // 视频
    if (media.videos.length > 0) {
      markdown += '**视频:**\n';
      media.videos.forEach((video, index) => {
        markdown += `📹 [视频 ${index + 1}](${video.src})\n`;
      });
      markdown += '\n';
    }

    // 外部链接
    if (media.links.length > 0) {
      markdown += '**相关链接:**\n';
      media.links.forEach(link => {
        markdown += `🔗 [${link.text}](${link.url})\n`;
      });
      markdown += '\n';
    }

    return markdown;
  }

  /**
   * 渲染互动数据 - HTML格式
   */
  renderMetricsHTML(metrics) {
    const metricsArray = [];
    
    if (metrics.replies > 0) metricsArray.push(`<span class="metric-replies">${metrics.replies} 回复</span>`);
    if (metrics.retweets > 0) metricsArray.push(`<span class="metric-retweets">${metrics.retweets} 转发</span>`);
    if (metrics.likes > 0) metricsArray.push(`<span class="metric-likes">${metrics.likes} 点赞</span>`);
    
    if (metricsArray.length === 0) return '';
    
    return `<div class="tweet-metrics">${metricsArray.join(' · ')}</div>`;
  }

  /**
   * 渲染互动数据 - Markdown格式
   */
  renderMetricsMarkdown(metrics) {
    const metricsArray = [];
    
    if (metrics.replies > 0) metricsArray.push(`${metrics.replies} 回复`);
    if (metrics.retweets > 0) metricsArray.push(`${metrics.retweets} 转发`);
    if (metrics.likes > 0) metricsArray.push(`${metrics.likes} 点赞`);
    
    if (metricsArray.length === 0) return '';
    
    return `**互动数据:** ${metricsArray.join(' · ')}\n\n`;
  }

  /**
   * 检查是否有媒体内容
   */
  hasMedia(media) {
    return media.images.length > 0 || media.videos.length > 0 || media.links.length > 0;
  }

  /**
   * 检查是否有互动数据
   */
  hasMetrics(metrics) {
    return metrics.likes > 0 || metrics.retweets > 0 || metrics.replies > 0;
  }

  /**
   * 格式化日期
   */
  formatDate(timestamp) {
    try {
      const date = new Date(timestamp);
      return this.dateFormatter.format(date);
    } catch (error) {
      return timestamp;
    }
  }

  /**
   * HTML转义
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化推文线程
   * @param {Array} threadTweets - 线程中的推文数据数组
   * @param {Object} options - 格式化选项
   * @returns {Object} 格式化后的线程内容
   */
  formatThread(threadTweets, options = {}) {
    const format = options.format || 'html';
    const { 
      separator = '\n\n---\n\n',
      addThreadHeader = true,
      addNumbers = true
    } = options;

    if (threadTweets.length <= 1) {
      return this.generateCopyContent(threadTweets[0], options);
    }

    let combinedHTML = '';
    let combinedText = '';
    let combinedMarkdown = '';

    // 添加线程标题
    if (addThreadHeader) {
      const author = threadTweets[0].author;
      const threadHeader = `🧵 ${author.name} (@${author.username}) 的推文线程 (共 ${threadTweets.length} 条)`;
      
      combinedHTML += `<div class="thread-header"><h3>${threadHeader}</h3></div>\n\n`;
      combinedText += `${threadHeader}\n${separator}`;
      combinedMarkdown += `# ${threadHeader}\n\n`;
    }

    // 格式化每条推文
    threadTweets.forEach((tweetData, index) => {
      // 添加分隔符（除了第一条）
      if (index > 0) {
        combinedHTML += '<div class="thread-separator"></div>';
        combinedText += separator;
        combinedMarkdown += '\n---\n\n';
      }

      // 添加编号
      if (addNumbers) {
        const number = `${index + 1}/${threadTweets.length}`;
        combinedHTML += `<div class="thread-number">${number}</div>`;
        combinedText += `${number}\n`;
        combinedMarkdown += `**${number}**\n\n`;
      }

      // 格式化推文内容（不包含作者信息，避免重复）
      const tweetOptions = {
        ...options,
        includeAuthor: index === 0, // 只在第一条显示作者
        compact: index > 0
      };

      const tweetHTML = this.toHTML(tweetData, tweetOptions);
      const tweetText = this.toPlainText(tweetData, { ...tweetOptions, includeAuthor: false });
      const tweetMarkdown = this.toMarkdown(tweetData, { ...tweetOptions, includeAuthor: false });

      combinedHTML += tweetHTML;
      combinedText += tweetText;
      combinedMarkdown += tweetMarkdown;
    });

    // 添加线程总结
    const threadSummary = `\n\n${t('thread_summary', { count: threadTweets.length })}`;
    combinedHTML += `<div class="thread-summary">${threadSummary}</div>`;
    combinedText += threadSummary;
    combinedMarkdown += `\n\n---\n*${threadSummary.trim()}*`;

    // 根据格式返回相应内容
    switch (format.toLowerCase()) {
      case 'html':
        return {
          html: `<div class="tweet-thread">${combinedHTML}</div>`,
          text: combinedText
        };
      case 'markdown':
        return {
          html: `<pre>${this.escapeHtml(combinedMarkdown)}</pre>`,
          text: combinedMarkdown
        };
      case 'plain':
      case 'text':
        return {
          html: `<pre>${this.escapeHtml(combinedText)}</pre>`,
          text: combinedText
        };
      default:
        return {
          html: `<div class="tweet-thread">${combinedHTML}</div>`,
          text: combinedText
        };
    }
  }

  /**
   * 生成完整的复制内容（包含多种格式）
   */
  generateCopyContent(tweetData, options = {}) {
    // 如果是数组（线程），使用线程格式化
    if (Array.isArray(tweetData)) {
      return this.formatThread(tweetData, options);
    }

    // 检查是否是线程的一部分
    if (tweetData.thread && tweetData.thread.isThread && options.includeThread !== false) {
      // 如果有线程数据，提示用户可以复制整个线程
      const threadNote = `\n\n${t('thread_position_info', { position: tweetData.thread.position })}`;
      const singleTweetContent = this.generateSingleTweetContent(tweetData, options);
      
      return {
        html: singleTweetContent.html + `<div class="thread-note">${threadNote}</div>`,
        text: singleTweetContent.text + threadNote
      };
    }

    return this.generateSingleTweetContent(tweetData, options);
  }

  /**
   * 生成单条推文内容
   */
  generateSingleTweetContent(tweetData, options = {}) {
    const format = options.format || 'html';
    
    switch (format.toLowerCase()) {
      case 'html':
        return {
          html: this.toHTML(tweetData, options),
          text: this.toPlainText(tweetData, options)
        };
      case 'markdown':
        return {
          html: `<pre>${this.escapeHtml(this.toMarkdown(tweetData, options))}</pre>`,
          text: this.toMarkdown(tweetData, options)
        };
      case 'plain':
      case 'text':
        return {
          html: `<pre>${this.escapeHtml(this.toPlainText(tweetData, options))}</pre>`,
          text: this.toPlainText(tweetData, options)
        };
      default:
        return {
          html: this.toHTML(tweetData, options),
          text: this.toPlainText(tweetData, options)
        };
    }
  }
}

// 导出全局实例
window.ContentFormatter = window.ContentFormatter || new ContentFormatter(); 