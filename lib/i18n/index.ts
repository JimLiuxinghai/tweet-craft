// 国际化系统主入口

import type { LocaleData, I18nConfig } from '../types';
import { locales } from './locales';
import { SUPPORTED_LOCALES } from '../types';

/**
 * 国际化管理器类
 */
export class I18nManager {
  private static instance: I18nManager;
  private currentLocale: string;
  private localeData: Record<string, LocaleData>;
  private fallbackLocale: string = 'en';

  private constructor() {
    this.localeData = locales;
    this.currentLocale = this.detectLocale();
    // 异步初始化真正的语言检测
    this.initializeAsync();
  }

  /**
   * 异步初始化
   */
  private async initializeAsync(): Promise<void> {
  try {
 const detectedLocale = await this.detectLocaleAsync();
      if (detectedLocale !== this.currentLocale) {
     this.currentLocale = detectedLocale;
        this.notifyLocaleChange(detectedLocale);
      }
    } catch (error) {
      console.warn('Failed to initialize locale detection:', error);
    }
  }

  public static getInstance(): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager();
  }
    return I18nManager.instance;
  }

  /**
   * 获取翻译文本
   */
  t(key: string, params?: Record<string, any>): string {
    let text = this.getTranslation(key, this.currentLocale);
    
    // 如果当前语言没有找到，使用回退语言
    if (!text && this.currentLocale !== this.fallbackLocale) {
      text = this.getTranslation(key, this.fallbackLocale);
  }
    
    // 如果还是没找到，返回 key 本身
    if (!text) {
    console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    
    // 替换参数
    if (params) {
      text = this.interpolate(text, params);
    }
    
    return text;
  }

  /**
   * 获取指定语言的翻译
   */
  private getTranslation(key: string, locale: string): string {
    const data = this.localeData[locale];
    if (!data) return '';
    
    // 首先尝试直接访问完整的key（可能包含点号）
    if (data.hasOwnProperty(key)) {
      const value = data[key];
      return typeof value === 'string' ? value : '';
    }
 
    // 如果直接访问失败，再尝试嵌套访问（支持真正的嵌套结构，如 popup.title）
    const keys = key.split('.');
    let value: any = data;
    
    for (const k of keys) {
      value = value[k];
  if (value === undefined) return '';
    }
  
    return typeof value === 'string' ? value : '';
  }

  /**
   * 参数插值
   */
  private interpolate(text: string, params: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      const value = params[key];
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * 设置当前语言
   */
  setLocale(locale: string): boolean {
 if (SUPPORTED_LOCALES.includes(locale)) {
      this.currentLocale = locale;
      this.saveLocalePreference(locale);
      this.notifyLocaleChange(locale);
      return true;
    }
    return false;
  }

  /**
   * 获取当前语言
   */
  getCurrentLocale(): string {
    return this.currentLocale;
  }

  /**
   * 获取支持的语言列表
   */
  getSupportedLocales(): string[] {
    return [...SUPPORTED_LOCALES];
  }

  /**
   * 异步检测用户语言偏好（推荐使用）
   */
  private async detectLocaleAsync(): Promise<string> {
    // 1. 检查本地存储的用户偏好（异步）
    try {
      const savedLocale = await this.getSavedLocalePreferenceAsync();
  if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        console.log(`Using saved locale preference: ${savedLocale}`);
        return savedLocale;
      }
    } catch (error) {
      console.warn('Failed to get saved locale preference:', error);
    }

    // 2. 使用 Chrome 扩展 API
    if (typeof browser !== 'undefined' && browser.i18n && browser.i18n.getUILanguage) {
      try {
    const uiLanguage = browser.i18n.getUILanguage();
        if (uiLanguage) {
     const normalized = this.normalizeLocale(uiLanguage);
          if (SUPPORTED_LOCALES.includes(normalized)) {
        console.log(`Detected browser extension language: ${uiLanguage} -> ${normalized}`);
          return normalized;
          }
   }
 } catch (error) {
        console.warn('Failed to get UI language from browser:', error);
    }
    }

    // 3. 检查浏览器语言
    if (typeof navigator !== 'undefined') {
  // 检查 navigator.language
    if (navigator.language) {
  const normalized = this.normalizeLocale(navigator.language);
        if (SUPPORTED_LOCALES.includes(normalized)) {
  console.log(`Detected navigator.language: ${navigator.language} -> ${normalized}`);
   return normalized;
        }
    }

   // 检查 navigator.languages (首选语言列表)
      if (navigator.languages && Array.isArray(navigator.languages)) {
   for (const lang of navigator.languages) {
 const normalized = this.normalizeLocale(lang);
   if (SUPPORTED_LOCALES.includes(normalized)) {
            console.log(`Detected from navigator.languages: ${lang} -> ${normalized}`);
     return normalized;
          }
     }
      }
    }

    // 4. 检查系统语言（如果可用）
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      try {
 const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
   if (systemLocale) {
       const normalized = this.normalizeLocale(systemLocale);
if (SUPPORTED_LOCALES.includes(normalized)) {
         console.log(`Detected system locale: ${systemLocale} -> ${normalized}`);
        return normalized;
          }
  }
      } catch (error) {
  console.warn('Failed to get system locale:', error);
      }
 }

    // 5. 默认使用英语
    console.log(`Using fallback locale: ${this.fallbackLocale}`);
    return this.fallbackLocale;
  }

  /**
   * 同步检测用户语言偏好（向后兼容）
   */
  private detectLocale(): string {
    // 1. 检查本地存储的用户偏好
    const savedLocale = this.getSavedLocalePreference();
    if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
  return savedLocale;
    }

    // 2. 使用 Chrome 扩展 API
    if (typeof browser !== 'undefined' && browser.i18n) {
      try {
        const uiLanguage = browser.i18n.getUILanguage();
        const normalized = this.normalizeLocale(uiLanguage);
   if (SUPPORTED_LOCALES.includes(normalized)) {
          return normalized;
    }
      } catch (error) {
        console.warn('Failed to get UI language from browser:', error);
      }
    }

    // 3. 检查浏览器语言
    if (typeof navigator !== 'undefined') {
      // 检查 navigator.language
    if (navigator.language) {
    const normalized = this.normalizeLocale(navigator.language);
        if (SUPPORTED_LOCALES.includes(normalized)) {
          return normalized;
        }
      }

      // 检查 navigator.languages
      if (navigator.languages) {
  for (const lang of navigator.languages) {
          const normalized = this.normalizeLocale(lang);
    if (SUPPORTED_LOCALES.includes(normalized)) {
       return normalized;
          }
        }
      }
    }

    // 4. 默认使用英语
    return this.fallbackLocale;
  }

  /**
   * 规范化语言代码
   */
  private normalizeLocale(locale: string): string {
    if (!locale) return '';
    
    const lowered = locale.toLowerCase().replace(/_/g, '-');
    
    // 增强的语言映射表
    const mappings: Record<string, string> = {
      // 中文变体
      'zh': 'zh-CN',
      'zh-cn': 'zh-CN',
      'zh-hans': 'zh-CN',
      'zh-hans-cn': 'zh-CN',
      'zh-chs': 'zh-CN',
      'cmn': 'zh-CN', // Mandarin
      'cmn-hans': 'zh-CN',
    
 // 英文变体
      'en': 'en',
      'en-us': 'en',
      'en-gb': 'en',
      'en-au': 'en',
      'en-ca': 'en',
'en-nz': 'en',
   'en-za': 'en',
    'en-ie': 'en',
      
      // 日文变体
      'ja': 'ja',
   'ja-jp': 'ja',
      'jpn': 'ja',
      
      // 韩文变体
      'ko': 'ko',
      'ko-kr': 'ko',
      'kor': 'ko',
      
      // 西班牙文变体
      'es': 'es',
      'es-es': 'es',
      'es-mx': 'es',
    'es-ar': 'es',
      'es-co': 'es',
      'es-cl': 'es',
      'es-pe': 'es',
   'es-ve': 'es',
    'es-419': 'es', // Latin America
      'spa': 'es',
      
    // 法文变体
      'fr': 'fr',
      'fr-fr': 'fr',
      'fr-ca': 'fr',
      'fr-be': 'fr',
      'fr-ch': 'fr',
      'fra': 'fr'
    };

    // 直接映射匹配
    if (mappings[lowered]) {
      return mappings[lowered];
    }

    // 尝试主语言代码匹配（例如 en-XX -> en）
    const primaryLang = lowered.split('-')[0];
    if (mappings[primaryLang]) {
      return mappings[primaryLang];
    }

    // 如果没有映射，返回原始值（用于调试）
    console.debug(`No mapping found for locale: ${locale}`);
    return lowered;
  }

  /**
   * 保存语言偏好到存储
*/
  private async saveLocalePreference(locale: string): Promise<void> {
    try {
    if (typeof browser !== 'undefined' && browser.storage) {
        await browser.storage.local.set({ 'tsc_locale': locale });
      } else if (typeof localStorage !== 'undefined') {
     localStorage.setItem('tsc_locale', locale);
      }
    } catch (error) {
      console.warn('Failed to save locale preference:', error);
    }
  }

  /**
   * 获取保存的语言偏好
   */
  private getSavedLocalePreference(): string | null {
    try {
      if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('tsc_locale');
   }
    } catch (error) {
      console.warn('Failed to get saved locale preference:', error);
    }
    return null;
  }

  /**
   * 异步获取保存的语言偏好
   */
  async getSavedLocalePreferenceAsync(): Promise<string | null> {
    try {
    if (typeof browser !== 'undefined' && browser.storage) {
     const result = await browser.storage.local.get('tsc_locale');
        return result.tsc_locale || null;
      }
      return this.getSavedLocalePreference();
    } catch (error) {
      console.warn('Failed to get saved locale preference async:', error);
      return null;
    }
  }

  /**
   * 通知语言变化
   */
  private notifyLocaleChange(locale: string): void {
    // 发送消息给其他组件
    if (typeof browser !== 'undefined' && browser.runtime) {
      browser.runtime.sendMessage({
 type: 'LOCALE_CHANGED',
        locale: locale,
        timestamp: Date.now()
      }).catch(() => {
        // 忽略错误，可能没有监听器
      });
    }

    // 派发自定义事件（如果在页面环境中）
  if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('localeChanged', {
        detail: { locale, timestamp: Date.now() }
   }));
    }
  }

  /**
   * 获取语言的显示名称
   */
  getLocaleDisplayName(locale: string = this.currentLocale): string {
    const displayNames: Record<string, Record<string, string>> = {
      'zh-CN': {
        'zh-CN': '简体中文',
        'en': 'English',
    'ja': '日本語',
        'ko': '한국어',
      'es': 'Español',
        'fr': 'Français'
      },
      'en': {
        'zh-CN': 'Chinese (Simplified)',
        'en': 'English',
        'ja': 'Japanese',
        'ko': 'Korean',
        'es': 'Spanish',
     'fr': 'French'
      },
      'ja': {
        'zh-CN': '中国語（簡体字）',
 'en': '英語',
        'ja': '日本語',
  'ko': '韓国語',
        'es': 'スペイン語',
        'fr': 'フランス語'
      },
      'ko': {
        'zh-CN': '중국어 (간체)',
        'en': '영어',
        'ja': '일본어',
        'ko': '한국어',
      'es': '스페인어',
  'fr': '프랑스어'
      },
   'es': {
    'zh-CN': 'Chino (Simplificado)',
    'en': 'Inglés',
        'ja': 'Japonés',
      'ko': 'Coreano',
        'es': 'Español',
        'fr': 'Francés'
      },
      'fr': {
        'zh-CN': 'Chinois (Simplifié)',
        'en': 'Anglais',
      'ja': 'Japonais',
   'ko': 'Coréen',
        'es': 'Espagnol',
        'fr': 'Français'
   }
};

    return displayNames[this.currentLocale]?.[locale] || locale;
  }

  /**
   * 检查是否支持指定语言
   */
  isLocaleSupported(locale: string): boolean {
    return SUPPORTED_LOCALES.includes(locale);
  }

  /**
   * 获取当前语言的配置信息
   */
  getCurrentConfig(): I18nConfig {
    return {
      defaultLocale: this.fallbackLocale,
      supportedLocales: SUPPORTED_LOCALES,
      fallbackLocale: this.fallbackLocale
    };
  }

  /**
   * 重新初始化（用于语言切换后重新检测）
   */
  async reinitialize(): Promise<void> {
    try {
      const detectedLocale = await this.detectLocaleAsync();
      if (detectedLocale !== this.currentLocale) {
    const oldLocale = this.currentLocale;
        this.currentLocale = detectedLocale;
        console.log(`Language changed from ${oldLocale} to ${detectedLocale}`);
        this.notifyLocaleChange(detectedLocale);
 }
} catch (error) {
     console.error('Failed to reinitialize locale detection:', error);
      // 使用同步fallback
      this.currentLocale = this.detectLocale();
    }
  }

  /**
   * 改进的语言检测链（带调试信息）
   */
  async detectWithFallbackChain(): Promise<{locale: string, source: string, confidence: number}> {
    const detectionResults: Array<{locale: string, source: string, confidence: number}> = [];

    // 1. 检查保存的偏好（最高优先级）
    try {
      const savedLocale = await this.getSavedLocalePreferenceAsync();
 if (savedLocale && SUPPORTED_LOCALES.includes(savedLocale)) {
        detectionResults.push({locale: savedLocale, source: 'saved_preference', confidence: 100});
  }
    } catch (error) {
      console.warn('Failed to get saved preference:', error);
    }

    // 2. 扩展API
    if (typeof browser !== 'undefined' && browser.i18n && browser.i18n.getUILanguage) {
 try {
  const uiLanguage = browser.i18n.getUILanguage();
    if (uiLanguage) {
          const normalized = this.normalizeLocale(uiLanguage);
      if (SUPPORTED_LOCALES.includes(normalized)) {
    detectionResults.push({locale: normalized, source: 'extension_api', confidence: 90});
          }
    }
   } catch (error) {
        console.warn('Extension API detection failed:', error);
      }
    }

    // 3. Navigator.language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const normalized = this.normalizeLocale(navigator.language);
 if (SUPPORTED_LOCALES.includes(normalized)) {
        detectionResults.push({locale: normalized, source: 'navigator_language', confidence: 80});
      }
 }

    // 4. Navigator.languages 列表
if (typeof navigator !== 'undefined' && navigator.languages && Array.isArray(navigator.languages)) {
      for (let i = 0; i < Math.min(navigator.languages.length, 5); i++) {
        const lang = navigator.languages[i];
        const normalized = this.normalizeLocale(lang);
 if (SUPPORTED_LOCALES.includes(normalized)) {
          // 越靠前的语言置信度越高
      const confidence = 75 - (i * 5);
          detectionResults.push({locale: normalized, source: `navigator_languages[${i}]`, confidence});
        }
      }
    }

  // 5. 系统区域设置
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
try {
        const systemLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (systemLocale) {
   const normalized = this.normalizeLocale(systemLocale);
     if (SUPPORTED_LOCALES.includes(normalized)) {
       detectionResults.push({locale: normalized, source: 'system_locale', confidence: 60});
   }
      }
      } catch (error) {
  console.warn('System locale detection failed:', error);
   }
    }

  // 按置信度排序并返回最佳结果
    detectionResults.sort((a, b) => b.confidence - a.confidence);

    if (detectionResults.length > 0) {
      const best = detectionResults[0];
      console.log(`Language detected: ${best.locale} (source: ${best.source}, confidence: ${best.confidence}%)`);
      console.debug('All detection results:', detectionResults);
      return best;
    }

 // 默认fallback
return {locale: this.fallbackLocale, source: 'fallback', confidence: 0};
  }

  /**
   * 获取所有支持语言的显示名称
   */
  getAllLocaleDisplayNames(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const locale of SUPPORTED_LOCALES) {
      result[locale] = this.getLocaleDisplayName(locale);
    }
    return result;
  }

  /**
   * 格式化相对时间
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return this.t('time.now');
    } else if (diffMinutes < 60) {
      return this.t('time.minutes_ago', { count: diffMinutes });
    } else if (diffHours < 24) {
      return this.t('time.hours_ago', { count: diffHours });
    } else if (diffDays < 7) {
      return this.t('time.days_ago', { count: diffDays });
    } else {
      // 使用标准日期格式
return date.toLocaleDateString(this.currentLocale);
    }
  }
}

// 导出单例实例
export const i18nManager = I18nManager.getInstance();

// 便捷函数
export function t(key: string, params?: Record<string, any>): string {
  return i18nManager.t(key, params);
}

export function setLocale(locale: string): boolean {
  return i18nManager.setLocale(locale);
}

export function getCurrentLocale(): string {
  return i18nManager.getCurrentLocale();
}

export function getSupportedLocales(): string[] {
  return i18nManager.getSupportedLocales();
}

// 初始化函数
export async function initializeI18n(): Promise<void> {
  await i18nManager.reinitialize();
  console.log(`I18n initialized with locale: ${i18nManager.getCurrentLocale()}`);
}