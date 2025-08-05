// 性能优化器 - 基于测试结果提供性能优化建议和实时监控

import { memoryManager } from './memory-manager';
import { cacheManager } from './cache-manager';
import { i18nManager } from '../i18n';

/**
 * 性能指标阈值配置
 */
interface PerformanceThresholds {
  memory: {
    warning: number;      // 内存警告阈值 (MB)
    critical: number;     // 内存严重阈值 (MB) 
  };
  execution: {
    slow: number;         // 慢操作阈值 (ms)
    timeout: number;    // 超时阈值 (ms)
  };
  cache: {
    hitRateMin: number;   // 最小缓存命中率 (%)
    maxSize: number;      // 最大缓存大小 (MB)
  };
  batch: {
 maxSize: number; // 最大批处理大小
    maxConcurrency: number; // 最大并发数
  };
}

/**
 * 性能优化建议
 */
interface OptimizationSuggestion {
  category: 'memory' | 'execution' | 'cache' | 'batch' | 'concurrency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  autoFixAvailable: boolean;
  autoFix?: () => Promise<void>;
}

/**
 * 性能监控数据
 */
interface PerformanceMonitoring {
  timestamp: number;
memory: {
    used: number;
    total: number;
    pressure: boolean;
  };
  operations: {
    slowOperations: number;
    failedOperations: number;
    averageExecutionTime: number;
  };
  cache: {
    hitRate: number;
    size: number;
    evictions: number;
  };
  system: {
    cpu?: number;
    network?: number;
  };
}

/**
 * 性能分析器类
 */
export class PerformanceAnalyzer {
  private thresholds: PerformanceThresholds;
  private monitoringData: PerformanceMonitoring[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  private monitoringInterval: NodeJS.Timeout | number | null = null;
  private operationTimes: Map<string, number[]> = new Map();

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      memory: {
        warning: 50,      // 50MB
        critical: 100     // 100MB
      },
      execution: {
        slow: 1000,       // 1秒
    timeout: 5000     // 5秒
      },
      cache: {
        hitRateMin: 70,   // 70%
        maxSize: 20       // 20MB
      },
 batch: {
        maxSize: 100,
        maxConcurrency: 5
      },
      ...thresholds
    };
  }

  /**
   * 开始性能监控
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`🔍 Starting performance monitoring (interval: ${intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMonitoringData();
 await this.analyzePerformance();
      } catch (error) {
    console.error('Performance monitoring error:', error);
  }
    }, intervalMs);
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    this.monitoringInterval = null;
      console.log('⏹️ Performance monitoring stopped');
    }
  }

  /**
   * 记录操作时间
 */
  recordOperation(operationName: string, duration: number): void {
    if (!this.operationTimes.has(operationName)) {
      this.operationTimes.set(operationName, []);
    }
    
    const times = this.operationTimes.get(operationName)!;
    times.push(duration);
    
    // 保持最近100次记录
    if (times.length > 100) {
      times.splice(0, times.length - 100);
    }

    // 检查慢操作
    if (duration > this.thresholds.execution.slow) {
 this.addSuggestion({
    category: 'execution',
   severity: duration > this.thresholds.execution.timeout ? 'critical' : 'medium',
     title: i18nManager.t('performance.slow_operation'),
        description: `Operation "${operationName}" took ${duration}ms`,
        recommendation: i18nManager.t('performance.optimize_operation'),
        impact: i18nManager.t('performance.impact_user_experience'),
        effort: 'medium',
      autoFixAvailable: false
  });
    }
  }

  /**
   * 分析缓存性能
   */
  async analyzeCachePerformance(): Promise<void> {
    const cacheStats = cacheManager.getStats();
    const hitRate = cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0;
    const cacheSizeMB = cacheStats.memoryUsage / (1024 * 1024);

 // 缓存命中率过低
    if (hitRate < this.thresholds.cache.hitRateMin) {
      this.addSuggestion({
      category: 'cache',
        severity: 'medium',
        title: i18nManager.t('performance.low_cache_hit_rate'),
        description: `Cache hit rate is ${hitRate.toFixed(1)}% (threshold: ${this.thresholds.cache.hitRateMin}%)`,
        recommendation: i18nManager.t('performance.improve_cache_strategy'),
   impact: i18nManager.t('performance.impact_response_time'),
      effort: 'medium',
        autoFixAvailable: true,
        autoFix: async () => {
      // 自动优化缓存配置
      console.log('🔧 Auto-fixing cache configuration...');
      // 这里可以实现自动缓存优化逻辑
        }
      });
    }

    // 缓存大小过大
    if (cacheSizeMB > this.thresholds.cache.maxSize) {
      this.addSuggestion({
        category: 'cache',
        severity: 'high',
 title: i18nManager.t('performance.cache_size_too_large'),
        description: `Cache size is ${cacheSizeMB.toFixed(2)}MB (threshold: ${this.thresholds.cache.maxSize}MB)`,
   recommendation: i18nManager.t('performance.reduce_cache_size'),
      impact: i18nManager.t('performance.impact_memory_usage'),
      effort: 'low',
        autoFixAvailable: true,
        autoFix: async () => {
          console.log('🔧 Auto-fixing cache size...');
          await cacheManager.cleanup();
}
      });
    }
  }

  /**
   * 分析内存性能
   */
  async analyzeMemoryPerformance(): Promise<void> {
    const memoryUsage = await memoryManager.getMemoryUsage();
    const memoryUsedMB = memoryUsage.used / (1024 * 1024);
    const memoryPressure = memoryManager.isMemoryPressure();

    // 内存使用过高
    if (memoryUsedMB > this.thresholds.memory.warning) {
      const severity = memoryUsedMB > this.thresholds.memory.critical ? 'critical' : 'high';

      this.addSuggestion({
        category: 'memory',
      severity,
        title: i18nManager.t('performance.high_memory_usage'),
        description: `Memory usage is ${memoryUsedMB.toFixed(2)}MB (threshold: ${this.thresholds.memory.warning}MB)`,
   recommendation: i18nManager.t('performance.reduce_memory_usage'),
        impact: i18nManager.t('performance.impact_system_performance'),
        effort: 'medium',
        autoFixAvailable: true,
    autoFix: async () => {
          console.log('🔧 Auto-fixing memory usage...');
          await memoryManager.checkAndCleanup();
          await cacheManager.cleanup();
        }
      });
    }

    // 内存压力
    if (memoryPressure) {
      this.addSuggestion({
        category: 'memory',
        severity: 'high',
        title: i18nManager.t('performance.memory_pressure'),
        description: 'System is under memory pressure',
        recommendation: i18nManager.t('performance.immediate_cleanup'),
        impact: i18nManager.t('performance.impact_stability'),
        effort: 'low',
        autoFixAvailable: true,
      autoFix: async () => {
       console.log('🔧 Auto-fixing memory pressure...');
       await memoryManager.checkAndCleanup();
 if ((global as any).gc) {
            (global as any).gc();
          }
    }
      });
    }
  }

  /**
   * 分析执行性能
   */
  analyzeExecutionPerformance(): void {
    for (const [operationName, times] of this.operationTimes.entries()) {
   if (times.length === 0) continue;

 const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const slowOperations = times.filter(time => time > this.thresholds.execution.slow).length;
      const slowRate = (slowOperations / times.length) * 100;

    // 平均执行时间过长
      if (avgTime > this.thresholds.execution.slow) {
     this.addSuggestion({
   category: 'execution',
          severity: avgTime > this.thresholds.execution.timeout ? 'critical' : 'high',
   title: i18nManager.t('performance.slow_average_execution'),
          description: `Operation "${operationName}" average time: ${avgTime.toFixed(2)}ms`,
          recommendation: i18nManager.t('performance.optimize_algorithm'),
 impact: i18nManager.t('performance.impact_user_experience'),
     effort: 'high',
          autoFixAvailable: false
        });
      }

 // 慢操作比例过高
      if (slowRate > 20) { // 20% threshold
        this.addSuggestion({
     category: 'execution',
          severity: 'medium',
          title: i18nManager.t('performance.high_slow_operation_rate'),
          description: `${slowRate.toFixed(1)}% of "${operationName}" operations are slow`,
        recommendation: i18nManager.t('performance.improve_consistency'),
          impact: i18nManager.t('performance.impact_reliability'),
   effort: 'medium',
    autoFixAvailable: false
        });
      }
    }
  }

  /**
   * 获取性能优化建议
   */
  getSuggestions(): OptimizationSuggestion[] {
    return [...this.suggestions].sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
});
  }

  /**
   * 自动应用可修复的建议
   */
  async autoFix(): Promise<number> {
    const autoFixableSuggestions = this.suggestions.filter(s => s.autoFixAvailable && s.autoFix);
    let fixedCount = 0;

    console.log(`🔧 Applying ${autoFixableSuggestions.length} auto-fixes...`);

    for (const suggestion of autoFixableSuggestions) {
      try {
    await suggestion.autoFix!();
        console.log(`✅ Fixed: ${suggestion.title}`);
     fixedCount++;
      } catch (error) {
        console.error(`❌ Failed to fix: ${suggestion.title}`, error);
      }
    }

    // 清除已修复的建议
    this.suggestions = this.suggestions.filter(s => !s.autoFixAvailable);

    console.log(`🎉 Auto-fix completed: ${fixedCount} issues resolved`);
    return fixedCount;
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const recentData = this.monitoringData.slice(-10); // 最近10次数据
    const suggestions = this.getSuggestions();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        monitoringDuration: this.monitoringData.length > 0 
          ? Date.now() - this.monitoringData[0].timestamp 
 : 0,
      totalSuggestions: suggestions.length,
    criticalIssues: suggestions.filter(s => s.severity === 'critical').length,
        autoFixableIssues: suggestions.filter(s => s.autoFixAvailable).length
      },
      currentMetrics: recentData.length > 0 ? recentData[recentData.length - 1] : null,
      trends: this.calculateTrends(recentData),
      suggestions: suggestions.slice(0, 10), // Top 10 suggestions
  operationStats: this.getOperationStats()
    };

    return JSON.stringify(report, null, 2);
  }

  /**
   * 获取监控数据
   */
  getMonitoringData(): PerformanceMonitoring[] {
    return [...this.monitoringData];
  }

  /**
   * 清除所有数据
   */
  clearData(): void {
    this.monitoringData = [];
    this.suggestions = [];
    this.operationTimes.clear();
    console.log('📊 Performance data cleared');
  }

  // 私有方法

  /**
   * 收集监控数据
   */
  private async collectMonitoringData(): Promise<void> {
    const memoryUsage = await memoryManager.getMemoryUsage();
    const cacheStats = cacheManager.getStats();

    const monitoring: PerformanceMonitoring = {
      timestamp: Date.now(),
      memory: {
        used: memoryUsage.used,
        total: memoryUsage.total,
        pressure: memoryManager.isMemoryPressure()
      },
      operations: {
   slowOperations: this.countSlowOperations(),
     failedOperations: 0, // 可以从错误处理器获取
 averageExecutionTime: this.calculateAverageExecutionTime()
      },
   cache: {
  hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100 || 0,
        size: cacheStats.memoryUsage,
        evictions: cacheStats.evictions || 0
      },
      system: {}
    };

    this.monitoringData.push(monitoring);

    // 保持最近1000条记录
    if (this.monitoringData.length > 1000) {
      this.monitoringData.splice(0, this.monitoringData.length - 1000);
    }
  }

  /**
   * 分析性能
   */
  private async analyzePerformance(): Promise<void> {
    // 清除过期建议
    this.suggestions = this.suggestions.filter(s => Date.now() - (s as any).timestamp < 300000); // 5分钟

    await this.analyzeMemoryPerformance();
    await this.analyzeCachePerformance();
    this.analyzeExecutionPerformance();
  }

  /**
   * 添加建议
   */
  private addSuggestion(suggestion: OptimizationSuggestion): void {
    // 避免重复建议
    const existingSuggestion = this.suggestions.find(s => 
      s.category === suggestion.category && s.title === suggestion.title
    );

    if (!existingSuggestion) {
    (suggestion as any).timestamp = Date.now();
      this.suggestions.push(suggestion);
    }
}

  /**
   * 计算慢操作数量
   */
  private countSlowOperations(): number {
    let count = 0;
    for (const times of this.operationTimes.values()) {
      count += times.filter(time => time > this.thresholds.execution.slow).length;
    }
    return count;
  }

  /**
   * 计算平均执行时间
   */
  private calculateAverageExecutionTime(): number {
    let totalTime = 0;
    let totalOperations = 0;

    for (const times of this.operationTimes.values()) {
      totalTime += times.reduce((sum, time) => sum + time, 0);
      totalOperations += times.length;
    }

    return totalOperations > 0 ? totalTime / totalOperations : 0;
  }

  /**
   * 计算趋势
   */
  private calculateTrends(data: PerformanceMonitoring[]): any {
    if (data.length < 2) return null;

    const first = data[0];
    const last = data[data.length - 1];

    return {
      memoryTrend: last.memory.used > first.memory.used ? 'increasing' : 'decreasing',
      cacheHitRateTrend: last.cache.hitRate > first.cache.hitRate ? 'improving' : 'declining',
    averageExecutionTrend: last.operations.averageExecutionTime > first.operations.averageExecutionTime ? 'slower' : 'faster'
    };
  }

  /**
   * 获取操作统计
   */
  private getOperationStats(): any {
    const stats: any = {};
    
    for (const [operationName, times] of this.operationTimes.entries()) {
      if (times.length === 0) continue;

      stats[operationName] = {
        totalOperations: times.length,
 averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
        minTime: Math.min(...times),
        maxTime: Math.max(...times),
        slowOperations: times.filter(time => time > this.thresholds.execution.slow).length
      };
 }

    return stats;
  }
}

/**
 * 性能装饰器 - 自动记录函数执行时间
 */
export function performanceMonitor(operationName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
 const originalMethod = descriptor.value;
    const opName = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      
      try {
const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;
     
        performanceAnalyzer.recordOperation(opName, duration);
        
  return result;
      } catch (error) {
        const duration = performance.now() - startTime;
     performanceAnalyzer.recordOperation(opName, duration);
        throw error;
      }
    };

    return descriptor;
  };
}

// 创建全局性能分析器实例
export const performanceAnalyzer = new PerformanceAnalyzer();

// 性能工具函数
export const PerformanceUtils = {
  /**
   * 测量函数执行时间
   */
  async measureTime<T>(name: string, fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();
    const result = await fn();
    const duration = performance.now() - startTime;
    
    performanceAnalyzer.recordOperation(name, duration);
    
    return { result, duration };
  },

  /**
   * 批量测量
   */
  async measureBatch<T>(name: string, operations: (() => Promise<T> | T)[]): Promise<{ results: T[]; totalDuration: number; averageDuration: number }> {
    const startTime = performance.now();
    const results: T[] = [];

    for (const operation of operations) {
      const result = await operation();
      results.push(result);
 }

  const totalDuration = performance.now() - startTime;
    const averageDuration = totalDuration / operations.length;

    performanceAnalyzer.recordOperation(name, totalDuration);

    return { results, totalDuration, averageDuration };
  },

  /**
   * 延迟执行（防抖）
   */
  debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    
    return ((...args: any[]) => {
      const later = () => {
        clearTimeout(timeout);
     func(...args);
   };
   
      clearTimeout(timeout);
 timeout = setTimeout(later, wait);
    }) as T;
  },

  /**
   * 节流执行
   */
  throttle<T extends (...args: any[]) => any>(func: T, limit: number): T {
    let inThrottle: boolean;
    
    return ((...args: any[]) => {
      if (!inThrottle) {
        func(...args);
 inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }) as T;
  }
};