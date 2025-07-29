import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Twitter 超级复制插件',
    description: '为Twitter/X.com提供增强的复制功能，支持一键复制带格式的推文内容',
    permissions: ['activeTab', 'storage', 'contextMenus'],
    host_permissions: ['*://twitter.com/*', '*://x.com/*', '*://pbs.twimg.com/*'],
    commands: {
      'copy-tweet': {
        suggested_key: {
          default: 'Ctrl+Shift+C',
          mac: 'Command+Shift+C'
        },
        description: '复制当前推文'
      }
    },
    icons: {
      16: '/icon/logo.png',
      32: '/icon/logo.png',
      48: '/icon/logo.png',
      96: '/icon/logo.png',
      128: '/icon/logo.png'
    },
    action: {
      default_popup: 'popup.html',
      default_title: 'Twitter 超级复制插件'
    }
  }
});
