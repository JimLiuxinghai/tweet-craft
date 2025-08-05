// 性能监控和优化相关工具函数

import type { PerformanceMetrics, TweetData } from '../types';
import { EXTENSION_CONFIG } from './constants';

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: Map<string, PerformanceObserver> = new Map();
  
public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * 开始性能测量
   */
  startMeasure(name: string): void {
    performance.mark(`${name}-start`);
  }

  /**
   * 结束性能测量
   */
  endMeasure(name: string): number {
    const endMark = `${name}-end`;
    const startMark = `${name}-start`;
    
    performance.mark(endMark);
    performance.measure(name, startMark, endMark);
    
    const measures = performance.getEntriesByName(name, 'measure');
    if (measures.length > 0) {
      const duration = measures[measures.length - 1].duration;
      
      // 清理标记
      performance.clearMarks(startMark);
      performance.clearMarks(endMark);
      performance.clearMeasures(name);
      
      return duration;
    }
    
    return 0;
  }

  /**
   * 记录操作性能指标
   */
  recordMetrics(operation: string, metrics: PerformanceMetrics): void {
    this.metrics.set(operation, metrics);
    
    // 如果性能指标异常，记录警告
    if (metrics.totalTime > EXTENSION_CONFIG.PERFORMANCE.MAX_PARSE_TIME) {
    console.warn(`Performance warning: ${operation} took ${metrics.totalTime}ms`);
    }
  }

  /**
   * 获取性能指标
   */
  getMetrics(operation: string): PerformanceMetrics | undefined {
  return this.metrics.get(operation);
  }

  /**
   * 获取所有性能指标
   */
  getAllMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics);
  }

  /**
   * 清理性能数据
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * 监控长任务
   */
  monitorLongTasks(callback: (entries: PerformanceEntry[]) => void): void {
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        callback(list.getEntries());
      });
      
      try {
   observer.observe({ entryTypes: ['longtask'] });
      this.observers.set('longtask', observer);
      } catch (e) {
        console.warn('Long task monitoring not supported:', e);
      }
  }
  }

  /**
   * 监控内存使用
   */
  getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 停止所有监控
   */
  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

/**
 * 批处理管理器
 */
export class BatchProcessor<T> {
  private batchSize: number;
  private processingQueue: T[] = [];
  private isProcessing: boolean = false;
  private processor: (items: T[]) => Promise<void>;
  private onProgress?: (processed: number, total: number) => void;

  constructor(
    batchSize: number = EXTENSION_CONFIG.PERFORMANCE.BATCH_SIZE,
    processor: (items: T[]) => Promise<void>,
    onProgress?: (processed: number, total: number) => void
  ) {
    this.batchSize = batchSize;
    this.processor = processor;
    this.onProgress = onProgress;
  }

  /**
   * 添加项目到处理队列
   */
  addItems(items: T[]): void {
    this.processingQueue.push(...items);
    this.processNext();
  }

  /**
   * 添加单个项目
   */
  addItem(item: T): void {
    this.processingQueue.push(item);
    this.processNext();
  }

  /**
   * 处理下一批项目
   */
  private async processNext(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

this.isProcessing = true;
    const totalItems = this.processingQueue.length;
    let processedCount = 0;

while (this.processingQueue.length > 0) {
      const batch = this.processingQueue.splice(0, this.batchSize);
      
      try {
        await this.processor(batch);
        processedCount += batch.length;
        
        if (this.onProgress) {
          this.onProgress(processedCount, totalItems);
        }
        
        // 让出控制权给浏览器
 await new Promise(resolve => setTimeout(resolve, 0));
      } catch (error) {
        console.error('Batch processing error:', error);
   break;
      }
    }

    this.isProcessing = false;
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.processingQueue = [];
    this.isProcessing = false;
  }

  /**
   * 获取队列状态
   */
  getStatus(): { queueSize: number; isProcessing: boolean } {
    return {
      queueSize: this.processingQueue.length,
 isProcessing: this.isProcessing
    };
  }
}

/**
 * 缓存管理器
 */
export class CacheManager<T> {
  private cache: Map<string, { data: T; timestamp: number; accessCount: number }> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize: number = EXTENSION_CONFIG.CACHE.MAX_ITEMS, ttl: number = EXTENSION_CONFIG.CACHE.EXPIRE_TIME) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * 获取缓存项
   */
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // 检查是否过期
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // 更新访问次数
    item.accessCount++;
    
    return item.data;
  }

  /**
   * 设置缓存项
   */
  set(key: string, data: T): void {
    // 如果缓存已满，清理最少使用的项
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }
    
  this.cache.set(key, {
    data,
      timestamp: Date.now(),
      accessCount: 1
    });
  }

  /**
   * 删除缓存项
 */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
* 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清理过期项
   */
  cleanExpired(): number {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > this.ttl) {
    this.cache.delete(key);
cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * 驱逐最少使用的项
   */
  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let minAccessCount = Infinity;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.accessCount < minAccessCount) {
  minAccessCount = item.accessCount;
        leastUsedKey = key;
      }
    }
    
    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
 }
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    averageAge: number;
  } {
    const now = Date.now();
    let totalAge = 0;
    let totalAccess = 0;
  
 for (const item of this.cache.values()) {
      totalAge += now - item.timestamp;
      totalAccess += item.accessCount;
    }
    
    return {
      size: this.cache.size,
    maxSize: this.maxSize,
      hitRate: this.cache.size > 0 ? totalAccess / this.cache.size : 0,
      averageAge: this.cache.size > 0 ? totalAge / this.cache.size : 0
    };
  }
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
  timeout = setTimeout(() => {
      timeout = null;
      func(...args);
    }, wait);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  
  return function (...args: Parameters<T>) {
    const now = Date.now();
    
    if (now - lastTime >= wait) {
      lastTime = now;
    func(...args);
    }
  };
}

/**
 * 请求动画帧节流
 */
export function rafThrottle<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number | null = null;
  
  return function (...args: Parameters<T>) {
    if (rafId) return;
    
    rafId = requestAnimationFrame(() => {
      rafId = null;
      func(...args);
    });
  };
}

/**
 * 计算操作性能
 */
export async function measurePerformance<T>(
  operation: () => Promise<T> | T,
  operationName: string
): Promise<{ result: T; duration: number }> {
  const monitor = PerformanceMonitor.getInstance();
  
  monitor.startMeasure(operationName);
  
  try {
 const result = await operation();
    const duration = monitor.endMeasure(operationName);
    
    return { result, duration };
  } catch (error) {
    monitor.endMeasure(operationName);
    throw error;
  }
}

/**
 * 创建性能友好的观察器
 */
export function createPerformantObserver(
  callback: (entries: MutationRecord[]) => void,
  options: MutationObserverInit = {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  }
): MutationObserver {
  const throttledCallback = throttle(callback, EXTENSION_CONFIG.PERFORMANCE.THROTTLE_TIME);

  const observer = new MutationObserver((mutations) => {
 // 过滤无关的变化
    const relevantMutations = mutations.filter(mutation => {
      return mutation.type === 'childList' && mutation.addedNodes.length > 0;
});
    
    if (relevantMutations.length > 0) {
      throttledCallback(relevantMutations);
    }
  });

  // 确保使用传入的选项初始化观察器
  // 注意：这里不能直接调用 observe，因为需要在调用此函数后手动设置目标
  return observer;
}

// 导出实例
export const performanceMonitor = PerformanceMonitor.getInstance();
export const tweetCache = new CacheManager<TweetData>();