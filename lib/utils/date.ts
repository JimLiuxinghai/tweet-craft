// 日期处理相关工具函数

/**
 * 解析 Twitter 时间格式
 */
export function parseTwitterDate(dateString: string): Date {
  // Twitter 可能使用多种时间格式
  
  // 1. ISO 8601 格式
  if (dateString.includes('T')) {
    const isoDate = new Date(dateString);
  if (!isNaN(isoDate.getTime())) {
    return isoDate;
    }
  }
  
  // 2. 相对时间格式 (e.g., "2h", "1d", "now")
  const relativeMatch = dateString.match(/^(\d+)([smhd])$/);
  if (relativeMatch) {
    const [, value, unit] = relativeMatch;
    const now = new Date();
    const numValue = parseInt(value);
    
    switch (unit) {
      case 's': return new Date(now.getTime() - numValue * 1000);
    case 'm': return new Date(now.getTime() - numValue * 60 * 1000);
   case 'h': return new Date(now.getTime() - numValue * 60 * 60 * 1000);
   case 'd': return new Date(now.getTime() - numValue * 24 * 60 * 60 * 1000);
    }
  }
  
  // 3. "now" 格式
  if (dateString.toLowerCase() === 'now') {
    return new Date();
  }
  
  // 4. 更复杂的相对时间格式
  const complexRelativeMatch = dateString.match(/(\d+)\s*(second|minute|hour|day)s?\s*ago/i);
  if (complexRelativeMatch) {
    const [, value, unit] = complexRelativeMatch;
    const now = new Date();
  const numValue = parseInt(value);
    
    switch (unit.toLowerCase()) {
      case 'second': return new Date(now.getTime() - numValue * 1000);
      case 'minute': return new Date(now.getTime() - numValue * 60 * 1000);
      case 'hour': return new Date(now.getTime() - numValue * 60 * 60 * 1000);
    case 'day': return new Date(now.getTime() - numValue * 24 * 60 * 60 * 1000);
    }
  }
  
  // 5. 标准日期格式尝试
  const standardDate = new Date(dateString);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }
  
  // 如果都解析失败，返回当前时间
  return new Date();
}

/**
 * 格式化日期为用户友好的格式
 */
export function formatDate(date: Date, locale: string = 'zh-CN'): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // 根据语言设置选择格式
  const formats = {
    'zh-CN': {
      now: '刚刚',
      minutes: (n: number) => `${n}分钟前`,
      hours: (n: number) => `${n}小时前`,
      days: (n: number) => `${n}天前`,
 date: { year: 'numeric', month: 'long', day: 'numeric' },
      time: { hour: '2-digit', minute: '2-digit' }
    },
    'en': {
      now: 'now',
minutes: (n: number) => `${n}m`,
      hours: (n: number) => `${n}h`,
      days: (n: number) => `${n}d`,
 date: { year: 'numeric', month: 'short', day: 'numeric' },
      time: { hour: '2-digit', minute: '2-digit' }
    },
    'ja': {
      now: '今',
      minutes: (n: number) => `${n}分前`,
      hours: (n: number) => `${n}時間前`,
      days: (n: number) => `${n}日前`,
      date: { year: 'numeric', month: 'long', day: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' }
}
  };
  
  const format = formats[locale as keyof typeof formats] || formats['en'];
  
  // 相对时间格式
  if (diffMinutes < 1) {
    return format.now;
  } else if (diffMinutes < 60) {
    return format.minutes(diffMinutes);
  } else if (diffHours < 24) {
    return format.hours(diffHours);
  } else if (diffDays < 7) {
    return format.days(diffDays);
  }
  
  // 绝对时间格式
  const currentYear = now.getFullYear();
  const dateYear = date.getFullYear();
  
  if (dateYear === currentYear) {
    // 同一年，不显示年份
    return date.toLocaleDateString(locale, format.date as any).replace(/\d{4}年?/, '');
  } else {
    // 不同年，显示完整日期
    return date.toLocaleDateString(locale, format.date as any);
  }
}

/**
 * 格式化完整的时间戳（包含具体时间）
 */
export function formatFullTimestamp(date: Date, locale: string = 'zh-CN'): string {
  const dateStr = formatDate(date, locale);
  const timeStr = date.toLocaleTimeString(locale, { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  return `${dateStr} ${timeStr}`;
}

/**
 * 获取时间差的详细描述
 */
export function getTimeDifference(date: Date, locale: string = 'zh-CN'): {
  value: number;
  unit: string;
  formatted: string;
} {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const units = {
    'zh-CN': [
      { name: '毫秒', ms: 1, max: 1000 },
      { name: '秒', ms: 1000, max: 60 },
      { name: '分钟', ms: 60 * 1000, max: 60 },
      { name: '小时', ms: 60 * 60 * 1000, max: 24 },
      { name: '天', ms: 24 * 60 * 60 * 1000, max: 30 },
      { name: '月', ms: 30 * 24 * 60 * 60 * 1000, max: 12 },
      { name: '年', ms: 365 * 24 * 60 * 60 * 1000, max: Infinity }
    ],
    'en': [
    { name: 'millisecond', ms: 1, max: 1000 },
      { name: 'second', ms: 1000, max: 60 },
      { name: 'minute', ms: 60 * 1000, max: 60 },
      { name: 'hour', ms: 60 * 60 * 1000, max: 24 },
      { name: 'day', ms: 24 * 60 * 60 * 1000, max: 30 },
      { name: 'month', ms: 30 * 24 * 60 * 60 * 1000, max: 12 },
      { name: 'year', ms: 365 * 24 * 60 * 60 * 1000, max: Infinity }
    ]
  };
  
  const unitList = units[locale as keyof typeof units] || units['en'];
  
  for (let i = unitList.length - 1; i >= 0; i--) {
    const unit = unitList[i];
    const value = Math.floor(diffMs / unit.ms);
    
    if (value >= 1) {
  return {
     value,
        unit: unit.name,
 formatted: locale === 'zh-CN' ? `${value}${unit.name}前` : `${value} ${unit.name}${value > 1 ? 's' : ''} ago`
      };
 }
  }
  
  return {
    value: 0,
    unit: locale === 'zh-CN' ? '毫秒' : 'millisecond',
    formatted: locale === 'zh-CN' ? '刚刚' : 'just now'
  };
}

/**
 * 检查日期是否为今天
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
     date.getFullYear() === today.getFullYear();
}

/**
 * 检查日期是否为昨天
 */
export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.getDate() === yesterday.getDate() &&
         date.getMonth() === yesterday.getMonth() &&
 date.getFullYear() === yesterday.getFullYear();
}

/**
 * 检查日期是否为本周
 */
export function isThisWeek(date: Date): boolean {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return date >= startOfWeek && date <= endOfWeek;
}

/**
 * 获取日期的开始时间（当天00:00:00）
 */
export function getStartOfDay(date: Date): Date {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
}

/**
 * 获取日期的结束时间（当天23:59:59）
 */
export function getEndOfDay(date: Date): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

/**
 * 格式化日期为 ISO 字符串
 */
export function formatToISO(date: Date): string {
  return date.toISOString();
}

/**
 * 从 ISO 字符串解析日期
 */
export function parseFromISO(isoString: string): Date {
  return new Date(isoString);
}

/**
 * 计算两个日期之间的天数差
 */
export function getDaysDifference(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  const startOfDay1 = getStartOfDay(date1);
  const startOfDay2 = getStartOfDay(date2);
  
  return Math.round((startOfDay2.getTime() - startOfDay1.getTime()) / oneDay);
}

/**
 * 格式化持续时间（毫秒）
 */
export function formatDuration(milliseconds: number, locale: string = 'zh-CN'): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (locale === 'zh-CN') {
    if (days > 0) return `${days}天 ${hours % 24}小时`;
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟 ${seconds % 60}秒`;
 return `${seconds}秒`;
  } else {
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
  }
}

/**
 * 获取时区偏移量
 */
export function getTimezoneOffset(): number {
  return new Date().getTimezoneOffset();
}

/**
 * 转换为本地时间
 */
export function toLocalTime(date: Date): Date {
  const offset = getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000);
}

/**
 * 转换为 UTC 时间
 */
export function toUTCTime(date: Date): Date {
  const offset = getTimezoneOffset();
  return new Date(date.getTime() + offset * 60 * 1000);
}