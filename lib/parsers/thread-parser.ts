// Twitter 线程解析器

import type { ThreadData, TweetData } from '../types';
import { tweetParser } from './tweet-parser';
import { TWITTER_SELECTORS, TWITTER_PATTERNS } from '../utils/constants';
import { query, queryAll, waitForElement } from '../utils/dom';
import { performanceMonitor, BatchProcessor } from '../utils/performance';

/**
 * 线程解析器类
 */
export class ThreadParser {
  private static instance: ThreadParser;
  private batchProcessor: BatchProcessor<HTMLElement>;
  
  private constructor() {
    // 初始化批处理器
    this.batchProcessor = new BatchProcessor<HTMLElement>(
      5, // 每批处理5个推文
      async (elements: HTMLElement[]) => {
        await tweetParser.parseTweets(elements);
      }
    );
  }
  
  public static getInstance(): ThreadParser {
if (!ThreadParser.instance) {
      ThreadParser.instance = new ThreadParser();
    }
    return ThreadParser.instance;
  }

  /**
   * 解析完整线程
   */
  async parseThread(startTweetElement: HTMLElement): Promise<ThreadData | null> {
    performanceMonitor.startMeasure('parse-thread');
    
    try {
      // 首先解析起始推文
      const startTweet = await tweetParser.parseTweet(startTweetElement);
      if (!startTweet) {
        performanceMonitor.endMeasure('parse-thread');
      return null;
      }

      // 检查是否为线程
      if (!startTweet.isThread) {
   performanceMonitor.endMeasure('parse-thread');
        return {
          id: startTweet.id,
          tweets: [startTweet],
          totalCount: 1,
          author: startTweet.author,
 createdAt: startTweet.timestamp,
    isComplete: true
        };
      }

      // 查找线程中的所有推文
   const threadTweets = await this.findAllThreadTweets(startTweet);
      
      // 按时间戳或位置排序
      threadTweets.sort((a, b) => {
 // 优先使用线程位置排序
        if (a.threadPosition && b.threadPosition) {
          return a.threadPosition - b.threadPosition;
    }
   // 其次使用时间戳排序
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      const threadData: ThreadData = {
 id: this.generateThreadId(threadTweets),
        tweets: threadTweets,
   totalCount: threadTweets.length,
     author: startTweet.author,
        createdAt: threadTweets[0]?.timestamp || startTweet.timestamp,
        isComplete: this.checkThreadCompleteness(threadTweets)
      };

      performanceMonitor.endMeasure('parse-thread');
      return threadData;
 
    } catch (error) {
      console.error('Failed to parse thread:', error);
      performanceMonitor.endMeasure('parse-thread');
      return null;
}
  }

  /**
   * 查找线程中的所有推文
   */
  private async findAllThreadTweets(startTweet: TweetData): Promise<TweetData[]> {
    const tweets: TweetData[] = [startTweet];
    const seenIds = new Set([startTweet.id]);
    
    // 方法1: 基于页面上已有的推文元素
const pageTweets = await this.findThreadTweetsOnPage(startTweet);
    for (const tweet of pageTweets) {
      if (!seenIds.has(tweet.id)) {
        tweets.push(tweet);
     seenIds.add(tweet.id);
      }
    }

    // 方法2: 尝试加载更多线程内容（如果需要）
    const additionalTweets = await this.loadMoreThreadTweets(startTweet);
    for (const tweet of additionalTweets) {
      if (!seenIds.has(tweet.id)) {
        tweets.push(tweet);
    seenIds.add(tweet.id);
      }
  }

    return tweets;
  }

  /**
   * 在当前页面查找线程推文
   */
  private async findThreadTweetsOnPage(referenceTweet: TweetData): Promise<TweetData[]> {
    const threadTweets: TweetData[] = [];
    const allTweetElements = tweetParser.findTweetElements();

    // 使用批处理器解析所有推文
    const allTweets: TweetData[] = [];
    
 for (const element of allTweetElements) {
      try {
     const tweet = await tweetParser.parseTweet(element);
  if (tweet) {
      allTweets.push(tweet);
        }
      } catch (error) {
  console.warn('Failed to parse tweet in thread search:', error);
      }
    }

    // 查找同一作者在相近时间发布的推文
    const timeWindow = 24 * 60 * 60 * 1000; // 24小时内
    
    for (const tweet of allTweets) {
      if (this.isSameThreadTweet(tweet, referenceTweet, timeWindow)) {
    threadTweets.push(tweet);
      }
    }

    return threadTweets;
  }

  /**
   * 判断两个推文是否属于同一线程
   */
  private isSameThreadTweet(tweet: TweetData, reference: TweetData, timeWindow: number): boolean {
    // 检查是否为同一作者
    if (tweet.author.username !== reference.author.username) {
      return false;
    }

    // 检查时间窗口
    const timeDiff = Math.abs(tweet.timestamp.getTime() - reference.timestamp.getTime());
    if (timeDiff > timeWindow) {
      return false;
    }

    // 检查是否有线程标识
    if (!tweet.isThread) {
      return false;
    }

    // 检查线程ID是否相同
    if (tweet.threadId && reference.threadId && tweet.threadId === reference.threadId) {
      return true;
    }

    // 检查内容是否有连续性特征
    if (this.hasThreadContinuity(tweet, reference)) {
      return true;
    }

    return false;
  }

  /**
   * 检查推文内容的连续性
   */
  private hasThreadContinuity(tweet: TweetData, reference: TweetData): boolean {
    // 检查编号连续性
    const tweetNumber = this.extractThreadNumber(tweet.content);
    const refNumber = this.extractThreadNumber(reference.content);
    
    if (tweetNumber && refNumber) {
      return Math.abs(tweetNumber - refNumber) <= 2; // 允许有少量间隔
    }

    // 检查内容连接词
    const continuityMarkers = [
      // 中文
    '接上', '续上', '接下来', '然后', '另外', '此外', '最后', '总之',
      // 英文
      'continued', 'also', 'furthermore', 'moreover', 'finally', 'in conclusion',
 // 日文
      'そして', 'また', 'さらに', '最後に',
      // 韩文
      '그리고', '또한', '더욱이', '마지막으로'
    ];

    for (const marker of continuityMarkers) {
  if (tweet.content.toLowerCase().includes(marker.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * 从内容中提取线程编号
   */
  private extractThreadNumber(content: string): number | null {
    // 匹配 1/n 或 (1/n) 或 1. 格式
 const patterns = [
      /^(\d+)\/\d+/, // 1/5
      /^\((\d+)\/\d+\)/, // (1/5)
      /^(\d+)\./, // 1.
      /(\d+)\/\d+$/, // 结尾的 1/5
      /🧵(\d+)\/\d+/, // 🧵1/5
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
  if (match) {
return parseInt(match[1]);
      }
    }

    return null;
  }

  /**
 * 尝试加载更多线程内容
   */
  private async loadMoreThreadTweets(referenceTweet: TweetData): Promise<TweetData[]> {
    const additionalTweets: TweetData[] = [];

    try {
      // 查找"显示此线程"按钮
      const showThreadButton = query(document, '[aria-label*="Show this thread"], [aria-label*="显示此线程"]');
    
      if (showThreadButton) {
  // 点击按钮加载更多内容
        (showThreadButton as HTMLElement).click();
  
        // 等待新内容加载
    await this.waitForThreadLoad();
        
        // 解析新加载的推文
        const newTweetElements = tweetParser.findTweetElements();
        const currentTweets = await tweetParser.parseTweets(newTweetElements);
        
        // 过滤出属于当前线程的推文
        for (const tweet of currentTweets) {
   if (this.isSameThreadTweet(tweet, referenceTweet, 24 * 60 * 60 * 1000)) {
       additionalTweets.push(tweet);
     }
     }
      }
    } catch (error) {
      console.warn('Failed to load additional thread tweets:', error);
    }

    return additionalTweets;
  }

  /**
   * 等待线程内容加载完成
   */
  private async waitForThreadLoad(): Promise<void> {
    return new Promise((resolve) => {
      // 简单的延迟等待，实际项目中可以使用更智能的检测
      setTimeout(resolve, 2000);
    });
  }

  /**
   * 检查线程是否完整
   */
  private checkThreadCompleteness(tweets: TweetData[]): boolean {
    if (tweets.length === 0) return false;
    
  // 检查是否有编号连续性
 const numberedTweets = tweets
      .map(tweet => ({
      tweet,
        number: this.extractThreadNumber(tweet.content)
      }))
      .filter(item => item.number !== null)
.sort((a, b) => a.number! - b.number!);

    if (numberedTweets.length > 1) {
      // 检查编号是否连续
      for (let i = 1; i < numberedTweets.length; i++) {
        const currentNumber = numberedTweets[i].number!;
        const previousNumber = numberedTweets[i - 1].number!;
        
     if (currentNumber - previousNumber > 1) {
          return false; // 有缺失的编号
        }
      }
      
      // 检查是否从1开始
      return numberedTweets[0].number === 1;
    }

 // 对于没有编号的线程，假设是完整的
    return true;
  }

  /**
   * 生成线程ID
   */
  private generateThreadId(tweets: TweetData[]): string {
    if (tweets.length === 0) return Date.now().toString();

    const firstTweet = tweets[0];
    return `thread_${firstTweet.author.username}_${firstTweet.id}`;
  }

  /**
   * 检测指定推文是否为线程的一部分
 */
  async detectThreadFromTweet(tweetElement: HTMLElement): Promise<{
    isPartOfThread: boolean;
    threadData?: ThreadData;
 position?: number;
  }> {
    try {
      const tweet = await tweetParser.parseTweet(tweetElement);
      if (!tweet) {
        return { isPartOfThread: false };
      }

      if (!tweet.isThread) {
        return { isPartOfThread: false };
      }

      // 尝试解析完整线程
      const threadData = await this.parseThread(tweetElement);
      
      return {
        isPartOfThread: true,
     threadData: threadData || undefined,
    position: tweet.threadPosition
      };
      
    } catch (error) {
      console.error('Failed to detect thread:', error);
      return { isPartOfThread: false };
    }
  }

  /**
   * 从指定位置开始解析线程（用于"从此处开始复制"功能）
   */
  async parseThreadFromPosition(
    startTweetElement: HTMLElement, 
    fromPosition: number = 1
  ): Promise<ThreadData | null> {
    const fullThread = await this.parseThread(startTweetElement);
    
    if (!fullThread) return null;

    // 过滤出指定位置之后的推文
    const filteredTweets = fullThread.tweets.filter(tweet => {
      if (tweet.threadPosition) {
        return tweet.threadPosition >= fromPosition;
      }
   
      // 如果没有明确的位置，使用时间戳判断
      const startTweet = fullThread.tweets.find(t => 
        t.threadPosition === fromPosition || 
        (fromPosition === 1 && t.timestamp.getTime() === Math.min(...fullThread.tweets.map(tw => tw.timestamp.getTime())))
      );
      
      if (startTweet) {
        return tweet.timestamp.getTime() >= startTweet.timestamp.getTime();
      }
      
      return true;
 });

  if (filteredTweets.length === 0) return null;

    return {
      ...fullThread,
  tweets: filteredTweets,
      totalCount: filteredTweets.length,
      createdAt: filteredTweets[0].timestamp
    };
}

  /**
   * 获取线程统计信息
   */
  getThreadStats(threadData: ThreadData): {
    totalTweets: number;
    totalCharacters: number;
  averageLength: number;
    hasMedia: boolean;
    timeSpan: number;
} {
    const totalTweets = threadData.tweets.length;
    const totalCharacters = threadData.tweets.reduce((sum, tweet) => sum + tweet.content.length, 0);
    const averageLength = totalTweets > 0 ? totalCharacters / totalTweets : 0;
 const hasMedia = threadData.tweets.some(tweet => tweet.media.length > 0);
    
    const timestamps = threadData.tweets.map(tweet => tweet.timestamp.getTime());
    const timeSpan = Math.max(...timestamps) - Math.min(...timestamps);

    return {
      totalTweets,
      totalCharacters,
      averageLength: Math.round(averageLength),
      hasMedia,
    timeSpan
    };
  }
}

// 导出单例实例
export const threadParser = ThreadParser.getInstance();