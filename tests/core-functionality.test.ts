// 核心功能测试套件

import { testRunner, describe, it, Assert, MockHelper } from './test-framework';
import { i18nManager } from '../lib/i18n';
import { errorHandler, ExtensionError, ErrorType, ErrorLevel } from '../lib/utils/error-handler';
import { cacheManager } from '../lib/utils/cache-manager';
import { memoryManager } from '../lib/utils/memory-manager';
import { batchProcessor } from '../lib/utils/batch-processor';

// 国际化功能测试
const i18nTests = describe('Internationalization System', () => [
  it('should detect default locale', async () => {
    const locale = i18nManager.getCurrentLocale();
    Assert.notNull(locale);
    Assert.isTrue(['zh-CN', 'en', 'ja', 'ko', 'es', 'fr'].includes(locale));
  }),

  it('should translate basic keys', async () => {
    const copyText = i18nManager.t('copy');
    Assert.notNull(copyText);
    Assert.isTrue(copyText.length > 0);
    Assert.stringContains(copyText.toLowerCase(), 'cop');
  }),

  it('should handle missing translation keys', async () => {
    const missingKey = i18nManager.t('non.existent.key');
    Assert.equals(missingKey, 'non.existent.key');
  }),

  it('should support parameter interpolation', async () => {
    const text = i18nManager.t('history.item_thread', { count: 5 });
 Assert.stringContains(text, '5');
  }),

  it('should switch locales successfully', async () => {
    const originalLocale = i18nManager.getCurrentLocale();
    
    // 切换到英语
    const switched = i18nManager.setLocale('en');
    Assert.isTrue(switched);
    Assert.equals(i18nManager.getCurrentLocale(), 'en');
    
// 验证翻译变化
    const englishCopy = i18nManager.t('copy');
    Assert.equals(englishCopy, 'Copy');
    
    // 恢复原始语言
    i18nManager.setLocale(originalLocale);
  }),

  it('should reject invalid locales', async () => {
    const originalLocale = i18nManager.getCurrentLocale();
    const switched = i18nManager.setLocale('invalid-locale');
  
    Assert.isFalse(switched);
    Assert.equals(i18nManager.getCurrentLocale(), originalLocale);
  }),

  it('should format relative time correctly', async () => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    
    const fiveMinText = i18nManager.formatRelativeTime(fiveMinutesAgo);
 const twoHourText = i18nManager.formatRelativeTime(twoHoursAgo);
  
    Assert.stringContains(fiveMinText.toLowerCase(), '5');
    Assert.stringContains(twoHourText.toLowerCase(), '2');
  })
]);

// 错误处理系统测试
const errorHandlingTests = describe('Error Handling System', () => [
  it('should create ExtensionError with all properties', async () => {
    const error = new ExtensionError(
   'Test error',
      ErrorType.NETWORK,
      ErrorLevel.ERROR,
      {
        userMessage: 'User friendly message',
        suggestion: 'Try again',
      recoverable: true,
   metadata: { test: true }
      }
  );

    Assert.equals(error.message, 'Test error');
    Assert.equals(error.type, ErrorType.NETWORK);
    Assert.equals(error.level, ErrorLevel.ERROR);
    Assert.equals(error.userMessage, 'User friendly message');
    Assert.equals(error.suggestion, 'Try again');
    Assert.isTrue(error.recoverable);
    Assert.deepEquals(error.metadata, { test: true });
  }),

  it('should normalize standard errors', async () => {
    const networkError = new Error('fetch failed');
 networkError.name = 'NetworkError';
    
    const result = await errorHandler.handle(networkError);
    Assert.isFalse(result.success);
    Assert.notNull(result.error);
    Assert.equals(result.error!.type, ErrorType.NETWORK);
  }),

  it('should classify clipboard errors correctly', async () => {
const clipboardError = new Error('clipboard write failed');
    
    const result = await errorHandler.handle(clipboardError);
    Assert.isFalse(result.success);
    Assert.equals(result.error!.type, ErrorType.CLIPBOARD);
  }),

  it('should handle memory errors as critical', async () => {
    const memoryError = new Error('heap out of memory');
    
    const result = await errorHandler.handle(memoryError);
    Assert.isFalse(result.success);
    Assert.equals(result.error!.type, ErrorType.MEMORY);
    Assert.equals(result.error!.level, ErrorLevel.CRITICAL);
  }),

  it('should track error statistics', async () => {
    const initialStats = errorHandler.getStats();
    const initialTotal = initialStats.total;

    await errorHandler.handle(new Error('test error 1'));
    await errorHandler.handle(new Error('test error 2'));

    const updatedStats = errorHandler.getStats();
    Assert.equals(updatedStats.total, initialTotal + 2);
  }),

  it('should respect error cooldown', async () => {
    const error = new ExtensionError('Cooldown test', ErrorType.NETWORK);
    
    // 第一次处理
    const result1 = await errorHandler.handle(error);
  
    // 立即再次处理相同错误（应该被冷却）
    const result2 = await errorHandler.handle(error);
    
    // 第二次应该被跳过
    Assert.isFalse(result2.success);
  })
]);

// 缓存系统测试
const cacheTests = describe('Cache Management System', () => [
  it('should store and retrieve cached data', async () => {
    const testKey = 'test-cache-key';
    const testData = { message: 'Hello Cache', timestamp: Date.now() };

  await cacheManager.set(testKey, testData);
    const retrieved = await cacheManager.get(testKey);

    Assert.deepEquals(retrieved, testData);
  }),

  it('should respect TTL expiration', async () => {
    const testKey = 'test-ttl-key';
    const testData = { message: 'TTL Test' };

    // 设置很短的TTL（100ms）
    await cacheManager.set(testKey, testData, 100);
    
    // 立即获取应该成功
    let retrieved = await cacheManager.get(testKey);
    Assert.deepEquals(retrieved, testData);

    // 等待过期
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // 现在应该返回null
    retrieved = await cacheManager.get(testKey);
    Assert.equals(retrieved, null);
  }),

  it('should handle cache size limits', async () => {
 // 填充缓存直到接近限制
    const promises = [];
  for (let i = 0; i < 50; i++) {
      promises.push(cacheManager.set(`test-key-${i}`, { data: 'x'.repeat(1000) }));
    }
    await Promise.all(promises);

// 获取缓存统计
    const stats = cacheManager.getStats();
  Assert.isTrue(stats.size > 0);
    Assert.isTrue(stats.memoryUsage > 0);
  }),

  it('should clear cache correctly', async () => {
    await cacheManager.set('clear-test-1', { data: 'test1' });
    await cacheManager.set('clear-test-2', { data: 'test2' });

    await cacheManager.clear();
 
  const result1 = await cacheManager.get('clear-test-1');
    const result2 = await cacheManager.get('clear-test-2');
    
    Assert.equals(result1, null);
    Assert.equals(result2, null);
  }),

  it('should validate cache keys', async () => {
    await Assert.throwsAsync(
      async () => await cacheManager.set('', { data: 'invalid' }),
      'Invalid cache key'
    );

    await Assert.throwsAsync(
      async () => await cacheManager.set('a'.repeat(300), { data: 'too long key' }),
      'Cache key too long'
    );
  })
]);

// 内存管理系统测试
const memoryTests = describe('Memory Management System', () => [
  it('should monitor memory usage', async () => {
    const usage = await memoryManager.getMemoryUsage();
    
    Assert.notNull(usage);
    Assert.isTrue(typeof usage.used === 'number');
    Assert.isTrue(typeof usage.total === 'number');
    Assert.isTrue(usage.used >= 0);
    Assert.isTrue(usage.total > 0);
  }),

  it('should detect memory pressure', async () => {
    const isUnderPressure = memoryManager.isMemoryPressure();
    Assert.isTrue(typeof isUnderPressure === 'boolean');
  }),

  it('should trigger cleanup when needed', async () => {
    // 模拟内存压力
    const originalIsMemoryPressure = memoryManager.isMemoryPressure;
(memoryManager as any).isMemoryPressure = () => true;

    let cleanupTriggered = false;
    const originalTriggerCleanup = (memoryManager as any).triggerCleanup;
    (memoryManager as any).triggerCleanup = () => {
cleanupTriggered = true;
  return Promise.resolve();
    };

    await memoryManager.checkAndCleanup();
    Assert.isTrue(cleanupTriggered);

    // 恢复原始方法
    (memoryManager as any).isMemoryPressure = originalIsMemoryPressure;
    (memoryManager as any).triggerCleanup = originalTriggerCleanup;
  }),

  it('should provide memory statistics', async () => {
    const stats = memoryManager.getStats();
    
    Assert.notNull(stats);
    Assert.isTrue(typeof stats.totalCleanups === 'number');
  Assert.isTrue(typeof stats.lastCleanup === 'object');
  Assert.isTrue(stats.totalCleanups >= 0);
  })
]);

// 批量处理系统测试
const batchProcessingTests = describe('Batch Processing System', () => [
  it('should process items in batches', async () => {
    const items = Array.from({ length: 25 }, (_, i) => i);
    const processedItems: number[] = [];

 const processor = async (batch: number[]) => {
      processedItems.push(...batch);
      return batch.map(item => item * 2);
    };

    const results = await batchProcessor.process(items, processor, { batchSize: 10 });

    Assert.arrayLength(results, 25);
    Assert.arrayLength(processedItems, 25);
    Assert.deepEquals(results[0], 0); // 0 * 2
    Assert.deepEquals(results[24], 48); // 24 * 2
  }),

  it('should handle batch processing errors', async () => {
    const items = [1, 2, 3, 4, 5];
    let processCount = 0;

const faultyProcessor = async (batch: number[]) => {
      processCount++;
    if (processCount === 2) {
        throw new Error('Batch processing error');
      }
      return batch.map(item => item * 2);
    };

    try {
      await batchProcessor.process(items, faultyProcessor, { batchSize: 2 });
   Assert.isTrue(false, 'Should have thrown an error');
    } catch (error) {
      Assert.stringContains(error.message, 'Batch processing error');
    }
  }),

  it('should respect concurrency limits', async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    let activeBatches = 0;
    let maxActiveBatches = 0;

    const processor = async (batch: number[]) => {
      activeBatches++;
      maxActiveBatches = Math.max(maxActiveBatches, activeBatches);
      
      // 模拟异步处理时间
      await new Promise(resolve => setTimeout(resolve, 50));
    
    activeBatches--;
      return batch.map(item => item * 2);
    };

    await batchProcessor.process(items, processor, { 
      batchSize: 5, 
      concurrency: 2 
  });

 // 最大并发数不应超过设定值
    Assert.isTrue(maxActiveBatches <= 2);
  }),

  it('should provide progress callbacks', async () => {
    const items = Array.from({ length: 15 }, (_, i) => i);
    const progressUpdates: number[] = [];

    const processor = async (batch: number[]) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return batch.map(item => item * 2);
    };

    await batchProcessor.process(items, processor, {
      batchSize: 5,
      onProgress: (completed, total) => {
 progressUpdates.push((completed / total) * 100);
    }
    });

    Assert.isTrue(progressUpdates.length > 0);
  Assert.equals(progressUpdates[progressUpdates.length - 1], 100);
  }),

  it('should get processing statistics', async () => {
    const stats = batchProcessor.getStats();
    
    Assert.notNull(stats);
    Assert.isTrue(typeof stats.totalProcessed === 'number');
    Assert.isTrue(typeof stats.totalBatches === 'number');
    Assert.isTrue(typeof stats.averageBatchTime === 'number');
Assert.isTrue(stats.totalProcessed >= 0);
  })
]);

// DOM 操作测试
const domTests = describe('DOM Operations', () => [
  it('should create mock DOM elements', async () => {
    const mockTweet = MockHelper.createMockElement('article', {
   'data-testid': 'tweet',
  'class': 'tweet-container'
    });

    Assert.equals(mockTweet.tagName, 'ARTICLE');
    Assert.equals(mockTweet.getAttribute('data-testid'), 'tweet');
    Assert.equals(mockTweet.getAttribute('class'), 'tweet-container');
  }),

  it('should handle missing DOM elements gracefully', async () => {
    const nonExistent = document.querySelector('#non-existent-element');
    Assert.equals(nonExistent, null);
  }),

  it('should validate element attributes', async () => {
    const element = MockHelper.createMockElement('div', {
      'id': 'test-element',
      'data-value': '123'
    });

    Assert.equals(element.id, 'test-element');
    Assert.equals(element.getAttribute('data-value'), '123');
  })
]);

// 边界情况和异常处理测试
const edgeCasesTests = describe('Edge Cases and Exception Handling', () => [
  it('should handle null and undefined inputs', async () => {
    // 测试各种null/undefined输入
    Assert.throws(() => {
      new ExtensionError(null as any);
    });

    const result = await cacheManager.get('non-existent-key');
    Assert.equals(result, null);
  }),

  it('should handle extremely large data', async () => {
    const largeData = { content: 'x'.repeat(100000) };
    const key = 'large-data-test';

try {
      await cacheManager.set(key, largeData);
      const retrieved = await cacheManager.get(key);
      Assert.deepEquals(retrieved, largeData);
    } catch (error) {
// 如果内存不足，应该抛出适当的错误
      Assert.stringContains(error.message.toLowerCase(), 'memory');
    }
  }),

  it('should handle rapid successive operations', async () => {
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(cacheManager.set(`rapid-${i}`, { value: i }));
    }

    // 所有操作都应该成功完成
    await Promise.all(promises);

    // 验证数据完整性
    const retrieved = await cacheManager.get('rapid-50');
    Assert.deepEquals(retrieved, { value: 50 });
  }),

  it('should handle unicode and special characters', async () => {
    const unicodeText = '测试 🚀 émojis ñ special chars';
    const testKey = 'unicode-test';

    await cacheManager.set(testKey, { text: unicodeText });
    const retrieved = await cacheManager.get(testKey);
 
    Assert.equals(retrieved.text, unicodeText);
  }),

  it('should handle circular references', async () => {
    const circularObj: any = { name: 'test' };
    circularObj.self = circularObj;

    // 应该能够处理循环引用而不崩溃
    await Assert.throwsAsync(async () => {
      await cacheManager.set('circular-test', circularObj);
    });
  }),

  it('should handle concurrent access', async () => {
    const key = 'concurrent-test';
    
    // 同时进行读写操作
    const writePromise = cacheManager.set(key, { data: 'write-test' });
    const readPromise = cacheManager.get(key);

    const [writeResult, readResult] = await Promise.all([writePromise, readPromise]);

    // 操作应该都能完成而不出错
    Assert.isTrue(writeResult === undefined || writeResult === null); // set returns void
  })
]);

// 将所有测试套件添加到测试运行器
testRunner.addSuite(i18nTests);
testRunner.addSuite(errorHandlingTests);
testRunner.addSuite(cacheTests);
testRunner.addSuite(memoryTests);
testRunner.addSuite(batchProcessingTests);
testRunner.addSuite(domTests);
testRunner.addSuite(edgeCasesTests);

export { testRunner };