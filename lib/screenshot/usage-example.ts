// 使用增强截图服务的示例

import { enhancedScreenshotService, EnhancedScreenshotOptions } from './EnhancedScreenshotService';
import { getSettings } from '../utils/storage';

/**
 * 截图推文的示例
 * 演示如何使用渐变背景和复用复制功能选项
 */
export async function screenshotTweetExample() {
  // 获取推文元素
  const tweetElement = document.querySelector('[data-testid="tweet"]') as HTMLElement;
  if (!tweetElement) {
    console.warn('未找到推文元素');
    return;
  }

  try {
    // 示例1: 使用预设的Twitter蓝色渐变背景
    const options1: EnhancedScreenshotOptions = {
 useContentOptions: true, // 复用复制功能的内容选项
      backgroundGradient: {
        type: 'linear',
    direction: 'to right',
  colors: ['#1DA1F2', '#0d8bd9']
      },
      format: 'png',
      quality: 0.9,
      scale: 2
    };

    console.log('📷 截图推文 - 使用Twitter蓝色渐变');
    const result1 = await enhancedScreenshotService.enhancedCapture(tweetElement, options1);
    
    // 下载截图
  await enhancedScreenshotService.downloadScreenshot(result1, `tweet-twitter-blue-${Date.now()}.png`);

    // 示例2: 使用自定义日落渐变背景
    const options2: EnhancedScreenshotOptions = {
      useContentOptions: true,
      backgroundGradient: {
        type: 'linear',
 direction: 'to bottom right',
        colors: ['#FF6B6B', '#FFE66D', '#FF8E53']
      },
      format: 'png',
quality: 0.9,
   scale: 2
    };

    console.log('📷 截图推文 - 使用日落渐变');
    const result2 = await enhancedScreenshotService.enhancedCapture(tweetElement, options2);
    
  // 复制到剪贴板
    await enhancedScreenshotService.copyScreenshotToClipboard(result2);

    // 示例3: 使用纯色背景
    const options3: EnhancedScreenshotOptions = {
      useContentOptions: true,
      backgroundColor: '#f0f8ff', // 淡蓝色背景
      format: 'jpg',
   quality: 0.8,
      scale: 1.5
    };

    console.log('📷 截图推文 - 使用纯色背景');
    const result3 = await enhancedScreenshotService.enhancedCapture(tweetElement, options3);
    
    // 下载截图
await enhancedScreenshotService.downloadScreenshot(result3, `tweet-solid-bg-${Date.now()}.jpg`);

    console.log('✅ 所有截图示例完成');

  } catch (error) {
    console.error('截图失败:', error);
  }
}

/**
 * 截图推文线程的示例
 */
export async function screenshotThreadExample() {
  // 获取线程中的所有推文元素
  const threadTweets = Array.from(document.querySelectorAll('[data-testid="tweet"]')) as HTMLElement[];
  
  if (threadTweets.length === 0) {
    console.warn('未找到线程推文');
  return;
  }

  try {
    // 使用海洋渐变背景截图线程
    const options: EnhancedScreenshotOptions = {
      useContentOptions: true, // 复用复制功能的内容选项（包括是否显示指标等）
      backgroundGradient: {
        type: 'linear',
        direction: 'to bottom right',
 colors: ['#667eea', '#764ba2']
      },
      format: 'png',
      quality: 0.9,
  scale: 2
    };

    console.log(`📷 截图线程 - ${threadTweets.length} 条推文`);
    const result = await enhancedScreenshotService.captureThread(threadTweets, options);
    
    // 下载截图
    await enhancedScreenshotService.downloadScreenshot(
      result, 
    `thread-ocean-gradient-${threadTweets.length}-tweets-${Date.now()}.png`
    );

    console.log('✅ 线程截图完成');

  } catch (error) {
    console.error('线程截图失败:', error);
  }
}

/**
 * 根据用户设置动态截图
 */
export async function screenshotWithUserSettings() {
  const tweetElement = document.querySelector('[data-testid="tweet"]') as HTMLElement;
  if (!tweetElement) return;

  try {
    // 获取用户的扩展设置
    const settings = await getSettings();
    
    // 构建截图选项，复用用户的内容偏好
    const options: EnhancedScreenshotOptions = {
      useContentOptions: true, // 这会应用用户在复制设置中的偏好
      // 使用用户的截图背景设置
  backgroundColor: settings.screenshotOptions?.backgroundColor,
      backgroundGradient: settings.screenshotOptions?.backgroundGradient,
      format: 'png',
      quality: 0.9,
      scale: 2,
      // 应用用户的主题设置
      theme: settings.theme
    };

    console.log('📷 根据用户设置截图');
    console.log('用户设置:', {
      format: settings.format,
      includeAuthor: settings.includeAuthor,
      includeTimestamp: settings.includeTimestamp,
      includeMetrics: settings.includeMetrics,
      includeMedia: settings.includeMedia,
 theme: settings.theme,
      screenshotBackground: settings.screenshotOptions
    });

    const result = await enhancedScreenshotService.enhancedCapture(tweetElement, options);
    
    // 根据用户偏好决定是下载还是复制
    if (navigator.clipboard) {
      await enhancedScreenshotService.copyScreenshotToClipboard(result);
      console.log('✅ 截图已复制到剪贴板');
    } else {
      await enhancedScreenshotService.downloadScreenshot(result, `user-settings-${Date.now()}.png`);
      console.log('✅ 截图已下载');
    }

  } catch (error) {
    console.error('设置截图失败:', error);
  }
}

/**
 * 获取所有可用的预设渐变
 */
export function showAvailableGradients() {
  const presets = enhancedScreenshotService.getPresetGradients();
  
  console.log('🎨 可用的预设渐变背景:');
  presets.forEach((preset, index) => {
    console.log(`${index + 1}. ${preset.name}:`);
    console.log(`   类型: ${preset.gradient.type}`);
    console.log(`   方向: ${preset.gradient.direction}`);
    console.log(`   颜色: ${preset.gradient.colors.join(' → ')}`);
    console.log('');
  });
}

/**
 * 测试截图功能的完整示例
 */
export async function runCompleteExample() {
  console.log('🚀 开始截图功能完整测试');
  
  // 显示可用渐变
  showAvailableGradients();
  
  // 等待一秒以便查看日志
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // 运行各种截图示例
  await screenshotTweetExample();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await screenshotThreadExample();
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await screenshotWithUserSettings();
  
  console.log('🎉 所有截图示例运行完毕!');
}

// 在开发环境中可以直接调用测试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // 将示例函数暴露到全局对象，方便在控制台测试
  (window as any).screenshotExamples = {
    screenshotTweetExample,
    screenshotThreadExample,
    screenshotWithUserSettings,
    showAvailableGradients,
    runCompleteExample
  };
  
  console.log('🔧 截图示例已加载，在控制台中使用:');
  console.log('- screenshotExamples.runCompleteExample()');
  console.log('- screenshotExamples.screenshotTweetExample()');
  console.log('- screenshotExamples.screenshotThreadExample()');
  console.log('- screenshotExamples.screenshotWithUserSettings()');
  console.log('- screenshotExamples.showAvailableGradients()');
}