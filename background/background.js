/**
 * Twitter 超级复制插件 - 后台脚本 (Service Worker)
 * 处理插件生命周期、权限管理和消息传递
 */

'use strict';

// 插件版本和配置
const EXTENSION_VERSION = '1.0.0';
const SUPPORTED_URLS = ['*://twitter.com/*', '*://x.com/*'];

/**
 * 插件安装时的处理
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('🚀 Twitter 超级复制插件已安装', details);
  
  if (details.reason === 'install') {
    // 首次安装
    handleFirstInstall();
  } else if (details.reason === 'update') {
    // 插件更新
    handleUpdate(details.previousVersion);
  }
});

/**
 * 处理首次安装
 */
async function handleFirstInstall() {
  console.log('🎉 欢迎使用 Twitter 超级复制插件');
  
  try {
    // 设置默认配置
    await chrome.storage.local.set({
      superCopySettings: {
        format: 'html',
        includeMedia: true,
        includeMetrics: false,
        includeAuthor: true,
        includeTimestamp: true,
        version: EXTENSION_VERSION
      }
    });
    
    // 创建上下文菜单
    createContextMenus();
    
    console.log('✅ 默认设置已保存');
    
  } catch (error) {
    console.error('❌ 首次安装配置失败:', error);
  }
}

/**
 * 处理插件更新
 */
async function handleUpdate(previousVersion) {
  console.log(`🔄 插件从 ${previousVersion} 更新到 ${EXTENSION_VERSION}`);
  
  try {
    // 获取现有设置
    const result = await chrome.storage.local.get('superCopySettings');
    const currentSettings = result.superCopySettings || {};
    
    // 合并新的默认设置
    const updatedSettings = {
      format: 'html',
      includeMedia: true,
      includeMetrics: false,
      includeAuthor: true,
      includeTimestamp: true,
      ...currentSettings,
      version: EXTENSION_VERSION
    };
    
    // 保存更新后的设置
    await chrome.storage.local.set({ superCopySettings: updatedSettings });
    
    // 更新上下文菜单
    createContextMenus();
    
    console.log('✅ 插件更新完成');
    
  } catch (error) {
    console.error('❌ 插件更新失败:', error);
  }
}

/**
 * 创建右键上下文菜单
 */
function createContextMenus() {
  // 先清除现有菜单
  chrome.contextMenus.removeAll(() => {
    // 创建主菜单
    chrome.contextMenus.create({
      id: 'superCopyTweet',
      title: '复制推文',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_URLS
    });
    
    // 创建格式选项子菜单
    chrome.contextMenus.create({
      id: 'copyAsHTML',
      parentId: 'superCopyTweet',
      title: '复制为 HTML 格式',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_URLS
    });
    
    chrome.contextMenus.create({
      id: 'copyAsMarkdown',
      parentId: 'superCopyTweet',
      title: '复制为 Markdown 格式',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_URLS
    });
    
    chrome.contextMenus.create({
      id: 'copyAsPlain',
      parentId: 'superCopyTweet',
      title: '复制为纯文本',
      contexts: ['page'],
      documentUrlPatterns: SUPPORTED_URLS
    });
    
    console.log('📋 上下文菜单已创建');
  });
}

/**
 * 处理上下文菜单点击
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;
  
  // 解析点击的菜单项
  let format = 'html';
  switch (info.menuItemId) {
    case 'copyAsHTML':
      format = 'html';
      break;
    case 'copyAsMarkdown':
      format = 'markdown';
      break;
    case 'copyAsPlain':
      format = 'plain';
      break;
    default:
      return;
  }
  
  // 发送消息到内容脚本
  chrome.tabs.sendMessage(tab.id, {
    action: 'copyCurrentTweet',
    format: format,
    showNotification: true
  }).catch(error => {
    console.warn('发送消息到内容脚本失败:', error);
  });
});

/**
 * 处理来自内容脚本和弹窗的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 收到消息:', request);
  
  switch (request.action) {
    case 'getExtensionInfo':
      sendResponse({
        version: EXTENSION_VERSION,
        supportedUrls: SUPPORTED_URLS
      });
      break;
      
    case 'reportError':
      console.error('❌ 内容脚本报告错误:', request.error);
      // 可以在这里添加错误统计或上报逻辑
      sendResponse({ success: true });
      break;
      
    case 'trackEvent':
      // 事件统计（可选）
      console.log('📊 事件统计:', request.event, request.data);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

/**
 * 处理标签页更新
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 仅在页面完全加载且是支持的网站时处理
  if (changeInfo.status === 'complete' && tab.url && isSupportedUrl(tab.url)) {
    // 可以在这里添加页面加载完成后的逻辑
    console.log('🌐 支持的页面已加载:', tab.url);
  }
});

/**
 * 检查URL是否被支持
 */
function isSupportedUrl(url) {
  return SUPPORTED_URLS.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(url);
  });
}

/**
 * 处理存储变化
 */
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.superCopySettings) {
    console.log('⚙️ 设置已更改:', changes.superCopySettings.newValue);
    
    // 可以在这里添加设置变化的响应逻辑
    // 比如通知所有活跃的标签页更新设置
    notifyAllTabs('settingsChanged', changes.superCopySettings.newValue);
  }
});

/**
 * 通知所有支持的标签页
 */
async function notifyAllTabs(action, data) {
  try {
    const tabs = await chrome.tabs.query({});
    const supportedTabs = tabs.filter(tab => tab.url && isSupportedUrl(tab.url));
    
    const promises = supportedTabs.map(tab => 
      chrome.tabs.sendMessage(tab.id, { action, data }).catch(error => {
        // 忽略无法发送消息的标签页（可能内容脚本未加载）
        console.warn(`无法向标签页 ${tab.id} 发送消息:`, error);
      })
    );
    
    await Promise.allSettled(promises);
  } catch (error) {
    console.error('通知所有标签页失败:', error);
  }
}

/**
 * 处理插件停用/卸载
 */
chrome.runtime.onSuspend.addListener(() => {
  console.log('⏹️ 插件正在停用');
  
  // 清理资源
  chrome.contextMenus.removeAll();
});

/**
 * 错误处理
 */
chrome.runtime.onStartup.addListener(() => {
  console.log('🔄 插件已启动');
  
  // 重新创建上下文菜单
  createContextMenus();
});

// 全局错误处理
self.addEventListener('error', (event) => {
  console.error('❌ 后台脚本错误:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('❌ 未处理的 Promise 拒绝:', event.reason);
});

console.log('🎯 Twitter 超级复制插件后台脚本已加载');

/**
 * 插件图标点击处理（如果需要）
 * 注意：在 Manifest V3 中，当设置了 default_popup 时，onClicked 事件不会触发
 * 因此这个监听器被注释掉，避免产生错误
 */
// chrome.action.onClicked.addListener((tab) => {
//   console.log('🖱️ 插件图标被点击');
//   
//   // 如果没有弹窗，可以在这里执行默认操作
//   if (tab.url && isSupportedUrl(tab.url)) {
//     chrome.tabs.sendMessage(tab.id, {
//       action: 'copyCurrentTweet',
//       showNotification: true
//     }).catch(error => {
//       console.warn('发送消息失败:', error);
//     });
//   }
// });

/**
 * 定期清理旧数据（可选）
 */
chrome.alarms.create('cleanup', { periodInMinutes: 1440 }); // 每24小时

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') {
    cleanupOldData();
  }
});

/**
 * 清理旧的历史数据
 */
async function cleanupOldData() {
  try {
    const result = await chrome.storage.local.get('superCopyHistory');
    const history = result.superCopyHistory || [];
    
    // 保留最近100条记录
    if (history.length > 100) {
      const cleanedHistory = history.slice(0, 100);
      await chrome.storage.local.set({ superCopyHistory: cleanedHistory });
      console.log('🧹 已清理旧的历史记录');
    }
  } catch (error) {
    console.warn('清理历史数据失败:', error);
  }
} 