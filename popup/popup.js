/**
 * Twitter 超级复制插件 - 弹窗脚本
 * 处理弹窗界面交互和设置管理
 */

(function() {
  'use strict';

  // 全局状态
  let currentSettings = {
    format: 'html',
    includeMedia: true,
    includeMetrics: false,
    includeAuthor: false,  // 默认不包含作者信息，只复制内容
    includeTimestamp: false  // 默认不包含时间戳，只复制内容
  };
  
  let isHistoryVisible = false;
  let copyHistory = [];

  /**
   * 初始化弹窗
   */
  function initializePopup() {
    console.log('🎛️ 初始化弹窗界面');
    
    // 等待国际化系统加载
    const initializeI18n = new Promise((resolve) => {
      if (window.I18nManager) {
        resolve();
      } else {
        const checkI18n = setInterval(() => {
          if (window.I18nManager) {
            clearInterval(checkI18n);
            resolve();
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkI18n);
          resolve();
        }, 3000);
      }
    });
    
    // 初始化国际化和设置
    initializeI18n
      .then(() => {
        console.log('🌍 国际化系统加载完成');
        
        // 设置语言变更监听器
        window.addEventListener('localeChanged', handleLocaleChange);
        
        // 更新界面文本
        updateLocalization();
        
        return loadSettings();
      })
      .then(() => {
        console.log('⚙️ 设置加载完成');
        
        // 绑定事件监听器
        bindEventListeners();
        
        // 更新UI状态
        updateUI();
        
        console.log('✅ 弹窗界面初始化完成');
      })
      .catch(error => {
        console.error('❌ 弹窗初始化失败:', error);
      });
  }

  /**
   * 加载用户设置
   */
  async function loadSettings() {
    try {
      // 从内容脚本获取设置
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'getSettings' });
        if (response && response.settings) {
          currentSettings = { ...currentSettings, ...response.settings };
        }
      }
    } catch (error) {
      console.warn('从内容脚本加载设置失败，使用默认设置:', error);
      
      // 从本地存储加载
      try {
        const result = await chrome.storage.local.get('superCopySettings');
        if (result.superCopySettings) {
          currentSettings = { ...currentSettings, ...result.superCopySettings };
        }
      } catch (storageError) {
        console.warn('从存储加载设置失败:', storageError);
      }
    }
  }

  /**
   * 保存设置
   */
  async function saveSettings() {
    try {
      // 保存到本地存储
      await chrome.storage.local.set({ superCopySettings: currentSettings });
      
      // 通知内容脚本更新设置
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'updateSettings', 
          settings: currentSettings 
        });
      }
    } catch (error) {
      console.error('保存设置失败:', error);
      showToast('设置保存失败', 'error');
    }
  }

  /**
   * 绑定事件监听器
   */
  function bindEventListeners() {
    // 复制当前推文按钮
    document.getElementById('copyCurrentBtn').addEventListener('click', handleCopyCurrentTweet);
    
    // 查看历史按钮
    document.getElementById('viewHistoryBtn').addEventListener('click', toggleHistory);
    
    // 清空历史按钮
    document.getElementById('clearHistoryBtn').addEventListener('click', handleClearHistory);
    
    // 帮助按钮
    document.getElementById('helpBtn').addEventListener('click', showHelp);
    
    // 格式选项
    document.querySelectorAll('input[name="format"]').forEach(radio => {
      radio.addEventListener('change', handleFormatChange);
    });
    
    // 复选框选项
    ['includeMedia', 'includeMetrics', 'includeAuthor', 'includeTimestamp'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.addEventListener('change', handleCheckboxChange);
      }
    });

    // 绑定语言选择器
    bindLanguageSelector();
  }

  /**
   * 更新UI状态
   */
  function updateUI() {
    // 更新格式选择
    const formatRadio = document.querySelector(`input[name="format"][value="${currentSettings.format}"]`);
    if (formatRadio) {
      formatRadio.checked = true;
    }
    
    // 更新复选框状态
    ['includeMedia', 'includeMetrics', 'includeAuthor', 'includeTimestamp'].forEach(id => {
      const checkbox = document.getElementById(id);
      if (checkbox) {
        checkbox.checked = currentSettings[id] || false;
      }
    });
  }

  /**
   * 处理复制当前推文
   */
  async function handleCopyCurrentTweet() {
    const button = document.getElementById('copyCurrentBtn');
    
    try {
      // 显示加载状态
      showButtonLoading(button, true);
      
      // 发送复制命令到内容脚本
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { 
          action: 'copyCurrentTweet' 
        });
        
        if (response && response.success) {
          showToast('复制成功！', 'success');
        } else {
          throw new Error(response?.error || '复制失败');
        }
      } else {
        throw new Error('未找到活动标签页');
      }
      
    } catch (error) {
      console.error('复制推文失败:', error);
      showToast('复制失败: ' + error.message, 'error');
    } finally {
      showButtonLoading(button, false);
    }
  }

  /**
   * 切换历史记录显示
   */
  async function toggleHistory() {
    const historySection = document.getElementById('historySection');
    
    if (!isHistoryVisible) {
      // 显示历史记录
      await loadCopyHistory();
      historySection.style.display = 'block';
      isHistoryVisible = true;
      document.getElementById('viewHistoryBtn').textContent = '隐藏历史';
    } else {
      // 隐藏历史记录
      historySection.style.display = 'none';
      isHistoryVisible = false;
      document.getElementById('viewHistoryBtn').textContent = '复制历史';
    }
  }

  /**
   * 加载复制历史
   */
  async function loadCopyHistory() {
    try {
      const result = await chrome.storage.local.get('superCopyHistory');
      copyHistory = result.superCopyHistory || [];
      
      renderHistoryList();
    } catch (error) {
      console.error('加载历史记录失败:', error);
      showToast('加载历史记录失败', 'error');
    }
  }

  /**
   * 渲染历史记录列表
   */
  function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    
    if (copyHistory.length === 0) {
      historyList.innerHTML = '<div class="empty-history">暂无复制记录</div>';
      return;
    }
    
    historyList.innerHTML = copyHistory.slice(0, 10).map((item, index) => {
      const date = new Date(item.timestamp).toLocaleString('zh-CN');
      const preview = getContentPreview(item.content);
      
      return `
        <div class="history-item" data-index="${index}">
          <div class="history-preview">${preview}</div>
          <div class="history-meta">
            <span class="history-date">${date}</span>
            <span class="history-format">${item.format.toUpperCase()}</span>
          </div>
          <button class="history-copy-btn" data-index="${index}">
            <svg width="12" height="12" viewBox="0 0 24 24">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
            </svg>
          </button>
        </div>
      `;
    }).join('');
    
    // 绑定历史项目的点击事件
    historyList.querySelectorAll('.history-copy-btn').forEach(btn => {
      btn.addEventListener('click', handleHistoryItemCopy);
    });
  }

  /**
   * 获取内容预览
   */
  function getContentPreview(content) {
    let text = '';
    
    if (content.text) {
      text = content.text;
    } else if (content.html) {
      // 去除HTML标签
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content.html;
      text = tempDiv.textContent || tempDiv.innerText;
    }
    
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  /**
   * 处理历史项目复制
   */
  async function handleHistoryItemCopy(event) {
    const index = parseInt(event.currentTarget.dataset.index);
    const item = copyHistory[index];
    
    if (!item) return;
    
    try {
      await navigator.clipboard.writeText(item.content.text || item.content.html);
      showToast('历史内容已复制', 'success');
    } catch (error) {
      console.error('复制历史内容失败:', error);
      showToast('复制失败', 'error');
    }
  }

  /**
   * 清空复制历史
   */
  async function handleClearHistory() {
    try {
      await chrome.storage.local.remove('superCopyHistory');
      copyHistory = [];
      renderHistoryList();
      showToast('历史记录已清空', 'success');
    } catch (error) {
      console.error('清空历史失败:', error);
      showToast('清空历史失败', 'error');
    }
  }

  /**
   * 处理格式变化
   */
  function handleFormatChange(event) {
    currentSettings.format = event.target.value;
    saveSettings();
    showToast('格式设置已更新', 'success');
  }

  /**
   * 处理复选框变化
   */
  function handleCheckboxChange(event) {
    const setting = event.target.id;
    currentSettings[setting] = event.target.checked;
    saveSettings();
    showToast('设置已更新', 'success');
  }

  /**
   * 显示按钮加载状态
   */
  function showButtonLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.classList.add('loading');
      const originalText = button.textContent;
      button.dataset.originalText = originalText;
      button.textContent = '复制中...';
    } else {
      button.disabled = false;
      button.classList.remove('loading');
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  /**
   * 显示提示消息
   */
  function showToast(message, type = 'info') {
    // 移除现有的提示
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
      existingToast.remove();
    }
    
    // 创建新的提示
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // 添加样式
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '8px 16px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      color: 'white',
      zIndex: '10000',
      transition: 'all 0.3s ease'
    });
    
    // 设置背景色
    switch (type) {
      case 'success':
        toast.style.backgroundColor = '#10b981';
        break;
      case 'error':
        toast.style.backgroundColor = '#ef4444';
        break;
      default:
        toast.style.backgroundColor = '#3b82f6';
    }
    
    document.body.appendChild(toast);
    
    // 自动移除
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3000);
  }

  /**
   * 显示帮助信息
   */
  function showHelp() {
    const helpContent = `
Twitter 超级复制插件使用说明：

1. 复制功能：
   - 点击推文旁的复制按钮
   - 使用快捷键 Ctrl+Shift+C

2. 格式选项：
   - HTML：保留原始样式和链接
   - Markdown：适合笔记应用
   - 纯文本：仅复制文字内容

3. 内容设置：
   - 可选择包含媒体信息、互动数据等

4. 复制历史：
   - 查看最近50次复制记录
   - 点击可重新复制历史内容
    `;
    
    alert(helpContent);
  }

  // 页面加载完成后初始化
  /**
   * 更新界面本地化文本
   */
  function updateLocalization() {
    if (!window.I18nManager || !window.t) {
      console.warn('国际化系统未加载');
      return;
    }

    try {
      // 更新所有带有 data-i18n 属性的元素
      const elements = document.querySelectorAll('[data-i18n]');
      elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const text = window.t(key);
        
        // 对于按钮，更新按钮文本部分
        if (element.tagName === 'BUTTON') {
          const textSpan = element.querySelector('.btn-text');
          if (textSpan) {
            textSpan.textContent = text;
          } else {
            // 如果没有span，直接更新文本内容（保持图标）
            const svg = element.querySelector('svg');
            element.innerHTML = '';
            if (svg) element.appendChild(svg);
            element.appendChild(document.createTextNode(text));
          }
        } else {
          element.textContent = text;
        }
      });

      // 更新语言选择器
      updateLanguageSelector();
      
      console.log('🌍 界面本地化更新完成');
    } catch (error) {
      console.error('❌ 界面本地化更新失败:', error);
    }
  }

  /**
   * 更新语言选择器状态
   */
  function updateLanguageSelector() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect || !window.I18nManager) return;

    const currentLocale = window.I18nManager.getCurrentLocale();
    const savedLocale = localStorage.getItem('superCopyLocale');
    
    // 设置选中值
    if (savedLocale) {
      languageSelect.value = savedLocale;
    } else {
      languageSelect.value = 'auto';
    }
  }

  /**
   * 处理语言变更事件
   */
  function handleLocaleChange(event) {
    console.log('🌍 语言已更改为:', event.detail.locale);
    updateLocalization();
    
    // 通知内容脚本语言变更
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'localeChanged',
          locale: event.detail.locale
        });
      }
    });
  }

  /**
   * 绑定语言选择器事件
   */
  function bindLanguageSelector() {
    const languageSelect = document.getElementById('languageSelect');
    if (!languageSelect) return;

    languageSelect.addEventListener('change', async (event) => {
      const selectedLocale = event.target.value;
      
      if (selectedLocale === 'auto') {
        // 移除保存的语言设置，使用自动检测
        localStorage.removeItem('superCopyLocale');
        
        // 重新检测语言
        if (window.I18nManager) {
          const detectedLocale = window.I18nManager.detectLocale();
          await window.I18nManager.setLocale(detectedLocale);
        }
      } else {
        // 设置选中的语言
        if (window.I18nManager) {
          await window.I18nManager.setLocale(selectedLocale);
        }
      }
    });
  }

  document.addEventListener('DOMContentLoaded', initializePopup);

})(); 