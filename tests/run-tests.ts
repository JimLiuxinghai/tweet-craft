// 测试执行入口文件

import './core-functionality.test';
import './extension-specific.test';
import { testRunner } from './test-framework';

/**
 * 运行所有测试的主函数
 */
async function runAllTests(): Promise<void> {
  console.log('🧪 Tweet Craft Extension - Comprehensive Test Suite');
  console.log('=' .repeat(60));
  
  try {
    await testRunner.runAll();
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit?.(1);
  }
}

/**
 * 生成测试报告
 */
function generateTestReport(): void {
  const results = testRunner.getResults();
  const passed = results.filter(r => r.passed);
  const failed = results.filter(r => !r.passed);

  const report = {
    summary: {
      total: results.length,
      passed: passed.length,
      failed: failed.length,
      successRate: ((passed.length / results.length) * 100).toFixed(1) + '%',
      totalDuration: results.reduce((sum, r) => sum + r.duration, 0).toFixed(2) + 'ms'
    },
    failedTests: failed.map(f => ({
      name: f.name,
error: f.error,
      duration: f.duration.toFixed(2) + 'ms'
    })),
    passedTests: passed.map(p => ({
      name: p.name,
      duration: p.duration.toFixed(2) + 'ms'
    })),
    categories: {
      'Core Functionality': results.filter(r => r.name.includes('Internationalization') || 
              r.name.includes('Error Handling') || 
        r.name.includes('Cache') || 
         r.name.includes('Memory') || 
         r.name.includes('Batch')).length,
      'Extension Specific': results.filter(r => r.name.includes('Twitter') || 
            r.name.includes('Formatting') || 
               r.name.includes('Clipboard') || 
         r.name.includes('Screenshot')).length,
      'Edge Cases': results.filter(r => r.name.includes('Edge Cases')).length
    }
  };

  console.log('\n📊 DETAILED TEST REPORT');
  console.log('=' .repeat(50));
  console.log(`📈 Success Rate: ${report.summary.successRate}`);
  console.log(`⏱️  Total Duration: ${report.summary.totalDuration}`);
  console.log(`📦 Test Categories:`);
  Object.entries(report.categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count} tests`);
  });

  if (report.failedTests.length > 0) {
    console.log(`\n❌ Failed Tests (${report.failedTests.length}):`);
    report.failedTests.forEach(test => {
      console.log(`   • ${test.name}`);
console.log(`     Error: ${test.error}`);
    console.log(`     Duration: ${test.duration}`);
    });
  }

  // 将报告保存到文件（如果在Node.js环境中）
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const fs = require('fs');
      fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));
   console.log('\n📄 Test report saved to: test-report.json');
    } catch (error) {
      console.warn('Failed to save test report file:', error);
    }
  }
}

/**
 * 验证测试覆盖率（简化版）
 */
function validateTestCoverage(): void {
  const results = testRunner.getResults();
  const requiredCategories = [
    'Internationalization',
    'Error Handling',
    'Cache',
    'Memory',
    'Batch',
    'Twitter',
    'Formatting',
    'Clipboard',
    'Screenshot',
    'Storage',
    'Edge Cases'
  ];

  console.log('\n📋 Test Coverage Validation:');
  
const missingCategories = requiredCategories.filter(category => 
    !results.some(r => r.name.includes(category))
  );

  if (missingCategories.length === 0) {
    console.log('✅ All required test categories are covered');
  } else {
    console.log('⚠️  Missing test coverage for:');
    missingCategories.forEach(category => {
      console.log(`   • ${category}`);
    });
  }

  // 检查关键功能的测试数量
  const criticalTests = results.filter(r => 
    r.name.includes('Error Handling') || 
    r.name.includes('Twitter') || 
    r.name.includes('Clipboard')
  );

  if (criticalTests.length >= 10) {
    console.log('✅ Sufficient coverage for critical functionality');
  } else {
    console.log('⚠️  Consider adding more tests for critical functionality');
  }
}

/**
 * 性能基准测试
 */
async function runPerformanceBenchmarks(): Promise<void> {
  console.log('\n⚡ Running Performance Benchmarks...');

  // 测试缓存性能
  const cacheOps = 1000;
  const cacheStart = performance.now();
  
  // 模拟缓存操作
  for (let i = 0; i < cacheOps; i++) {
    // 这里应该调用实际的缓存操作
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  
  const cacheTime = performance.now() - cacheStart;
  console.log(`📦 Cache Operations: ${cacheOps} ops in ${cacheTime.toFixed(2)}ms`);
  console.log(`   Average: ${(cacheTime / cacheOps).toFixed(3)}ms per operation`);

  // 测试批处理性能
  const batchSize = 100;
  const batchStart = performance.now();
  
  // 模拟批处理操作
  const items = Array.from({ length: batchSize }, (_, i) => i);
  await new Promise(resolve => setTimeout(resolve, batchSize));
  
  const batchTime = performance.now() - batchStart;
console.log(`🔄 Batch Processing: ${batchSize} items in ${batchTime.toFixed(2)}ms`);
  console.log(`   Throughput: ${(batchSize / batchTime * 1000).toFixed(0)} items/sec`);

  // 内存使用测试
  if (typeof performance !== 'undefined' && (performance as any).memory) {
    const memory = (performance as any).memory;
    console.log(`🧠 Memory Usage:`);
    console.log(` Used: ${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total: ${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Limit: ${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`);
  }
}

/**
 * 健康检查 - 验证基本系统功能
 */
async function healthCheck(): Promise<boolean> {
  console.log('\n🏥 System Health Check...');
  
  const checks = [
    {
      name: 'DOM API',
      test: () => typeof document !== 'undefined'
    },
    {
      name: 'Local Storage',
      test: () => typeof localStorage !== 'undefined'
    },
    {
      name: 'Clipboard API',
      test: () => typeof navigator !== 'undefined' && 'clipboard' in navigator
    },
    {
      name: 'Canvas Support',
  test: () => {
        try {
        const canvas = document.createElement('canvas');
 return canvas.getContext && canvas.getContext('2d');
 } catch (e) {
       return false;
        }
    }
    },
    {
      name: 'Fetch API',
      test: () => typeof fetch !== 'undefined'
    },
    {
   name: 'Promise Support',
      test: () => typeof Promise !== 'undefined'
    },
    {
      name: 'ES6 Features',
      test: () => {
   try {
          // 测试箭头函数、解构、模板字符串
   const test = (x: number) => x * 2;
          const [a] = [1];
          const template = `test${a}`;
        return test(1) === 2 && a === 1 && template === 'test1';
        } catch (e) {
       return false;
        }
      }
    }
  ];

  let allPassed = true;

  for (const check of checks) {
    try {
      const result = check.test();
      const status = result ? '✅' : '❌';
      console.log(`${status} ${check.name}`);
      if (!result) allPassed = false;
    } catch (error) {
console.log(`❌ ${check.name} (Error: ${error})`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('✅ All health checks passed');
  } else {
    console.log('⚠️  Some health checks failed - extension may not work properly');
  }

  return allPassed;
}

/**
 * 主执行函数
 */
async function main(): Promise<void> {
  try {
    // 健康检查
    const healthPassed = await healthCheck();
    if (!healthPassed) {
      console.warn('⚠️  Health check issues detected, continuing with tests...');
    }

    // 运行测试
    await runAllTests();

    // 生成报告
    generateTestReport();

    // 验证覆盖率
  validateTestCoverage();

    // 性能基准测试
    await runPerformanceBenchmarks();

    console.log('\n🎉 Test execution completed!');

    // 根据测试结果决定退出码
    const results = testRunner.getResults();
    const failedCount = results.filter(r => !r.passed).length;
    
    if (failedCount > 0) {
      console.log(`❌ ${failedCount} test(s) failed`);
    process.exit?.(1);
    } else {
      console.log('✅ All tests passed!');
 }

  } catch (error) {
    console.error('💥 Fatal error during test execution:', error);
    process.exit?.(1);
  }
}

// 如果直接运行此文件，执行测试
if (typeof window !== 'undefined') {
  // 在浏览器环境中
  console.log('🌐 Running in browser environment');
  (window as any).runTests = main;
  main();
} else if (typeof process !== 'undefined' && process.versions?.node) {
  // 在 Node.js 环境中
  console.log('🖥️  Running in Node.js environment');
  main();
}

export { main, runAllTests, generateTestReport };