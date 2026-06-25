import type { TweetData } from '../notion/types';

const NOTION_CATEGORIES = ['技术', '资讯', '学习', '工作', '生活', '其他'] as const;
const CATEGORY_SET = new Set<string>(NOTION_CATEGORIES);

type NotionCategory = typeof NOTION_CATEGORIES[number];

interface LanguageModelSession {
  prompt(input: string, options?: Record<string, unknown>): Promise<string>;
  destroy?(): void;
}

interface LanguageModelAPI {
  availability(options?: Record<string, unknown>): Promise<string>;
  create(options?: Record<string, unknown>): Promise<LanguageModelSession>;
}

declare global {
  interface Window {
    LanguageModel?: LanguageModelAPI;
  }
}

export interface TweetClassification {
  category: NotionCategory;
  source: 'prompt-api' | 'fallback';
}

export class TweetClassifier {
  static async classify(tweetData: TweetData): Promise<TweetClassification> {
    try {
      const aiCategory = await this.classifyWithPromptAPI(tweetData);
      if (aiCategory) {
        return { category: aiCategory, source: 'prompt-api' };
      }
    } catch (error) {
      console.warn('Prompt API tweet classification failed, using fallback:', error);
    }

    return {
      category: this.classifyWithFallback(tweetData.content),
      source: 'fallback'
    };
  }

  private static async classifyWithPromptAPI(tweetData: TweetData): Promise<NotionCategory | null> {
    const languageModel = window.LanguageModel;
    if (!languageModel) {
      return null;
    }

    const availability = await languageModel.availability();
    if (availability === 'unavailable') {
      return null;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    let session: LanguageModelSession | null = null;

    try {
      session = await languageModel.create({
        signal: controller.signal,
        monitor(monitor: EventTarget) {
          monitor.addEventListener('downloadprogress', (event: Event) => {
            const progress = event as ProgressEvent;
            console.log(`Prompt API model download: ${Math.round((progress.loaded || 0) * 100)}%`);
          });
        }
      });

      const result = await session.prompt(this.buildPrompt(tweetData), {
        signal: controller.signal,
        responseConstraint: {
          type: 'object',
          additionalProperties: false,
          properties: {
            category: {
              type: 'string',
              enum: NOTION_CATEGORIES
            }
          },
          required: ['category']
        }
      });

      return this.parseCategory(result);
    } finally {
      window.clearTimeout(timeout);
      session?.destroy?.();
    }
  }

  private static buildPrompt(tweetData: TweetData): string {
    const content = tweetData.content.slice(0, 1200);
    const mediaHints = [
      tweetData.media?.hasImages ? '包含图片' : '',
      tweetData.media?.hasVideo ? '包含视频' : '',
      tweetData.media?.hasLinks ? '包含链接' : ''
    ].filter(Boolean).join('、') || '无明显媒体';

    return [
      '你是一个本地运行的推文分类器。只根据推文内容选择一个 Notion 分类。',
      `可选分类：${NOTION_CATEGORIES.join('、')}`,
      '分类标准：技术=软件/硬件/AI/编程/产品技术；资讯=新闻/行业动态/公告；学习=教程/课程/知识整理；工作=职业/招聘/业务/协作；生活=日常/娱乐/消费/个人感受；其他=无法归入以上。',
      '只输出 JSON，格式为 {"category":"分类名"}。',
      '',
      `作者：${tweetData.author} @${tweetData.username}`,
      `推文类型：${tweetData.type}`,
      `媒体：${mediaHints}`,
      `内容：${content || '(无文本内容)'}`
    ].join('\n');
  }

  private static parseCategory(result: string): NotionCategory | null {
    try {
      const parsed = JSON.parse(result) as { category?: unknown };
      if (typeof parsed.category === 'string' && CATEGORY_SET.has(parsed.category)) {
        return parsed.category as NotionCategory;
      }
    } catch {
      const matched = NOTION_CATEGORIES.find(category => result.includes(category));
      if (matched) {
        return matched;
      }
    }

    return null;
  }

  private static classifyWithFallback(content: string): NotionCategory {
    const text = content.toLowerCase();

    if (/(ai|人工智能|机器学习|深度学习|模型|芯片|gpu|nvidia|代码|编程|github|api|chrome|软件|硬件|server|服务器|database|数据库)/i.test(text)) {
      return '技术';
    }
    if (/(新闻|资讯|报道|发布|宣布|爆料|更新|政策|财报|融资|市场)/i.test(text)) {
      return '资讯';
    }
    if (/(学习|教程|课程|笔记|指南|书单|论文|研究|learn|course|tutorial)/i.test(text)) {
      return '学习';
    }
    if (/(工作|招聘|职位|职业|团队|项目|会议|客户|业务|job|career|startup)/i.test(text)) {
      return '工作';
    }
    if (/(生活|旅行|美食|电影|游戏|运动|家人|朋友|心情|日常|娱乐)/i.test(text)) {
      return '生活';
    }

    return '其他';
  }
}
