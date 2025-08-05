// 验证和校验相关工具函数

import { REGEX_PATTERNS, TWITTER_PATTERNS } from './constants';
import type { TweetData, ExtensionSettings } from '../types';

/**
 * 验证推文数据结构
 */
export function validateTweetData(data: any): data is TweetData {
  if (!data || typeof data !== 'object') {
    console.warn('Tweet validation failed: data is not an object');
    return false;
  }
  
  const requiredFields = ['id', 'author', 'content', 'timestamp', 'metrics', 'url'];
  const hasRequiredFields = requiredFields.every(field => field in data);
  
  if (!hasRequiredFields) {
    const missingFields = requiredFields.filter(field => !(field in data));
    console.warn('Tweet validation failed: missing required fields:', missingFields);
    return false;
  }
  
  // 验证作者信息
  if (!data.author || typeof data.author !== 'object') {
    console.warn('Tweet validation failed: invalid author data');
    return false;
  }
  if (!data.author.username || !data.author.displayName) {
    console.warn('Tweet validation failed: missing author username or displayName');
    return false;
  }
  
  // 验证指标信息
  if (!data.metrics || typeof data.metrics !== 'object') {
    console.warn('Tweet validation failed: invalid metrics data');
    return false;
  }
  const metricFields = ['likes', 'retweets', 'replies'];
  const hasValidMetrics = metricFields.every(field => 
    field in data.metrics && typeof data.metrics[field] === 'number'
  );
  
  if (!hasValidMetrics) {
    const invalidMetrics = metricFields.filter(field => 
      !(field in data.metrics) || typeof data.metrics[field] !== 'number'
    );
    console.warn('Tweet validation failed: invalid metrics:', invalidMetrics);
    return false;
  }
  
  // 验证基本字段类型
  const basicValidation = (
    typeof data.id === 'string' &&
    typeof data.content === 'string' &&
    data.timestamp instanceof Date &&
    typeof data.isThread === 'boolean' &&
 typeof data.url === 'string' &&
    Array.isArray(data.media)
  );
  
  if (!basicValidation) {
    console.warn('Tweet validation failed: basic field type validation failed:', {
      idType: typeof data.id,
      contentType: typeof data.content,
      timestampType: typeof data.timestamp,
      isTimestampDate: data.timestamp instanceof Date,
      isThreadType: typeof data.isThread,
      urlType: typeof data.url,
mediaIsArray: Array.isArray(data.media)
    });
  }
  
  return basicValidation;
}

/**
 * 验证扩展设置
 */
export function validateExtensionSettings(settings: any): settings is ExtensionSettings {
  if (!settings || typeof settings !== 'object') return false;
  
  const requiredFields = [
    'format', 'includeAuthor', 'includeTimestamp', 'includeMetrics',
    'includeMedia', 'includeLink', 'language', 'theme'
  ];
  
  const hasRequiredFields = requiredFields.every(field => field in settings);
  if (!hasRequiredFields) return false;
  
  // 验证枚举值
  const validFormats = ['html', 'markdown', 'text'];
  const validThemes = ['light', 'dark', 'auto'];
  const validLanguages = ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr'];
  
  return (
    validFormats.includes(settings.format) &&
    validThemes.includes(settings.theme) &&
    validLanguages.includes(settings.language) &&
    typeof settings.includeAuthor === 'boolean' &&
    typeof settings.includeTimestamp === 'boolean' &&
    typeof settings.includeMetrics === 'boolean' &&
    typeof settings.includeMedia === 'boolean' &&
    typeof settings.includeLink === 'boolean'
  );
}


/**
 * 验证推文 ID
 */
export function validateTweetId(tweetId: string): boolean {
  return typeof tweetId === 'string' && /^\d+$/.test(tweetId) && tweetId.length >= 10;
}

/**
 * 验证用户名
 */
export function validateUsername(username: string): boolean {
  return typeof username === 'string' && /^[a-zA-Z0-9_]{1,15}$/.test(username);
}

/**
 * 验证 URL 格式
 */
export function validateUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证推文 URL
 */
export function validateTweetUrl(url: string): boolean {
  return validateUrl(url) && TWITTER_PATTERNS.TWEET_URL.test(url);
}

/**
 * 验证邮箱格式
 */
export function validateEmail(email: string): boolean {
  return typeof email === 'string' && REGEX_PATTERNS.EMAIL.test(email);
}

/**
 * 验证语言代码
 */
export function validateLanguageCode(code: string): boolean {
  const supportedLanguages = ['zh-CN', 'en', 'ja', 'ko', 'es', 'fr'];
  return supportedLanguages.includes(code);
}

/**
 * 清理和验证文本内容
 */
export function sanitizeText(text: string): string {
  if (typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // 合并多个空白字符
    .replace(/[\r\n\t]/g, ' ') // 替换换行和制表符
    .substring(0, 10000); // 限制长度
}

/**
 * 验证和清理 HTML 内容
 */
export function sanitizeHTML(html: string): string {
  if (typeof html !== 'string') return '';
  
  // 基本的 HTML 清理，移除潜在危险的标签和属性
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'a', 'span', 'div'];
  const allowedAttributes = ['href', 'class', 'data-*'];
  
  // 简单的标签过滤（实际项目中应使用专业的 HTML 清理库）
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '') // 移除事件处理器
    .replace(/javascript:/gi, '') // 移除 javascript: 协议
    .substring(0, 50000); // 限制长度
}

/**
 * 验证数字范围
 */
export function validateNumberRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * 验证对象键值对
 */
export function validateObject(obj: any, schema: Record<string, (value: any) => boolean>): boolean {
  if (!obj || typeof obj !== 'object') return false;
  
  return Object.entries(schema).every(([key, validator]) => {
    return key in obj && validator(obj[key]);
  });
}

/**
 * 验证数组中的所有元素
 */
export function validateArray<T>(
  arr: any[], 
  validator: (item: any) => item is T
): arr is T[] {
  return Array.isArray(arr) && arr.every(validator);
}

/**
 * 验证日期格式
 */
export function validateDate(date: any): date is Date {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 验证颜色值（十六进制）
 */
export function validateHexColor(color: string): boolean {
  return typeof color === 'string' && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * 验证文件扩展名
 */
export function validateFileExtension(filename: string, allowedExts: string[]): boolean {
  if (typeof filename !== 'string') return false;
  
  const ext = filename.toLowerCase().split('.').pop();
  return ext ? allowedExts.includes(ext) : false;
}

/**
 * 验证 MIME 类型
 */
export function validateMimeType(mimeType: string, allowedTypes: string[]): boolean {
  return typeof mimeType === 'string' && allowedTypes.includes(mimeType);
}

/**
 * 深度验证嵌套对象
 */
export function deepValidate(obj: any, schema: any): boolean {
  if (typeof schema === 'function') {
    return schema(obj);
  }
  
  if (Array.isArray(schema)) {
    return Array.isArray(obj) && obj.every(item => deepValidate(item, schema[0]));
  }
  
  if (typeof schema === 'object' && schema !== null) {
  if (typeof obj !== 'object' || obj === null) return false;
    
    return Object.entries(schema).every(([key, subSchema]) => {
      return key in obj && deepValidate(obj[key], subSchema);
  });
  }
  
  return obj === schema;
}

/**
 * 验证配置项的完整性
 */
export function validateConfiguration(config: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { isValid: false, errors };
  }
  
  // 验证各个配置项
  if ('format' in config && !['html', 'markdown', 'text'].includes(config.format)) {
    errors.push('Invalid format value');
  }
  
  if ('theme' in config && !['light', 'dark', 'auto'].includes(config.theme)) {
    errors.push('Invalid theme value');
  }
  
  if ('language' in config && !validateLanguageCode(config.language)) {
    errors.push('Invalid language code');
  }
  
  
  return {
    isValid: errors.length === 0,
    errors
  };
}