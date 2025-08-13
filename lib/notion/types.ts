export interface NotionUser {
  object: 'user';
  id: string;
  name: string;
  avatar_url?: string;
  type: 'person' | 'bot';
  person?: {
    email: string;
  };
}

export interface NotionPage {
  object: 'page';
  id: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  properties: Record<string, any>;
  url: string;
}

export interface NotionDatabase {
  object: 'database';
  id: string;
  created_time: string;
  last_edited_time: string;
  archived: boolean;
  title: RichText[];
  properties: Record<string, Property>;
  parent: {
    type: 'page_id' | 'workspace';
    page_id?: string;
    workspace?: boolean;
  };
  url: string;
}

export interface Property {
  id: string;
  name: string;
  type: string;
  [key: string]: any;
}

export interface RichText {
  type: 'text';
  text: {
    content: string;
    link?: {
      url: string;
    };
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?: string;
  };
  plain_text: string;
  href?: string;
}

export interface TitleProperty {
  id: string;
  type: 'title';
  title: RichText[];
}

export interface RichTextProperty {
  id: string;
  type: 'rich_text';
  rich_text: RichText[];
}

export interface UrlProperty {
  id: string;
  type: 'url';
  url: string | null;
}

export interface DateProperty {
  id: string;
  type: 'date';
  date: {
    start: string;
    end?: string;
    time_zone?: string;
  } | null;
}

export interface NumberProperty {
  id: string;
  type: 'number';
  number: number | null;
}

export interface CheckboxProperty {
  id: string;
  type: 'checkbox';
  checkbox: boolean;
}

export interface SelectProperty {
  id: string;
  type: 'select';
  select: {
    name: string;
    color?: string;
  } | null;
}

export interface MultiSelectProperty {
  id: string;
  type: 'multi_select';
  multi_select: Array<{
    name: string;
    color?: string;
  }>;
}

export interface FilesProperty {
  id: string;
  type: 'files';
  files: Array<{
    name: string;
    type: 'external' | 'file';
    external?: {
      url: string;
    };
    file?: {
      url: string;
      expiry_time: string;
    };
  }>;
}

export interface CreatePageParameters {
  parent: {
    database_id: string;
  };
  properties: Record<string, any>;
}

export interface DatabaseQueryParameters {
  filter?: {
    property: string;
    [key: string]: any;
  };
  sorts?: Array<{
    property: string;
    direction: 'ascending' | 'descending';
  }>;
  start_cursor?: string;
  page_size?: number;
}

export interface DatabaseQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor?: string;
}

export interface NotionConfig {
  accessToken: string;
  databaseId?: string;
  workspaceName?: string;
  workspaceId?: string;
}

export interface TweetData {
  id: string;
  url: string;
  content: string;
  author: string;
  username: string;
  publishTime: string;
  type: '原创推文' | '转推' | '引用推文' | '回复';
  media: {
    hasImages: boolean;
    hasVideo: boolean;
    hasLinks: boolean;
  };
  stats: {
    likes: number;
    retweets: number;
    replies: number;
  };
  tags?: string[];
  category?: string;
  savedAt: string;
}

export interface NotionError {
  code: string;
  message: string;
  status?: number;
}

export interface AuthResult {
  success: boolean;
  data?: any;
  error?: string;
}

export interface SyncResult {
  success: boolean;
  data?: any;
  error?: string;
  exists?: boolean;
}