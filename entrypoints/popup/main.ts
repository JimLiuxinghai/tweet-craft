import './style.css';

interface CopySettings {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMedia: boolean;
  includeStats: boolean;
  language: string;
}

interface HistoryItem {
  id: number;
  timestamp: string;
  tweetData: any;
  formattedContent: string;
  format: string;
}

class TwitterCopyPopup {
  private settings: CopySettings = {
    format: 'html',
    includeAuthor: true,
    includeTimestamp: true,
    includeMedia: true,
    includeStats: false,
    language: 'auto'
  };

  constructor() {
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    this.updateUI();
  }

  async loadSettings() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'GET_SETTINGS' });
      if (response) {
        this.settings = { ...this.settings, ...response };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  setupEventListeners() {
    // 格式选择
    const formatRadios = document.querySelectorAll('input[name="format"]');
    formatRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.settings.format = target.value as 'html' | 'markdown' | 'text';
      });
    });

    // 内容选项
    const checkboxes = [
      { id: 'includeAuthor', key: 'includeAuthor' },
      { id: 'includeTimestamp', key: 'includeTimestamp' },
      { id: 'includeMedia', key: 'includeMedia' },
      { id: 'includeStats', key: 'includeStats' }
    ];

    checkboxes.forEach(({ id, key }) => {
      const checkbox = document.getElementById(id) as HTMLInputElement;
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          (this.settings as any)[key] = target.checked;
        });
      }
    });

    // 语言选择
    const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.settings.language = target.value;
      });
    }

    // 保存按钮
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.saveSettings());
    }

    // 历史按钮
    const historyBtn = document.getElementById('historyBtn');
    if (historyBtn) {
      historyBtn.addEventListener('click', () => this.showHistory());
    }

    // 模态框关闭
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
      closeModal.addEventListener('click', () => this.hideHistory());
    }

    // 清空历史
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    }

    // 点击模态框外部关闭
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.hideHistory();
        }
      });
    }
  }

  updateUI() {
    // 更新格式选择
    const formatRadio = document.querySelector(`input[name="format"][value="${this.settings.format}"]`) as HTMLInputElement;
    if (formatRadio) {
      formatRadio.checked = true;
    }

    // 更新复选框
    const checkboxes = [
      { id: 'includeAuthor', key: 'includeAuthor' },
      { id: 'includeTimestamp', key: 'includeTimestamp' },
      { id: 'includeMedia', key: 'includeMedia' },
      { id: 'includeStats', key: 'includeStats' }
    ];

    checkboxes.forEach(({ id, key }) => {
      const checkbox = document.getElementById(id) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = (this.settings as any)[key];
      }
    });

    // 更新语言选择
    const languageSelect = document.getElementById('languageSelect') as HTMLSelectElement;
    if (languageSelect) {
      languageSelect.value = this.settings.language;
    }
  }

  async saveSettings() {
    try {
      this.showLoading(true);
      
      const response = await browser.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        settings: this.settings
      });

      if (response?.success) {
        this.showNotification('设置已保存', 'success');
      } else {
        this.showNotification('保存失败', 'error');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showNotification('保存失败', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async showHistory() {
    try {
      this.showLoading(true);
      
      const history = await browser.runtime.sendMessage({ type: 'GET_COPY_HISTORY' });
      this.renderHistory(history || []);
      
      const modal = document.getElementById('historyModal');
      if (modal) {
        modal.style.display = 'flex';
      }
    } catch (error) {
      console.error('Failed to load history:', error);
      this.showNotification('加载历史失败', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  hideHistory() {
    const modal = document.getElementById('historyModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  renderHistory(history: HistoryItem[]) {
    const historyList = document.getElementById('historyList');
    if (!historyList) return;

    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-history">暂无复制历史</div>';
      return;
    }

    historyList.innerHTML = history.map(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      const preview = item.tweetData?.content || item.formattedContent;
      const truncatedPreview = preview.length > 100 ? 
        preview.substring(0, 100) + '...' : preview;

      return `
        <div class="history-item" data-content="${this.escapeHtml(item.formattedContent)}">
          <div class="history-item-header">
            <span class="history-item-time">${timeStr}</span>
            <span class="history-item-format">${item.format.toUpperCase()}</span>
          </div>
          <div class="history-item-content">${this.escapeHtml(truncatedPreview)}</div>
        </div>
      `;
    }).join('');

    // 添加点击事件
    historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', async () => {
        const content = item.getAttribute('data-content');
        if (content) {
          try {
            await navigator.clipboard.writeText(content);
            this.showNotification('已复制到剪贴板', 'success');
          } catch (error) {
            console.error('Failed to copy from history:', error);
            this.showNotification('复制失败', 'error');
          }
        }
      });
    });
  }

  async clearHistory() {
    try {
      const response = await browser.runtime.sendMessage({ type: 'CLEAR_COPY_HISTORY' });
      
      if (response?.success) {
        this.renderHistory([]);
        this.showNotification('历史已清空', 'success');
      } else {
        this.showNotification('清空失败', 'error');
      }
    } catch (error) {
      console.error('Failed to clear history:', error);
      this.showNotification('清空失败', 'error');
    }
  }

  showLoading(show: boolean) {
    const loading = document.getElementById('loading');
    if (loading) {
      loading.style.display = show ? 'flex' : 'none';
    }
  }

  showNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// 初始化popup
document.addEventListener('DOMContentLoaded', () => {
  new TwitterCopyPopup();
});