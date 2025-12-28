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

const NOTION_STORAGE_KEYS = {
  integrationToken: 'notion_integration_token',
  databaseId: 'notion_database_id',
  databaseIdDraft: 'notion_database_id_draft'
} as const;

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
      <div class="version">v1.0.2</div>
     </header>

   <!-- Tabs -->
        <nav class="popup-tabs">
          <button class="tab-button active" data-tab="settings">
   <span class="tab-icon">⚙️</span>
     ${i18nManager.t('settings')}
       </button>
          <button class="tab-button" data-tab="screenshot">
            <span class="tab-icon">📷</span>
            ${i18nManager.t('screenshot.settings.title')}
          </button>
          <button class="tab-button" data-tab="notion">
            <span class="tab-icon">📝</span>
            ${i18nManager.t('notion.settings.title')}
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

        <!-- Notion Settings Tab -->
        <div class="tab-content" id="notion-tab">
          <div id="notion-settings-container">
            <div class="loading-placeholder">
              <div class="loading-spinner"></div>
              <p>${i18nManager.t('notion.settings.loading') || '加载 Notion 设置中...'}</p>
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
          <div class="project-info">
            <div class="version-info">v1.0.2</div>
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
    } else if (tabId === 'notion') {
      this.loadNotionSettings();
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
   * 加载 Notion 设置
   */
  private async loadNotionSettings(): Promise<void> {
    const settingsContainer = document.getElementById('notion-settings-container');
    if (!settingsContainer) return;

    try {
      // 检查 Notion 连接状态
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_IS_CONNECTED'
      });

      if (response.success && response.connected) {
        this.showConnectedNotionSettings(settingsContainer);
      } else {
        await this.showDisconnectedNotionSettings(settingsContainer);
      }
    } catch (error) {
      console.error('Failed to load Notion settings:', error);
      settingsContainer.innerHTML = `
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <p>${i18nManager.t('notion.settings.load_failed')}</p>
        </div>
      `;
    }
  }

  /**
   * 显示已连接的 Notion 设置
   */
  private showConnectedNotionSettings(container: HTMLElement): void {
    container.innerHTML = `
      <div class="notion-settings-content">
        <div class="connection-status connected">
          <div class="status-icon">✓</div>
          <div class="status-text">
            <h4>${i18nManager.t('notion.settings.connected')}</h4>
            <p>${i18nManager.t('notion.settings.connected_desc')}</p>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${i18nManager.t('notion.settings.database_settings')}</h3>
          <div class="database-info">
            <p>${i18nManager.t('notion.settings.database_desc')}</p>
            <div class="action-buttons">
              <button id="configure-database" class="primary-button">${i18nManager.t('notion.settings.configure_database')}</button>
              <button id="disconnect-notion" class="secondary-button">${i18nManager.t('notion.settings.disconnect')}</button>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <h3>${i18nManager.t('notion.settings.save_options')}</h3>
          <div class="save-options">
            <label class="option-item">
              <input type="checkbox" id="auto-tags" checked>
              <span class="checkmark"></span>
              ${i18nManager.t('notion.settings.auto_tags')}
            </label>
            <label class="option-item">
              <input type="checkbox" id="save-media" checked>
              <span class="checkmark"></span>
              ${i18nManager.t('notion.settings.save_media')}
            </label>
            <label class="option-item">
              <input type="checkbox" id="check-duplicates" checked>
              <span class="checkmark"></span>
              ${i18nManager.t('notion.settings.check_duplicates')}
            </label>
          </div>
        </div>

        <div class="settings-section">
          <h3>${i18nManager.t('notion.settings.actions')}</h3>
          <div class="action-buttons">
            <button id="test-connection" class="secondary-button">${i18nManager.t('notion.settings.test_connection')}</button>
            <button id="view-stats" class="secondary-button">${i18nManager.t('notion.settings.view_stats')}</button>
          </div>
        </div>
      </div>
    `;

    // 设置事件监听器
    this.setupNotionSettingsEvents();
  }

  /**
   * 显示未连接的 Notion 设置
   */
  private async showDisconnectedNotionSettings(container: HTMLElement): Promise<void> {
    container.innerHTML = `
      <div class="notion-settings-content">
        <div class="connection-status disconnected">
          <div class="status-icon">!</div>
          <div class="status-text">
            <h4>${i18nManager.t('notion.settings.not_connected')}</h4>
            <p>${i18nManager.t('notion.settings.connection_desc')}</p>
          </div>
        </div>
        
        <div class="settings-section">
          <h3>${i18nManager.t('notion.settings.connection_steps')}</h3>
          <div class="connection-steps">
            <ol>
              <li><a href="https://www.notion.so/my-integrations" target="_blank">${i18nManager.t('notion.settings.setup_step1')}</a></li>
              <li>${i18nManager.t('notion.settings.setup_step2')}</li>
              <li>${i18nManager.t('notion.settings.setup_step3')}</li>
              <li>${i18nManager.t('notion.settings.setup_step4')}</li>
              <li>${i18nManager.t('notion.settings.setup_step5')}</li>
              <li>${i18nManager.t('notion.settings.setup_step6')}</li>
            </ol>
          </div>
        </div>

        <div class="settings-section">
          <h3>${i18nManager.t('notion.settings.connection_info')}</h3>
          <div class="connection-form">
            <div class="form-group">
              <label>${i18nManager.t('notion.settings.integration_token')}:</label>
              <input type="password" id="notion-token" placeholder="${i18nManager.t('notion.settings.token_placeholder')}">
            </div>
            <div class="form-group">
              <label>${i18nManager.t('notion.settings.database_id')}:</label>
              <input type="text" id="notion-database-id" placeholder="${i18nManager.t('notion.settings.database_placeholder')}">
            </div>
            <button id="connect-notion" class="primary-button">${i18nManager.t('notion.settings.connect')}</button>
          </div>
        </div>
      </div>
    `;

    await this.restoreNotionInputValues();
    // 设置事件监听器
    this.setupNotionSettingsEvents();
  }

  private async restoreNotionInputValues(): Promise<void> {
    const tokenInput = document.getElementById('notion-token') as HTMLInputElement | null;
    const databaseIdInput = document.getElementById('notion-database-id') as HTMLInputElement | null;

    if (!tokenInput && !databaseIdInput) {
      return;
    }

    try {
      const stored = await chrome.storage.sync.get([
        NOTION_STORAGE_KEYS.integrationToken,
        NOTION_STORAGE_KEYS.databaseIdDraft,
        NOTION_STORAGE_KEYS.databaseId
      ]);

      const savedToken = stored[NOTION_STORAGE_KEYS.integrationToken];
      if (tokenInput && typeof savedToken === 'string' && savedToken.length > 0) {
        tokenInput.value = savedToken;
      }

      if (databaseIdInput) {
        const savedDatabaseId = stored[NOTION_STORAGE_KEYS.databaseIdDraft] ?? stored[NOTION_STORAGE_KEYS.databaseId];
        if (typeof savedDatabaseId === 'string' && savedDatabaseId.length > 0) {
          databaseIdInput.value = savedDatabaseId;
        }
      }
    } catch (error) {
      console.error('Failed to restore Notion input values:', error);
    }
  }

  /**
   * 设置 Notion 设置事件监听器
   */
  private setupNotionSettingsEvents(): void {
    // 连接按钮
    const connectBtn = document.getElementById('connect-notion');
    if (connectBtn) {
      connectBtn.addEventListener('click', () => this.connectNotion());
    }

    // 断开连接按钮
    const disconnectBtn = document.getElementById('disconnect-notion');
    if (disconnectBtn) {
      disconnectBtn.addEventListener('click', () => this.disconnectNotion());
    }

    // 配置数据库按钮
    const configureBtn = document.getElementById('configure-database');
    if (configureBtn) {
      configureBtn.addEventListener('click', () => this.configureDatabase());
    }

    // 测试连接按钮
    const testBtn = document.getElementById('test-connection');
    if (testBtn) {
      testBtn.addEventListener('click', () => this.testNotionConnection());
    }

    const tokenInput = document.getElementById('notion-token') as HTMLInputElement | null;
    if (tokenInput) {
      tokenInput.addEventListener('input', async (event) => {
        const value = (event.target as HTMLInputElement).value;
        try {
          await chrome.storage.sync.set({
            [NOTION_STORAGE_KEYS.integrationToken]: value
          });
        } catch (error) {
          console.error('Failed to cache Notion token input:', error);
        }
      });
    }

    const databaseIdInput = document.getElementById('notion-database-id') as HTMLInputElement | null;
    if (databaseIdInput) {
      databaseIdInput.addEventListener('input', async (event) => {
        const value = (event.target as HTMLInputElement).value.trim();
        try {
          if (value) {
            await chrome.storage.sync.set({
              [NOTION_STORAGE_KEYS.databaseIdDraft]: value
            });
          } else {
            await chrome.storage.sync.remove(NOTION_STORAGE_KEYS.databaseIdDraft);
          }
        } catch (error) {
          console.error('Failed to cache Notion database id input:', error);
        }
      });
    }
  }

  /**
   * 连接 Notion
   */
  private async connectNotion(): Promise<void> {
    const tokenInput = document.getElementById('notion-token') as HTMLInputElement | null;
    const databaseIdInput = document.getElementById('notion-database-id') as HTMLInputElement | null;
    if (!tokenInput?.value) {
      this.showError('请输入 Integration Token');
      return;
    }

    const trimmedToken = tokenInput.value.trim();
    const trimmedDatabaseId = databaseIdInput?.value.trim();

    try {
      // 先保存 token 到 storage
      console.log('Saving token to storage...');
      await chrome.storage.sync.set({
        [NOTION_STORAGE_KEYS.integrationToken]: trimmedToken
      });
      console.log('Token saved to storage');

      // 然后发送认证请求
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_AUTHENTICATE'
      });

      if (response.success) {
        this.showSuccess('Notion 连接成功！');
        // 如果有数据库ID，也保存它
        if (trimmedDatabaseId) {
          const setDatabaseResponse = await browser.runtime.sendMessage({
            type: 'NOTION_SET_DATABASE',
            databaseId: trimmedDatabaseId
          });
          if (setDatabaseResponse?.success) {
            await chrome.storage.sync.remove(NOTION_STORAGE_KEYS.databaseIdDraft);
          } else {
            this.showError('配置数据库失败: ' + (setDatabaseResponse?.error || '未知错误'));
          }
        }
        // 重新加载设置
        this.loadNotionSettings();
      } else {
        this.showError('连接失败: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to connect Notion:', error);
      this.showError('连接失败: ' + error);
    }
  }

  /**
   * 断开 Notion 连接
   */
  private async disconnectNotion(): Promise<void> {
    if (!confirm('确定要断开 Notion 连接吗？')) {
      return;
    }

    try {
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_DISCONNECT'
      });

      if (!response) {
        this.showError('断开连接失败: 未收到响应');
        return;
      }

      if (response.success) {
        this.showSuccess('Notion 已断开连接');
        // 重新加载设置
        this.loadNotionSettings();
      } else {
        this.showError('断开连接失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to disconnect Notion:', error);
      this.showError('断开连接失败: ' + error);
    }
  }

  /**
   * 配置数据库
   */
  private async configureDatabase(): Promise<void> {
    try {
      // 首先获取用户的页面列表
      const pagesResponse = await browser.runtime.sendMessage({
        type: 'NOTION_GET_USER_PAGES'
      });

      if (!pagesResponse || !pagesResponse.success) {
        this.showError('获取页面列表失败: ' + (pagesResponse?.error || '未知错误'));
        return;
      }

      const pages = pagesResponse.pages || [];
      const databases = pagesResponse.databases || [];
      if (pages.length === 0 && databases.length === 0) {
        this.showError('没有可用的页面或数据库。请确保您的集成已被添加到至少一个 Notion 页面。');
        return;
      }

      if (databases.length === 1) {
        const [onlyDatabase] = databases;
        const setResponse = await browser.runtime.sendMessage({
          type: 'NOTION_SET_DATABASE',
          databaseId: onlyDatabase.id
        });

        if (setResponse && setResponse.success) {
          this.showSuccess(`已自动连接数据库 "${onlyDatabase.title}"`);
          this.loadNotionSettings();
          return;
        }

        this.showError('自动连接失败，已打开选择器，请手动选择数据库或父页面。原因: ' + (setResponse?.error || '未知错误'));
      }

      // 选择已有数据库或父页面
      const selection = await this.showDatabaseOrPageSelector(databases, pages);
      if (!selection) {
        return; // 用户取消了
      }

      if (selection.type === 'database') {
        const setResponse = await browser.runtime.sendMessage({
          type: 'NOTION_SET_DATABASE',
          databaseId: selection.item.id
        });

        if (setResponse && setResponse.success) {
          this.showSuccess(`已连接数据库 "${selection.item.title}"`);
          this.loadNotionSettings();
        } else {
          this.showError('选择数据库失败: ' + (setResponse?.error || '未知错误'));
        }
        return;
      }

      // 询问数据库名称
      const databaseName = prompt('请输入数据库名称：', 'Tweet Collection');
      if (!databaseName) {
        return; // 用户取消了
      }

      // 创建数据库
      const createResponse = await browser.runtime.sendMessage({
        type: 'NOTION_CREATE_DATABASE',
        parentPageId: selection.item.id,
        title: databaseName
      });

      if (createResponse && createResponse.success) {
        this.showSuccess(`数据库 "${databaseName}" 创建成功！`);
        // 重新加载设置以显示新的数据库信息
        this.loadNotionSettings();
      } else {
        this.showError('创建数据库失败: ' + (createResponse?.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to configure database:', error);
      this.showError('配置失败: ' + error);
    }
  }

  /**
   * 测试 Notion 连接
   */
  private async testNotionConnection(): Promise<void> {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_IS_CONNECTED'
      });

      if (!response) {
        this.showError('测试连接失败: 未收到响应');
        return;
      }

      if (response.success && response.connected) {
        this.showSuccess('Notion 连接正常！');
      } else if (response.success && !response.connected) {
        this.showError('Notion 未连接，请先连接您的账户');
      } else {
        this.showError('连接测试失败: ' + (response.error || '未知错误'));
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
      this.showError('连接测试失败: ' + error);
    }
  }

  /**
   * 显示页面选择器
   */
  private async showDatabaseOrPageSelector(
    databases: Array<{ id: string; title: string }>,
    pages: Array<{ id: string; title: string }>
  ): Promise<{ type: 'database' | 'page'; item: { id: string; title: string } } | null> {
    return new Promise((resolve) => {
      // 创建模态对话框
      const modal = document.createElement('div');
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 400px;
        width: 90%;
        max-height: 500px;
        overflow-y: auto;
        color: #0f1419;
      `;

      const title = document.createElement('h3');
      title.textContent = '选择数据库或父页面';
      title.style.marginTop = '0';

      const subtitle = document.createElement('p');
      subtitle.textContent = '可复用已有数据库，或选择页面创建新数据库：';
      subtitle.style.color = '#666';

      const databaseSectionTitle = document.createElement('h4');
      databaseSectionTitle.textContent = '已有数据库';
      databaseSectionTitle.style.cssText = `
        margin: 16px 0 8px;
        font-size: 14px;
        color: #111827;
      `;

      const databaseList = document.createElement('div');
      databaseList.style.cssText = `
        margin: 8px 0 12px;
        max-height: 180px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      `;

      if (databases.length === 0) {
        const emptyDatabases = document.createElement('div');
        emptyDatabases.textContent = '未找到可复用的数据库';
        emptyDatabases.style.cssText = `
          padding: 10px;
          color: #6b7280;
          font-size: 13px;
        `;
        databaseList.appendChild(emptyDatabases);
      } else {
        databases.forEach(database => {
          const databaseItem = document.createElement('div');
          databaseItem.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background-color 0.2s;
            color: #0f1419;
          `;
          databaseItem.textContent = database.title || 'Untitled database';

          databaseItem.addEventListener('mouseenter', () => {
            databaseItem.style.backgroundColor = '#f5f5f5';
          });

          databaseItem.addEventListener('mouseleave', () => {
            databaseItem.style.backgroundColor = '';
          });

          databaseItem.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve({ type: 'database', item: database });
          });

          databaseList.appendChild(databaseItem);
        });
      }

      const divider = document.createElement('div');
      divider.style.cssText = `
        margin: 12px 0;
        border-top: 1px solid #e5e7eb;
      `;

      const pageSectionTitle = document.createElement('h4');
      pageSectionTitle.textContent = '创建新数据库';
      pageSectionTitle.style.cssText = `
        margin: 12px 0 8px;
        font-size: 14px;
        color: #111827;
      `;

      const pageList = document.createElement('div');
      pageList.style.cssText = `
        margin: 15px 0;
        max-height: 300px;
        overflow-y: auto;
        border: 1px solid #ddd;
        border-radius: 4px;
      `;

      if (pages.length === 0) {
        const emptyPages = document.createElement('div');
        emptyPages.textContent = '未找到可用页面';
        emptyPages.style.cssText = `
          padding: 10px;
          color: #6b7280;
          font-size: 13px;
        `;
        pageList.appendChild(emptyPages);
      } else {
        pages.forEach(page => {
          const pageItem = document.createElement('div');
          pageItem.style.cssText = `
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            transition: background-color 0.2s;
            color: #0f1419;
          `;
          pageItem.textContent = page.title;

          pageItem.addEventListener('mouseenter', () => {
            pageItem.style.backgroundColor = '#f5f5f5';
          });

          pageItem.addEventListener('mouseleave', () => {
            pageItem.style.backgroundColor = '';
          });

          pageItem.addEventListener('click', () => {
            document.body.removeChild(modal);
            resolve({ type: 'page', item: page });
          });

          pageList.appendChild(pageItem);
        });
      }

      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 15px;
      `;

      const cancelButton = document.createElement('button');
      cancelButton.textContent = '取消';
      cancelButton.style.cssText = `
        padding: 8px 16px;
        border: 1px solid #ddd;
        background: white;
        border-radius: 4px;
        cursor: pointer;
      `;
      cancelButton.addEventListener('click', () => {
        document.body.removeChild(modal);
        resolve(null);
      });

      buttonContainer.appendChild(cancelButton);
      dialog.appendChild(title);
      dialog.appendChild(subtitle);
      dialog.appendChild(databaseSectionTitle);
      dialog.appendChild(databaseList);
      dialog.appendChild(divider);
      dialog.appendChild(pageSectionTitle);
      dialog.appendChild(pageList);
      dialog.appendChild(buttonContainer);
      modal.appendChild(dialog);
      document.body.appendChild(modal);

      // 点击背景关闭
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal);
          resolve(null);
        }
      });
    });
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
