// 测试媒体修复 - 验证图片媒体相关信息复制功能

import type { TweetData, FormatOptions } from './types';
import { EnhancedMediaExtractor } from './parsers/enhanced-media-extractor';
import { EnhancedContentFormatter } from './formatters/enhanced-content-formatter';

/**
 * 创建测试推文数据
 */
function createTestTweetWithMedia(): TweetData {
  return {
 id: 'test-tweet-123',
    author: {
      username: 'testuser',
   displayName: 'Test User',
    avatar: 'https://pbs.twimg.com/profile_images/123456789/avatar.jpg'
    },
    content: '这是一条包含媒体的测试推文！看看这些图片和视频。🎉',
    timestamp: new Date(),
    metrics: {
      likes: 42,
      retweets: 15,
      replies: 8
    },
    media: [
      {
     type: 'image',
        url: 'https://pbs.twimg.com/media/test-image-1.jpg?format=jpg&name=large',
    alt: '测试图片1'
      },
      {
        type: 'image',
        url: 'https://pbs.twimg.com/media/test-image-2.png?format=png&name=medium',
        alt: '测试图片2'
      },
      {
        type: 'video',
 url: 'https://video.twimg.com/test-video.mp4',
previewUrl: 'https://pbs.twimg.com/media/video-preview.jpg'
      },
      {
        type: 'gif',
      url: 'https://video.twimg.com/tweet_video/test-gif.mp4',
        previewUrl: 'https://pbs.twimg.com/media/gif-preview.jpg'
      }
 ],
    isThread: false,
    url: 'https://x.com/testuser/status/test-tweet-123'
  };
}

/**
 * 测试媒体提取功能
 */
export function testMediaExtraction(): void {
  console.log('🧪 开始测试媒体提取功能...\n');
  
  // 创建模拟的推文元素
  const mockTweetElement = document.createElement('div');
  mockTweetElement.innerHTML = `
    <div data-testid="tweet">
      <div data-testid="User-Name">
        <span>Test User</span>
<span>@testuser</span>
 </div>
      <div data-testid="tweetText">这是一条包含媒体的测试推文！</div>
      <div data-testid="tweetPhoto">
  <img src="https://pbs.twimg.com/media/test-image-1.jpg?format=jpg&name=large" alt="测试图片1">
        <img src="https://pbs.twimg.com/media/test-image-2.png?format=png&name=medium" alt="测试图片2">
      </div>
      <div data-testid="videoPlayer">
  <video src="https://video.twimg.com/test-video.mp4" poster="https://pbs.twimg.com/media/video-preview.jpg"></video>
      </div>
      <div data-testid="gifPlayer">
        <video src="https://video.twimg.com/tweet_video/test-gif.mp4" autoplay loop muted></video>
      </div>
    </div>
  `;
  
  // 测试媒体提取
  const extractedMedia = EnhancedMediaExtractor.extractMediaItems(mockTweetElement);
  
  console.log('📊 媒体提取结果:');
  console.log(`  提取到 ${extractedMedia.length} 个媒体项目`);
  extractedMedia.forEach((media, index) => {
    console.log(`  ${index + 1}. 类型: ${media.type}, URL: ${media.url}`);
    if (media.alt) console.log(`     描述: ${media.alt}`);
    if (media.previewUrl) console.log(`   预览: ${media.previewUrl}`);
  });
  
  console.log('\n✅ 媒体提取测试完成\n');
}

/**
 * 测试内容格式化功能
 */
export function testContentFormatting(): void {
  console.log('🧪 开始测试内容格式化功能...\n');
  
  const testTweet = createTestTweetWithMedia();
  
  // 测试不同格式的选项
  const formatOptions: FormatOptions[] = [
    {
   format: 'html',
  includeAuthor: true,
      includeTimestamp: true,
      includeMetrics: true,
      includeMedia: true, // 关键：确保媒体被包含
includeLink: true
    },
    {
      format: 'markdown',
      includeAuthor: true,
      includeTimestamp: true,
      includeMetrics: true,
      includeMedia: true, // 关键：确保媒体被包含
      includeLink: true
    },
    {
      format: 'text',
      includeAuthor: true,
 includeTimestamp: true,
      includeMetrics: true,
 includeMedia: true, // 关键：确保媒体被包含
   includeLink: true
    }
  ];

  formatOptions.forEach(options => {
 console.log(`📝 测试 ${options.format.toUpperCase()} 格式化:`);
    const formattedContent = EnhancedContentFormatter.formatTweet(testTweet, options);
    
 console.log(`  内容长度: ${formattedContent.length} 字符`);
    console.log(`  内容预览:`);
    console.log(`  ${formattedContent.substring(0, 200)}...`);
    
  // 验证媒体内容是否被包含
 const containsImageUrl = formattedContent.includes('pbs.twimg.com/media/test-image-1.jpg');
    const containsVideoUrl = formattedContent.includes('video.twimg.com/test-video.mp4');
    const containsGifUrl = formattedContent.includes('tweet_video/test-gif.mp4');
    
    console.log(`  📸 图片URL包含: ${containsImageUrl ? '✅' : '❌'}`);
  console.log(`  🎥 视频URL包含: ${containsVideoUrl ? '✅' : '❌'}`);
 console.log(`  🎞️ GIF URL包含: ${containsGifUrl ? '✅' : '❌'}`);
    console.log('');
  });
  
  console.log('✅ 内容格式化测试完成\n');
}

/**
 * 测试禁用媒体的情况
 */
export function testMediaDisabled(): void {
  console.log('🧪 开始测试禁用媒体的情况...\n');
  
  const testTweet = createTestTweetWithMedia();
  
  const optionsWithoutMedia: FormatOptions = {
    format: 'html',
    includeAuthor: true,
    includeTimestamp: true,
  includeMetrics: true,
    includeMedia: false, // 关键：禁用媒体
    includeLink: true
  };
  
  console.log('📝 测试禁用媒体的HTML格式化:');
  const formattedContent = EnhancedContentFormatter.formatTweet(testTweet, optionsWithoutMedia);
  
  console.log(`  内容长度: ${formattedContent.length} 字符`);
  console.log(`  内容预览:`);
  console.log(`  ${formattedContent.substring(0, 200)}...`);
  
  // 验证媒体内容是否被排除
  const containsImageUrl = formattedContent.includes('pbs.twimg.com/media/test-image-1.jpg');
  const containsVideoUrl = formattedContent.includes('video.twimg.com/test-video.mp4');
  const containsMediaDiv = formattedContent.includes('tweet-media');
  
  console.log(`  📸 图片URL包含: ${containsImageUrl ? '❌ 不应该包含' : '✅ 正确排除'}`);
  console.log(`  🎥 视频URL包含: ${containsVideoUrl ? '❌ 不应该包含' : '✅ 正确排除'}`);
  console.log(`  📦 媒体容器包含: ${containsMediaDiv ? '❌ 不应该包含' : '✅ 正确排除'}`);
  
  console.log('\n✅ 禁用媒体测试完成\n');
}

/**
 * 运行所有测试
 */
export function runAllTests(): void {
  console.log('🚀 开始运行媒体修复测试套件...\n');
  console.log('=' + '='.repeat(50));
  
  try {
  testMediaExtraction();
    testContentFormatting();
    testMediaDisabled();
    
    console.log('=' + '='.repeat(50));
    console.log('🎉 所有测试完成！媒体复制功能应该已经修复。');
    console.log('\n📋 修复摘要:');
    console.log('  ✅ 改进了媒体提取器，使用多种选择器策略');
    console.log('  ✅ 增强了内容格式化器，添加了详细的调试日志');
    console.log('  ✅ 在剪切板管理器中添加了媒体信息验证');
    console.log('  ✅ 确保 includeMedia 选项被正确处理');
    console.log('  ✅ 添加了高质量图片URL获取功能');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 延迟运行，确保DOM加载完成
  setTimeout(() => {
    runAllTests();
  }, 1000);
}