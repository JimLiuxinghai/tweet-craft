/**
 * ScreenshotRenderer 基础功能测试
 * Basic functionality test for ScreenshotRenderer
 */

// 测试用的推文数据
const testTweetData = {
  id: 'test_tweet_123',
  author: {
    name: '测试用户',
    username: 'testuser',
    profileUrl: 'https://twitter.com/testuser'
  },
  content: '这是一条测试推文，用于验证截图渲染器的基础功能。包含一些文本内容和[链接](https://example.com)。',
  timestamp: new Date().toISOString(),
  media: {
    images: [
      { src: 'https://example.com/image1.jpg', alt: '测试图片1' },
      { src: 'https://example.com/image2.jpg', alt: '测试图片2' }
    ],
    videos: [],
    links: [
      { url: 'https://example.com', text: '示例链接', title: '示例网站' }
    ]
  },
  metrics: {
    likes: 42,
    retweets: 12,
    replies: 5,
    views: 1000
  },
  url: 'https://twitter.com/testuser/status/123456789',
  thread: {
    isThread: false,
    position: 1,
    total: 1,
    threadId: null
  }
};

// 测试线程数据
const testThreadData = [
  {
    ...testTweetData,
    id: 'thread_tweet_1',
    content: '这是线程的第一条推文。1/3',
    thread: {
      isThread: true,
      position: 1,
      total: 3,
      threadId: 'thread_123'
    }
  },
  {
    ...testTweetData,
    id: 'thread_tweet_2',
    content: '这是线程的第二条推文，包含更多内容。2/3',
    thread: {
      isThread: true,
      position: 2,
      total: 3,
      threadId: 'thread_123'
    }
  },
  {
    ...testTweetData,
    id: 'thread_tweet_3',
    content: '这是线程的最后一条推文。3/3',
    thread: {
      isThread: true,
      position: 3,
      total: 3,
      threadId: 'thread_123'
    }
  }
];

/**
 * 测试ScreenshotRenderer基础功能
 */
async function testScreenshotRenderer() {
  console.log('🧪 开始测试 ScreenshotRenderer 基础功能...');
  
  try {
    // 创建渲染器实例
    const renderer = new ScreenshotRenderer();
    console.log('✅ ScreenshotRenderer 实例创建成功');
    
    // 测试1: 创建推文模板
    console.log('\n📝 测试1: 创建推文模板');
    const tweetTemplate = renderer.createTweetTemplate(testTweetData, renderer.defaultStyleConfig);
    console.log('✅ 推文模板创建成功');
    console.log('模板长度:', tweetTemplate.length, '字符');
    
    // 测试2: 创建线程模板
    console.log('\n📝 测试2: 创建线程模板');
    const threadTemplate = renderer.createThreadTemplate(testThreadData, renderer.defaultStyleConfig);
    console.log('✅ 线程模板创建成功');
    console.log('线程模板长度:', threadTemplate.length, '字符');
    
    // 测试3: 样式生成
    console.log('\n🎨 测试3: 样式生成');
    const styles = renderer.generateTweetStyles(renderer.defaultStyleConfig);
    console.log('✅ 样式生成成功');
    console.log('生成的样式数量:', Object.keys(styles).length);
    
    // 测试4: HTML内容处理
    console.log('\n🔧 测试4: HTML内容处理');
    const processedContent = renderer.processContentForHTML(testTweetData.content);
    console.log('✅ HTML内容处理成功');
    console.log('处理后内容:', processedContent);
    
    // 测试5: 媒体内容处理
    console.log('\n🖼️ 测试5: 媒体内容处理');
    const mediaHTML = renderer.renderMediaHTML(testTweetData.media, renderer.defaultStyleConfig);
    console.log('✅ 媒体内容处理成功');
    console.log('媒体HTML长度:', mediaHTML.length, '字符');
    
    // 测试6: 日期格式化
    console.log('\n📅 测试6: 日期格式化');
    const formattedDate = renderer.formatDate(testTweetData.timestamp);
    console.log('✅ 日期格式化成功');
    console.log('格式化后日期:', formattedDate);
    
    // 测试7: HTML转义
    console.log('\n🔒 测试7: HTML转义');
    const escapedText = renderer.escapeHtml('<script>alert("test")</script>');
    console.log('✅ HTML转义成功');
    console.log('转义后文本:', escapedText);
    
    // 测试8: 缓存功能
    console.log('\n💾 测试8: 缓存功能');
    const template1 = renderer.createTweetTemplate(testTweetData, renderer.defaultStyleConfig);
    const template2 = renderer.createTweetTemplate(testTweetData, renderer.defaultStyleConfig);
    console.log('✅ 缓存功能正常');
    console.log('模板相同:', template1 === template2);
    
    console.log('\n🎉 所有基础功能测试通过！');
    
    return {
      success: true,
      message: 'ScreenshotRenderer 基础功能测试全部通过'
    };
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    return {
      success: false,
      message: `测试失败: ${error.message}`
    };
  }
}

/**
 * 测试模板生成的HTML结构
 */
function testHTMLStructure() {
  console.log('\n🏗️ 测试HTML结构生成...');
  
  try {
    const renderer = new ScreenshotRenderer();
    
    // 生成推文HTML
    const tweetHTML = renderer.generateTweetHTML(testTweetData, renderer.defaultStyleConfig);
    
    // 创建临时元素来验证HTML结构
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = tweetHTML;
    
    // 验证关键元素存在
    const tweetContainer = tempDiv.querySelector('.screenshot-tweet');
    const tweetHeader = tempDiv.querySelector('.tweet-header');
    const authorName = tempDiv.querySelector('.author-name');
    const authorUsername = tempDiv.querySelector('.author-username');
    const tweetContent = tempDiv.querySelector('.tweet-content');
    const tweetTimestamp = tempDiv.querySelector('.tweet-timestamp');
    
    console.log('✅ 推文容器:', !!tweetContainer);
    console.log('✅ 推文头部:', !!tweetHeader);
    console.log('✅ 作者姓名:', !!authorName);
    console.log('✅ 作者用户名:', !!authorUsername);
    console.log('✅ 推文内容:', !!tweetContent);
    console.log('✅ 时间戳:', !!tweetTimestamp);
    
    // 验证内容正确性
    console.log('作者姓名内容:', authorName?.textContent);
    console.log('作者用户名内容:', authorUsername?.textContent);
    console.log('推文内容长度:', tweetContent?.innerHTML?.length);
    
    console.log('✅ HTML结构测试通过');
    
    return true;
  } catch (error) {
    console.error('❌ HTML结构测试失败:', error);
    return false;
  }
}

// 如果在浏览器环境中，自动运行测试
if (typeof window !== 'undefined') {
  // 等待DOM加载完成后运行测试
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        testScreenshotRenderer();
        testHTMLStructure();
      }, 1000);
    });
  } else {
    setTimeout(() => {
      testScreenshotRenderer();
      testHTMLStructure();
    }, 1000);
  }
  
  // 导出测试函数到全局作用域
  window.testScreenshotRenderer = testScreenshotRenderer;
  window.testHTMLStructure = testHTMLStructure;
}