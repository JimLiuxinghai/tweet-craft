import { EnhancedMediaExtractor } from '../parsers/enhanced-media-extractor';
import { MediaAsset, TweetData } from '../notion/types';

const TWEET_SELECTOR = '[data-testid="tweet"]';
const TWEET_ARTICLE_SELECTOR = 'article[data-testid="tweet"]';

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
    const root = this.getRootTweet(tweetElement);
    const nameElement =
      root.querySelector('[data-testid="User-Name"] span span') ||
      root.querySelector('[data-testid="User-Names"] div[dir="ltr"] span') ||
      root.querySelector('[data-testid="User-Name"] a span span');
    const handleElement =
      root.querySelector('[data-testid="User-Name"] a[role="link"] span') ||
      root.querySelector('[data-testid="User-Names"] a[role="link"] span') ||
      root.querySelector('[data-testid="User-Names"] a[role="link"]');
    
    const name = nameElement?.textContent?.trim() || '';
    const handleUrl = handleElement?.getAttribute('href') || '';
    const handle = handleUrl.startsWith('/') ? handleUrl.substring(1) : handleUrl;

    return { name, handle };
  }

  private static extractTweetContent(tweetElement: Element): string {
    const rootTweet = this.getRootTweet(tweetElement);
    const textNodes = Array.from(rootTweet.querySelectorAll('[data-testid="tweetText"]')) as HTMLElement[];

    const mainTextBlocks = textNodes
      .filter(node => this.isWithinRootTweet(node, rootTweet))
      .map(node => this.getBestText(node))
      .filter(Boolean) as string[];

    if (mainTextBlocks.length > 0) {
      return mainTextBlocks.join('\n\n').trim();
    }

    const fallbackNode = tweetElement.querySelector('[data-testid="tweetText"]');
    if (fallbackNode) {
      return this.getBestText(fallbackNode as HTMLElement);
    }

    return (rootTweet.textContent || '').trim();
  }

  private static extractPublishTime(tweetElement: Element): string | null {
    const timeElement = tweetElement.querySelector('time');
    return timeElement?.getAttribute('datetime');
  }

  private static extractMediaInfo(tweetElement: Element): {
    hasImages: boolean;
    hasVideo: boolean;
    hasLinks: boolean;
    assets: MediaAsset[];
  } {
    const assets: MediaAsset[] = [];
    const rootTweet = this.getRootTweet(tweetElement);

    // 图片
    const imageElements = rootTweet.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="Image"] img');
    imageElements.forEach(img => {
      if (!this.isWithinRootTweet(img, rootTweet)) return;
      const url = this.normalizeMediaUrl(this.getImageUrl(img as HTMLImageElement), 'image');
      if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
      assets.push({
        type: 'image',
        url,
        alt: img.getAttribute('alt') || undefined
      });
    });

    const backgroundImageElements = rootTweet.querySelectorAll(
      '[data-testid="tweetPhoto"] div[style*="background-image"], [aria-label="Image"] div[style*="background-image"]'
    );
    backgroundImageElements.forEach(element => {
      if (!this.isWithinRootTweet(element, rootTweet)) return;
      const url = this.normalizeMediaUrl(this.extractBackgroundImageUrl(element as HTMLElement), 'image');
      if (!url || url.startsWith('data:') || url.startsWith('blob:')) return;
      assets.push({
        type: 'image',
        url
      });
    });

    // 视频 / GIF
    const videoElements = Array.from(rootTweet.querySelectorAll('video, [data-testid="videoPlayer"] video')) as HTMLVideoElement[];
    videoElements.forEach(videoElement => {
      if (!this.isWithinRootTweet(videoElement, rootTweet)) return;
      const source =
        videoElement.currentSrc ||
        videoElement.getAttribute('src') ||
        videoElement.querySelector('source')?.getAttribute('src');
      const type = videoElement.loop ? 'gif' : 'video';
      const normalizedSource = this.normalizeMediaUrl(source, type);
      const poster = this.normalizeMediaUrl(videoElement.getAttribute('poster'), 'image') || undefined;
      if (normalizedSource) {
        assets.push({
          type,
          url: normalizedSource,
          previewUrl: poster
        });
      }
    });

    // 外链（排除推文链接自身）
    const linkElements = rootTweet.querySelectorAll('a[href^="http"]');
    linkElements.forEach(link => {
      if (!this.isWithinRootTweet(link, rootTweet)) return;
      const href = link.getAttribute('href');
      if (!href) return;
      if (href.includes('/status/')) return; // 避免把推文本身的链接当做媒体

      assets.push({
        type: 'link',
        url: href
      });
    });

    // 去重
    let uniqueAssets = this.dedupeAssets(assets);

    const hasNonLinkMedia = uniqueAssets.some(asset => asset.type !== 'link');
    if (!hasNonLinkMedia) {
      try {
        const enhancedAssets = EnhancedMediaExtractor.extractMediaItems(rootTweet as HTMLElement);
        for (const asset of enhancedAssets) {
          const url = this.normalizeMediaUrl(asset.url, asset.type);
          if (!url || url.startsWith('data:') || url.startsWith('blob:')) continue;
          uniqueAssets.push({
            type: asset.type,
            url,
            previewUrl: asset.previewUrl,
            alt: asset.alt
          });
        }
        uniqueAssets = this.dedupeAssets(uniqueAssets);
      } catch (error) {
        console.warn('Enhanced media extraction failed:', error);
      }
    }

    const hasImages = uniqueAssets.some(asset => asset.type === 'image');
    const hasVideo = uniqueAssets.some(asset => asset.type === 'video' || asset.type === 'gif');
    const hasLinks = uniqueAssets.some(asset => asset.type === 'link');

    return { hasImages, hasVideo, hasLinks, assets: uniqueAssets };
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

  private static getRootTweet(element: Element): Element {
    const article = element.closest(TWEET_ARTICLE_SELECTOR);
    if (article) return article;
    const datasetTweet = element.closest(TWEET_SELECTOR);
    if (datasetTweet) return datasetTweet;
    return element;
  }

  private static isWithinRootTweet(target: Element, rootTweet: Element): boolean {
    if (target === rootTweet) return true;
    const containingTweet = target.closest(TWEET_SELECTOR);
    if (!containingTweet) {
      return rootTweet.contains(target);
    }
    return containingTweet === rootTweet;
  }

  private static normalizeMediaUrl(rawUrl: string | null | undefined, type: MediaAsset['type']): string | null {
    if (!rawUrl) return null;
    let url = rawUrl.trim();
    if (!url) return null;
    if (url.startsWith('//')) {
      url = `https:${url}`;
    }

    try {
      const parsed = new URL(url);
      const isTwitterMedia = parsed.hostname.includes('twimg.com');

      if (type === 'image' && isTwitterMedia) {
        if (parsed.searchParams.has('name')) {
          parsed.searchParams.set('name', 'orig');
        } else {
          parsed.searchParams.append('name', 'orig');
        }
        return parsed.toString();
      }

      if ((type === 'video' || type === 'gif') && isTwitterMedia) {
        parsed.searchParams.delete('name');
        return parsed.toString();
      }

      return parsed.toString();
    } catch {
      return url;
    }
  }

  private static getImageUrl(img: HTMLImageElement): string | null {
    if (img.currentSrc) return img.currentSrc;

    const src = img.getAttribute('src');
    if (src && !src.startsWith('data:') && !src.startsWith('blob:')) {
      return src;
    }

    const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-image-url');
    if (dataSrc) {
      return dataSrc;
    }

    const srcsetUrl = this.extractBestSrcsetUrl(img.getAttribute('srcset'));
    if (srcsetUrl) {
      return srcsetUrl;
    }

    return src || null;
  }

  private static extractBestSrcsetUrl(srcset: string | null | undefined): string | null {
    if (!srcset) return null;
    const candidates = srcset
      .split(',')
      .map(part => part.trim().split(' ')[0])
      .filter(Boolean);
    return candidates.length > 0 ? candidates[candidates.length - 1] : null;
  }

  private static extractBackgroundImageUrl(element: HTMLElement): string | null {
    const style = element.getAttribute('style') || '';
    const match = style.match(/background-image:\s*url\((['"]?)(.*?)\1\)/i);
    return match?.[2] || null;
  }

  private static dedupeAssets(assets: MediaAsset[]): MediaAsset[] {
    const uniqueAssets: MediaAsset[] = [];
    const seen = new Set<string>();

    for (const asset of assets) {
      const key = `${asset.type}-${asset.url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      uniqueAssets.push(asset);
    }

    return uniqueAssets;
  }

  private static getBestText(node: HTMLElement): string {
    const innerText = (node.innerText || '').trim();
    const textContent = (node.textContent || '').trim();

    if (!innerText) return textContent;
    if (!textContent) return innerText;

    return textContent.length > innerText.length ? textContent : innerText;
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
