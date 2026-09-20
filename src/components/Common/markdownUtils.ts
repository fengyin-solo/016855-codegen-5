import { isValidElement, cloneElement } from 'react';
import type { ReactNode } from 'react';

/**
 * 从 hast 节点递归提取纯文本
 * （rehype-highlight 会把代码拆成多个高亮 span，String(children) 无法拿到真实文本）
 */
export function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';

  const n = node as { type?: string; value?: unknown; children?: unknown[] };

  if (n.type === 'text' && typeof n.value === 'string') {
    return n.value;
  }

  if (Array.isArray(n.children)) {
    return n.children.map(getNodeText).join('');
  }

  return '';
}

/**
 * 去掉结尾一个换行后按行拆分，返回行数组
 * 空内容返回 ['']（视为 1 行）
 */
export function splitCodeLines(raw: string): string[] {
  return raw.replace(/\n$/, '').split('\n');
}

/**
 * 递归去掉 React children 末尾文本节点上的一个换行符
 * 保证渲染出的代码行数与行号严格一一对应
 * （末尾换行在 white-space: pre 下会多出一个空行）
 */
export function trimTrailingNewline(children: ReactNode): ReactNode {
  if (typeof children === 'string') {
    return children.replace(/\n$/, '');
  }

  if (Array.isArray(children)) {
    if (children.length === 0) return children;

    const last = children[children.length - 1] as ReactNode;
    const trimmedLast = trimTrailingNewline(last);
    if (trimmedLast === last) return children;

    const next = children.slice();
    next[next.length - 1] = trimmedLast;
    // 末尾节点被裁成空字符串时直接移除，避免多余的空文本节点
    if (next[next.length - 1] === '') next.pop();
    return next;
  }

  if (isValidElement(children)) {
    const props = children.props as { children?: ReactNode };
    if (props.children == null) return children;

    const trimmed = trimTrailingNewline(props.children);
    if (trimmed === props.children) return children;

    return cloneElement(children, undefined, trimmed);
  }

  return children;
}

export interface TableStats {
  /** 总行数（含表头行） */
  rows: number;
  /** 最大列数 */
  cols: number;
}

interface HastNode {
  tagName?: string;
  children?: HastNode[];
}

/**
 * 统计表格的行数与列数（不递归进入嵌套表格）
 */
export function getTableStats(node: unknown): TableStats {
  const stats: TableStats = { rows: 0, cols: 0 };

  const walk = (n: HastNode, isRoot: boolean): void => {
    if (!n || typeof n !== 'object') return;

    if (!isRoot && n.tagName === 'table') return;

    if (n.tagName === 'tr') {
      stats.rows += 1;
      const cells = (n.children ?? []).filter(
        c => c && (c.tagName === 'th' || c.tagName === 'td'),
      ).length;
      stats.cols = Math.max(stats.cols, cells);
      return;
    }

    (n.children ?? []).forEach(child => walk(child, false));
  };

  walk(node as HastNode, true);
  return stats;
}
