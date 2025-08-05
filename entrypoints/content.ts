export default defineContentScript({
  matches: [
    'https://twitter.com/*',
    'https://x.com/*'
  ],
  main() {
    console.log('Twitter Super Copy content script loaded');
    
  // 动态导入主要内容脚本逻辑
    import('../lib/content/twitter-content-script').then(({ TwitterContentScript }) => {
      const contentScript = new TwitterContentScript();
  contentScript.initialize();
    }).catch(error => {
      console.error('Failed to load Twitter content script:', error);
    });
  },
});
