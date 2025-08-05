// 截图按钮组件 - 一键截图功能的UI组件
import { i18nManager } from '../i18n';
import { screenshotService, ScreenshotOptions } from './ScreenshotService';
import { createElement } from '../utils/dom';

/**
 * 截图按钮选项
 */
export interface ScreenshotButtonOptions {
  className?: string;
showTooltip?: boolean;
  defaultAction?: 'download' | 'copy';
  showDialog?: boolean;
  onSuccess?: (action: 'download' | 'copy') => void;
  onError?: (error: Error) => void;
}

/**
 * 截图按钮类
 */
export class ScreenshotButton {
  private element: HTMLElement;
  private targetElement: HTMLElement;
  private options: ScreenshotButtonOptions;

  constructor(
    targetElement: HTMLElement,
    options: ScreenshotButtonOptions = {}
  ) {
    this.targetElement = targetElement;
    this.options = {
      className: 'tsc-screenshot-button',
    showTooltip: true,
      defaultAction: 'copy',
      showDialog: true,
      ...options
    };
    
    this.element = this.createButton();
    this.setupEventListeners();
  }

  /**
   * 创建截图按钮
   */
  private createButton(): HTMLElement {
    const button = createElement('button', {
      className: this.options.className!,
      'data-testid': 'tsc-screenshot',
      'aria-label': i18nManager.t('screenshot.take') || 'Take Screenshot',
      title: this.options.showTooltip ? 
        (i18nManager.t('screenshot.take') || 'Take Screenshot') : ''
    });

    // 添加图标
    const icon = createElement('div', {
    className: 'tsc-screenshot-icon',
      innerHTML: this.getScreenshotIconSVG()
    });

    button.appendChild(icon);
    return button;
  }

  /**
   * 获取截图图标 SVG
   */
  private getScreenshotIconSVG(): string {
    return `
      <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3"/>
      </svg>
    `;
  }

  /**
   * 获取加载图标 SVG
   */
  private getLoadingIconSVG(): string {
    return `
      <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12a9 9 0 1 1-6.219-8.56">
   <animateTransform attributeName="transform" type="rotate" dur="1s" values="0 12 12;360 12 12" repeatCount="indefinite"/>
      </path>
      </svg>
    `;
  }

  /**
   * 获取成功图标 SVG  
   */
  private getSuccessIconSVG(): string {
    return `
      <svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 11l3 3L22 4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/>
      </svg>
    `;
  }

  /**
 * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.handleClick();
    });
  }

  /**
   * 处理按钮点击
   */
  private async handleClick(): Promise<void> {
    try {
      this.setLoadingState(true);

      if (this.options.showDialog) {
    this.showScreenshotDialog();
    } else {
        // 直接执行默认操作
        await this.executeScreenshot({
          action: this.options.defaultAction!,
     format: 'png',
  quality: 0.9
        });
      }
    } catch (error) {
 console.error('Screenshot button click failed:', error);
      this.setErrorState();
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * 显示截图选项对话框
   */
  private showScreenshotDialog(): void {
    const dialog = this.createScreenshotDialog();
    document.body.appendChild(dialog);

    // 添加关闭事件
    const closeDialog = () => {
      if (dialog.parentNode) {
     dialog.parentNode.removeChild(dialog);
   }
      this.setLoadingState(false);
    };

    // 点击背景关闭
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog || (event.target as Element).classList.contains('tsc-dialog-backdrop')) {
        closeDialog();
}
    });

    // ESC键关闭
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
      closeDialog();
        document.removeEventListener('keydown', handleEsc);
      }
    };
    document.addEventListener('keydown', handleEsc);
  }

  /**
* 创建截图选项对话框
   */
  private createScreenshotDialog(): HTMLElement {
    const dialog = createElement('div', {
      className: 'tsc-screenshot-dialog',
      innerHTML: `
   <div class="tsc-dialog-backdrop"></div>
        <div class="tsc-dialog-content">
          <div class="tsc-dialog-header">
  <h3>${i18nManager.t('screenshot.options') || 'Screenshot Options'}</h3>
   <button class="tsc-dialog-close" aria-label="${i18nManager.t('close') || 'Close'}">×</button>
          </div>
        <div class="tsc-dialog-body">
     <div class="tsc-option-group">
              <label>${i18nManager.t('screenshot.format') || 'Format'}:</label>
          <select class="tsc-format-select">
      <option value="png">PNG</option>
     <option value="jpeg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
            <div class="tsc-option-group">
       <label>${i18nManager.t('screenshot.quality') || 'Quality'}:</label>
         <input type="range" class="tsc-quality-slider" min="0.1" max="1" step="0.1" value="0.9">
          <span class="tsc-quality-value">90%</span>
          </div>
         <div class="tsc-dialog-buttons">
      <button class="tsc-dialog-button tsc-download-btn" data-action="download">
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" x2="12" y1="15" y2="3"/>
          </svg>
    ${i18nManager.t('screenshot.download') || 'Download'}
           </button>
  <button class="tsc-dialog-button tsc-copy-btn" data-action="copy">
   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/>
</svg>
         ${i18nManager.t('screenshot.copy') || 'Copy to Clipboard'}
              </button>
     </div>
          </div>
        </div>
      `
    });

    // 设置质量滑块事件
    const qualitySlider = dialog.querySelector('.tsc-quality-slider') as HTMLInputElement;
    const qualityValue = dialog.querySelector('.tsc-quality-value') as HTMLElement;
    
    qualitySlider?.addEventListener('input', () => {
      const value = Math.round(parseFloat(qualitySlider.value) * 100);
 qualityValue.textContent = `${value}%`;
    });

    // 设置按钮事件
    const buttons = dialog.querySelectorAll('.tsc-dialog-button');
    buttons.forEach(button => {
 button.addEventListener('click', async () => {
        const action = (button as HTMLElement).dataset.action as 'download' | 'copy';
        const format = (dialog.querySelector('.tsc-format-select') as HTMLSelectElement).value as 'png' | 'jpeg' | 'webp';
        const quality = parseFloat(qualitySlider?.value || '0.9');

        try {
          await this.executeScreenshot({ action, format, quality });
   if (dialog.parentNode) {
    dialog.parentNode.removeChild(dialog);
          }
        } catch (error) {
          console.error('Screenshot execution failed:', error);
 this.setErrorState();
        }
  });
    });

    // 关闭按钮事件
    const closeBtn = dialog.querySelector('.tsc-dialog-close');
    closeBtn?.addEventListener('click', () => {
      if (dialog.parentNode) {
        dialog.parentNode.removeChild(dialog);
      }
      this.setLoadingState(false);
    });

return dialog;
  }

  /**
   * 执行截图操作
   */
  private async executeScreenshot(config: {
    action: 'download' | 'copy';
    format: 'png' | 'jpeg' | 'webp';
    quality: number;
  }): Promise<void> {
    try {
      const options: ScreenshotOptions = {
        format: config.format,
        quality: config.quality,
        theme: 'auto'
      };

      const result = await screenshotService.capture(this.targetElement, options);

      if (config.action === 'download') {
        await screenshotService.downloadScreenshot(result);
      } else {
        await screenshotService.copyScreenshotToClipboard(result);
      }

        this.setSuccessState();
      
      // 触发成功回调
      if (this.options.onSuccess) {
     this.options.onSuccess(config.action);
      }
    } catch (error) {
    console.error('Screenshot execution failed:', error);
      this.setErrorState();
      
    // 触发错误回调
      if (this.options.onError) {
     this.options.onError(error instanceof Error ? error : new Error(String(error)));
   }
      
      throw error;
    }
  }

  /**
   * 设置加载状态
   */
  private setLoadingState(loading: boolean): void {
  if (loading) {
      this.element.classList.add('tsc-loading');
      this.element.setAttribute('disabled', 'true');
      const icon = this.element.querySelector('.tsc-screenshot-icon');
      if (icon) {
        icon.innerHTML = this.getLoadingIconSVG();
      }
    } else {
 this.element.classList.remove('tsc-loading');
      this.element.removeAttribute('disabled');
      const icon = this.element.querySelector('.tsc-screenshot-icon');
    if (icon) {
        icon.innerHTML = this.getScreenshotIconSVG();
      }
    }
  }

  /**
   * 设置成功状态
   */
  private setSuccessState(): void {
    this.element.classList.remove('tsc-loading', 'tsc-error');
    this.element.classList.add('tsc-success');
    
    const icon = this.element.querySelector('.tsc-screenshot-icon');
    if (icon) {
      const originalIcon = icon.innerHTML;
      icon.innerHTML = this.getSuccessIconSVG();
      
      // 2秒后恢复原始图标
      setTimeout(() => {
        icon.innerHTML = originalIcon;
  this.element.classList.remove('tsc-success');
      }, 2000);
    }
  }

  /**
   * 设置错误状态
   */
  private setErrorState(): void {
    this.element.classList.remove('tsc-loading', 'tsc-success');
    this.element.classList.add('tsc-error');
    
    // 2秒后恢复正常状态
    setTimeout(() => {
      this.element.classList.remove('tsc-error');
    }, 2000);
  }

  /**
   * 获取按钮元素
   */
  getElement(): HTMLElement {
    return this.element;
  }

  /**
   * 销毁按钮
   */
  destroy(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

/**
 * 工厂函数：创建截图按钮
 */
export function createScreenshotButton(
  targetElement: HTMLElement,
  options?: ScreenshotButtonOptions
): HTMLElement {
  const screenshotButton = new ScreenshotButton(targetElement, options);
  return screenshotButton.getElement();
}