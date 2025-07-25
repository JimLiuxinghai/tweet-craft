/**
 * 截图管理器核心实现
 * Screenshot Manager Core Implementation
 */

/**
 * 截图管理器类
 * 负责协调截图功能的各个组件
 */
class ScreenshotManager {
  constructor(options = {}) {
    this.renderer = null;
    this.styleManager = null;
    this.exportManager = null;
    this.settings = this.loadSettings();
    this.isInitialized = false;
    
    // 初始化配置
    this.config = {
      maxConcurrentScreenshots: 3,
      screenshotTimeout: 30000,
      retryAttempts: 2,
      ...options
    };
    
    // 初始化组件
    this.initializeComponents();
  }

  /**
   * 初始化各个组件
   */
  async initializeComponents() {
    try {
      // 等待依赖加载
      await this.waitForDependencies();
      
      // 初始化HTML2Canvas包装器
      if (window.html2canvasWrapper) {
        await window.html2canvasWrapper.loadLibrary();
      }
      
      // 初始化截图渲染器
      if (window.ScreenshotRenderer) {
        this.renderer = new window.ScreenshotRenderer();
        console.log('✅ 截图渲染器初始化完成');
      }
      
      this.isInitialized = true;
      console.log('✅ 截图管理器初始化完成');
      
    } catch (error) {
      console.error('❌ 截图管理器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 等待依赖组件加载
   */
  async waitForDependencies(maxWaitTime = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      if (window.TweetParser && window.html2canvasWrapper && window.ScreenshotRenderer) {
        return Promise.resolve();
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('截图管理器依赖组件加载超时');
  }

  /**
   * 捕获单个推文截图
   * @param {HTMLElement} tweetElement - 推文DOM元素
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob>} 截图数据
   */
  async captureScreenshot(tweetElement, options = {}) {
    if (!this.isInitialized) {
      await this.initializeComponents();
    }

    if (!tweetElement || !tweetElement.nodeType) {
      throw new Error('无效的推文元素');
    }

    try {
      // 合并配置
      const config = {
        ...this.settings,
        ...options
      };

      // 解析推文数据
      const tweetData = this.extractTweetData(tweetElement);
      
      // 预处理推文元素
      const processedElement = this.preprocessTweetElement(tweetElement, config);
      
      // 生成截图
      const canvas = await this.renderTweetToCanvas(processedElement, tweetData, config);
      
      // 转换为Blob
      const blob = await this.canvasToBlob(canvas, config.export.format, config.export.quality);
      
      console.log('✅ 推文截图生成成功');
      return blob;
      
    } catch (error) {
      console.error('❌ 推文截图生成失败:', error);
      
      // 尝试错误恢复
      return await this.handleScreenshotError(error, tweetElement, options);
    }
  }

  /**
   * 批量捕获推文截图
   * @param {HTMLElement[]} tweetElements - 推文DOM元素数组
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob[]>} 截图数据数组
   */
  async captureBatch(tweetElements, options = {}) {
    if (!Array.isArray(tweetElements) || tweetElements.length === 0) {
      throw new Error('无效的推文元素数组');
    }

    const results = [];
    const errors = [];
    const config = { ...this.settings, ...options };
    
    // 分批处理以避免性能问题
    const batchSize = Math.min(this.config.maxConcurrentScreenshots, tweetElements.length);
    
    for (let i = 0; i < tweetElements.length; i += batchSize) {
      const batch = tweetElements.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (element, index) => {
        try {
          const blob = await this.captureScreenshot(element, config);
          return { index: i + index, blob, success: true };
        } catch (error) {
          errors.push({ index: i + index, error });
          return { index: i + index, blob: null, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 进度回调
      if (options.onProgress) {
        options.onProgress({
          completed: Math.min(i + batchSize, tweetElements.length),
          total: tweetElements.length,
          errors: errors.length
        });
      }
    }
    
    // 返回成功的截图
    const successfulResults = results
      .filter(result => result.success)
      .sort((a, b) => a.index - b.index)
      .map(result => result.blob);
    
    if (errors.length > 0) {
      console.warn(`批量截图完成，${errors.length} 个失败:`, errors);
    }
    
    return successfulResults;
  }

  /**
   * 捕获线程截图
   * @param {HTMLElement[]} threadElements - 线程推文DOM元素数组
   * @param {Object} options - 截图选项
   * @returns {Promise<Blob>} 线程截图数据
   */
  async captureThread(threadElements, options = {}) {
    if (!Array.isArray(threadElements) || threadElements.length === 0) {
      throw new Error('无效的线程元素数组');
    }

    try {
      const config = { ...this.settings, ...options };
      
      // 解析线程数据
      const threadData = threadElements.map(element => this.extractTweetData(element));
      
      // 创建线程容器
      const threadContainer = this.createThreadContainer(threadElements, config);
      
      // 渲染线程截图
      const canvas = await this.renderThreadToCanvas(threadContainer, threadData, config);
      
      // 转换为Blob
      const blob = await this.canvasToBlob(canvas, config.export.format, config.export.quality);
      
      console.log(`✅ 线程截图生成成功 (${threadElements.length} 条推文)`);
      return blob;
      
    } catch (error) {
      console.error('❌ 线程截图生成失败:', error);
      throw error;
    }
  }

  /**
   * 提取推文数据
   * @param {HTMLElement} tweetElement - 推文元素
   * @returns {Object} 推文数据
   */
  extractTweetData(tweetElement) {
    if (window.TweetParser) {
      return window.TweetParser.extractTweetData(tweetElement);
    }
    
    // 降级数据提取
    return this.basicTweetDataExtraction(tweetElement);
  }

  /**
   * 基础推文数据提取（降级方案）
   * @param {HTMLElement} tweetElement - 推文元素
   * @returns {Object} 基础推文数据
   */
  basicTweetDataExtraction(tweetElement) {
    const textElement = tweetElement.querySelector('[data-testid="tweetText"]');
    const authorElement = tweetElement.querySelector('[data-testid="User-Name"]');
    const timeElement = tweetElement.querySelector('time');
    
    return {
      id: Date.now().toString(),
      content: {
        text: textElement?.textContent || '',
        html: textElement?.innerHTML || ''
      },
      author: {
        name: authorElement?.textContent || '未知用户',
        username: '@unknown'
      },
      metadata: {
        timestamp: timeElement?.getAttribute('datetime') || new Date().toISOString()
      }
    };
  }

  /**
   * 预处理推文元素
   * @param {HTMLElement} tweetElement - 推文元素
   * @param {Object} config - 配置
   * @returns {HTMLElement} 处理后的元素
   */
  preprocessTweetElement(tweetElement, config) {
    // 创建深拷贝
    const clonedElement = tweetElement.cloneNode(true);
    
    // 移除干扰元素
    this.removeInterferingElements(clonedElement);
    
    // 应用样式优化
    this.applyScreenshotStyles(clonedElement, config);
    
    return clonedElement;
  }

  /**
   * 移除干扰元素
   * @param {HTMLElement} element - 元素
   */
  removeInterferingElements(element) {
    const selectorsToRemove = [
      '.super-copy-btn',
      '[role="tooltip"]',
      '[data-testid="toolTip"]',
      '.r-1loqt21'
    ];

    selectorsToRemove.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  /**
   * 应用截图样式
   * @param {HTMLElement} element - 元素
   * @param {Object} config - 配置
   */
  applyScreenshotStyles(element, config) {
    // 设置基础样式
    element.style.backgroundColor = config.style.backgroundColor;
    element.style.padding = `${config.style.padding}px`;
    element.style.borderRadius = `${config.style.borderRadius}px`;
    
    if (config.style.shadow) {
      element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    }
  }

  /**
   * 渲染推文到Canvas
   * @param {HTMLElement} element - 推文元素
   * @param {Object} tweetData - 推文数据
   * @param {Object} config - 配置
   * @returns {Promise<HTMLCanvasElement>}
   */
  async renderTweetToCanvas(element, tweetData, config) {
    // 如果有渲染器，使用新的渲染器
    if (this.renderer) {
      return await this.renderer.renderTweet(tweetData, config.style);
    }
    
    // 降级到直接使用html2canvas
    const options = {
      backgroundColor: config.style.backgroundColor,
      scale: config.dimensions.scale,
      width: config.dimensions.width,
      height: config.dimensions.height === 'auto' ? null : config.dimensions.height
    };

    return await window.html2canvasWrapper.captureElement(element, options);
  }

  /**
   * 创建线程容器
   * @param {HTMLElement[]} threadElements - 线程元素数组
   * @param {Object} config - 配置
   * @returns {HTMLElement} 线程容器
   */
  createThreadContainer(threadElements, config) {
    const container = document.createElement('div');
    container.style.cssText = `
      background-color: ${config.style.backgroundColor};
      padding: ${config.style.padding}px;
      border-radius: ${config.style.borderRadius}px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: ${config.dimensions.width}px;
    `;

    threadElements.forEach((element, index) => {
      const processedElement = this.preprocessTweetElement(element, config);
      
      // 添加线程连接线（除了最后一个）
      if (index < threadElements.length - 1) {
        const connector = document.createElement('div');
        connector.style.cssText = `
          width: 2px;
          height: 16px;
          background-color: #ccd6dd;
          margin: 8px 0 8px 24px;
        `;
        processedElement.appendChild(connector);
      }
      
      container.appendChild(processedElement);
    });

    return container;
  }

  /**
   * 渲染线程到Canvas
   * @param {HTMLElement} container - 线程容器
   * @param {Object[]} threadData - 线程数据
   * @param {Object} config - 配置
   * @returns {Promise<HTMLCanvasElement>}
   */
  async renderThreadToCanvas(container, threadData, config) {
    // 如果有渲染器，使用新的渲染器
    if (this.renderer) {
      return await this.renderer.renderThread(threadData, config.style);
    }
    
    // 降级到直接使用html2canvas
    const options = {
      backgroundColor: config.style.backgroundColor,
      scale: config.dimensions.scale,
      width: config.dimensions.width
    };

    return await window.html2canvasWrapper.captureElement(container, options);
  }

  /**
   * Canvas转Blob
   * @param {HTMLCanvasElement} canvas - Canvas元素
   * @param {string} format - 格式
   * @param {number} quality - 质量
   * @returns {Promise<Blob>}
   */
  async canvasToBlob(canvas, format = 'png', quality = 0.9) {
    return new Promise((resolve, reject) => {
      const mimeType = format === 'jpg' ? 'image/jpeg' : `image/${format}`;
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas转Blob失败'));
        }
      }, mimeType, quality);
    });
  }

  /**
   * 处理截图错误
   * @param {Error} error - 错误对象
   * @param {HTMLElement} tweetElement - 推文元素
   * @param {Object} options - 选项
   * @returns {Promise<Blob>}
   */
  async handleScreenshotError(error, tweetElement, options) {
    console.warn('尝试错误恢复:', error.message);
    
    // 简化配置重试
    const fallbackOptions = {
      ...options,
      style: {
        ...options.style,
        shadow: false
      },
      dimensions: {
        ...options.dimensions,
        scale: 1
      }
    };
    
    try {
      return await this.captureScreenshot(tweetElement, fallbackOptions);
    } catch (fallbackError) {
      console.error('错误恢复失败:', fallbackError);
      throw new Error(`截图失败: ${error.message}`);
    }
  }

  /**
   * 加载设置
   * @returns {Object} 设置对象
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('screenshot-settings');
      const defaultSettings = this.getDefaultSettings();
      
      if (saved) {
        const parsedSettings = JSON.parse(saved);
        const validatedSettings = this.validateAndMergeSettings(parsedSettings, defaultSettings);
        return validatedSettings;
      }
      
      return defaultSettings;
    } catch (error) {
      console.warn('设置加载失败，使用默认设置:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 获取默认设置
   * @returns {Object} 默认设置对象
   */
  getDefaultSettings() {
    return {
      dimensions: {
        width: 600,
        height: 'auto',
        aspectRatio: null,
        scale: 2
      },
      style: {
        theme: 'light',
        backgroundColor: '#ffffff',
        textColor: '#000000',
        accentColor: '#1da1f2',
        fontFamily: 'system-ui',
        fontSize: 16,
        lineHeight: 1.5,
        borderRadius: 12,
        padding: 20,
        shadow: true
      },
      content: {
        includeAuthor: true,
        includeTimestamp: true,
        includeMedia: true,
        includeMetrics: false,
        includeUrl: false,
        showBranding: true,
        watermark: null
      },
      export: {
        format: 'png',
        quality: 0.9,
        filename: 'auto',
        filenameTemplate: '{author}_{date}_{id}'
      }
    };
  }

  /**
   * 验证并合并设置
   * @param {Object} userSettings - 用户设置
   * @param {Object} defaultSettings - 默认设置
   * @returns {Object} 验证后的设置
   */
  validateAndMergeSettings(userSettings, defaultSettings) {
    const validatedSettings = JSON.parse(JSON.stringify(defaultSettings));
    
    try {
      // 验证尺寸设置
      if (userSettings.dimensions) {
        validatedSettings.dimensions = this.validateDimensions(userSettings.dimensions, defaultSettings.dimensions);
      }
      
      // 验证样式设置
      if (userSettings.style) {
        validatedSettings.style = this.validateStyle(userSettings.style, defaultSettings.style);
      }
      
      // 验证内容设置
      if (userSettings.content) {
        validatedSettings.content = this.validateContent(userSettings.content, defaultSettings.content);
      }
      
      // 验证导出设置
      if (userSettings.export) {
        validatedSettings.export = this.validateExport(userSettings.export, defaultSettings.export);
      }
      
      return validatedSettings;
    } catch (error) {
      console.warn('设置验证失败，使用默认设置:', error);
      return defaultSettings;
    }
  }

  /**
   * 验证尺寸设置
   * @param {Object} dimensions - 尺寸设置
   * @param {Object} defaultDimensions - 默认尺寸设置
   * @returns {Object} 验证后的尺寸设置
   */
  validateDimensions(dimensions, defaultDimensions) {
    const validated = { ...defaultDimensions };
    
    // 验证宽度
    if (typeof dimensions.width === 'number' && dimensions.width > 0 && dimensions.width <= 4000) {
      validated.width = dimensions.width;
    }
    
    // 验证高度
    if (dimensions.height === 'auto' || (typeof dimensions.height === 'number' && dimensions.height > 0 && dimensions.height <= 4000)) {
      validated.height = dimensions.height;
    }
    
    // 验证宽高比
    if (typeof dimensions.aspectRatio === 'string' && /^\d+:\d+$/.test(dimensions.aspectRatio)) {
      validated.aspectRatio = dimensions.aspectRatio;
    }
    
    // 验证缩放比例
    if (typeof dimensions.scale === 'number' && dimensions.scale >= 0.5 && dimensions.scale <= 4) {
      validated.scale = dimensions.scale;
    }
    
    return validated;
  }

  /**
   * 验证样式设置
   * @param {Object} style - 样式设置
   * @param {Object} defaultStyle - 默认样式设置
   * @returns {Object} 验证后的样式设置
   */
  validateStyle(style, defaultStyle) {
    const validated = { ...defaultStyle };
    
    // 验证主题
    const validThemes = ['light', 'dark', 'high-contrast', 'custom'];
    if (validThemes.includes(style.theme)) {
      validated.theme = style.theme;
    }
    
    // 验证颜色值
    const colorFields = ['backgroundColor', 'textColor', 'accentColor'];
    colorFields.forEach(field => {
      if (this.isValidColor(style[field])) {
        validated[field] = style[field];
      }
    });
    
    // 验证字体设置
    if (typeof style.fontFamily === 'string' && style.fontFamily.length > 0) {
      validated.fontFamily = style.fontFamily;
    }
    
    if (typeof style.fontSize === 'number' && style.fontSize >= 10 && style.fontSize <= 32) {
      validated.fontSize = style.fontSize;
    }
    
    if (typeof style.lineHeight === 'number' && style.lineHeight >= 1 && style.lineHeight <= 3) {
      validated.lineHeight = style.lineHeight;
    }
    
    // 验证边框和间距
    if (typeof style.borderRadius === 'number' && style.borderRadius >= 0 && style.borderRadius <= 50) {
      validated.borderRadius = style.borderRadius;
    }
    
    if (typeof style.padding === 'number' && style.padding >= 0 && style.padding <= 100) {
      validated.padding = style.padding;
    }
    
    // 验证阴影设置
    if (typeof style.shadow === 'boolean') {
      validated.shadow = style.shadow;
    }
    
    return validated;
  }

  /**
   * 验证内容设置
   * @param {Object} content - 内容设置
   * @param {Object} defaultContent - 默认内容设置
   * @returns {Object} 验证后的内容设置
   */
  validateContent(content, defaultContent) {
    const validated = { ...defaultContent };
    
    // 验证布尔值设置
    const booleanFields = ['includeAuthor', 'includeTimestamp', 'includeMedia', 'includeMetrics', 'includeUrl', 'showBranding'];
    booleanFields.forEach(field => {
      if (typeof content[field] === 'boolean') {
        validated[field] = content[field];
      }
    });
    
    // 验证水印设置
    if (content.watermark === null || (typeof content.watermark === 'string' && content.watermark.length <= 100)) {
      validated.watermark = content.watermark;
    }
    
    return validated;
  }

  /**
   * 验证导出设置
   * @param {Object} exportSettings - 导出设置
   * @param {Object} defaultExport - 默认导出设置
   * @returns {Object} 验证后的导出设置
   */
  validateExport(exportSettings, defaultExport) {
    const validated = { ...defaultExport };
    
    // 验证格式
    const validFormats = ['png', 'jpg', 'jpeg', 'webp'];
    if (validFormats.includes(exportSettings.format)) {
      validated.format = exportSettings.format;
    }
    
    // 验证质量
    if (typeof exportSettings.quality === 'number' && exportSettings.quality >= 0.1 && exportSettings.quality <= 1) {
      validated.quality = exportSettings.quality;
    }
    
    // 验证文件名设置
    const validFilenameTypes = ['auto', 'custom'];
    if (validFilenameTypes.includes(exportSettings.filename)) {
      validated.filename = exportSettings.filename;
    }
    
    // 验证文件名模板
    if (typeof exportSettings.filenameTemplate === 'string' && exportSettings.filenameTemplate.length > 0) {
      validated.filenameTemplate = exportSettings.filenameTemplate;
    }
    
    return validated;
  }

  /**
   * 验证颜色值
   * @param {string} color - 颜色值
   * @returns {boolean} 是否为有效颜色
   */
  isValidColor(color) {
    if (typeof color !== 'string') return false;
    
    // 验证十六进制颜色
    if (/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color)) {
      return true;
    }
    
    // 验证RGB/RGBA颜色
    if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
      return true;
    }
    
    // 验证HSL/HSLA颜色
    if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+)?\s*\)$/.test(color)) {
      return true;
    }
    
    // 验证CSS颜色名称
    const cssColors = ['transparent', 'black', 'white', 'red', 'green', 'blue', 'yellow', 'cyan', 'magenta'];
    if (cssColors.includes(color.toLowerCase())) {
      return true;
    }
    
    return false;
  }

  /**
   * 更新设置
   * @param {Object} newSettings - 新设置
   */
  updateSettings(newSettings) {
    try {
      // 验证新设置
      const defaultSettings = this.getDefaultSettings();
      const validatedSettings = this.validateAndMergeSettings(newSettings, this.settings);
      
      // 合并到当前设置
      this.settings = { ...this.settings, ...validatedSettings };
      
      // 保存到本地存储
      localStorage.setItem('screenshot-settings', JSON.stringify(this.settings));
      console.log('✅ 截图设置已保存并验证');
      
      return { success: true, settings: this.settings };
    } catch (error) {
      console.warn('设置更新失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取当前设置
   * @returns {Object} 当前设置
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * 重置设置为默认值
   */
  resetSettings() {
    try {
      this.settings = this.getDefaultSettings();
      localStorage.removeItem('screenshot-settings');
      console.log('✅ 截图设置已重置');
      return { success: true, settings: this.settings };
    } catch (error) {
      console.warn('设置重置失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 验证设置配置（不更新当前设置）
   * @param {Object} settingsToValidate - 要验证的设置
   * @returns {Object} 验证结果
   */
  validateSettings(settingsToValidate) {
    try {
      const defaultSettings = this.getDefaultSettings();
      const validatedSettings = this.validateAndMergeSettings(settingsToValidate, defaultSettings);
      
      return {
        isValid: true,
        validatedSettings,
        errors: []
      };
    } catch (error) {
      return {
        isValid: false,
        validatedSettings: null,
        errors: [error.message]
      };
    }
  }

  /**
   * 获取设置验证规则
   * @returns {Object} 验证规则说明
   */
  getValidationRules() {
    return {
      dimensions: {
        width: { type: 'number', min: 1, max: 4000, description: '宽度必须在1-4000像素之间' },
        height: { type: 'number|string', values: ['auto'], min: 1, max: 4000, description: '高度必须为"auto"或1-4000像素之间的数字' },
        aspectRatio: { type: 'string', pattern: /^\d+:\d+$/, description: '宽高比格式必须为"数字:数字"，如"16:9"' },
        scale: { type: 'number', min: 0.5, max: 4, description: '缩放比例必须在0.5-4之间' }
      },
      style: {
        theme: { type: 'string', values: ['light', 'dark', 'high-contrast', 'custom'], description: '主题必须为预定义值之一' },
        backgroundColor: { type: 'string', format: 'color', description: '背景颜色必须为有效的CSS颜色值' },
        textColor: { type: 'string', format: 'color', description: '文本颜色必须为有效的CSS颜色值' },
        accentColor: { type: 'string', format: 'color', description: '强调色必须为有效的CSS颜色值' },
        fontFamily: { type: 'string', minLength: 1, description: '字体族不能为空' },
        fontSize: { type: 'number', min: 10, max: 32, description: '字体大小必须在10-32像素之间' },
        lineHeight: { type: 'number', min: 1, max: 3, description: '行高必须在1-3之间' },
        borderRadius: { type: 'number', min: 0, max: 50, description: '边框圆角必须在0-50像素之间' },
        padding: { type: 'number', min: 0, max: 100, description: '内边距必须在0-100像素之间' },
        shadow: { type: 'boolean', description: '阴影设置必须为布尔值' }
      },
      content: {
        includeAuthor: { type: 'boolean', description: '包含作者信息必须为布尔值' },
        includeTimestamp: { type: 'boolean', description: '包含时间戳必须为布尔值' },
        includeMedia: { type: 'boolean', description: '包含媒体内容必须为布尔值' },
        includeMetrics: { type: 'boolean', description: '包含互动数据必须为布尔值' },
        includeUrl: { type: 'boolean', description: '包含URL必须为布尔值' },
        showBranding: { type: 'boolean', description: '显示品牌标识必须为布尔值' },
        watermark: { type: 'string|null', maxLength: 100, description: '水印文本长度不能超过100字符' }
      },
      export: {
        format: { type: 'string', values: ['png', 'jpg', 'jpeg', 'webp'], description: '导出格式必须为支持的格式之一' },
        quality: { type: 'number', min: 0.1, max: 1, description: '导出质量必须在0.1-1之间' },
        filename: { type: 'string', values: ['auto', 'custom'], description: '文件名类型必须为"auto"或"custom"' },
        filenameTemplate: { type: 'string', minLength: 1, description: '文件名模板不能为空' }
      }
    };
  }
}

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.ScreenshotManager = ScreenshotManager;
}