// 错误冷却机制 - 防止频繁错误和用户提示优化
import { ErrorType, ErrorLevel, ExtensionError } from './error-handler';

/**
 * 冷却配置接口
 */
interface CooldownConfig {
  duration: number; // 冷却时间（毫秒）
  maxOccurrences: number; // 最大发生次数
  escalationFactor: number; // 升级因子
  resetAfter: number; // 重置时间（毫秒）
}

/**
 * 冷却项接口
 */
interface CooldownItem {
  key: string;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  cooldownUntil: number;
  config: CooldownConfig;
  escalationLevel: number;
}

/**
 * 通知限流配置接口
 */
interface NotificationThrottleConfig {
  type: ErrorType;
  level: ErrorLevel;
  minInterval: number; // 最小间隔（毫秒）
  maxPerHour: number; // 每小时最大数量
  batchDelay: number; // 批量延迟（毫秒）
}

/**
 * 错误冷却管理器类
 */
export class ErrorCooldownManager {
  private cooldowns = new Map<string, CooldownItem>();
  private notificationQueue: ExtensionError[] = [];
  private notificationThrottles = new Map<string, NotificationThrottleConfig>();
  private notificationHistory = new Map<string, number[]>();
  private cleanupTimer?: number;
  private notificationTimer?: number;

  // 默认冷却配置
  private defaultConfigs = new Map<ErrorType, CooldownConfig>([
    [ErrorType.NETWORK, {
      duration: 30000, // 30秒
  maxOccurrences: 3,
      escalationFactor: 2,
      resetAfter: 300000 // 5分钟
  }],
    [ErrorType.CLIPBOARD, {
duration: 10000, // 10秒
      maxOccurrences: 5,
      escalationFactor: 1.5,
      resetAfter: 60000 // 1分钟
  }],
    [ErrorType.PARSING, {
      duration: 15000, // 15秒
      maxOccurrences: 3,
      escalationFactor: 2,
      resetAfter: 120000 // 2分钟
    }],
    [ErrorType.DOM, {
      duration: 5000, // 5秒
   maxOccurrences: 10,
      escalationFactor: 1.2,
      resetAfter: 60000 // 1分钟
    }],
    [ErrorType.MEMORY, {
      duration: 60000, // 1分钟
  maxOccurrences: 2,
      escalationFactor: 3,
      resetAfter: 600000 // 10分钟
    }]
  ]);

  constructor() {
    this.initializeNotificationThrottles();
    this.startCleanupTimer();
    this.startNotificationProcessor();
}

  /**
   * 检查错误是否在冷却期
* @param error 错误对象
   * @returns 是否在冷却期
 */
  isInCooldown(error: ExtensionError): boolean {
    const key = this.generateCooldownKey(error);
    const item = this.cooldowns.get(key);
    
    if (!item) {
      // 首次遇到此错误，创建冷却项
      this.createCooldownItem(key, error);
  return false;
 }
    
    const now = Date.now();
    
    // 检查是否需要重置
    if (now - item.firstOccurrence > item.config.resetAfter) {
   this.resetCooldownItem(item);
      return false;
    }
 
    // 检查是否在冷却期
    if (now < item.cooldownUntil) {
      return true;
    }
    
    // 更新计数
 item.count++;
item.lastOccurrence = now;
    
    // 检查是否达到最大次数
    if (item.count >= item.config.maxOccurrences) {
      this.escalateCooldown(item);
      return true;
    }
    
    return false;
  }

  /**
   * 添加错误到通知队列
   * @param error 错误对象
   */
  queueNotification(error: ExtensionError): void {
    if (!this.shouldNotify(error)) {
      return;
    }
    
 // 检查是否需要批量处理相同类型的错误
    const batchKey = `${error.type}_${error.level}`;
    const existingIndex = this.notificationQueue.findIndex(
      e => `${e.type}_${e.level}` === batchKey
    );
    
if (existingIndex !== -1) {
      // 更新现有错误的元数据
      const existing = this.notificationQueue[existingIndex];
      existing.metadata.count = (existing.metadata.count || 1) + 1;
  existing.metadata.lastOccurrence = new Date();
    } else {
      // 添加新的错误到队列
      error.metadata.count = 1;
      error.metadata.batchKey = batchKey;
      this.notificationQueue.push(error);
    }
  }

  /**
   * 获取冷却状态信息
   * @param error 错误对象
   * @returns 冷却状态
   */
  getCooldownStatus(error: ExtensionError): {
    isActive: boolean;
    remainingTime?: number;
    count: number;
    escalationLevel: number;
    nextResetTime?: number;
  } {
    const key = this.generateCooldownKey(error);
    const item = this.cooldowns.get(key);
    
    if (!item) {
      return { isActive: false, count: 0, escalationLevel: 0 };
    }
    
    const now = Date.now();
    const isActive = now < item.cooldownUntil;
    
    return {
    isActive,
      remainingTime: isActive ? item.cooldownUntil - now : undefined,
   count: item.count,
      escalationLevel: item.escalationLevel,
    nextResetTime: item.firstOccurrence + item.config.resetAfter
    };
  }

  /**
   * 手动重置冷却
   * @param error 错误对象
   */
  resetCooldown(error: ExtensionError): void {
    const key = this.generateCooldownKey(error);
    const item = this.cooldowns.get(key);

    if (item) {
      this.resetCooldownItem(item);
  }
  }

  /**
   * 清空所有冷却
   */
clearAllCooldowns(): void {
    this.cooldowns.clear();
    this.notificationHistory.clear();
    this.notificationQueue.length = 0;
  }

  /**
   * 获取冷却统计信息
   */
  getStats(): {
    activeCooldowns: number;
    totalCooldowns: number;
    queuedNotifications: number;
    throttledNotifications: number;
  } {
    const now = Date.now();
    let activeCooldowns = 0;
    let throttledNotifications = 0;
    
    for (const item of this.cooldowns.values()) {
      if (now < item.cooldownUntil) {
      activeCooldowns++;
      }
    }
    
    for (const history of this.notificationHistory.values()) {
      const recentNotifications = history.filter(time => now - time < 3600000); // 1小时内
  if (recentNotifications.length > 0) {
        throttledNotifications++;
      }
    }
    
    return {
      activeCooldowns,
      totalCooldowns: this.cooldowns.size,
  queuedNotifications: this.notificationQueue.length,
      throttledNotifications
    };
  }

  /**
   * 销毁冷却管理器
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    if (this.notificationTimer) {
      clearInterval(this.notificationTimer);
    }
    
    this.clearAllCooldowns();
  }

  // 私有方法

  /**
   * 生成冷却键
   * @param error 错误对象
   */
  private generateCooldownKey(error: ExtensionError): string {
    // 基于错误类型、级别和消息的前50个字符生成键
    const messagePrefix = error.message.substring(0, 50);
    return `${error.type}_${error.level}_${this.hashString(messagePrefix)}`;
  }

  /**
   * 创建冷却项
   * @param key 键
   * @param error 错误对象
   */
  private createCooldownItem(key: string, error: ExtensionError): void {
    const config = this.defaultConfigs.get(error.type) || {
      duration: 15000,
      maxOccurrences: 5,
      escalationFactor: 2,
      resetAfter: 120000
 };
    
const now = Date.now();
    const item: CooldownItem = {
      key,
      count: 1,
      firstOccurrence: now,
      lastOccurrence: now,
      cooldownUntil: 0,
      config,
      escalationLevel: 0
    };
    
    this.cooldowns.set(key, item);
  }

  /**
   * 升级冷却时间
   * @param item 冷却项
   */
  private escalateCooldown(item: CooldownItem): void {
    item.escalationLevel++;
  const escalationMultiplier = Math.pow(item.config.escalationFactor, item.escalationLevel);
    const cooldownDuration = item.config.duration * escalationMultiplier;
    
 item.cooldownUntil = Date.now() + cooldownDuration;
    
    console.log(
 `Error cooldown escalated: ${item.key} (level ${item.escalationLevel}) for ${cooldownDuration}ms`
 );
  }

  /**
   * 重置冷却项
   * @param item 冷却项
   */
  private resetCooldownItem(item: CooldownItem): void {
    const now = Date.now();
    item.count = 1;
    item.firstOccurrence = now;
   item.lastOccurrence = now;
    item.cooldownUntil = 0;
    item.escalationLevel = 0;
  }

  /**
   * 初始化通知限流配置
   */
  private initializeNotificationThrottles(): void {
    const configs: NotificationThrottleConfig[] = [
      {
        type: ErrorType.NETWORK,
        level: ErrorLevel.ERROR,
        minInterval: 30000, // 30秒
        maxPerHour: 10,
    batchDelay: 5000 // 5秒
      },
      {
      type: ErrorType.CLIPBOARD,
        level: ErrorLevel.WARNING,
     minInterval: 15000, // 15秒
        maxPerHour: 20,
 batchDelay: 3000 // 3秒
    },
    {
        type: ErrorType.MEMORY,
   level: ErrorLevel.CRITICAL,
        minInterval: 60000, // 1分钟
        maxPerHour: 3,
        batchDelay: 1000 // 1秒
      }
    ];
    
    for (const config of configs) {
      const key = `${config.type}_${config.level}`;
  this.notificationThrottles.set(key, config);
   }
  }

  /**
   * 检查是否应该通知
   * @param error 错误对象
   */
  private shouldNotify(error: ExtensionError): boolean {
const key = `${error.type}_${error.level}`;
    const config = this.notificationThrottles.get(key);
    
    if (!config) {
      return true; // 没有限流配置，允许通知
    }
    
  const now = Date.now();
  let history = this.notificationHistory.get(key) || [];
    
    // 清理过期的历史记录
  history = history.filter(time => now - time < 3600000); // 保留1小时内的记录
    
    // 检查最小间隔
    if (history.length > 0) {
      const lastNotification = Math.max(...history);
      if (now - lastNotification < config.minInterval) {
        return false;
      }
    }
    
    // 检查每小时最大数量
 if (history.length >= config.maxPerHour) {
      return false;
 }
    
  // 更新历史记录
    history.push(now);
    this.notificationHistory.set(key, history);
    
    return true;
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = window.setInterval(() => {
 this.cleanup();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 启动通知处理器
   */
  private startNotificationProcessor(): void {
    this.notificationTimer = window.setInterval(() => {
      this.processNotificationQueue();
    }, 2000); // 每2秒处理一次通知队列
  }

  /**
   * 清理过期项目
   */
  private cleanup(): void {
 const now = Date.now();
    
    // 清理过期的冷却项
    for (const [key, item] of this.cooldowns.entries()) {
  if (now - item.lastOccurrence > item.config.resetAfter * 2) {
      this.cooldowns.delete(key);
      }
    }
    
    // 清理过期的通知历史
    for (const [key, history] of this.notificationHistory.entries()) {
      const filteredHistory = history.filter(time => now - time < 3600000);
      if (filteredHistory.length === 0) {
    this.notificationHistory.delete(key);
  } else {
  this.notificationHistory.set(key, filteredHistory);
      }
    }
  }

  /**
   * 处理通知队列
   */
  private processNotificationQueue(): void {
    if (this.notificationQueue.length === 0) {
      return;
    }
    
    // 按类型和级别分组通知
    const groups = new Map<string, ExtensionError[]>();
    
    for (const error of this.notificationQueue) {
      const groupKey = error.metadata.batchKey;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
 groups.get(groupKey)!.push(error);
    }
    
    // 处理每个组
    for (const [groupKey, errors] of groups.entries()) {
      this.processNotificationGroup(groupKey, errors);
    }
    
    // 清空队列
    this.notificationQueue.length = 0;
  }

  /**
   * 处理通知组
   * @param groupKey 组键
   * @param errors 错误列表
 */
  private processNotificationGroup(groupKey: string, errors: ExtensionError[]): void {
 if (errors.length === 0) return;
    
    // 如果有多个相同类型的错误，合并通知
    if (errors.length > 1) {
      const firstError = errors[0];
 const totalCount = errors.reduce((sum, e) => sum + (e.metadata.count || 1), 0);
      
  console.warn(
        `Batched notification: ${firstError.type} (${totalCount} occurrences)`,
 firstError
      );
    } else {
      const error = errors[0];
      console.warn(`Error notification: ${error.type}`, error);
    }
  }

  /**
   * 字符串哈希函数
   * @param str 字符串
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
   return Math.abs(hash).toString(36);
  }
}

// 创建单例实例
export const errorCooldownManager = new ErrorCooldownManager();