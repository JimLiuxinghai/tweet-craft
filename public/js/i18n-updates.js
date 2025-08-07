// 更新的国际化文本
const i18nUpdates = {
  en: {
    // Video download features
    'features.video.title': 'Smart Video Download',
    'features.video.description': 'Automatically detect and download Twitter videos with one click. Support multiple quality options and external services.',
    'features.video.oneclick': 'One-click download',
    'features.video.quality': 'Multiple quality options',
    'features.video.services': 'External service integration',
    
    // Updated thread features
    'features.thread.pattern': 'Number pattern detection',
    'features.thread.selfreply': 'Self-reply analysis',
    'features.thread.visual': 'Visual continuity check',
    
    // Updated screenshot features
    'features.screenshot.themes': 'Custom themes & backgrounds',
    'features.screenshot.formats': 'PNG, JPG, WebP formats',
    'features.screenshot.quality': 'High-quality rendering',
    
    // Updated performance features
    'features.performance.detection': 'Real-time video detection',
    'features.performance.cache': 'LRU cache optimization',
    'features.performance.debounce': 'Debounced processing',
    
    // Demo section
    'demo.video.title': 'Video Download',
    'demo.video.detect': 'Auto-detect videos',
    'demo.video.button': 'Add download button',
    'demo.video.download': 'One-click download',
    'demo.copy.title': 'Smart Copy',
    'demo.copy.thread': 'Thread detection',
    'demo.copy.formats': 'Multiple formats',
    'demo.copy.clipboard': 'Auto clipboard',
    'demo.screenshot.title': 'Screenshot',
    'demo.screenshot.themes': 'Custom themes',
    'demo.screenshot.quality': 'High quality',
    'demo.screenshot.export': 'Export options',
    
    // Tech section
    'tech.video': 'Video download services',
    'tech.chrome': 'Extension platform',
    'tech.detection': 'AI-powered',
    'tech.detectiondesc': 'Video detection, thread analysis, DOM monitoring',
    'tech.services': 'Reliable downloads',
    'tech.servicesdesc': 'TweetDown, SaveTweet, fallback services',
    'tech.linesdesc': 'TypeScript, content scripts, background workers',
    'tech.modulardesc': 'Content scripts, background workers, popup UI',
    
    // Footer
    'footer.video': 'Video Download',
    'footer.tagline': 'Enhanced Twitter/X.com extension with video download, super copy functionality, and beautiful design.'
  },
  
  'zh-CN': {
    // 视频下载功能
    'features.video.title': '智能视频下载',
    'features.video.description': '自动检测并一键下载Twitter视频。支持多种质量选项和外部服务集成。',
    'features.video.oneclick': '一键下载',
    'features.video.quality': '多种质量选项',
    'features.video.services': '外部服务集成',
    
    // 更新的推文线程功能
    'features.thread.pattern': '数字模式检测',
    'features.thread.selfreply': '自回复分析',
    'features.thread.visual': '视觉连续性检查',
    
    // 更新的截图功能
    'features.screenshot.themes': '自定义主题和背景',
    'features.screenshot.formats': 'PNG、JPG、WebP格式',
    'features.screenshot.quality': '高质量渲染',
    
    // 更新的性能功能
    'features.performance.detection': '实时视频检测',
    'features.performance.cache': 'LRU缓存优化',
    'features.performance.debounce': '防抖处理',
    
    // 演示部分
    'demo.video.title': '视频下载',
    'demo.video.detect': '自动检测视频',
    'demo.video.button': '添加下载按钮',
    'demo.video.download': '一键下载',
    'demo.copy.title': '智能复制',
    'demo.copy.thread': '线程检测',
    'demo.copy.formats': '多种格式',
    'demo.copy.clipboard': '自动剪贴板',
    'demo.screenshot.title': '截图',
    'demo.screenshot.themes': '自定义主题',
    'demo.screenshot.quality': '高质量',
    'demo.screenshot.export': '导出选项',
    
    // 技术部分
    'tech.video': '视频下载服务',
    'tech.chrome': '扩展平台',
    'tech.detection': 'AI驱动',
    'tech.detectiondesc': '视频检测、线程分析、DOM监控',
    'tech.services': '可靠下载',
    'tech.servicesdesc': 'TweetDown、SaveTweet、备用服务',
    'tech.linesdesc': 'TypeScript、内容脚本、后台工作器',
    'tech.modulardesc': '内容脚本、后台工作器、弹窗界面',
    
    // 页脚
    'footer.video': '视频下载',
    'footer.tagline': '增强的Twitter/X.com扩展，支持视频下载、超级复制功能和精美设计。'
  }
};

// 应用国际化更新
function applyI18nUpdates() {
  const currentLang = document.documentElement.lang || 'en';
  const updates = i18nUpdates[currentLang] || i18nUpdates.en;
  
  Object.keys(updates).forEach(key => {
    const elements = document.querySelectorAll(`[data-i18n="${key}"]`);
    elements.forEach(element => {
      element.textContent = updates[key];
    });
  });
}

// 页面加载完成后应用更新
document.addEventListener('DOMContentLoaded', applyI18nUpdates);

// 导出供其他脚本使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { i18nUpdates, applyI18nUpdates };
}