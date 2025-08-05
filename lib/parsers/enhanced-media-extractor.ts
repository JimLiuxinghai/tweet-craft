// 增强的媒体提取器 - 解决图片媒体相关信息没有复制到剪切板的问题

import type { MediaItem } from '../types';
import { TWITTER_SELECTORS } from '../utils/constants';
import { getAttribute, query, queryAll } from '../utils/dom';

/**
 * 增强的媒体提取器类
 */
export class EnhancedMediaExtractor {
  
  /**
   * 提取媒体项目 - 主要入口函数
   */
  static extractMediaItems(tweetElement: HTMLElement): MediaItem[] {
    const mediaItems: MediaItem[] = [];
    console.log('🔍 开始从推文元素提取媒体:', tweetElement);

    // 提取图片
    this.extractImages(tweetElement, mediaItems);
    
    // 提取视频
  this.extractVideos(tweetElement, mediaItems);
    
    // 提取GIF
    this.extractGifs(tweetElement, mediaItems);

    console.log(`✅ 成功提取 ${mediaItems.length} 个媒体项目:`, mediaItems);
    return mediaItems;
  }

  /**
   * 提取图片
   */
  private static extractImages(tweetElement: HTMLElement, mediaItems: MediaItem[]): void {
    // 多种图片选择器，适应不同的Twitter DOM结构
    const imageSelectors = [
      TWITTER_SELECTORS.TWEET_IMAGES, // 标准选择器
      '[data-testid="tweetPhoto"] img', // 推文照片
      'img[src*="pbs.twimg.com"]', // Twitter媒体服务器图片
      'img[src*="media"]', // 包含media的图片URL
   '[role="img"] img', // 角色为图片的img元素
      'div[aria-label*="Image"] img', // 带有图片标签的div中的img
      '[data-testid="tweet"] img:not([src*="profile"])', // 排除头像的所有推文内图片
      'div[data-testid*="photo"] img', // 照片容器中的图片
      'img[src*="jpg"], img[src*="jpeg"], img[src*="png"], img[src*="webp"]', // 常见图片格式
    ];

    console.log('📸 开始提取图片...');

    for (const selector of imageSelectors) {
      try {
        const images = queryAll(tweetElement, selector);
   console.log(`  🔍 选择器 "${selector}" 找到 ${images.length} 张图片`);
   
        for (const img of images) {
   const src = getAttribute(img, 'src');
const alt = getAttribute(img, 'alt');
        
          // 过滤条件：有效的src，不是头像，不是emoji，不是小图标
          if (src && this.isValidImageUrl(src) && !this.isProfileImage(src)) {
            const imageItem = {
    type: 'image' as const,
              url: this.getHighQualityImageUrl(src),
         alt: alt || undefined
 };
         
            // 避免重复添加同一张图片
 const exists = mediaItems.some(item => 
              item.type === 'image' && item.url === imageItem.url
       );
       
            if (!exists) {
     mediaItems.push(imageItem);
        console.log(`  ✅ 添加图片:`, imageItem);
        } else {
      console.log(`  ⚠️ 跳过重复图片: ${imageItem.url}`);
      }
          } else {
      console.log(`  ❌ 过滤无效图片: src=${src}, isValid=${this.isValidImageUrl(src || '')}, isProfile=${this.isProfileImage(src || '')}`);
        }
     }
      } catch (error) {
  console.warn(`❌ 图片选择器 "${selector}" 出错:`, error);
}
    }
  }

  /**
   * 提取视频
   */
  private static extractVideos(tweetElement: HTMLElement, mediaItems: MediaItem[]): void {
    const videoSelectors = [
      TWITTER_SELECTORS.TWEET_VIDEOS, // 标准选择器
      '[data-testid="videoPlayer"] video',
      'video[src*="video"]',
      '[data-testid="tweet"] video:not([loop])', // 非循环视频（排除GIF）
      'div[data-testid*="video"] video',
      'video[poster]' // 有缩略图的视频
    ];

    console.log('🎥 开始提取视频...');

    for (const selector of videoSelectors) {
      try {
 const videos = queryAll(tweetElement, selector);
        console.log(`  🔍 选择器 "${selector}" 找到 ${videos.length} 个视频`);
        
        for (const video of videos) {
const src = getAttribute(video, 'src');
        const poster = getAttribute(video, 'poster');
          
          if (src && this.isValidVideoUrl(src)) {
            const videoItem = {
       type: 'video' as const,
  url: src,
    previewUrl: poster || undefined
  };
   
            const exists = mediaItems.some(item => 
    item.type === 'video' && item.url === videoItem.url
          );
         
  if (!exists) {
       mediaItems.push(videoItem);
      console.log(`  ✅ 添加视频:`, videoItem);
       } else {
  console.log(`  ⚠️ 跳过重复视频: ${videoItem.url}`);
       }
          } else {
            console.log(`  ❌ 过滤无效视频: src=${src}, isValid=${this.isValidVideoUrl(src || '')}`);
          }
        }
      } catch (error) {
        console.warn(`❌ 视频选择器 "${selector}" 出错:`, error);
      }
    }
  }

  /**
   * 提取GIF
   */
  private static extractGifs(tweetElement: HTMLElement, mediaItems: MediaItem[]): void {
    const gifSelectors = [
   TWITTER_SELECTORS.TWEET_GIFS,
      '[data-testid="gifPlayer"]',
      'div[aria-label*="GIF"] video',
      '[data-testid="tweet"] video[loop]', // 循环播放的视频通常是GIF
   'video[autoplay][loop][muted]' // GIF的典型属性组合
    ];

    console.log('🎞️ 开始提取GIF...');

    for (const selector of gifSelectors) {
      try {
        const gifs = queryAll(tweetElement, selector);
        console.log(`  🔍 选择器 "${selector}" 找到 ${gifs.length} 个GIF`);
        
        for (const gif of gifs) {
   let videoElement: Element | null = gif;
 
          // 如果gif是容器，查找内部的video元素
          if (gif.tagName !== 'VIDEO') {
      const found = query(gif, 'video');
   videoElement = found;
     }
          
          if (videoElement) {
  const src = getAttribute(videoElement, 'src');
            const poster = getAttribute(videoElement, 'poster');
          
            if (src && this.isValidVideoUrl(src)) {
   const gifItem = {
          type: 'gif' as const,
    url: src,
         previewUrl: poster || undefined
    };
       
        const exists = mediaItems.some(item => 
        item.type === 'gif' && item.url === gifItem.url
              );
 
      if (!exists) {
    mediaItems.push(gifItem);
              console.log(`  ✅ 添加GIF:`, gifItem);
              } else {
   console.log(`  ⚠️ 跳过重复GIF: ${gifItem.url}`);
}
         } else {
              console.log(`  ❌ 过滤无效GIF: src=${src}, isValid=${this.isValidVideoUrl(src || '')}`);
    }
    }
        }
      } catch (error) {
   console.warn(`❌ GIF选择器 "${selector}" 出错:`, error);
      }
    }
  }

  /**
   * 检查是否为有效的图片URL
   */
  private static isValidImageUrl(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    const imagePatterns = [
      'pbs.twimg.com',
   'abs.twimg.com',
    'ton.twitter.com',
      '/media/',
      'format=jpg',
      'format=jpeg',
      'format=png',
      'format=webp',
      '.jpg',
   '.jpeg',
 '.png',
      '.webp'
    ];
    
    return imagePatterns.some(pattern => url.includes(pattern));
  }

  /**
   * 检查是否为有效的视频URL
   */
  private static isValidVideoUrl(url: string): boolean {
    if (!url || url.length < 10) return false;
    
    const videoPatterns = [
      'video.twimg.com',
      'pbs.twimg.com',
      'ton.twitter.com',
      '/video/',
      '.mp4',
      '.webm',
      '.mov',
      'video'
  ];
    
    return videoPatterns.some(pattern => url.includes(pattern));
  }

  /**
   * 检查是否为头像图片
   */
  private static isProfileImage(url: string): boolean {
    const profilePatterns = [
  'profile_images',
      'profile_image',
      'profile_banners',
      '/profile/',
      'default_profile',
      'profile_normal',
      'profile_bigger'
    ];
    
    return profilePatterns.some(pattern => url.includes(pattern));
  }

  /**
   * 获取高质量图片URL
   */
  private static getHighQualityImageUrl(url: string): string {
    // 如果是Twitter图片，尝试获取原始质量版本
    if (url.includes('pbs.twimg.com') || url.includes('abs.twimg.com')) {
      // 移除尺寸限制参数，获取原始大小
      let highQualityUrl = url.replace(/&name=[^&]*|&format=[^&]*|\?name=[^&]*|\?format=[^&]*/g, '');
      
      // 添加高质量参数
      if (highQualityUrl.includes('?')) {
        highQualityUrl += '&format=jpg&name=orig';
    } else {
        highQualityUrl += '?format=jpg&name=orig';
 }
      
      console.log(`📈 转换为高质量图片URL: ${url} -> ${highQualityUrl}`);
   return highQualityUrl;
    }
    
    return url;
  }

  /**
   * 调试方法：打印推文元素的所有图片信息
   */
static debugTweetImages(tweetElement: HTMLElement): void {
    console.log('🔍 调试：推文元素中的所有图片信息');
    
    const allImages = queryAll(tweetElement, 'img');
    console.log(`总共找到 ${allImages.length} 个img元素:`);
    
    allImages.forEach((img, index) => {
      const src = getAttribute(img, 'src');
   const alt = getAttribute(img, 'alt');
      const className = getAttribute(img, 'class');
 const testId = getAttribute(img, 'data-testid');
      
      console.log(`  图片 ${index + 1}:`, {
        src: src,
        alt: alt,
   className: className,
        testId: testId,
   isValidImage: this.isValidImageUrl(src || ''),
        isProfile: this.isProfileImage(src || ''),
        element: img
      });
    });
  }
}