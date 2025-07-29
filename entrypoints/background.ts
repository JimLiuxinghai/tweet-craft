export default defineBackground(() => {
  console.log('Twitter Super Copy - Background Script Loaded');
  
  // 创建右键菜单
  createContextMenus();
  
  // 监听快捷键命令
  browser.commands.onCommand.addListener((command) => {
    if (command === 'copy-tweet') {
      handleCopyTweetShortcut();
    }
  });
  
  // 监听右键菜单点击
  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (tab?.id && info.menuItemId.toString().startsWith('copy-tweet-')) {
      const format = info.menuItemId.toString().replace('copy-tweet-', '');
      handleContextMenuCopy(tab.id, format);
    }
  });
  
  // 监听来自popup的消息
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'GET_COPY_HISTORY':
        getCopyHistory().then(sendResponse);
        return true;
      case 'CLEAR_COPY_HISTORY':
        clearCopyHistory().then(sendResponse);
        return true;
      case 'UPDATE_SETTINGS':
        updateSettings(message.settings).then(sendResponse);
        return true;
      case 'GET_SETTINGS':
        getSettings().then(sendResponse);
        return true;
    }
  });
});

function createContextMenus() {
  // 清除现有菜单
  browser.contextMenus.removeAll();
  
  // 创建主菜单
  browser.contextMenus.create({
    id: 'twitter-super-copy',
    title: 'Twitter 超级复制',
    contexts: ['page'],
    documentUrlPatterns: ['*://twitter.com/*', '*://x.com/*']
  });
  
  // 创建子菜单
  browser.contextMenus.create({
    id: 'copy-tweet-html',
    parentId: 'twitter-super-copy',
    title: '复制为富文本格式 (带样式)',
    contexts: ['page'],
    documentUrlPatterns: ['*://twitter.com/*', '*://x.com/*']
  });
  
  browser.contextMenus.create({
    id: 'copy-tweet-markdown',
    parentId: 'twitter-super-copy',
    title: '复制为 Markdown 格式',
    contexts: ['page'],
    documentUrlPatterns: ['*://twitter.com/*', '*://x.com/*']
  });
  
  browser.contextMenus.create({
    id: 'copy-tweet-text',
    parentId: 'twitter-super-copy',
    title: '复制为纯文本格式',
    contexts: ['page'],
    documentUrlPatterns: ['*://twitter.com/*', '*://x.com/*']
  });
}

async function handleCopyTweetShortcut() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.id && (tab.url?.includes('twitter.com') || tab.url?.includes('x.com'))) {
      await browser.tabs.sendMessage(tab.id, { type: 'COPY_TWEET_SHORTCUT' });
    }
  } catch (error) {
    console.error('Failed to handle copy tweet shortcut:', error);
  }
}

async function handleContextMenuCopy(tabId: number, format: string) {
  try {
    // 临时更新格式设置
    const currentSettings = await getSettings();
    const tempSettings = { ...currentSettings, format };
    
    // 发送临时设置到content script
    await browser.tabs.sendMessage(tabId, { 
      type: 'SETTINGS_UPDATED', 
      settings: tempSettings 
    });
    
    // 触发复制
    await browser.tabs.sendMessage(tabId, { type: 'COPY_TWEET_SHORTCUT' });
    
    // 恢复原设置
    setTimeout(async () => {
      try {
        await browser.tabs.sendMessage(tabId, { 
          type: 'SETTINGS_UPDATED', 
          settings: currentSettings 
        });
      } catch (error) {
        // 忽略恢复设置时的错误（页面可能已关闭）
      }
    }, 100);
  } catch (error) {
    console.error('Failed to handle context menu copy:', error);
  }
}

async function getCopyHistory() {
  try {
    const result = await browser.storage.local.get('copyHistory');
    return result.copyHistory || [];
  } catch (error) {
    console.error('Failed to get copy history:', error);
    return [];
  }
}

async function clearCopyHistory() {
  try {
    await browser.storage.local.remove('copyHistory');
    return { success: true };
  } catch (error) {
    console.error('Failed to clear copy history:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function updateSettings(settings: any) {
  try {
    await browser.storage.sync.set({ copySettings: settings });
    
    // 通知所有Twitter标签页设置已更新
    const tabs = await browser.tabs.query({ 
      url: ['*://twitter.com/*', '*://x.com/*'] 
    });
    
    for (const tab of tabs) {
      if (tab.id) {
        try {
          await browser.tabs.sendMessage(tab.id, { 
            type: 'SETTINGS_UPDATED', 
            settings 
          });
        } catch (error) {
          // 忽略无法发送消息的标签页（可能还未加载content script）
        }
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Failed to update settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function getSettings() {
  try {
    const result = await browser.storage.sync.get('copySettings');
    return result.copySettings || {
      format: 'html',
      includeAuthor: true,
      includeTimestamp: true,
      includeMedia: true,
      includeStats: false,
      language: 'auto'
    };
  } catch (error) {
    console.error('Failed to get settings:', error);
    return {
      format: 'html',
      includeAuthor: true,
      includeTimestamp: true,
      includeMedia: true,
      includeStats: false,
      language: 'auto'
    };
  }
}
