/**
 * 截图功能核心接口定义
 * Core interfaces for screenshot functionality
 */

/**
 * 截图管理器接口
 * Screenshot Manager Interface
 */
class IScreenshotManager {
  constructor(options = {}) {
    throw new Error('Interface cannot be instantiated directly');
  }

  /**
   * 捕获单个推文截图
   * @param {HTMLElement} tweetElement - 推文DOM元素
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob>} 截图数据
   */
  async captureScreenshot(tweetElement, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * 批量捕获推文截图
   * @param {HTMLElement[]} tweetElements - 推文DOM元素数组
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob[]>} 截图数据数组
   */
  async captureBatch(tweetElements, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * 捕获线程截图
   * @param {HTMLElement[]} threadElements - 线程推文DOM元素数组
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob>} 线程截图数据
   */
  async captureThread(threadElements, options = {}) {
    throw new Error('Method must be implemented');
  }

  /**
   * 更新设置
   * @param {Object} newSettings - 新设置
   */
  updateSettings(newSettings) {
    throw new Error('Method must be implemented');
  }

  /**
   * 获取当前设置
   * @returns {Object} 当前设置
   */
  getSettings() {
    throw new Error('Method must be implemented');
  }

  /**
   * 重置设置为默认值
   */
  resetSettings() {
    throw new Error('Method must be implemented');
  }
}

/**
 * 截图渲染器接口
 * Screenshot Renderer Interface
 */
class IScreenshotRenderer {
  constructor() {
    throw new Error('Interface cannot be instantiated directly');
  }

  /**
   * 渲染单个推文
   * @param {Object} tweetData - 推文数据
   * @param {Object} styleConfig - 样式配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderTweet(tweetData, styleConfig) {
    throw new Error('Method must be implemented');
  }

  /**
   * 渲染线程推文
   * @param {Object[]} threadData - 线程推文数据数组
   * @param {Object} styleConfig - 样式配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderThread(threadData, styleConfig) {
    throw new Error('Method must be implemented');
  }

  /**
   * 将HTML内容渲染到Canvas
   * @param {string} htmlContent - HTML内容
   * @param {Object} dimensions - 尺寸配置
   * @returns {Promise<HTMLCanvasElement>} 渲染后的Canvas
   */
  async renderToCanvas(htmlContent, dimensions) {
    throw new Error('Method must be implemented');
  }

  /**
   * 创建推文模板
   * @param {Object} tweetData - 推文数据
   * @param {Object} styleConfig - 样式配置
   * @returns {string} HTML模板
   */
  createTweetTemplate(tweetData, styleConfig) {
    throw new Error('Method must be implemented');
  }

  /**
   * 优化元素用于截图
   * @param {HTMLElement} element - DOM元素
   * @returns {HTMLElement} 优化后的元素
   */
  optimizeForScreenshot(element) {
    throw new Error('Method must be implemented');
  }

  /**
   * 处理媒体内容
   * @param {Object} mediaData - 媒体数据
   * @returns {Promise<string>} 处理后的媒体HTML
   */
  async handleMediaContent(mediaData) {
    throw new Error('Method must be implemented');
  }
}

/**
 * 样式管理器接口
 * Style Manager Interface
 */
class IStyleManager {
  constructor() {
    throw new Error('Interface cannot be instantiated directly');
  }

  /**
   * 获取主题
   * @param {string} themeName - 主题名称
   * @returns {Object} 主题配置
   */
  getTheme(themeName) {
    throw new Error('Method must be implemented');
  }

  /**
   * 创建自定义主题
   * @param {Object} themeConfig - 主题配置
   * @returns {Object} 创建的主题
   */
  createCustomTheme(themeConfig) {
    throw new Error('Method must be implemented');
  }

  /**
   * 应用主题到元素
   * @param {HTMLElement} element - DOM元素
   * @param {string} themeName - 主题名称
   */
  applyTheme(element, themeName) {
    throw new Error('Method must be implemented');
  }

  /**
   * 生成CSS样式
   * @param {Object} styleConfig - 样式配置
   * @returns {string} CSS字符串
   */
  generateCSS(styleConfig) {
    throw new Error('Method must be implemented');
  }

  /**
   * 优化样式用于截图
   * @param {Object} styles - 样式对象
   * @returns {Object} 优化后的样式
   */
  optimizeForScreenshot(styles) {
    throw new Error('Method must be implemented');
  }

  /**
   * 处理响应式设计
   * @param {Object} dimensions - 尺寸配置
   * @returns {Object} 响应式样式
   */
  handleResponsiveDesign(dimensions) {
    throw new Error('Method must be implemented');
  }
}

/**
 * 导出管理器接口
 * Export Manager Interface
 */
class IExportManager {
  constructor() {
    throw new Error('Interface cannot be instantiated directly');
  }

  /**
   * 导出为图片
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @param {string} format - 图片格式
   * @param {number} quality - 图片质量
   * @returns {Promise<Blob>} 图片数据
   */
  async exportAsImage(canvas, format, quality) {
    throw new Error('Method must be implemented');
  }

  /**
   * 批量导出
   * @param {HTMLCanvasElement[]} canvases - Canvas数组
   * @param {string} format - 图片格式
   * @param {Object} options - 导出选项
   * @returns {Promise<Blob[]>} 图片数据数组
   */
  async exportBatch(canvases, format, options) {
    throw new Error('Method must be implemented');
  }

  /**
   * 创建ZIP压缩包
   * @param {Object[]} files - 文件数据数组
   * @returns {Promise<Blob>} ZIP数据
   */
  async createZipArchive(files) {
    throw new Error('Method must be implemented');
  }

  /**
   * 生成文件名
   * @param {Object} tweetData - 推文数据
   * @param {string} format - 文件格式
   * @returns {string} 文件名
   */
  generateFilename(tweetData, format) {
    throw new Error('Method must be implemented');
  }

  /**
   * 优化文件大小
   * @param {Blob} imageData - 图片数据
   * @param {number} targetSize - 目标大小（字节）
   * @returns {Promise<Blob>} 优化后的图片数据
   */
  async optimizeFileSize(imageData, targetSize) {
    throw new Error('Method must be implemented');
  }

  /**
   * 验证导出设置
   * @param {Object} settings - 导出设置
   * @returns {boolean} 是否有效
   */
  validateExportSettings(settings) {
    throw new Error('Method must be implemented');
  }
}

/**
 * 错误恢复接口
 * Error Recovery Interface
 */
class IErrorRecovery {
  /**
   * 处理渲染错误
   * @param {Error} error - 错误对象
   * @param {Object} tweetData - 推文数据
   * @param {Object} config - 配置
   * @returns {Promise<any>} 恢复结果
   */
  static async handleRenderError(error, tweetData, config) {
    throw new Error('Method must be implemented');
  }

  /**
   * 降级渲染
   * @param {Object} tweetData - 推文数据
   * @param {Object} config - 配置
   * @returns {Promise<any>} 渲染结果
   */
  static async fallbackRender(tweetData, config) {
    throw new Error('Method must be implemented');
  }

  /**
   * 基础渲染
   * @param {Object} tweetData - 推文数据
   * @param {Object} config - 配置
   * @returns {Promise<any>} 渲染结果
   */
  static async basicRender(tweetData, config) {
    throw new Error('Method must be implemented');
  }
}

// 导出接口
if (typeof window !== 'undefined') {
  window.ScreenshotInterfaces = {
    IScreenshotManager,
    IScreenshotRenderer,
    IStyleManager,
    IExportManager,
    IErrorRecovery
  };
}