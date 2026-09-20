/**
 * Markdown 展示相关的工具函数与常量
 */

/** 代码块超过该行数时默认收起，只显示预览行 */
export const CODE_COLLAPSE_THRESHOLD = 15;

/** 代码块收起时显示的预览行数 */
export const CODE_PREVIEW_LINES = 8;

/** 回复内容判定为“特别长”的字符数阈值 */
export const MESSAGE_LONG_CHARS = 800;

/** 回复内容判定为“特别长”的行数阈值 */
export const MESSAGE_LONG_LINES = 15;

/**
 * 统计代码行数
 * 忽略末尾的单个换行符，空字符串视为 0 行
 */
export function countCodeLines(code: string): number {
  if (!code) return 0;
  return code.replace(/\n$/, '').split('\n').length;
}

/**
 * 去除 Markdown 标记，得到纯文本
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/, '') // 标题标记
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 -> alt 文本
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 -> 链接文本
    .replace(/[*_~`]+/g, '') // 强调与行内代码标记
    .trim();
}

/**
 * 从回复内容中提取标题
 * 优先取第一个 Markdown 标题，否则取第一行非空文本，超长时截断
 */
export function extractContentTitle(content: string, maxLength = 50): string {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) return '（空内容）';

  const heading = lines.find(line => /^#{1,6}\s/.test(line));
  const text = stripMarkdown(heading ?? lines[0] ?? '');

  if (!text) return '（无标题）';
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

/**
 * 判断回复内容是否“特别长”，需要支持一键收起
 */
export function isLongContent(content: string): boolean {
  return (
    content.length > MESSAGE_LONG_CHARS ||
    content.split('\n').length > MESSAGE_LONG_LINES
  );
}
