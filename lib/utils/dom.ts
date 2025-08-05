// DOM 操作相关工具函数

/**
 * 安全地获取元素的文本内容
 */
export function getTextContent(element: Element | null): string {
  if (!element) return '';
  return element.textContent?.trim() || '';
}

/**
 * 安全地获取元素的 HTML 内容
 */
export function getHTMLContent(element: Element | null): string {
  if (!element) return '';
  return element.innerHTML || '';
}

/**
 * 获取元素的属性值
 */
export function getAttribute(element: Element | null, attributeName: string): string {
  if (!element) return '';
  return element.getAttribute(attributeName) || '';
}

/**
 * 检查元素是否匹配选择器
 */
export function matches(element: Element | null, selector: string): boolean {
  if (!element) return false;
  return element.matches(selector);
}

/**
 * 查找最近的匹配祖先元素
 */
export function closest(element: Element | null, selector: string): Element | null {
  if (!element) return null;
  return element.closest(selector);
}

/**
 * 查找所有匹配的子元素 (支持多个选择器，用逗号分隔)
 */
export function queryAll(container: Element | Document, selector: string): Element[] {
  try {
    return Array.from(container.querySelectorAll(selector));
  } catch (error) {
    // 如果选择器包含不支持的语法，尝试分割选择器
    const selectors = selector.split(',').map(s => s.trim());
    const allElements: Element[] = [];
    for (const singleSelector of selectors) {
      try {
        const elements = Array.from(container.querySelectorAll(singleSelector));
        allElements.push(...elements);
      } catch {
        // 跳过无效的选择器
        continue;
      }
    }
    // 去除重复元素
    return [...new Set(allElements)];
  }
}

/**
 * 查找第一个匹配的子元素 (支持多个选择器，用逗号分隔)
 */
export function query(container: Element | Document, selector: string): Element | null {
  try {
    return container.querySelector(selector);
  } catch (error) {
    // 如果选择器包含不支持的语法，尝试分割选择器
    const selectors = selector.split(',').map(s => s.trim());
    for (const singleSelector of selectors) {
      try {
const element = container.querySelector(singleSelector);
        if (element) return element;
      } catch {
        // 跳过无效的选择器
        continue;
      }
    }
    return null;
  }
}

/**
 * 等待元素出现在 DOM 中
 */
export function waitForElement(
  selector: string, 
  container: Element | Document = document,
  timeout: number = 5000
): Promise<Element> {
  return new Promise((resolve, reject) => {
    const element = query(container, selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      const element = query(container, selector);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });

    observer.observe(container === document ? document.body : container, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

/**
 * 等待元素从 DOM 中移除
 */
export function waitForElementRemoval(
  element: Element,
  timeout: number = 5000
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!element.isConnected) {
      resolve();
      return;
    }

    const observer = new MutationObserver((mutations, obs) => {
      if (!element.isConnected) {
        obs.disconnect();
        resolve();
      }
    });

    observer.observe(element.parentElement || document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element removal timeout after ${timeout}ms`));
    }, timeout);
  });
}

/**
 * 创建并添加样式表
 */
export function addStyleSheet(css: string, id?: string): HTMLStyleElement {
  const style = document.createElement('style');
  style.textContent = css;
  
  if (id) {
    style.id = id;
    // 如果已存在同 ID 的样式表，先移除
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
  }
  
  document.head.appendChild(style);
  return style;
}

/**
 * 移除样式表
 */
export function removeStyleSheet(id: string): boolean {
  const style = document.getElementById(id);
  if (style) {
    style.remove();
    return true;
  }
  return false;
}

/**
 * 创建 DOM 元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key === 'innerHTML') {
        element.innerHTML = value;
      } else if (key === 'textContent') {
        element.textContent = value;
      } else {
        element.setAttribute(key, value);
      }
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

/**
 * 检查元素是否在视口中
 */
export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 滚动到元素位置
 */
export function scrollToElement(
  element: Element,
  behavior: ScrollBehavior = 'smooth',
  block: ScrollLogicalPosition = 'start'
): void {
  element.scrollIntoView({ behavior, block });
}

/**
 * 获取元素的计算样式
 */
export function getComputedStyles(element: Element): CSSStyleDeclaration {
  return window.getComputedStyle(element);
}

/**
 * 检查元素是否可见
 */
export function isVisible(element: Element): boolean {
  const styles = getComputedStyles(element);
  return (
    styles.display !== 'none' &&
    styles.visibility !== 'hidden' &&
    styles.opacity !== '0' &&
    element.offsetWidth > 0 &&
    element.offsetHeight > 0
  );
}

/**
 * 获取元素相对于文档的位置
 */
export function getElementPosition(element: Element): { top: number; left: number } {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout | null = null;
  
  return ((...args: any[]) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      timeout = null;
      func.apply(null, args);
    }, wait);
  }) as T;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let lastTime = 0;
  
  return ((...args: any[]) => {
    const now = Date.now();
    
    if (now - lastTime >= wait) {
      lastTime = now;
      func.apply(null, args);
    }
  }) as T;
}

/**
 * 深度克隆 DOM 元素
 */
export function cloneElement(element: Element, deep: boolean = true): Element {
  return element.cloneNode(deep) as Element;
}

/**
 * 移除元素的所有子节点
 */
export function clearChildren(element: Element): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

/**
 * 插入元素到指定位置
 */
export function insertAt(
  parent: Element,
  child: Element,
  index: number
): void {
  const children = Array.from(parent.children);
  if (index >= children.length) {
    parent.appendChild(child);
  } else {
    parent.insertBefore(child, children[index]);
  }
}

/**
 * 检查是否为暗黑主题
 */
export function isDarkTheme(): boolean {
  const html = document.documentElement;
  return html.classList.contains('dark') || 
         html.dataset.theme === 'dark' ||
         (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}