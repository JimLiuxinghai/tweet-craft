// 简化的 Notion 设置组件
import { browser } from 'wxt/browser';

class SimpleNotionSettings {
  private container: HTMLElement | null = null;

  constructor() {
    this.createButton();
  }

  private createButton() {
    const button = document.createElement('button');
    button.textContent = 'Notion 设置';
    button.className = 'notion-settings-btn';
    button.addEventListener('click', () => this.showSettings());
    
    const projectInfo = document.querySelector('.project-info');
    if (projectInfo) {
      projectInfo.appendChild(button);
    }
  }

  private async showSettings() {
    try {
      // 检查连接状态
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_IS_CONNECTED'
      });

      if (response.success && response.connected) {
        this.showConnectedSettings();
      } else {
        this.showConnectionSettings();
      }
    } catch (error) {
      console.error('Failed to check Notion status:', error);
      alert('无法检查 Notion 连接状态');
    }
  }

  private showConnectedSettings() {
    const modal = this.createModal();
    modal.innerHTML = `
      <div class="notion-settings-header">
        <h3>Notion 设置</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="notion-settings-content">
        <div class="status-success">
          <span class="status-icon">✓</span>
          <span>Notion 已连接</span>
        </div>
        <div class="settings-actions">
          <button class="disconnect-btn">断开连接</button>
          <button class="cancel-btn">关闭</button>
        </div>
      </div>
    `;

    this.setupModalEvents(modal);
  }

  private showConnectionSettings() {
    const modal = this.createModal();
    modal.innerHTML = `
      <div class="notion-settings-header">
        <h3>Notion 设置</h3>
        <button class="close-btn">&times;</button>
      </div>
      <div class="notion-settings-content">
        <div class="setup-instructions">
          <h4>设置说明：</h4>
          <ol>
            <li>访问 <a href="https://www.notion.so/my-integrations" target="_blank">Notion 集成页面</a></li>
            <li>点击 "+ New integration"</li>
            <li>填写集成信息：名称 "Tweet Craft"</li>
            <li>启用 "Read content" 和 "Insert content" 权限</li>
            <li>复制 "Internal Integration Token"</li>
            <li>在下方填入 Client ID 和 Client Secret</li>
          </ol>
        </div>
        <div class="form-group">
          <label>Client ID:</label>
          <input type="text" id="notion-client-id" placeholder="输入您的 Client ID">
        </div>
        <div class="form-group">
          <label>Client Secret:</label>
          <input type="password" id="notion-client-secret" placeholder="输入您的 Client Secret">
        </div>
        <div class="settings-actions">
          <button class="connect-btn">连接 Notion</button>
          <button class="cancel-btn">取消</button>
        </div>
      </div>
    `;

    this.setupModalEvents(modal);
  }

  private createModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'notion-settings-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    const content = document.createElement('div');
    content.className = 'notion-settings-modal-content';
    content.style.cssText = `
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    `;

    modal.appendChild(content);
    document.body.appendChild(modal);

    return modal;
  }

  private setupModalEvents(modal: HTMLElement) {
    const content = modal.querySelector('.notion-settings-modal-content') as HTMLElement;
    const closeBtn = modal.querySelector('.close-btn') as HTMLElement;
    const cancelBtn = modal.querySelector('.cancel-btn') as HTMLElement;
    const connectBtn = modal.querySelector('.connect-btn') as HTMLElement;
    const disconnectBtn = modal.querySelector('.disconnect-btn') as HTMLElement;

    const closeModal = () => {
      document.body.removeChild(modal);
    };

    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    connectBtn?.addEventListener('click', async () => {
      const clientId = (modal.querySelector('#notion-client-id') as HTMLInputElement)?.value;
      const clientSecret = (modal.querySelector('#notion-client-secret') as HTMLInputElement)?.value;

      if (!clientId || !clientSecret) {
        alert('请填写 Client ID 和 Client Secret');
        return;
      }

      // 保存配置
      await browser.storage.sync.set({
        notion_client_id: clientId,
        notion_client_secret: clientSecret
      });

      // 开始连接流程
      await this.connectNotion();
      closeModal();
    });

    disconnectBtn?.addEventListener('click', async () => {
      if (confirm('确定要断开 Notion 连接吗？')) {
        await this.disconnectNotion();
        closeModal();
      }
    });

    // 点击背景关闭
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });
  }

  private async connectNotion() {
    try {
      // 获取用户输入的token
      const tokenInput = document.querySelector('#notion-token') as HTMLInputElement;
      if (!tokenInput?.value) {
        alert('请输入 Integration Token');
        return;
      }

      // 先保存 token 到 storage
      console.log('Saving token to storage...');
      await chrome.storage.sync.set({
        notion_integration_token: tokenInput.value.trim()
      });
      console.log('Token saved to storage');

      // 然后发送认证请求
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_AUTHENTICATE'
      });

      if (response.success) {
        alert('Notion 连接成功！');
      } else {
        alert('连接失败: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to connect Notion:', error);
      alert('连接失败: ' + error);
    }
  }

  private async disconnectNotion() {
    try {
      const response = await browser.runtime.sendMessage({
        type: 'NOTION_DISCONNECT'
      });

      if (response.success) {
        alert('Notion 已断开连接');
      } else {
        alert('断开连接失败: ' + response.error);
      }
    } catch (error) {
      console.error('Failed to disconnect Notion:', error);
      alert('断开连接失败: ' + error);
    }
  }
}

// 添加样式
const style = document.createElement('style');
style.textContent = `
.notion-settings-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin: 10px 0;
  border: none;
  border-radius: 6px;
  background: #3b82f6;
  color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.notion-settings-btn:hover {
  background: #2563eb;
}

.notion-settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.notion-settings-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.notion-settings-header .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.notion-settings-header .close-btn:hover {
  background: #f3f4f6;
  color: #374151;
}

.notion-settings-content {
  padding: 20px;
}

.setup-instructions {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8fafc;
  border-radius: 6px;
  border-left: 4px solid #3b82f6;
}

.setup-instructions h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.setup-instructions ol {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #4b5563;
}

.setup-instructions li {
  margin-bottom: 5px;
}

.setup-instructions a {
  color: #3b82f6;
  text-decoration: none;
}

.setup-instructions a:hover {
  text-decoration: underline;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.status-success {
  display: flex;
  align-items: center;
  padding: 15px;
  background: #d1fae5;
  border-radius: 6px;
  margin-bottom: 20px;
}

.status-success .status-icon {
  margin-right: 10px;
  font-size: 18px;
  color: #059669;
}

.status-success span {
  font-size: 14px;
  color: #065f46;
  font-weight: 500;
}

.settings-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.settings-actions button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.connect-btn {
  background: #3b82f6;
  color: white;
}

.connect-btn:hover {
  background: #2563eb;
}

.disconnect-btn {
  background: #ef4444;
  color: white;
}

.disconnect-btn:hover {
  background: #dc2626;
}

.cancel-btn {
  background: #f3f4f6;
  color: #374151;
}

.cancel-btn:hover {
  background: #e5e7eb;
}
`;

document.head.appendChild(style);

// 初始化
new SimpleNotionSettings();