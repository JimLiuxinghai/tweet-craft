// 内存管理器 - 自动清理和内存监控
import { cacheManager } from './cache-manager';

/**
 * 内存使用信息接口
 */
interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
  available: number;
}

/**
 * 内存监控选项接口
 */
interface MemoryOptions {
  warningThreshold?: number; // 警告阈值（百分比）
  criticalThreshold?: number; // 严重阈值（百分比）
  cleanupInterval?: number; // 清理间隔（毫秒）
  enableAutoCleanup?: boolean; // 是否启用自动清理
  maxObjectAge?: number; // 对象最大存活时间（毫秒）
  onWarning?: (info: MemoryInfo) => void; // 警告回调
  onCritical?: (info: MemoryInfo) => void; // 严重警告回调
}

/**
 * 内存监控统计接口
 */
interface MemoryStats {
  totalCleanups: number;
  totalObjectsCleaned: number;
  totalMemoryFreed: number;
  lastCleanupTime: Date | null;
  averageCleanupTime: number;
  peakMemoryUsage: number;
  warnings: number;
  criticalAlerts: number;
}

/**
 * 跟踪对象接口
 */
interface TrackedObject {
  id: string;
  object: WeakRef<any>;
  createdAt: number;
  lastAccessed: number;
  size: number;
  type: string;
  metadata?: any;
}

/**
 * 内存管理器类
 */
export class MemoryManager {
  private options: Required<MemoryOptions>;
  private trackedObjects = new Map<string, TrackedObject>();
  private cleanupTimer?: number;
  private monitorTimer?: number;
  private finalizationRegistry?: FinalizationRegistry<string>;
  private stats: MemoryStats = {
    totalCleanups: 0,
 totalObjectsCleaned: 0,
    totalMemoryFreed: 0,
    lastCleanupTime: null,
    averageCleanupTime: 0,
    peakMemoryUsage: 0,
    warnings: 0,
    criticalAlerts: 0
  };
  private cleanupTimes: number[] = [];

  constructor(options: MemoryOptions = {}) {
    this.options = {
      warningThreshold: options.warningThreshold || 70,
      criticalThreshold: options.criticalThreshold || 85,
      cleanupInterval: options.cleanupInterval || 30000, // 30秒
      enableAutoCleanup: options.enableAutoCleanup !== false,
      maxObjectAge: options.maxObjectAge || 5 * 60 * 1000, // 5分钟
      onWarning: options.onWarning || (() => {}),
      onCritical: options.onCritical || (() => {})
    };

 this.initializeFinalizationRegistry();
    
    if (this.options.enableAutoCleanup) {
      this.startMonitoring();
    }
  }

  /**
   * 跟踪对象
   * @param id 对象ID
   * @param object 要跟踪的对象
   * @param metadata 元数据
   */
track(id: string, object: any, metadata?: any): void {
    const size = this.estimateObjectSize(object);
    const now = Date.now();

    const trackedObj: TrackedObject = {
      id,
      object: new WeakRef(object),
    createdAt: now,
      lastAccessed: now,
      size,
      type: this.getObjectType(object),
 metadata
    };

    // 如果已存在同ID对象，先清理
    if (this.trackedObjects.has(id)) {
      this.untrack(id);
    }

    this.trackedObjects.set(id, trackedObj);
  
    // 注册到 FinalizationRegistry
    if (this.finalizationRegistry) {
      this.finalizationRegistry.register(object, id, object);
    }
  }

  /**
   * 取消跟踪对象
   * @param id 对象ID
   */
  untrack(id: string): boolean {
    const tracked = this.trackedObjects.get(id);
    if (!tracked) return false;

    this.trackedObjects.delete(id);
    this.stats.totalObjectsCleaned++;
    this.stats.totalMemoryFreed += tracked.size;

    return true;
  }

  /**
   * 更新对象访问时间
   * @param id 对象ID
   */
  touch(id: string): void {
    const tracked = this.trackedObjects.get(id);
    if (tracked) {
      tracked.lastAccessed = Date.now();
    }
  }

  /**
   * 获取对象
   * @param id 对象ID
   */
  get(id: string): any | undefined {
    const tracked = this.trackedObjects.get(id);
    if (!tracked) return undefined;

    const object = tracked.object.deref();
    if (!object) {
      // 对象已被垃圾回收
      this.untrack(id);
      return undefined;
    }

    tracked.lastAccessed = Date.now();
    return object;
  }

  /**
   * 手动触发清理
* @param force 是否强制清理所有对象
   */
  async cleanup(force: boolean = false): Promise<void> {
    const startTime = performance.now();
    const beforeCount = this.trackedObjects.size;
    const beforeMemory = this.getEstimatedMemoryUsage();

    const objectsToClean: string[] = [];
    const now = Date.now();

  for (const [id, tracked] of this.trackedObjects.entries()) {
      const object = tracked.object.deref();
      
      // 对象已被垃圾回收
      if (!object) {
        objectsToClean.push(id);
        continue;
      }

      if (force) {
        objectsToClean.push(id);
        continue;
   }

      // 检查对象年龄
      if (now - tracked.createdAt > this.options.maxObjectAge) {
        objectsToClean.push(id);
        continue;
      }

      // 检查最后访问时间
      if (now - tracked.lastAccessed > this.options.maxObjectAge / 2) {
        objectsToClean.push(id);
        continue;
      }
}

    // 执行清理
    for (const id of objectsToClean) {
      this.untrack(id);
    }

    // 清理缓存
    if (force || objectsToClean.length > 0) {
      // 触发垃圾回收的清理操作
      this.forceGarbageCollection();
      
      // 清理缓存中的过期数据
      this.cleanupCaches();
    }

    const endTime = performance.now();
    const cleanupTime = endTime - startTime;
    const afterCount = this.trackedObjects.size;
    const afterMemory = this.getEstimatedMemoryUsage();

// 更新统计
    this.stats.totalCleanups++;
this.stats.lastCleanupTime = new Date();
    this.cleanupTimes.push(cleanupTime);
    
    if (this.cleanupTimes.length > 100) {
      this.cleanupTimes = this.cleanupTimes.slice(-100);
    }
    
    this.stats.averageCleanupTime = 
      this.cleanupTimes.reduce((sum, time) => sum + time, 0) / this.cleanupTimes.length;

    console.log(`Memory cleanup completed: ${beforeCount - afterCount} objects cleaned, ${Math.round(beforeMemory - afterMemory)} bytes freed in ${Math.round(cleanupTime)}ms`);
  }

  /**
   * 获取内存使用信息
   */
  getMemoryInfo(): MemoryInfo {
    const info = this.getBrowserMemoryInfo();
    
    if (info.used > this.stats.peakMemoryUsage) {
      this.stats.peakMemoryUsage = info.used;
    }

    return info;
  }

  /**
   * 获取内存管理统计
   */
  getStats(): MemoryStats & {
    trackedObjects: number;
    estimatedMemoryUsage: number;
  } {
    return {
      ...this.stats,
      trackedObjects: this.trackedObjects.size,
      estimatedMemoryUsage: this.getEstimatedMemoryUsage()
    };
  }

  /**
   * 开始内存监控
   */
  startMonitoring(): void {
    if (this.monitorTimer) return;

    this.monitorTimer = window.setInterval(() => {
      this.monitor();
    }, 5000); // 每5秒检查一次

    if (this.cleanupTimer) return;
    
    this.cleanupTimer = window.setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  /**
   * 停止内存监控
   */
  stopMonitoring(): void {
if (this.monitorTimer) {
      clearInterval(this.monitorTimer);
      this.monitorTimer = undefined;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
 }
  }

  /**
   * 销毁内存管理器
   */
  destroy(): void {
    this.stopMonitoring();
    this.trackedObjects.clear();
    this.finalizationRegistry = undefined;
  }

  /**
   * 导出内存报告
   */
  exportReport(): string {
    const memoryInfo = this.getMemoryInfo();
    const stats = this.getStats();
    
    const trackedByType = new Map<string, number>();
    for (const tracked of this.trackedObjects.values()) {
 trackedByType.set(tracked.type, (trackedByType.get(tracked.type) || 0) + 1);
    }

    const report = {
      timestamp: new Date().toISOString(),
      memoryInfo,
      stats,
      trackedObjects: {
      total: this.trackedObjects.size,
 byType: Object.fromEntries(trackedByType)
      },
  options: this.options
    };

    return JSON.stringify(report, null, 2);
  }

  // 私有方法

  /**
   * 初始化 FinalizationRegistry
   */
  private initializeFinalizationRegistry(): void {
    if (typeof FinalizationRegistry !== 'undefined') {
      this.finalizationRegistry = new FinalizationRegistry((id: string) => {
        // 对象被垃圾回收时自动清理
        this.untrack(id);
      });
    }
  }

  /**
   * 监控内存使用情况
   */
  private monitor(): void {
    const memoryInfo = this.getMemoryInfo();

    if (memoryInfo.percentage >= this.options.criticalThreshold) {
      this.stats.criticalAlerts++;
      this.options.onCritical(memoryInfo);
      
      // 立即执行强制清理
 this.cleanup(true);
      
    } else if (memoryInfo.percentage >= this.options.warningThreshold) {
      this.stats.warnings++;
      this.options.onWarning(memoryInfo);
    
   // 执行普通清理
   this.cleanup();
    }
  }

  /**
   * 获取浏览器内存信息
   */
  private getBrowserMemoryInfo(): MemoryInfo {
    // Chrome/Edge memory API
    if ('memory' in performance && (performance as any).memory) {
   const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        available: memory.jsHeapSizeLimit - memory.usedJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }

    // 降级方案：估算
    const estimatedUsage = this.getEstimatedMemoryUsage();
 const estimatedTotal = estimatedUsage * 4; // 假设实际内存是估算的4倍
    const estimatedLimit = 2 * 1024 * 1024 * 1024; // 2GB限制

    return {
      used: estimatedUsage,
      total: estimatedTotal,
      available: estimatedLimit - estimatedUsage,
    percentage: (estimatedUsage / estimatedLimit) * 100
    };
  }

  /**
   * 估算对象大小
   * @param obj 对象
   */
  private estimateObjectSize(obj: any): number {
    try {
      const str = JSON.stringify(obj);
      return new Blob([str]).size;
    } catch {
      // 降级方案
      if (typeof obj === 'string') return obj.length * 2;
      if (typeof obj === 'number') return 8;
      if (typeof obj === 'boolean') return 4;
      if (obj === null || obj === undefined) return 0;
      
      // 对于复杂对象，使用简单估算
   return JSON.stringify(obj || {}).length * 2;
    }
  }

  /**
   * 获取对象类型
   * @param obj 对象
   */
  private getObjectType(obj: any): string {
if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    
    const type = typeof obj;
    if (type !== 'object') return type;
 
    if (Array.isArray(obj)) return 'array';
    if (obj instanceof Date) return 'date';
    if (obj instanceof RegExp) return 'regexp';
    if (obj instanceof Map) return 'map';
    if (obj instanceof Set) return 'set';
    if (obj instanceof WeakMap) return 'weakmap';
    if (obj instanceof WeakSet) return 'weakset';
    if (obj instanceof Promise) return 'promise';
    if (obj instanceof Error) return 'error';
    
    return obj.constructor?.name || 'object';
  }

  /**
   * 获取估算的内存使用量
   */
  private getEstimatedMemoryUsage(): number {
    let totalSize = 0;
    
    for (const tracked of this.trackedObjects.values()) {
      totalSize += tracked.size;
    }
  
    // 添加缓存使用的内存
    totalSize += cacheManager.size();

    return totalSize;
  }

  /**
   * 强制垃圾回收（如果可能）
   */
  private forceGarbageCollection(): void {
    // Chrome DevTools 中的垃圾回收
    if (typeof (window as any).gc === 'function') {
   (window as any).gc();
    }
    
  // 其他触发垃圾回收的技巧
    try {
      // 创建大量临时对象以触发GC
      const temp = new Array(1000).fill(null).map(() => ({}));
      temp.length = 0;
    } catch (error) {
      // 忽略错误
    }
  }

  /**
   * 清理各种缓存
   */
  private cleanupCaches(): void {
    // 清理内部缓存
    cacheManager.clear();
    
    // 清理DOM缓存（如果在浏览器环境）
    if (typeof document !== 'undefined') {
      // 移除不必要的事件监听器
 this.cleanupEventListeners();
      
      // 清理临时DOM元素
      this.cleanupTempElements();
    }
  }

  /**
   * 清理事件监听器
   */
  private cleanupEventListeners(): void {
    // 这里可以实现具体的事件监听器清理逻辑
    // 例如移除过期的事件监听器
  }

  /**
   * 清理临时DOM元素
   */
  private cleanupTempElements(): void {
    // 清理可能的临时元素
    const tempElements = document.querySelectorAll('[data-temp="true"]');
    tempElements.forEach(el => el.remove());
    
    // 清理位置在视口外的隐藏元素
    const hiddenElements = document.querySelectorAll('[style*="position: absolute"][style*="left: -9999px"]');
    hiddenElements.forEach(el => {
      const parent = el.parentNode;
      if (parent && el.getAttribute('data-keep') !== 'true') {
        parent.removeChild(el);
    }
    });
  }
}

// 创建单例实例
export const memoryManager = new MemoryManager({
  warningThreshold: 75,
  criticalThreshold: 90,
  cleanupInterval: 60000, // 1分钟
  enableAutoCleanup: true,
  maxObjectAge: 10 * 60 * 1000, // 10分钟
  onWarning: (info) => {
    console.warn(`Memory usage high: ${info.percentage.toFixed(1)}% (${Math.round(info.used / 1024 / 1024)}MB)`);
  },
  onCritical: (info) => {
    console.error(`Critical memory usage: ${info.percentage.toFixed(1)}% (${Math.round(info.used / 1024 / 1024)}MB)`);
  }
});