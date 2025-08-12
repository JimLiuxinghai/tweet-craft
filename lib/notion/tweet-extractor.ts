import { TweetData } from '../notion/types';

export class TweetExtractor {
  static extractTweetData(tweetElement: Element): TweetData | null {
    try {
      // 提取推文URL
      const tweetLink = tweetElement.querySelector('a[href*="/status/"]');
      const url = tweetLink?.getAttribute('href') || '';
      const fullUrl = url.startsWith('http') ? url : `https://x.com${url}`;
      const tweetId = this.extractTweetId(fullUrl);

      if (!tweetId) {
        console.warn('Could not extract tweet ID');
        return null;
      }

      // 提取作者信息
      const authorInfo = this.extractAuthorInfo(tweetElement);
      
      // 提取推文内容
      const content = this.extractTweetContent(tweetElement);
      
      // 提取发布时间
      const publishTime = this.extractPublishTime(tweetElement);
      
      // 检测媒体内容
      const mediaInfo = this.extractMediaInfo(tweetElement);
      
      // 提取统计数据
      const stats = this.extractTweetStats(tweetElement);
      
      // 确定推文类型
      const type = this.determineTweetType(tweetElement);

      return {
        id: tweetId,
        url: fullUrl,
        content: content || '',
        author: authorInfo.name,
        username: authorInfo.handle,
        publishTime: publishTime || new Date().toISOString(),
        type,
        media: mediaInfo,
        stats,
        savedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error extracting tweet data:', error);
      return null;
    }
  }

  private static extractTweetId(url: string): string | null {
    const match = url.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  private static extractAuthorInfo(tweetElement: Element): { name: string; handle: string } {
    const nameElement = tweetElement.querySelector('[data-testid="User-Names"] div[dir="ltr"] span');
    const handleElement = tweetElement.querySelector('[data-testid="User-Names"] a[role="link"]');
    
    const name = nameElement?.textContent?.trim() || '';
    const handleUrl = handleElement?.getAttribute('href') || '';
    const handle = handleUrl.startsWith('/') ? handleUrl.substring(1) : handleUrl;

    return { name, handle };
  }

  private static extractTweetContent(tweetElement: Element): string {
    const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
    return contentElement?.textContent?.trim() || '';
  }

  private static extractPublishTime(tweetElement: Element): string | null {
    const timeElement = tweetElement.querySelector('time');
    return timeElement?.getAttribute('datetime');
  }

  private static extractMediaInfo(tweetElement: Element): { hasImages: boolean; hasVideo: boolean; hasLinks: boolean } {
    const hasImages = tweetElement.querySelectorAll('[data-testid="tweetPhoto"], [data-testid="Image"]').length > 0;
    const hasVideo = tweetElement.querySelector('video, [data-testid="videoPlayer"]') !== null;
    const hasLinks = tweetElement.querySelectorAll('a[href^="http"]').length > 0;

    return { hasImages, hasVideo, hasLinks };
  }

  private static extractTweetStats(tweetElement: Element): { likes: number; retweets: number; replies: number } {
    const stats = { likes: 0, retweets: 0, replies: 0 };

    try {
      // 查找包含统计数据的元素
      const statButtons = tweetElement.querySelectorAll('[data-testid="like"], [data-testid="retweet"], [data-testid="reply"]');
      
      statButtons.forEach(button => {
        const ariaLabel = button.getAttribute('aria-label') || '';
        const testId = button.getAttribute('data-testid');
        
        if (testId === 'like') {
          const match = ariaLabel.match(/(\d+)/);
          stats.likes = match ? parseInt(match[1]) : 0;
        } else if (testId === 'retweet') {
          const match = ariaLabel.match(/(\d+)/);
          stats.retweets = match ? parseInt(match[1]) : 0;
        } else if (testId === 'reply') {
          const match = ariaLabel.match(/(\d+)/);
          stats.replies = match ? parseInt(match[1]) : 0;
        }
      });
    } catch (error) {
      console.warn('Error extracting tweet stats:', error);
    }

    return stats;
  }

  private static determineTweetType(tweetElement: Element): '原创推文' | '转推' | '引用推文' | '回复' {
    try {
      // 检查是否为回复
      if (this.isReply(tweetElement)) {
        return '回复';
      }

      // 检查是否为转推
      if (this.isRetweet(tweetElement)) {
        return '转推';
      }

      // 检查是否为引用推文
      if (this.isQuoteTweet(tweetElement)) {
        return '引用推文';
      }

      return '原创推文';
    } catch (error) {
      console.warn('Error determining tweet type:', error);
      return '原创推文';
    }
  }

  private static isReply(tweetElement: Element): boolean {
    // 检查是否有回复上下文
    const replyContext = tweetElement.querySelector('[data-testid="socialContext"]');
    if (replyContext) {
      const text = replyContext.textContent || '';
      return text.includes('回复') || text.includes('Replying to');
    }

    // 检查是否在回复线程中
    const tweetArticle = tweetElement.closest('article');
    if (tweetArticle) {
      const parentTweet = tweetArticle.parentElement?.querySelector(':scope > article');
      if (parentTweet && parentTweet !== tweetArticle) {
        return true;
      }
    }

    return false;
  }

  private static isRetweet(tweetElement: Element): boolean {
    // 检查是否有转推标识
    const retweetHeader = tweetElement.querySelector('[data-testid="socialContext"]');
    if (retweetHeader) {
      const text = retweetHeader.textContent || '';
      return text.includes('转推') || text.includes('Retweeted');
    }

    return false;
  }

  private static isQuoteTweet(tweetElement: Element): boolean {
    // 检查是否包含引用推文
    const quotedTweet = tweetElement.querySelector('[data-testid="tweet"] [data-testid="tweet"]');
    return quotedTweet !== null;
  }

  static findTweetElements(): Element[] {
    const selectors = [
      '[data-testid="tweet"]',
      'article[data-testid="tweet"]',
      'div[data-testid="tweet"]',
      '[role="article"][data-testid="tweet"]'
    ];

    const tweetElements: Element[] = [];
    
    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        if (this.isValidTweetElement(element)) {
          tweetElements.push(element);
        }
      });
    });

    return tweetElements;
  }

  private static isValidTweetElement(element: Element): boolean {
    // 确保元素包含推文的基本特征
    const hasContent = element.querySelector('[data-testid="tweetText"]') !== null;
    const hasAuthor = element.querySelector('[data-testid="User-Names"]') !== null;
    const hasActions = element.querySelector('[role="group"]') !== null;

    return hasContent && hasAuthor && hasActions;
  }

  static generateTagsFromContent(content: string): string[] {
    const tags: string[] = [];
    const text = content.toLowerCase();

    // 基于内容生成标签
    if (text.includes('代码') || text.includes('code') || text.includes('编程') || text.includes('github')) {
      tags.push('技术');
    }
    
    if (text.includes('ai') || text.includes('机器学习') || text.includes('深度学习') || text.includes('人工智能')) {
      tags.push('AI');
      tags.push('技术');
    }
    
    if (text.includes('新闻') || text.includes('资讯') || text.includes('报道')) {
      tags.push('资讯');
    }
    
    if (text.includes('学习') || text.includes('教程') || text.includes('course') || text.includes('learn')) {
      tags.push('学习');
    }
    
    if (text.includes('工作') || text.includes('job') || text.includes('career') || text.includes('职业')) {
      tags.push('工作');
    }
    
    if (text.includes('想法') || text.includes('灵感') || text.includes('idea') || text.includes('思考')) {
      tags.push('灵感');
    }

    return [...new Set(tags)]; // 去重
  }
}