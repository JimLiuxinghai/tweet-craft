import VideoDownloadManager from '../lib/background/video-download-manager';
import { notionAuthManager, notionClient, notionDebugHelper } from '../lib/notion';

export default defineBackground(() => {
  console.log('Twitter Super Copy background script loaded', { id: browser.runtime.id });

  // 初始化视频下载管理器
  const videoDownloadManager = new VideoDownloadManager();

  // 初始化 Notion 认证管理器
  notionAuthManager.loadConfig().then(() => {
    console.log('Notion auth manager initialized');
  }).catch(error => {
    console.error('Failed to initialize Notion auth manager:', error);
  });

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
      case 'NOTION_AUTHENTICATE':
        handleNotionAuthenticate(sendResponse);
        return true;
      case 'NOTION_SAVE_TWEET':
        handleNotionSaveTweet(message.data, sendResponse);
        return true;
      case 'NOTION_CHECK_EXISTS':
        handleNotionCheckExists(message.url, sendResponse);
        return true;
      case 'NOTION_CREATE_DATABASE':
        handleNotionCreateDatabase(message.parentPageId, message.title, sendResponse);
        return true;
      case 'NOTION_GET_DATABASE_STATS':
        handleNotionGetDatabaseStats(sendResponse);
        return true;
      case 'NOTION_GET_USER_PAGES':
        handleNotionGetUserPages(sendResponse);
        return true;
      case 'NOTION_SET_DATABASE':
        handleNotionSetDatabase(message.databaseId, sendResponse);
        return true;
      case 'NOTION_GET_DATABASE_INFO':
        handleNotionGetDatabaseInfo(sendResponse);
        return true;
      case 'NOTION_DISCONNECT':
        handleNotionDisconnect(sendResponse);
        return true;
      case 'NOTION_IS_CONNECTED':
        handleNotionIsConnected(sendResponse);
        return true;
      case 'NOTION_DEBUG':
        handleNotionDebug(sendResponse);
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

/**
 * 处理 Notion 认证请求
 */
async function handleNotionAuthenticate(sendResponse: (response: any) => void) {
  try {
    console.log('Starting Notion authentication...');
    const result = await notionAuthManager.authenticate();
    console.log('Notion authentication result:', result);
    sendResponse(result);
  } catch (error) {
    console.error('Failed to handle Notion authentication:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理 Notion 保存推文请求
 */
async function handleNotionSaveTweet(tweetData: any, sendResponse: (response: any) => void) {
  try {
    console.log('handleNotionSaveTweet called with data:', tweetData);
    
    // 重新加载配置以确保是最新的
    const config = await notionAuthManager.loadConfig();
    console.log('Loaded config:', config ? 'Config available' : 'No config');
    
    if (!config?.accessToken) {
      console.error('No access token in config');
      sendResponse({ 
        success: false, 
        error: 'Notion 未配置或认证已过期，请重新配置 Integration Token' 
      });
      return;
    }

    if (!config.databaseId) {
      console.error('No database ID in config');
      sendResponse({ 
        success: false, 
        error: '未选择 Notion 数据库，请在设置中选择或创建数据库' 
      });
      return;
    }

    console.log('Attempting to save tweet to Notion...');
    const result = await notionClient.saveTweet(config.databaseId, tweetData);
    console.log('Notion save result:', result);
    
    sendResponse(result);
  } catch (error) {
    console.error('Failed to save tweet to Notion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    
    sendResponse({ 
      success: false, 
      error: errorMessage
    });
  }
}

/**
 * 处理检查推文是否存在请求
 */
async function handleNotionCheckExists(url: string, sendResponse: (response: any) => void) {
  try {
    const config = notionAuthManager.getCurrentConfig();
    if (!config?.accessToken || !config?.databaseId) {
      sendResponse({ exists: false });
      return;
    }

    const exists = await notionClient.checkTweetExists(config.databaseId, url);
    sendResponse({ exists });
  } catch (error) {
    console.error('Failed to check tweet existence:', error);
    sendResponse({ exists: false });
  }
}

/**
 * 处理创建 Notion 数据库请求
 */
async function handleNotionCreateDatabase(parentPageId: string, title: string, sendResponse: (response: any) => void) {
  try {
    const database = await notionClient.createDatabase(parentPageId, title);
    
    // 保存数据库 ID
    await notionAuthManager.saveConfig({ databaseId: database.id });
    
    sendResponse({ 
      success: true, 
      database: database 
    });
  } catch (error) {
    console.error('Failed to create Notion database:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理获取数据库统计请求
 */
async function handleNotionGetDatabaseStats(sendResponse: (response: any) => void) {
  try {
    const config = notionAuthManager.getCurrentConfig();
    if (!config?.accessToken || !config?.databaseId) {
      sendResponse({ 
        success: false, 
        error: 'Notion not configured' 
      });
      return;
    }

    const stats = await notionClient.getDatabaseStats(config.databaseId);
    sendResponse({ 
      success: true, 
      stats: stats 
    });
  } catch (error) {
    console.error('Failed to get database stats:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理获取用户页面请求
 */
async function handleNotionGetUserPages(sendResponse: (response: any) => void) {
  try {
    const [pages, databases] = await Promise.all([
      notionClient.getUserPages(),
      notionClient.getUserDatabases()
    ]);
    sendResponse({
      success: true,
      pages: pages,
      databases
    });
  } catch (error) {
    console.error('Failed to get user pages:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理设置 Notion 数据库请求
 */
async function handleNotionSetDatabase(databaseId: string, sendResponse: (response: any) => void) {
  try {
    if (!databaseId) {
      sendResponse({ success: false, error: 'databaseId is required' });
      return;
    }

    const databaseInfo = await notionClient.getDatabaseInfo(databaseId);
    await notionAuthManager.saveConfig({ databaseId: databaseInfo.id });

    try {
      await browser.storage.sync.set({ notionDatabaseId: databaseInfo.id });
    } catch (storageError) {
      console.warn('Failed to sync legacy database id storage:', storageError);
    }

    sendResponse({
      success: true,
      database: databaseInfo
    });
  } catch (error) {
    console.error('Failed to set Notion database:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 处理获取当前数据库信息请求
 */
async function handleNotionGetDatabaseInfo(sendResponse: (response: any) => void) {
  try {
    const config = notionAuthManager.getCurrentConfig();
    if (!config?.databaseId) {
      sendResponse({ success: true, database: null });
      return;
    }

    const databaseInfo = await notionClient.getDatabaseInfo(config.databaseId);
    sendResponse({ success: true, database: databaseInfo });
  } catch (error) {
    console.error('Failed to get Notion database info:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * 处理断开 Notion 连接请求
 */
async function handleNotionDisconnect(sendResponse: (response: any) => void) {
  try {
    await notionAuthManager.disconnect();
    sendResponse({ 
      success: true, 
      message: 'Notion disconnected successfully' 
    });
  } catch (error) {
    console.error('Failed to disconnect Notion:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * 处理检查 Notion 连接状态请求
 */
async function handleNotionIsConnected(sendResponse: (response: any) => void) {
  try {
    const isConnected = await notionAuthManager.isConnected();
    sendResponse({ 
      success: true, 
      connected: isConnected 
    });
  } catch (error) {
    console.error('Failed to check Notion connection:', error);
    sendResponse({ 
      success: false, 
      connected: false 
    });
  }
}

/**
 * 处理 Notion 调试请求
 */
async function handleNotionDebug(sendResponse: (response: any) => void) {
  try {
    console.log('Running Notion diagnostics...');
    const results = await notionDebugHelper.runDiagnostics();
    const report = notionDebugHelper.generateReport(results);
    
    console.log('Notion Diagnostic Report:\n', report);
    
    sendResponse({ 
      success: true, 
      results,
      report
    });
  } catch (error) {
    console.error('Failed to run Notion diagnostics:', error);
    sendResponse({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
