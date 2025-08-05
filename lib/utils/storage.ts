// 存储管理工具函数

import type { ExtensionSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { EXTENSION_CONFIG } from './constants';

/**
 * 存储管理器类
 */
export class StorageManager {
  private static instance: StorageManager;
  
  public static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  /**
 * 获取扩展设置
   */
  async getSettings(): Promise<ExtensionSettings> {
    try {
      const result = await chrome.storage.local.get(EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS);
      return { ...DEFAULT_SETTINGS, ...result[EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS] };
    } catch (error) {
  console.error('Failed to load settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * 保存扩展设置
   */
  async saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };
      
  await chrome.storage.local.set({
        [EXTENSION_CONFIG.STORAGE_KEYS.SETTINGS]: updatedSettings
      });
      
      // 通知其他组件设置已更新
      this.notifySettingsChange(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Settings save failed');
    }
  }

  /**
   * 获取缓存数据
   */
  async getCache<T = any>(key: string): Promise<T | null> {
    try {
    const cacheKey = `${EXTENSION_CONFIG.STORAGE_KEYS.CACHE}_${key}`;
      const result = await chrome.storage.local.get(cacheKey);
      const cached = result[cacheKey];
 
    if (!cached) return null;
      
      // 检查是否过期
      if (Date.now() > cached.expireTime) {
        await this.removeCache(key);
 return null;
      }
 
      return cached.data;
    } catch (error) {
      console.error('Failed to get cache:', error);
   return null;
    }
  }

  /**
   * 设置缓存数据
*/
  async setCache<T = any>(key: string, data: T, ttl?: number): Promise<void> {
    try {
    const expireTime = Date.now() + (ttl || EXTENSION_CONFIG.CACHE.EXPIRE_TIME);
      const cacheKey = `${EXTENSION_CONFIG.STORAGE_KEYS.CACHE}_${key}`;
      
      await chrome.storage.local.set({
        [cacheKey]: {
          data,
 expireTime,
          createdAt: Date.now()
   }
      });
    } catch (error) {
      console.error('Failed to set cache:', error);
    }
  }

  /**
   * 删除缓存数据
   */
  async removeCache(key: string): Promise<void> {
    try {
      const cacheKey = `${EXTENSION_CONFIG.STORAGE_KEYS.CACHE}_${key}`;
      await chrome.storage.local.remove(cacheKey);
    } catch (error) {
      console.error('Failed to remove cache:', error);
    }
  }

  /**
   * 清理过期缓存
   */
  async cleanExpiredCache(): Promise<void> {
    try {
    const allData = await chrome.storage.local.get();
const expiredKeys: string[] = [];
      const cachePrefix = EXTENSION_CONFIG.STORAGE_KEYS.CACHE;
      
      Object.entries(allData).forEach(([key, value]) => {
        if (key.startsWith(cachePrefix) && value.expireTime && Date.now() > value.expireTime) {
      expiredKeys.push(key);
        }
  });
      
      if (expiredKeys.length > 0) {
        await chrome.storage.local.remove(expiredKeys);
        console.log(`Cleaned ${expiredKeys.length} expired cache items`);
 }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
 }
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    try {
      const usage = await chrome.storage.local.getBytesInUse();
      const quota = chrome.storage.local.QUOTA_BYTES;
      
      return { used: usage, quota };
    } catch (error) {
      console.error('Failed to get storage usage:', error);
      return { used: 0, quota: 0 };
    }
  }

  /**
   * 监听存储变化
   */
  onStorageChange(callback: (changes: Record<string, chrome.storage.StorageChange>) => void): void {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
  callback(changes);
      }
    });
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 通知设置变化
   */
  private notifySettingsChange(settings: ExtensionSettings): void {
 // 可以通过消息传递通知其他组件
    chrome.runtime.sendMessage({
    type: 'SETTINGS_UPDATED',
      settings
    }).catch(() => {
    // 忽略错误，可能没有监听器
    });
  }
}

// 导出单例实例
export const storageManager = StorageManager.getInstance();

// 便捷函数
export async function getSettings(): Promise<ExtensionSettings> {
  return storageManager.getSettings();
}

export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  return storageManager.saveSettings(settings);
}

// 初始化存储清理定时器
export function initStorageCleanup(): void {
  // 立即清理一次
  storageManager.cleanExpiredCache();
  
  // 定期清理过期缓存
  setInterval(() => {
    storageManager.cleanExpiredCache();
  }, EXTENSION_CONFIG.CACHE.CLEANUP_INTERVAL);
}