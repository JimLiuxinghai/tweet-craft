// Tweet Craft Popup 主界面
import './style.css';
import './screenshot-settings.css';
import { browser } from 'wxt/browser';
import { getSettings, saveSettings } from '@/lib/utils/storage';
import { clipboardManager } from '@/lib/clipboard';
import { initializeI18n, i18nManager } from '@/lib/i18n';
import type { ExtensionSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/types';
import { ScreenshotSettingsPanel, type ScreenshotSettingsOptions } from './screenshot-settings';

/**
 * 通知管理器 - 智能通知系统
 */
class NotificationManager {
private activeNotifications: Map<string, HTMLElement> = new Map();
  private queue: Array<{id: string, message: string, type: 'success' | 'error' | 'info', duration?: number}> = [];
  private isProcessing = false;

  /**
   * 显示通知
   */
  show(message: string, type: 'success' | 'error' | 'info' = 'info', duration: number = 3000): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.queue.push({ id, message, type, duration });
    
    if (!this.isProcessing) {
   this.processQueue();
    }
    
    return id;
  }

  /**
   * 处理通知队列
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const notification = this.queue.shift()!;
    
    await this.displayNotification(notification);
    
    // 继续处理队列
    setTimeout(() => this.processQueue(), 100);
  }

  /**
   * 显示单个通知
   */
  private async displayNotification(notification: {id: string, message: string, type: string, duration?: number}): Promise<void> {
    const toast = document.createElement('div');
    toast.className = `toast toast-${notification.type}`;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      left: 20px;
      padding: 12px 16px;
  border-radius: 8px;
   font-size: 14px;
      font-weight: 500;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = notification.message;
    
    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: inherit;
      font-size: 18px;
      cursor: pointer;
padding: 0;
      margin-left: 12px;
    opacity: 0.8;
      transition: opacity 0.2s ease;
    `;
    
    closeButton.onclick = () => this.hide(notification.id);
    
    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);
    
    document.body.appendChild(toast);
    this.activeNotifications.set(notification.id, toast);
    
    // 触发进入动画
    requestAnimationFrame(() => {
      toast.style.transform = 'translateY(0)';
toast.style.opacity = '1';
    });
    
    // 自动隐藏
    if (notification.duration && notification.duration > 0) {
  setTimeout(() => this.hide(notification.id), notification.duration);
 }
  }

  /**
   * 隐藏通知
   */
  hide(id: string): void {
    const toast = this.activeNotifications.get(id);
  if (!toast) return;
    
toast.style.transform = 'translateY(-100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
 toast.parentNode.removeChild(toast);
      }
      this.activeNotifications.delete(id);
    }, 300);
  }

  /**
   * 清除所有通知
   */
  clear(): void {
    this.activeNotifications.forEach((_, id) => this.hide(id));
    this.queue = [];
  }
}


/**
 * 加载状态管理器
 */
class LoadingManager {
  private loadingStates: Set<string> = new Set();
  private progressCallbacks: Map<string, (progress: number) => void> = new Map();

  /**
   * 开始加载
   */
  start(id: string, progressCallback?: (progress: number) => void): void {
    this.loadingStates.add(id);
    if (progressCallback) {
      this.progressCallbacks.set(id, progressCallback);
    }
    this.updateUI();
  }

  /**
   * 更新进度
   */
  updateProgress(id: string, progress: number): void {
    const callback = this.progressCallbacks.get(id);
    if (callback) {
      callback(Math.max(0, Math.min(100, progress)));
    }
  }

  /**
   * 结束加载
   */
  end(id: string): void {
    this.loadingStates.delete(id);
    this.progressCallbacks.delete(id);
    this.updateUI();
  }

  /**
   * 检查是否正在加载
   */
  isLoading(id?: string): boolean {
    return id ? this.loadingStates.has(id) : this.loadingStates.size > 0;
  }

  /**
 * 更新UI状态
   */
  private updateUI(): void {
    const buttons = document.querySelectorAll('.primary-button, .secondary-button');
    buttons.forEach(button => {
    const btn = button as HTMLButtonElement;
 if (this.loadingStates.size > 0) {
 btn.disabled = true;
        btn.classList.add('button-loading');
      } else {
        btn.disabled = false;
        btn.classList.remove('button-loading');
      }
    });
  }
}

/**
 * Popup 应用程序类 - 增强版本
 */
class PopupApp {
  private settings: ExtensionSettings | null = null;
  private isInitialized = false;
  private notifications: NotificationManager;
  private loading: LoadingManager;
  private screenshotSettingsPanel: ScreenshotSettingsPanel | null = null;

  constructor() {
    this.notifications = new NotificationManager();
    this.loading = new LoadingManager();
  }

  /**
   * 初始化应用程序
   */
  async initialize() {
    try {
      // 隐藏加载状态
      const loading = document.getElementById('loading');
      if (loading) loading.style.display = 'none';

        // 初始化国际化 - 使用改进的检测
    await initializeI18n();
      
  // 额外的语言检测调试信息
   if (process.env.NODE_ENV === 'development') {
        try {
   const detectionInfo = await i18nManager.detectWithFallbackChain();
          console.log('Language detection details:', detectionInfo);
   } catch (error) {
     console.warn('Failed to get detection details:', error);
        }
      }

   // 加载设置
   await this.loadSettings();

      // 创建界面
      this.createInterface();

      // 设置事件监听器
      this.setupEventListeners();


      this.isInitialized = true;
      console.log('Popup initialized successfully');

    } catch (error) {
      console.error('Failed to initialize popup:', error);
      this.showError('Failed to load extension');
    }
  }

  /**
   * 加载用户设置
   */
  private async loadSettings(): Promise<void> {
    try {
this.settings = await getSettings();
    } catch (error) {
   console.error('Failed to load settings:', error);
      // 使用默认设置
      this.settings = DEFAULT_SETTINGS;
    }
  }

  /**
   * 创建用户界面
   */
  private createInterface(): void {
    const app = document.getElementById('app');
    if (!app) return;

    app.innerHTML = `
      <div class="popup-container">
        <!-- Header -->
   <header class="popup-header">
    <h1 class="popup-title">
            <span class="logo">🐦</span>
     ${i18nManager.t('extension_name')}
          </h1>
      <div class="version">v1.0.0</div>
     </header>

   <!-- Tabs -->
        <nav class="popup-tabs">
          <button class="tab-button active" data-tab="settings">
   <span class="tab-icon">⚙️</span>
     ${i18nManager.t('settings')}
       </button>
                <button class="tab-button" data-tab="screenshot">
         <span class="tab-icon">📷</span>
     截图设置
          </button>
            </nav>

        <!-- Content -->
    <main class="popup-content">
          <!-- Settings Tab -->
          <div class="tab-content active" id="settings-tab">
            <section class="settings-section">
   <h3>${i18nManager.t('format_options')}</h3>
              <div class="format-selector">
         <label class="format-option">
   <input type="radio" name="format" value="html" ${this.settings?.format === 'html' ? 'checked' : ''}>
       <span class="format-label">
      <strong>HTML</strong>
       <small>${i18nManager.t('format.html_desc')}</small>
     </span>
            </label>
      <label class="format-option">
      <input type="radio" name="format" value="markdown" ${this.settings?.format === 'markdown' ? 'checked' : ''}>
      <span class="format-label">
            <strong>Markdown</strong>
             <small>${i18nManager.t('format.markdown_desc')}</small>
                  </span>
      </label>
                <label class="format-option">
          <input type="radio" name="format" value="text" ${this.settings?.format === 'text' ? 'checked' : ''}>
    <span class="format-label">
          <strong>${i18nManager.t('text')}</strong>
         <small>${i18nManager.t('format.text_desc')}</small>
     </span>
   </label>
 </div>
     </section>

  <section class="settings-section">
    <h3>${i18nManager.t('content_options')}</h3>
              <div class="content-options">
       <label class="option-item">
  <input type="checkbox" id="include-author" ${this.settings?.includeAuthor ? 'checked' : ''}>
           <span class="checkmark"></span>
       ${i18nManager.t('include_author')}
 </label>
                <label class="option-item">
     <input type="checkbox" id="include-timestamp" ${this.settings?.includeTimestamp ? 'checked' : ''}>
        <span class="checkmark"></span>
       ${i18nManager.t('include_timestamp')}
     </label>
           <label class="option-item">
      <input type="checkbox" id="include-metrics" ${this.settings?.includeMetrics ? 'checked' : ''}>
         <span class="checkmark"></span>
        ${i18nManager.t('include_metrics')}
          </label>
   <label class="option-item">
   <input type="checkbox" id="include-media" ${this.settings?.includeMedia ? 'checked' : ''}>
 <span class="checkmark"></span>
      ${i18nManager.t('include_media')}
       </label>
          <label class="option-item">
       <input type="checkbox" id="include-link" ${this.settings?.includeLink ? 'checked' : ''}>
               <span class="checkmark"></span>
          ${i18nManager.t('include_link')}
          </label>
  </div>
  </section>

            <section class="settings-section">
     <h3>${i18nManager.t('language')}</h3>
   <select id="language-select" class="language-selector">
   <option value="auto" ${this.settings?.language === 'auto' ? 'selected' : ''}>${i18nManager.t('auto_detect')}</option>
        <option value="en" ${this.settings?.language === 'en' ? 'selected' : ''}>English</option>
<option value="zh-CN" ${this.settings?.language === 'zh-CN' ? 'selected' : ''}>中文</option>
            <option value="ja" ${this.settings?.language === 'ja' ? 'selected' : ''}>日本語</option>
      <option value="ko" ${this.settings?.language === 'ko' ? 'selected' : ''}>한국어</option>
     <option value="es" ${this.settings?.language === 'es' ? 'selected' : ''}>Español</option>
      <option value="fr" ${this.settings?.language === 'fr' ? 'selected' : ''}>Français</option>
   </select>
  </section>

    <div class="action-buttons">
              <button id="save-settings" class="primary-button">
              ${i18nManager.t('save_settings')}
              </button>
  <button id="reset-settings" class="secondary-button">
     ${i18nManager.t('reset_default')}
   </button>
   </div>
        </div>

               <!-- Screenshot Settings Tab -->
<div class="tab-content" id="screenshot-tab">
     <div id="screenshot-settings-container">
   <div class="loading-placeholder">
    <div class="loading-spinner"></div>
<p>加载截图设置中...</p>
         </div>
   </div>
  </div>

        </main>

        <!-- Footer -->
        <footer class="popup-footer">
          <div class="footer-links">
   <button id="open-twitter" class="footer-button">
  ${i18nManager.t('open_twitter')}
  </button>
      <button id="report-issue" class="footer-button">
 ${i18nManager.t('report_issue')}
</button>
          </div>
        </footer>
      </div>

      <!-- Error Toast -->
      <div id="error-toast" class="toast toast-error" style="display: none;">
        <span id="error-message"></span>
<button id="close-error">&times;</button>
   </div>

      <!-- Success Toast -->
      <div id="success-toast" class="toast toast-success" style="display: none;">
        <span id="success-message"></span>
        <button id="close-success">&times;</button>
      </div>
    `;
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // Tab 切换
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
  const target = e.currentTarget as HTMLElement;
 const tabId = target.dataset.tab;
    if (tabId) this.switchTab(tabId);
  });
    });

    // 格式选择
    const formatInputs = document.querySelectorAll('input[name="format"]');
    formatInputs.forEach(input => {
    input.addEventListener('change', () => this.handleSettingsChange());
    });

    // 选项复选框
    const checkboxes = document.querySelectorAll('.content-options input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => this.handleSettingsChange());
    });

    // 语言选择
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', async (e) => {
    await this.handleLanguageChange((e.target as HTMLSelectElement).value);
      });
    }

    // 保存设置
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.addEventListener('click', () => this.saveCurrentSettings());
    }

    // 重置设置
    const resetButton = document.getElementById('reset-settings');
    if (resetButton) {
      resetButton.addEventListener('click', () => this.resetSettings());
    }


    // 打开 Twitter
    const openTwitterButton = document.getElementById('open-twitter');
    if (openTwitterButton) {
      openTwitterButton.addEventListener('click', () => {
browser.tabs.create({ url: 'https://x.com' });
     window.close();
      });
    }

    // 报告问题
    const reportIssueButton = document.getElementById('report-issue');
    if (reportIssueButton) {
      reportIssueButton.addEventListener('click', () => {
     browser.tabs.create({ url: 'https://github.com/JimLiuxinghai/tweet-craft/issues' });
        window.close();
    });
    }

    // Toast 关闭按钮
    const closeErrorButton = document.getElementById('close-error');
    if (closeErrorButton) {
      closeErrorButton.addEventListener('click', () => this.hideError());
    }

  const closeSuccessButton = document.getElementById('close-success');
    if (closeSuccessButton) {
      closeSuccessButton.addEventListener('click', () => this.hideSuccess());
    }
  }

  /**
   * 切换 Tab
   */
  private switchTab(tabId: string): void {
    // 更新按钮状态
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');

    // 更新内容状态
    document.querySelectorAll('.tab-content').forEach(content => {
 content.classList.remove('active');
    });
    document.getElementById(`${tabId}-tab`)?.classList.add('active');

      // 根据 Tab 加载相应内容
    if (tabId === 'screenshot') {
    this.loadScreenshotSettings();
    }
  }

  /**
   * 处理设置变化
   */
  private handleSettingsChange(): void {
 // 实时更新设置（无需手动保存）
    this.saveCurrentSettings();
  }

  /**
   * 处理语言变化
   */
  private async handleLanguageChange(newLanguage: string): Promise<void> {
    try {
    // 如果语言实际发生了变化
      if (this.settings?.language !== newLanguage) {
   // 更新设置
    if (this.settings) {
   this.settings.language = newLanguage;
          await saveSettings(this.settings);
     }

        // 设置i18n的新语言
        if (newLanguage !== 'auto') {
          i18nManager.setLocale(newLanguage);
   } else {
    // 如果是自动检测，重新初始化
          await i18nManager.reinitialize();
        }

        // 重新创建界面以应用新语言
        this.createInterface();
        this.setupEventListeners();

      this.showSuccess(i18nManager.t('settings_saved'));
      }
    } catch (error) {
      console.error('Failed to change language:', error);
      this.showError('Failed to change language');
 }
  }

  /**
   * 保存当前设置
   */
  private async saveCurrentSettings(): Promise<void> {
    try {
      const formatElement = document.querySelector('input[name="format"]:checked') as HTMLInputElement;
      const includeAuthor = (document.getElementById('include-author') as HTMLInputElement).checked;
      const includeTimestamp = (document.getElementById('include-timestamp') as HTMLInputElement).checked;
  const includeMetrics = (document.getElementById('include-metrics') as HTMLInputElement).checked;
      const includeMedia = (document.getElementById('include-media') as HTMLInputElement).checked;
   const includeLink = (document.getElementById('include-link') as HTMLInputElement).checked;
      const language = (document.getElementById('language-select') as HTMLSelectElement).value;

      const newSettings: ExtensionSettings = {
        ...DEFAULT_SETTINGS,
        format: formatElement?.value as 'html' | 'markdown' | 'text' || 'html',
        includeAuthor,
        includeTimestamp,
        includeMetrics,
     includeMedia,
   includeLink,
        language
      };

      await saveSettings(newSettings);
      this.settings = newSettings;

      // 通知内容脚本设置已更新
      try {
        const tabs = await browser.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
   for (const tab of tabs) {
          if (tab.id) {
     browser.tabs.sendMessage(tab.id, { type: 'SETTINGS_UPDATED' }).catch(() => {
 // 忽略错误，可能页面未加载内容脚本
      });
    }
        }
      } catch (error) {
      console.warn('Failed to notify content scripts:', error);
      }

      this.showSuccess(i18nManager.t('settings_saved'));

    } catch (error) {
  console.error('Failed to save settings:', error);
    this.showError(i18nManager.t('failed_save_settings'));
    }
  }

  /**
   * 重置设置
   */
  private async resetSettings(): Promise<void> {
    if (!confirm(i18nManager.t('confirm_reset_settings'))) {
   return;
    }

    try {
      const defaultSettings: ExtensionSettings = DEFAULT_SETTINGS;

      await saveSettings(defaultSettings);
    this.settings = defaultSettings;

      // 重新创建界面以反映新设置
      this.createInterface();
      this.setupEventListeners();

      this.showSuccess(i18nManager.t('settings_reset'));

    } catch (error) {
   console.error('Failed to reset settings:', error);
      this.showError(i18nManager.t('failed_reset_settings'));
    }
  }


  /**
   * 加载截图设置
   */
  private async loadScreenshotSettings(): Promise<void> {
    const settingsContainer = document.getElementById('screenshot-settings-container');
   if (!settingsContainer) return;

    try {
      // 获取当前的截图设置
const screenshotOptions: ScreenshotSettingsOptions = {
     useContentOptions: this.settings?.screenshotOptions?.useContentOptions ?? true,
   backgroundColor: this.settings?.screenshotOptions?.backgroundColor,
      backgroundGradient: this.settings?.screenshotOptions?.backgroundGradient
     };

      // 创建截图设置面板
      this.screenshotSettingsPanel = new ScreenshotSettingsPanel(settingsContainer, screenshotOptions);

      // 监听设置变化
    settingsContainer.addEventListener('screenshot-settings-changed', async (e: Event) => {
        const customEvent = e as CustomEvent<ScreenshotSettingsOptions>;
        await this.handleScreenshotSettingsChange(customEvent.detail);
      });

    settingsContainer.addEventListener('screenshot-settings-reset', async (e: Event) => {
     const customEvent = e as CustomEvent<ScreenshotSettingsOptions>;
        await this.handleScreenshotSettingsChange(customEvent.detail);
      });

    } catch (error) {
      console.error('Failed to load screenshot settings:', error);
      settingsContainer.innerHTML = `
        <div class="error-state">
        <div class="error-icon">⚠️</div>
 <p>加载截图设置失败</p>
        </div>
   `;
  }
  }

  /**
  * 处理截图设置变化
   */
  private async handleScreenshotSettingsChange(newSettings: ScreenshotSettingsOptions): Promise<void> {
 try {
      if (!this.settings) return;

   // 更新截图设置
      this.settings.screenshotOptions = newSettings;

    // 保存设置
   await saveSettings(this.settings);

      // 通知内容脚本设置已更新
      try {
        const tabs = await browser.tabs.query({ url: ['*://twitter.com/*', '*://x.com/*'] });
 for (const tab of tabs) {
          if (tab.id) {
     browser.tabs.sendMessage(tab.id, { type: 'SCREENSHOT_SETTINGS_UPDATED', settings: newSettings }).catch(() => {
              // 忽略错误，可能页面未加载内容脚本
            });
   }
        }
      } catch (error) {
        console.warn('Failed to notify content scripts:', error);
     }

    } catch (error) {
      console.error('Failed to save screenshot settings:', error);
    }
  }

  /**
   * 显示成功消息
   */
  private showSuccess(message: string): void {
    const toast = document.getElementById('success-toast');
    const messageElement = document.getElementById('success-message');
    
    if (toast && messageElement) {
      messageElement.textContent = message;
      toast.style.display = 'flex';
    
      setTimeout(() => {
        this.hideSuccess();
      }, 3000);
    }
  }

  /**
   * 隐藏成功消息
   */
  private hideSuccess(): void {
    const toast = document.getElementById('success-toast');
    if (toast) {
      toast.style.display = 'none';
  }
  }

  /**
* 显示错误消息
   */
  private showError(message: string): void {
    const toast = document.getElementById('error-toast');
    const messageElement = document.getElementById('error-message');
  
    if (toast && messageElement) {
      messageElement.textContent = message;
      toast.style.display = 'flex';
      
      setTimeout(() => {
        this.hideError();
   }, 5000);
    }
  }

  /**
 * 隐藏错误消息
   */
  private hideError(): void {
    const toast = document.getElementById('error-toast');
    if (toast) {
      toast.style.display = 'none';
    }
  }

  /**
   * 转义 HTML
   */
  private escapeHTML(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 格式化相对时间
   */
  private formatRelativeTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  }
}

// 初始化应用程序
document.addEventListener('DOMContentLoaded', async () => {
  const app = new PopupApp();
  await app.initialize();
});