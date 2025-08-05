// 缓存管理器 - 缓存解析结果和格式化内容
import { TweetData } from '../types';

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

/**
 * 缓存选项接口
 */
interface CacheOptions {
  ttl?: number; // 生存时间（毫秒）
  maxSize?: number; // 最大缓存大小（字节）
  maxItems?: number; // 最大缓存项数
  cleanupInterval?: number; // 清理间隔（毫秒）
  strategy?: 'lru' | 'lfu' | 'fifo'; // 清理策略
}

/**
 * 缓存统计接口
 */
interface CacheStats {
  totalItems: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictCount: number;
  cleanupCount: number;
averageAccessTime: number;
}

/**
 * 缓存管理器类
 */
export class CacheManager {
  private cache = new Map<string, CacheItem<any>>();
  private options: Required<CacheOptions>;
  private stats: CacheStats = {
    totalItems: 0,
    totalSize: 0,
    hitCount: 0,
    missCount: 0,
    hitRate: 0,
    evictCount: 0,
    cleanupCount: 0,
    averageAccessTime: 0
  };
  private cleanupTimer?: number;
  private accessTimes: number[] = [];

  constructor(options: CacheOptions = {}) {
    this.options = {
      ttl: options.ttl || 5 * 60 * 1000, // 5分钟
      maxSize: options.maxSize || 50 * 1024 * 1024, // 50MB
      maxItems: options.maxItems || 1000,
 cleanupInterval: options.cleanupInterval || 2 * 60 * 1000, // 2分钟
      strategy: options.strategy || 'lru'
    };

    this.startCleanupTimer();
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存值或undefined
   */
  get<T>(key: string): T | undefined {
    const startTime = performance.now();
    
    const item = this.cache.get(key);

    if (!item) {
      this.stats.missCount++;
      this.updateAccessTime(performance.now() - startTime);
      return undefined;
    }

    // 检查TTL
 if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      this.stats.missCount++;
      this.updateAccessTime(performance.now() - startTime);
  return undefined;
    }

    // 更新访问信息
    item.accessCount++;
  item.lastAccessed = Date.now();
    
    this.stats.hitCount++;
    this.updateHitRate();
    this.updateAccessTime(performance.now() - startTime);

    return item.data;
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 自定义TTL
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const itemTtl = ttl || this.options.ttl;
    const size = this.calculateSize(value);

    // 检查是否需要清理空间
    this.ensureSpace(size);

    const item: CacheItem<T> = {
      data: value,
    timestamp: now,
   ttl: itemTtl,
      accessCount: 1,
    lastAccessed: now,
      size
    };

    // 如果键已存在，更新统计信息
    const existingItem = this.cache.get(key);
    if (existingItem) {
   this.stats.totalSize -= existingItem.size;
    } else {
      this.stats.totalItems++;
    }

    this.cache.set(key, item);
    this.stats.totalSize += size;
  }

  /**
   * 删除缓存项
   * @param key 缓存键
   */
  delete(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    this.cache.delete(key);
    this.stats.totalItems--;
    this.stats.totalSize -= item.size;
    
    return true;
  }

/**
   * 检查缓存项是否存在且有效
   * @param key 缓存键
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    // 检查TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.stats.totalItems = 0;
    this.stats.totalSize = 0;
  this.stats.cleanupCount++;
}

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取缓存键列表
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * 获取缓存大小（字节）
   */
  size(): number {
    return this.stats.totalSize;
  }

  /**
   * 获取缓存项数量
   */
  count(): number {
    return this.stats.totalItems;
  }

  // 专用缓存方法

  /**
   * 缓存解析的推文数据
   * @param tweetId 推文ID
   * @param tweetData 推文数据
   */
  cacheParsedTweet(tweetId: string, tweetData: TweetData): void {
    const key = `parsed_tweet_${tweetId}`;
  this.set(key, tweetData, 10 * 60 * 1000); // 10分钟
  }

  /**
   * 获取缓存的解析推文数据
   * @param tweetId 推文ID
   */
  getCachedParsedTweet(tweetId: string): TweetData | undefined {
    const key = `parsed_tweet_${tweetId}`;
    return this.get<TweetData>(key);
  }

  /**
   * 缓存格式化内容
   * @param contentHash 内容哈希
   * @param format 格式类型
   * @param formattedContent 格式化后的内容
   */
  cacheFormattedContent(
    contentHash: string, 
    format: string, 
    formattedContent: string
  ): void {
    const key = `formatted_${format}_${contentHash}`;
    this.set(key, formattedContent, 15 * 60 * 1000); // 15分钟
  }

  /**
   * 获取缓存的格式化内容
   * @param contentHash 内容哈希
   * @param format 格式类型
   */
  getCachedFormattedContent(contentHash: string, format: string): string | undefined {
    const key = `formatted_${format}_${contentHash}`;
    return this.get<string>(key);
  }

  /**
   * 缓存线程数据
   * @param threadId 线程ID
 * @param threadData 线程数据
   */
  cacheThreadData(threadId: string, threadData: any): void {
    const key = `thread_${threadId}`;
    this.set(key, threadData, 20 * 60 * 1000); // 20分钟
  }

  /**
   * 获取缓存的线程数据
   * @param threadId 线程ID
   */
  getCachedThreadData(threadId: string): any | undefined {
    const key = `thread_${threadId}`;
    return this.get(key);
  }

  /**
   * 缓存截图数据
   * @param screenshotId 截图ID
   * @param screenshotData 截图数据
   */
  cacheScreenshot(screenshotId: string, screenshotData: any): void {
    const key = `screenshot_${screenshotId}`;
    // 截图数据较大，TTL较短
this.set(key, screenshotData, 5 * 60 * 1000); // 5分钟
  }

  /**
   * 获取缓存的截图数据
   * @param screenshotId 截图ID
   */
  getCachedScreenshot(screenshotId: string): any | undefined {
    const key = `screenshot_${screenshotId}`;
    return this.get(key);
  }

  // 私有方法

  /**
   * 确保有足够的缓存空间
   * @param requiredSize 需要的空间大小
   */
  private ensureSpace(requiredSize: number): void {
    // 如果当前项目数量超过限制，清理
    if (this.stats.totalItems >= this.options.maxItems) {
      this.evictItems(Math.ceil(this.options.maxItems * 0.1)); // 清理10%
    }

    // 如果空间不足，继续清理
    while (this.stats.totalSize + requiredSize > this.options.maxSize) {
      this.evictItems(10);
    }
  }

  /**
   * 清理缓存项
   * @param count 要清理的项目数量
   */
  private evictItems(count: number): void {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      ...item
    }));

    let itemsToRemove: string[] = [];

    switch (this.options.strategy) {
      case 'lru': // 最近最少使用
        itemsToRemove = items
        .sort((a, b) => a.lastAccessed - b.lastAccessed)
          .slice(0, count)
    .map(item => item.key);
        break;
    
      case 'lfu': // 最不经常使用
        itemsToRemove = items
      .sort((a, b) => a.accessCount - b.accessCount)
  .slice(0, count)
          .map(item => item.key);
  break;
      
      case 'fifo': // 先进先出
        itemsToRemove = items
   .sort((a, b) => a.timestamp - b.timestamp)
     .slice(0, count)
          .map(item => item.key);
   break;
    }

    itemsToRemove.forEach(key => {
      this.delete(key);
      this.stats.evictCount++;
    });
  }

  /**
   * 清理过期项
   */
private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
  keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0) {
   this.stats.cleanupCount++;
    }
  }

  /**
   * 计算数据大小
   * @param data 数据
   */
  private calculateSize(data: any): number {
    try {
const str = JSON.stringify(data);
      return new Blob([str]).size;
    } catch {
      // 降级方案
      return JSON.stringify(data).length * 2; // 假设每个字符2字节
 }
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = total > 0 ? this.stats.hitCount / total : 0;
  }

  /**
   * 更新访问时间统计
   * @param accessTime 访问时间
   */
  private updateAccessTime(accessTime: number): void {
    this.accessTimes.push(accessTime);
    
    // 只保留最近1000次访问的时间
    if (this.accessTimes.length > 1000) {
      this.accessTimes = this.accessTimes.slice(-1000);
    }

 // 计算平均访问时间
    this.stats.averageAccessTime = 
      this.accessTimes.reduce((sum, time) => sum + time, 0) / this.accessTimes.length;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (typeof window !== 'undefined') {
      this.cleanupTimer = window.setInterval(
        () => this.cleanupExpired(),
      this.options.cleanupInterval
      );
    }
  }

  /**
   * 停止清理定时器
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    this.stopCleanupTimer();
    this.clear();
  }

  /**
   * 导出缓存数据
   */
  export(): string {
    const exportData = {
      cache: Object.fromEntries(this.cache),
      stats: this.stats,
      options: this.options,
      timestamp: Date.now()
    };

    return JSON.stringify(exportData);
  }

  /**
   * 导入缓存数据
   * @param data 导入的数据
   */
  import(data: string): boolean {
    try {
  const importData = JSON.parse(data);
      
      // 验证数据格式
      if (!importData.cache || !importData.stats) {
        return false;
      }

      this.clear();
      
      // 重新构建缓存
      for (const [key, item] of Object.entries(importData.cache)) {
        this.cache.set(key, item as CacheItem<any>);
      }

      this.stats = { ...importData.stats };
      
  return true;
    } catch (error) {
      console.error('Failed to import cache data:', error);
      return false;
    }
}
}

/**
 * 创建内容哈希
 * @param content 内容
 * @returns 哈希值
 */
export function createContentHash(content: any): string {
  const str = typeof content === 'string' ? content : JSON.stringify(content);
  
  // 简单的哈希函数
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  
  return Math.abs(hash).toString(36);
}

// 创建单例实例
export const cacheManager = new CacheManager({
  ttl: 10 * 60 * 1000, // 10分钟
  maxSize: 100 * 1024 * 1024, // 100MB
  maxItems: 2000,
  cleanupInterval: 3 * 60 * 1000, // 3分钟
  strategy: 'lru'
});