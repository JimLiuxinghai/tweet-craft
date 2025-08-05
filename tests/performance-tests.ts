// 性能测试用例 - 测试大量数据处理和内存使用

import { performanceTester, PerformanceTester } from './performance-test-framework';
import { cacheManager } from '../lib/utils/cache-manager';
import { memoryManager } from '../lib/utils/memory-manager';
import { batchProcessor } from '../lib/utils/batch-processor';

/**
 * 模拟推文数据生成器
 */
class MockTweetGenerator {
  static generateTweet(id: number): any {
    return {
      id: `tweet_${id}`,
      text: `This is a mock tweet #${id}. It contains some sample text with emojis 🚀🎉 and mentions @user${id % 100}. ${Math.random().toString(36).repeat(10)}`,
      author: {
        name: `User ${id % 1000}`,
        username: `user${id % 1000}`,
        verified: Math.random() > 0.9,
      followers: Math.floor(Math.random() * 100000)
      },
      timestamp: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30).toISOString(),
      metrics: {
     replies: Math.floor(Math.random() * 100),
   retweets: Math.floor(Math.random() * 500),
        likes: Math.floor(Math.random() * 1000)
      },
      media: Math.random() > 0.7 ? [{
     type: 'photo',
        url: `https://example.com/image_${id}.jpg`,
        alt: `Image for tweet ${id}`
      }] : [],
      hashtags: [`tag${id % 50}`, `category${id % 20}`],
      mentions: [`@user${(id + 1) % 100}`, `@user${(id + 2) % 100}`],
      urls: Math.random() > 0.8 ? [`https://example.com/link_${id}`] : []
    };
  }

  static generateTweetBatch(count: number, startId: number = 0): any[] {
    return Array.from({ length: count }, (_, i) => this.generateTweet(startId + i));
  }

  static generateLargeTweet(id: number, size: number = 1000): any {
    const baseTweet = this.generateTweet(id);
    baseTweet.text = 'Large tweet content: ' + 'x'.repeat(size);
  baseTweet.metadata = {
      attachments: Array.from({ length: 10 }, (_, i) => ({
    id: `attachment_${i}`,
        data: new Array(100).fill(0).map(() => Math.random())
   }))
    };
    return baseTweet;
  }
}

/**
 * 缓存系统性能测试
 */
export async function runCachePerformanceTests(): Promise<void> {
  console.log('🧪 Running Cache Performance Tests...\n');

  // 测试1: 大量小数据缓存
  await performanceTester.runTest(
    'Cache - Small Data Operations',
    async () => {
      for (let i = 0; i < 1000; i++) {
        const key = `small_data_${i}`;
        const data = { id: i, value: Math.random(), text: `Item ${i}` };
        
        await cacheManager.set(key, data);
        const retrieved = await cacheManager.get(key);
        
        if (!retrieved || retrieved.id !== i) {
        throw new Error(`Cache consistency error at item ${i}`);
   }
      }
    },
    { iterations: 5, warmupRuns: 2 }
  );

  // 测试2: 大对象缓存
  await performanceTester.runTest(
    'Cache - Large Data Operations',
    async () => {
      for (let i = 0; i < 50; i++) {
        const key = `large_data_${i}`;
        const data = MockTweetGenerator.generateLargeTweet(i, 10000);
        
        await cacheManager.set(key, data);
     const retrieved = await cacheManager.get(key);
        
        if (!retrieved || retrieved.id !== data.id) {
 throw new Error(`Large data cache error at item ${i}`);
  }
      }
    },
    { iterations: 3, memoryLimit: 150 }
  );

  // 测试3: 缓存并发操作
  await performanceTester.runConcurrencyTest(
    'Cache - Concurrent Operations',
    async () => {
      const operations = Array.from({ length: 20 }, (_, i) => async () => {
        const key = `concurrent_${i}_${Date.now()}`;
        const data = MockTweetGenerator.generateTweet(i);
        await cacheManager.set(key, data);
        const retrieved = await cacheManager.get(key);
        return retrieved;
      });

    await Promise.all(operations.map(op => op()));
    },
 10,
 { iterations: 5 }
  );

  // 测试4: 缓存过期处理
  await performanceTester.runTest(
    'Cache - TTL Expiration',
    async () => {
      const keys: string[] = [];
      
      // 设置大量有TTL的缓存项
    for (let i = 0; i < 200; i++) {
      const key = `ttl_test_${i}`;
        keys.push(key);
        await cacheManager.set(key, { id: i }, 100); // 100ms TTL
      }
      
      // 等待过期
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // 验证过期
      for (const key of keys) {
        const result = await cacheManager.get(key);
        if (result !== null) {
          throw new Error(`TTL expiration failed for key: ${key}`);
     }
      }
    },
    { iterations: 3 }
  );
}

/**
 * 批量处理性能测试
 */
export async function runBatchProcessingTests(): Promise<void> {
  console.log('🔄 Running Batch Processing Performance Tests...\n');

  // 测试1: 大量推文批处理
  await performanceTester.runBatchTest(
    'Batch Processing - Tweet Processing',
    MockTweetGenerator.generateTweetBatch(1000),
    async (batch: any[]) => {
      // 模拟推文处理：格式化、验证、转换
      const processed = batch.map(tweet => ({
        ...tweet,
        processed: true,
  formattedText: tweet.text.toLowerCase(),
        wordCount: tweet.text.split(' ').length,
        hashtagCount: tweet.hashtags.length,
        processedAt: Date.now()
      }));

      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 10));
 
      return processed;
    },
    50,
    { iterations: 3, memoryLimit: 200 }
  );

  // 测试2: 内存密集型批处理
  await performanceTester.runBatchTest(
    'Batch Processing - Memory Intensive',
    Array.from({ length: 500 }, (_, i) => i),
async (batch: number[]) => {
      const results: any[] = [];
      
      for (const id of batch) {
        // 创建大对象
const largeData = {
          id,
          matrix: Array.from({ length: 100 }, () => 
       Array.from({ length: 100 }, () => Math.random())
        ),
          text: 'x'.repeat(1000),
          metadata: {
            created: new Date(),
  processed: false,
  tags: Array.from({ length: 50 }, (_, i) => `tag_${i}_${id}`)
   }
        };

   // 执行复杂计算
   const sum = largeData.matrix.flat().reduce((a, b) => a + b, 0);
    largeData.metadata.processed = true;
        
   results.push({ id, sum, size: JSON.stringify(largeData).length });
      }
      
      return results;
    },
  25,
    { iterations: 2, memoryLimit: 300 }
  );

  // 测试3: 异步操作批处理
  await performanceTester.runBatchTest(
    'Batch Processing - Async Operations',
    Array.from({ length: 200 }, (_, i) => ({ id: i, delay: Math.random() * 50 })),
    async (batch: any[]) => {
      const promises = batch.map(async (item) => {
        // 模拟异步API调用
     await new Promise(resolve => setTimeout(resolve, item.delay));
  
  // 模拟数据处理
        const result = {
          ...item,
   processed: true,
          result: Math.random() * 1000,
          timestamp: Date.now()
        };
        
     return result;
  });

      return await Promise.all(promises);
    },
    20,
  { iterations: 3 }
  );
}

/**
 * 内存管理性能测试
 */
export async function runMemoryManagementTests(): Promise<void> {
  console.log('🧠 Running Memory Management Performance Tests...\n');

  // 测试1: 内存压力测试
  await performanceTester.runMemoryStressTest(
    'Memory Management - Stress Test',
    1000, // 数据大小
    500,  // 操作数量
    { iterations: 2, memoryLimit: 250 }
  );

  // 测试2: 内存清理效果测试
  await performanceTester.runTest(
    'Memory Management - Cleanup Efficiency',
    async () => {
   const initialMemory = await memoryManager.getMemoryUsage();
      
      // 创建大量数据
      const data: any[] = [];
      for (let i = 0; i < 1000; i++) {
    data.push(MockTweetGenerator.generateLargeTweet(i, 5000));
      }

      const peakMemory = await memoryManager.getMemoryUsage();
      
      // 触发清理
      await memoryManager.checkAndCleanup();
 
      // 清理数据引用
      data.length = 0;
      
      // 强制垃圾回收（如果可用）
      if ((global as any).gc) {
    (global as any).gc();
      }

      const finalMemory = await memoryManager.getMemoryUsage();
      
      console.log(`Memory: Initial=${(initialMemory.used/(1024*1024)).toFixed(2)}MB, Peak=${(peakMemory.used/(1024*1024)).toFixed(2)}MB, Final=${(finalMemory.used/(1024*1024)).toFixed(2)}MB`);
      
      // 验证内存使用有所降低
      if (finalMemory.used >= peakMemory.used) {
        console.warn('Memory cleanup may not be working effectively');
      }
    },
    { iterations: 3, memoryLimit: 400 }
  );

  // 测试3: 内存泄漏检测
  await performanceTester.runTest(
 'Memory Management - Leak Detection',
    async () => {
      const memorySnapshots: any[] = [];
      
      for (let cycle = 0; cycle < 5; cycle++) {
        const startMemory = await memoryManager.getMemoryUsage();
        
    // 创建临时数据
        const tempData = MockTweetGenerator.generateTweetBatch(100);
        
        // 模拟操作
    tempData.forEach(tweet => {
     tweet.processed = true;
          tweet.score = Math.random();
        });
        
        // 清理引用
 tempData.length = 0;
      
        const endMemory = await memoryManager.getMemoryUsage();
        memorySnapshots.push({
          cycle,
          start: startMemory.used,
          end: endMemory.used,
diff: endMemory.used - startMemory.used
      });
      }
      
      // 检查内存增长趋势
      const avgGrowth = memorySnapshots.reduce((sum, snap) => sum + snap.diff, 0) / memorySnapshots.length;
      
      console.log(`Average memory growth per cycle: ${(avgGrowth/(1024*1024)).toFixed(2)}MB`);
      
    if (avgGrowth > 5 * 1024 * 1024) { // 5MB threshold
        console.warn('Potential memory leak detected');
      }
    },
    { iterations: 2 }
  );
}

/**
 * 并发和吞吐量测试
 */
export async function runConcurrencyTests(): Promise<void> {
  console.log('⚡ Running Concurrency Performance Tests...\n');

  // 测试1: 高并发缓存操作
  await performanceTester.runConcurrencyTest(
    'Concurrency - Cache Operations',
    async () => {
      const operations = [];
      for (let i = 0; i < 20; i++) {
        operations.push(
cacheManager.set(`concurrent_${i}_${Date.now()}`, MockTweetGenerator.generateTweet(i))
        );
}
      await Promise.all(operations);
    },
    25, // 25个并发任务
    { iterations: 3 }
  );

  // 测试2: 并发数据处理
  await performanceTester.runConcurrencyTest(
    'Concurrency - Data Processing',
    async () => {
      const data = MockTweetGenerator.generateTweetBatch(50);
      
    // 并发处理数据
      const processPromises = data.map(async (tweet) => {
  // 模拟复杂处理
     const words = tweet.text.split(' ');
        const analysis = {
     wordCount: words.length,
          avgWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
          sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
       topics: tweet.hashtags,
          engagement: tweet.metrics.likes + tweet.metrics.retweets
      };
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10));
     
        return { ...tweet, analysis };
      });

      return await Promise.all(processPromises);
    },
    15,
    { iterations: 3 }
  );

  // 测试3: 混合负载测试
  await performanceTester.runConcurrencyTest(
    'Concurrency - Mixed Workload',
    async () => {
    const tasks = [
        // 缓存操作
        async () => {
          for (let i = 0; i < 10; i++) {
       await cacheManager.set(`mixed_${i}`, { data: i });
 await cacheManager.get(`mixed_${i}`);
        }
      },
        // 批量处理
   async () => {
          const items = Array.from({ length: 50 }, (_, i) => i);
          await batchProcessor.process(items, async (batch) => {
          return batch.map(x => x * 2);
          }, { batchSize: 10 });
        },
        // 内存操作
      async () => {
          const usage = await memoryManager.getMemoryUsage();
          if (memoryManager.isMemoryPressure()) {
       await memoryManager.checkAndCleanup();
          }
        }
      ];

      // 随机执行任务
   const randomTask = tasks[Math.floor(Math.random() * tasks.length)];
    await randomTask();
    },
    10,
    { iterations: 3 }
  );
}

/**
 * 大数据量处理测试
 */
export async function runLargeDataTests(): Promise<void> {
  console.log('📊 Running Large Data Processing Tests...\n');

  // 测试1: 大量推文处理
  await performanceTester.runTest(
    'Large Data - Tweet Processing',
    async () => {
 const tweets = MockTweetGenerator.generateTweetBatch(5000);
      
      // 分析处理
      const analysis = {
        totalTweets: tweets.length,
 totalCharacters: tweets.reduce((sum, t) => sum + t.text.length, 0),
      avgEngagement: tweets.reduce((sum, t) => sum + t.metrics.likes + t.metrics.retweets, 0) / tweets.length,
topUsers: {},
        topHashtags: {},
        mediaCount: tweets.filter(t => t.media.length > 0).length
      };

      // 统计用户
      tweets.forEach(tweet => {
     const username = tweet.author.username;
        (analysis.topUsers as any)[username] = ((analysis.topUsers as any)[username] || 0) + 1;
      });

      // 统计标签
      tweets.forEach(tweet => {
        tweet.hashtags.forEach((tag: string) => {
   (analysis.topHashtags as any)[tag] = ((analysis.topHashtags as any)[tag] || 0) + 1;
        });
      });

      return analysis;
    },
    { iterations: 2, memoryLimit: 500 }
  );

  // 测试2: 大文件数据模拟
  await performanceTester.runTest(
    'Large Data - File Processing Simulation',
    async () => {
      // 模拟处理大文件
      const fileData = Array.from({ length: 10000 }, (_, i) => ({
        line: i,
        content: `Line ${i}: ${Math.random().toString(36).repeat(20)}`,
        timestamp: Date.now() + i,
        metadata: {
          size: Math.floor(Math.random() * 1000),
          type: ['text', 'data', 'log'][i % 3],
        processed: false
     }
      }));

      // 分批处理
      const batchSize = 500;
      const results = [];
      
      for (let i = 0; i < fileData.length; i += batchSize) {
    const batch = fileData.slice(i, i + batchSize);
        
        // 处理批次
        const processed = batch.map(item => ({
       ...item,
          metadata: {
     ...item.metadata,
   processed: true,
  processedAt: Date.now(),
      checksum: item.content.length
 }
        }));

        results.push(...processed);
        
 // 模拟I/O延迟
        await new Promise(resolve => setTimeout(resolve, 5));
      }

      return {
        totalProcessed: results.length,
        avgContentLength: results.reduce((sum, r) => sum + r.content.length, 0) / results.length,
        processingTime: Date.now()
 };
    },
    { iterations: 2, memoryLimit: 300 }
  );
}

/**
 * 运行所有性能测试
 */
export async function runAllPerformanceTests(): Promise<void> {
  console.log('🚀 Starting Comprehensive Performance Testing...\n');
  
  try {
    await runCachePerformanceTests();
    await runBatchProcessingTests();
    await runMemoryManagementTests();
    await runConcurrencyTests();
    await runLargeDataTests();

    console.log('\n📊 Generating Performance Report...');
    const report = performanceTester.generateReport();
    console.log(report);

    console.log('\n✅ All performance tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    throw error;
  }
}

// 导出性能测试函数
export {
  performanceTester,
  MockTweetGenerator,
  runCachePerformanceTests,
  runBatchProcessingTests,
  runMemoryManagementTests,
  runConcurrencyTests,
  runLargeDataTests
};