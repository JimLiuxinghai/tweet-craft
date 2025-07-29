export default defineContentScript({
  matches: ['*://twitter.com/*', '*://x.com/*'],
  main() {
    console.log('Twitter Super Copy - Content Script Loaded');
    initTwitterCopyFeature();
  },
});

interface TweetData {
  content: string;
  author: string;
  username: string;
  timestamp: string;
  url: string;
  mediaUrls: string[];
  media: MediaContent;
  stats: {
    likes: string;
    retweets: string;
    replies: string;
  };
}

interface CopySettings {
  format: 'html' | 'markdown' | 'text';
  includeAuthor: boolean;
  includeTimestamp: boolean;
  includeMedia: boolean;
  includeStats: boolean;
  language: string;
}

let copySettings: CopySettings = {
  format: 'html',
  includeAuthor: true,
  includeTimestamp: true,
  includeMedia: true,
  includeStats: false,
  language: 'auto'
};

// 多语言支持
const i18n = {
  'zh': {
    copyTweet: '复制推文',
    copyThread: '复制线程',
    copyThisOnly: '只复制这条',
    copyEntireThread: '复制整个线程',
    copied: '已复制！',
    viewOriginal: '查看原推文',
    threadSummary: '线程总结',
    withImages: '含图片',
    copyFailed: '复制失败，请重试'
  },
  'en': {
    copyTweet: 'Copy Tweet',
    copyThread: 'Copy Thread',
    copyThisOnly: 'Copy This Only',
    copyEntireThread: 'Copy Entire Thread',
    copied: 'Copied!',
    viewOriginal: 'View Original',
    threadSummary: 'Thread Summary',
    withImages: 'with images',
    copyFailed: 'Copy failed, please try again'
  }
};

function t(key: string): string {
  const lang = copySettings.language === 'auto' ? 
    (navigator.language.startsWith('zh') ? 'zh' : 'en') : 
    copySettings.language;
  return i18n[lang as keyof typeof i18n]?.[key as keyof typeof i18n['zh']] || i18n.en[key as keyof typeof i18n['en']];
}

function initTwitterCopyFeature() {
  // 加载设置
  loadSettings();
  
  // 监听设置变化
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'SETTINGS_UPDATED') {
      copySettings = { ...copySettings, ...message.settings };
    }
  });

  // 监听快捷键
  browser.runtime.onMessage.addListener((message) => {
    if (message.type === 'COPY_TWEET_SHORTCUT') {
      const focusedTweet = findFocusedTweet();
      if (focusedTweet) {
        copyTweet(focusedTweet);
      }
    }
  });

  // 观察DOM变化，为新推文添加复制按钮
  const observer = new MutationObserver(() => {
    addCopyButtonsToTweets();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // 初始添加复制按钮
  setTimeout(() => addCopyButtonsToTweets(), 1000);
}

async function loadSettings() {
  try {
    const result = await browser.storage.sync.get('copySettings');
    if (result.copySettings) {
      copySettings = { ...copySettings, ...result.copySettings };
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

function addCopyButtonsToTweets() {
  // 查找所有推文容器
  const tweets = document.querySelectorAll('[data-testid="tweet"]:not([data-copy-added])');
  
  console.log(`Found ${tweets.length} new tweets to add copy buttons`);
  
  tweets.forEach((tweet) => {
    tweet.setAttribute('data-copy-added', 'true');
    addCopyButtonToTweet(tweet as HTMLElement);
    
    // 调试：检查推文中的图片
    const images = tweet.querySelectorAll('[data-testid="tweetPhoto"] img');
    if (images.length > 0) {
      console.log(`Tweet has ${images.length} images:`, Array.from(images).map(img => (img as HTMLImageElement).src));
    }
  });
}

function addCopyButtonToTweet(tweetElement: HTMLElement) {
  // 查找推文操作栏
  const actionBar = tweetElement.querySelector('[role="group"]');
  if (!actionBar) return;

  // 创建复制按钮
  const copyButton = document.createElement('div');
  copyButton.className = 'twitter-copy-btn';
  copyButton.innerHTML = `
    <div class="copy-btn-wrapper" title="${t('copyTweet')}">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
      </svg>
    </div>
  `;

  // 添加样式
  copyButton.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34.75px;
    height: 34.75px;
    border-radius: 9999px;
    cursor: pointer;
    transition: background-color 0.2s;
    margin-left: 12px;
    color: rgb(83, 100, 113);
  `;

  copyButton.addEventListener('mouseenter', () => {
    copyButton.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
    copyButton.style.color = 'rgb(29, 155, 240)';
  });

  copyButton.addEventListener('mouseleave', () => {
    copyButton.style.backgroundColor = 'transparent';
    copyButton.style.color = 'rgb(83, 100, 113)';
  });

  copyButton.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    copyTweet(tweetElement);
  });

  actionBar.appendChild(copyButton);
}

function findFocusedTweet(): HTMLElement | null {
  // 尝试找到当前焦点或鼠标悬停的推文
  const focusedElement = document.activeElement;
  if (focusedElement) {
    const tweet = focusedElement.closest('[data-testid="tweet"]');
    if (tweet) return tweet as HTMLElement;
  }

  // 如果没有焦点，返回第一个可见的推文
  const tweets = document.querySelectorAll('[data-testid="tweet"]');
  return tweets[0] as HTMLElement || null;
}

async function copyTweet(tweetElement: HTMLElement) {
  try {
    const tweetData = extractTweetData(tweetElement);
    const hasImages = copySettings.includeMedia && tweetData.media.images.length > 0;
    
    console.log('=== STARTING TWEET COPY ===');
    console.log('Tweet data:', {
      author: tweetData.author,
      content: tweetData.content.substring(0, 100) + '...',
      hasImages,
      imageCount: tweetData.media.images.length,
      videoCount: tweetData.media.videos.length,
      linkCount: tweetData.media.links.length,
      imageUrls: tweetData.media.images.map(img => img.src),
      format: copySettings.format,
      includeMedia: copySettings.includeMedia
    });
    
    if (copySettings.format === 'html') {
      // HTML格式：复制带样式的内容到剪贴板
      console.log('Using HTML format copy...');
      await copyAsRichText(tweetData);
      
      // 显示复制成功提示
      showCopyNotification(tweetElement, hasImages);
      console.log('=== TWEET COPY COMPLETED SUCCESSFULLY ===');
    } else {
      // Markdown和纯文本格式：复制纯文本
      console.log('Using text format copy...');
      const formattedContent = formatTweetContent(tweetData);
      await navigator.clipboard.writeText(formattedContent);
      
      // 显示复制成功提示（纯文本格式不包含图片）
      showCopyNotification(tweetElement, false);
      console.log('=== TEXT COPY COMPLETED SUCCESSFULLY ===');
    }
    
    // 保存到历史记录
    const formattedContent = formatTweetContent(tweetData);
    saveCopyHistory(tweetData, formattedContent);
    
  } catch (error) {
    console.error('=== TWEET COPY FAILED ===', error);
    showErrorNotification(t('copyFailed'));
  }
}

function showErrorNotification(message: string) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #f4212e;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(244, 33, 46, 0.3);
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

async function copyAsRichText(tweetData: TweetData) {
  try {
    console.log('Starting rich text copy with data:', tweetData);
    
    // 生成文本内容
    const textContent = formatAsText(tweetData);
    console.log('Generated text content length:', textContent.length);
    
    // 如果有图片且用户选择包含媒体，创建包含图片的HTML
    if (copySettings.includeMedia && tweetData.media.images.length > 0) {
      console.log('Creating HTML with embedded images...');
      const htmlWithImages = await formatAsHTMLWithEmbeddedImages(tweetData);
      console.log('Generated HTML with images, length:', htmlWithImages.length);
      
      // 只复制HTML和文本，不包含单独的图片blob
      await copyHTMLOnly(htmlWithImages, textContent);
      console.log('Rich text with embedded images copied successfully');
    } else {
      // 创建基础HTML内容（不包含图片）
      const basicHtmlContent = formatAsHTML(tweetData);
      console.log('Generated basic HTML content length:', basicHtmlContent.length);
      
      await copyHTMLOnly(basicHtmlContent, textContent);
      console.log('Basic rich text copied successfully');
    }
    
  } catch (error) {
    console.error('Failed to copy as rich text:', error);
    // 降级到纯文本复制
    try {
      const textContent = formatAsText(tweetData);
      await navigator.clipboard.writeText(textContent);
      console.log('Fallback to plain text copy succeeded');
    } catch (textError) {
      console.error('Even plain text copy failed:', textError);
      throw textError;
    }
  }
}





async function convertImageToPNG(imageBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      console.log('Converting image to PNG format...');
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // 设置canvas尺寸
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          
          console.log('Image dimensions:', canvas.width, 'x', canvas.height);
          
          // 绘制图片到canvas
          ctx?.drawImage(img, 0, 0);
          
          // 转换为PNG blob
          canvas.toBlob((blob) => {
            if (blob) {
              console.log('Successfully converted to PNG:', blob.size, 'bytes');
              resolve(blob);
            } else {
              console.error('Failed to convert canvas to blob');
              resolve(null);
            }
          }, 'image/png', 1.0);
          
        } catch (error) {
          console.error('Error during image conversion:', error);
          resolve(null);
        }
      };
      
      img.onerror = (error) => {
        console.error('Error loading image for conversion:', error);
        resolve(null);
      };
      
      // 设置图片源
      img.src = URL.createObjectURL(imageBlob);
      
    } catch (error) {
      console.error('Error in convertImageToPNG:', error);
      resolve(null);
    }
  });
}

async function copyHTMLOnly(htmlContent: string, textContent: string) {
  try {
    console.log('Copying HTML only...');
    
    const clipboardData: Record<string, Blob> = {
      'text/html': new Blob([htmlContent], { type: 'text/html' }),
      'text/plain': new Blob([textContent], { type: 'text/plain' })
    };
    
    const clipboardItem = new ClipboardItem(clipboardData);
    await navigator.clipboard.write([clipboardItem]);
    
    console.log('Successfully copied HTML content!');
  } catch (error) {
    console.error('Failed to copy HTML:', error);
    throw error;
  }
}

async function downloadImageAsBlob(imageUrl: string): Promise<Blob | null> {
  try {
    console.log('Fetching image from:', imageUrl);
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        'User-Agent': navigator.userAgent,
        'Referer': 'https://twitter.com/'
      }
    });
    
    console.log('Image fetch response:', response.status, response.statusText, 'Content-Type:', response.headers.get('content-type'));
    
    if (response.ok) {
      const blob = await response.blob();
      console.log('Image blob created:', blob.size, 'bytes, type:', blob.type);
      
      // 验证blob确实是图片
      if (blob.size > 0 && (blob.type.startsWith('image/') || response.headers.get('content-type')?.startsWith('image/'))) {
        return blob;
      } else {
        console.warn('Downloaded blob is not a valid image:', blob.type, blob.size);
        return null;
      }
    } else {
      console.error('Image fetch failed:', response.status, response.statusText);
      return null;
    }
  } catch (error) {
    console.error('Image download error:', error);
    return null;
  }
}

async function downloadImagesAsBase64(imageUrls: string[]): Promise<string[]> {
  console.log('Starting to download', imageUrls.length, 'images as base64');
  const base64Images: string[] = [];
  
  for (let i = 0; i < Math.min(imageUrls.length, 4); i++) {
    const url = imageUrls[i];
    console.log(`Processing image ${i + 1}/${imageUrls.length}:`, url);
    
    try {
      const actualUrl = getActualImageUrl(url);
      console.log('Actual URL:', actualUrl);
      
      const response = await fetch(actualUrl, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
          'User-Agent': navigator.userAgent,
          'Referer': 'https://twitter.com/'
        }
      });
      
      console.log(`Image ${i + 1} fetch response:`, response.status, response.statusText);
      
      if (response.ok) {
        const blob = await response.blob();
        console.log(`Image ${i + 1} blob:`, blob.size, 'bytes, type:', blob.type);
        
        if (blob.size > 0) {
          // 先转换为PNG格式，然后再转base64
          const pngBlob = await convertImageToPNG(blob);
          if (pngBlob) {
            const base64 = await blobToBase64(pngBlob);
            if (base64 && base64.length > 100) { // 确保base64不为空
              base64Images.push(base64);
              console.log(`Image ${i + 1} converted to PNG base64, length:`, base64.length);
            } else {
              console.warn(`Image ${i + 1} PNG base64 conversion failed or empty`);
            }
          } else {
            console.warn(`Image ${i + 1} PNG conversion failed`);
          }
        } else {
          console.warn(`Image ${i + 1} blob is empty`);
        }
      } else {
        console.error(`Image ${i + 1} fetch failed:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`Failed to download image ${i + 1}:`, error);
    }
    
    // 添加小延迟避免请求过快
    if (i < imageUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log('Base64 download complete. Successfully processed:', base64Images.length, 'out of', imageUrls.length, 'images');
  return base64Images;
}

async function blobToBase64(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function getActualImageUrl(twitterImageUrl: string): string {
  console.log('Processing image URL:', twitterImageUrl);
  
  if (twitterImageUrl.includes('pbs.twimg.com')) {
    // 移除现有参数
    const baseUrl = twitterImageUrl.split('?')[0];
    
    // 尝试不同的格式参数，优先使用medium尺寸（更可靠）
    const formats = [
      '?format=jpg&name=medium',
      '?format=png&name=medium', 
      '?format=webp&name=medium',
      '?format=jpg&name=small',
      '' // 原始URL作为最后备选
    ];
    
    // 返回第一个格式（通常最可靠）
    const finalUrl = baseUrl + formats[0];
    console.log('Converted image URL:', finalUrl);
    return finalUrl;
  }
  
  console.log('Using original image URL:', twitterImageUrl);
  return twitterImageUrl;
}



async function formatAsHTMLWithEmbeddedImages(tweetData: TweetData): Promise<string> {
  console.log('Formatting HTML with embedded images...');
  
  // 首先创建基础HTML结构，确保推文内容一定被包含
  let html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.5; color: #0f1419; background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e1e8ed; max-width: 550px;">';
  
  // 添加作者信息
  if (copySettings.includeAuthor || copySettings.includeTimestamp) {
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">';
    if (copySettings.includeAuthor) {
      html += `<strong style="font-weight: 700; color: #0f1419; font-size: 15px;">${escapeHtml(tweetData.author)}</strong>`;
      if (tweetData.username) {
        html += ` <span style="color: #536471; font-size: 15px;">@${escapeHtml(tweetData.username)}</span>`;
      }
    }
    if (copySettings.includeTimestamp && tweetData.timestamp) {
      html += ` <span style="color: #536471; font-size: 14px; margin-left: 8px;">• ${escapeHtml(tweetData.timestamp)}</span>`;
    }
    html += '</div>';
  }
  
  // 添加推文内容 - 这是最重要的部分，必须包含
  html += `<div style="font-size: 15px; line-height: 1.5; color: #0f1419; margin-bottom: 12px; white-space: pre-wrap;">${escapeHtml(tweetData.content)}</div>`;
  console.log('Tweet content added to HTML, content length:', tweetData.content.length);
  
  // 尝试添加图片（如果失败不影响主要内容）
  if (copySettings.includeMedia && tweetData.media.images.length > 0) {
    console.log('Attempting to add', tweetData.media.images.length, 'images to HTML');
    
    try {
      // 尝试下载并嵌入图片，但设置超时避免长时间等待
      const base64Images = await Promise.race([
        downloadImagesAsBase64(tweetData.media.images.map(img => img.src)),
        new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000)) // 5秒超时
      ]);
      
      if (base64Images.length > 0) {
        console.log('Successfully embedded', base64Images.length, 'images in HTML');
        html += '<div style="margin: 12px 0;">';
        
        for (let i = 0; i < base64Images.length; i++) {
          const base64Image = base64Images[i];
          html += `<div style="margin: 8px 0;"><img src="${base64Image}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #e1e8ed; display: block;" alt="Tweet image ${i + 1}" /></div>`;
        }
        
        html += '</div>';
      } else {
        console.warn('No images could be embedded, adding image links instead');
        html += addImageLinksToHTML(tweetData.media.images);
      }
    } catch (error) {
      console.error('Failed to process images for HTML, adding links instead:', error);
      html += addImageLinksToHTML(tweetData.media.images);
    }
  }
  
  // 添加其他媒体内容
  if (copySettings.includeMedia) {
    html += addOtherMediaToHTML(tweetData.media);
  }
  
  // 添加统计信息
  if (copySettings.includeStats) {
    html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #536471;">💬 ${tweetData.stats.replies} 🔄 ${tweetData.stats.retweets} ❤️ ${tweetData.stats.likes}</div>`;
  }
  
  // 添加原推文链接
  if (tweetData.url) {
    html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f0f0f0;"><a href="${escapeHtml(tweetData.url)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🔗 ${t('viewOriginal')}</a></div>`;
  }
  
  html += '</div>';
  
  console.log('Final HTML with embedded images, length:', html.length);
  return html;
}

function addImageLinksToHTML(images: Array<{src: string}>): string {
  let html = '<div style="margin: 12px 0;">';
  for (let i = 0; i < images.length; i++) {
    const image = images[i];
    const actualUrl = getActualImageUrl(image.src);
    html += `<div style="margin: 8px 0;"><a href="${escapeHtml(actualUrl)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">📷 查看图片 ${i + 1}</a></div>`;
  }
  html += '</div>';
  return html;
}

function addOtherMediaToHTML(media: MediaContent): string {
  let html = '';
  
  // 添加视频链接
  if (media.videos.length > 0) {
    html += '<div style="margin: 12px 0;">';
    media.videos.forEach((video, index) => {
      html += `<div style="margin: 8px 0;"><a href="${escapeHtml(video.src)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🎥 查看视频 ${index + 1}</a></div>`;
    });
    html += '</div>';
  }
  
  // 添加外部链接
  if (media.links.length > 0) {
    html += '<div style="margin: 12px 0;">';
    media.links.forEach((link, index) => {
      html += `<div style="margin: 8px 0;"><a href="${escapeHtml(link.url)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🔗 ${escapeHtml(link.text || `链接 ${index + 1}`)}</a></div>`;
    });
    html += '</div>';
  }
  
  return html;
}

// 推文选择器映射 - 适配 Twitter/X 的DOM结构
const SELECTORS = {
  tweet: '[data-testid="tweet"]',
  tweetText: '[data-testid="tweetText"]',
  author: '[data-testid="User-Name"]',
  username: '[data-testid="User-Name"] [href^="/"]',
  timestamp: 'time',
  images: '[data-testid="tweetPhoto"] img',
  videos: 'video',
  links: 'a[href*="t.co"], a[href*="twitter.com"], a[href*="x.com"]',
  metrics: '[data-testid="like"], [data-testid="retweet"], [data-testid="reply"]',
  tweetUrl: 'a[href*="/status/"]'
};

interface MediaContent {
  images: Array<{
    src: string;
    alt: string;
    width: number;
    height: number;
  }>;
  videos: Array<{
    src: string;
    poster: string;
    duration: number;
  }>;
  links: Array<{
    url: string;
    text: string;
    title: string;
  }>;
}

function extractTweetData(tweetElement: HTMLElement): TweetData {
  console.log('Extracting tweet data from element...');
  
  // 提取推文内容
  const contentElement = tweetElement.querySelector(SELECTORS.tweetText);
  const content = contentElement?.textContent || '';

  // 提取作者信息
  const authorElement = tweetElement.querySelector(SELECTORS.author);
  const author = authorElement?.textContent?.split('@')[0]?.trim() || '';
  const username = authorElement?.textContent?.match(/@(\w+)/)?.[1] || '';

  // 提取时间戳
  const timeElement = tweetElement.querySelector(SELECTORS.timestamp);
  const timestamp = timeElement?.getAttribute('datetime') || '';

  // 提取推文URL
  const linkElement = tweetElement.querySelector(SELECTORS.tweetUrl);
  const url = linkElement ? `https://twitter.com${linkElement.getAttribute('href')}` : '';

  // 提取媒体内容 - 使用更完整的方法
  const media = extractMedia(tweetElement);
  const mediaUrls = media.images.map(img => img.src);

  // 提取互动数据
  const statsElements = tweetElement.querySelectorAll(SELECTORS.metrics);
  const stats = {
    replies: '',
    retweets: '',
    likes: ''
  };

  statsElements.forEach(element => {
    const ariaLabel = element.getAttribute('aria-label') || '';
    if (ariaLabel.includes('replies') || ariaLabel.includes('回复')) {
      stats.replies = ariaLabel.match(/\d+/)?.[0] || '0';
    } else if (ariaLabel.includes('retweets') || ariaLabel.includes('转推')) {
      stats.retweets = ariaLabel.match(/\d+/)?.[0] || '0';
    } else if (ariaLabel.includes('likes') || ariaLabel.includes('喜欢')) {
      stats.likes = ariaLabel.match(/\d+/)?.[0] || '0';
    }
  });

  const tweetData = {
    content,
    author,
    username,
    timestamp: formatTimestamp(timestamp),
    url,
    mediaUrls,
    media, // 添加完整的媒体信息
    stats
  };

  console.log('Extracted tweet data:', {
    author,
    contentLength: content.length,
    mediaCount: {
      images: media.images.length,
      videos: media.videos.length,
      links: media.links.length
    },
    url
  });

  return tweetData;
}

/**
 * 提取媒体内容
 */
function extractMedia(tweetElement: HTMLElement): MediaContent {
  console.log('Extracting media content...');
  
  const media: MediaContent = {
    images: [],
    videos: [],
    links: []
  };

  // 提取图片
  const images = tweetElement.querySelectorAll(SELECTORS.images);
  console.log('Found', images.length, 'images');
  
  images.forEach(img => {
    const imgElement = img as HTMLImageElement;
    if (imgElement.src && imgElement.src.includes('pbs.twimg.com')) {
      media.images.push({
        src: imgElement.src,
        alt: imgElement.alt || '',
        width: imgElement.naturalWidth || 0,
        height: imgElement.naturalHeight || 0
      });
    }
  });

  // 提取视频
  const videos = tweetElement.querySelectorAll(SELECTORS.videos);
  console.log('Found', videos.length, 'videos');
  
  videos.forEach(video => {
    const videoElement = video as HTMLVideoElement;
    media.videos.push({
      src: videoElement.src || '',
      poster: videoElement.poster || '',
      duration: videoElement.duration || 0
    });
  });

  // 提取链接
  const links = tweetElement.querySelectorAll(SELECTORS.links);
  console.log('Found', links.length, 'links');
  
  links.forEach(link => {
    const linkElement = link as HTMLAnchorElement;
    if (!linkElement.href.includes('/status/')) { // 排除推文本身链接
      media.links.push({
        url: linkElement.href,
        text: linkElement.textContent?.trim() || '',
        title: linkElement.title || ''
      });
    }
  });

  console.log('Media extraction complete:', {
    images: media.images.length,
    videos: media.videos.length,
    links: media.links.length
  });

  return media;
}

function formatTimestamp(timestamp: string): string {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 7) {
    return `${diffDays}天前`;
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

function formatTweetContent(tweetData: TweetData): string {
  switch (copySettings.format) {
    case 'html':
      return formatAsHTML(tweetData);
    case 'markdown':
      return formatAsMarkdown(tweetData);
    case 'text':
    default:
      return formatAsText(tweetData);
  }
}

function formatAsHTML(tweetData: TweetData): string {
  console.log('Formatting basic HTML content...');
  
  let html = '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; line-height: 1.5; color: #0f1419; background: #ffffff; padding: 16px; border-radius: 12px; border: 1px solid #e1e8ed; max-width: 550px;">';
  
  if (copySettings.includeAuthor || copySettings.includeTimestamp) {
    html += '<div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0;">';
    if (copySettings.includeAuthor) {
      html += `<strong style="font-weight: 700; color: #0f1419; font-size: 15px;">${escapeHtml(tweetData.author)}</strong>`;
      if (tweetData.username) {
        html += ` <span style="color: #536471; font-size: 15px;">@${escapeHtml(tweetData.username)}</span>`;
      }
    }
    if (copySettings.includeTimestamp && tweetData.timestamp) {
      html += ` <span style="color: #536471; font-size: 14px; margin-left: 8px;">• ${escapeHtml(tweetData.timestamp)}</span>`;
    }
    html += '</div>';
  }
  
  html += `<div style="font-size: 15px; line-height: 1.5; color: #0f1419; margin-bottom: 12px; white-space: pre-wrap;">${escapeHtml(tweetData.content)}</div>`;
  
  if (copySettings.includeMedia && (tweetData.media.images.length > 0 || tweetData.media.videos.length > 0 || tweetData.media.links.length > 0)) {
    html += '<div style="margin: 12px 0;">';
    
    // 添加图片链接
    tweetData.media.images.forEach((image, index) => {
      const actualUrl = getActualImageUrl(image.src);
      html += `<div style="margin: 8px 0;"><a href="${escapeHtml(actualUrl)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">📷 查看图片 ${index + 1}</a></div>`;
    });
    
    // 添加视频链接
    tweetData.media.videos.forEach((video, index) => {
      html += `<div style="margin: 8px 0;"><a href="${escapeHtml(video.src)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🎥 查看视频 ${index + 1}</a></div>`;
    });
    
    // 添加外部链接
    tweetData.media.links.forEach((link, index) => {
      html += `<div style="margin: 8px 0;"><a href="${escapeHtml(link.url)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🔗 ${escapeHtml(link.text || `链接 ${index + 1}`)}</a></div>`;
    });
    
    html += '</div>';
  }
  
  if (copySettings.includeStats) {
    html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #536471;">💬 ${tweetData.stats.replies} 🔄 ${tweetData.stats.retweets} ❤️ ${tweetData.stats.likes}</div>`;
  }
  
  if (tweetData.url) {
    html += `<div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #f0f0f0;"><a href="${escapeHtml(tweetData.url)}" style="color: #1d9bf0; text-decoration: none; font-size: 14px;">🔗 ${t('viewOriginal')}</a></div>`;
  }
  
  html += '</div>';
  
  console.log('Basic HTML formatted, length:', html.length);
  return html;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatAsMarkdown(tweetData: TweetData): string {
  let markdown = '';
  
  if (copySettings.includeAuthor || copySettings.includeTimestamp) {
    if (copySettings.includeAuthor) {
      markdown += `**${tweetData.author}**`;
      if (tweetData.username) {
        markdown += ` (@${tweetData.username})`;
      }
    }
    if (copySettings.includeTimestamp && tweetData.timestamp) {
      markdown += `\n*${tweetData.timestamp}*`;
    }
    markdown += '\n\n';
  }
  
  markdown += tweetData.content;
  
  if (copySettings.includeMedia && (tweetData.media.images.length > 0 || tweetData.media.videos.length > 0 || tweetData.media.links.length > 0)) {
    markdown += '\n\n**媒体:**\n';
    
    // 添加图片
    tweetData.media.images.forEach((image, index) => {
      markdown += `![图片 ${index + 1}](${image.src})\n`;
    });
    
    // 添加视频
    tweetData.media.videos.forEach((video, index) => {
      markdown += `[🎥 视频 ${index + 1}](${video.src})\n`;
    });
    
    // 添加链接
    tweetData.media.links.forEach((link, index) => {
      markdown += `[${link.text || `链接 ${index + 1}`}](${link.url})\n`;
    });
  }
  
  if (copySettings.includeStats) {
    markdown += `\n\n💬 ${tweetData.stats.replies} 🔄 ${tweetData.stats.retweets} ❤️ ${tweetData.stats.likes}`;
  }
  
  if (tweetData.url) {
    markdown += `\n\n[${t('viewOriginal')}](${tweetData.url})`;
  }
  
  return markdown;
}

function formatAsText(tweetData: TweetData): string {
  let text = '';
  
  if (copySettings.includeAuthor || copySettings.includeTimestamp) {
    if (copySettings.includeAuthor) {
      text += tweetData.author;
      if (tweetData.username) {
        text += ` (@${tweetData.username})`;
      }
    }
    if (copySettings.includeTimestamp && tweetData.timestamp) {
      text += `\n${tweetData.timestamp}`;
    }
    text += '\n\n';
  }
  
  text += tweetData.content;
  
  if (copySettings.includeMedia && (tweetData.media.images.length > 0 || tweetData.media.videos.length > 0 || tweetData.media.links.length > 0)) {
    text += '\n\n媒体内容:\n';
    
    // 添加图片
    tweetData.media.images.forEach((image, index) => {
      text += `图片 ${index + 1}: ${image.src}\n`;
    });
    
    // 添加视频
    tweetData.media.videos.forEach((video, index) => {
      text += `视频 ${index + 1}: ${video.src}\n`;
    });
    
    // 添加链接
    tweetData.media.links.forEach((link, index) => {
      text += `链接 ${index + 1}: ${link.text} - ${link.url}\n`;
    });
  }
  
  if (copySettings.includeStats) {
    text += `\n\n回复: ${tweetData.stats.replies} 转推: ${tweetData.stats.retweets} 喜欢: ${tweetData.stats.likes}`;
  }
  
  if (tweetData.url) {
    text += `\n\n原推文: ${tweetData.url}`;
  }
  
  return text;
}

function showCopyNotification(tweetElement: HTMLElement, hasImages: boolean = false) {
  console.log('Showing copy notification, hasImages:', hasImages);
  
  const notification = document.createElement('div');
  const message = hasImages ? `${t('copied')} (含图片)` : t('copied');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1d9bf0;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    box-shadow: 0 4px 12px rgba(29, 155, 240, 0.3);
  `;

  // 添加动画样式
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
    style.remove();
  }, 3000);
}

async function saveCopyHistory(tweetData: TweetData, formattedContent: string) {
  try {
    const result = await browser.storage.local.get('copyHistory');
    const history = result.copyHistory || [];
    
    const historyItem = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      tweetData,
      formattedContent,
      format: copySettings.format
    };
    
    history.unshift(historyItem);
    
    // 保持最多100条历史记录
    if (history.length > 100) {
      history.splice(100);
    }
    
    await browser.storage.local.set({ copyHistory: history });
  } catch (error) {
    console.error('Failed to save copy history:', error);
  }
}
