/**
 * 截图功能集成测试
 * Screenshot functionality integration test
 */

/**
 * 测试截图管理器与渲染器的集成
 */
async function testScreenshotIntegration() {
  console.log('🔗 开始测试截图管理器与渲染器集成...');
  
  try {
    // 创建截图管理器实例
    const manager = new ScreenshotManager();
    console.log('✅ 截图管理器创建成功');
    
    // 等待初始化完成
    await manager.initializeComponents();
    console.log('✅ 截图管理器初始化完成');
    
    // 验证渲染器已正确初始化
    if (!manager.renderer) {
      throw new Error('渲染器未正确初始化');
    }
    console.log('✅ 渲染器已正确集成到管理器中');
    
    // 测试推文数据提取
    const mockTweetElement = createMockTweetElement();
    const tweetData = manager.extractTweetData(mockTweetElement);
    console.log('✅ 推文数据提取成功');
    console.log('推文数据:', {
      id: tweetData.id,
      author: tweetData.author?.name,
      contentLength: tweetData.content?.length || 0
    });
    
    // 测试渲染器直接调用
    const canvas = await manager.renderer.renderTweet(tweetData, manager.settings.style);
    console.log('✅ 渲染器直接调用成功');
    console.log('Canvas尺寸:', canvas.width, 'x', canvas.height);
    
    // 测试通过管理器渲染
    const managerCanvas = await manager.renderTweetToCanvas(mockTweetElement, tweetData, manager.settings);
    console.log('✅ 通过管理器渲染成功');
    console.log('管理器Canvas尺寸:', managerCanvas.width, 'x', managerCanvas.height);
    
    // 测试Canvas转Blob
    const blob = await manager.canvasToBlob(canvas, 'png', 0.9);
    console.log('✅ Canvas转Blob成功');
    console.log('Blob大小:', blob.size, '字节');
    
    console.log('\n🎉 截图管理器与渲染器集成测试全部通过！');
    
    return {
      success: true,
      message: '集成测试通过',
      results: {
        managerInitialized: true,
        rendererIntegrated: true,
        canvasGenerated: true,
        blobCreated: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        blobSize: blob.size
      }
    };
    
  } catch (error) {
    console.error('❌ 集成测试失败:', error);
    return {
      success: false,
      message: `集成测试失败: ${error.message}`,
      error: error
    };
  }
}

/**
 * 测试线程渲染集成
 */
async function testThreadRenderingIntegration() {
  console.log('🧵 开始测试线程渲染集成...');
  
  try {
    const manager = new ScreenshotManager();
    await manager.initializeComponents();
    
    // 创建模拟线程数据
    const threadData = createMockThreadData();
    console.log('✅ 模拟线程数据创建成功');
    
    // 测试线程渲染
    const threadCanvas = await manager.renderer.renderThread(threadData, manager.settings.style);
    console.log('✅ 线程渲染成功');
    console.log('线程Canvas尺寸:', threadCanvas.width, 'x', threadCanvas.height);
    
    // 测试通过管理器渲染线程
    const mockThreadElements = threadData.map(createMockTweetElementFromData);
    const managerThreadCanvas = await manager.renderThreadToCanvas(
      createMockThreadContainer(mockThreadElements), 
      threadData, 
      manager.settings
    );
    console.log('✅ 通过管理器渲染线程成功');
    
    console.log('🎉 线程渲染集成测试通过！');
    
    return {
      success: true,
      threadCanvasSize: { width: threadCanvas.width, height: threadCanvas.height },
      managerThreadCanvasSize: { width: managerThreadCanvas.width, height: managerThreadCanvas.height }
    };
    
  } catch (error) {
    console.error('❌ 线程渲染集成测试失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 创建模拟推文元素
 */
function createMockTweetElement() {
  const tweetElement = document.createElement('div');
  tweetElement.setAttribute('data-testid', 'tweet');
  tweetElement.innerHTML = `
    <div data-testid="User-Name">
      <span>测试用户</span>
      <a href="/testuser">@testuser</a>
    </div>
    <div data-testid="tweetText">
      这是一条测试推文，用于验证截图渲染器的基础功能。
    </div>
    <time datetime="${new Date().toISOString()}">刚刚</time>
    <a href="/testuser/status/123456789">查看推文</a>
  `;
  
  return tweetElement;
}

/**
 * 从推文数据创建模拟元素
 */
function createMockTweetElementFromData(tweetData) {
  const tweetElement = document.createElement('div');
  tweetElement.setAttribute('data-testid', 'tweet');
  tweetElement.innerHTML = `
    <div data-testid="User-Name">
      <span>${tweetData.author.name}</span>
      <a href="/${tweetData.author.username}">@${tweetData.author.username}</a>
    </div>
    <div data-testid="tweetText">
      ${tweetData.content}
    </div>
    <time datetime="${tweetData.timestamp}">刚刚</time>
    <a href="${tweetData.url}">查看推文</a>
  `;
  
  return tweetElement;
}

/**
 * 创建模拟线程数据
 */
function createMockThreadData() {
  const baseData = {
    author: {
      name: '测试用户',
      username: 'testuser',
      profileUrl: 'https://twitter.com/testuser'
    },
    media: { images: [], videos: [], links: [] },
    metrics: { likes: 0, retweets: 0, replies: 0, views: 0 },
    url: 'https://twitter.com/testuser/status/'
  };
  
  return [
    {
      ...baseData,
      id: 'thread_1',
      content: '这是线程的第一条推文。1/3',
      timestamp: new Date().toISOString(),
      url: baseData.url + '123456789',
      thread: { isThread: true, position: 1, total: 3, threadId: 'thread_123' }
    },
    {
      ...baseData,
      id: 'thread_2',
      content: '这是线程的第二条推文，包含更多内容。2/3',
      timestamp: new Date(Date.now() + 60000).toISOString(),
      url: baseData.url + '123456790',
      thread: { isThread: true, position: 2, total: 3, threadId: 'thread_123' }
    },
    {
      ...baseData,
      id: 'thread_3',
      content: '这是线程的最后一条推文。3/3',
      timestamp: new Date(Date.now() + 120000).toISOString(),
      url: baseData.url + '123456791',
      thread: { isThread: true, position: 3, total: 3, threadId: 'thread_123' }
    }
  ];
}

/**
 * 创建模拟线程容器
 */
function createMockThreadContainer(threadElements) {
  const container = document.createElement('div');
  container.style.cssText = `
    background-color: #ffffff;
    padding: 20px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 600px;
  `;
  
  threadElements.forEach(element => {
    container.appendChild(element);
  });
  
  return container;
}

/**
 * 测试错误处理
 */
async function testErrorHandling() {
  console.log('⚠️ 开始测试错误处理...');
  
  try {
    const manager = new ScreenshotManager();
    await manager.initializeComponents();
    
    // 测试无效推文元素
    try {
      await manager.captureScreenshot(null);
      console.error('❌ 应该抛出错误但没有');
      return { success: false, message: '错误处理测试失败' };
    } catch (error) {
      console.log('✅ 正确处理了无效推文元素错误:', error.message);
    }
    
    // 测试无效线程数据
    try {
      await manager.captureThread([]);
      console.error('❌ 应该抛出错误但没有');
      return { success: false, message: '错误处理测试失败' };
    } catch (error) {
      console.log('✅ 正确处理了无效线程数据错误:', error.message);
    }
    
    console.log('✅ 错误处理测试通过');
    return { success: true, message: '错误处理测试通过' };
    
  } catch (error) {
    console.error('❌ 错误处理测试失败:', error);
    return { success: false, message: `错误处理测试失败: ${error.message}` };
  }
}

/**
 * 运行所有集成测试
 */
async function runAllIntegrationTests() {
  console.log('🚀 开始运行所有集成测试...\n');
  
  const results = {
    basic: await testScreenshotIntegration(),
    thread: await testThreadRenderingIntegration(),
    errorHandling: await testErrorHandling()
  };
  
  console.log('\n📊 集成测试结果汇总:');
  console.log('基础集成测试:', results.basic.success ? '✅ 通过' : '❌ 失败');
  console.log('线程渲染测试:', results.thread.success ? '✅ 通过' : '❌ 失败');
  console.log('错误处理测试:', results.errorHandling.success ? '✅ 通过' : '❌ 失败');
  
  const allPassed = results.basic.success && results.thread.success && results.errorHandling.success;
  console.log('\n总体结果:', allPassed ? '🎉 所有测试通过' : '❌ 部分测试失败');
  
  return results;
}

// 如果在浏览器环境中，导出测试函数
if (typeof window !== 'undefined') {
  window.testScreenshotIntegration = testScreenshotIntegration;
  window.testThreadRenderingIntegration = testThreadRenderingIntegration;
  window.testErrorHandling = testErrorHandling;
  window.runAllIntegrationTests = runAllIntegrationTests;
  
  // 自动运行测试（延迟执行以确保所有组件加载完成）
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(runAllIntegrationTests, 2000);
    });
  } else {
    setTimeout(runAllIntegrationTests, 2000);
  }
}