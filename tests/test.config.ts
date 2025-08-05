// 测试配置文件

/**
 * 测试执行配置
 */
export interface TestConfig {
  // 基本配置
  timeout: number;       // 默认测试超时时间（ms）
  retries: number;        // 失败重试次数
  parallel: boolean;        // 是否并行执行
  bail: boolean;     // 遇到失败是否停止
  
  // 输出配置
  verbose: boolean; // 详细输出
  colors: boolean; // 彩色输出
  silent: boolean;       // 静默模式
  
  // 报告配置
  generateReport: boolean;   // 生成报告文件
  reportFormat: 'json' | 'html' | 'xml';  // 报告格式
  reportPath: string;           // 报告路径
  
  // 过滤配置
  include: string[];// 包含的测试模式
  exclude: string[];   // 排除的测试模式
  categories: string[];              // 测试类别过滤
  
  // 性能配置
  performanceBudget: {
    maxDuration: number;      // 最大执行时间（ms）
    maxMemory: number;   // 最大内存使用（MB）
    slowThreshold: number; // 慢测试阈值（ms）
  };
  
  // 覆盖率配置
  coverage: {
    enabled: boolean;    // 启用覆盖率
    threshold: number;      // 覆盖率阈值（%）
    includeUntested: boolean;     // 包含未测试文件
  };
  
  // 浏览器环境配置
  browser: {
    headless: boolean;          // 无头模式
    viewport: { width: number; height: number };  // 视口大小
    timeout: number;// 页面超时
  };
  
  // 模拟配置
  mocks: {
    network: boolean;      // 模拟网络
    storage: boolean;      // 模拟存储
    clipboard: boolean;      // 模拟剪贴板
    dom: boolean;     // 模拟DOM
  };
}

/**
 * 默认测试配置
 */
export const defaultConfig: TestConfig = {
  // 基本配置
  timeout: 5000,
  retries: 2,
  parallel: false,
  bail: false,
  
  // 输出配置
  verbose: true,
  colors: true,
  silent: false,
  
  // 报告配置
  generateReport: true,
  reportFormat: 'json',
  reportPath: './test-reports',
  
  // 过滤配置
  include: ['**/*.test.ts'],
  exclude: ['**/node_modules/**'],
  categories: [],
  
  // 性能配置
  performanceBudget: {
    maxDuration: 30000,   // 30秒
    maxMemory: 100,        // 100MB
    slowThreshold: 1000  // 1秒
  },
  
  // 覆盖率配置
  coverage: {
    enabled: false,
    threshold: 80,
    includeUntested: true
  },
  
  // 浏览器环境配置
  browser: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    timeout: 30000
  },
  
  // 模拟配置
  mocks: {
    network: true,
    storage: true,
    clipboard: true,
    dom: true
  }
};

/**
 * 开发环境配置
 */
export const developmentConfig: Partial<TestConfig> = {
  timeout: 10000,
  verbose: true,
  bail: false,
  colors: true,
  parallel: false,
  generateReport: true,
  performanceBudget: {
    maxDuration: 60000,      // 开发时允许更长时间
    maxMemory: 200,
    slowThreshold: 2000
  }
};

/**
 * 生产环境配置（CI/CD）
 */
export const productionConfig: Partial<TestConfig> = {
  timeout: 5000,
  verbose: false,
  bail: true,
  colors: false,
  parallel: true,
  silent: false,
  generateReport: true,
  reportFormat: 'json',
  performanceBudget: {
    maxDuration: 20000,      // 生产环境要求更严格
    maxMemory: 50,
    slowThreshold: 500
  },
  coverage: {
  enabled: true,
    threshold: 85,
    includeUntested: true
  }
};

/**
 * 快速测试配置（仅核心功能）
 */
export const quickConfig: Partial<TestConfig> = {
  timeout: 2000,
  verbose: false,
  bail: false,
  parallel: true,
  categories: ['core', 'critical'],
  performanceBudget: {
    maxDuration: 10000,
    maxMemory: 30,
    slowThreshold: 200
  }
};

/**
 * 性能测试配置
 */
export const performanceConfig: Partial<TestConfig> = {
  timeout: 30000,
  verbose: true,
  bail: false,
  categories: ['performance', 'memory', 'batch'],
  performanceBudget: {
    maxDuration: 60000,
    maxMemory: 500,        // 性能测试可能需要更多内存
    slowThreshold: 100     // 更严格的性能要求
  }
};

/**
 * 测试环境枚举
 */
export enum TestEnvironment {
  DEVELOPMENT = 'development',
  PRODUCTION = 'production',
  QUICK = 'quick',
  PERFORMANCE = 'performance'
}

/**
 * 根据环境获取配置
 */
export function getConfig(environment: TestEnvironment = TestEnvironment.DEVELOPMENT): TestConfig {
  let envConfig: Partial<TestConfig>;
  
  switch (environment) {
  case TestEnvironment.PRODUCTION:
  envConfig = productionConfig;
      break;
    case TestEnvironment.QUICK:
      envConfig = quickConfig;
      break;
  case TestEnvironment.PERFORMANCE:
      envConfig = performanceConfig;
      break;
    case TestEnvironment.DEVELOPMENT:
    default:
      envConfig = developmentConfig;
      break;
  }
  
  return { ...defaultConfig, ...envConfig };
}

/**
 * 验证配置有效性
 */
export function validateConfig(config: TestConfig): string[] {
  const errors: string[] = [];
  
  if (config.timeout <= 0) {
    errors.push('Timeout must be greater than 0');
  }
  
  if (config.retries < 0) {
    errors.push('Retries must be non-negative');
  }
  
  if (config.performanceBudget.maxDuration <= 0) {
    errors.push('Performance budget maxDuration must be greater than 0');
  }
  
  if (config.performanceBudget.maxMemory <= 0) {
    errors.push('Performance budget maxMemory must be greater than 0');
  }
  
  if (config.coverage.threshold < 0 || config.coverage.threshold > 100) {
    errors.push('Coverage threshold must be between 0 and 100');
  }
  
  if (!['json', 'html', 'xml'].includes(config.reportFormat)) {
    errors.push('Report format must be json, html, or xml');
  }
  
  return errors;
}

/**
 * 测试分类定义
 */
export const TEST_CATEGORIES = {
  CORE: [
    'Internationalization',
    'Error Handling',
    'Cache Management',
    'Memory Management'
  ],
  EXTENSION: [
    'Twitter Content Parsing',
    'Content Formatting',
    'Clipboard Operations',
    'Screenshot Functionality'
  ],
  INTEGRATION: [
    'Storage and Settings',
  'DOM Operations',
    'Batch Processing'
  ],
  PERFORMANCE: [
    'Performance and Limits',
    'Memory Management',
    'Batch Processing'
  ],
  EDGE_CASES: [
    'Edge Cases and Exception Handling'
  ]
} as const;

/**
 * 预定义的测试套件配置
 */
export const TEST_SUITES = {
  // 完整测试套件
  FULL: {
    name: 'Full Test Suite',
    categories: Object.values(TEST_CATEGORIES).flat(),
    config: getConfig(TestEnvironment.DEVELOPMENT)
  },
  
  // 核心功能测试
  CORE: {
    name: 'Core Functionality Tests',
    categories: TEST_CATEGORIES.CORE,
    config: getConfig(TestEnvironment.QUICK)
  },
  
  // 扩展特定功能测试
  EXTENSION: {
    name: 'Extension Specific Tests',
    categories: TEST_CATEGORIES.EXTENSION,
    config: getConfig(TestEnvironment.DEVELOPMENT)
  },
  
  // 集成测试
  INTEGRATION: {
    name: 'Integration Tests',
    categories: TEST_CATEGORIES.INTEGRATION,
    config: getConfig(TestEnvironment.DEVELOPMENT)
  },
  
  // 性能测试
  PERFORMANCE: {
    name: 'Performance Tests',
    categories: TEST_CATEGORIES.PERFORMANCE,
    config: getConfig(TestEnvironment.PERFORMANCE)
  },
  
  // 回归测试（关键功能）
  REGRESSION: {
    name: 'Regression Tests',
    categories: [...TEST_CATEGORIES.CORE, ...TEST_CATEGORIES.EXTENSION],
    config: {
      ...getConfig(TestEnvironment.PRODUCTION),
      bail: true,
      coverage: { enabled: true, threshold: 90, includeUntested: true }
    }
  },
  
  // 冒烟测试（最小测试集）
  SMOKE: {
  name: 'Smoke Tests',
    categories: ['Error Handling', 'Twitter Content Parsing', 'Clipboard Operations'],
    config: {
      ...getConfig(TestEnvironment.QUICK),
      timeout: 1000,
      performanceBudget: {
        maxDuration: 5000,
      maxMemory: 20,
        slowThreshold: 100
      }
    }
  }
} as const;

/**
 * 测试标签定义
 */
export const TEST_TAGS = {
  // 优先级标签
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  
  // 类型标签
  UNIT: 'unit',
  INTEGRATION: 'integration',
  E2E: 'e2e',
  PERFORMANCE: 'performance',
  
  // 功能标签
  CORE: 'core',
  EXTENSION: 'extension',
  UI: 'ui',
  API: 'api',
  
  // 环境标签
  BROWSER: 'browser',
  NODE: 'node',
  MOCK: 'mock',
  REAL: 'real',
  
  // 状态标签
  STABLE: 'stable',
  FLAKY: 'flaky',
  SKIP: 'skip',
  WIP: 'wip'
} as const;

/**
 * 导出所有配置
 */
export {
  TestConfig,
  defaultConfig,
  developmentConfig,
  productionConfig,
  quickConfig,
  performanceConfig
};