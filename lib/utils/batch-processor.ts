// 批量处理机制 - 优化大量推文的处理性能
import { TweetData } from '../types';

/**
 * 批处理选项接口
 */
interface BatchOptions {
  batchSize?: number;
  delay?: number;
  maxConcurrency?: number;
  onProgress?: (progress: BatchProgress) => void;
  onBatchComplete?: (batch: any[], batchIndex: number) => void;
  onError?: (error: Error, item: any, index: number) => void;
  retryAttempts?: number;
  retryDelay?: number;
}

/**
 * 批处理进度接口
 */
interface BatchProgress {
  processed: number;
  total: number;
  currentBatch: number;
  totalBatches: number;
  percentage: number;
  estimatedTimeRemaining?: number;
  startTime: Date;
  errors: number;
  retries: number;
}

/**
 * 批处理结果接口
 */
interface BatchResult<T> {
  results: T[];
  errors: Array<{
    error: Error;
item: any;
    index: number;
  }>;
  statistics: {
    total: number;
    successful: number;
    failed: number;
retries: number;
    totalTime: number;
    averageTime: number;
  };
}

/**
 * 批量处理器类
 */
export class BatchProcessor {
  private defaultOptions: BatchOptions = {
    batchSize: 10,
    delay: 100,
    maxConcurrency: 3,
    retryAttempts: 2,
    retryDelay: 1000
  };

  /**
   * 批量处理数据
   * @param items 要处理的项目数组
 * @param processor 处理函数
   * @param options 批处理选项
   * @returns 批处理结果
   */
  async process<T, R>(
  items: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: BatchOptions = {}
  ): Promise<BatchResult<R>> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    const startTime = new Date();
    
 const results: R[] = [];
    const errors: Array<{error: Error, item: T, index: number}> = [];
    let retries = 0;

    // 创建批次
    const batches = this.createBatches(items, mergedOptions.batchSize!);
    const totalBatches = batches.length;

    // 初始化进度
  const progress: BatchProgress = {
      processed: 0,
    total: items.length,
      currentBatch: 0,
      totalBatches,
      percentage: 0,
      startTime,
   errors: 0,
      retries: 0
    };

    // 处理每个批次
  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batch = batches[batchIndex];
    progress.currentBatch = batchIndex + 1;

      try {
   // 并发处理批次中的项目
   const batchResults = await this.processBatch(
       batch, 
          processor, 
          mergedOptions,
  batchIndex * mergedOptions.batchSize!
        );

        // 收集结果
for (const result of batchResults) {
 if (result.success) {
    results.push(result.data);
          } else {
            errors.push({
              error: result.error,
    item: result.item,
   index: result.index
        });
            progress.errors++;
  }
       
      retries += result.retries;
     progress.retries = retries;
        }

        // 更新进度
        progress.processed += batch.length;
        progress.percentage = Math.round((progress.processed / progress.total) * 100);
     progress.estimatedTimeRemaining = this.calculateETA(startTime, progress);

        // 回调通知
        mergedOptions.onProgress?.(progress);
      mergedOptions.onBatchComplete?.(batch, batchIndex);

        // 批次间延迟
        if (batchIndex < totalBatches - 1 && mergedOptions.delay! > 0) {
 await this.sleep(mergedOptions.delay!);
        }

      } catch (error) {
      console.error(`Batch ${batchIndex + 1} failed:`, error);
        
// 将整个批次标记为失败
        for (let i = 0; i < batch.length; i++) {
errors.push({
    error: error as Error,
         item: batch[i],
            index: batchIndex * mergedOptions.batchSize! + i
  });
 progress.errors++;
 }

        progress.processed += batch.length;
        progress.percentage = Math.round((progress.processed / progress.total) * 100);
        mergedOptions.onProgress?.(progress);
      }
    }

    const endTime = new Date();
    const totalTime = endTime.getTime() - startTime.getTime();

    return {
      results,
   errors,
      statistics: {
    total: items.length,
        successful: results.length,
      failed: errors.length,
        retries,
        totalTime,
        averageTime: results.length > 0 ? totalTime / results.length : 0
      }
    };
  }

  /**
   * 处理单个批次
   */
  private async processBatch<T, R>(
    batch: T[],
    processor: (item: T, index: number) => Promise<R>,
    options: BatchOptions,
    startIndex: number
  ): Promise<Array<{success: boolean, data?: R, error?: Error, item: T, index: number, retries: number}>> {
    // 使用信号量控制并发
    const semaphore = new Semaphore(options.maxConcurrency!);
    
    const promises = batch.map(async (item, batchIdx) => {
      const globalIndex = startIndex + batchIdx;
      
      return semaphore.acquire(async () => {
        return this.processItemWithRetry(item, globalIndex, processor, options);
      });
    });

    return Promise.all(promises);
  }

  /**
 * 带重试的项目处理
   */
  private async processItemWithRetry<T, R>(
    item: T,
    index: number,
    processor: (item: T, index: number) => Promise<R>,
  options: BatchOptions
  ): Promise<{success: boolean, data?: R, error?: Error, item: T, index: number, retries: number}> {
    let retries = 0;
let lastError: Error;

    while (retries <= options.retryAttempts!) {
      try {
        const result = await processor(item, index);
        return {
  success: true,
        data: result,
          item,
          index,
        retries
 };
      } catch (error) {
        lastError = error as Error;
        retries++;

   // 错误回调
 options.onError?.(lastError, item, index);

        // 如果还有重试机会，等待后重试
        if (retries <= options.retryAttempts!) {
          await this.sleep(options.retryDelay!);
     }
      }
    }

    return {
   success: false,
  error: lastError!,
    item,
      index,
    retries: retries - 1
    };
  }

  /**
   * 创建批次
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
  
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  /**
   * 计算预计剩余时间
   */
  private calculateETA(startTime: Date, progress: BatchProgress): number | undefined {
    if (progress.processed === 0) return undefined;

    const elapsed = Date.now() - startTime.getTime();
    const avgTimePerItem = elapsed / progress.processed;
    const remaining = progress.total - progress.processed;

    return Math.round(remaining * avgTimePerItem);
  }

  /**
   * 休眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 批量解析推文
   */
  async parseTweetsBatch(
    tweetElements: HTMLElement[],
    options: BatchOptions = {}
  ): Promise<BatchResult<TweetData>> {
    const { tweetParser } = await import('../parsers');

    return this.process(
      tweetElements,
      async (element, index) => {
      return await tweetParser.parseTweet(element);
      },
      {
  batchSize: 5,
        delay: 200,
      maxConcurrency: 2,
        ...options
      }
    );
  }

  /**
   * 批量格式化内容
   */
  async formatContentBatch(
    tweetDataArray: TweetData[],
    format: 'html' | 'markdown' | 'text',
    options: BatchOptions = {}
  ): Promise<BatchResult<string>> {
    const { contentFormatter } = await import('../formatters');

    return this.process(
      tweetDataArray,
      async (tweetData, index) => {
        return await contentFormatter.formatTweet(tweetData, { format });
      },
   {
      batchSize: 20,
        delay: 50,
        maxConcurrency: 5,
        ...options
      }
    );
  }

  /**
   * 批量截图
   */
  async screenshotBatch(
    tweetElements: HTMLElement[],
    options: BatchOptions = {}
  ): Promise<BatchResult<any>> {
  const { tweetScreenshotExtractor } = await import('../screenshot');

    return this.process(
      tweetElements,
      async (element, index) => {
        return await tweetScreenshotExtractor.extractFromElement(element);
      },
      {
        batchSize: 3,
        delay: 500,
      maxConcurrency: 1,
        ...options
      }
 );
  }

  /**
   * 创建进度监控器
   */
createProgressMonitor(
    onProgress?: (progress: BatchProgress) => void
  ): (progress: BatchProgress) => void {
    let lastUpdate = 0;
    const updateInterval = 100; // 最少100ms更新一次

    return (progress: BatchProgress) => {
      const now = Date.now();
      if (now - lastUpdate < updateInterval) return;

  lastUpdate = now;
      onProgress?.(progress);

      // 控制台输出进度
 const eta = progress.estimatedTimeRemaining ? 
        ` (ETA: ${Math.round(progress.estimatedTimeRemaining / 1000)}s)` : '';
    
      console.log(
   `Progress: ${progress.percentage}% (${progress.processed}/${progress.total}) ` +
  `Batch: ${progress.currentBatch}/${progress.totalBatches} ` +
      `Errors: ${progress.errors} Retries: ${progress.retries}${eta}`
      );
    };
  }
}

/**
 * 信号量类 - 控制并发数量
 */
class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        this.executeTask(task, resolve, reject);
      } else {
        this.queue.push(() => {
          this.permits--;
 this.executeTask(task, resolve, reject);
});
      }
    });
  }

  private async executeTask<T>(
    task: () => Promise<T>,
    resolve: (value: T) => void,
  reject: (error: any) => void
  ): Promise<void> {
    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.release();
    }
  }

  private release(): void {
    this.permits++;
    if (this.queue.length > 0) {
    const next = this.queue.shift();
      next?.();
    }
  }
}

// 创建单例实例
export const batchProcessor = new BatchProcessor();