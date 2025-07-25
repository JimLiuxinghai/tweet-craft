/**
 * HTML2Canvas 库集成包装器
 * HTML2Canvas library integration wrapper
 */

/**
 * HTML2Canvas 包装器类
 * 提供统一的截图API和错误处理
 */
class HTML2CanvasWrapper {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
    this.defaultOptions = {
      allowTaint: true,
      useCORS: true,
      scale: 2,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      imageTimeout: 15000,
      onclone: (clonedDoc, element) => {
        // 优化克隆的文档用于截图
        this.optimizeClonedDocument(clonedDoc, element);
      }
    };
  }

  /**
   * 加载 html2canvas 库
   * @returns {Promise<void>}
   */
  async loadLibrary() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      // 检查是否已经加载
      if (window.html2canvas) {
        this.isLoaded = true;
        resolve();
        return;
      }

      // 动态加载 html2canvas
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.integrity = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
      script.crossOrigin = 'anonymous';
      
      script.onload = () => {
        if (window.html2canvas) {
          this.isLoaded = true;
          console.log('✅ html2canvas 库加载成功');
          resolve();
        } else {
          reject(new Error('html2canvas 库加载失败'));
        }
      };

      script.onerror = () => {
        reject(new Error('html2canvas 脚本加载失败'));
      };

      document.head.appendChild(script);

      // 超时处理
      setTimeout(() => {
        if (!this.isLoaded) {
          reject(new Error('html2canvas 库加载超时'));
        }
      }, 10000);
    });

    return this.loadPromise;
  }

  /**
   * 捕获元素截图
   * @param {HTMLElement} element - 要截图的元素
   * @param {Object} options - 截图选项
   * @returns {Promise<HTMLCanvasElement>}
   */
  async captureElement(element, options = {}) {
    await this.loadLibrary();

    if (!element || !element.nodeType) {
      throw new Error('无效的DOM元素');
    }

    const mergedOptions = {
      ...this.defaultOptions,
      ...options
    };

    try {
      // 预处理元素
      const processedElement = this.preprocessElement(element);
      
      // 执行截图
      const canvas = await window.html2canvas(processedElement, mergedOptions);
      
      // 后处理Canvas
      return this.postprocessCanvas(canvas, mergedOptions);
      
    } catch (error) {
      console.error('html2canvas 截图失败:', error);
      throw new Error(`截图失败: ${error.message}`);
    }
  }

  /**
   * 预处理元素用于截图
   * @param {HTMLElement} element - 原始元素
   * @returns {HTMLElement} 处理后的元素
   */
  preprocessElement(element) {
    // 创建元素的深拷贝
    const clonedElement = element.cloneNode(true);
    
    // 移除可能干扰截图的元素
    this.removeInterferingElements(clonedElement);
    
    // 修复样式问题
    this.fixStyleIssues(clonedElement);
    
    // 处理媒体元素
    this.processMediaElements(clonedElement);
    
    return clonedElement;
  }

  /**
   * 移除干扰截图的元素
   * @param {HTMLElement} element - 元素
   */
  removeInterferingElements(element) {
    // 移除悬浮元素、工具提示等
    const selectorsToRemove = [
      '[role="tooltip"]',
      '.super-copy-btn', // 移除我们自己的按钮
      '[data-testid="toolTip"]',
      '.r-1loqt21', // Twitter的悬浮元素
      '[aria-hidden="true"][style*="position: fixed"]'
    ];

    selectorsToRemove.forEach(selector => {
      const elements = element.querySelectorAll(selector);
      elements.forEach(el => el.remove());
    });
  }

  /**
   * 修复样式问题
   * @param {HTMLElement} element - 元素
   */
  fixStyleIssues(element) {
    // 确保文本可见
    const textElements = element.querySelectorAll('*');
    textElements.forEach(el => {
      const style = window.getComputedStyle(el);
      
      // 修复透明文本
      if (style.color === 'transparent' || style.opacity === '0') {
        el.style.color = '#000000';
        el.style.opacity = '1';
      }
      
      // 修复背景问题
      if (style.backgroundColor === 'transparent') {
        el.style.backgroundColor = 'inherit';
      }
    });
  }

  /**
   * 处理媒体元素
   * @param {HTMLElement} element - 元素
   */
  processMediaElements(element) {
    // 处理图片
    const images = element.querySelectorAll('img');
    images.forEach(img => {
      // 确保图片已加载
      if (!img.complete) {
        img.style.display = 'none';
      }
      
      // 添加CORS属性
      img.crossOrigin = 'anonymous';
    });

    // 处理视频
    const videos = element.querySelectorAll('video');
    videos.forEach(video => {
      // 将视频替换为缩略图
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth || video.clientWidth;
      canvas.height = video.videoHeight || video.clientHeight;
      
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // 创建图片元素替换视频
        const img = document.createElement('img');
        img.src = canvas.toDataURL();
        img.style.cssText = video.style.cssText;
        
        video.parentNode.replaceChild(img, video);
      } catch (error) {
        console.warn('视频缩略图生成失败:', error);
        // 隐藏视频元素
        video.style.display = 'none';
      }
    });
  }

  /**
   * 优化克隆的文档
   * @param {Document} clonedDoc - 克隆的文档
   * @param {HTMLElement} element - 目标元素
   */
  optimizeClonedDocument(clonedDoc, element) {
    // 移除不必要的脚本
    const scripts = clonedDoc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
    
    // 优化字体加载
    const style = clonedDoc.createElement('style');
    style.textContent = `
      * {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
    `;
    clonedDoc.head.appendChild(style);
  }

  /**
   * 后处理Canvas
   * @param {HTMLCanvasElement} canvas - 原始Canvas
   * @param {Object} options - 选项
   * @returns {HTMLCanvasElement} 处理后的Canvas
   */
  postprocessCanvas(canvas, options) {
    // 如果需要特定尺寸，进行缩放
    if (options.targetWidth || options.targetHeight) {
      return this.resizeCanvas(canvas, options.targetWidth, options.targetHeight);
    }
    
    return canvas;
  }

  /**
   * 调整Canvas尺寸
   * @param {HTMLCanvasElement} sourceCanvas - 源Canvas
   * @param {number} targetWidth - 目标宽度
   * @param {number} targetHeight - 目标高度
   * @returns {HTMLCanvasElement} 调整后的Canvas
   */
  resizeCanvas(sourceCanvas, targetWidth, targetHeight) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 计算缩放比例
    const scaleX = targetWidth / sourceCanvas.width;
    const scaleY = targetHeight / sourceCanvas.height;
    const scale = Math.min(scaleX, scaleY);
    
    canvas.width = sourceCanvas.width * scale;
    canvas.height = sourceCanvas.height * scale;
    
    // 启用图像平滑
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // 绘制缩放后的图像
    ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
    
    return canvas;
  }

  /**
   * 检查库是否可用
   * @returns {boolean}
   */
  isAvailable() {
    return this.isLoaded && window.html2canvas;
  }

  /**
   * 获取库版本信息
   * @returns {string}
   */
  getVersion() {
    if (window.html2canvas && window.html2canvas.version) {
      return window.html2canvas.version;
    }
    return 'unknown';
  }
}

// 创建全局实例
const html2canvasWrapper = new HTML2CanvasWrapper();

// 导出到全局作用域
if (typeof window !== 'undefined') {
  window.HTML2CanvasWrapper = HTML2CanvasWrapper;
  window.html2canvasWrapper = html2canvasWrapper;
}