// 轻量级测试框架 - 专门用于浏览器扩展功能测试

/**
 * 测试结果接口
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: any;
}

/**
 * 测试套件接口
 */
interface TestSuite {
  name: string;
  tests: TestCase[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

/**
 * 测试用例接口
 */
interface TestCase {
  name: string;
  test: () => Promise<void>;
  timeout?: number;
}

/**
 * 断言函数集合
 */
export class Assert {
  static isTrue(condition: boolean, message?: string): void {
    if (!condition) {
    throw new Error(message || 'Expected condition to be true');
    }
  }

  static isFalse(condition: boolean, message?: string): void {
    if (condition) {
      throw new Error(message || 'Expected condition to be false');
    }
  }

  static equals<T>(actual: T, expected: T, message?: string): void {
    if (actual !== expected) {
      throw new Error(
        message || 
      `Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`
  );
    }
  }

  static deepEquals(actual: any, expected: any, message?: string): void {
    const actualStr = JSON.stringify(actual, null, 2);
    const expectedStr = JSON.stringify(expected, null, 2);
    
    if (actualStr !== expectedStr) {
   throw new Error(
        message || 
        `Expected ${expectedStr} but got ${actualStr}`
      );
    }
  }

static notNull<T>(value: T | null | undefined, message?: string): asserts value is T {
    if (value === null || value === undefined) {
      throw new Error(message || 'Expected value not to be null or undefined');
    }
  }

  static isInstanceOf<T>(value: any, constructor: new (...args: any[]) => T, message?: string): asserts value is T {
    if (!(value instanceof constructor)) {
  throw new Error(
        message || 
        `Expected value to be instance of ${constructor.name}`
      );
    }
  }

  static throws(fn: () => void, expectedError?: string | RegExp, message?: string): void {
    let thrown = false;
    let actualError: any;

    try {
      fn();
    } catch (error) {
      thrown = true;
      actualError = error;
    }

    if (!thrown) {
      throw new Error(message || 'Expected function to throw an error');
    }

    if (expectedError) {
      const errorMessage = actualError?.message || String(actualError);
      if (typeof expectedError === 'string') {
   if (!errorMessage.includes(expectedError)) {
     throw new Error(
      `Expected error to contain "${expectedError}" but got "${errorMessage}"`
 );
        }
      } else if (expectedError instanceof RegExp) {
  if (!expectedError.test(errorMessage)) {
          throw new Error(
  `Expected error to match ${expectedError} but got "${errorMessage}"`
          );
 }
      }
 }
  }

  static async throwsAsync(
    fn: () => Promise<void>, 
    expectedError?: string | RegExp, 
    message?: string
  ): Promise<void> {
    let thrown = false;
    let actualError: any;

    try {
      await fn();
    } catch (error) {
      thrown = true;
  actualError = error;
    }

    if (!thrown) {
      throw new Error(message || 'Expected async function to throw an error');
 }

 if (expectedError) {
      const errorMessage = actualError?.message || String(actualError);
    if (typeof expectedError === 'string') {
  if (!errorMessage.includes(expectedError)) {
          throw new Error(
       `Expected error to contain "${expectedError}" but got "${errorMessage}"`
        );
        }
      } else if (expectedError instanceof RegExp) {
if (!expectedError.test(errorMessage)) {
          throw new Error(
         `Expected error to match ${expectedError} but got "${errorMessage}"`
        );
        }
   }
    }
  }

  static arrayIncludes<T>(array: T[], item: T, message?: string): void {
    if (!array.includes(item)) {
      throw new Error(
        message || 
        `Expected array to include ${JSON.stringify(item)}`
      );
    }
  }

  static arrayLength<T>(array: T[], expectedLength: number, message?: string): void {
    if (array.length !== expectedLength) {
      throw new Error(
        message || 
        `Expected array length to be ${expectedLength} but got ${array.length}`
      );
    }
  }

  static stringContains(str: string, substring: string, message?: string): void {
    if (!str.includes(substring)) {
      throw new Error(
 message || 
    `Expected string "${str}" to contain "${substring}"`
      );
    }
  }

  static matches(str: string, pattern: RegExp, message?: string): void {
    if (!pattern.test(str)) {
      throw new Error(
        message || 
        `Expected string "${str}" to match pattern ${pattern}`
      );
    }
  }
}

/**
 * 模拟工具类
 */
export class MockHelper {
  private static originalFetch = globalThis.fetch;
  private static fetchMocks = new Map<string, any>();

  static mockFetch(url: string | RegExp, response: any): void {
    if (!globalThis.fetch.toString().includes('mock')) {
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = typeof input === 'string' ? input : input.toString();
        
        for (const [mockUrl, mockResponse] of MockHelper.fetchMocks.entries()) {
       const matches = typeof mockUrl === 'string' 
? urlStr.includes(mockUrl)
         : mockUrl.test(urlStr);
  
          if (matches) {
     return new Response(
 JSON.stringify(mockResponse), 
        { 
    status: mockResponse._status || 200,
                headers: { 'Content-Type': 'application/json' }
              }
            );
       }
        }
        
    return MockHelper.originalFetch(input, init);
      };
    }

    const key = url instanceof RegExp ? url : url.toString();
    MockHelper.fetchMocks.set(key, response);
  }

  static restoreFetch(): void {
    globalThis.fetch = MockHelper.originalFetch;
    MockHelper.fetchMocks.clear();
  }

  static mockDOM(html: string): Document {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Mock document if needed
    const originalDocument = globalThis.document;
    (globalThis as any).document = doc;
    
    return doc;
  }

  static restoreDOM(): void {
  // Note: In real browser environment, we can't actually replace document
    // This is mainly for testing purposes
  }

  static createMockElement(tagName: string, attributes: Record<string, string> = {}): HTMLElement {
    const element = document.createElement(tagName);
    
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });

    return element;
  }
}

/**
 * 测试运行器
 */
export class TestRunner {
  private results: TestResult[] = [];
  private suites: TestSuite[] = [];

  /**
   * 添加测试套件
   */
  addSuite(suite: TestSuite): void {
    this.suites.push(suite);
  }

  /**
   * 运行单个测试
   */
  async runTest(test: TestCase, suiteName: string): Promise<TestResult> {
    const start = performance.now();
    const timeout = test.timeout || 5000;

    try {
      // 创建超时 Promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout);
      });

      // 运行测试
      await Promise.race([test.test(), timeoutPromise]);

   const duration = performance.now() - start;
      return {
        name: `${suiteName} > ${test.name}`,
     passed: true,
        duration
      };
    } catch (error) {
      const duration = performance.now() - start;
      return {
        name: `${suiteName} > ${test.name}`,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
      duration
      };
    }
  }

  /**
   * 运行测试套件
   */
  async runSuite(suite: TestSuite): Promise<TestResult[]> {
    const suiteResults: TestResult[] = [];

    try {
      // 运行 setup
      if (suite.setup) {
        console.log(`Setting up test suite: ${suite.name}`);
   await suite.setup();
      }

      // 运行所有测试
   for (const test of suite.tests) {
        const result = await this.runTest(test, suite.name);
   suiteResults.push(result);
        this.results.push(result);

  // 实时输出结果
    const status = result.passed ? '✅' : '❌';
        console.log(`${status} ${result.name} (${result.duration.toFixed(2)}ms)`);
        if (!result.passed) {
     console.error(`   Error: ${result.error}`);
      }
   }

      // 运行 teardown
      if (suite.teardown) {
 console.log(`Tearing down test suite: ${suite.name}`);
        await suite.teardown();
   }

    } catch (error) {
      console.error(`Error in test suite ${suite.name}:`, error);
    }

    return suiteResults;
  }

  /**
   * 运行所有测试
   */
  async runAll(): Promise<void> {
    console.log('🚀 Starting test execution...\n');
    
    const startTime = performance.now();
    this.results = [];

    for (const suite of this.suites) {
      console.log(`\n📋 Running test suite: ${suite.name}`);
      await this.runSuite(suite);
    }

    const totalTime = performance.now() - startTime;
    this.printSummary(totalTime);
  }

  /**
   * 打印测试摘要
   */
  private printSummary(totalTime: number): void {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    const total = this.results.length;

    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏱️  Total Time: ${totalTime.toFixed(2)}ms`);
    console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.passed)
      .forEach(result => {
    console.log(`  • ${result.name}: ${result.error}`);
        });
    }

    console.log('\n' + '='.repeat(50));
  }

  /**
   * 获取测试结果
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * 清除结果
   */
  clearResults(): void {
    this.results = [];
  }
}

/**
 * 便捷的测试定义函数
 */
export function describe(name: string, tests: () => TestCase[]): TestSuite {
  return {
    name,
    tests: tests()
  };
}

export function it(name: string, test: () => Promise<void>, timeout?: number): TestCase {
  return { name, test, timeout };
}

// 创建全局测试运行器实例
export const testRunner = new TestRunner();