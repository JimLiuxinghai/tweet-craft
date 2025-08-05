// 性能测试框架 - 专门用于测试大量数据处理和内存使用

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  duration: number;        // 执行时间（毫秒）
  memoryUsed: number;      // 使用的内存（字节）
  memoryPeak: number;      // 峰值内存（字节）
  operationsPerSecond: number;  // 每秒操作数
  throughput: number;    // 吞吐量
  cpuUsage?: number;// CPU使用率（百分比）
  gcCollections?: number;  // 垃圾回收次数
}

/**
 * 性能测试选项
 */
export interface PerformanceTestOptions {
  iterations: number;      // 迭代次数
  warmupRuns: number;     // 预热运行次数
  timeout: number;        // 超时时间（毫秒）
  memoryLimit: number;    // 内存限制（MB）
  samplingInterval: number; // 采样间隔（毫秒）
  collectGC: boolean;     // 是否收集垃圾回收信息
}

/**
 * 性能测试结果
 */
export interface PerformanceTestResult {
  name: string;
  success: boolean;
  metrics: PerformanceMetrics;
  samples: PerformanceMetrics[];
  statistics: {
  mean: PerformanceMetrics;
    median: PerformanceMetrics;
    min: PerformanceMetrics;
    max: PerformanceMetrics;
    standardDeviation: PerformanceMetrics;
  };
  error?: string;
  memoryProfile?: MemoryProfile[];
}

/**
 * 内存使用情况快照
 */
export interface MemoryProfile {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers?: number;
}

/**
 * 性能基准
 */
export interface PerformanceBenchmark {
  name: string;
  maxDuration: number;     // 最大允许时间（毫秒）
  maxMemory: number;       // 最大允许内存（MB）
  minThroughput: number;   // 最小吞吐量
  maxCpuUsage?: number;    // 最大CPU使用率
}

/**
 * 性能测试器类
 */
export class PerformanceTester {
  private results: PerformanceTestResult[] = [];
  private benchmarks: Map<string, PerformanceBenchmark> = new Map();
  
  constructor() {
    this.setupDefaultBenchmarks();
  }

  /**
   * 运行性能测试
   */
  async runTest<T>(
    name: string,
    testFunction: () => Promise<T> | T,
    options: Partial<PerformanceTestOptions> = {}
  ): Promise<PerformanceTestResult> {
    const opts = this.getDefaultOptions(options);
    const samples: PerformanceMetrics[] = [];
    const memoryProfile: MemoryProfile[] = [];
    
    let profileInterval: NodeJS.Timeout | number | undefined;
    
    try {
   console.log(`🚀 Starting performance test: ${name}`);
      
      // 预热运行
      if (opts.warmupRuns > 0) {
    console.log(`🔥 Warming up (${opts.warmupRuns} runs)...`);
        for (let i = 0; i < opts.warmupRuns; i++) {
          await this.runWithTimeout(testFunction, opts.timeout);
    // 强制垃圾回收（如果可用）
    if (opts.collectGC && (global as any).gc) {
        (global as any).gc();
 }
  }
      }

      // 开始内存监控
      profileInterval = setInterval(() => {
        memoryProfile.push(this.captureMemorySnapshot());
      }, opts.samplingInterval);

    // 执行测试迭代
      for (let i = 0; i < opts.iterations; i++) {
    const startMemory = this.captureMemorySnapshot();
   const startTime = performance.now();
        
   try {
          await this.runWithTimeout(testFunction, opts.timeout);
        } catch (error) {
          throw new Error(`Test iteration ${i + 1} failed: ${error}`);
        }
        
        const endTime = performance.now();
        const endMemory = this.captureMemorySnapshot();
        
  const duration = endTime - startTime;
        const memoryUsed = endMemory.heapUsed - startMemory.heapUsed;
        const memoryPeak = Math.max(endMemory.heapUsed, startMemory.heapUsed);
        
        const metrics: PerformanceMetrics = {
    duration,
          memoryUsed,
     memoryPeak,
          operationsPerSecond: duration > 0 ? 1000 / duration : Infinity,
   throughput: duration > 0 ? 1000 / duration : Infinity
   };
        
    samples.push(metrics);
     
      // 检查内存限制
        if (memoryPeak / (1024 * 1024) > opts.memoryLimit) {
 throw new Error(`Memory limit exceeded: ${(memoryPeak / (1024 * 1024)).toFixed(2)}MB > ${opts.memoryLimit}MB`);
 }
   }

 // 停止内存监控
      if (profileInterval) {
        clearInterval(profileInterval);
      }

      // 计算统计信息
    const statistics = this.calculateStatistics(samples);
      
      const result: PerformanceTestResult = {
     name,
        success: true,
        metrics: statistics.mean,
  samples,
        statistics,
        memoryProfile
      };

      // 验证性能基准
      this.validateBenchmark(name, result);
   
      this.results.push(result);
console.log(`✅ Performance test completed: ${name}`);
      
      return result;
      
    } catch (error) {
      if (profileInterval) {
        clearInterval(profileInterval);
      }
      
   const result: PerformanceTestResult = {
        name,
  success: false,
 metrics: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 },
        samples,
        statistics: {
          mean: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 },
          median: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 },
          min: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 },
          max: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 },
          standardDeviation: { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 }
        },
 error: error instanceof Error ? error.message : String(error),
        memoryProfile
   };
 
      this.results.push(result);
      console.error(`❌ Performance test failed: ${name} - ${result.error}`);
      
      return result;
    }
  }

  /**
   * 批量性能测试
   */
  async runBatchTest<T>(
    name: string,
    items: T[],
    batchProcessor: (batch: T[]) => Promise<void>,
    batchSize: number = 10,
    options: Partial<PerformanceTestOptions> = {}
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      name,
      async () => {
        const batches = this.createBatches(items, batchSize);
        
        for (const batch of batches) {
    await batchProcessor(batch);
  }
   },
      options
    );
  }

  /**
   * 内存压力测试
   */
  async runMemoryStressTest(
    name: string,
    dataSize: number,
    operations: number,
    options: Partial<PerformanceTestOptions> = {}
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      name,
   async () => {
      const data: any[] = [];
        
      for (let i = 0; i < operations; i++) {
          // 创建大对象
 const largeObject = {
       id: i,
            data: new Array(dataSize).fill(0).map(() => Math.random().toString(36)),
         timestamp: Date.now(),
     metadata: {
   iteration: i,
         size: dataSize,
 created: new Date().toISOString()
     }
          };
          
 data.push(largeObject);
          
          // 模拟一些操作
    if (i % 100 === 0) {
      // 排序操作
const sorted = [...data].sort((a, b) => a.id - b.id);
            // 过滤操作
            const filtered = sorted.filter(item => item.id % 2 === 0);
 // 映射操作
     const mapped = filtered.map(item => ({ ...item, processed: true }));
        
        // 清理一些数据以避免内存溢出
            if (data.length > 1000) {
          data.splice(0, 500);
      }
          }
        }
      },
      { ...options, memoryLimit: options.memoryLimit || 200 }
    );
  }

  /**
   * 并发性能测试
   */
  async runConcurrencyTest(
    name: string,
    taskFunction: () => Promise<void>,
    concurrentTasks: number,
    options: Partial<PerformanceTestOptions> = {}
  ): Promise<PerformanceTestResult> {
    return this.runTest(
      name,
      async () => {
        const tasks = Array.from({ length: concurrentTasks }, () => taskFunction());
        await Promise.all(tasks);
      },
      options
    );
  }

  /**
   * 添加性能基准
   */
  setBenchmark(name: string, benchmark: PerformanceBenchmark): void {
 this.benchmarks.set(name, benchmark);
  }

  /**
   * 获取测试结果
*/
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const report = {
      summary: {
        totalTests: this.results.length,
        passedTests: this.results.filter(r => r.success).length,
        failedTests: this.results.filter(r => !r.success).length,
  averageDuration: this.calculateAverageMetric('duration'),
        averageMemory: this.calculateAverageMetric('memoryUsed'),
        totalTime: this.results.reduce((sum, r) => sum + r.metrics.duration, 0)
 },
      results: this.results.map(result => ({
        name: result.name,
  success: result.success,
        duration: `${result.metrics.duration.toFixed(2)}ms`,
        memory: `${(result.metrics.memoryUsed / (1024 * 1024)).toFixed(2)}MB`,
        throughput: `${result.metrics.throughput.toFixed(2)} ops/sec`,
        benchmarkPassed: this.checkBenchmark(result.name, result)
      }))
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 清除结果
   */
  clearResults(): void {
    this.results = [];
  }

  // 私有方法

  /**
   * 获取默认选项
   */
  private getDefaultOptions(options: Partial<PerformanceTestOptions>): PerformanceTestOptions {
    return {
      iterations: 10,
      warmupRuns: 3,
      timeout: 30000,
      memoryLimit: 100, // 100MB
      samplingInterval: 100, // 100ms
      collectGC: false,
      ...options
    };
  }

  /**
   * 运行带超时的函数
   */
  private async runWithTimeout<T>(
    fn: () => Promise<T> | T,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn()).then(
        (result) => {
        clearTimeout(timer);
          resolve(result);
        },
      (error) => {
          clearTimeout(timer);
          reject(error);
        }
   );
    });
  }

  /**
   * 捕获内存快照
   */
  private captureMemorySnapshot(): MemoryProfile {
    const timestamp = Date.now();
    
    if (typeof process !== 'undefined' && process.memoryUsage) {
      // Node.js 环境
      const memory = process.memoryUsage();
      return {
     timestamp,
     heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
  external: memory.external,
        arrayBuffers: memory.arrayBuffers
      };
    } else if (typeof performance !== 'undefined' && (performance as any).memory) {
      // Chrome 浏览器环境
      const memory = (performance as any).memory;
   return {
     timestamp,
      heapUsed: memory.usedJSHeapSize,
        heapTotal: memory.totalJSHeapSize,
        external: 0
      };
    } else {
      // 其他环境，返回模拟数据
      return {
  timestamp,
      heapUsed: 0,
    heapTotal: 0,
        external: 0
      };
    }
  }

  /**
   * 计算统计信息
   */
  private calculateStatistics(samples: PerformanceMetrics[]): {
    mean: PerformanceMetrics;
    median: PerformanceMetrics;
    min: PerformanceMetrics;
    max: PerformanceMetrics;
    standardDeviation: PerformanceMetrics;
  } {
    if (samples.length === 0) {
      const empty = { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 };
      return { mean: empty, median: empty, min: empty, max: empty, standardDeviation: empty };
    }

    const mean = this.calculateMean(samples);
    const median = this.calculateMedian(samples);
    const min = this.calculateMin(samples);
    const max = this.calculateMax(samples);
    const standardDeviation = this.calculateStandardDeviation(samples, mean);

    return { mean, median, min, max, standardDeviation };
  }

  private calculateMean(samples: PerformanceMetrics[]): PerformanceMetrics {
    const sum = samples.reduce((acc, sample) => ({
   duration: acc.duration + sample.duration,
      memoryUsed: acc.memoryUsed + sample.memoryUsed,
      memoryPeak: acc.memoryPeak + sample.memoryPeak,
   operationsPerSecond: acc.operationsPerSecond + sample.operationsPerSecond,
  throughput: acc.throughput + sample.throughput
    }), { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 });

    return {
      duration: sum.duration / samples.length,
      memoryUsed: sum.memoryUsed / samples.length,
 memoryPeak: sum.memoryPeak / samples.length,
      operationsPerSecond: sum.operationsPerSecond / samples.length,
      throughput: sum.throughput / samples.length
    };
  }

  private calculateMedian(samples: PerformanceMetrics[]): PerformanceMetrics {
const sorted = [...samples].sort((a, b) => a.duration - b.duration);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return {
        duration: (sorted[mid - 1].duration + sorted[mid].duration) / 2,
        memoryUsed: (sorted[mid - 1].memoryUsed + sorted[mid].memoryUsed) / 2,
        memoryPeak: (sorted[mid - 1].memoryPeak + sorted[mid].memoryPeak) / 2,
        operationsPerSecond: (sorted[mid - 1].operationsPerSecond + sorted[mid].operationsPerSecond) / 2,
      throughput: (sorted[mid - 1].throughput + sorted[mid].throughput) / 2
      };
    }
    
    return sorted[mid];
  }

  private calculateMin(samples: PerformanceMetrics[]): PerformanceMetrics {
    return samples.reduce((min, sample) => ({
      duration: Math.min(min.duration, sample.duration),
      memoryUsed: Math.min(min.memoryUsed, sample.memoryUsed),
    memoryPeak: Math.min(min.memoryPeak, sample.memoryPeak),
      operationsPerSecond: Math.min(min.operationsPerSecond, sample.operationsPerSecond),
      throughput: Math.min(min.throughput, sample.throughput)
    }));
  }

  private calculateMax(samples: PerformanceMetrics[]): PerformanceMetrics {
    return samples.reduce((max, sample) => ({
      duration: Math.max(max.duration, sample.duration),
 memoryUsed: Math.max(max.memoryUsed, sample.memoryUsed),
      memoryPeak: Math.max(max.memoryPeak, sample.memoryPeak),
      operationsPerSecond: Math.max(max.operationsPerSecond, sample.operationsPerSecond),
      throughput: Math.max(max.throughput, sample.throughput)
    }));
  }

  private calculateStandardDeviation(samples: PerformanceMetrics[], mean: PerformanceMetrics): PerformanceMetrics {
    const variance = samples.reduce((acc, sample) => ({
 duration: acc.duration + Math.pow(sample.duration - mean.duration, 2),
      memoryUsed: acc.memoryUsed + Math.pow(sample.memoryUsed - mean.memoryUsed, 2),
      memoryPeak: acc.memoryPeak + Math.pow(sample.memoryPeak - mean.memoryPeak, 2),
      operationsPerSecond: acc.operationsPerSecond + Math.pow(sample.operationsPerSecond - mean.operationsPerSecond, 2),
      throughput: acc.throughput + Math.pow(sample.throughput - mean.throughput, 2)
}), { duration: 0, memoryUsed: 0, memoryPeak: 0, operationsPerSecond: 0, throughput: 0 });

    return {
      duration: Math.sqrt(variance.duration / samples.length),
      memoryUsed: Math.sqrt(variance.memoryUsed / samples.length),
      memoryPeak: Math.sqrt(variance.memoryPeak / samples.length),
      operationsPerSecond: Math.sqrt(variance.operationsPerSecond / samples.length),
      throughput: Math.sqrt(variance.throughput / samples.length)
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
   * 设置默认基准
   */
  private setupDefaultBenchmarks(): void {
    // 缓存操作基准
    this.setBenchmark('Cache Operations', {
      name: 'Cache Operations',
      maxDuration: 100,
      maxMemory: 10,
      minThroughput: 100
    });

    // 批量处理基准
    this.setBenchmark('Batch Processing', {
      name: 'Batch Processing',
      maxDuration: 1000,
  maxMemory: 50,
      minThroughput: 10
    });

    // 内存压力测试基准
    this.setBenchmark('Memory Stress Test', {
      name: 'Memory Stress Test',
      maxDuration: 5000,
 maxMemory: 100,
      minThroughput: 5
    });

  // 并发测试基准
    this.setBenchmark('Concurrency Test', {
      name: 'Concurrency Test',
      maxDuration: 2000,
      maxMemory: 30,
      minThroughput: 20
    });
  }

  /**
   * 验证基准
   */
  private validateBenchmark(name: string, result: PerformanceTestResult): void {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) return;

    const issues: string[] = [];

    if (result.metrics.duration > benchmark.maxDuration) {
      issues.push(`Duration exceeded: ${result.metrics.duration.toFixed(2)}ms > ${benchmark.maxDuration}ms`);
    }

    if (result.metrics.memoryPeak / (1024 * 1024) > benchmark.maxMemory) {
      issues.push(`Memory exceeded: ${(result.metrics.memoryPeak / (1024 * 1024)).toFixed(2)}MB > ${benchmark.maxMemory}MB`);
    }

    if (result.metrics.throughput < benchmark.minThroughput) {
      issues.push(`Throughput too low: ${result.metrics.throughput.toFixed(2)} < ${benchmark.minThroughput} ops/sec`);
    }

    if (issues.length > 0) {
      console.warn(`⚠️ Performance benchmark issues for ${name}:`);
      issues.forEach(issue => console.warn(`  • ${issue}`));
    } else {
      console.log(`✅ Performance benchmark passed for ${name}`);
    }
  }

  private checkBenchmark(name: string, result: PerformanceTestResult): boolean {
    const benchmark = this.benchmarks.get(name);
    if (!benchmark) return true;

    return result.metrics.duration <= benchmark.maxDuration &&
        result.metrics.memoryPeak / (1024 * 1024) <= benchmark.maxMemory &&
           result.metrics.throughput >= benchmark.minThroughput;
  }

  private calculateAverageMetric(metric: keyof PerformanceMetrics): number {
    if (this.results.length === 0) return 0;
    return this.results.reduce((sum, r) => sum + (r.metrics[metric] as number), 0) / this.results.length;
  }
}

// 创建全局性能测试器实例
export const performanceTester = new PerformanceTester();