import { i18nManager } from '@/lib/i18n';

export interface VideoDownloadSettings {
  autoDownload: boolean;
  defaultQuality: 'highest' | 'medium' | 'lowest' | 'ask';
  showProgress: boolean;
  notifications: boolean;
  customPath?: string;
  filenameTemplate?: string;
}

interface DownloadHistoryItem {
  id: string;
  filename: string;
  url: string;
  tweetData: {
    username: string;
    id: string;
    timestamp: number;
  };
  downloadTime: number;
  status: 'completed' | 'failed';
  size?: number;
}

export class VideoSettingsPanel {
  private container: HTMLElement;
  private settings: VideoDownloadSettings;
  private historyItems: DownloadHistoryItem[] = [];

  constructor(container: HTMLElement, settings: VideoDownloadSettings) {
    this.container = container;
    this.settings = settings;
    this.init();
  }

  private async init() {
    await this.loadDownloadHistory();
    this.render();
    this.setupEventListeners();
  }

  private async loadDownloadHistory() {
    try {
      // 从后台脚本获取下载历史
      const response = await chrome.runtime.sendMessage({
        type: 'GET_DOWNLOAD_HISTORY'
      });
      
      if (response && Array.isArray(response)) {
        this.historyItems = response.map(item => ({
          id: item.downloadId?.toString() || Date.now().toString(),
          filename: item.filename || 'unknown.mp4',
          url: item.videoInfo?.url || '',
          tweetData: {
            username: item.tweetData?.username || 'unknown',
            id: item.tweetData?.id || '',
            timestamp: item.tweetData?.timestamp || Date.now()
          },
          downloadTime: item.startTime || Date.now(),
          status: 'completed' as const,
          size: item.videoInfo?.size
        }));
      }
    } catch (error) {
      console.error('Failed to load download history:', error);
      this.historyItems = [];
    }
  }

  private render() {
    const historyListHtml = this.historyItems.length > 0 
      ? this.historyItems.map(item => this.renderHistoryItem(item)).join('')
      : `<div class="empty-history">
          <div class="empty-icon">📥</div>
          <p>暂无下载历史</p>
          <small>下载视频后会在这里显示记录</small>
        </div>`;

    const historyContainer = this.container.querySelector('#download-history-list');
    if (historyContainer) {
      historyContainer.innerHTML = historyListHtml;
    }
  }

  private renderHistoryItem(item: DownloadHistoryItem): string {
    const timeAgo = this.formatTimeAgo(item.downloadTime);
    const fileSize = item.size ? this.formatFileSize(item.size) : '';
    
    return `
      <div class="history-item" data-id="${item.id}">
        <div class="history-item-content">
          <div class="history-item-header">
            <div class="history-item-info">
              <div class="history-filename" title="${item.filename}">
                ${this.truncateFilename(item.filename)}
              </div>
              <div class="history-meta">
                <span class="history-user">@${item.tweetData.username}</span>
                <span class="history-time">${timeAgo}</span>
                ${fileSize ? `<span class="history-size">${fileSize}</span>` : ''}
              </div>
            </div>
            <div class="history-actions">
              <button class="history-action-btn redownload-btn" title="重新下载">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
              <button class="history-action-btn delete-btn" title="删除记录">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"/>
                </svg>
              </button>
            </div>
          </div>
          <div class="history-item-status ${item.status}">
            ${item.status === 'completed' ? '✓ 下载完成' : '✗ 下载失败'}
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    // 设置变更监听
    const autoDownloadCheckbox = this.container.querySelector('#auto-download-video') as HTMLInputElement;
    const qualitySelect = this.container.querySelector('#default-quality') as HTMLSelectElement;
    const showProgressCheckbox = this.container.querySelector('#show-download-progress') as HTMLInputElement;
    const notificationsCheckbox = this.container.querySelector('#download-notifications') as HTMLInputElement;

    [autoDownloadCheckbox, showProgressCheckbox, notificationsCheckbox].forEach(checkbox => {
      if (checkbox) {
        checkbox.addEventListener('change', () => this.handleSettingsChange());
      }
    });

    if (qualitySelect) {
      qualitySelect.addEventListener('change', () => this.handleSettingsChange());
    }

    // 历史记录操作
    const historyList = this.container.querySelector('#download-history-list');
    if (historyList) {
      historyList.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const button = target.closest('.history-action-btn') as HTMLButtonElement;
        
        if (button) {
          const historyItem = button.closest('.history-item') as HTMLElement;
          const itemId = historyItem?.dataset.id;
          
          if (button.classList.contains('redownload-btn')) {
            this.handleRedownload(itemId);
          } else if (button.classList.contains('delete-btn')) {
            this.handleDeleteHistoryItem(itemId);
          }
        }
      });
    }

    // 刷新历史按钮
    const refreshButton = this.container.querySelector('#refresh-download-history');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => this.refreshHistory());
    }

    // 清空历史按钮
    const clearButton = this.container.querySelector('#clear-download-history');
    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearHistory());
    }
  }

  private handleSettingsChange() {
    const autoDownloadCheckbox = this.container.querySelector('#auto-download-video') as HTMLInputElement;
    const qualitySelect = this.container.querySelector('#default-quality') as HTMLSelectElement;
    const showProgressCheckbox = this.container.querySelector('#show-download-progress') as HTMLInputElement;
    const notificationsCheckbox = this.container.querySelector('#download-notifications') as HTMLInputElement;

    const newSettings: VideoDownloadSettings = {
      autoDownload: autoDownloadCheckbox?.checked || false,
      defaultQuality: (qualitySelect?.value as any) || 'ask',
      showProgress: showProgressCheckbox?.checked !== false,
      notifications: notificationsCheckbox?.checked !== false
    };

    // 触发设置变更事件
    this.container.dispatchEvent(new CustomEvent('video-settings-changed', {
      detail: newSettings
    }));
  }

  private async handleRedownload(itemId?: string) {
    if (!itemId) return;
    
    const item = this.historyItems.find(h => h.id === itemId);
    if (!item) return;

    try {
      // 重新下载
      await chrome.runtime.sendMessage({
        type: 'REDOWNLOAD_VIDEO',
        data: {
          url: item.url,
          filename: item.filename,
          tweetData: item.tweetData
        }
      });

      this.showNotification('重新下载已开始', 'success');
    } catch (error) {
      console.error('Failed to redownload:', error);
      this.showNotification('重新下载失败', 'error');
    }
  }

  private async handleDeleteHistoryItem(itemId?: string) {
    if (!itemId) return;

    if (!confirm('确定要删除这条下载记录吗？')) {
      return;
    }

    try {
      // 从历史记录中删除
      this.historyItems = this.historyItems.filter(item => item.id !== itemId);
      
      // 重新渲染
      this.render();
      
      this.showNotification('记录已删除', 'success');
    } catch (error) {
      console.error('Failed to delete history item:', error);
      this.showNotification('删除失败', 'error');
    }
  }

  private async refreshHistory() {
    const refreshButton = this.container.querySelector('#refresh-download-history') as HTMLButtonElement;
    if (refreshButton) {
      refreshButton.disabled = true;
      refreshButton.textContent = '刷新中...';
    }

    try {
      await this.loadDownloadHistory();
      this.render();
      this.showNotification('历史记录已刷新', 'success');
    } catch (error) {
      console.error('Failed to refresh history:', error);
      this.showNotification('刷新失败', 'error');
    } finally {
      if (refreshButton) {
        refreshButton.disabled = false;
        refreshButton.textContent = '刷新历史';
      }
    }
  }

  private async clearHistory() {
    if (!confirm('确定要清空所有下载历史吗？此操作不可恢复。')) {
      return;
    }

    try {
      await chrome.runtime.sendMessage({
        type: 'CLEAR_DOWNLOAD_HISTORY'
      });

      this.historyItems = [];
      this.render();
      this.showNotification('历史记录已清空', 'success');
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showNotification('清空失败', 'error');
    }
  }

  private formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天前`;
    if (hours > 0) return `${hours}小时前`;
    if (minutes > 0) return `${minutes}分钟前`;
    return '刚刚';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private truncateFilename(filename: string, maxLength: number = 25): string {
    if (filename.length <= maxLength) return filename;
    
    const extension = filename.split('.').pop();
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    const truncatedName = nameWithoutExt.substring(0, maxLength - extension!.length - 4) + '...';
    
    return `${truncatedName}.${extension}`;
  }

  private showNotification(message: string, type: 'success' | 'error' = 'success') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = `video-settings-notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 999999;
      background: ${type === 'success' ? '#00ba7c' : '#f91880'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);

    // 显示动画
    requestAnimationFrame(() => {
      notification.style.transform = 'translateX(0)';
    });

    // 3秒后自动消失
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  public updateSettings(newSettings: VideoDownloadSettings) {
    this.settings = newSettings;
    
    // 更新UI
    const autoDownloadCheckbox = this.container.querySelector('#auto-download-video') as HTMLInputElement;
    const qualitySelect = this.container.querySelector('#default-quality') as HTMLSelectElement;
    const showProgressCheckbox = this.container.querySelector('#show-download-progress') as HTMLInputElement;
    const notificationsCheckbox = this.container.querySelector('#download-notifications') as HTMLInputElement;

    if (autoDownloadCheckbox) autoDownloadCheckbox.checked = newSettings.autoDownload;
    if (qualitySelect) qualitySelect.value = newSettings.defaultQuality;
    if (showProgressCheckbox) showProgressCheckbox.checked = newSettings.showProgress;
    if (notificationsCheckbox) notificationsCheckbox.checked = newSettings.notifications;
  }
}

export default VideoSettingsPanel;