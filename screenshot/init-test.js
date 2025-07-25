/**
 * 截图功能初始化测试
 * Screenshot functionality initialization test
 */

/**
 * 测试截图功能是否正确初始化
 */
async function testScreenshotInitialization() {
  console.log('🧪 开始截图功能初始化测试...');
  
  const tests = [];
  
  // 测试类型定义是否加载
  tests.push({
    name: '类型定义加载',
    test: () => {
      return window.ScreenshotTypes && 
             window.ScreenshotTypes.ScreenshotConfig &&
             window.ScreenshotTypes.ThemeConfig &&
             window.ScreenshotTypes.ScreenshotErrors;
    }
  });
  
  // 测试接口定义是否加载
  tests.push({
    name: '接口定义加载',
    test: () => {
      return window.ScreenshotInterfaces &&
             window.ScreenshotInterfaces.IScreenshotManager &&
             window.ScreenshotInterfaces.IScreenshotRenderer;
    }
  });
  
  // 测试HTML2Canvas包装器是否加载
  tests.push({
    name: 'HTML2Canvas包装器加载',
    test: () => {
      return window.HTML2CanvasWrapper && window.html2canvasWrapper;
    }
  });
  
  // 测试截图管理器是否加载
  tests.push({
    name: '截图管理器加载',
    test: () => {
      return window.ScreenshotManager;
    }
  });
  
  // 测试截图管理器实例化
  tests.push({
    name: '截图管理器实例化',
    test: async () => {
      try {
        const manager = new window.ScreenshotManager();
        return manager instanceof window.ScreenshotManager;
      } catch (error) {
        console.warn('截图管理器实例化失败:', error);
        return false;
      }
    }
  });
  
  // 执行测试
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}: 通过`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: 失败`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: 错误 -`, error.message);
      failed++;
    }
  }
  
  console.log(`🧪 测试完成: ${passed} 通过, ${failed} 失败`);
  
  if (failed === 0) {
    console.log('🎉 截图功能基础结构初始化成功！');
  } else {
    console.warn('⚠️ 截图功能初始化存在问题，请检查控制台错误信息');
  }
  
  return { passed, failed, total: tests.length };
}

// 在DOM加载完成后自动运行测试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(testScreenshotInitialization, 1000);
  });
} else {
  setTimeout(testScreenshotInitialization, 1000);
}

// 导出测试函数
if (typeof window !== 'undefined') {
  window.testScreenshotInitialization = testScreenshotInitialization;
}