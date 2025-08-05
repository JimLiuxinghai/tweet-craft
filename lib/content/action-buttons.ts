// Twitter Action Buttons with Lucide Icons
import { createElement } from '../utils/dom';
import { i18nManager } from '../i18n';
// Lucide图标已替换为内联SVG以避免类型问题

export class TwitterActionButtons {
  /**
   * 创建复制按钮 (使用Lucide Copy图标)
   */
  static createCopyButton(tweetElement: HTMLElement, onClick: (element: HTMLElement, button: HTMLElement) => void): HTMLElement {
    const button = createElement('button', {
      className: 'tsc-copy-button tsc-action-button',
      'data-testid': 'tsc-copy',
      'aria-label': i18nManager.t('copy_tweet'),
      title: i18nManager.t('copy_tweet')
    });

    // 添加图标
    const icon = createElement('div', {
      className: 'tsc-copy-icon tsc-action-icon'
 });
    
    // Lucide Copy图标，调整为Twitter风格
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18.75');
    svg.setAttribute('height', '18.75');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi');
    svg.innerHTML = '<rect width="14" height="14" x="8" y="8" rx="2" ry="2" fill="none"/><path d="M4 16c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h8c1.1 0 2 .9 2 2"/>';
    icon.appendChild(svg);

    button.appendChild(icon);

    // 添加点击事件
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(tweetElement, button);
    });

    return button;
  }

  /**
   * 创建截图按钮 (使用Lucide Camera图标)
 */
  static createScreenshotButton(tweetElement: HTMLElement, onClick: (element: HTMLElement, button: HTMLElement) => void): HTMLElement {
    const button = createElement('button', {
    className: 'tsc-screenshot-button tsc-action-button',
      'data-testid': 'tsc-screenshot', 
      'aria-label': i18nManager.t('screenshot.take') || 'Take Screenshot',
      title: i18nManager.t('screenshot.take') || 'Take Screenshot'
    });

    // 添加图标
    const icon = createElement('div', {
      className: 'tsc-screenshot-icon tsc-action-icon'
    });
    
    // Lucide Camera图标，调整为Twitter风格
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '18.75');
    svg.setAttribute('height', '18.75');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('class', 'r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi');
    svg.innerHTML = '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z"/><circle cx="12" cy="13" r="3" fill="none"/>';
    icon.appendChild(svg);

    button.appendChild(icon);

    // 添加点击事件
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick(tweetElement, button);
    });

    return button;
  }

  /**
   * 插入操作按钮到Twitter操作栏
   */
  static insertActionButtons(actionsBar: HTMLElement, copyButton: HTMLElement, screenshotButton: HTMLElement): boolean {
    try {
      
      // 检查是否已经存在按钮
      if (actionsBar.querySelector('.tsc-copy-button') || actionsBar.querySelector('.tsc-screenshot-button')) {
        return true;
      }

      // 创建按钮容器，模仿Twitter的结构
      const copyContainer = this.createActionButtonContainer();
   const screenshotContainer = this.createActionButtonContainer();
      
      copyContainer.appendChild(copyButton);
      screenshotContainer.appendChild(screenshotButton);

      // 查找合适的插入位置（在书签按钮之后，或在最后）
      const bookmarkButton = actionsBar.querySelector('[data-testid="bookmark"]');
      if (bookmarkButton && bookmarkButton.parentElement) {
 // 在书签按钮后插入
        const bookmarkContainer = bookmarkButton.parentElement;
        bookmarkContainer.parentNode?.insertBefore(copyContainer, bookmarkContainer.nextSibling);
   bookmarkContainer.parentNode?.insertBefore(screenshotContainer, copyContainer.nextSibling);
    console.log('✅ 已在书签按钮后插入操作按钮');
      } else {
        // 在操作栏末尾插入
        actionsBar.appendChild(copyContainer);
        actionsBar.appendChild(screenshotContainer);
        console.log('✅ 已在操作栏末尾插入操作按钮');
      }

      return true;
    } catch (error) {
      console.error('❌ 插入操作按钮失败:', error);
      return false;
    }
  }

  /**
   * 创建操作按钮容器（模仿Twitter的样式）
   */
  private static createActionButtonContainer(): HTMLElement {
    const container = createElement('div', {
    className: 'css-175oi2r r-18u37iz r-1h0z5md r-13awgt0'
    });
    return container;
  }

  /**
* 设置按钮加载状态
   */
  static setButtonLoading(button: HTMLElement, loading: boolean): void {
    const icon = button.querySelector('.tsc-action-icon');
    if (!icon) return;

    if (loading) {
      button.classList.add('tsc-loading');
      button.setAttribute('disabled', 'true');
      // 可以在这里添加加载动画
    } else {
      button.classList.remove('tsc-loading');
      button.removeAttribute('disabled');
    }
  }

  /**
   * 设置按钮成功状态
   */
  static setButtonSuccess(button: HTMLElement): void {
  const icon = button.querySelector('.tsc-action-icon');
    if (!icon) return;

    const originalHTML = icon.innerHTML;
    button.classList.add('tsc-success');
    
    // Lucide Check成功图标
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi"><path d="M9 11l3 3L22 4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9"/></svg>';
    
    // 2秒后恢复原始图标
    setTimeout(() => {
      icon.innerHTML = originalHTML;
      button.classList.remove('tsc-success');
    }, 2000);
  }

  /**
   * 设置按钮错误状态
   */
  static setButtonError(button: HTMLElement): void {
    const icon = button.querySelector('.tsc-action-icon');
 if (!icon) return;

    const originalHTML = icon.innerHTML;
    button.classList.add('tsc-error');
    
    // Lucide X错误图标
    icon.innerHTML = '<svg viewBox="0 0 24 24" width="18.75" height="18.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi"><path d="M18 6L6 18"/><path d="M6 6l12 12"/></svg>';
    
// 2秒后恢复原始图标
    setTimeout(() => {
      icon.innerHTML = originalHTML;
   button.classList.remove('tsc-error');
    }, 2000);
  }
}