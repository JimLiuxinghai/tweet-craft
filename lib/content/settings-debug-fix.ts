// 设置调试和修复工具

import { browser } from 'wxt/browser';
import type { ExtensionSettings, FormatOptions } from '../types';
import { DEFAULT_SETTINGS } from '../types';

/**
 * 设置调试工具
 */
export class SettingsDebugFix {
  
  /**
   * 创建安全的格式选项
   */
  static createFormatOptions(currentSettings: ExtensionSettings | null): FormatOptions {
    console.group('🔧 创建格式选项');
    console.log('原始设置:', currentSettings);
    
    // 确保所有设置都有明确的值
    const safeSettings = this.getSafeSettings(currentSettings);
    console.log('安全设置:', safeSettings);
    
    const options: FormatOptions = {
      format: safeSettings.format,
      includeAuthor: safeSettings.includeAuthor,
      includeTimestamp: safeSettings.includeTimestamp,
      includeMetrics: safeSettings.includeMetrics,
  includeMedia: safeSettings.includeMedia,
      includeLink: safeSettings.includeLink
  };
    
    console.log('最终选项:', options);
    console.groupEnd();
    
    return options;
  }
  
  /**
   * 获取安全的设置对象
   */
  private static getSafeSettings(settings: ExtensionSettings | null): ExtensionSettings {
    if (!settings) {
      console.warn('⚠️ 设置为空，使用默认设置');
      return this.getDefaultSettings();
    }
    
    // 检查每个设置项是否存在并且类型正确
    const safeSettings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      format: this.validateFormat(settings.format),
      includeAuthor: this.validateBoolean(settings.includeAuthor, 'includeAuthor', true),
      includeTimestamp: this.validateBoolean(settings.includeTimestamp, 'includeTimestamp', true),
      includeMetrics: this.validateBoolean(settings.includeMetrics, 'includeMetrics', false),
      includeMedia: this.validateBoolean(settings.includeMedia, 'includeMedia', true),
      includeLink: this.validateBoolean(settings.includeLink, 'includeLink', true),
      language: settings.language || 'auto'
    };
    
    return safeSettings;
  }
  
  /**
   * 验证格式设置
 */
  private static validateFormat(format: any): 'html' | 'markdown' | 'text' {
    if (format === 'html' || format === 'markdown' || format === 'text') {
      return format;
    }
 console.warn('⚠️ 无效的格式设置:', format, '使用默认值: html');
    return 'html';
  }
  
  /**
   * 验证布尔设置
   */
  private static validateBoolean(value: any, name: string, defaultValue: boolean): boolean {
    if (typeof value === 'boolean') {
      console.log(`✅ ${name}:`, value);
      return value;
    }
    
 console.warn(`⚠️ ${name} 不是布尔值:`, typeof value, value, `使用默认值: ${defaultValue}`);
    return defaultValue;
  }
  
  /**
   * 获取默认设置
   */
  private static getDefaultSettings(): ExtensionSettings {
    return DEFAULT_SETTINGS;
  }
  
  /**
   * 调试设置加载
   */
  static async debugSettingsLoad(): Promise<ExtensionSettings> {
 console.group('🔍 调试设置加载');
    
    try {
      const result = await browser.storage.local.get('tsc_settings');
      console.log('存储原始结果:', result);
      
      const storedSettings = result.tsc_settings;
      console.log('存储的设置:', storedSettings);
      
      if (!storedSettings) {
    console.warn('⚠️ 未找到存储的设置，使用默认设置');
        const defaultSettings = this.getDefaultSettings();
 console.log('默认设置:', defaultSettings);
        console.groupEnd();
        return defaultSettings;
      }
      
      // 验证设置完整性
      const safeSettings = this.getSafeSettings(storedSettings);
      console.log('验证后的设置:', safeSettings);
      
console.groupEnd();
   return safeSettings;
  
    } catch (error) {
      console.error('❌ 加载设置时出错:', error);
      console.groupEnd();
      return this.getDefaultSettings();
    }
  }
  
  /**
   * 测试设置保存和读取
   */
  static async testSettingsRoundTrip(): Promise<void> {
    console.group('🧪 测试设置往返');
    
    const testSettings: ExtensionSettings = {
      ...DEFAULT_SETTINGS,
      format: 'html',
      includeAuthor: false, // 明确设置为false
      includeTimestamp: true,
      includeMetrics: true,
      includeMedia: false, // 明确设置为false
      includeLink: true,
      language: 'zh'
    };
    
  console.log('1. 测试设置:', testSettings);
    
    try {
        // 保存设置
    await browser.storage.local.set({ tsc_settings: testSettings });
      console.log('2. ✅ 设置已保存');
      
      // 读取设置
      const loadedSettings = await this.debugSettingsLoad();
      console.log('3. 读取的设置:', loadedSettings);
      
      // 验证关键设置
      const validations = [
        { name: 'includeAuthor', expected: false, actual: loadedSettings.includeAuthor },
        { name: 'includeMedia', expected: false, actual: loadedSettings.includeMedia },
      { name: 'includeMetrics', expected: true, actual: loadedSettings.includeMetrics }
      ];
    
      console.log('4. 验证结果:');
      validations.forEach(({ name, expected, actual }) => {
        const isValid = expected === actual;
        console.log(`  ${isValid ? '✅' : '❌'} ${name}: 期望 ${expected}, 实际 ${actual}`);
      });
      
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ 测试失败:', error);
  console.groupEnd();
    }
}
}

// 添加到全局作用域以便调试
if (typeof window !== 'undefined') {
  (window as any).SettingsDebugFix = SettingsDebugFix;
}