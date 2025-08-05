// URL 处理相关工具函数

import { TWITTER_PATTERNS, TWITTER_DOMAINS } from './constants';

/**
 * 检查是否为 Twitter/X 域名
 */
export function isTwitterDomain(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return TWITTER_DOMAINS.includes(urlObj.hostname);
  } catch {
    return false;
  }
}

/**
 * 从 URL 中提取推文 ID
 */
export function extractTweetId(url: string): string | null {
  const match = url.match(TWITTER_PATTERNS.TWEET_ID);
  return match ? match[1] : null;
}

/**
 * 从 URL 中提取用户名
 */
export function extractUsername(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    // 排除特殊路径
    const specialPaths = ['home', 'explore', 'notifications', 'messages', 'settings', 'i'];
    if (pathParts.length > 0 && !specialPaths.includes(pathParts[0])) {
      return pathParts[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 构建推文 URL
 */
export function buildTweetUrl(username: string, tweetId: string, domain: string = 'x.com'): string {
  return `https://${domain}/${username}/status/${tweetId}`;
}

/**
 * 构建用户 URL
 */
export function buildUserUrl(username: string, domain: string = 'x.com'): string {
  return `https://${domain}/${username}`;
}

/**
 * 检查 URL 是否为推文链接
 */
export function isTweetUrl(url: string): boolean {
  return TWITTER_PATTERNS.TWEET_URL.test(url);
}

/**
 * 检查 URL 是否为用户链接
 */
export function isUserUrl(url: string): boolean {
  if (!isTwitterDomain(url)) return false;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    // 用户链接格式: /{username} 或 /{username}/...
    return pathParts.length >= 1 && 
           !pathParts[0].startsWith('_') && 
           !['home', 'explore', 'notifications', 'messages', 'settings', 'i'].includes(pathParts[0]);
  } catch {
    return false;
  }
}

/**
 * 规范化 Twitter URL（统一使用 x.com）
 */
export function normalizeTwitterUrl(url: string): string {
  if (!isTwitterDomain(url)) return url;
  
  try {
    const urlObj = new URL(url);
    urlObj.hostname = 'x.com';
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 从当前页面 URL 获取推文信息
 */
export function getTweetInfoFromCurrentUrl(): { username: string; tweetId: string } | null {
  const url = window.location.href;
  const tweetId = extractTweetId(url);
  const username = extractUsername(url);
  
  if (tweetId && username) {
    return { username, tweetId };
  }
  
  return null;
}

/**
 * 解析推文 URL 参数
 */
export function parseTweetUrl(url: string): {
  domain: string;
  username: string;
  tweetId: string;
  searchParams: URLSearchParams;
} | null {
  if (!isTweetUrl(url)) return null;
  
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(part => part);
    
    if (pathParts.length >= 3 && pathParts[1] === 'status') {
      return {
        domain: urlObj.hostname,
        username: pathParts[0],
        tweetId: pathParts[2],
        searchParams: urlObj.searchParams
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * 添加 URL 参数
 */
export function addUrlParams(url: string, params: Record<string, string>): string {
  try {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      urlObj.searchParams.set(key, value);
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 移除 URL 参数
 */
export function removeUrlParams(url: string, params: string[]): string {
  try {
    const urlObj = new URL(url);
    params.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 获取 URL 的基础部分（不包含查询参数和哈希）
 */
export function getBaseUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
  } catch {
    return url;
  }
}

/**
 * 检查是否为安全的 URL
 */
export function isSecureUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 短链接展开（如果需要的话）
 */
export async function expandShortUrl(url: string): Promise<string> {
  // 对于一些已知的短链接服务，可以尝试展开
  const shortLinkDomains = ['t.co', 'bit.ly', 'tinyurl.com', 'goo.gl'];
  
  try {
    const urlObj = new URL(url);
    
    if (shortLinkDomains.includes(urlObj.hostname)) {
      // 这里可以实现短链接展开逻辑
      // 为了简单起见，现在直接返回原始 URL
      return url;
    }
    
    return url;
  } catch {
    return url;
  }
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取域名
 */
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch {
    return '';
  }
}

/**
 * 获取路径
 */
export function getPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return '';
  }
}