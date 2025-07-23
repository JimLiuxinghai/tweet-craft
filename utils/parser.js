/**
 * Twitter 推文内容解析器
 * 负责从 Twitter 页面 DOM 中提取推文的各种信息
 */

// 推文选择器映射 - 适配 Twitter/X 的DOM结构
const SELECTORS = {
  tweet: '[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]', 
  author: '[data-testid="User-Name"]',
  username: '[data-testid="User-Name"] [href^="/"]',
  timestamp: 'time',
  images: '[data-testid="tweetPhoto"] img',
  videos: 'video',
  links: 'a[href*="t.co"], a[href*="twitter.com"], a[href*="x.com"]',
  metrics: '[data-testid="like"], [data-testid="retweet"], [data-testid="reply"]',
  tweetUrl: 'a[href*="/status/"]'
};

class TweetParser {
  constructor() {
    this.cache = new Map();
  }

  /**
   * 从推文元素中提取完整的推文数据
   * @param {Element} tweetElement - 推文DOM元素
   * @returns {Object} 解析后的推文数据
   */
  extractTweetData(tweetElement) {
    try {
      const tweetId = this.getTweetId(tweetElement);
      
      // 检查缓存
      if (this.cache.has(tweetId)) {
        return this.cache.get(tweetId);
      }

      const tweetData = {
        id: tweetId,
        author: this.extractAuthor(tweetElement),
        content: this.extractContent(tweetElement),
        timestamp: this.extractTimestamp(tweetElement),
        media: this.extractMedia(tweetElement),
        metrics: this.extractMetrics(tweetElement),
        url: this.extractTweetUrl(tweetElement),
        thread: this.extractThreadInfo(tweetElement)
      };

      // 缓存结果
      this.cache.set(tweetId, tweetData);
      return tweetData;

    } catch (error) {
      console.warn('推文解析失败:', error);
      return this.getFallbackData(tweetElement);
    }
  }

  /**
   * 从推文元素中提取完整的推文数据（带展开功能，用于复制）
   * @param {Element} tweetElement - 推文DOM元素
   * @returns {Object} 解析后的推文数据
   */
  async extractTweetDataForCopy(tweetElement) {
    try {
      const tweetId = this.getTweetId(tweetElement);

      const tweetData = {
        id: tweetId,
        author: this.extractAuthor(tweetElement),
        content: await this.extractContentWithExpansion(tweetElement),
        timestamp: this.extractTimestamp(tweetElement),
        media: this.extractMedia(tweetElement),
        metrics: this.extractMetrics(tweetElement),
        url: this.extractTweetUrl(tweetElement),
        thread: await this.extractThreadInfoForCopy(tweetElement)
      };

      return tweetData;

    } catch (error) {
      console.warn('推文解析失败:', error);
      return this.getFallbackData(tweetElement);
    }
  }

  /**
   * 提取推文ID
   */
  getTweetId(tweetElement) {
    // 尝试从URL中提取ID
    const urlElement = tweetElement.querySelector(SELECTORS.tweetUrl);
    if (urlElement && urlElement.href) {
      const match = urlElement.href.match(/\/status\/(\d+)/);
      if (match) return match[1];
    }
    
    // 降级方案：使用元素在页面中的位置作为ID
    return `tweet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 提取作者信息
   */
  extractAuthor(tweetElement) {
    const authorElement = tweetElement.querySelector(SELECTORS.author);
    const usernameElement = tweetElement.querySelector(SELECTORS.username);
    
    return {
      name: authorElement?.textContent?.trim() || '未知用户',
      username: usernameElement?.textContent?.replace('@', '') || 
                usernameElement?.href?.split('/').pop() || '未知',
      profileUrl: usernameElement?.href || '#'
    };
  }

  /**
   * 提取推文内容文本
   */
  extractContent(tweetElement) {
    const contentElement = tweetElement.querySelector(SELECTORS.tweetText);
    if (!contentElement) return '';

    // 处理链接和标签
    const processedContent = this.processTextContent(contentElement);
    return processedContent.trim();
  }

  /**
   * 提取推文内容文本（带展开功能）
   */
  async extractContentWithExpansion(tweetElement) {
    // 先尝试展开长推文
    await this.expandLongTweet(tweetElement);
    
    const contentElement = tweetElement.querySelector(SELECTORS.tweetText);
    if (!contentElement) return '';

    // 处理链接和标签
    const processedContent = this.processTextContent(contentElement);
    return processedContent.trim();
  }

  /**
   * 根据文本内容查找"显示更多"按钮
   * @param {Element} container - 容器元素
   * @param {Array} texts - 要查找的文本数组
   * @returns {Element|null} 找到的元素
   */
  findShowMoreByText(container, texts) {
    const candidates = container.querySelectorAll('span[role="button"], a, button');
    for (const element of candidates) {
      const textContent = element.textContent?.trim().toLowerCase();
      if (texts.some(text => textContent?.includes(text.toLowerCase()))) {
        return element;
      }
    }
    return null;
  }

  /**
   * 自动展开长推文内容
   * @param {Element} tweetElement - 推文DOM元素
   */
  async expandLongTweet(tweetElement) {
    try {
      // 查找"显示更多"按钮 - 根据实际HTML结构进行查找
      const showMoreButton = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]');
      
      if (showMoreButton) {
        console.log('🔍 检测到长推文，正在展开...');
        
        // 记录展开前的内容长度
        const beforeLength = tweetElement.querySelector('[data-testid="tweetText"]')?.textContent?.length || 0;
        console.log('展开前内容长度:', beforeLength);
        
        // 点击展开按钮
        showMoreButton.click();
        
        // 等待内容加载完成
        await this.waitForContentExpansion(tweetElement);
        
        // 记录展开后的内容长度
        const afterLength = tweetElement.querySelector('[data-testid="tweetText"]')?.textContent?.length || 0;
        console.log('展开后内容长度:', afterLength);
        
        if (afterLength > beforeLength) {
          console.log('✅ 长推文展开完成，内容增加了', afterLength - beforeLength, '个字符');
        } else {
          console.log('⚠️ 长推文展开完成，但内容长度未变化');
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('展开长推文失败:', error);
      return false;
    }
  }

  /**
   * 等待内容展开完成
   * @param {Element} tweetElement - 推文DOM元素
   * @param {number} maxWait - 最大等待时间（毫秒）
   */
  async waitForContentExpansion(tweetElement, maxWait = 3000) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stableCount = 0;
      let lastContentLength = 0;
      
      const checkContent = () => {
        const contentElement = tweetElement.querySelector(SELECTORS.tweetText);
        const currentLength = contentElement?.textContent?.length || 0;
        
        // 检查是否还有"显示更多"按钮
        const stillHasShowMore = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]');
        
        // 如果没有"显示更多"按钮，认为展开完成
        if (!stillHasShowMore) {
          console.log('✅ "显示更多"按钮已消失，展开完成');
          resolve();
          return;
        }
        
        // 如果内容长度稳定（连续3次检查都相同），认为展开完成
        if (currentLength === lastContentLength) {
          stableCount++;
          if (stableCount >= 3) {
            console.log('✅ 内容长度稳定，展开完成');
            resolve();
            return;
          }
        } else {
          stableCount = 0;
        }
        
        // 如果超过最大等待时间，也认为完成
        if (Date.now() - startTime > maxWait) {
          console.log('⏰ 等待超时，展开完成');
          resolve();
          return;
        }
        
        lastContentLength = currentLength;
        setTimeout(checkContent, 150);
      };
      
      // 开始检查，稍微等一下再开始（给DOM更新时间）
      setTimeout(checkContent, 300);
    });
  }

  /**
   * 处理推文文本内容，保留链接和标签格式
   */
  processTextContent(contentElement) {
    let processedText = '';
    
    // 递归处理节点
    const processNode = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        processedText += node.textContent;
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        
        if (tagName === 'a') {
          // 处理链接
          const href = node.href;
          const text = node.textContent;
          processedText += `[${text}](${href})`;
        } else if (tagName === 'img') {
          // 处理emoji等图片
          const alt = node.alt || node.title || '';
          processedText += alt;
        } else {
          // 递归处理子节点
          Array.from(node.childNodes).forEach(processNode);
        }
      }
    };

    Array.from(contentElement.childNodes).forEach(processNode);
    return processedText;
  }

  /**
   * 提取时间戳
   */
  extractTimestamp(tweetElement) {
    const timeElement = tweetElement.querySelector(SELECTORS.timestamp);
    if (!timeElement) return new Date().toISOString();

    const datetime = timeElement.getAttribute('datetime');
    if (datetime) return datetime;

    const title = timeElement.getAttribute('title');
    if (title) return new Date(title).toISOString();

    return timeElement.textContent || new Date().toISOString();
  }

  /**
   * 提取媒体内容
   */
  extractMedia(tweetElement) {
    const media = {
      images: [],
      videos: [],
      links: []
    };

    // 提取图片
    const images = tweetElement.querySelectorAll(SELECTORS.images);
    images.forEach(img => {
      media.images.push({
        src: img.src,
        alt: img.alt || '',
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    });

    // 提取视频
    const videos = tweetElement.querySelectorAll(SELECTORS.videos);
    videos.forEach(video => {
      media.videos.push({
        src: video.src,
        poster: video.poster || '',
        duration: video.duration || 0
      });
    });

    // 提取链接
    const links = tweetElement.querySelectorAll(SELECTORS.links);
    links.forEach(link => {
      if (!link.href.includes('/status/')) { // 排除推文本身链接
        media.links.push({
          url: link.href,
          text: link.textContent.trim(),
          title: link.title || ''
        });
      }
    });

    return media;
  }

  /**
   * 提取互动数据（点赞、转发等）
   */
  extractMetrics(tweetElement) {
    const metrics = {
      likes: 0,
      retweets: 0,
      replies: 0,
      views: 0
    };

    try {
      // Twitter的计数可能在aria-label中
      const metricsElements = tweetElement.querySelectorAll(SELECTORS.metrics);
      metricsElements.forEach(element => {
        const ariaLabel = element.getAttribute('aria-label') || '';
        const text = element.textContent.toLowerCase();
        
        if (ariaLabel.includes('like') || text.includes('like')) {
          metrics.likes = this.parseCount(ariaLabel || text);
        } else if (ariaLabel.includes('retweet') || text.includes('retweet')) {
          metrics.retweets = this.parseCount(ariaLabel || text);
        } else if (ariaLabel.includes('repl') || text.includes('repl')) {
          metrics.replies = this.parseCount(ariaLabel || text);
        }
      });
    } catch (error) {
      console.warn('提取互动数据失败:', error);
    }

    return metrics;
  }

  /**
   * 从文本中解析数字计数
   */
  parseCount(text) {
    const match = text.match(/(\d+(?:,\d+)*(?:\.\d+)?[KMB]?)/i);
    if (!match) return 0;

    const count = match[1];
    const multiplier = count.slice(-1).toUpperCase();
    const number = parseFloat(count.replace(/,/g, ''));

    switch (multiplier) {
      case 'K': return Math.floor(number * 1000);
      case 'M': return Math.floor(number * 1000000);
      case 'B': return Math.floor(number * 1000000000);
      default: return Math.floor(number);
    }
  }

  /**
   * 提取推文URL
   */
  extractTweetUrl(tweetElement) {
    const urlElement = tweetElement.querySelector(SELECTORS.tweetUrl);
    if (urlElement && urlElement.href) {
      return urlElement.href;
    }
    
    // 如果找不到具体URL，返回当前页面URL
    return window.location.href;
  }

  /**
   * 提取推文线程信息
   */
  extractThreadInfo(tweetElement) {
    try {
      const threadInfo = {
        isThread: false,
        position: 1,
        total: 1,
        threadId: null,
        hasMoreTweets: false
      };

      // 检测线程连接线指示器
      const threadConnector = tweetElement.querySelector('[aria-label*="Thread"]') || 
                             tweetElement.querySelector('[data-testid*="thread"]') ||
                             tweetElement.querySelector('.css-1dbjc4n.r-1igl3o0.r-qklmqi.r-1adg3ll.r-1ny4l3l');

      // 检测"显示更多"或线程继续指示器
      const showMoreIndicator = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]') ||
                                tweetElement.querySelector('a[href$="/status"]') ||
                                document.querySelector(`[href="${this.extractTweetUrl(tweetElement)}"]`);

      // 检测推文是否有回复给自己（典型的线程模式）
      const selfReply = this.detectSelfReply(tweetElement);

      // 检测数字编号（1/n, 2/n等）
      const numberPattern = this.extractNumberPattern(tweetElement);

      if (threadConnector || selfReply || numberPattern.isNumbered) {
        threadInfo.isThread = true;
        threadInfo.threadId = this.generateThreadId(tweetElement);
        
        if (numberPattern.isNumbered) {
          threadInfo.position = numberPattern.current;
          threadInfo.total = numberPattern.total;
        }
      }

      // 检测是否有更多推文
      threadInfo.hasMoreTweets = !!showMoreIndicator || this.hasVisualContinuation(tweetElement);

      return threadInfo;
    } catch (error) {
      console.warn('提取线程信息失败:', error);
      return {
        isThread: false,
        position: 1,
        total: 1,
        threadId: null,
        hasMoreTweets: false
      };
    }
  }

  /**
   * 提取推文线程信息（用于复制时，带展开功能）
   */
  async extractThreadInfoForCopy(tweetElement) {
    try {
      const threadInfo = {
        isThread: false,
        position: 1,
        total: 1,
        threadId: null,
        hasMoreTweets: false
      };

      // 检测线程连接线指示器
      const threadConnector = tweetElement.querySelector('[aria-label*="Thread"]') || 
                             tweetElement.querySelector('[data-testid*="thread"]') ||
                             tweetElement.querySelector('.css-1dbjc4n.r-1igl3o0.r-qklmqi.r-1adg3ll.r-1ny4l3l');

      // 检测"显示更多"或线程继续指示器
      const showMoreIndicator = tweetElement.querySelector('[data-testid="tweet-text-show-more-link"]') ||
                                tweetElement.querySelector('a[href$="/status"]') ||
                                document.querySelector(`[href="${this.extractTweetUrl(tweetElement)}"]`);

      // 检测推文是否有回复给自己（典型的线程模式）
      const selfReply = this.detectSelfReply(tweetElement);

      // 检测数字编号（1/n, 2/n等）
      const numberPattern = await this.extractNumberPatternForCopy(tweetElement);

      if (threadConnector || selfReply || numberPattern.isNumbered) {
        threadInfo.isThread = true;
        threadInfo.threadId = this.generateThreadId(tweetElement);
        
        if (numberPattern.isNumbered) {
          threadInfo.position = numberPattern.current;
          threadInfo.total = numberPattern.total;
        }
      }

      // 检测是否有更多推文
      threadInfo.hasMoreTweets = !!showMoreIndicator || await this.hasVisualContinuationForCopy(tweetElement);

      return threadInfo;
    } catch (error) {
      console.warn('提取线程信息失败:', error);
      return {
        isThread: false,
        position: 1,
        total: 1,
        threadId: null,
        hasMoreTweets: false
      };
    }
  }

  /**
   * 提取数字模式 (1/n, 2/n等) - 复制时使用
   */
  async extractNumberPatternForCopy(tweetElement) {
    try {
      const content = await this.extractContentWithExpansion(tweetElement);
      
      // 匹配各种数字模式
      const patterns = [
        /(\d+)\/(\d+)/, // 1/5, 2/5 等
        /(\d+)\s*\|\s*(\d+)/, // 1 | 5, 2 | 5 等
        /(\d+)\s*of\s*(\d+)/i, // 1 of 5, 2 of 5 等
        /Thread\s*(\d+)\/(\d+)/i, // Thread 1/5 等
        /🧵\s*(\d+)\/(\d+)/, // 🧵1/5 等
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return {
            isNumbered: true,
            current: parseInt(match[1]),
            total: parseInt(match[2])
          };
        }
      }

      // 检查开头是否有单独的数字
      const singleNumber = content.match(/^(\d+)[\.\)]\s/);
      if (singleNumber) {
        return {
          isNumbered: true,
          current: parseInt(singleNumber[1]),
          total: -1 // 未知总数
        };
      }

      return { isNumbered: false, current: 1, total: 1 };
    } catch (error) {
      return { isNumbered: false, current: 1, total: 1 };
    }
  }

  /**
   * 检测视觉连续性指示器 - 复制时使用
   */
  async hasVisualContinuationForCopy(tweetElement) {
    const content = await this.extractContentWithExpansion(tweetElement);
    
    // 检测常见的继续指示器
    const continuationPatterns = [
      /\.\.\.$/, // 省略号结尾
      /続く$/, // 日文"继续"
      /続きます$/, // 日文"将继续" 
      /thread$/i, // 以thread结尾
      /🧵$/, // 线程emoji结尾
      /more$/i, // 以more结尾
      /continued$/i, // 以continued结尾
    ];

    return continuationPatterns.some(pattern => pattern.test(content.trim()));
  }

  /**
   * 检测自回复（线程的典型特征）
   */
  detectSelfReply(tweetElement) {
    try {
      const author = this.extractAuthor(tweetElement);
      
      // 查找"回复给"指示器
      const replyIndicator = tweetElement.querySelector('[data-testid="reply"]') ||
                            tweetElement.querySelector('[aria-label*="Replying to"]');
      
      if (replyIndicator) {
        const replyText = replyIndicator.textContent || '';
        return replyText.includes(`@${author.username}`) || replyText.includes(author.name);
      }
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * 提取数字模式 (1/n, 2/n等)
   */
  extractNumberPattern(tweetElement) {
    try {
      const content = this.extractContent(tweetElement);
      
      // 匹配各种数字模式
      const patterns = [
        /(\d+)\/(\d+)/, // 1/5, 2/5 等
        /(\d+)\s*\|\s*(\d+)/, // 1 | 5, 2 | 5 等
        /(\d+)\s*of\s*(\d+)/i, // 1 of 5, 2 of 5 等
        /Thread\s*(\d+)\/(\d+)/i, // Thread 1/5 等
        /🧵\s*(\d+)\/(\d+)/, // 🧵1/5 等
      ];

      for (const pattern of patterns) {
        const match = content.match(pattern);
        if (match) {
          return {
            isNumbered: true,
            current: parseInt(match[1]),
            total: parseInt(match[2])
          };
        }
      }

      // 检查开头是否有单独的数字
      const singleNumber = content.match(/^(\d+)[\.\)]\s/);
      if (singleNumber) {
        return {
          isNumbered: true,
          current: parseInt(singleNumber[1]),
          total: -1 // 未知总数
        };
      }

      return { isNumbered: false, current: 1, total: 1 };
    } catch (error) {
      return { isNumbered: false, current: 1, total: 1 };
    }
  }

  /**
   * 生成线程ID
   */
  generateThreadId(tweetElement) {
    try {
      const author = this.extractAuthor(tweetElement);
      const timestamp = this.extractTimestamp(tweetElement);
      const tweetId = this.getTweetId(tweetElement);
      
      // 使用作者和时间生成线程ID
      return `thread_${author.username}_${new Date(timestamp).getTime()}_${tweetId}`;
    } catch (error) {
      return `thread_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * 检测视觉连续性指示器
   */
  hasVisualContinuation(tweetElement) {
    const content = this.extractContent(tweetElement);
    
    // 检测常见的继续指示器
    const continuationPatterns = [
      /\.\.\.$/, // 省略号结尾
      /続く$/, // 日文"继续"
      /続きます$/, // 日文"将继续" 
      /thread$/i, // 以thread结尾
      /🧵$/, // 线程emoji结尾
      /more$/i, // 以more结尾
      /continued$/i, // 以continued结尾
    ];

    return continuationPatterns.some(pattern => pattern.test(content.trim()));
  }

  /**
   * 查找线程中的所有推文
   * @param {Element} startTweetElement - 起始推文元素
   * @returns {Array} 线程中的所有推文元素
   */
  findThreadTweets(startTweetElement) {
    try {
      const allTweets = document.querySelectorAll(SELECTORS.tweet);
      const startAuthor = this.extractAuthor(startTweetElement);
      const threadTweets = [];
      
      let foundStart = false;
      
      for (const tweet of allTweets) {
        const tweetAuthor = this.extractAuthor(tweet);
        const threadInfo = this.extractThreadInfo(tweet);
        
        // 检查是否是同一作者
        if (tweetAuthor.username !== startAuthor.username) {
          if (foundStart) break; // 遇到其他作者，线程结束
          continue;
        }
        
        if (tweet === startTweetElement) {
          foundStart = true;
        }
        
        if (foundStart && threadInfo.isThread) {
          threadTweets.push(tweet);
        } else if (foundStart && !threadInfo.isThread) {
          // 单独推文也可能是线程的一部分
          threadTweets.push(tweet);
          break;
        }
      }
      
      return threadTweets.length > 1 ? threadTweets : [startTweetElement];
    } catch (error) {
      console.warn('查找线程推文失败:', error);
      return [startTweetElement];
    }
  }

  /**
   * 获取降级数据（当解析失败时）
   */
  getFallbackData(tweetElement) {
    return {
      id: 'fallback_' + Date.now(),
      author: { name: '未知用户', username: 'unknown', profileUrl: '#' },
      content: tweetElement.textContent?.trim() || '无法获取内容',
      timestamp: new Date().toISOString(),
      media: { images: [], videos: [], links: [] },
      metrics: { likes: 0, retweets: 0, replies: 0, views: 0 },
      url: window.location.href,
      thread: { isThread: false, position: 1, total: 1 }
    };
  }

  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 导出全局实例
window.TweetParser = window.TweetParser || new TweetParser(); 