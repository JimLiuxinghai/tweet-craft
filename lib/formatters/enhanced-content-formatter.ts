// 增强的内容格式化器 - 改进媒体内容格式化

import type { TweetData, ThreadData, FormatOptions, MediaItem, QuotedTweetData } from '../types';
import { sanitizeHTML, sanitizeText } from '../utils/validation';
import { formatDate, formatFullTimestamp } from '../utils/date';
import { i18nManager } from '../i18n';

/**
 * 增强的内容格式化器类
 */
export class EnhancedContentFormatter {
  
  /**
   * 格式化单条推文
   */
  static formatTweet(tweet: TweetData, options: FormatOptions): string {
    console.log('📝 开始格式化推文，媒体项目数量:', tweet.media.length);
    
    switch (options.format) {
      case 'html':
        return this.formatTweetHTML(tweet, options);
      case 'markdown':
     return this.formatTweetMarkdown(tweet, options);
      case 'text':
 return this.formatTweetText(tweet, options);
default:
        return this.formatTweetText(tweet, options);
    }
  }

  /**
   * HTML 格式化单条推文
   */
  private static formatTweetHTML(tweet: TweetData, options: FormatOptions): string {
    const parts: string[] = [];

    // 开始容器
    parts.push('<div class="tweet-copy" style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.5; max-width: 600px;">');

    // 作者信息
    if (options.includeAuthor) {
      parts.push('<div class="tweet-header" style="display: flex; align-items: center; margin-bottom: 12px;">');
      
      // 头像
      if (tweet.author.avatar) {
     parts.push(`<img src="${sanitizeHTML(tweet.author.avatar)}" alt="${sanitizeHTML(tweet.author.displayName)}" class="tweet-avatar" width="40" height="40" style="border-radius: 50%; margin-right: 12px;">`);
   }
      
      // 作者名称和用户名
      parts.push('<div class="tweet-author-info">');
      parts.push(`<strong class="tweet-display-name" style="font-weight: bold; color: #0f1419;">${sanitizeHTML(tweet.author.displayName)}</strong>`);
      parts.push(`<span class="tweet-username" style="color: #536471; margin-left: 8px;">@${sanitizeHTML(tweet.author.username)}</span>`);
      parts.push('</div>');
      
      parts.push('</div>');
    }

    // 推文内容
    parts.push('<div class="tweet-content" style="font-size: 16px; color: #0f1419; margin-bottom: 12px;">');
    parts.push(this.processContentForHTML(tweet.content));
      parts.push('</div>');

  // 引用推文内容
  if (tweet.quotedTweet) {
      console.log('📝 开始添加引用推文到HTML格式');
      parts.push('<div class="quoted-tweet" style="border: 1px solid #e1e8ed; border-radius: 12px; margin: 12px 0; padding: 12px;">');
      parts.push(this.formatQuotedTweetHTML(tweet.quotedTweet));
  parts.push('</div>');
    }

// 媒体内容 - 重点改进
    if (options.includeMedia && tweet.media.length > 0) {
      console.log('📸 开始添加媒体内容到HTML格式，媒体数量:', tweet.media.length);
      parts.push('<div class="tweet-media" style="margin: 12px 0;">');
      parts.push(this.formatMediaHTML(tweet.media));
      parts.push('</div>');
    } else if (tweet.media.length > 0) {
      console.log('⚠️ 媒体内容被跳过，includeMedia:', options.includeMedia);
    }

    // 时间戳
    if (options.includeTimestamp) {
      const timeStr = formatFullTimestamp(tweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(`<div class="tweet-timestamp" style="color: #536471; font-size: 14px; margin: 8px 0;">${sanitizeHTML(timeStr)}</div>`);
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('<div class="tweet-metrics" style="display: flex; gap: 16px; color: #536471; font-size: 14px; margin: 8px 0;">');
      parts.push(`<span class="tweet-replies">${tweet.metrics.replies} ${i18nManager.t('replies') || '回复'}</span>`);
      parts.push(`<span class="tweet-retweets">${tweet.metrics.retweets} ${i18nManager.t('retweets') || '转发'}</span>`);
      parts.push(`<span class="tweet-likes">${tweet.metrics.likes} ${i18nManager.t('likes') || '喜欢'}</span>`);
      parts.push('</div>');
    }

    // 原推文链接
    if (options.includeLink) {
      parts.push(`<div class="tweet-link" style="margin: 12px 0;"><a href="${sanitizeHTML(tweet.url)}" target="_blank" style="color: #1d9bf0; text-decoration: none;">${i18nManager.t('view_original') || '查看原推文'} →</a></div>`);
    }

    // 结束容器
    parts.push('</div>');

    const result = parts.join('\n');
    console.log('✅ HTML格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * Markdown 格式化单条推文
   */
  private static formatTweetMarkdown(tweet: TweetData, options: FormatOptions): string {
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

    // 引用推文内容
    if (tweet.quotedTweet) {
console.log('📝 开始添加引用推文到Markdown格式');
     parts.push('');
      parts.push(this.formatQuotedTweetMarkdown(tweet.quotedTweet));
    }

    // 媒体内容 - 重点改进
    if (options.includeMedia && tweet.media.length > 0) {
      console.log('📸 开始添加媒体内容到Markdown格式，媒体数量:', tweet.media.length);
      parts.push('');
    parts.push(this.formatMediaMarkdown(tweet.media));
    } else if (tweet.media.length > 0) {
      console.log('⚠️ 媒体内容被跳过，includeMedia:', options.includeMedia);
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('');
      parts.push(`📊 ${tweet.metrics.replies} ${i18nManager.t('replies') || '回复'} • ${tweet.metrics.retweets} ${i18nManager.t('retweets') || '转发'} • ${tweet.metrics.likes} ${i18nManager.t('likes') || '喜欢'}`);
    }

// 原推文链接
    if (options.includeLink) {
      parts.push('');
      parts.push(`[${i18nManager.t('view_original') || '查看原推文'}](${tweet.url})`);
    }

    const result = parts.join('\n');
    console.log('✅ Markdown格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * 纯文本格式化单条推文
   */
  private static formatTweetText(tweet: TweetData, options: FormatOptions): string {
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

    // 引用推文内容
    if (tweet.quotedTweet) {
      console.log('📝 开始添加引用推文到文本格式');
      parts.push('');
      parts.push(this.formatQuotedTweetText(tweet.quotedTweet));
  }

    // 媒体内容 - 重点改进
    if (options.includeMedia && tweet.media.length > 0) {
      console.log('📸 开始添加媒体内容到文本格式，媒体数量:', tweet.media.length);
      parts.push('');
  parts.push(this.formatMediaText(tweet.media));
    } else if (tweet.media.length > 0) {
      console.log('⚠️ 媒体内容被跳过，includeMedia:', options.includeMedia);
    }

    // 互动数据
    if (options.includeMetrics) {
      parts.push('');
      parts.push(`${tweet.metrics.replies} ${i18nManager.t('replies') || '回复'} • ${tweet.metrics.retweets} ${i18nManager.t('retweets') || '转发'} • ${tweet.metrics.likes} ${i18nManager.t('likes') || '喜欢'}`);
    }

    // 原推文链接
    if (options.includeLink) {
      parts.push('');
      parts.push(`${i18nManager.t('original_tweet') || '原推文'}: ${tweet.url}`);
    }

    const result = parts.join('\n');
    console.log('✅ 文本格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * 格式化媒体内容 - HTML
   */
  private static formatMediaHTML(media: MediaItem[]): string {
    console.log('📝 开始格式化HTML媒体内容，媒体数量:', media.length);
    const mediaParts: string[] = [];

    for (const item of media) {
      console.log(`  🎨 格式化媒体项目 (HTML):`, item);
      switch (item.type) {
        case 'image':
          const imageHtml = `<img src="${sanitizeHTML(item.url)}" alt="${sanitizeHTML(item.alt || 'Image')}" class="tweet-image" loading="lazy" style="max-width: 100%; height: auto; border-radius: 12px; margin: 8px 0; display: block;">`;
      mediaParts.push(imageHtml);
          console.log(`    ✅ 添加图片HTML`);
          break;
  case 'video':
          const videoHtml = `<video controls class="tweet-video" style="max-width: 100%; border-radius: 12px; margin: 8px 0; display: block;"${item.previewUrl ? ` poster="${sanitizeHTML(item.previewUrl)}"` : ''}>
  <source src="${sanitizeHTML(item.url)}" type="video/mp4">
  ${i18nManager.t('video_not_supported') || 'Your browser does not support the video tag.'}
</video>`;
          mediaParts.push(videoHtml);
          console.log(`    ✅ 添加视频HTML`);
        break;
     case 'gif':
          const gifHtml = `<video autoplay loop muted class="tweet-gif" style="max-width: 100%; border-radius: 12px; margin: 8px 0; display: block;"${item.previewUrl ? ` poster="${sanitizeHTML(item.previewUrl)}"` : ''}>
  <source src="${sanitizeHTML(item.url)}" type="video/mp4">
  ${i18nManager.t('gif_not_supported') || 'Your browser does not support the video tag.'}
</video>`;
 mediaParts.push(gifHtml);
     console.log(`    ✅ 添加GIF HTML`);
    break;
        default:
          console.warn(`    ⚠️ 未知媒体类型:`, item.type);
      }
    }

    const result = mediaParts.join('\n');
    console.log('✅ HTML媒体格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * 格式化媒体内容 - Markdown
   */
  private static formatMediaMarkdown(media: MediaItem[]): string {
    console.log('📝 开始格式化Markdown媒体内容，媒体数量:', media.length);
    const mediaParts: string[] = [];

    for (const item of media) {
      console.log(`  🎨 格式化媒体项目 (Markdown):`, item);
      switch (item.type) {
        case 'image':
   mediaParts.push(`![${item.alt || 'Image'}](${item.url})`);
        console.log(`    ✅ 添加图片Markdown`);
    break;
        case 'video':
          mediaParts.push(`🎥 [${i18nManager.t('video') || '视频'}](${item.url})`);
          console.log(`    ✅ 添加视频Markdown`);
          break;
        case 'gif':
 mediaParts.push(`🎞️ [${i18nManager.t('gif') || 'GIF'}](${item.url})`);
          console.log(`    ✅ 添加GIF Markdown`);
    break;
        default:
          console.warn(`    ⚠️ 未知媒体类型:`, item.type);
  }
    }

    const result = mediaParts.join('\n');
    console.log('✅ Markdown媒体格式化完成，内容长度:', result.length);
 return result;
  }

  /**
   * 格式化媒体内容 - 纯文本
   */
  private static formatMediaText(media: MediaItem[]): string {
    console.log('📝 开始格式化文本媒体内容，媒体数量:', media.length);
    const mediaParts: string[] = [];

    for (const item of media) {
      console.log(`  🎨 格式化媒体项目 (文本):`, item);
      switch (item.type) {
        case 'image':
mediaParts.push(`📷 ${i18nManager.t('image') || '图片'}: ${item.url}`);
          if (item.alt) {
            mediaParts.push(`   描述: ${item.alt}`);
        }
     console.log(`    ✅ 添加图片文本`);
          break;
        case 'video':
          mediaParts.push(`🎥 ${i18nManager.t('video') || '视频'}: ${item.url}`);
   console.log(`    ✅ 添加视频文本`);
          break;
        case 'gif':
     mediaParts.push(`🎞️ ${i18nManager.t('gif') || 'GIF'}: ${item.url}`);
          console.log(`    ✅ 添加GIF文本`);
    break;
        default:
  console.warn(`    ⚠️ 未知媒体类型:`, item.type);
 }
    }

    const result = mediaParts.join('\n');
    console.log('✅ 文本媒体格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * 处理 HTML 格式的内容
   */
  private static processContentForHTML(content: string): string {
    let processed = sanitizeHTML(content);
    
    // 转换换行符为 <br>
    processed = processed.replace(/\n/g, '<br>');
    
    // 处理链接
    processed = processed.replace(
      /https?:\/\/[^\s]+/g,
      '<a href="$&" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: none;">$&</a>'
    );
    
    // 处理用户名提及
    processed = processed.replace(
   /@(\w+)/g,
      '<a href="https://x.com/$1" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: none;">@$1</a>'
    );
  
  // 处理话题标签
    processed = processed.replace(
      /#(\w+)/g,
      '<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener noreferrer" style="color: #1d9bf0; text-decoration: none;">#$1</a>'
    );

    return processed;
  }

  /**
   * 处理 Markdown 格式的内容
   */
  private static processContentForMarkdown(content: string): string {
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
   * 格式化引用推文 - HTML
   */
  private static formatQuotedTweetHTML(quotedTweet: QuotedTweetData): string {
    console.log('📝 格式化引用推文HTML:', quotedTweet);
    const parts: string[] = [];

    // 引用推文作者信息
    parts.push('<div class="quoted-tweet-header" style="display: flex; align-items: center; margin-bottom: 8px;">');
    
    // 头像
    if (quotedTweet.author.avatar) {
      parts.push(`<img src="${sanitizeHTML(quotedTweet.author.avatar)}" alt="${sanitizeHTML(quotedTweet.author.displayName)}" class="quoted-tweet-avatar" width="20" height="20" style="border-radius: 50%; margin-right: 8px;">`);
    }
    
    // 作者名称和用户名
    parts.push('<div class="quoted-tweet-author-info">');
    parts.push(`<strong class="quoted-tweet-display-name" style="font-size: 14px; font-weight: bold; color: #0f1419;">${sanitizeHTML(quotedTweet.author.displayName)}</strong>`);
    parts.push(`<span class="quoted-tweet-username" style="font-size: 14px; color: #536471; margin-left: 4px;">@${sanitizeHTML(quotedTweet.author.username)}</span>`);
    parts.push('</div>');
    
    parts.push('</div>');

    // 引用推文内容
 parts.push('<div class="quoted-tweet-content" style="font-size: 14px; color: #0f1419; margin-bottom: 8px;">');
    parts.push(this.processContentForHTML(quotedTweet.content));
    parts.push('</div>');

    // 引用推文媒体内容（如果有的话）
    if (quotedTweet.media && quotedTweet.media.length > 0) {
      parts.push('<div class="quoted-tweet-media" style="margin: 8px 0;">');
      parts.push(this.formatMediaHTML(quotedTweet.media));
      parts.push('</div>');
    }

    // 引用推文时间戳（如果有的话）
    if (quotedTweet.timestamp) {
      const timeStr = formatFullTimestamp(quotedTweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(`<div class="quoted-tweet-timestamp" style="color: #536471; font-size: 12px;">${sanitizeHTML(timeStr)}</div>`);
    }

    return parts.join('\n');
  }

  /**
   * 格式化引用推文 - Markdown
   */
  private static formatQuotedTweetMarkdown(quotedTweet: QuotedTweetData): string {
    console.log('📝 格式化引用推文Markdown:', quotedTweet);
    const parts: string[] = [];

    // 引用推文框
    parts.push('> **引用推文**');
    parts.push('>');
    
    // 作者信息
    parts.push(`> **${quotedTweet.author.displayName}** (@${quotedTweet.author.username})`);
    
    // 时间戳（如果有的话）
    if (quotedTweet.timestamp) {
      const timeStr = formatFullTimestamp(quotedTweet.timestamp, i18nManager.getCurrentLocale());
      parts.push(`> *${timeStr}*`);
    }
    
    parts.push('>');
    
    // 内容
  const quotedContent = this.processContentForMarkdown(quotedTweet.content);
    // 为引用内容添加 > 前缀
    const quotedLines = quotedContent.split('\n');
    for (const line of quotedLines) {
      parts.push(`> ${line}`);
    }

    // 媒体内容（如果有的话）
    if (quotedTweet.media && quotedTweet.media.length > 0) {
      parts.push('>');
      const mediaContent = this.formatMediaMarkdown(quotedTweet.media);
      const mediaLines = mediaContent.split('\n');
      for (const line of mediaLines) {
   parts.push(`> ${line}`);
    }
    }

    return parts.join('\n');
  }

  /**
   * 格式化引用推文 - 文本
   */
  private static formatQuotedTweetText(quotedTweet: QuotedTweetData): string {
    console.log('📝 格式化引用推文文本:', quotedTweet);
    const parts: string[] = [];

    // 引用推文标识
    parts.push('📝 引用推文:');
    parts.push('┌' + '─'.repeat(50));
    
    // 作者信息
    parts.push(`│ ${quotedTweet.author.displayName} (@${quotedTweet.author.username})`);
    
    // 时间戳（如果有的话）
 if (quotedTweet.timestamp) {
      const timeStr = formatFullTimestamp(quotedTweet.timestamp, i18nManager.getCurrentLocale());
   parts.push(`│ ${timeStr}`);
    }
    
    parts.push('│');
    
    // 内容
    const contentLines = quotedTweet.content.split('\n');
    for (const line of contentLines) {
      parts.push(`│ ${line}`);
  }

    // 媒体内容（如果有的话）
    if (quotedTweet.media && quotedTweet.media.length > 0) {
      parts.push('│');
      const mediaContent = this.formatMediaText(quotedTweet.media);
      const mediaLines = mediaContent.split('\n');
      for (const line of mediaLines) {
        parts.push(`│ ${line}`);
      }
    }

    parts.push('└' + '─'.repeat(50));

    return parts.join('\n');
  }

  /**
   * 格式化线程
   */
  static formatThread(thread: ThreadData, options: FormatOptions): string {
    console.log('📝 开始格式化线程，推文数量:', thread.tweets.length);
    
    const formattedTweets = thread.tweets.map((tweet, index) => {
 console.log(`  📝 格式化线程中的第 ${index + 1} 条推文`);
      return this.formatTweet(tweet, options);
 });

    const separator = this.getThreadSeparator(options.format);
    const header = this.generateThreadHeader(thread, options);
    const footer = this.generateThreadFooter(thread, options);

    const result = [
      header,
      ...formattedTweets,
      footer
    ].filter(Boolean).join(separator);

    console.log('✅ 线程格式化完成，内容长度:', result.length);
    return result;
  }

  /**
   * 获取线程分隔符
   */
  private static getThreadSeparator(format: 'html' | 'markdown' | 'text'): string {
    switch (format) {
      case 'html':
    return '\n<hr class="thread-separator" style="border: none; border-top: 1px solid #e1e8ed; margin: 16px 0;">\n';
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
  private static generateThreadHeader(thread: ThreadData, options: FormatOptions): string {
    const totalTweets = thread.tweets.length;
  const author = thread.author;
    const date = formatDate(thread.createdAt, i18nManager.getCurrentLocale());

    const headerText = i18nManager.t('thread.header', {
      author: author.displayName,
      username: author.username,
      count: totalTweets,
      date: date
    }) || `${author.displayName} (@${author.username}) 的线程 - ${totalTweets} 条推文 - ${date}`;

    switch (options.format) {
      case 'html':
   return `<div class="thread-header" style="background: #f7f9fa; padding: 16px; border-radius: 12px; margin-bottom: 16px;">
  <h3 class="thread-title" style="margin: 0 0 8px 0; font-size: 18px; font-weight: bold; color: #0f1419;">${sanitizeHTML(headerText)}</h3>
          <div class="thread-meta" style="display: flex; gap: 16px; color: #536471; font-size: 14px;">
            <span class="thread-count">${totalTweets} ${i18nManager.t('tweets') || '条推文'}</span>
    <span class="thread-date">${sanitizeHTML(date)}</span>
    </div>
</div>`;
    case 'markdown':
        return `# 🧵 ${headerText}\n\n**${totalTweets}** ${i18nManager.t('tweets') || '条推文'} • ${date}`;
 case 'text':
        return `🧵 ${headerText}\n${totalTweets} ${i18nManager.t('tweets') || '条推文'} • ${date}`;
      default:
 return headerText;
    }
  }

  /**
   * 生成线程尾部
   */
  private static generateThreadFooter(thread: ThreadData, options: FormatOptions): string {
    const firstTweet = thread.tweets[0];
    if (!firstTweet) return '';

    const footerText = i18nManager.t('thread.footer') || '--- 线程结束 ---';
    const originalLink = firstTweet.url;

    switch (options.format) {
      case 'html':
        return `<div class="thread-footer" style="background: #f7f9fa; padding: 16px; border-radius: 12px; margin-top: 16px; text-align: center;">
        <p style="margin: 0 0 8px 0; color: #536471;">${sanitizeHTML(footerText)}</p>
          <a href="${sanitizeHTML(originalLink)}" target="_blank" class="thread-link" style="color: #1d9bf0; text-decoration: none; font-weight: 500;">${i18nManager.t('view_original_thread') || '查看原始线程'} →</a>
        </div>`;
      case 'markdown':
        return `\n---\n\n*${footerText}*\n\n[${i18nManager.t('view_original_thread') || '查看原始线程'}](${originalLink})`;
      case 'text':
        return `\n${footerText}\n\n${i18nManager.t('original_thread') || '原始线程'}: ${originalLink}`;
   default:
        return footerText;
    }
  }
}