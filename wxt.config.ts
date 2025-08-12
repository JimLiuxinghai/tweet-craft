import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    name: 'Twitter Super Copy',
    description: 'Enhanced copy functionality for Twitter/X.com with thread support and multiple formats',
    version: '1.0.1',
    permissions: [
      'activeTab',
      'clipboardWrite',
      'storage',
      'contextMenus',
      'scripting',
      'downloads',
      'notifications',
      'identity'
    ],
    host_permissions: [
      'https://twitter.com/*',
      'https://x.com/*',
      'https://*.twimg.com/*',
      'https://*.video.twimg.com/*',
      'https://api.notion.com/*',
      'https://www.notion.so/*'
    ],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';"
    },
    action: {
      default_title: 'Twitter Super Copy',
      default_popup: 'popup/index.html'
    },
    icons: {
      16: '/icon/icon.png',
  32: '/icon/icon.png',
      48: '/icon/icon.png',
  96: '/icon/icon.png',
128: '/icon/icon.png'
    },
    commands: {
      'copy-tweet': {
        suggested_key: {
          default: 'Ctrl+Shift+C',
 mac: 'Command+Shift+C'
        },
        description: 'Copy current tweet'
      },
      'copy-thread': {
    suggested_key: {
        default: 'Ctrl+Shift+T',
        mac: 'Command+Shift+T'
        },
    description: 'Copy entire thread'
      }
    }
  },
  runner: {
    disabled: true
  }
});
