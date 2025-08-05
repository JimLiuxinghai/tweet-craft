# Tweet Craft Extension - Test Suite

本目录包含 Tweet Craft 浏览器扩展的完整测试套件，确保所有核心功能和边界情况都得到充分测试。

## 📁 文件结构

```
tests/
├── README.md        # 测试文档（本文件）
├── test-framework.ts# 轻量级测试框架
├── core-functionality.test.ts # 核心功能测试
├── extension-specific.test.ts  # 扩展特定功能测试
├── run-tests.ts     # 测试执行入口
└── test-runner.html # 浏览器测试界面
```

## 🧪 测试框架

### 自定义轻量级框架
我们使用自定义的轻量级测试框架，专门为浏览器扩展环境优化：

- **Assert 类**: 提供各种断言方法
- **MockHelper 类**: 提供模拟工具
- **TestRunner 类**: 管理测试执行
- **便捷函数**: `describe`, `it` 等

### 主要特性
- ✅ 零依赖，纯 TypeScript 实现
- ✅ 支持异步测试
- ✅ 内置超时处理
- ✅ 模拟 DOM 和 API
- ✅ 详细的测试报告
- ✅ 性能基准测试

## 📊 测试覆盖范围

### 核心功能测试 (62个测试用例)

#### 1. 国际化系统 (7 tests)
- ✅ 语言检测
- ✅ 翻译功能
- ✅ 参数插值
- ✅ 语言切换
- ✅ 错误处理
- ✅ 相对时间格式化
- ✅ 区域设置验证

#### 2. 错误处理系统 (6 tests)
- ✅ ExtensionError 创建
- ✅ 标准错误规范化
- ✅ 错误分类
- ✅ 统计追踪
- ✅ 冷却机制
- ✅ 恢复策略

#### 3. 缓存管理系统 (5 tests)
- ✅ 数据存储/检索
- ✅ TTL 过期处理
- ✅ 缓存大小限制
- ✅ 缓存清理
- ✅ 键验证

#### 4. 内存管理系统 (4 tests)
- ✅ 内存使用监控
- ✅ 内存压力检测
- ✅ 自动清理触发
- ✅ 统计信息

#### 5. 批量处理系统 (5 tests)
- ✅ 批处理执行
- ✅ 错误处理
- ✅ 并发控制
- ✅ 进度回调
- ✅ 统计信息

### 扩展特定功能测试

#### 6. Twitter 内容解析 (6 tests)
- ✅ 推文元素识别
- ✅ 文本内容提取
- ✅ 作者信息提取
- ✅ 交互数据提取
- ✅ 媒体内容处理
- ✅ 线程识别

#### 7. 内容格式化 (5 tests)
- ✅ 纯文本格式化
- ✅ Markdown 格式化
- ✅ HTML 格式化
- ✅ 特殊字符处理
- ✅ 空内容处理

#### 8. 剪贴板操作 (4 tests)
- ✅ API 可用性检测
- ✅ 权限状态处理
- ✅ execCommand 降级
- ✅ 错误处理

#### 9. 截图功能 (4 tests)
- ✅ Canvas 支持检测
- ✅ 配置选项处理
- ✅ 尺寸验证
- ✅ 错误处理

#### 10. 存储和设置 (4 tests)
- ✅ 偏好设置保存/加载
- ✅ 存储配额处理
- ✅ 设置值验证
- ✅ 旧格式迁移

#### 11. 性能和限制 (3 tests)
- ✅ 大内容处理
- ✅ 并发限制
- ✅ 操作超时

#### 12. DOM 操作 (3 tests)
- ✅ 模拟元素创建
- ✅ 缺失元素处理
- ✅ 属性验证

#### 13. 边界情况处理 (6 tests)
- ✅ Null/Undefined 输入
- ✅ 超大数据处理
- ✅ 快速连续操作
- ✅ Unicode 和特殊字符
- ✅ 循环引用处理
- ✅ 并发访问

## 🚀 运行测试

### 方法1: 浏览器环境
```bash
# 打开测试界面
open tests/test-runner.html
```

### 方法2: 命令行环境 (如果支持)
```bash
# 使用 TypeScript 直接运行
npx ts-node tests/run-tests.ts

# 或编译后运行
tsc tests/run-tests.ts && node tests/run-tests.js
```

### 方法3: 开发者工具
```javascript
// 在浏览器控制台中运行
await runTests();
```

## 📋 测试类型

### 单元测试
- 测试单个函数和类的功能
- 验证输入输出的正确性
- 覆盖正常和异常情况

### 集成测试
- 测试组件间的交互
- 验证数据流和状态管理
- 确保系统协调工作

### 端到端测试
- 模拟真实用户场景
- 测试完整工作流程
- 验证用户体验

### 性能测试
- 测量操作执行时间
- 监控内存使用情况
- 验证并发处理能力

### 边界测试
- 测试极限输入情况
- 验证错误处理机制
- 确保系统稳定性

## 🔧 模拟和工具

### MockHelper 工具
- `mockFetch()`: 模拟网络请求
- `mockDOM()`: 创建模拟 DOM 环境
- `createMockElement()`: 创建模拟 DOM 元素
- `restoreFetch()`: 恢复原始 fetch

### Assert 断言方法
- `isTrue()` / `isFalse()`: 布尔断言
- `equals()` / `deepEquals()`: 相等性断言
- `notNull()`: 非空断言
- `throws()` / `throwsAsync()`: 异常断言
- `arrayIncludes()` / `arrayLength()`: 数组断言
- `stringContains()` / `matches()`: 字符串断言

## 📈 测试报告

### 控制台输出
- ✅/❌ 实时测试状态
- 📊 详细统计信息
- ⏱️ 执行时间测量
- 📋 失败测试详情

### JSON 报告 (可选)
```json
{
  "summary": {
    "total": 62,
    "passed": 58,
    "failed": 4,
    "successRate": "93.5%",
    "totalDuration": "2340.45ms"
  },
  "failedTests": [...],
  "categories": {...}
}
```

## 🏥 系统健康检查

运行测试前会自动执行健康检查：

- ✅ DOM API 可用性
- ✅ Local Storage 支持
- ✅ Clipboard API 支持
- ✅ Canvas 渲染支持
- ✅ Fetch API 支持
- ✅ Promise 支持
- ✅ ES6 特性支持

## 🎯 测试最佳实践

### 1. 测试命名
- 使用描述性名称
- 说明预期行为
- 包含测试条件

### 2. 断言编写
- 一个测试一个断言焦点
- 提供清晰的错误消息
- 使用合适的断言方法

### 3. 模拟数据
- 创建真实的测试数据
- 覆盖各种数据类型
- 包含边界情况

### 4. 异步处理
- 正确使用 async/await
- 设置合理的超时时间
- 处理 Promise 拒绝

### 5. 清理工作
- 恢复模拟的 API
- 清理测试数据
- 重置全局状态

## 🔍 调试测试

### 在浏览器中调试
1. 打开 `test-runner.html`
2. 打开开发者工具
3. 在测试代码中设置断点
4. 运行特定测试

### 常见问题排查
- **测试超时**: 检查异步操作
- **断言失败**: 验证期望值
- **模拟不工作**: 确保正确设置和清理
- **内存泄漏**: 检查事件监听器清理

## 📝 添加新测试

### 1. 创建测试套件
```typescript
const newTests = describe('New Feature', () => [
  it('should do something', async () => {
    // 测试代码
  })
]);
```

### 2. 注册测试
```typescript
testRunner.addSuite(newTests);
```

### 3. 更新文档
- 在本 README 中添加测试描述
- 更新测试计数
- 记录新的测试类别

## 🚨 持续集成

测试可以集成到 CI/CD 流程中：

```yaml
# GitHub Actions 示例
- name: Run Tests
  run: npx ts-node tests/run-tests.ts
- name: Generate Report
  run: cat test-report.json
```

## 📊 测试指标目标

- **覆盖率**: > 90%
- **成功率**: > 95%
- **执行时间**: < 5秒
- **内存使用**: < 50MB
- **错误率**: < 5%

## 🔄 定期维护

### 每次发布前
- ✅ 运行完整测试套件
- ✅ 检查成功率
- ✅ 更新测试用例
- ✅ 修复失败的测试

### 每月维护
- 🔄 审查测试覆盖率
- 🔄 清理过时的测试
- 🔄 优化测试性能
- 🔄 更新模拟数据

---

**最后更新**: 2024年1月
**测试套件版本**: 1.0.0
**总测试数量**: 62个测试用例