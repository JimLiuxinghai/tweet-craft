const modelContext = document.modelContext;

if (modelContext?.registerTool && !window.__tweetCraftWebMCP) {
  const controller = new AbortController();
  window.__tweetCraftWebMCP = controller;

  const chromeStoreUrl = 'https://chromewebstore.google.com/detail/twitter-%E8%B6%85%E7%BA%A7%E5%A2%9E%E5%BC%BA/pancaficlgkdicdeloffhlgdldfhcghf?authuser=0&hl=zh-CN';
  const pages = [
    { kind: 'feature', url: '/', label: 'Tweet Craft 功能与安装' },
    { kind: 'feature', url: '/tweet-craft-introduction.html', label: 'Tweet Craft 技术介绍' },
    { kind: 'guide', url: '/docs/notion-connection-introduction.html', label: 'Notion 连接说明' },
    { kind: 'guide', url: '/docs/notion-setup-tutorial.html', label: 'Notion 配置教程' },
  ];
  let catalogPromise;

  function compact(value, limit) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
  }

  async function loadPage(page) {
    const response = await fetch(page.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error(`无法读取 ${page.url}，HTTP ${response.status}`);
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');

    const overview = {
      kind: page.kind,
      title: page.label,
      description: compact(parsed.querySelector('meta[name="description"]')?.content || parsed.querySelector('h1')?.textContent, 180),
      url: new URL(page.url, location.origin).href,
    };
    const sections = [...parsed.querySelectorAll('h1, h2, h3')].map((heading) => {
      const container = heading.closest('section, article, main, div');
      const description = heading.nextElementSibling?.matches('p')
        ? heading.nextElementSibling.textContent
        : container?.querySelector('p')?.textContent;
      const hash = heading.id ? `#${heading.id}` : '';
      return {
        kind: page.kind,
        title: compact(heading.textContent, 100),
        description: compact(description, 180),
        url: new URL(`${page.url}${hash}`, location.origin).href,
      };
    });

    return [overview, ...sections];
  }

  async function loadCatalog() {
    catalogPromise ||= Promise.allSettled(pages.map(loadPage)).then((results) => ({
      entries: results.flatMap((result) => result.status === 'fulfilled' ? result.value : []),
      failed: results.filter((result) => result.status === 'rejected').length,
    }));
    return catalogPromise;
  }

  function serialize(query, kind, results, failed) {
    const payload = {
      query: query || null,
      kind,
      count: results.length,
      results,
      ...(failed ? { warning: `${failed} 个帮助页面暂时无法读取。` } : {}),
    };
    while (JSON.stringify(payload).length > 1450 && payload.results.length > 1) payload.results.pop();
    payload.count = payload.results.length;
    return JSON.stringify(payload);
  }

  modelContext.registerTool({
    name: 'find_tweet_craft_help',
    description: '查找 Tweet Craft 的功能、安装入口和 Notion 配置指南，返回简要说明与链接。',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: '可选关键词，例如截图、线程、Markdown、Notion 或数据库。' },
        kind: {
          type: 'string',
          enum: ['all', 'feature', 'guide', 'install'],
          description: '帮助类型，默认 all。',
        },
        maxResults: { type: 'integer', minimum: 1, maximum: 5, description: '返回 1 到 5 条结果。' },
      },
    },
    annotations: { readOnlyHint: true, untrustedContentHint: false },
    execute: async ({ query = '', kind = 'all', maxResults = 5 } = {}) => {
      if (!['all', 'feature', 'guide', 'install'].includes(kind)) {
        throw new Error('kind 必须是 all、feature、guide 或 install。');
      }
      if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 5) {
        throw new Error('maxResults 必须是 1 到 5 之间的整数。');
      }

      const install = {
        kind: 'install',
        title: '安装 Tweet Craft 浏览器扩展',
        description: '从 Chrome Web Store 安装 Tweet Craft，支持 Chrome、Edge 等 Chromium 浏览器。',
        url: chromeStoreUrl,
      };
      const { entries, failed } = kind === 'install' ? { entries: [], failed: 0 } : await loadCatalog();
      const candidates = kind === 'install' ? [install] : kind === 'all' ? [install, ...entries] : entries.filter((entry) => entry.kind === kind);
      const normalizedQuery = compact(query, 120).toLocaleLowerCase('zh-CN');
      const results = candidates.filter((entry) => {
        if (!normalizedQuery) return true;
        return `${entry.title} ${entry.description}`.toLocaleLowerCase('zh-CN').includes(normalizedQuery);
      }).slice(0, maxResults);

      return serialize(query, kind, results, failed);
    },
  }, { signal: controller.signal }).catch(() => {
    controller.abort();
    delete window.__tweetCraftWebMCP;
  });

  window.addEventListener('pagehide', () => controller.abort(), { once: true });
}
