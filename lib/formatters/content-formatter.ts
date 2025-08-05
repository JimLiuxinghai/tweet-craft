// 内容格式化器 - 支持 HTML、Markdown、纯文本格式

import type { TweetData, ThreadData, FormatOptions, MediaItem, QuotedTweetData } from '../types';
import { sanitizeHTML, sanitizeText } from '../utils/validation';
import { formatDate, formatFullTimestamp } from '../utils/date';
import { i18nManager } from '../i18n';
import { EnhancedContentFormatter } from './enhanced-content-formatter';

/**
 * 内容格式化器类
 */
export class ContentFormatter {
  private static instance: ContentFormatter;
  
  public static getInstance(): ContentFormatter {
    if (!ContentFormatter.instance) {
      ContentFormatter.instance = new ContentFormatter();
    }
    return ContentFormatter.instance;
  }

  /**
   * 格式化单条推文
   */
  formatTweet(tweet: TweetData, options: FormatOptions): string {
    console.log('📝 使用增强格式化器格式化推文');
    return EnhancedContentFormatter.formatTweet(tweet, options);
  }

  /**
 * 格式化线程
   */
  formatThread(thread: ThreadData, options: FormatOptions): string {
  const formattedTweets = thread.tweets.map(tweet => 
      this.formatTweet(tweet, options)
    );

    const separator = this.getThreadSeparator(options.format);
    const header = this.generateThreadHeader(thread, options);
    const footer = this.generateThreadFooter(thread, options);

    return [
      header,
      ...formattedTweets,
      footer
    ].filter(Boolean).join(separator);
  }

  /**
   * HTML 格式化单条推文
   */
  private formatTweetHTML(tweet: TweetData, options: FormatOptions): string {
    const parts: string[] = [];

    // 开始容器
    parts.push('<div class="tweet-copy">');

    // 作者信息
    if (options.includeAuthor) {
      parts.push('<div class="tweet-header">');
      
  // 头像
      if (tweet.author.avatar) {
        parts.push(`<img src="${sanitizeHTML(tweet.author.avatar)}" alt="${sanitizeHTML(tweet.author.displayName)}" class="tweet-avatar" width="40" height="40">`);
      }
      
      // 作者名称和用户名
      parts.push('<div class="tweet-author-info">');
      parts.push(`<strong class="tweet-display-name">${sanitizeHTML(tweet.author.displayName)}</strong>`);
      parts.push(`<span class="tweet-username">@${sanitizeHTML(tweet.author.username)}</span>`);
      parts.push('</div>');
      
      parts.push('</div>');
    }

    // 推文内容
parts.push('<div class="tweet-content">');
parts.push(this.processContentForHTML(tweet.content));
    parts.push('</div>');

    // 媒体内容
    if (options.includeMedia && tweet.media.length > 0) {
      parts.push('<div class="tweet-media">');
  parts.push(this.formatMediaHTML(tweet.media));
   parts.push('</div>');
    }

    // 时间戳
    if (options.includeTimestamp) {
      const timeStr = formatFullTimestamp(tweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(`<div class="tweet-timestamp">${sanitizeHTML(timeStr)}</div>`);
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('<div class="tweet-metrics">');
      parts.push(`<span class="tweet-replies">${tweet.metrics.replies} ${i18nManager.t('replies')}</span>`);
      parts.push(`<span class="tweet-retweets">${tweet.metrics.retweets} ${i18nManager.t('retweets')}</span>`);
      parts.push(`<span class="tweet-likes">${tweet.metrics.likes} ${i18nManager.t('likes')}</span>`);
      parts.push('</div>');
    }

    // 原推文链接
    if (options.includeLink) {
 parts.push(`<div class="tweet-link"><a href="${sanitizeHTML(tweet.url)}" target="_blank">${i18nManager.t('view_original')}</a></div>`);
    }

    // 结束容器
    parts.push('</div>');

    return parts.join('\n');
  }

  /**
   * Markdown 格式化单条推文
   */
  private formatTweetMarkdown(tweet: TweetData, options: FormatOptions): string {
    const parts: string[] = [];

    // 作者信息
    if (options.includeAuthor) {
      parts.push(`**${tweet.author.displayName}** (@${tweet.author.username})`);
    }

    // 时间戳
    if (options.includeTimestamp) {
    const timeStr = formatFullTimestamp(tweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(`*${timeStr}*`);
 }

    // 空行
    if (options.includeAuthor || options.includeTimestamp) {
  parts.push('');
    }

    // 推文内容
    parts.push(this.processContentForMarkdown(tweet.content));

    // 媒体内容
    if (options.includeMedia && tweet.media.length > 0) {
      parts.push('');
      parts.push(this.formatMediaMarkdown(tweet.media));
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('');
      parts.push(`📊 ${tweet.metrics.replies} ${i18nManager.t('replies')} • ${tweet.metrics.retweets} ${i18nManager.t('retweets')} • ${tweet.metrics.likes} ${i18nManager.t('likes')}`);
    }

    // 原推文链接
    if (options.includeLink) {
      parts.push('');
    parts.push(`[${i18nManager.t('view_original')}](${tweet.url})`);
    }

    return parts.join('\n');
  }

  /**
   * 纯文本格式化单条推文
   */
  private formatTweetText(tweet: TweetData, options: FormatOptions): string {
    const parts: string[] = [];

    // 作者信息
  if (options.includeAuthor) {
      parts.push(`${tweet.author.displayName} (@${tweet.author.username})`);
    }

    // 时间戳
    if (options.includeTimestamp) {
      const timeStr = formatFullTimestamp(tweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(timeStr);
    }

    // 空行
    if (options.includeAuthor || options.includeTimestamp) {
      parts.push('');
    }

    // 推文内容
    parts.push(tweet.content);

    // 媒体内容
    if (options.includeMedia && tweet.media.length > 0) {
    parts.push('');
 parts.push(this.formatMediaText(tweet.media));
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('');
      parts.push(`${tweet.metrics.replies} ${i18nManager.t('replies')} • ${tweet.metrics.retweets} ${i18nManager.t('retweets')} • ${tweet.metrics.likes} ${i18nManager.t('likes')}`);
    }

    // 原推文链接
 if (options.includeLink) {
   parts.push('');
      parts.push(`${i18nManager.t('original_tweet')}: ${tweet.url}`);
    }

    return parts.join('\n');
  }

  /**
   * 处理 HTML 格式的内容
   */
  private processContentForHTML(content: string): string {
    let processed = sanitizeHTML(content);
    
    // 转换换行符为 <br>
    processed = processed.replace(/\n/g, '<br>');
    
    // 处理链接
    processed = processed.replace(
      /https?:\/\/[^\s]+/g,
      '<a href="$&" target="_blank" rel="noopener noreferrer">$&</a>'
    );
    
    // 处理用户名提及
    processed = processed.replace(
      /@(\w+)/g,
      '<a href="https://x.com/$1" target="_blank" rel="noopener noreferrer">@$1</a>'
    );
    
// 处理话题标签
    processed = processed.replace(
      /#(\w+)/g,
      '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener noreferrer">#$1</a>'
    );

    return processed;
  }

  /**
   * 处理 Markdown 格式的内容
   */
  private processContentForMarkdown(content: string): string {
    let processed = content;
    
    // 转义 Markdown 特殊字符
    processed = processed.replace(/([*_`~\[\]\\])/g, '\\$1');
    
    // 处理链接
    processed = processed.replace(
      /https?:\/\/[^\s]+/g,
  '[$&]($&)'
    );
    
    // 处理用户名提及
    processed = processed.replace(
      /@(\w+)/g,
      '[@$1](https://x.com/$1)'
    );
    
    // 处理话题标签
    processed = processed.replace(
      /#(\w+)/g,
  '[#$1](https://x.com/hashtag/$1)'
    );

    return processed;
  }

  /**
   * 格式化媒体内容 - HTML
   */
  private formatMediaHTML(media: MediaItem[]): string {
    const mediaParts: string[] = [];

    for (const item of media) {
    switch (item.type) {
        case 'image':
          mediaParts.push(`<img src="${sanitizeHTML(item.url)}" alt="${sanitizeHTML(item.alt || '')}" class="tweet-image">`);
          break;
    case 'video':
        mediaParts.push(`<video controls class="tweet-video">`);
       if (item.previewUrl) {
       mediaParts.push(`  <source src="${sanitizeHTML(item.url)}" type="video/mp4">`);
       }
  mediaParts.push(`  ${i18nManager.t('video_not_supported')}`);
  mediaParts.push(`</video>`);
          break;
        case 'gif':
          mediaParts.push(`<video autoplay loop muted class="tweet-gif">`);
     mediaParts.push(`  <source src="${sanitizeHTML(item.url)}" type="video/mp4">`);
 mediaParts.push(`  ${i18nManager.t('gif_not_supported')}`);
          mediaParts.push(`</video>`);
 break;
      }
    }

 return mediaParts.join('\n');
  }

  /**
   * 格式化媒体内容 - Markdown
   */
  private formatMediaMarkdown(media: MediaItem[]): string {
    const mediaParts: string[] = [];

    for (const item of media) {
      switch (item.type) {
        case 'image':
     mediaParts.push(`![${item.alt || 'Image'}](${item.url})`);
          break;
        case 'video':
          mediaParts.push(`🎥 [${i18nManager.t('video')}](${item.url})`);
        break;
        case 'gif':
   mediaParts.push(`🎞️ [${i18nManager.t('gif')}](${item.url})`);
       break;
      }
    }

    return mediaParts.join('\n');
  }

  /**
   * 格式化媒体内容 - 纯文本
   */
  private formatMediaText(media: MediaItem[]): string {
    const mediaParts: string[] = [];

  for (const item of media) {
  switch (item.type) {
      case 'image':
          mediaParts.push(`📷 ${i18nManager.t('image')}: ${item.url}`);
  break;
        case 'video':
          mediaParts.push(`🎥 ${i18nManager.t('video')}: ${item.url}`);
    break;
        case 'gif':
  mediaParts.push(`🎞️ ${i18nManager.t('gif')}: ${item.url}`);
          break;
      }
    }

    return mediaParts.join('\n');
  }

  /**
   * 获取线程分隔符
   */
  private getThreadSeparator(format: 'html' | 'markdown' | 'text'): string {
    switch (format) {
      case 'html':
        return '\n<hr class="thread-separator">\n';
      case 'markdown':
        return '\n\n---\n\n';
      case 'text':
        return '\n\n' + '─'.repeat(50) + '\n\n';
   default:
      return '\n\n';
    }
  }

  /**
   * 生成线程头部
   */
  private generateThreadHeader(thread: ThreadData, options: FormatOptions): string {
    const totalTweets = thread.tweets.length;
    const author = thread.author;
    const date = formatDate(thread.createdAt, i18nManager.getCurrentLocale());

    const headerText = i18nManager.t('thread.header', {
      author: author.displayName,
      username: author.username,
      count: totalTweets,
      date: date
    });

    switch (options.format) {
   case 'html':
        return `<div class="thread-header">
          <h3 class="thread-title">${sanitizeHTML(headerText)}</h3>
     <div class="thread-meta">
 <span class="thread-count">${totalTweets} ${i18nManager.t('tweets')}</span>
         <span class="thread-date">${sanitizeHTML(date)}</span>
          </div>
   </div>`;
      case 'markdown':
    return `# 🧵 ${headerText}\n\n**${totalTweets}** ${i18nManager.t('tweets')} • ${date}`;
      case 'text':
  return `🧵 ${headerText}\n${totalTweets} ${i18nManager.t('tweets')} • ${date}`;
  default:
    return headerText;
    }
  }

  /**
   * 生成线程尾部
   */
  private generateThreadFooter(thread: ThreadData, options: FormatOptions): string {
    const firstTweet = thread.tweets[0];
    if (!firstTweet) return '';

    const footerText = i18nManager.t('thread.footer');
    const originalLink = firstTweet.url;

    switch (options.format) {
      case 'html':
    return `<div class="thread-footer">
          <p>${sanitizeHTML(footerText)}</p>
          <a href="${sanitizeHTML(originalLink)}" target="_blank" class="thread-link">${i18nManager.t('view_original_thread')}</a>
      </div>`;
    case 'markdown':
        return `\n---\n\n*${footerText}*\n\n[${i18nManager.t('view_original_thread')}](${originalLink})`;
      case 'text':
        return `\n${footerText}\n\n${i18nManager.t('original_thread')}: ${originalLink}`;
      default:
        return footerText;
    }
  }

  /**
   * 格式化推文预览（用于历史记录等）
   */
  formatPreview(tweet: TweetData, maxLength: number = 100): string {
    let preview = tweet.content;
    
    // 移除多余的空白字符
  preview = preview.replace(/\s+/g, ' ').trim();
    
    // 截断过长的内容
    if (preview.length > maxLength) {
      preview = preview.substring(0, maxLength - 3) + '...';
    }
    
    return preview;
  }

  /**
   * 格式化线程预览
   */
  formatThreadPreview(thread: ThreadData, maxLength: number = 150): string {
    const firstTweet = thread.tweets[0];
    if (!firstTweet) return '';

    const preview = this.formatPreview(firstTweet, maxLength - 20);
  const count = thread.tweets.length;
    
    return `${preview} (${count} ${i18nManager.t('tweets')})`;
  }

  /**
   * 生成复制内容的摘要
   */
  generateSummary(content: string, format: 'html' | 'markdown' | 'text'): {
    characterCount: number;
    wordCount: number;
    lineCount: number;
    format: string;
  } {
    // 移除格式化标记来计算准确的内容长度
    let plainContent = content;
    
    if (format === 'html') {
      plainContent = content.replace(/<[^>]*>/g, '');
    } else if (format === 'markdown') {
      plainContent = content
   .replace(/\*\*([^*]+)\*\*/g, '$1')
.replace(/\*([^*]+)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/^#+\s/gm, '');
    }

 const characterCount = plainContent.length;
    const wordCount = plainContent.split(/\s+/).filter(word => word.length > 0).length;
    const lineCount = plainContent.split('\n').length;

    return {
      characterCount,
      wordCount,
      lineCount,
      format
    };
  }

  /**
   * 验证格式化选项
   */
  validateOptions(options: Partial<FormatOptions>): FormatOptions {
    return {
      format: options.format === 'html' || options.format === 'markdown' ? options.format : 'text',
      includeAuthor: options.includeAuthor !== false,
      includeTimestamp: options.includeTimestamp !== false,
      includeMetrics: options.includeMetrics === true,
      includeMedia: options.includeMedia !== false,
      includeLink: options.includeLink !== false
    };
  }

  /**
   * 创建自定义格式化模板
   */
  createCustomTemplate(template: string, tweet: TweetData): string {
    const replacements: Record<string, string> = {
      '{{author.displayName}}': tweet.author.displayName,
      '{{author.username}}': tweet.author.username,
      '{{content}}': tweet.content,
      '{{timestamp}}': formatFullTimestamp(tweet.timestamp, i18nManager.getCurrentLocale()),
      '{{url}}': tweet.url,
      '{{likes}}': tweet.metrics.likes.toString(),
      '{{retweets}}': tweet.metrics.retweets.toString(),
    '{{replies}}': tweet.metrics.replies.toString(),
      '{{mediaCount}}': tweet.media.length.toString(),
      '{{isThread}}': tweet.isThread ? 'true' : 'false'
    };

    let result = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

return result;
  }
}

// 导出单例实例
export const contentFormatter = ContentFormatter.getInstance();