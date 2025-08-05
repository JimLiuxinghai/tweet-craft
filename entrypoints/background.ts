export default defineBackground(() => {
  console.log('Twitter Super Copy background script loaded', { id: browser.runtime.id });

  // 设置右键菜单
  setupContextMenus();
  
  // 监听快捷键命令
  setupCommandListeners();
  
  // 监听消息
  setupMessageListeners();
});

/**
 * 设置右键菜单
 */
function setupContextMenus() {
  browser.contextMenus.create({
    id: 'copy-tweet-root',
    title: '复制推文',
  contexts: ['page'],
    documentUrlPatterns: [
      'https://twitter.com/*',
      'https://x.com/*'
    ]
  });

  browser.contextMenus.create({
    id: 'copy-tweet-html',
    parentId: 'copy-tweet-root',
    title: '复制为 HTML 格式',
    contexts: ['page']
  });

  browser.contextMenus.create({
    id: 'copy-tweet-markdown',
    parentId: 'copy-tweet-root',
title: '复制为 Markdown 格式',
    contexts: ['page']
  });

  browser.contextMenus.create({
    id: 'copy-tweet-text',
    parentId: 'copy-tweet-root',
    title: '复制为纯文本',
    contexts: ['page']
  });
}

/**
 * 设置命令监听器（快捷键）
 */
function setupCommandListeners() {
  browser.commands.onCommand.addListener((command) => {
    console.log('Command triggered:', command);
    
    switch (command) {
      case 'copy-tweet':
        handleCopyTweet();
     break;
      case 'copy-thread':
  handleCopyThread();
        break;
    }
  });
}

/**
 * 设置消息监听器
 */
function setupMessageListeners() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    
    switch (message.type) {
    case 'COPY_TWEET':
  handleCopyTweetMessage(message, sendResponse);
    return true; // 保持消息通道开放
      case 'COPY_THREAD':
        handleCopyThreadMessage(message, sendResponse);
        return true;
   case 'GET_SETTINGS':
 handleGetSettings(sendResponse);
      return true;
      case 'SAVE_SETTINGS':
    handleSaveSettings(message.settings, sendResponse);
    return true;
 }
    
  return false;
  });
}

/**
 * 处理复制推文命令
 */
async function handleCopyTweet() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    await browser.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_COPY_TWEET',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to handle copy tweet command:', error);
  }
}

/**
 * 处理复制线程命令
 */
async function handleCopyThread() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
if (!tab.id) return;

    await browser.tabs.sendMessage(tab.id, {
      type: 'EXECUTE_COPY_THREAD',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to handle copy thread command:', error);
  }
}

/**
 * 处理复制推文消息
 */
async function handleCopyTweetMessage(message: any, sendResponse: (response: any) => void) {
  try {
    // 这里可以添加后台处理逻辑，比如记录统计数据
  console.log('Processing copy tweet request:', message);
    
    sendResponse({ success: true, message: 'Tweet copied successfully' });
  } catch (error) {
    console.error('Failed to process copy tweet:', error);
  sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * 处理复制线程消息
 */
async function handleCopyThreadMessage(message: any, sendResponse: (response: any) => void) {
  try {
    console.log('Processing copy thread request:', message);
    
    sendResponse({ success: true, message: 'Thread copied successfully' });
  } catch (error) {
    console.error('Failed to process copy thread:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * 处理获取设置请求
 */
async function handleGetSettings(sendResponse: (response: any) => void) {
  try {
    const result = await browser.storage.local.get('tsc_settings');
  sendResponse({ success: true, settings: result.tsc_settings || {} });
  } catch (error) {
    console.error('Failed to get settings:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

/**
 * 处理保存设置请求
 */
async function handleSaveSettings(settings: any, sendResponse: (response: any) => void) {
  try {
    await browser.storage.local.set({ tsc_settings: settings });
    sendResponse({ success: true, message: 'Settings saved successfully' });
  } catch (error) {
    console.error('Failed to save settings:', error);
  sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
